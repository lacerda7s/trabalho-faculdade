/** Desenho do alvo. */
import type { TargetSpec, TerrainPoint } from '../core/types';
import { heightAt } from '../core/Terrain';
import { Camera, toScreen } from './Camera';

const RING_COLORS = ['#e03131', '#ffffff', '#e03131', '#ffffff', '#fcc419'];

export function drawTarget(ctx: CanvasRenderingContext2D, cam: Camera, target: TargetSpec, terrain: TerrainPoint[], hitFlash: number): void {
  const c = toScreen(cam, target);
  const r = target.radius * cam.scale;
  const ground = toScreen(cam, { x: target.x, y: heightAt(terrain, target.x) });

  // poste
  if (ground.y > c.y + r) {
    ctx.fillStyle = '#5c3a17';
    ctx.fillRect(c.x - 3, c.y + r * 0.6, 6, ground.y - c.y - r * 0.6);
  }

  if (hitFlash > 0) {
    ctx.strokeStyle = `rgba(255, 212, 59, ${hitFlash})`;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(c.x, c.y, r * (1.2 + (1 - hitFlash) * 1.5), 0, Math.PI * 2);
    ctx.stroke();
  }

  RING_COLORS.forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(c.x, c.y, r * (1 - i / RING_COLORS.length), 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.strokeStyle = '#862e2e';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
  ctx.stroke();
}
