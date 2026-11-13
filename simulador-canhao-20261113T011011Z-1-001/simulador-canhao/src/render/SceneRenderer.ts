/**
 * Renderização da cena completa. Recebe um "retrato" do estado (SceneView)
 * e só desenha: nenhuma regra de jogo mora aqui.
 */
import type { ForceBreakdown, LevelConfig, ProjectileSpec, Vec2 } from '../core/types';
import type { Flight } from '../core/Simulation';
import { muzzlePosition, pivotPosition } from '../core/Cannon';
import { heightAt } from '../core/Terrain';
import { fromAngle, length, scale } from '../core/vector';
import { Camera, toScreen } from './Camera';
import { drawClouds, drawMountains, drawSky, drawWindFlag } from './Background';
import { drawDimension, drawObstacles, drawRecoilLimit, drawRuler, drawTerrain } from './TerrainView';
import { drawCannon } from './CannonView';
import { drawTarget } from './TargetView';
import { drawOffscreenMarker, drawPath, drawPrediction, drawProjectile } from './ProjectileView';
import { arrowLength, drawArrow, VECTOR_COLORS } from './Vectors';
import { drawParticles, Particle } from './Effects';

export interface ComparisonTrace {
  id: number;
  points: Vec2[];
  color: string;
  label: string;
}

export interface SceneView {
  cam: Camera;
  level: LevelConfig;
  time: number;
  windSpeed: number;
  windVisible: boolean;
  angleDeg: number;
  recoilOffset: number;
  muzzleFlash: number;
  aiming: boolean;
  prediction: Vec2[] | null;
  predictionComplete: boolean;
  launchSpeed: number;
  /** forças no instante do lançamento (para os vetores antes do disparo) */
  launchForces: ForceBreakdown | null;
  projectileMass: number;
  flight: Flight | null;
  projectileSpec: ProjectileSpec;
  comparisons: ComparisonTrace[];
  particles: Particle[];
  showVectors: boolean;
  /** 0..1 — opacidade das setas de ação e reação */
  thirdLaw: number;
  hitFlash: number;
}

const PX_PER_MS = 2.4; // px por m/s (velocidade)
const PX_PER_MS2 = 4.5; // px por m/s² (aceleração causada por cada força)

function drawForceArrows(ctx: CanvasRenderingContext2D, origin: Vec2, forces: ForceBreakdown, mass: number, alpha = 1) {
  const items: Array<[Vec2, string, string]> = [
    [forces.gravity, VECTOR_COLORS.gravity, 'g'],
    [forces.wind, VECTOR_COLORS.wind, 'vento'],
    [forces.drag, VECTOR_COLORS.drag, 'ar'],
  ];
  for (const [f, color, label] of items) {
    const a = length(f) / mass;
    drawArrow(ctx, origin, f, arrowLength(a, PX_PER_MS2), color, label, alpha);
  }
}

export function drawScene(ctx: CanvasRenderingContext2D, v: SceneView): void {
  const { cam, level } = v;
  const groundY = heightAt(level.terrain, level.cannonX);

  drawSky(ctx, cam);
  drawMountains(ctx, cam);
  drawClouds(ctx, cam, v.time, v.windVisible ? v.windSpeed : 0);
  drawTerrain(ctx, cam, level.terrain);

  if (v.windVisible) {
    [level.worldWidth * 0.3, level.worldWidth * 0.75].forEach((x) => {
      drawWindFlag(ctx, cam, { x, y: heightAt(level.terrain, x) }, v.windSpeed, v.time);
    });
  }

  drawRuler(ctx, cam, level.cannonX);
  if (v.aiming) {
    const muzzle = muzzlePosition(level.cannonX, groundY, v.angleDeg);
    drawDimension(ctx, cam, muzzle.x, level.target.x, `${(level.target.x - muzzle.x).toFixed(1)} m`);
  }
  if (level.constraints.maxRecoil !== undefined) {
    drawRecoilLimit(ctx, cam, level.cannonX - level.constraints.maxRecoil, groundY);
  }

  drawObstacles(ctx, cam, level.obstacles, v.flight?.outcome === 'obstacle' ? v.flight.obstacleIndex : -1);
  drawTarget(ctx, cam, level.target, level.terrain, v.hitFlash);

  v.comparisons.forEach((c) => drawPath(ctx, cam, c.points, c.color, { width: 2.5, alpha: 0.75, dash: [8, 5] }));

  if (v.aiming && v.prediction) drawPrediction(ctx, cam, v.prediction, v.predictionComplete);

  if (v.flight) drawPath(ctx, cam, v.flight.trail, 'rgba(255, 255, 255, 0.85)', { width: 2.5 });

  drawCannon(ctx, cam, {
    baseX: level.cannonX,
    groundY,
    angleDeg: v.angleDeg,
    recoilOffset: v.recoilOffset,
    flash: v.muzzleFlash,
  });

  // vetores antes do disparo
  if (v.aiming && v.showVectors) {
    const m = toScreen(cam, muzzlePosition(level.cannonX, groundY, v.angleDeg));
    if (v.launchForces) drawForceArrows(ctx, m, v.launchForces, v.projectileMass, 0.9);
    drawArrow(ctx, m, fromAngle(v.angleDeg, 1), arrowLength(v.launchSpeed, PX_PER_MS), VECTOR_COLORS.velocity, 'v₀');
  }

  // projétil em voo
  if (v.flight) {
    const body = v.flight.body;
    const p = toScreen(cam, body.position);
    if (v.showVectors && !v.flight.outcome) {
      drawForceArrows(ctx, p, v.flight.forces, body.mass);
      drawArrow(ctx, p, body.velocity, arrowLength(length(body.velocity), PX_PER_MS), VECTOR_COLORS.velocity, 'v');
    }
    drawProjectile(ctx, cam, body, v.projectileSpec);
    drawOffscreenMarker(ctx, cam, body);
  }

  // 3ª lei: ação no projétil, reação no canhão
  if (v.thirdLaw > 0) {
    const pivot = toScreen(cam, pivotPosition(level.cannonX, groundY, v.recoilOffset));
    const muzzle = toScreen(cam, muzzlePosition(level.cannonX, groundY, v.angleDeg, v.recoilOffset));
    const dir = fromAngle(v.angleDeg, 1);
    drawArrow(ctx, muzzle, dir, 70, VECTOR_COLORS.action, 'ação', v.thirdLaw);
    drawArrow(ctx, { x: pivot.x, y: pivot.y }, scale(dir, -1), 70, VECTOR_COLORS.reaction, 'reação', v.thirdLaw);
  }

  drawParticles(ctx, cam, v.particles);
}
