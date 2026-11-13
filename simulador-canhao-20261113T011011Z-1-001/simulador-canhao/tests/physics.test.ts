import { describe, expect, it } from './testRunner';
import {
  bounce,
  BARREL_TIME,
  computeForces,
  computeRecoil,
  dragForce,
  launchAcceleration,
  launchSpeed,
  stepBody,
} from '../src/core/PhysicsEngine';
import { analyticFlightTime, analyticMaxHeight, analyticRange, predictTrajectory } from '../src/core/TrajectoryCalculator';
import { simulateFlight } from '../src/core/Simulation';
import { windForce, nextWind } from '../src/core/WindSystem';
import { fromAngle, length } from '../src/core/vector';
import { heightAt, normalAt } from '../src/core/Terrain';
import { makeBody, makeEnv, makeWorld } from './helpers';

describe('2ª lei de Newton (F = m·a)', () => {
  it('a = F / m', () => {
    expect(launchAcceleration(6000, 3)).toBe(2000);
  });

  it('mesma força: metade da massa gera o dobro da aceleração', () => {
    expect(launchAcceleration(4000, 1)).toBe(2 * launchAcceleration(4000, 2));
  });

  it('velocidade de saída v₀ = (F/m)·Δt', () => {
    expect(launchSpeed(8000, 4)).toBeCloseTo((8000 / 4) * BARREL_TIME, 6);
  });

  it('massa zero ou negativa lança erro', () => {
    expect(() => launchAcceleration(1000, 0)).toThrow();
    expect(() => launchAcceleration(1000, -2)).toThrow();
  });

  it('com gravidade, aceleração vertical é −g para qualquer massa', () => {
    const world = makeWorld();
    for (const mass of [1, 5, 10]) {
      const r = stepBody(makeBody({ mass }), world, 0.01);
      expect(r.acceleration.y).toBeCloseTo(-9.81, 6);
    }
  });
});

describe('1ª lei de Newton (inércia)', () => {
  it('sem forças, a velocidade não muda', () => {
    const world = makeWorld({}, { gravity: false });
    let body = makeBody({ velocity: { x: 7, y: 3 } });
    for (let i = 0; i < 500; i++) body = stepBody(body, world, 1 / 120).body;
    expect(body.velocity.x).toBeCloseTo(7, 9);
    expect(body.velocity.y).toBeCloseTo(3, 9);
  });

  it('com só a gravidade, vx permanece constante', () => {
    const world = makeWorld();
    let body = makeBody({ velocity: { x: 12, y: 20 } });
    for (let i = 0; i < 200; i++) body = stepBody(body, world, 1 / 120).body;
    expect(body.velocity.x).toBeCloseTo(12, 9);
    expect(body.velocity.y).toBeLessThan(20);
  });
});

describe('Forças', () => {
  it('gravidade aponta para baixo com módulo m·g', () => {
    const f = computeForces(makeBody({ mass: 3 }), makeWorld());
    expect(f.gravity.x).toBe(0);
    expect(f.gravity.y).toBeCloseTo(-29.43, 6);
  });

  it('arrasto se opõe ao movimento e cresce com v²', () => {
    const world = makeWorld({}, { airResistance: true });
    const slow = dragForce({ x: 10, y: 0 }, 0.08, 0.47, world);
    const fast = dragForce({ x: 20, y: 0 }, 0.08, 0.47, world);
    expect(slow.x).toBeLessThan(0);
    expect(fast.x / slow.x).toBeCloseTo(4, 6);
  });

  it('arrasto é zero com resistência do ar desligada', () => {
    const f = dragForce({ x: 50, y: 10 }, 0.08, 0.47, makeWorld());
    expect(f.x).toBe(0);
    expect(f.y).toBe(0);
  });

  it('vento a favor empurra para +x, contra empurra para −x', () => {
    expect(windForce(5, 0.08).x).toBeGreaterThan(0);
    expect(windForce(-5, 0.08).x).toBeLessThan(0);
  });

  it('vento desvia mais um projétil leve (a = F/m)', () => {
    const world = makeWorld({ windSpeed: 6 }, { gravity: false, wind: true });
    const light = stepBody(makeBody({ mass: 1 }), world, 0.01).acceleration.x;
    const heavy = stepBody(makeBody({ mass: 4 }), world, 0.01).acceleration.x;
    expect(light).toBeCloseTo(4 * heavy, 6);
  });

  it('nextWind fica dentro do intervalo base ± variação', () => {
    expect(nextWind(-6, 3, () => 0)).toBe(-9);
    expect(nextWind(-6, 3, () => 1)).toBe(-3);
    expect(nextWind(-6, 3, () => 0.5)).toBe(-6);
  });
});

