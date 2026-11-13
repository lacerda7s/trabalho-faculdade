import { describe, expect, it } from './testRunner';
import { checkTargetHit, circleIntersectsRect, detectCollision, findObstacleHit, isOutOfBounds } from '../src/core/CollisionDetector';
import { pathMissDistance, simulateFlight } from '../src/core/Simulation';
import { fromAngle } from '../src/core/vector';
import { makeBody, makeEnv, makeWorld } from './helpers';

describe('Colisão círculo × retângulo', () => {
  const rect = { x: 10, y: 0, width: 2, height: 5 };

  it('detecta círculo dentro do retângulo', () => {
    expect(circleIntersectsRect({ x: 11, y: 2 }, 0.1, rect)).toBeTruthy();
  });

  it('detecta toque na borda', () => {
    expect(circleIntersectsRect({ x: 9.9, y: 2 }, 0.1, rect)).toBeTruthy();
  });

  it('não detecta quando está longe', () => {
    expect(circleIntersectsRect({ x: 9, y: 2 }, 0.1, rect)).toBeFalsy();
    expect(circleIntersectsRect({ x: 11, y: 6 }, 0.5, rect)).toBeFalsy();
  });

  it('canto: usa a distância ao vértice', () => {
    expect(circleIntersectsRect({ x: 12.3, y: 5.3 }, 0.5, rect)).toBeTruthy();
    expect(circleIntersectsRect({ x: 12.5, y: 5.5 }, 0.5, rect)).toBeFalsy();
  });

  it('findObstacleHit devolve o índice certo', () => {
    const obstacles = [rect, { x: 20, y: 0, width: 1, height: 1 }];
    expect(findObstacleHit({ x: 20.5, y: 0.5 }, 0.1, obstacles)).toBe(1);
    expect(findObstacleHit({ x: 50, y: 0.5 }, 0.1, obstacles)).toBe(-1);
  });
});

describe('Alvo', () => {
  const target = { x: 30, y: 3, radius: 2 };

  it('acerta dentro do raio (somando o raio do projétil)', () => {
    expect(checkTargetHit({ x: 31.5, y: 3 }, 0.1, target).hit).toBeTruthy();
    expect(checkTargetHit({ x: 32.05, y: 3 }, 0.1, target).hit).toBeTruthy();
  });

  it('erra fora do raio', () => {
    expect(checkTargetHit({ x: 32.2, y: 3 }, 0.1, target).hit).toBeFalsy();
  });

  it('informa a distância ao centro', () => {
    expect(checkTargetHit({ x: 30, y: 4 }, 0.1, target).distance).toBeCloseTo(1, 6);
  });
});

describe('detectCollision', () => {
  const env = makeEnv(makeWorld(), {
    target: { x: 30, y: 3, radius: 2 },
    obstacles: [{ x: 10, y: 0, width: 2, height: 5 }],
  });

  it('prioriza o alvo', () => {
    expect(detectCollision({ x: 30, y: 3 }, 0.1, env).type).toBe('target');
  });

  it('detecta obstáculo', () => {
    expect(detectCollision({ x: 11, y: 3 }, 0.1, env).type).toBe('obstacle');
  });

  it('detecta solo', () => {
    expect(detectCollision({ x: 20, y: 0.05 }, 0.1, env).type).toBe('ground');
  });

  it('com colisões desligadas ignora solo e obstáculos, mas não o alvo', () => {
    const off = { ...env, world: makeWorld({}, { collisions: false }) };
    expect(detectCollision({ x: 11, y: 3 }, 0.1, off).type).toBe('none');
    expect(detectCollision({ x: 20, y: -1 }, 0.1, off).type).toBe('none');
    expect(detectCollision({ x: 30, y: 3 }, 0.1, off).type).toBe('target');
  });

  it('limites do cenário', () => {
    const b = { minX: -10, maxX: 100, minY: -20 };
    expect(isOutOfBounds({ x: 101, y: 0 }, b)).toBeTruthy();
    expect(isOutOfBounds({ x: 50, y: -21 }, b)).toBeTruthy();
    expect(isOutOfBounds({ x: 50, y: 500 }, b)).toBeFalsy();
  });
});

describe('Voo completo', () => {
  it('um disparo rasante bate na muralha', () => {
    const env = makeEnv(makeWorld(), { obstacles: [{ x: 15, y: 0, width: 2, height: 20 }] });
    const flight = simulateFlight(makeBody({ position: { x: 0, y: 1 }, velocity: fromAngle(20, 30) }), env);
    expect(flight.outcome).toBe('obstacle');
    expect(flight.obstacleIndex).toBe(0);
  });

  it('um disparo calibrado acerta o alvo', () => {
    const env = makeEnv(makeWorld(), { target: { x: 40.77, y: 0, radius: 1.5 } });
    // R = v²·sen(90°)/g = 400/9,81 ≈ 40,77 m
    const flight = simulateFlight(makeBody({ position: { x: 0, y: 0.05 }, velocity: fromAngle(45, 20) }), env);
    expect(flight.outcome).toBe('hit');
  });

  it('precisão: trajetória pelo centro do alvo dá distância ≈ 0', () => {
    const env = makeEnv(makeWorld({}, { gravity: false }), { target: { x: 30, y: 5, radius: 2 } });
    const flight = simulateFlight(makeBody({ position: { x: 0, y: 5 }, velocity: { x: 40, y: 0 } }), env);
    expect(flight.outcome).toBe('hit');
    expect(flight.targetDistance ?? 99).toBeCloseTo(0, 6);
  });

  it('precisão: passar de raspão dá distância perto do raio', () => {
    expect(pathMissDistance({ x: 0, y: 6.9 }, { x: 10, y: 0 }, { x: 5, y: 5 })).toBeCloseTo(1.9, 6);
  });

  it('sem gravidade e sem colisões, sai da área em linha reta', () => {
    const env = makeEnv(makeWorld({}, { gravity: false, collisions: false }));
    const flight = simulateFlight(makeBody({ position: { x: 0, y: 5 }, velocity: { x: 50, y: 0 } }), env);
    expect(flight.outcome).toBe('outOfBounds');
    expect(flight.maxHeight).toBeCloseTo(5, 6);
  });

  it('bola de borracha quica antes de parar', () => {
    const env = makeEnv(makeWorld());
    const flight = simulateFlight(makeBody({ position: { x: 0, y: 1 }, velocity: fromAngle(45, 20), restitution: 0.6 }), env);
    expect(flight.bounces).toBeGreaterThan(0);
    expect(flight.outcome).toBe('ground');
  });
});
