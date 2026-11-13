/**
 * Tela do jogo: orquestra estado (React + máquina de estados),
 * física (core/) e desenho (render/). É a "cola" entre as camadas.
 *
 * Fluxo de cada disparo:
 *   entrada → validação → cálculo das forças → atualização da física
 *   → colisões → pontuação → renderização
 */
import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { FeedbackItem, GameMode, LaunchParams, RecoilInfo, ShotRecord, SimEnvironment, SimSample, Body, ProjectileSpec, WorldSettings } from '../core/types';
import { buildEnvironment, evaluateLevel, getLevel, LAB_LEVEL, LevelEvaluation, LEVELS, nextLevelId, worldFromLevel } from '../core/LevelManager';
import { createMachine, gameReducer } from '../core/GameStateManager';
import { computeForces, computeRecoil, DEFAULT_GRAVITY, FIXED_DT, launchAcceleration, launchSpeed, ROLLING_FRICTION } from '../core/PhysicsEngine';
import { advanceFlight, createFlight, Flight } from '../core/Simulation';
import { predictTrajectory, slicePreview } from '../core/TrajectoryCalculator';
import { createProjectileBody, PROJECTILES } from '../core/Projectile';
import { muzzlePosition } from '../core/Cannon';
import { heightAt } from '../core/Terrain';
import { fromAngle, length } from '../core/vector';
import { LIMITS, validateLaunch, validateWorld } from '../core/validation';
import { applyScore, computeShotScore, ShotScore, starRating } from '../core/ScoreSystem';
import { generateShotFeedback, launchFeedback } from '../core/education';
import { describeWind, nextWind } from '../core/WindSystem';
import { CANVAS_HEIGHT, CANVAS_WIDTH, createCamera } from '../render/Camera';
import { ComparisonTrace, drawScene, SceneView } from '../render/SceneRenderer';
import { Particle, spawnBurst, updateParticles } from '../render/Effects';
import { GameControls } from './GameControls';
import { LabPanel } from './LabPanel';
import { HudSnapshot, StatsPanel, VectorLegend } from './StatsPanel';
import { MotionCharts } from './MotionCharts';
import { EducationPanel } from './EducationPanel';
import { EngineeringLive } from './EngineeringLive';

// ---------- persistência do progresso (opcional: funciona sem localStorage) ----------

interface Progress {
  unlocked: number;
  best: Record<number, number>;
}
const STORAGE_KEY = 'simulador-canhao:progresso';

function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Progress;
      if (typeof p.unlocked === 'number') return { unlocked: p.unlocked, best: p.best ?? {} };
    }
  } catch {
    /* armazenamento indisponível: segue sem salvar */
  }
  return { unlocked: 1, best: {} };
}

function saveProgress(p: Progress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* ignora */
  }
}

// ---------- tipos locais ----------

interface ShotContext {
  params: LaunchParams;
  world: WorldSettings;
  env: SimEnvironment;
  body: Body;
  speed: number;
  recoil: RecoilInfo;
  spec: ProjectileSpec;
}

interface ResultView {
  record: ShotRecord;
  score: ShotScore;
  evaluation: LevelEvaluation;
}

const TRACE_COLORS = ['#ffd43b', '#ff8787', '#b197fc', '#63e6be', '#ffa94d'];

const OUTCOME_TEXT: Record<ShotRecord['outcome'], string> = {
  hit: 'Acertou o alvo!',
  ground: 'Caiu no chão',
  obstacle: 'Atingiu um obstáculo',
  outOfBounds: 'Saiu da área',
  timeout: 'Tempo esgotado',
};

const fmtBR = (n: number, digits: number) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });

function snapshot(f: Flight): HudSnapshot {
  const b = f.body;
  return {
    t: f.t,
    x: b.position.x,
    y: b.position.y,
    vx: b.velocity.x,
    vy: b.velocity.y,
    speed: length(b.velocity),
    accel: length(f.acceleration),
    forces: f.forces,
  };
}

const MODE_LABEL: Record<GameMode, string> = {
  desafio: 'Modo Desafio',
  aprendizado: 'Modo Aprendizado',
  laboratorio: 'Modo Laboratório',
};

