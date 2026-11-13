/**
 * Terreno: uma linha poligonal (lista de pontos ordenados em X).
 * Fornece altura e vetor normal em qualquer posição horizontal.
 */
import type { TerrainPoint, Vec2 } from './types';
import { normalize, vec } from './vector';

/** Altura do terreno em x, por interpolação linear entre os pontos. */
export function heightAt(points: TerrainPoint[], x: number): number {
  if (points.length === 0) return 0;
  if (x <= points[0].x) return points[0].y;
  const last = points[points.length - 1];
  if (x >= last.x) return last.y;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (x <= b.x) {
      const span = b.x - a.x;
      if (span <= 0) return Math.max(a.y, b.y);
      const t = (x - a.x) / span;
      return a.y + (b.y - a.y) * t;
    }
  }
  return last.y;
}

/** Inclinação (dy/dx) do terreno em x. */
export function slopeAt(points: TerrainPoint[], x: number): number {
  const h = 0.05;
  return (heightAt(points, x + h) - heightAt(points, x - h)) / (2 * h);
}

/** Vetor normal unitário (apontando para fora do solo) em x. */
export function normalAt(points: TerrainPoint[], x: number): Vec2 {
  return normalize(vec(-slopeAt(points, x), 1));
}

/** Menor altura do terreno (usada para enquadrar a câmera e os limites). */
export function minHeight(points: TerrainPoint[]): number {
  return points.reduce((m, p) => Math.min(m, p.y), Infinity);
}

/** Valida a definição de um terreno. Retorna a lista de problemas encontrados. */
export function validateTerrain(points: TerrainPoint[]): string[] {
  const errors: string[] = [];
  if (points.length < 2) errors.push('O terreno precisa de pelo menos 2 pontos.');
  for (let i = 1; i < points.length; i++) {
    if (points[i].x < points[i - 1].x) errors.push(`Ponto ${i} do terreno está fora de ordem em X.`);
  }
  if (points.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))) {
    errors.push('O terreno contém coordenadas inválidas.');
  }
  return errors;
}
