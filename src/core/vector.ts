/**
 * Operações com vetores 2D. Funções puras: nunca alteram os argumentos.
 */
import type { Vec2 } from './types';

export const vec = (x: number, y: number): Vec2 => ({ x, y });

export const ZERO: Vec2 = Object.freeze({ x: 0, y: 0 });

export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });

export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });

export const scale = (a: Vec2, k: number): Vec2 => ({ x: a.x * k, y: a.y * k });

export const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y;

export const length = (a: Vec2): number => Math.hypot(a.x, a.y);

export const distance = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);

/** Vetor unitário na mesma direção (ou zero, se o vetor for nulo). */
export function normalize(a: Vec2): Vec2 {
  const len = length(a);
  return len === 0 ? ZERO : { x: a.x / len, y: a.y / len };
}

export const toRadians = (deg: number): number => (deg * Math.PI) / 180;

export const toDegrees = (rad: number): number => (rad * 180) / Math.PI;

/** Cria um vetor a partir de um ângulo (graus, a partir do eixo X) e um módulo. */
export function fromAngle(angleDeg: number, magnitude: number): Vec2 {
  const r = toRadians(angleDeg);
  return { x: Math.cos(r) * magnitude, y: Math.sin(r) * magnitude };
}

export const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));
