import { describe, expect, it } from './testRunner';
import { accuracyRate, applyScore, computeShotScore, hitPrecision, SCORE_RULES, starRating } from '../src/core/ScoreSystem';
import { canTransition, createMachine, gameReducer, transition } from '../src/core/GameStateManager';
import { LIMITS, validateLaunch, validateNumber } from '../src/core/validation';
import { buildEnvironment, evaluateLevel, LAB_LEVEL, LEVELS, validateLevel, worldFromLevel } from '../src/core/LevelManager';
import { computeRecoil, launchSpeed } from '../src/core/PhysicsEngine';
import { simulateFlight } from '../src/core/Simulation';
import { createProjectileBody, PROJECTILES } from '../src/core/Projectile';
import { muzzlePosition } from '../src/core/Cannon';
import { heightAt } from '../src/core/Terrain';
import { fromAngle } from '../src/core/vector';
import type { LaunchParams, ShotRecord } from '../src/core/types';

const params: LaunchParams = { angleDeg: 45, force: 6000, mass: 4, projectile: 'ferro', cannonMass: 400 };

function shot(over: Partial<ShotRecord> = {}): ShotRecord {
  return {
    shotNumber: 1,
    params,
    windSpeed: 0,
    outcome: 'hit',
    launchSpeed: 15,
    flightTime: 2,
    maxHeight: 5,
    impactX: 40,
    targetDistance: 0.5,
    closestApproach: 0.5,
    recoil: { momentum: 40, velocity: 0.1, distance: 0.01 },
    recoilViolation: false,
    points: 0,
    ...over,
  };
}

describe('Pontuação', () => {
  const base = { targetRadius: 2, force: 6000, forceLimit: 12000, shotNumber: 1, maxShots: 6 };

  it('erro sem obstáculo vale 0', () => {
    expect(computeShotScore({ ...base, outcome: 'ground', targetDistance: null }).total).toBe(0);
  });

  it('acerto no centro dá precisão máxima', () => {
    const s = computeShotScore({ ...base, outcome: 'hit', targetDistance: 0 });
    expect(s.precision).toBe(1);
    expect(s.total).toBeGreaterThan(SCORE_RULES.HIT_BASE + SCORE_RULES.PRECISION_MAX);
  });

  it('acertar com menos disparos vale mais', () => {
    const first = computeShotScore({ ...base, outcome: 'hit', targetDistance: 1, shotNumber: 1 });
    const fifth = computeShotScore({ ...base, outcome: 'hit', targetDistance: 1, shotNumber: 5 });
    expect(first.total).toBeGreaterThan(fifth.total);
  });

  it('bônus por usar pouca força', () => {
    const weak = computeShotScore({ ...base, outcome: 'hit', targetDistance: 1, force: 3000 });
    const strong = computeShotScore({ ...base, outcome: 'hit', targetDistance: 1, force: 11000 });
    expect(weak.total).toBeGreaterThan(strong.total);
  });

  it('penalidade por obstáculo', () => {
    const s = computeShotScore({ ...base, outcome: 'obstacle', targetDistance: null });
    expect(s.total).toBe(-SCORE_RULES.OBSTACLE_PENALTY);
  });

  it('pontuação acumulada nunca fica negativa', () => {
    expect(applyScore(100, -500)).toBe(0);
    expect(applyScore(100, 50)).toBe(150);
  });

  it('precisão e taxa de acerto', () => {
    expect(hitPrecision(1, 2)).toBeCloseTo(0.5, 6);
    expect(hitPrecision(3, 2)).toBe(0);
    expect(accuracyRate(0, 0)).toBe(0);
    expect(accuracyRate(1, 4)).toBeCloseTo(0.25, 6);
  });

  it('estrelas', () => {
    expect(starRating(1, 6)).toBe(3);
    expect(starRating(3, 6)).toBe(2);
    expect(starRating(6, 6)).toBe(1);
  });
});

describe('Máquina de estados', () => {
  it('fluxo normal: mirar → voo → resultado → mirar', () => {
    let m = createMachine();
    m = gameReducer(m, { type: 'FIRE' });
    expect(m.state).toBe('flying');
    m = gameReducer(m, { type: 'LAND' });
    expect(m.state).toBe('result');
    m = gameReducer(m, { type: 'NEXT_SHOT' });
    expect(m.state).toBe('aiming');
    expect(m.lastError).toBeNull();
  });

  it('pausar e avançar quadro a quadro', () => {
    expect(transition('flying', 'PAUSE').state).toBe('paused');
    expect(transition('paused', 'STEP').state).toBe('paused');
    expect(transition('paused', 'RESUME').state).toBe('flying');
  });

  it('não permite disparar durante o voo', () => {
    let m = gameReducer(createMachine(), { type: 'FIRE' });
    m = gameReducer(m, { type: 'FIRE' });
    expect(m.state).toBe('flying');
    expect(m.lastError ?? '').toContain('FIRE');
    expect(m.history[0].ok).toBeFalsy();
  });

  it('RESET sempre volta para mirar', () => {
    for (const s of ['aiming', 'flying', 'paused', 'result', 'levelComplete', 'levelFailed'] as const) {
      expect(canTransition(s, 'RESET')).toBeTruthy();
    }
  });
});

