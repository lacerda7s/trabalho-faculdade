/**
 * Níveis do jogo e regras de conclusão.
 *
 * Para criar um novo nível basta acrescentar um objeto `LevelConfig` ao array
 * LEVELS: terreno, alvo, obstáculos, vento, controles liberados, dificuldade
 * e restrições são todos dados — nenhum código novo é necessário.
 */
import type { GameMode, LabToggles, LevelConfig, LevelControls, ShotRecord, SimEnvironment, WorldSettings } from './types';
import { DEFAULT_GRAVITY } from './PhysicsEngine';
import { minHeight, validateTerrain } from './Terrain';
import { nextWind } from './WindSystem';

const ON: LabToggles = { gravity: true, wind: true, airResistance: true, collisions: true, recoil: true };
const toggles = (over: Partial<LabToggles>): LabToggles => ({ ...ON, ...over });

const BASIC_CONTROLS: LevelControls = {
  angle: true,
  force: true,
  mass: false,
  projectile: false,
  cannonMass: false,
  wind: false,
  airDensity: false,
  gravity: false,
  toggles: false,
};
const controls = (over: Partial<LevelControls>): LevelControls => ({ ...BASIC_CONTROLS, ...over });

export const LEVELS: LevelConfig[] = [
  {
    id: 1,
    title: 'Introdução à trajetória',
    subtitle: 'Gravidade e lançamento oblíquo',
    intro:
      'Sem vento e sem ar: só a gravidade puxa o projétil para baixo. A velocidade horizontal fica constante e a vertical diminui 9,81 m/s a cada segundo. Ajuste ângulo e força para acertar o alvo.',
    newtonFocus: [1],
    worldWidth: 60,
    terrain: [{ x: -15, y: 0 }, { x: 80, y: 0 }],
    cannonX: 0,
    target: { x: 40, y: 3, radius: 2.2 },
    obstacles: [],
    wind: { base: 0, variation: 0 },
    world: { gravity: DEFAULT_GRAVITY, airDensityFactor: 0, toggles: toggles({ wind: false, airResistance: false }) },
    defaults: { angleDeg: 45, force: 6000, mass: 4, projectile: 'ferro', cannonMass: 400 },
    controls: controls({}),
    difficulty: { maxShots: 6, previewFraction: 1, previewIncludesWind: true, previewIncludesDrag: true },
    constraints: {},
    requirements: ['Acerte o alvo.'],
    tips: ['Em 45° o alcance é máximo (no vácuo).', 'A linha pontilhada mostra a trajetória prevista.'],
  },
  {
    id: 2,
    title: 'Primeira e segunda leis de Newton',
    subtitle: 'F = m · a: mesma força, massas diferentes',
    intro:
      'A força do canhão está limitada a 6000 N. Pela 2ª lei, a = F/m: um projétil mais leve ganha mais aceleração no cano e sai mais rápido. Acerte o alvo com DUAS massas diferentes.',
    newtonFocus: [1, 2],
    worldWidth: 70,
    terrain: [{ x: -15, y: 0 }, { x: 30, y: 0 }, { x: 45, y: 2 }, { x: 90, y: 2 }],
    cannonX: 0,
    target: { x: 55, y: 5, radius: 2.2 },
    obstacles: [],
    wind: { base: 0, variation: 0 },
    world: { gravity: DEFAULT_GRAVITY, airDensityFactor: 0, toggles: toggles({ wind: false, airResistance: false }) },
    defaults: { angleDeg: 40, force: 6000, mass: 4, projectile: 'ferro', cannonMass: 400 },
    controls: controls({ mass: true, projectile: true }),
    difficulty: { maxShots: 8, previewFraction: 1, previewIncludesWind: true, previewIncludesDrag: true },
    constraints: { maxForce: 6000, distinctMasses: 2 },
    requirements: ['Força máxima: 6000 N.', 'Acerte o alvo com 2 massas diferentes.'],
    tips: ['Com 4 kg e 6000 N o projétil não alcança: reduza a massa.', 'a = F/m → metade da massa, o dobro da aceleração.'],
  },
  {
    id: 3,
    title: 'Ação e reação',
    subtitle: 'O recuo do canhão',
    intro:
      'Quando o canhão empurra o projétil para frente, o projétil empurra o canhão para trás com força de mesmo módulo (3ª lei). O canhão está num platô e não pode recuar mais de 0,5 m. Aumente a massa do canhão para reduzir o recuo.',
    newtonFocus: [3],
    worldWidth: 65,
    terrain: [{ x: -15, y: 5 }, { x: 3, y: 5 }, { x: 8, y: 0 }, { x: 85, y: 0 }],
    cannonX: 0,
    target: { x: 50, y: 2.5, radius: 2.2 },
    obstacles: [],
    wind: { base: 0, variation: 0 },
    world: { gravity: DEFAULT_GRAVITY, airDensityFactor: 0, toggles: toggles({ wind: false, airResistance: false }) },
    defaults: { angleDeg: 35, force: 7000, mass: 4, projectile: 'ferro', cannonMass: 40 },
    controls: controls({ cannonMass: true }),
    difficulty: { maxShots: 6, previewFraction: 1, previewIncludesWind: true, previewIncludesDrag: true },
    constraints: { maxRecoil: 0.5 },
    requirements: ['Acerte o alvo.', 'Recuo do canhão de no máximo 0,5 m.'],
    tips: ['Momento do projétil = momento do canhão: m·v = M·V.', 'Canhão mais pesado → menor velocidade de recuo.'],
  },
  {
    id: 4,
    title: 'Influência do vento',
    subtitle: 'Compense a força do vento',
    intro:
      'Agora o vento empurra o projétil horizontalmente. A previsão NÃO inclui o vento: observe as bandeiras e compense. O vento muda a cada disparo.',
    newtonFocus: [1, 2],
    worldWidth: 80,
    terrain: [{ x: -15, y: 0 }, { x: 40, y: 0 }, { x: 55, y: 3 }, { x: 72, y: 3 }, { x: 90, y: 0 }, { x: 100, y: 0 }],
    cannonX: 0,
    target: { x: 62, y: 6, radius: 2.2 },
    obstacles: [],
    wind: { base: -6, variation: 3 },
    world: { gravity: DEFAULT_GRAVITY, airDensityFactor: 0, toggles: toggles({ airResistance: false }) },
    defaults: { angleDeg: 45, force: 8000, mass: 4, projectile: 'ferro', cannonMass: 400 },
    controls: controls({}),
    difficulty: { maxShots: 6, previewFraction: 0.6, previewIncludesWind: false, previewIncludesDrag: true },
    constraints: {},
    requirements: ['Acerte o alvo apesar do vento.'],
    tips: ['Vento contra (←) encurta o alcance: use mais força.', 'O vento é uma força extra: a = F_vento / m.'],
  },
  {
    id: 5,
    title: 'Resistência do ar',
    subtitle: 'O projétil perde velocidade aos poucos',
    intro:
      'O ar exerce uma força contrária ao movimento (arrasto) que cresce com o quadrado da velocidade. Sem ela, vx seria constante (1ª lei); com ela, vx diminui. Experimente o projétil aerodinâmico.',
    newtonFocus: [1, 2],
    worldWidth: 90,
    terrain: [{ x: -15, y: 0 }, { x: 35, y: 0 }, { x: 50, y: -3 }, { x: 62, y: -3 }, { x: 70, y: 0 }, { x: 110, y: 0 }],
    cannonX: 0,
    target: { x: 75, y: 3, radius: 2.4 },
    obstacles: [],
    wind: { base: 0, variation: 0 },
    world: { gravity: DEFAULT_GRAVITY, airDensityFactor: 3, toggles: toggles({ wind: false }) },
    defaults: { angleDeg: 40, force: 9000, mass: 4, projectile: 'ferro', cannonMass: 400 },
    controls: controls({ projectile: true, mass: true }),
    difficulty: { maxShots: 6, previewFraction: 0.5, previewIncludesWind: true, previewIncludesDrag: true },
    constraints: {},
    requirements: ['Acerte o alvo com resistência do ar 3× maior.'],
    tips: ['Com arrasto, o melhor ângulo fica abaixo de 45°.', 'Arrasto menor (Cd) = menos perda de velocidade.'],
  },
  {
    id: 6,
    title: 'Obstáculos e colisões',
    subtitle: 'Planeje uma trajetória que evite barreiras',
    intro:
      'Uma muralha e um bloco flutuante estão no caminho. Atingir um obstáculo encerra o disparo e tira pontos. Use ângulos altos para passar por cima.',
    newtonFocus: [1, 2],
    worldWidth: 80,
    terrain: [{ x: -15, y: 0 }, { x: 100, y: 0 }],
    cannonX: 0,
    target: { x: 66, y: 3, radius: 2.2 },
    obstacles: [
      { x: 28, y: 0, width: 2, height: 14, label: 'Muralha' },
      { x: 48, y: 18, width: 4, height: 4, label: 'Bloco' },
    ],
    wind: { base: 2, variation: 1 },
    world: { gravity: DEFAULT_GRAVITY, airDensityFactor: 0, toggles: toggles({ airResistance: false }) },
    defaults: { angleDeg: 55, force: 9000, mass: 4, projectile: 'ferro', cannonMass: 400 },
    controls: controls({}),
    difficulty: { maxShots: 7, previewFraction: 0.45, previewIncludesWind: true, previewIncludesDrag: true },
    constraints: {},
    requirements: ['Acerte o alvo sem tocar nos obstáculos.'],
    tips: ['Mais ângulo = mais altura, porém menos alcance.', 'Cada obstáculo atingido custa 200 pontos.'],
  },
  {
    id: 7,
    title: 'Desafio de engenharia',
    subtitle: 'Requisitos, restrições e eficiência',
    intro:
      'Como num projeto real, há requisitos e restrições. Acerte o alvo no platô em no máximo 3 disparos, com força ≤ 9000 N e recuo ≤ 0,5 m, enfrentando vento, ar e uma torre. Quanto menos força, maior a eficiência.',
    newtonFocus: [1, 2, 3],
    worldWidth: 115,
    terrain: [
      { x: -15, y: 0 },
      { x: 20, y: 0 },
      { x: 35, y: 4 },
      { x: 60, y: 4 },
      { x: 70, y: 0 },
      { x: 88, y: 0 },
      { x: 95, y: 8 },
      { x: 130, y: 8 },
    ],
    cannonX: 0,
    target: { x: 102, y: 11, radius: 2 },
    obstacles: [{ x: 45, y: 4, width: 2, height: 16, label: 'Torre' }],
    wind: { base: 3, variation: 2.5 },
    world: { gravity: DEFAULT_GRAVITY, airDensityFactor: 1.5, toggles: toggles({}) },
    defaults: { angleDeg: 45, force: 9000, mass: 4, projectile: 'ferro', cannonMass: 80 },
    controls: controls({ mass: true, projectile: true, cannonMass: true }),
    difficulty: { maxShots: 3, previewFraction: 0.3, previewIncludesWind: false, previewIncludesDrag: false },
    constraints: { maxForce: 9000, maxRecoil: 0.5 },
    requirements: ['Acerte o alvo no platô.', 'No máximo 3 disparos.', 'Força ≤ 9000 N.', 'Recuo ≤ 0,5 m.'],
    tips: ['Use o que aprendeu: massa, ângulo, vento, arrasto e recuo.', 'Eficiência: menos força gera bônus.'],
  },
];

