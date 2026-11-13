/**
 * Sistema de vento (modelo simplificado para o jogo).
 *
 * O vento empurra o projétil com uma força horizontal proporcional à
 * velocidade do vento e à área do projétil:  F = k · w · (r / r_ref)²
 * Pela 2ª lei (a = F/m), projéteis leves e grandes são mais desviados.
 */
import type { Vec2 } from './types';
import { vec } from './vector';

/** Constante do modelo: newtons por (m/s) de vento, para o raio de referência. */
export const WIND_COEFFICIENT = 0.6;
export const REFERENCE_RADIUS = 0.08;

export function windForce(windSpeed: number, radius: number): Vec2 {
  const areaFactor = (radius / REFERENCE_RADIUS) ** 2;
  return vec(WIND_COEFFICIENT * windSpeed * areaFactor, 0);
}

/** Sorteia o vento do próximo disparo dentro de [base - variação, base + variação]. */
export function nextWind(base: number, variation: number, rng: () => number = Math.random): number {
  const value = base + (rng() * 2 - 1) * variation;
  return Math.round(value * 2) / 2; // passos de 0,5 m/s
}

export function describeWind(speed: number): string {
  const s = Math.abs(speed);
  const dir = speed > 0 ? 'a favor (→)' : 'contra (←)';
  if (s < 0.5) return 'Sem vento';
  if (s < 4) return `Brisa leve ${dir}`;
  if (s < 9) return `Vento moderado ${dir}`;
  return `Vento forte ${dir}`;
}
