/**
 * Máquina de estados do jogo.
 *
 * Cada estado só aceita alguns eventos. Um evento inválido NÃO muda o estado:
 * ele é registrado como erro (ex.: tentar disparar com um projétil já em voo).
 */

export type GameState = 'aiming' | 'flying' | 'paused' | 'result' | 'levelComplete' | 'levelFailed';

export type GameEventType =
  | 'FIRE'
  | 'PAUSE'
  | 'RESUME'
  | 'STEP'
  | 'LAND'
  | 'NEXT_SHOT'
  | 'COMPLETE_LEVEL'
  | 'FAIL_LEVEL'
  | 'NEXT_LEVEL'
  | 'RETRY'
  | 'RESET';

export interface GameEvent {
  type: GameEventType;
}

export const TRANSITIONS: Record<GameState, Partial<Record<GameEventType, GameState>>> = {
  aiming: { FIRE: 'flying', RESET: 'aiming' },
  flying: { PAUSE: 'paused', LAND: 'result', RESET: 'aiming' },
  paused: { RESUME: 'flying', STEP: 'paused', LAND: 'result', RESET: 'aiming' },
  result: { NEXT_SHOT: 'aiming', COMPLETE_LEVEL: 'levelComplete', FAIL_LEVEL: 'levelFailed', RESET: 'aiming' },
  levelComplete: { NEXT_LEVEL: 'aiming', RESET: 'aiming' },
  levelFailed: { RETRY: 'aiming', RESET: 'aiming' },
};

export const STATE_LABELS: Record<GameState, string> = {
  aiming: 'Mirando',
  flying: 'Em voo',
  paused: 'Pausado',
  result: 'Resultado',
  levelComplete: 'Nível concluído',
  levelFailed: 'Tentativas esgotadas',
};

export interface TransitionLog {
  from: GameState;
  event: GameEventType;
  to: GameState;
  ok: boolean;
}

export interface MachineState {
  state: GameState;
  history: TransitionLog[];
  lastError: string | null;
}

export function createMachine(): MachineState {
  return { state: 'aiming', history: [], lastError: null };
}

export function canTransition(state: GameState, event: GameEventType): boolean {
  return TRANSITIONS[state][event] !== undefined;
}

/** Função pura de transição: (estado, evento) → próximo estado. */
export function transition(state: GameState, event: GameEventType): { state: GameState; error: string | null } {
  const next = TRANSITIONS[state][event];
  if (!next) return { state, error: `Evento "${event}" não é permitido no estado "${STATE_LABELS[state]}".` };
  return { state: next, error: null };
}

const HISTORY_SIZE = 8;

/** Reducer compatível com React.useReducer. */
export function gameReducer(machine: MachineState, event: GameEvent): MachineState {
  const result = transition(machine.state, event.type);
  const log: TransitionLog = { from: machine.state, event: event.type, to: result.state, ok: !result.error };
  return {
    state: result.state,
    history: [log, ...machine.history].slice(0, HISTORY_SIZE),
    lastError: result.error,
  };
}
