/** Setas de vetores (velocidade, gravidade, vento, arrasto, ação e reação). */
import type { Vec2 } from '../core/types';

export const VECTOR_COLORS = {
  velocity: '#2f9e44',
  gravity: '#e03131',
  wind: '#1c7ed6',
  drag: '#f08c00',
  action: '#7048e8',
  reaction: '#d6336c',
} as const;

export type VectorKind = keyof typeof VECTOR_COLORS;

/** Converte o módulo de uma grandeza em comprimento de seta, com limites legíveis. */
export function arrowLength(magnitude: number, pxPerUnit: number, min = 16, max = 130): number {
  if (magnitude <= 1e-9) return 0;
  return Math.min(max, Math.max(min, magnitude * pxPerUnit));
}

/**
 * Desenha uma seta a partir de `from` (tela) na direção `dir` (mundo: Y para cima).
 */
export function drawArrow(
  ctx: CanvasRenderingContext2D,
  from: Vec2,
  dir: Vec2,
  len: number,
  color: string,
  label?: string,
  alpha = 1,
): void {
  const mag = Math.hypot(dir.x, dir.y);
  if (len <= 0 || mag === 0) return;
  const ux = dir.x / mag;
  const uy = -dir.y / mag; // tela tem Y invertido
  const to = { x: from.x + ux * len, y: from.y + uy * len };
  const head = Math.min(10, len * 0.4);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x - ux * head * 0.6, to.y - uy * head * 0.6);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - ux * head - uy * head * 0.55, to.y - uy * head + ux * head * 0.55);
  ctx.lineTo(to.x - ux * head + uy * head * 0.55, to.y - uy * head - ux * head * 0.55);
  ctx.closePath();
  ctx.fill();
  if (label) {
    ctx.font = '800 11px Nunito, sans-serif';
    ctx.textAlign = 'center';
    const lx = to.x + ux * 12;
    const ly = to.y + uy * 12 + 4;
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.strokeText(label, lx, ly);
    ctx.fillText(label, lx, ly);
  }
  ctx.restore();
}
