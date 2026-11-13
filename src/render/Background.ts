/** Céu, sol, montanhas, nuvens e bandeiras de vento. */
import type { Vec2 } from '../core/types';
import { Camera, toScreen } from './Camera';

export function drawSky(ctx: CanvasRenderingContext2D, cam: Camera): void {
  const g = ctx.createLinearGradient(0, 0, 0, cam.height);
  g.addColorStop(0, '#2f80ed');
  g.addColorStop(0.55, '#74c0fc');
  g.addColorStop(1, '#d0ebff');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, cam.width, cam.height);

  // sol
  const sx = cam.width - 90;
  const sy = 78;
  const glow = ctx.createRadialGradient(sx, sy, 10, sx, sy, 90);
  glow.addColorStop(0, 'rgba(255, 236, 153, 0.9)');
  glow.addColorStop(1, 'rgba(255, 236, 153, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sx - 90, sy - 90, 180, 180);
  ctx.fillStyle = '#ffe066';
  ctx.beginPath();
  ctx.arc(sx, sy, 30, 0, Math.PI * 2);
  ctx.fill();
}

function mountainLayer(ctx: CanvasRenderingContext2D, cam: Camera, baseY: number, amp: number, freq: number, phase: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, cam.height);
  for (let x = 0; x <= cam.width; x += 10) {
    const y = baseY - amp * (0.55 + 0.45 * Math.sin(x * freq + phase)) - amp * 0.35 * Math.sin(x * freq * 2.7 + phase * 1.3);
    ctx.lineTo(x, y);
  }
  ctx.lineTo(cam.width, cam.height);
  ctx.closePath();
  ctx.fill();
}

export function drawMountains(ctx: CanvasRenderingContext2D, cam: Camera): void {
  const ground = toScreen(cam, { x: 0, y: cam.minY + 3 }).y;
  mountainLayer(ctx, cam, ground - 40, 150, 0.006, 1.2, 'rgba(116, 143, 252, 0.45)');
  mountainLayer(ctx, cam, ground - 10, 95, 0.011, 4.1, 'rgba(92, 124, 250, 0.45)');
}

const CLOUDS = [
  { x: 80, y: 70, s: 1.1 },
  { x: 330, y: 120, s: 0.8 },
  { x: 560, y: 60, s: 1.3 },
  { x: 800, y: 150, s: 0.9 },
  { x: 1050, y: 95, s: 1 },
];

export function drawClouds(ctx: CanvasRenderingContext2D, cam: Camera, time: number, windSpeed: number): void {
  const speed = 6 + windSpeed * 5;
  const span = cam.width + 300;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
  for (const c of CLOUDS) {
    const x = ((((c.x + time * speed) % span) + span) % span) - 150;
    const r = 22 * c.s;
    ctx.beginPath();
    ctx.arc(x, c.y, r, 0, Math.PI * 2);
    ctx.arc(x + r * 1.1, c.y - r * 0.5, r * 1.15, 0, Math.PI * 2);
    ctx.arc(x + r * 2.3, c.y, r * 0.95, 0, Math.PI * 2);
    ctx.arc(x + r * 1.2, c.y + r * 0.3, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Bandeira que tremula na direção do vento; o comprimento indica a intensidade. */
export function drawWindFlag(ctx: CanvasRenderingContext2D, cam: Camera, base: Vec2, windSpeed: number, time: number): void {
  const b = toScreen(cam, base);
  const poleHeight = Math.max(34, 4 * cam.scale);
  const top = { x: b.x, y: b.y - poleHeight };
  ctx.strokeStyle = '#495057';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(b.x, b.y);
  ctx.lineTo(top.x, top.y);
  ctx.stroke();

  const strength = Math.min(1, Math.abs(windSpeed) / 15);
  const dir = windSpeed >= 0 ? 1 : -1;
  const len = 14 + 34 * strength;
  const droop = (1 - strength) * 16;
  const wave = Math.sin(time * (3 + strength * 8)) * (2 + strength * 4);
  ctx.fillStyle = Math.abs(windSpeed) < 0.5 ? '#adb5bd' : '#fa5252';
  ctx.beginPath();
  ctx.moveTo(top.x, top.y);
  ctx.quadraticCurveTo(top.x + dir * len * 0.5, top.y + wave + droop * 0.4, top.x + dir * len, top.y + 7 + droop);
  ctx.lineTo(top.x, top.y + 14);
  ctx.closePath();
  ctx.fill();
}