describe('Trajetória no vácuo × fórmulas analíticas', () => {
  const radius = 0.05;
  const env = makeEnv(makeWorld(), { terrain: [{ x: -100, y: -radius }, { x: 1000, y: -radius }] });

  for (const angle of [30, 45, 60]) {
    it(`alcance a ${angle}° bate com R = v²·sen(2θ)/g (±0,5 m)`, () => {
      const v = 20;
      const flight = simulateFlight(makeBody({ radius, velocity: fromAngle(angle, v) }), env);
      const expected = analyticRange(v, angle, 9.81);
      expect(Math.abs((flight.firstImpact?.x ?? 0) - expected)).toBeLessThan(0.5);
    });
  }

  it('tempo de voo bate com T = 2·v·sen θ / g (±0,05 s)', () => {
    const flight = simulateFlight(makeBody({ radius, velocity: fromAngle(50, 25) }), env);
    expect(Math.abs(flight.t - analyticFlightTime(25, 50, 9.81))).toBeLessThan(0.05);
  });

  it('altura máxima bate com H = (v·sen θ)²/2g (±0,2 m)', () => {
    const flight = simulateFlight(makeBody({ radius, velocity: fromAngle(60, 25) }), env);
    expect(Math.abs(flight.maxHeight - analyticMaxHeight(25, 60, 9.81))).toBeLessThan(0.2);
  });

  it('45° alcança mais longe que 30° e 60°', () => {
    const r = (a: number) => simulateFlight(makeBody({ radius, velocity: fromAngle(a, 20) }), env).firstImpact?.x ?? 0;
    expect(r(45)).toBeGreaterThan(r(30));
    expect(r(45)).toBeGreaterThan(r(60));
  });

  it('a previsão de trajetória termina no mesmo ponto que o voo real', () => {
    const body = makeBody({ radius, velocity: fromAngle(40, 18) });
    const prediction = predictTrajectory(body, env);
    const flight = simulateFlight(body, env);
    expect(prediction.landing?.x ?? -1).toBeCloseTo(flight.firstImpact?.x ?? -2, 6);
  });

  it('resistência do ar reduz o alcance', () => {
    const drag = makeEnv(makeWorld({ airDensityFactor: 3 }, { airResistance: true }), { terrain: env.terrain });
    const body = makeBody({ radius: 0.08, velocity: fromAngle(45, 30) });
    const withAir = simulateFlight(body, drag).firstImpact?.x ?? 0;
    const vacuum = simulateFlight(body, env).firstImpact?.x ?? 0;
    expect(withAir).toBeLessThan(vacuum);
  });
});

describe('3ª lei de Newton (recuo)', () => {
  it('conservação do momento horizontal: m·v·cosθ = M·V', () => {
    const r = computeRecoil(4, 20, 0, 400, true);
    expect(r.momentum).toBeCloseTo(80, 6);
    expect(r.velocity).toBeCloseTo(0.2, 6);
  });

  it('canhão mais pesado recua menos', () => {
    const light = computeRecoil(4, 20, 30, 50, true);
    const heavy = computeRecoil(4, 20, 30, 500, true);
    expect(heavy.velocity).toBeLessThan(light.velocity);
    expect(heavy.distance).toBeLessThan(light.distance);
  });

  it('disparo vertical (90°) não gera recuo horizontal', () => {
    expect(computeRecoil(4, 20, 90, 100, true).velocity).toBeCloseTo(0, 6);
  });

  it('recuo desligado no laboratório resulta em zero', () => {
    const r = computeRecoil(4, 20, 30, 100, false);
    expect(r.velocity).toBe(0);
    expect(r.distance).toBe(0);
  });
});

describe('Quique e terreno', () => {
  it('quique inverte a velocidade normal com restituição', () => {
    const v = bounce({ x: 5, y: -20 }, { x: 0, y: 1 }, 0.5);
    expect(v?.y ?? 0).toBeCloseTo(10, 6);
  });

  it('quique fraco para o projétil (retorna null)', () => {
    expect(bounce({ x: 5, y: -3 }, { x: 0, y: 1 }, 0.5)).toBeNull();
  });

  it('altura do terreno é interpolada entre os pontos', () => {
    const t = [{ x: 0, y: 0 }, { x: 10, y: 5 }];
    expect(heightAt(t, 4)).toBeCloseTo(2, 6);
    expect(heightAt(t, -5)).toBe(0);
    expect(heightAt(t, 50)).toBe(5);
  });

  it('normal de um terreno plano aponta para cima', () => {
    const n = normalAt([{ x: 0, y: 0 }, { x: 10, y: 0 }], 5);
    expect(n.y).toBeCloseTo(1, 6);
    expect(length(n)).toBeCloseTo(1, 6);
  });
});
