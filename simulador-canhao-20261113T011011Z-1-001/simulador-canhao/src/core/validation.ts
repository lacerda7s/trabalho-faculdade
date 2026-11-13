/**
 * Validação dos valores dos controles.
 * A interface usa estes limites nos sliders; a física só recebe valores válidos.
 */
import type { LaunchParams, LevelConstraints, WorldSettings } from './types';
import { isProjectileKind } from './Projectile';
import { clamp } from './vector';

export interface Limit {
  min: number;
  max: number;
  step: number;
  unit: string;
  label: string;
}

export const LIMITS = {
  angleDeg: { min: 0, max: 90, step: 1, unit: '°', label: 'Ângulo' },
  force: { min: 500, max: 12000, step: 100, unit: 'N', label: 'Força do disparo' },
  mass: { min: 1, max: 10, step: 0.1, unit: 'kg', label: 'Massa do projétil' },
  cannonMass: { min: 20, max: 2000, step: 10, unit: 'kg', label: 'Massa do canhão' },
  windSpeed: { min: -15, max: 15, step: 0.5, unit: 'm/s', label: 'Vento' },
  airDensityFactor: { min: 0, max: 5, step: 0.1, unit: '×', label: 'Resistência do ar' },
  gravity: { min: 0, max: 30, step: 0.1, unit: 'm/s²', label: 'Gravidade' },
} satisfies Record<string, Limit>;

export type LimitKey = keyof typeof LIMITS;

/** Retorna uma mensagem de erro ou null se o valor estiver dentro do limite. */
export function validateNumber(key: LimitKey, value: number, maxOverride?: number): string | null {
  const limit: Limit = LIMITS[key];
  const max = maxOverride ?? limit.max;
  if (typeof value !== 'number' || !Number.isFinite(value)) return `${limit.label}: informe um número válido.`;
  if (value < limit.min) return `${limit.label}: o mínimo é ${limit.min} ${limit.unit}.`;
  if (value > max) return `${limit.label}: o máximo é ${max} ${limit.unit}.`;
  return null;
}

export function clampToLimit(key: LimitKey, value: number): number {
  const limit: Limit = LIMITS[key];
  if (!Number.isFinite(value)) return limit.min;
  return clamp(value, limit.min, limit.max);
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateLaunch(params: LaunchParams, constraints: LevelConstraints = {}): ValidationResult {
  const errors: string[] = [];
  const push = (e: string | null) => {
    if (e) errors.push(e);
  };
  push(validateNumber('angleDeg', params.angleDeg));
  push(validateNumber('force', params.force, constraints.maxForce));
  push(validateNumber('mass', params.mass));
  push(validateNumber('cannonMass', params.cannonMass));
  if (!isProjectileKind(params.projectile)) errors.push('Tipo de projétil desconhecido.');
  return { valid: errors.length === 0, errors };
}

export function validateWorld(world: WorldSettings): ValidationResult {
  const errors: string[] = [];
  const push = (e: string | null) => {
    if (e) errors.push(e);
  };
  push(validateNumber('gravity', world.gravity));
  push(validateNumber('windSpeed', world.windSpeed));
  push(validateNumber('airDensityFactor', world.airDensityFactor));
  return { valid: errors.length === 0, errors };
}
