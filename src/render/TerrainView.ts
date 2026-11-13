/** Terreno, obstáculos, régua e marcações de engenharia. */
import type { Rect, TerrainPoint } from '../core/types';
import { heightAt } from '../core/Terrain';
import { Camera, toScreen } from './Camera';

export function drawTerrain(ctx: CanvasRenderingContext2D, cam: Camera, points: TerrainPoint[]): void {
  const left = { x: cam.minX - 1, y: heightAt(points, cam.minX - 1) };
  const right = { x: cam.maxX + 1, y: heightAt(points, cam.maxX + 1) };
  const inner = points.filter((p) => p.x > left.x && p.x < right.x);
  const path = [left, ...inner, right].map((p) => toScreen(cam, p));

  const g = ctx.createLinearGradient(0, cam.height * 0.5, 0, cam.height);
  g.addColorStop(0, '#69db7c');
  g.addColorStop(0.25, '#40c057');
  g.addColorStop(1, '#8a6a3f');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(path[0].x, cam.height);
  path.forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.lineTo(path[path.length - 1].x, cam.height);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#2b8a3e';
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  path.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
}

export function drawObstacles(ctx: CanvasRenderingContext2D, cam: Camera, obstacles: Rect[], hitIndex: number): void {
  obstacles.forEach((o, i) => {
    const tl = toScreen(cam, { x: o.x, y: o.y + o.height });
    const w = o.width * cam.scale;
    const h = o.height * cam.scale;
    ctx.fillStyle = i === hitIndex ? '#e8590c' : '#868e96';
    ctx.fillRect(tl.x, tl.y, w, h);
    // tijolos
    ctx.strokeStyle = 'rgba(33, 37, 41, 0.35)';
    ctx.lineWidth = 1;
    const brick = Math.max(6, cam.scale * 1);
    for (let y = tl.y, row = 0; y < tl.y + h; y += brick, row++) {
      ctx.beginPath();
      ctx.moveTo(tl.x, y);
      ctx.lineTo(tl.x + w, y);
      ctx.stroke();
      const offset = row % 2 ? brick : 0;
      for (let x = tl.x + offset; x < tl.x + w; x += brick * 2) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, Math.min(y + brick, tl.y + h));
        ctx.stroke();
      }
    }
    ctx.strokeStyle = '#343a40';
    ctx.lineWidth = 2;
    ctx.strokeRect(tl.x, tl.y, w, h);
    if (o.label) {
      ctx.fillStyle = '#212529';
      ctx.font = '600 12px Nunito, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(o.label, tl.x + w / 2, tl.y - 6);
    }
  });
}

/** Régua no rodapé, com origem no canhão. */
export function drawRuler(ctx: CanvasRenderingContext2D, cam: Camera, originX: number): void {
  const y = cam.height - 16;
  ctx.fillStyle = 'rgba(255, 249, 219, 0.92)';
  ctx.fillRect(0, y - 4, cam.width, 20);
  ctx.strokeStyle = '#5c4813';
  ctx.fillStyle = '#5c4813';
  ctx.font = '600 10px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  const step = cam.scale > 12 ? 5 : 10;
  const start = Math.ceil((cam.minX - originX) / step) * step;
  for (let m = start; originX + m <= cam.maxX; m += step) {
    const sx = (originX + m - cam.minX) * cam.scale;
    const major = m % (step * 2) === 0;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx, y - 4);
    ctx.lineTo(sx, y + (major ? 6 : 3));
    ctx.stroke();
    if (major) ctx.fillText(`${m} m`, sx, y + 14);
  }
}

/** Cota (linha de dimensão) entre dois pontos no eixo X. */
export function drawDimension(ctx: CanvasRenderingContext2D, cam: Camera, x1: number, x2: number, label: string): void {
  const a = (x1 - cam.minX) * cam.scale;
  const b = (x2 - cam.minX) * cam.scale;
  const y = cam.height - 34;
  ctx.strokeStyle = 'rgba(33, 37, 41, 0.75)';
  ctx.fillStyle = 'rgba(33, 37, 41, 0.85)';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(a, y);
  ctx.lineTo(b, y);
  ctx.stroke();
  ctx.setLineDash([]);
  [a, b].forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x, y - 5);
    ctx.lineTo(x, y + 5);
    ctx.stroke();
  });
  ctx.font = '700 11px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  const mid = (a + b) / 2;
  const w = ctx.measureText(label).width + 10;
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillRect(mid - w / 2, y - 9, w, 16);
  ctx.fillStyle = '#212529';
  ctx.fillText(label, mid, y + 3);
}

/** Linha vermelha indicando até onde o canhão pode recuar. */
export function drawRecoilLimit(ctx: CanvasRenderingContext2D, cam: Camera, x: number, groundY: number): void {
  const bottom = toScreen(cam, { x, y: groundY });
  ctx.strokeStyle = '#e03131';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(bottom.x, bottom.y);
  ctx.lineTo(bottom.x, bottom.y - 60);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#c92a2a';
  ctx.font = '700 11px Nunito, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('limite de recuo', Math.max(48, bottom.x), bottom.y - 66);
}