describe('Validação dos controles', () => {
  it('aceita parâmetros válidos', () => {
    expect(validateLaunch(params).valid).toBeTruthy();
  });

  it('rejeita ângulo fora de 0–90°', () => {
    expect(validateLaunch({ ...params, angleDeg: 95 }).valid).toBeFalsy();
    expect(validateLaunch({ ...params, angleDeg: -1 }).valid).toBeFalsy();
  });

  it('rejeita NaN', () => {
    expect(validateNumber('mass', NaN)).toContain('número válido');
  });

  it('respeita a força máxima do nível', () => {
    const r = validateLaunch({ ...params, force: 7000 }, { maxForce: 6000 });
    expect(r.valid).toBeFalsy();
    expect(r.errors[0]).toContain('6000');
  });
});

describe('Níveis', () => {
  it('existem 7 níveis com ids sequenciais', () => {
    expect(LEVELS).toHaveLength(7);
    LEVELS.forEach((l, i) => expect(l.id).toBe(i + 1));
  });

  it('todos os níveis têm configuração válida', () => {
    const errors = [...LEVELS, LAB_LEVEL].flatMap(validateLevel);
    expect(errors).toEqual([]);
  });

  it('nível 1 conclui com um acerto', () => {
    expect(evaluateLevel(LEVELS[0], [shot()], 'desafio').complete).toBeTruthy();
  });

  it('nível 2 exige duas massas diferentes', () => {
    const level = LEVELS[1];
    expect(evaluateLevel(level, [shot(), shot({ shotNumber: 2 })], 'desafio').complete).toBeFalsy();
    const two = [shot(), shot({ shotNumber: 2, params: { ...params, mass: 2.5 } })];
    expect(evaluateLevel(level, two, 'desafio').complete).toBeTruthy();
  });

  it('acerto com recuo acima do limite não conta', () => {
    const level = LEVELS[2];
    expect(evaluateLevel(level, [shot({ recoilViolation: true })], 'desafio').complete).toBeFalsy();
  });

  it('esgotar os disparos no Desafio reprova o nível', () => {
    const level = LEVELS[6];
    const misses = [1, 2, 3].map((n) => shot({ shotNumber: n, outcome: 'ground', targetDistance: null }));
    const desafio = evaluateLevel(level, misses, 'desafio');
    expect(desafio.failed).toBeTruthy();
    expect(desafio.shotsLeft).toBe(0);
  });

  // Busca exaustiva (grade grossa) por um disparo que acerte o alvo respeitando
  // as restrições do nível, para os ventos extremos que o nível pode sortear.
  for (const level of LEVELS) {
    it(`nível ${level.id} tem solução (inclusive nos ventos extremos)`, () => {
      const winds = level.wind.variation > 0 ? [level.wind.base - level.wind.variation, level.wind.base + level.wind.variation] : [level.wind.base];
      const forceMax = Math.min(LIMITS.force.max, level.constraints.maxForce ?? Infinity);
      const masses = level.controls.mass ? [1.5, 2.5, 4] : [level.defaults.mass];
      const cannonMass = level.controls.cannonMass ? LIMITS.cannonMass.max : level.defaults.cannonMass;
      const groundY = heightAt(level.terrain, level.cannonX);
      const solvable = winds.every((windSpeed) => {
        const world = { ...worldFromLevel(level), windSpeed };
        const env = buildEnvironment(level, world);
        for (const mass of masses) {
          for (let angle = 10; angle <= 80; angle += 2) {
            for (let force = 1000; force <= forceMax; force += 250) {
              const speed = launchSpeed(force, mass);
              const recoil = computeRecoil(mass, speed, angle, cannonMass, world.toggles.recoil);
              if (level.constraints.maxRecoil !== undefined && recoil.distance > level.constraints.maxRecoil) continue;
              const muzzle = muzzlePosition(level.cannonX, groundY, angle);
              const body = createProjectileBody(PROJECTILES[level.defaults.projectile], mass, muzzle, fromAngle(angle, speed));
              if (simulateFlight(body, env).outcome === 'hit') return true;
            }
          }
        }
        return false;
      });
      expect(solvable).toBeTruthy();
    });
  }

  it('no Modo Aprendizado não há limite de disparos', () => {
    const misses = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => shot({ shotNumber: n, outcome: 'ground' }));
    const r = evaluateLevel(LEVELS[0], misses, 'aprendizado');
    expect(r.failed).toBeFalsy();
    expect(r.shotsLeft).toBeNull();
  });
});
