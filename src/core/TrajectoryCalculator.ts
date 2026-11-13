/**
 * Previsão de trajetória: roda a MESMA física do jogo "às escondidas"
 * até o primeiro impacto, e também oferece as fórmulas analíticas
 * do lançamento oblíquo no vácuo (usadas nos testes e nas explicações).
 */
import type { Body, ShotOutcome, SimEnvironment, Vec2 } from './types';
import { FIXED_DT } from './PhysicsEngine';
import { advanceFlight, createFlight, MAX_FLIGHT_TIME } from './Simulation';
import { toRadians } from './vector';

export interface PredictionOptions {
  includeWind?: boolean;
  includeDrag?: boolean;
  maxTime?: number;
}

export interface Prediction {
  points: Vec2[];
  flightTime: number;
  outcome: ShotOutcome | null;
  landing: Vec2 | null;
  maxHeight: number;
  hitsTarget: boolean;
}

export function predictTrajectory(body: Body, env: SimEnvironment, options: PredictionOptions = {}): Prediction {
  const toggles = {
    ...env.world.toggles,
    wind: env.world.toggles.wind && options.includeWind !== false,
    airResistance: env.world.toggles.airResistance && options.includeDrag !== false,
  };
  const previewEnv: SimEnvironment = { ...env, world: { ...env.world, toggles } };
  const maxTime = options.maxTime ?? MAX_FLIGHT_TIME;
  const flight = createFlight({ ...body }, previewEnv.world);

  while (!flight.outcome && !flight.firstImpact && flight.t < maxTime) {
    advanceFlight(flight, previewEnv, FIXED_DT);
  }

  return {
    points: flight.trail,
    flightTime: flight.t,
    outcome: flight.outcome ?? (flight.firstImpact ? 'ground' : null),
    landing: flight.firstImpact,
    maxHeight: flight.maxHeight,
    hitsTarget: flight.outcome === 'hit',
  };
}

/** Recorta o início da trajetória (dificuldade: mostrar só parte da previsão). */
export function slicePreview(points: Vec2[], fraction: number): Vec2[] {
  if (fraction >= 1) return points;
  const count = Math.max(2, Math.ceil(points.length * Math.max(0, fraction)));
  return points.slice(0, count);
}

/** Alcance no vácuo, lançado e aterrissando na mesma altura: R = v² · sen(2θ) / g */
export function analyticRange(speed: number, angleDeg: number, gravity: number): number {
  return (speed * speed * Math.sin(2 * toRadians(angleDeg))) / gravity;
}

/** Tempo de voo no vácuo (mesma altura): T = 2 · v · sen(θ) / g */
export function analyticFlightTime(speed: number, angleDeg: number, gravity: number): number {
  return (2 * speed * Math.sin(toRadians(angleDeg))) / gravity;
}

/** Altura máxima no vácuo: H = (v · sen θ)² / (2g) */
export function analyticMaxHeight(speed: number, angleDeg: number, gravity: number): number {
  const vy = speed * Math.sin(toRadians(angleDeg));
  return (vy * vy) / (2 * gravity);
}
