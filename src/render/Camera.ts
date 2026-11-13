/**
 * Câmera: converte coordenadas do mundo (metros, Y para cima)
 * em coordenadas da tela (pixels, Y para baixo).
 */
import type { LevelConfig, Vec2 } from '../core/types';
import { minHeight } from '../core/Terrain';

export const CANVAS_WIDTH = 1000;
export const CANVAS_HEIGHT = 560;

export interface Camera {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  /** pixels por metro */
  scale: number;
  width: number;
  height: number;
}

export function createCamera(level: LevelConfig): Camera {
  const minX = -8;
  const maxX = level.worldWidth + 2;
  const scale = CANVAS_WIDTH / (maxX - minX);
  const minY = minHeight(level.terrain) - 3;
  return { minX, maxX, minY, maxY: minY + CANVAS_HEIGHT / scale, scale, width: CANVAS_WIDTH, height: CANVAS_HEIGHT };
}

export function toScreen(cam: Camera, p: Vec2): Vec2 {
  return { x: (p.x - cam.minX) * cam.scale, y: cam.height - (p.y - cam.minY) * cam.scale };
}

export function toWorld(cam: Camera, p: Vec2): Vec2 {
  return { x: p.x / cam.scale + cam.minX, y: (cam.height - p.y) / cam.scale + cam.minY };
}
