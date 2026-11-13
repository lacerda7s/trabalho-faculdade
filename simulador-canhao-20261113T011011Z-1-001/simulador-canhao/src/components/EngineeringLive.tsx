/** "Engenharia ao vivo": mostra a máquina de estados funcionando durante o jogo. */
import React from 'react';
import { MachineState, STATE_LABELS, GameState } from '../core/GameStateManager';

const ORDER: GameState[] = ['aiming', 'flying', 'paused', 'result', 'levelComplete', 'levelFailed'];

export function EngineeringLive({ machine }: { machine: MachineState }) {
  return (
    <section className="panel engineering" aria-label="Máquina de estados">
      <h3 className="panel-title">
        <span className="dot dot-gray" /> Engenharia ao vivo
      </h3>
      <p className="muted small">Estado atual da máquina de estados do jogo:</p>
      <div className="state-pills">
        {ORDER.map((s) => (
          <span key={s} className={`state-pill ${machine.state === s ? 'current' : ''}`}>
            {STATE_LABELS[s]}
          </span>
        ))}
      </div>
      {machine.history.length > 0 && (
        <ol className="transition-log">
          {machine.history.slice(0, 5).map((h, i) => (
            <li key={i} className={h.ok ? '' : 'rejected'}>
              <code>{STATE_LABELS[h.from]}</code> —{h.event}→ <code>{STATE_LABELS[h.to]}</code>
              {!h.ok && <em> (rejeitado)</em>}
            </li>
          ))}
        </ol>
      )}
      {machine.lastError && <p className="small warn-text">{machine.lastError}</p>}
    </section>
  );
}