/** Cenário livre do Modo Laboratório. */
export const LAB_LEVEL: LevelConfig = {
  id: 0,
  title: 'Laboratório',
  subtitle: 'Experimentos livres',
  intro:
    'Ligue e desligue forças, mude a gravidade, a massa do projétil e do canhão, compare trajetórias e acompanhe os gráficos. Pause e avance quadro a quadro para estudar cada instante.',
  newtonFocus: [1, 2, 3],
  worldWidth: 100,
  terrain: [{ x: -15, y: 0 }, { x: 130, y: 0 }],
  cannonX: 0,
  target: { x: 60, y: 3, radius: 2.5 },
  obstacles: [],
  wind: { base: 0, variation: 0 },
  world: { gravity: DEFAULT_GRAVITY, airDensityFactor: 1, toggles: toggles({ wind: false, airResistance: false }) },
  defaults: { angleDeg: 45, force: 8000, mass: 4, projectile: 'ferro', cannonMass: 300 },
  controls: {
    angle: true,
    force: true,
    mass: true,
    projectile: true,
    cannonMass: true,
    wind: true,
    airDensity: true,
    gravity: true,
    toggles: true,
  },
  difficulty: { maxShots: 0, previewFraction: 1, previewIncludesWind: true, previewIncludesDrag: true },
  constraints: {},
  requirements: ['Experimente à vontade!'],
  tips: ['Desligue a gravidade para ver a 1ª lei em ação.', 'Compare trajetórias mudando um único parâmetro por vez.'],
};

