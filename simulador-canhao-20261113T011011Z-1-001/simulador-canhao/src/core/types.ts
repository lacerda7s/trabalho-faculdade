/**
 * Tipos compartilhados do simulador.
 * Esta camada é "regra de negócio": não conhece React, Canvas nem DOM.
 * Unidades: metros (m), segundos (s), quilogramas (kg), newtons (N).
 */

/** Vetor 2D. Eixo X para a direita, eixo Y para cima. */
export interface Vec2 {
  x: number;
  y: number;
}

export type GameMode = 'desafio' | 'aprendizado' | 'laboratorio';

export type ProjectileKind = 'ferro' | 'pedra' | 'borracha' | 'aerodinamico';

export interface ProjectileSpec {
  kind: ProjectileKind;
  name: string;
  description: string;
  defaultMass: number;
  /** raio em metros */
  radius: number;
  /** coeficiente de arrasto (adimensional) */
  dragCoefficient: number;
  /** coeficiente de restituição no quique (0 = não quica, 1 = quique perfeito) */
  restitution: number;
  color: string;
}

/** Interruptores do "Modo laboratório". */
export interface LabToggles {
  gravity: boolean;
  wind: boolean;
  airResistance: boolean;
  collisions: boolean;
  recoil: boolean;
}

/** Condições do ambiente onde o disparo acontece. */
export interface WorldSettings {
  /** aceleração da gravidade em m/s² */
  gravity: number;
  /** velocidade do vento em m/s (positivo = para a direita) */
  windSpeed: number;
  /** multiplicador da densidade do ar (0 = vácuo) */
  airDensityFactor: number;
  toggles: LabToggles;
}

/** Parâmetros que o jogador escolhe antes do disparo. */
export interface LaunchParams {
  angleDeg: number;
  /** força média aplicada pela pólvora dentro do cano (N) */
  force: number;
  /** massa do projétil (kg) */
  mass: number;
  projectile: ProjectileKind;
  /** massa do canhão (kg) */
  cannonMass: number;
}

/** Retângulo com (x, y) no canto inferior esquerdo. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
}

export interface TargetSpec {
  x: number;
  y: number;
  radius: number;
}

export interface TerrainPoint {
  x: number;
  y: number;
}

/** Corpo físico simulado (o projétil). */
export interface Body {
  position: Vec2;
  velocity: Vec2;
  mass: number;
  radius: number;
  dragCoefficient: number;
  restitution: number;
}

/** Forças que atuam no corpo em um instante. */
export interface ForceBreakdown {
  gravity: Vec2;
  wind: Vec2;
  drag: Vec2;
  total: Vec2;
}

/** Amostra para os gráficos de posição, velocidade e aceleração. */
export interface SimSample {
  t: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ax: number;
  ay: number;
}

export type ShotOutcome = 'hit' | 'ground' | 'obstacle' | 'outOfBounds' | 'timeout';

export interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
}

/** Tudo o que a física precisa saber sobre o cenário. */
export interface SimEnvironment {
  world: WorldSettings;
  terrain: TerrainPoint[];
  target: TargetSpec;
  obstacles: Rect[];
  bounds: Bounds;
}

export type CollisionResult =
  | { type: 'none' }
  | { type: 'target'; distance: number }
  | { type: 'obstacle'; index: number }
  | { type: 'ground'; groundY: number };

export interface RecoilInfo {
  /** momento horizontal transferido (kg·m/s) */
  momentum: number;
  /** velocidade inicial de recuo do canhão (m/s) */
  velocity: number;
  /** distância percorrida até parar por atrito (m) */
  distance: number;
}

export interface LevelControls {
  angle: boolean;
  force: boolean;
  mass: boolean;
  projectile: boolean;
  cannonMass: boolean;
  wind: boolean;
  airDensity: boolean;
  gravity: boolean;
  toggles: boolean;
}

export interface LevelDifficulty {
  /** 0 = ilimitado */
  maxShots: number;
  /** fração da trajetória prevista que é exibida (0..1) */
  previewFraction: number;
  previewIncludesWind: boolean;
  previewIncludesDrag: boolean;
}

export interface LevelConstraints {
  maxForce?: number;
  maxRecoil?: number;
  distinctMasses?: number;
}

export interface LevelConfig {
  id: number;
  title: string;
  subtitle: string;
  intro: string;
  newtonFocus: number[];
  worldWidth: number;
  terrain: TerrainPoint[];
  cannonX: number;
  target: TargetSpec;
  obstacles: Rect[];
  wind: { base: number; variation: number };
  world: { gravity: number; airDensityFactor: number; toggles: LabToggles };
  defaults: LaunchParams;
  controls: LevelControls;
  difficulty: LevelDifficulty;
  constraints: LevelConstraints;
  requirements: string[];
  tips: string[];
}

/** Registro de um disparo já concluído. */
export interface ShotRecord {
  shotNumber: number;
  params: LaunchParams;
  windSpeed: number;
  outcome: ShotOutcome;
  launchSpeed: number;
  flightTime: number;
  maxHeight: number;
  impactX: number | null;
  targetDistance: number | null;
  closestApproach: number;
  recoil: RecoilInfo;
  recoilViolation: boolean;
  points: number;
}

export interface FeedbackItem {
  law: 1 | 2 | 3 | null;
  tone: 'info' | 'success' | 'warning';
  title: string;
  text: string;
}
