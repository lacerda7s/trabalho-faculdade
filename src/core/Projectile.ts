/**
 * Catálogo de projéteis e criação do corpo físico.
 */
import type { Body, ProjectileKind, ProjectileSpec, Vec2 } from './types';

export const PROJECTILES: Record<ProjectileKind, ProjectileSpec> = {
  ferro: {
    kind: 'ferro',
    name: 'Bala de ferro',
    description: 'Pesada e compacta: o vento e o ar a afetam pouco.',
    defaultMass: 4,
    radius: 0.08,
    dragCoefficient: 0.47,
    restitution: 0.1,
    color: '#3b4252',
  },
  pedra: {
    kind: 'pedra',
    name: 'Pedra',
    description: 'Formato irregular: mais arrasto que a bala de ferro.',
    defaultMass: 2.5,
    radius: 0.09,
    dragCoefficient: 0.7,
    restitution: 0.2,
    color: '#8d7b68',
  },
  borracha: {
    kind: 'borracha',
    name: 'Bola de borracha',
    description: 'Leve e grande: quica no chão e sofre muito com o vento.',
    defaultMass: 1.2,
    radius: 0.1,
    dragCoefficient: 0.5,
    restitution: 0.6,
    color: '#e8590c',
  },
  aerodinamico: {
    kind: 'aerodinamico',
    name: 'Projétil aerodinâmico',
    description: 'Formato de gota: arrasto muito baixo.',
    defaultMass: 1.5,
    radius: 0.06,
    dragCoefficient: 0.12,
    restitution: 0.05,
    color: '#1c7ed6',
  },
};

export const PROJECTILE_KINDS = Object.keys(PROJECTILES) as ProjectileKind[];

export function isProjectileKind(value: string): value is ProjectileKind {
  return Object.prototype.hasOwnProperty.call(PROJECTILES, value);
}

/** Cria o corpo físico de um projétil em uma posição e velocidade. */
export function createProjectileBody(spec: ProjectileSpec, mass: number, position: Vec2, velocity: Vec2): Body {
  return {
    position: { ...position },
    velocity: { ...velocity },
    mass,
    radius: spec.radius,
    dragCoefficient: spec.dragCoefficient,
    restitution: spec.restitution,
  };
}
