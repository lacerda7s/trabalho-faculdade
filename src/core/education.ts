/**
 * Conteúdo educativo e geração de feedback após cada disparo.
 * Também é regra de negócio: recebe números e devolve textos, sem tocar na interface.
 */
import type { FeedbackItem, LevelConfig, ShotRecord, WorldSettings } from './types';
import { launchAcceleration } from './PhysicsEngine';
import { windForce } from './WindSystem';
import { PROJECTILES } from './Projectile';
import { toRadians } from './vector';

export interface NewtonLaw {
  id: 1 | 2 | 3;
  name: string;
  statement: string;
  formula: string;
  inTheGame: string[];
}

export const NEWTON_LAWS: NewtonLaw[] = [
  {
    id: 1,
    name: 'Lei da Inércia',
    statement:
      'Todo corpo permanece em repouso ou em movimento retilíneo uniforme, a menos que uma força resultante atue sobre ele.',
    formula: 'ΣF = 0  ⇒  v constante',
    inTheGame: [
      'Depois que sai do cano, nada empurra o projétil para frente: ele continua andando por inércia.',
      'Sem vento e sem ar, nenhuma força horizontal atua, então vx fica constante durante todo o voo.',
      'Desligue a gravidade no laboratório: o projétil segue em linha reta para sempre.',
    ],
  },
  {
    id: 2,
    name: 'Princípio Fundamental da Dinâmica',
    statement: 'A força resultante sobre um corpo é igual ao produto da sua massa pela sua aceleração.',
    formula: 'F = m · a   ⇒   a = F / m',
    inTheGame: [
      'Dentro do cano, a pólvora aplica a força F durante 0,01 s: a = F/m e v₀ = a · 0,01 s.',
      'Com a mesma força, um projétil mais leve recebe mais aceleração e sai mais rápido.',
      'O vento aplica uma força: projéteis leves (m pequeno) são mais desviados.',
    ],
  },
  {
    id: 3,
    name: 'Ação e Reação',
    statement:
      'A toda ação corresponde uma reação de mesmo módulo, mesma direção e sentido oposto, atuando em corpos diferentes.',
    formula: 'F(canhão→projétil) = −F(projétil→canhão)',
    inTheGame: [
      'O canhão empurra o projétil para frente; o projétil empurra o canhão para trás.',
      'O momento se conserva: m · v = M · V. Canhão pesado → recuo pequeno.',
      'As forças do par atuam em corpos diferentes, por isso não se anulam.',
    ],
  },
];

const fmt = (n: number, digits = 1): string =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });

export interface FeedbackInput {
  shot: ShotRecord;
  level: LevelConfig;
  world: WorldSettings;
  /** deslocamento horizontal causado pelo vento (m), se calculado */
  windDrift: number | null;
  /** velocidade horizontal ao final do voo (m/s) */
  finalVx: number;
}

/** Explicações mostradas logo após o disparo (durante o voo). */
export function launchFeedback(params: ShotRecord['params'], speed: number, world: WorldSettings, cannonRecoil: number): FeedbackItem[] {
  const a = launchAcceleration(params.force, params.mass);
  const items: FeedbackItem[] = [
    {
      law: 2,
      tone: 'info',
      title: '2ª lei: a pólvora acelera o projétil',
      text: `a = F/m = ${fmt(params.force, 0)} N ÷ ${fmt(params.mass)} kg = ${fmt(a, 0)} m/s². Em 0,01 s ele atinge v₀ = ${fmt(speed)} m/s.`,
    },
    {
      law: 1,
      tone: 'info',
      title: '1ª lei: agora ele segue por inércia',
      text: world.toggles.gravity
        ? 'Nenhuma força o empurra para frente. Só a gravidade (e, se ativos, vento e ar) muda sua trajetória.'
        : 'Gravidade desligada: sem força resultante, ele segue em linha reta com velocidade constante.',
    },
  ];
  if (world.toggles.recoil) {
    items.push({
      law: 3,
      tone: 'info',
      title: '3ª lei: o canhão recua',
      text: `Mesma força, sentido oposto. O canhão recua a ${fmt(cannonRecoil, 2)} m/s.`,
    });
  }
  return items;
}

