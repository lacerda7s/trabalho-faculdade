/** Projétil, rastro e trajetórias (prevista e comparações). */
import type { Body, ProjectileSpec, Vec2 } from '../core/types';
import { Camera, toScreen } from './Camera';

export function drawPath(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  points: Vec2[],
  color: string,
  opts: { width?: number; dash?: number[]; alpha?: number } = {},
): void {
  if (points.length < 2) return;
  ctx.save();
  ctx.globalAlpha = opts.alpha ?? 1;
  ctx.strokeStyle = color;
  ctx.lineWidth = opts.width ?? 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash(opts.dash ?? []);
  ctx.beginPath();
  points.forEach((p, i) => {
    const s = toScreen(cam, p);
    if (i === 0) ctx.moveTo(s.x, s.y);
    else ctx.lineTo(s.x, s.y);
  });
  ctx.stroke();
  ctx.restore();
}

/** Linha pontilhada da trajetória prevista, com marcador de "fim da previsão". */
export function drawPrediction(ctx: CanvasRenderingContext2D, cam: Camera, points: Vec2[], complete: boolean): void {
  if (points.length < 2) return;
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.strokeStyle = 'rgba(33, 37, 41, 0.35)';
  ctx.lineWidth = 1;
  let acc = 0;
  for (let i = 1; i < points.length; i++) {
    const a = toScreen(cam, points[i - 1]);
    const b = toScreen(cam, points[i]);
    acc += Math.hypot(b.x - a.x, b.y - a.y);
    if (acc >= 9) {
      acc = 0;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
  const end = toScreen(cam, points[points.length - 1]);
  if (complete) {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(end.x - 6, end.y - 6);
    ctx.lineTo(end.x + 6, end.y + 6);
    ctx.moveTo(end.x + 6, end.y - 6);
    ctx.lineTo(end.x - 6, end.y + 6);
    ctx.stroke();
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = '700 15px Nunito, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('?', end.x + 6, end.y - 4);
  }
  ctx.restore();
}

export function drawProjectile(ctx: CanvasRenderingContext2D, cam: Camera, body: Body, spec: ProjectileSpec): void {
  const p = toScreen(cam, body.position);
  const r = Math.max(5, body.radius * cam.scale * 1.5);
  const g = ctx.createRadialGradient(p.x - r * 0.35, p.y - r * 0.35, r * 0.1, p.x, p.y, r);
  g.addColorStop(0, '#f8f9fa');
  g.addColorStop(0.35, spec.color);
  g.addColorStop(1, '#111');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** Seta no topo da tela quando o projétil sobe além da área visível. */
export function drawOffscreenMarker(ctx: CanvasRenderingContext2D, cam: Camera, body: Body): void {
  if (body.position.y <= cam.maxY) return;
  const x = (body.position.x - cam.minX) * cam.scale;
  ctx.fillStyle = 'rgba(33, 37, 41, 0.8)';
  ctx.beginPath();
  ctx.moveTo(x, 6);
  ctx.lineTo(x - 8, 20);
  ctx.lineTo(x + 8, 20);
  ctx.closePath();
  ctx.fill();
  ctx.font = '700 11px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`${body.position.y.toFixed(0)} m`, x, 34);
}