export function getLevel(id: number): LevelConfig {
  if (id === LAB_LEVEL.id) return LAB_LEVEL;
  const level = LEVELS.find((l) => l.id === id);
  if (!level) throw new Error(`Nível ${id} não existe.`);
  return level;
}

export function nextLevelId(id: number): number | null {
  const index = LEVELS.findIndex((l) => l.id === id);
  return index >= 0 && index < LEVELS.length - 1 ? LEVELS[index + 1].id : null;
}

/** Condições iniciais do mundo para um nível. */
export function worldFromLevel(level: LevelConfig, rng: () => number = Math.random): WorldSettings {
  return {
    gravity: level.world.gravity,
    airDensityFactor: level.world.airDensityFactor,
    toggles: { ...level.world.toggles },
    windSpeed: level.wind.variation > 0 ? nextWind(level.wind.base, level.wind.variation, rng) : level.wind.base,
  };
}

export function buildEnvironment(level: LevelConfig, world: WorldSettings): SimEnvironment {
  return {
    world,
    terrain: level.terrain,
    target: level.target,
    obstacles: level.obstacles,
    bounds: { minX: -20, maxX: level.worldWidth + 20, minY: minHeight(level.terrain) - 20 },
  };
}

/** Um acerto só conta se respeitar as restrições do nível. */
export function isValidHit(shot: ShotRecord): boolean {
  return shot.outcome === 'hit' && !shot.recoilViolation;
}

