/**
 * Motor de física: forças, integração numérica e recuo do canhão.
 *
 * Integração: Euler semi-implícito com passo fixo.
 *   a = F_total / m        (2ª lei de Newton)
 *   v ← v + a·Δt
 *   x ← x + v·Δt
 */
import type { Body, ForceBreakdown, RecoilInfo, Vec2, WorldSettings } from './types';
import { add, dot, length, scale, sub, toRadians, vec, ZERO } from './vector';
import { windForce } from './WindSystem';

export const DEFAULT_GRAVITY = 9.81;
/** densidade do ar ao nível do mar (kg/m³) */
export const AIR_DENSITY = 1.225;
/** tempo que a força da pólvora age sobre o projétil dentro do cano (s) */
export const BARREL_TIME = 0.01;
/** passo fixo da simulação (s) — 120 atualizações por segundo */
export const FIXED_DT = 1 / 120;
/** coeficiente de atrito de rolamento das rodas do canhão */
export const ROLLING_FRICTION = 0.05;
/** abaixo desta velocidade normal o projétil para de quicar (m/s) */
export const REST_NORMAL_SPEED = 2.5;
/** fração da velocidade tangencial mantida em cada quique */
export const GROUND_GRIP = 0.75;

/** 2ª lei de Newton: a = F / m */
export function launchAcceleration(force: number, mass: number): number {
  if (!(mass > 0)) throw new Error('A massa precisa ser positiva.');
  return force / mass;
}

/** Velocidade na saída do cano: v₀ = a · Δt (partindo do repouso). */
export function launchSpeed(force: number, mass: number): number {
  return launchAcceleration(force, mass) * BARREL_TIME;
}

export const crossSectionArea = (radius: number): number => Math.PI * radius * radius;

export function gravityForce(mass: number, world: WorldSettings): Vec2 {
  return world.toggles.gravity ? vec(0, -mass * world.gravity) : ZERO;
}

/** Arrasto quadrático: F = -½ · ρ · Cd · A · |v| · v */
export function dragForce(velocity: Vec2, radius: number, dragCoefficient: number, world: WorldSettings): Vec2 {
  if (!world.toggles.airResistance || world.airDensityFactor <= 0) return ZERO;
  const speed = length(velocity);
  if (speed === 0) return ZERO;
  const k = 0.5 * AIR_DENSITY * world.airDensityFactor * dragCoefficient * crossSectionArea(radius);
  return scale(velocity, -k * speed);
}

/** Soma todas as forças que atuam no corpo. */
export function computeForces(body: Body, world: WorldSettings): ForceBreakdown {
  const gravity = gravityForce(body.mass, world);
  const wind = world.toggles.wind ? windForce(world.windSpeed, body.radius) : ZERO;
  const drag = dragForce(body.velocity, body.radius, body.dragCoefficient, world);
  return { gravity, wind, drag, total: add(add(gravity, wind), drag) };
}

export interface StepResult {
  body: Body;
  forces: ForceBreakdown;
  acceleration: Vec2;
}

/** Avança o corpo um passo de tempo. Não altera o corpo original. */
export function stepBody(body: Body, world: WorldSettings, dt: number): StepResult {
  const forces = computeForces(body, world);
  const acceleration = scale(forces.total, 1 / body.mass);
  const velocity = add(body.velocity, scale(acceleration, dt));
  const position = add(body.position, scale(velocity, dt));
  return { body: { ...body, position, velocity }, forces, acceleration };
}

/**
 * Quique no solo: inverte a componente normal (multiplicada pela restituição)
 * e reduz a componente tangencial (atrito).
 * Retorna `null` quando o quique é fraco demais e o projétil deve parar.
 */
export function bounce(velocity: Vec2, normal: Vec2, restitution: number): Vec2 | null {
  const vn = dot(velocity, normal);
  if (vn >= 0) return velocity; // já está se afastando do solo
  const normalOut = -vn * restitution;
  if (normalOut < REST_NORMAL_SPEED) return null;
  const tangential = sub(velocity, scale(normal, vn));
  return add(scale(normal, normalOut), scale(tangential, GROUND_GRIP));
}

/**
 * 3ª lei de Newton + conservação do momento.
 * O projétil recebe momento m·v₀; o canhão recebe o mesmo momento no sentido oposto.
 * Só a componente horizontal faz o canhão andar (a vertical é absorvida pelo solo).
 */
export function computeRecoil(
  projectileMass: number,
  speed: number,
  angleDeg: number,
  cannonMass: number,
  enabled: boolean,
): RecoilInfo {
  const momentum = projectileMass * speed * Math.cos(toRadians(angleDeg));
  if (!enabled || cannonMass <= 0) return { momentum, velocity: 0, distance: 0 };
  const velocity = momentum / cannonMass;
  const distance = (velocity * velocity) / (2 * ROLLING_FRICTION * DEFAULT_GRAVITY);
  return { momentum, velocity, distance };
}