/** Explicações após o projétil parar. */
export function generateShotFeedback(input: FeedbackInput): FeedbackItem[] {
  const { shot, level, world } = input;
  const items: FeedbackItem[] = [];
  const p = shot.params;

  // Resultado: antes, depois, obstáculo ou acerto
  if (shot.outcome === 'hit') {
    items.push({ law: null, tone: 'success', title: 'Na mosca!', text: `O projétil acertou a ${fmt(shot.targetDistance ?? 0, 2)} m do centro do alvo.` });
  } else if (shot.outcome === 'obstacle') {
    items.push({
      law: null,
      tone: 'warning',
      title: 'Bateu no obstáculo',
      text: 'A trajetória cruzou uma barreira. Aumente o ângulo para ganhar altura ou mude a força para mudar o ponto mais alto.',
    });
  } else if (shot.impactX !== null) {
    const diff = shot.impactX - level.target.x;
    items.push(
      diff < 0
        ? {
            law: null,
            tone: 'warning',
            title: `Caiu ${fmt(Math.abs(diff))} m antes do alvo`,
            text: 'Faltou alcance: aumente a força, reduza a massa ou aproxime o ângulo de 45°.',
          }
        : {
            law: null,
            tone: 'warning',
            title: `Passou ${fmt(diff)} m do alvo`,
            text: 'Sobrou alcance: reduza a força ou afaste o ângulo de 45°.',
          },
    );
  } else {
    items.push({ law: null, tone: 'warning', title: 'Saiu da área', text: 'O projétil deixou o cenário. Reduza a força ou ajuste o ângulo.' });
  }

  // Ângulo
  const vx0 = shot.launchSpeed * Math.cos(toRadians(p.angleDeg));
  const vy0 = shot.launchSpeed * Math.sin(toRadians(p.angleDeg));
  items.push({
    law: null,
    tone: 'info',
    title: `Ângulo de ${fmt(p.angleDeg, 0)}°`,
    text:
      `Velocidade dividida em vx = ${fmt(vx0)} m/s e vy = ${fmt(vy0)} m/s. ` +
      (p.angleDeg > 45
        ? 'Acima de 45° o projétil sobe mais, mas anda menos para frente.'
        : p.angleDeg < 45
          ? 'Abaixo de 45° a trajetória é mais rasante e rápida.'
          : '45° divide a velocidade igualmente: alcance máximo no vácuo.'),
  });

  // 2ª lei — massa e aceleração
  const a = launchAcceleration(p.force, p.mass);
  items.push({
    law: 2,
    tone: 'info',
    title: 'Massa × aceleração',
    text: `Com ${fmt(p.mass)} kg, a força de ${fmt(p.force, 0)} N gerou ${fmt(a, 0)} m/s² no cano. Com o dobro da massa, a aceleração seria a metade (${fmt(a / 2, 0)} m/s²).`,
  });

  // 1ª lei — velocidade horizontal
  const horizontalForces = (world.toggles.wind && world.windSpeed !== 0) || (world.toggles.airResistance && world.airDensityFactor > 0);
  if (!horizontalForces) {
    items.push({
      law: 1,
      tone: 'info',
      title: 'vx permaneceu constante',
      text: `Sem forças horizontais, a velocidade horizontal ficou em ${fmt(vx0)} m/s do início ao fim — inércia em ação.`,
    });
  } else if (world.toggles.airResistance && world.airDensityFactor > 0) {
    const loss = vx0 !== 0 ? (1 - input.finalVx / vx0) * 100 : 0;
    items.push({
      law: 1,
      tone: 'info',
      title: 'O ar freou o projétil',
      text: `O arrasto é uma força contrária ao movimento. A velocidade horizontal caiu cerca de ${fmt(Math.max(0, loss), 0)}% durante o voo.`,
    });
  }

  // Vento
  if (world.toggles.wind && world.windSpeed !== 0) {
    const spec = PROJECTILES[p.projectile];
    const f = windForce(world.windSpeed, spec.radius).x;
    const drift = input.windDrift;
    items.push({
      law: 2,
      tone: 'info',
      title: 'O vento desviou o projétil',
      text:
        `Força do vento ≈ ${fmt(Math.abs(f))} N → a = F/m = ${fmt(Math.abs(f) / p.mass, 2)} m/s² ${world.windSpeed > 0 ? 'para frente' : 'para trás'}.` +
        (drift !== null ? ` Deslocamento estimado: ${fmt(Math.abs(drift))} m ${drift >= 0 ? 'a mais' : 'a menos'}.` : ''),
    });
  }

  // 3ª lei — recuo
  if (world.toggles.recoil && shot.recoil.velocity > 0) {
    items.push({
      law: 3,
      tone: shot.recoilViolation ? 'warning' : 'info',
      title: shot.recoilViolation ? 'Recuo acima do limite!' : 'Ação e reação',
      text: `Momento transferido: ${fmt(shot.recoil.momentum)} kg·m/s. Com ${fmt(p.cannonMass, 0)} kg, o canhão recuou a ${fmt(shot.recoil.velocity, 2)} m/s e andou ${fmt(shot.recoil.distance, 2)} m.`,
    });
  }

  return items;
}