export interface LevelEvaluation {
  complete: boolean;
  failed: boolean;
  validHits: number;
  distinctMasses: number;
  requiredMasses: number;
  /** null = ilimitado */
  shotsLeft: number | null;
}

export function evaluateLevel(level: LevelConfig, shots: ShotRecord[], mode: GameMode): LevelEvaluation {
  const hits = shots.filter(isValidHit);
  const masses = new Set(hits.map((s) => s.params.mass.toFixed(1)));
  const requiredMasses = level.constraints.distinctMasses ?? 1;
  const complete = hits.length > 0 && masses.size >= requiredMasses;
  const maxShots = mode === 'desafio' ? level.difficulty.maxShots : 0;
  const shotsLeft = maxShots > 0 ? Math.max(0, maxShots - shots.length) : null;
  return {
    complete,
    failed: !complete && shotsLeft === 0,
    validHits: hits.length,
    distinctMasses: masses.size,
    requiredMasses,
    shotsLeft,
  };
}

/** Verifica se a configuração de um nível é coerente (útil ao criar níveis novos). */
export function validateLevel(level: LevelConfig): string[] {
  const errors = validateTerrain(level.terrain).map((e) => `Nível ${level.id}: ${e}`);
  if (level.target.radius <= 0) errors.push(`Nível ${level.id}: raio do alvo deve ser positivo.`);
  if (level.target.x <= level.cannonX) errors.push(`Nível ${level.id}: o alvo deve estar à direita do canhão.`);
  if (level.target.x > level.worldWidth) errors.push(`Nível ${level.id}: o alvo está fora da área visível.`);
  if (level.difficulty.previewFraction < 0 || level.difficulty.previewFraction > 1) {
    errors.push(`Nível ${level.id}: previewFraction deve estar entre 0 e 1.`);
  }
  return errors;
}
