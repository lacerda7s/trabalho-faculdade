/**
 * Simulação de um voo completo: integra a física passo a passo,
 * verifica colisões e registra amostras para gráficos.
 *
 * Por desempenho, `advanceFlight` altera o objeto `Flight` recebido
 * (ele é dono exclusivo do estado do voo em andamento).
 */
import type { Body, ForceBreakdown, ShotOutcome, SimEnvironment, SimSample, Vec2, WorldSettings } from './types';
import { bounce, computeForces, FIXED_DT, stepBody } from './PhysicsEngine';
import { detectCollision, isOutOfBounds } from './CollisionDetector';
import { normalAt } from './Terrain';
import { distance, scale } from './vector';

export const MAX_FLIGHT_TIME = 40;
const SAMPLE_EVERY = 3;
const TRAIL_EVERY = 2;
const MAX_BOUNCES = 8;

export interface Flight {
  body: Body;
  t: number;
  steps: number;
  samples: SimSample[];
  trail: Vec2[];
  outcome: ShotOutcome | null;
  /** primeiro ponto onde o projétil tocou algo */
  firstImpact: Vec2 | null;
  obstacleIndex: number;
  /** distância ao centro do alvo no momento do acerto */
  targetDistance: number | null;
  /** menor distância ao centro do alvo durante o voo */
  closestApproach: number;
  maxHeight: number;
  bounces: number;
  forces: ForceBreakdown;
  acceleration: Vec2;
}

function sampleOf(t: number, body: Body, acceleration: Vec2): SimSample {
  return {
    t,
    x: body.position.x,
    y: body.position.y,
    vx: body.velocity.x,
    vy: body.velocity.y,
    ax: acceleration.x,
    ay: acceleration.y,
  };
}

export function createFlight(body: Body, world: WorldSettings): Flight {
  const forces = computeForces(body, world);
  const acceleration = scale(forces.total, 1 / body.mass);
  return {
    body,
    t: 0,
    steps: 0,
    samples: [sampleOf(0, body, acceleration)],
    trail: [{ ...body.position }],
    outcome: null,
    firstImpact: null,
    obstacleIndex: -1,
    targetDistance: null,
    closestApproach: Infinity,
    maxHeight: body.position.y,
    bounces: 0,
    forces,
    acceleration,
  };
}

/** Avança o voo um passo. Não faz nada se o voo já terminou. */
export function advanceFlight(flight: Flight, env: SimEnvironment, dt: number = FIXED_DT): Flight {
  if (flight.outcome) return flight;

  const step = stepBody(flight.body, env.world, dt);
  flight.body = step.body;
  flight.forces = step.forces;
  flight.acceleration = step.acceleration;
  flight.t += dt;
  flight.steps += 1;

  const pos = flight.body.position;
  flight.maxHeight = Math.max(flight.maxHeight, pos.y);
  flight.closestApproach = Math.min(flight.closestApproach, distance(pos, env.target));
  if (flight.steps % TRAIL_EVERY === 0) flight.trail.push({ ...pos });
  if (flight.steps % SAMPLE_EVERY === 0) flight.samples.push(sampleOf(flight.t, flight.body, flight.acceleration));

  const collision = detectCollision(pos, flight.body.radius, env);
  switch (collision.type) {
    case 'target':
      flight.targetDistance = Math.min(collision.distance, pathMissDistance(pos, flight.body.velocity, env.target));
      finish(flight, 'hit');
      return flight;
    case 'obstacle':
      flight.obstacleIndex = collision.index;
      finish(flight, 'obstacle');
      return flight;
    case 'ground':
      handleGround(flight, env, collision.groundY);
      if (flight.outcome) return flight;
      break;
    case 'none':
      break;
  }

  if (isOutOfBounds(pos, env.bounds)) finish(flight, 'outOfBounds');
  else if (flight.t >= MAX_FLIGHT_TIME) finish(flight, 'timeout');
  return flight;
}

/**
 * Precisão do acerto: o contato é detectado na borda do alvo, então medimos
 * a que distância do centro passaria a reta do movimento (|r × v̂|).
 */
export function pathMissDistance(position: Vec2, velocity: Vec2, center: Vec2): number {
  const speed = Math.hypot(velocity.x, velocity.y);
  if (speed === 0) return distance(position, center);
  const rx = center.x - position.x;
  const ry = center.y - position.y;
  return Math.abs(rx * velocity.y - ry * velocity.x) / speed;
}

function handleGround(flight: Flight, env: SimEnvironment, groundY: number): void {
  const body = flight.body;
  if (!flight.firstImpact) flight.firstImpact = { x: body.position.x, y: groundY };
  const normal = normalAt(env.terrain, body.position.x);
  const bounced = flight.bounces < MAX_BOUNCES ? bounce(body.velocity, normal, body.restitution) : null;
  // reposiciona o projétil sobre a superfície
  flight.body = { ...body, position: { x: body.position.x, y: groundY + body.radius } };
  if (!bounced) {
    flight.body.velocity = { x: 0, y: 0 };
    finish(flight, 'ground');
    return;
  }
  flight.bounces += 1;
  flight.body.velocity = bounced;
}

function finish(flight: Flight, outcome: ShotOutcome): void {
  flight.outcome = outcome;
  if (!flight.firstImpact && outcome !== 'outOfBounds' && outcome !== 'timeout') {
    flight.firstImpact = { ...flight.body.position };
  }
  flight.trail.push({ ...flight.body.position });
  flight.samples.push(sampleOf(flight.t, flight.body, flight.acceleration));
}

/** Simula um voo inteiro de uma vez (usado em testes e na análise pós-disparo). */
export function simulateFlight(body: Body, env: SimEnvironment, dt: number = FIXED_DT): Flight {
  const flight = createFlight(body, env.world);
  while (!flight.outcome) advanceFlight(flight, env, dt);
  return flight;
}
