/** Fábricas de dados para os testes. */
import type { Body, LabToggles, SimEnvironment, WorldSettings } from '../src/core/types';

export const ALL_OFF: LabToggles = { gravity: false, wind: false, airResistance: false, collisions: false, recoil: false };

export function makeWorld(over: Partial<WorldSettings> = {}, toggles: Partial<LabToggles> = {}): WorldSettings {
  return {
    gravity: 9.81,
    windSpeed: 0,
    airDensityFactor: 1,
    ...over,
    toggles: { gravity: true, wind: false, airResistance: false, collisions: true, recoil: true, ...toggles },
  };
}

export function makeBody(over: Partial<Body> = {}): Body {
  return {
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    mass: 2,
    radius: 0.05,
    dragCoefficient: 0.47,
    restitution: 0,
    ...over,
  };
}

export function makeEnv(world: WorldSettings, over: Partial<SimEnvironment> = {}): SimEnvironment {
  return {
    world,
    terrain: [{ x: -100, y: 0 }, { x: 1000, y: 0 }],
    target: { x: 9999, y: 9999, radius: 1 },
    obstacles: [],
    bounds: { minX: -100, maxX: 1000, minY: -50 },
    ...over,
  };
}
