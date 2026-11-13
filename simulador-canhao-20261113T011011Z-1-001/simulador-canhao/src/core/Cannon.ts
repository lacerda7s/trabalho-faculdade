/**
 * Geometria do canhão. Física e desenho usam a MESMA geometria,
 * para que o projétil saia exatamente da boca do cano desenhado.
 */
import type { Vec2 } from './types';
import { fromAngle } from './vector';

/** altura do eixo de rotação acima do solo (m) */
export const PIVOT_HEIGHT = 1.4;
/** comprimento do cano (m) */
export const BARREL_LENGTH = 3.2;
/** diâmetro externo do cano (m) */
export const BARREL_WIDTH = 0.9;
export const WHEEL_RADIUS = 1.2;

export function pivotPosition(baseX: number, groundY: number, recoilOffset = 0): Vec2 {
  return { x: baseX - recoilOffset, y: groundY + PIVOT_HEIGHT };
}

/** Posição da boca do cano, de onde o projétil é lançado. */
export function muzzlePosition(baseX: number, groundY: number, angleDeg: number, recoilOffset = 0): Vec2 {
  const pivot = pivotPosition(baseX, groundY, recoilOffset);
  const tip = fromAngle(angleDeg, BARREL_LENGTH);
  return { x: pivot.x + tip.x, y: pivot.y + tip.y };
}
