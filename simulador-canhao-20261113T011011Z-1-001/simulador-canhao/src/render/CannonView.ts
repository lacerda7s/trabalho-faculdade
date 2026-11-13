/** Desenho do canhão (usa a mesma geometria da física em core/Cannon). */
import { BARREL_LENGTH, BARREL_WIDTH, muzzlePosition, pivotPosition, WHEEL_RADIUS } from '../core/Cannon';
import { toRadians } from '../core/vector';
import { Camera, toScreen } from './Camera';

export interface CannonDrawOptions {
  baseX: number;
  groundY: number;
  angleDeg: number;
  /** deslocamento para trás causado pelo recuo (m) */
  recoilOffset: number;
  /** 0..1 — intensidade do clarão do disparo */
  flash: number;
}

export function drawCannon(ctx: CanvasRenderingContext2D, cam: Camera, o: CannonDrawOptions): void {
  const s = cam.scale;
  const pivot = toScreen(cam, pivotPosition(o.baseX, o.groundY, o.recoilOffset));
  const wheelCenter = toScreen(cam, { x: o.baseX - o.recoilOffset, y: o.groundY + WHEEL_RADIUS });

  // carreta de madeira
  ctx.fillStyle = '#8d5524';
  ctx.strokeStyle = '#5c3a17';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(wheelCenter.x - 1.9 * s, wheelCenter.y + WHEEL_RADIUS * s * 0.9);
  ctx.lineTo(pivot.x + 0.4 * s, pivot.y - 0.2 * s);
  ctx.lineTo(pivot.x + 0.9 * s, wheelCenter.y + WHEEL_RADIUS * s * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // cano
  ctx.save();
  ctx.translate(pivot.x, pivot.y);
  ctx.rotate(-toRadians(o.angleDeg));
  const len = BARREL_LENGTH * s;
  const w = BARREL_WIDTH * s;
  const g = ctx.createLinearGradient(0, -w / 2, 0, w / 2);
  g.addColorStop(0, '#6c757d');
  g.addColorStop(0.45, '#343a40');
  g.addColorStop(1, '#16191c');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-0.6 * s, -w * 0.62);
  ctx.lineTo(len, -w * 0.42);
  ctx.lineTo(len, w * 0.42);
  ctx.lineTo(-0.6 * s, w * 0.62);
  ctx.arc(-0.6 * s, 0, w * 0.62, Math.PI / 2, -Math.PI / 2);
  ctx.closePath();
  ctx.fill();
  // anéis
  ctx.fillStyle = '#212529';
  ctx.fillRect(len - 0.25 * s, -w * 0.5, 0.25 * s, w);
  ctx.fillRect(len * 0.45, -w * 0.52, 0.18 * s, w * 1.04);
  ctx.restore();

  // roda
  const r = WHEEL_RADIUS * s;
  ctx.fillStyle = '#6b4423';
  ctx.strokeStyle = '#3b240f';
  ctx.lineWidth = Math.max(2, s * 0.18);
  ctx.beginPath();
  ctx.arc(wheelCenter.x, wheelCenter.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  const spin = -o.recoilOffset / WHEEL_RADIUS;
  ctx.lineWidth = Math.max(1.2, s * 0.08);
  for (let i = 0; i < 6; i++) {
    const a = spin + (i * Math.PI) / 3;
    ctx.beginPath();
    ctx.moveTo(wheelCenter.x, wheelCenter.y);
    ctx.lineTo(wheelCenter.x + Math.cos(a) * r, wheelCenter.y + Math.sin(a) * r);
    ctx.stroke();
  }
  ctx.fillStyle = '#adb5bd';
  ctx.beginPath();
  ctx.arc(wheelCenter.x, wheelCenter.y, Math.max(2, r * 0.18), 0, Math.PI * 2);
  ctx.fill();

  // clarão do disparo
  if (o.flash > 0) {
    const m = toScreen(cam, muzzlePosition(o.baseX, o.groundY, o.angleDeg, o.recoilOffset));
    const size = (18 + 22 * o.flash) * Math.min(1.4, s / 10);
    const glow = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, size);
    glow.addColorStop(0, `rgba(255, 244, 179, ${o.flash})`);
    glow.addColorStop(0.4, `rgba(255, 146, 43, ${o.flash * 0.9})`);
    glow.addColorStop(1, 'rgba(255, 107, 107, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(m.x, m.y, size, 0, Math.PI * 2);
    ctx.fill();
  }
}