export function GameScreen({ mode, onNavigate }: { mode: GameMode; onNavigate: (to: 'home' | 'lab') => void }) {
  const isLab = mode === 'laboratorio';
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const [levelId, setLevelId] = useState<number>(isLab ? LAB_LEVEL.id : 1);
  const level = useMemo(() => getLevel(levelId), [levelId]);

  const [params, setParams] = useState<LaunchParams>(level.defaults);
  const [world, setWorld] = useState<WorldSettings>(() => worldFromLevel(level));
  const [machine, dispatch] = useReducer(gameReducer, undefined, createMachine);
  const [shots, setShots] = useState<ShotRecord[]>([]);
  const [totalScore, setTotalScore] = useState(0);
  const [levelScore, setLevelScore] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [result, setResult] = useState<ResultView | null>(null);
  const [hud, setHud] = useState<HudSnapshot | null>(null);
  const [samples, setSamples] = useState<SimSample[]>([]);
  const [comparisons, setComparisons] = useState<ComparisonTrace[]>([]);
  const [keepTraces, setKeepTraces] = useState(true);
  const [showVectors, setShowVectors] = useState(true);
  const [timeScale, setTimeScale] = useState(1);

  // refs usados pelo loop de animação (não causam re-renderização)
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const flightRef = useRef<Flight | null>(null);
  const shotRef = useRef<ShotContext | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const fxRef = useRef({ recoilOffset: 0, recoilVelocity: 0, flash: 0, thirdLaw: 0, hitFlash: 0 });
  const stateRef = useRef(machine.state);
  const timeScaleRef = useRef(timeScale);
  const sceneRef = useRef<Omit<SceneView, 'time' | 'recoilOffset' | 'muzzleFlash' | 'thirdLaw' | 'hitFlash' | 'flight' | 'particles'> | null>(null);
  const landRef = useRef<(f: Flight) => void>(() => undefined);
  const liveRef = useRef<(f: Flight) => void>(() => undefined);
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => undefined);
  stateRef.current = machine.state;
  timeScaleRef.current = timeScale;

  // ---------- valores derivados (entrada → validação → previsão) ----------
  const groundY = heightAt(level.terrain, level.cannonX);
  const spec = PROJECTILES[params.projectile] ?? PROJECTILES.ferro;
  const forceMax = Math.min(LIMITS.force.max, level.constraints.maxForce ?? Infinity);
  const cam = useMemo(() => createCamera(level), [level]);
  const env = useMemo(() => buildEnvironment(level, world), [level, world]);

  const validation = useMemo(() => {
    const a = validateLaunch(params, level.constraints);
    const b = validateWorld(world);
    return { valid: a.valid && b.valid, errors: [...a.errors, ...b.errors] };
  }, [params, world, level]);

  const acceleration = validation.valid ? launchAcceleration(params.force, params.mass) : NaN;
  const v0 = validation.valid ? launchSpeed(params.force, params.mass) : NaN;
  const muzzle = useMemo(() => muzzlePosition(level.cannonX, groundY, params.angleDeg), [level, groundY, params.angleDeg]);

  const launchBody = useMemo(
    () => (validation.valid ? createProjectileBody(spec, params.mass, muzzle, fromAngle(params.angleDeg, v0)) : null),
    [validation.valid, spec, params.mass, params.angleDeg, muzzle, v0],
  );

  const previewIncludesWind = mode !== 'desafio' || level.difficulty.previewIncludesWind;
  const previewIncludesDrag = mode !== 'desafio' || level.difficulty.previewIncludesDrag;
  const previewFraction = mode === 'desafio' ? level.difficulty.previewFraction : 1;

  const prediction = useMemo(
    () => (launchBody ? predictTrajectory(launchBody, env, { includeWind: previewIncludesWind, includeDrag: previewIncludesDrag }) : null),
    [launchBody, env, previewIncludesWind, previewIncludesDrag],
  );
  const previewPoints = prediction ? slicePreview(prediction.points, previewFraction) : null;
  const windAffects = world.toggles.wind && world.windSpeed !== 0;
  const dragAffects = world.toggles.airResistance && world.airDensityFactor > 0;
  const estimateOnly = (windAffects && !previewIncludesWind) || (dragAffects && !previewIncludesDrag);
  const launchForces = launchBody ? computeForces(launchBody, world) : null;
  const recoilPreview = validation.valid ? computeRecoil(params.mass, v0, params.angleDeg, params.cannonMass, world.toggles.recoil) : null;
  const evaluation = evaluateLevel(level, shots, mode);
  const busy = machine.state === 'flying' || machine.state === 'paused';
  const controlsLocked = machine.state !== 'aiming' && machine.state !== 'result';

  sceneRef.current = {
    cam,
    level,
    windSpeed: world.windSpeed,
    windVisible: world.toggles.wind,
    angleDeg: params.angleDeg,
    aiming: machine.state === 'aiming',
    prediction: previewPoints,
    predictionComplete: previewFraction >= 1,
    launchSpeed: Number.isFinite(v0) ? v0 : 0,
    launchForces,
    projectileMass: params.mass,
    projectileSpec: shotRef.current && busy ? shotRef.current.spec : spec,
    comparisons,
    showVectors,
  };

  // ---------- reinício de nível ----------
  const resetLevelState = () => {
    flightRef.current = null;
    shotRef.current = null;
    particlesRef.current = [];
    fxRef.current = { recoilOffset: 0, recoilVelocity: 0, flash: 0, thirdLaw: 0, hitFlash: 0 };
    setParams(level.defaults);
    setWorld(worldFromLevel(level));
    setShots([]);
    setLevelScore(0);
    setFeedback([]);
    setResult(null);
    setHud(null);
    setSamples([]);
    setComparisons([]);
  };

  useEffect(() => {
    resetLevelState();
    dispatch({ type: 'RESET' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  // ---------- loop de animação ----------
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return undefined;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let clock = 0;
    let tick = 0;

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const state = stateRef.current;
      const paused = state === 'paused';
      if (!paused) clock += dt;

      const flight = flightRef.current;
      const shot = shotRef.current;
      if (state === 'flying' && flight && shot && !flight.outcome) {
        acc += dt * timeScaleRef.current;
        while (acc >= FIXED_DT && !flight.outcome) {
          advanceFlight(flight, shot.env, FIXED_DT);
          acc -= FIXED_DT;
        }
        tick += dt;
        if (flight.outcome) {
          acc = 0;
          landRef.current(flight);
        } else if (tick >= 0.1) {
          tick = 0;
          liveRef.current(flight);
        }
      }

      if (!paused) {
        const fx = fxRef.current;
        if (fx.recoilVelocity > 0) {
          fx.recoilOffset += fx.recoilVelocity * dt;
          fx.recoilVelocity = Math.max(0, fx.recoilVelocity - ROLLING_FRICTION * DEFAULT_GRAVITY * dt);
        } else if (state === 'aiming' && fx.recoilOffset > 0) {
          fx.recoilOffset = Math.max(0, fx.recoilOffset - 1.5 * dt); // artilheiros empurram o canhão de volta
        }
        fx.flash = Math.max(0, fx.flash - dt * 4);
        fx.thirdLaw = Math.max(0, fx.thirdLaw - dt * 0.6);
        fx.hitFlash = Math.max(0, fx.hitFlash - dt * 0.7);
        particlesRef.current = updateParticles(particlesRef.current, dt);
      }

      const s = sceneRef.current;
      const fx = fxRef.current;
      if (s) {
        drawScene(ctx, {
          ...s,
          time: clock,
          recoilOffset: fx.recoilOffset,
          muzzleFlash: fx.flash,
          thirdLaw: Math.min(1, fx.thirdLaw),
          hitFlash: fx.hitFlash,
          flight: flightRef.current,
          particles: particlesRef.current,
        });
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ---------- ações do jogador ----------
  const updateParams = (patch: Partial<LaunchParams>) => setParams((p) => ({ ...p, ...patch }));
  const updateWorld = (patch: Partial<WorldSettings>) => setWorld((w) => ({ ...w, ...patch }));

  function fire() {
    if (machine.state !== 'aiming' || !launchBody || !validation.valid) return;
    const body: Body = { ...launchBody, position: { ...launchBody.position }, velocity: { ...launchBody.velocity } };
    const recoil = computeRecoil(params.mass, v0, params.angleDeg, params.cannonMass, world.toggles.recoil);
    flightRef.current = createFlight(body, env.world);
    shotRef.current = { params: { ...params }, world: { ...world, toggles: { ...world.toggles } }, env, body, speed: v0, recoil, spec };

    const fx = fxRef.current;
    fx.recoilOffset = 0;
    fx.recoilVelocity = recoil.velocity;
    fx.flash = 1;
    fx.thirdLaw = world.toggles.recoil ? 1.8 : 0; // setas visíveis por ~3 s
    spawnBurst(particlesRef.current, muzzle, {
      count: 22,
      speed: 3,
      colors: ['#f1f3f5', '#dee2e6', '#adb5bd'],
      life: 1.3,
      size: 5,
      kind: 'smoke',
      gravity: -1.2,
      direction: params.angleDeg,
      spread: 80,
    });

    setSamples([]);
    setHud(null);
    setResult(null);
    setFeedback(launchFeedback(params, v0, world, recoil.velocity));
    if (!isLab) setComparisons([]);
    dispatch({ type: 'FIRE' });
  }

  function nextShot() {
    flightRef.current = null;
    if (!isLab && level.wind.variation > 0) {
      setWorld((w) => ({ ...w, windSpeed: nextWind(level.wind.base, level.wind.variation) }));
    }
    setResult(null);
    dispatch({ type: 'NEXT_SHOT' });
  }

  function continueAfterResult() {
    if (!result) return nextShot();
    if (!isLab && result.evaluation.complete) dispatch({ type: 'COMPLETE_LEVEL' });
    else if (result.evaluation.failed) dispatch({ type: 'FAIL_LEVEL' });
    else nextShot();
  }

  function goToLevel(id: number) {
    if (machine.state === 'levelComplete') dispatch({ type: 'NEXT_LEVEL' });
    if (id === levelId) {
      resetLevelState();
      dispatch({ type: 'RESET' });
    } else setLevelId(id);
  }

  function retryLevel() {
    dispatch({ type: 'RETRY' });
    resetLevelState();
  }

  function togglePause() {
    if (machine.state === 'flying') dispatch({ type: 'PAUSE' });
    else if (machine.state === 'paused') dispatch({ type: 'RESUME' });
  }

  function stepFrame() {
    const f = flightRef.current;
    const s = shotRef.current;
    if (machine.state !== 'paused' || !f || !s) return;
    for (let i = 0; i < 2 && !f.outcome; i++) advanceFlight(f, s.env, FIXED_DT); // 1/60 s
    dispatch({ type: 'STEP' });
    setHud(snapshot(f));
    setSamples(f.samples.slice());
    if (f.outcome) landRef.current(f);
  }

  // Chamado pelo loop quando o voo termina (colisões → pontuação → feedback).
  landRef.current = (flight: Flight) => {
    const shot = shotRef.current;
    if (!shot || !flight.outcome) return;
    const shotNumber = shots.length + 1;
    const maxRecoil = level.constraints.maxRecoil;
    const recoilViolation = maxRecoil !== undefined && shot.recoil.distance > maxRecoil;
    const score = computeShotScore({
      outcome: flight.outcome,
      targetDistance: flight.targetDistance,
      targetRadius: level.target.radius,
      force: shot.params.force,
      forceLimit: forceMax,
      shotNumber,
      maxShots: mode === 'desafio' ? level.difficulty.maxShots : 0,
      recoilViolation,
    });
    const record: ShotRecord = {
      shotNumber,
      params: shot.params,
      windSpeed: shot.world.windSpeed,
      outcome: flight.outcome,
      launchSpeed: shot.speed,
      flightTime: flight.t,
      maxHeight: flight.maxHeight,
      impactX: flight.firstImpact ? flight.firstImpact.x : null,
      targetDistance: flight.targetDistance,
      closestApproach: flight.closestApproach,
      recoil: shot.recoil,
      recoilViolation,
      points: score.total,
    };
    const allShots = [...shots, record];
    const ev = evaluateLevel(level, allShots, mode);
    const newLevelScore = applyScore(levelScore, score.total);

    let windDrift: number | null = null;
    if (shot.world.toggles.wind && shot.world.windSpeed !== 0 && flight.firstImpact) {
      const calm = predictTrajectory(shot.body, shot.env, { includeWind: false });
      if (calm.landing) windDrift = flight.firstImpact.x - calm.landing.x;
    }
    const beforeEnd = flight.samples[Math.max(0, flight.samples.length - 2)];

    setShots(allShots);
    if (!isLab) {
      setTotalScore((s) => applyScore(s, score.total));
      setLevelScore(newLevelScore);
    }
    setFeedback(generateShotFeedback({ shot: record, level, world: shot.world, windDrift, finalVx: beforeEnd.vx }));
    setResult({ record, score, evaluation: ev });
    setSamples(flight.samples.slice());
    setHud(snapshot(flight));

    const trace: ComparisonTrace = {
      id: Date.now(),
      points: flight.trail.slice(),
      color: TRACE_COLORS[(isLab ? comparisons.length : 0) % TRACE_COLORS.length],
      label: `${shot.params.angleDeg}° · ${shot.params.force} N · ${shot.params.mass} kg`,
    };
    if (isLab) setComparisons((c) => (keepTraces ? [...c, trace].slice(-5) : [trace]));
    else setComparisons([trace]);

    // efeitos visuais
    const p = flight.body.position;
    if (flight.outcome === 'hit') {
      fxRef.current.hitFlash = 1;
      spawnBurst(particlesRef.current, p, {
        count: 70,
        speed: 14,
        colors: ['#ffd43b', '#ff6b6b', '#4dabf7', '#69db7c', '#b197fc'],
        life: 2,
        size: 7,
        kind: 'confetti',
        gravity: 9.81,
      });
    } else if (flight.outcome === 'obstacle') {
      spawnBurst(particlesRef.current, p, { count: 26, speed: 8, colors: ['#ffa94d', '#ffe066'], life: 0.7, size: 3 });
    } else if (flight.outcome === 'ground') {
      spawnBurst(particlesRef.current, p, { count: 24, speed: 4, colors: ['#a07850', '#c9a27e'], life: 0.9, size: 4, direction: 90, spread: 120 });
    }

    if (!isLab && ev.complete) {
      setProgress((prev) => {
        const next: Progress = {
          unlocked: Math.max(prev.unlocked, nextLevelId(level.id) ?? level.id),
          best: { ...prev.best, [level.id]: Math.max(prev.best[level.id] ?? 0, newLevelScore) },
        };
        saveProgress(next);
        return next;
      });
    }
    dispatch({ type: 'LAND' });
  };

  liveRef.current = (flight: Flight) => {
    setHud(snapshot(flight));
    if (mode !== 'desafio') setSamples(flight.samples.slice());
  };

  // ---------- teclado ----------
  keyRef.current = (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      if (machine.state === 'aiming') fire();
      else if (machine.state === 'result') continueAfterResult();
    } else if (e.key === 'p' || e.key === 'P') togglePause();
    else if (machine.state === 'aiming' && level.controls.angle && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      const delta = e.key === 'ArrowUp' ? 1 : -1;
      updateParams({ angleDeg: Math.max(0, Math.min(90, Math.round(params.angleDeg) + delta)) });
    } else if (machine.state === 'aiming' && level.controls.force && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      const delta = e.key === 'ArrowRight' ? 100 : -100;
      updateParams({ force: Math.max(LIMITS.force.min, Math.min(forceMax, params.force + delta)) });
    }
  };
  useEffect(() => {
    const handler = (e: KeyboardEvent) => keyRef.current(e);
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ---------- interface ----------
  const maxShots = mode === 'desafio' ? level.difficulty.maxShots : 0;
  const hits = shots.filter((s) => s.outcome === 'hit').length;
  const isLastLevel = nextLevelId(level.id) === null;

  return (
    <div className={`game mode-${mode}`}>
      <div className="game-top">
        <div className="mode-badge">{MODE_LABEL[mode]}</div>
        {!isLab && (
          <nav className="level-pills" aria-label="Níveis">
            {LEVELS.map((l) => {
              const locked = mode === 'desafio' && l.id > progress.unlocked;
              return (
                <button
                  key={l.id}
                  type="button"
                  className={`level-pill ${l.id === level.id ? 'current' : ''} ${progress.best[l.id] !== undefined ? 'done' : ''}`}
                  disabled={locked || busy}
                  title={locked ? 'Conclua o nível anterior para desbloquear' : l.title}
                  onClick={() => goToLevel(l.id)}
                >
                  {locked ? '🔒' : l.id}
                </button>
              );
            })}
          </nav>
        )}
        {!isLab && (
          <div className="scoreboard">
            <span>
              Pontos <strong>{totalScore}</strong>
            </span>
            <span>
              Disparos <strong>{shots.length}{maxShots > 0 ? `/${maxShots}` : ''}</strong>
            </span>
            <span>
              Precisão <strong>{shots.length ? Math.round((hits / shots.length) * 100) : 0}%</strong>
            </span>
          </div>
        )}
      </div>

      <div className="game-grid">
        <section className="stage-col">
          <div className="stage">
            <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="stage-canvas" aria-label="Cena do simulador de canhão" />

            <div className="stage-chip top-left">
              <strong>{isLab ? 'Laboratório' : `Nível ${level.id}`}</strong> · {level.subtitle}
            </div>
            <div className="stage-chip top-right">
              {world.toggles.wind ? `🌬 ${describeWind(world.windSpeed)} · ${fmtBR(Math.abs(world.windSpeed), 1)} m/s` : '🌬 Vento desligado'}
            </div>

            {machine.state === 'paused' && <div className="paused-badge">⏸ Pausado — use “Avançar quadro”</div>}

            {machine.state === 'result' && result && (
              <div className={`result-card ${result.record.outcome === 'hit' ? 'hit' : 'miss'}`} role="status">
                <h3>{OUTCOME_TEXT[result.record.outcome]}</h3>
                <p className="result-meta">
                  Tempo de voo {fmtBR(result.record.flightTime, 2)} s · altura máx {fmtBR(result.record.maxHeight, 1)} m
                  {result.record.impactX !== null && result.record.outcome !== 'hit'
                    ? ` · ${fmtBR(Math.abs(result.record.impactX - level.target.x), 1)} m do alvo`
                    : ''}
                </p>
                {!isLab && result.score.lines.length > 0 && (
                  <ul className="score-lines">
                    {result.score.lines.map((l) => (
                      <li key={l.label} className={l.points < 0 ? 'neg' : ''}>
                        <span>{l.label}</span>
                        <strong>{l.points > 0 ? `+${l.points}` : l.points}</strong>
                      </li>
                    ))}
                  </ul>
                )}
                {result.record.recoilViolation && <p className="warn-text">O recuo passou do limite: este acerto não conta.</p>}
                {result.evaluation.requiredMasses > 1 && !result.evaluation.complete && result.record.outcome === 'hit' && (
                  <p>Agora acerte com outra massa ({result.evaluation.distinctMasses}/{result.evaluation.requiredMasses}).</p>
                )}
                <button type="button" className="btn btn-primary" onClick={continueAfterResult} autoFocus>
                  {!isLab && result.evaluation.complete ? 'Concluir nível ★' : result.evaluation.failed ? 'Ver resultado' : 'Próximo disparo'}
                </button>
              </div>
            )}

            {machine.state === 'levelComplete' && (
              <div className="overlay" role="dialog" aria-label="Nível concluído">
                <div className="overlay-card">
                  <div className="stars" aria-label={`${starRating(shots.length, maxShots)} estrelas`}>
                    {[1, 2, 3].map((n) => (
                      <span key={n} className={n <= starRating(shots.length, maxShots) ? 'on' : ''}>
                        ★
                      </span>
                    ))}
                  </div>
                  <h2>{isLastLevel ? 'Você concluiu todos os níveis!' : 'Nível concluído!'}</h2>
                  <p>
                    {level.title} · {shots.length} disparo(s) · {levelScore} pontos no nível
                  </p>
                  {isLastLevel && <p className="big-score">Pontuação total: {totalScore}</p>}
                  <div className="overlay-actions">
                    {!isLastLevel && (
                      <button type="button" className="btn btn-primary" onClick={() => goToLevel(nextLevelId(level.id) as number)}>
                        Próximo nível →
                      </button>
                    )}
                    <button type="button" className="btn btn-ghost" onClick={() => goToLevel(level.id)}>
                      Jogar de novo
                    </button>
                    {isLastLevel && (
                      <button type="button" className="btn btn-secondary" onClick={() => onNavigate('lab')}>
                        Ir ao laboratório
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {machine.state === 'levelFailed' && (
              <div className="overlay" role="dialog" aria-label="Tentativas esgotadas">
                <div className="overlay-card">
                  <h2>Tentativas esgotadas</h2>
                  <p>Revise as explicações ao lado: elas mostram o que mudar no próximo plano de disparo.</p>
                  <div className="overlay-actions">
                    <button type="button" className="btn btn-primary" onClick={retryLevel}>
                      Tentar novamente
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={() => onNavigate('home')}>
                      Menu inicial
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="action-bar">
            {machine.state === 'result' ? (
              <button type="button" className="btn btn-fire" onClick={continueAfterResult}>
                Continuar ▶
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-fire"
                disabled={machine.state !== 'aiming' || !validation.valid}
                onClick={fire}
                title="Atalho: barra de espaço"
              >
                💥 Disparar
              </button>
            )}
            <button type="button" className="btn btn-secondary" disabled={!busy} onClick={togglePause} title="Atalho: P">
              {machine.state === 'paused' ? '▶ Continuar' : '⏸ Pausar'}
            </button>
            <button type="button" className="btn btn-secondary" disabled={machine.state !== 'paused'} onClick={stepFrame}>
              ⏭ Avançar quadro
            </button>
            <label className={`switch compact ${showVectors ? 'on' : ''}`}>
              <input type="checkbox" checked={showVectors} onChange={(e) => setShowVectors(e.target.checked)} />
              <span className="switch-track">
                <span className="switch-thumb" />
              </span>
              Vetores
            </label>
            {isLab && (
              <label className="speed-select">
                Velocidade
                <select value={timeScale} onChange={(e) => setTimeScale(Number(e.target.value))}>
                  <option value={0.25}>0,25×</option>
                  <option value={0.5}>0,5×</option>
                  <option value={1}>1×</option>
                  <option value={2}>2×</option>
                </select>
              </label>
            )}
            <span className="kbd-hint">Espaço: disparar · ↑↓ ângulo · ←→ força · P: pausar</span>
          </div>

          <VectorLegend />

          {isLab && comparisons.length > 0 && (
            <div className="trace-list">
              {comparisons.map((c, i) => (
                <span key={c.id}>
                  <i style={{ background: c.color }} /> #{i + 1}: {c.label}
                </span>
              ))}
            </div>
          )}

          <StatsPanel
            force={params.force}
            mass={params.mass}
            acceleration={acceleration}
            launchSpeed={v0}
            distanceToTarget={level.target.x - muzzle.x}
            flightTime={prediction && prediction.landing ? prediction.flightTime : null}
            flightTimeIsEstimate={estimateOnly}
            maxHeight={prediction && (previewFraction >= 1 || mode !== 'desafio') ? prediction.maxHeight : null}
            recoil={recoilPreview}
            maxRecoil={level.constraints.maxRecoil}
            hud={hud}
          />

          {mode !== 'desafio' && <MotionCharts samples={samples} />}
        </section>

        <aside className="side-col">
          <GameControls params={params} controls={level.controls} forceMax={forceMax} disabled={controlsLocked} errors={validation.errors} onChange={updateParams} />
          {isLab && (
            <LabPanel
              world={world}
              disabled={controlsLocked}
              keepTraces={keepTraces}
              traceCount={comparisons.length}
              onWorld={updateWorld}
              onKeepTraces={setKeepTraces}
              onClearTraces={() => setComparisons([])}
            />
          )}
          <EducationPanel
            mode={mode}
            level={level}
            feedback={feedback}
            evaluation={evaluation}
            liveForces={busy && hud ? hud.forces : launchForces}
            mass={params.mass}
          />
          <EngineeringLive machine={machine} />
        </aside>
      </div>
    </div>
  );
}
