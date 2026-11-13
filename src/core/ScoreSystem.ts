/**
 * Pontuação do Modo Desafio.
 * Regras explícitas em uma tabela para facilitar ajustes e testes.
 */
import type { ShotOutcome } from './types';
import { clamp } from './vector';

export const SCORE_RULES = {
  HIT_BASE: 500,
  PRECISION_MAX: 500,
  SAVED_SHOT_BONUS: 150,
  LOW_FORCE_MAX: 300,
  OBSTACLE_PENALTY: 200,
  RECOIL_PENALTY: 150,
} as const;

export interface ShotScoreInput {
  outcome: ShotOutcome;
  targetDistance: number | null;
  targetRadius: number;
  force: number;
  forceLimit: number;
  shotNumber: number;
  /** 0 = ilimitado (sem bônus de disparos economizados) */
  maxShots: number;
  recoilViolation?: boolean;
}

export interface ScoreLine {
  label: string;
  points: number;
}

export interface ShotScore {
  total: number;
  lines: ScoreLine[];
  /** 0..1 — 1 = acerto no centro exato */
  precision: number;
}

/** Precisão de um acerto: 1 no centro, 0 na borda do alvo. */
export function hitPrecision(targetDistance: number, targetRadius: number): number {
  if (targetRadius <= 0) return 0;
  return clamp(1 - targetDistance / targetRadius, 0, 1);
}

export function computeShotScore(input: ShotScoreInput): ShotScore {
  const lines: ScoreLine[] = [];
  let precision = 0;

  if (input.outcome === 'hit' && input.targetDistance !== null) {
    precision = hitPrecision(input.targetDistance, input.targetRadius);
    lines.push({ label: 'Acerto no alvo', points: SCORE_RULES.HIT_BASE });
    lines.push({ label: `Precisão (${Math.round(precision * 100)}%)`, points: Math.round(SCORE_RULES.PRECISION_MAX * precision) });

    if (input.maxShots > 0) {
      const saved = Math.max(0, input.maxShots - input.shotNumber);
      if (saved > 0) lines.push({ label: `Disparos economizados (${saved})`, points: saved * SCORE_RULES.SAVED_SHOT_BONUS });
    }

    if (input.forceLimit > 0) {
      const economy = clamp(1 - input.force / input.forceLimit, 0, 1);
      const bonus = Math.round(SCORE_RULES.LOW_FORCE_MAX * economy);
      if (bonus > 0) lines.push({ label: 'Bônus por pouca força', points: bonus });
    }
  }

  if (input.outcome === 'obstacle') {
    lines.push({ label: 'Atingiu obstáculo', points: -SCORE_RULES.OBSTACLE_PENALTY });
  }
  if (input.recoilViolation) {
    lines.push({ label: 'Recuo acima do limite', points: -SCORE_RULES.RECOIL_PENALTY });
  }

  const total = lines.reduce((sum, l) => sum + l.points, 0);
  return { total, lines, precision };
}

/** Pontuação acumulada nunca fica negativa. */
export function applyScore(current: number, delta: number): number {
  return Math.max(0, current + delta);
}

/** Taxa de acerto (0..1). */
export function accuracyRate(hits: number, shots: number): number {
  return shots <= 0 ? 0 : hits / shots;
}

/** Estrelas ao concluir um nível: menos disparos = mais estrelas. */
export function starRating(shotsUsed: number, maxShots: number): 1 | 2 | 3 {
  if (shotsUsed <= 1) return 3;
  if (maxShots > 0 && shotsUsed <= Math.ceil(maxShots / 2)) return 2;
  if (maxShots <= 0 && shotsUsed <= 3) return 2;
  return 1;
}
