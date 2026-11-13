/** Partículas: fumaça do disparo, poeira, faíscas e confete ao acertar o alvo. */
import type { Vec2 } from '../core/types';
import { Camera, toScreen } from './Camera';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  gravity: number;
  kind: 'dot' | 'confetti' | 'smoke';
  spin: number;
}

export interface BurstOptions {
  count: number;
  speed: number;
  colors: string[];
  life: number;
  size: number;
  kind?: Particle['kind'];
  gravity?: number;
  /** direção central (graus) e abertura (graus) */
  direction?: number;
  spread?: number;
}

export function spawnBurst(list: Particle[], origin: Vec2, o: BurstOptions): void {
  for (let i = 0; i < o.count; i++) {
    const dir = ((o.direction ?? 90) + (Math.random() - 0.5) * (o.spread ?? 360)) * (Math.PI / 180);
    const speed = o.speed * (0.4 + Math.random() * 0.8);
    const life = o.life * (0.6 + Math.random() * 0.6);
    list.push({
      x: origin.x,
      y: origin.y,
      vx: Math.cos(dir) * speed,
      vy: Math.sin(dir) * speed,
      life,
      maxLife: life,
      color: o.colors[i % o.colors.length],
      size: o.size * (0.6 + Math.random() * 0.8),
      gravity: o.gravity ?? 9.81,
      kind: o.kind ?? 'dot',
      spin: Math.random() * Math.PI * 2,
    });
  }
}

export function updateParticles(list: Particle[], dt: number): Particle[] {
  for (const p of list) {
    p.vy -= p.gravity * dt;
    if (p.kind === 'smoke') {
      p.vx *= 0.97;
      p.vy *= 0.97;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    p.spin += dt * 8;
  }
  return list.filter((p) => p.life > 0);
}

export function drawParticles(ctx: CanvasRenderingContext2D, cam: Camera, list: Particle[]): void {
  for (const p of list) {
    const s = toScreen(cam, p);
    const t = p.life / p.maxLife;
    ctx.globalAlpha = Math.max(0, Math.min(1, t * 1.4));
    ctx.fillStyle = p.color;
    if (p.kind === 'confetti') {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(p.spin);
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    } else {
      const size = p.kind === 'smoke' ? p.size * (1.8 - t) : p.size;
      ctx.beginPath();
      ctx.arc(s.x, s.y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}
