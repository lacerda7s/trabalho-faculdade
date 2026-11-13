/**
 * Detecção de colisões entre o projétil (círculo) e o cenário.
 * Ordem de verificação: alvo → obstáculos → solo.
 */
import type { Bounds, CollisionResult, Rect, SimEnvironment, TargetSpec, TerrainPoint, Vec2 } from './types';
import { heightAt } from './Terrain';
import { clamp, distance } from './vector';

/** Círculo × retângulo: compara a distância ao ponto mais próximo do retângulo. */
export function circleIntersectsRect(center: Vec2, radius: number, rect: Rect): boolean {
  const cx = clamp(center.x, rect.x, rect.x + rect.width);
  const cy = clamp(center.y, rect.y, rect.y + rect.height);
  const dx = center.x - cx;
  const dy = center.y - cy;
  return dx * dx + dy * dy <= radius * radius;
}

export function checkTargetHit(position: Vec2, radius: number, target: TargetSpec): { hit: boolean; distance: number } {
  const d = distance(position, target);
  return { hit: d <= target.radius + radius, distance: d };
}

export function isTouchingGround(position: Vec2, radius: number, terrain: TerrainPoint[]): boolean {
  return position.y - radius <= heightAt(terrain, position.x);
}

/** Índice do primeiro obstáculo atingido, ou -1. */
export function findObstacleHit(position: Vec2, radius: number, obstacles: Rect[]): number {
  return obstacles.findIndex((o) => circleIntersectsRect(position, radius, o));
}

export function isOutOfBounds(position: Vec2, bounds: Bounds): boolean {
  return position.x < bounds.minX || position.x > bounds.maxX || position.y < bounds.minY;
}

/**
 * Verifica colisões na posição atual.
 * O alvo funciona como "sensor" e é verificado mesmo com colisões desligadas.
 */
export function detectCollision(position: Vec2, radius: number, env: SimEnvironment): CollisionResult {
  const target = checkTargetHit(position, radius, env.target);
  if (target.hit) return { type: 'target', distance: target.distance };
  if (!env.world.toggles.collisions) return { type: 'none' };
  const index = findObstacleHit(position, radius, env.obstacles);
  if (index >= 0) return { type: 'obstacle', index };
  if (isTouchingGround(position, radius, env.terrain)) {
    return { type: 'ground', groundY: heightAt(env.terrain, position.x) };
  }
  return { type: 'none' };
}
