/** Painel educativo: missão do nível, leis em foco e explicações de cada disparo. */
import React from 'react';
import type { FeedbackItem, ForceBreakdown, GameMode, LevelConfig } from '../core/types';
import type { LevelEvaluation } from '../core/LevelManager';
import { NEWTON_LAWS } from '../core/education';
import { length } from '../core/vector';
import { VECTOR_COLORS } from '../render/Vectors';

interface EducationPanelProps {
  mode: GameMode;
  level: LevelConfig;
  feedback: FeedbackItem[];
  evaluation: LevelEvaluation;
  liveForces: ForceBreakdown | null;
  mass: number;
}

const LAW_BADGE: Record<number, string> = { 1: '1ª lei', 2: '2ª lei', 3: '3ª lei' };

function ForceList({ forces, mass }: { forces: ForceBreakdown; mass: number }) {
  const rows = [
    { name: 'Gravidade', f: forces.gravity, color: VECTOR_COLORS.gravity },
    { name: 'Vento', f: forces.wind, color: VECTOR_COLORS.wind },
    { name: 'Resistência do ar', f: forces.drag, color: VECTOR_COLORS.drag },
  ].filter((r) => length(r.f) > 1e-6);
  const total = length(forces.total);
  return (
    <div className="force-list">
      <h4 className="sub-title">Forças atuando agora</h4>
      {rows.length === 0 ? (
        <p className="muted">Nenhuma força: o projétil segue em linha reta com velocidade constante (1ª lei).</p>
      ) : (
        <ul>
          {rows.map((r) => (
            <li key={r.name}>
              <i style={{ background: r.color }} /> {r.name}: <strong>{length(r.f).toFixed(1)} N</strong>
            </li>
          ))}
          <li className="force-total">
            Resultante: <strong>{total.toFixed(1)} N</strong> → a = F/m = <strong>{(total / mass).toFixed(2)} m/s²</strong>
          </li>
        </ul>
      )}
    </div>
  );
}

export function EducationPanel({ mode, level, feedback, evaluation, liveForces, mass }: EducationPanelProps) {
  const laws = NEWTON_LAWS.filter((l) => level.newtonFocus.includes(l.id));
  const showLaws = mode !== 'desafio' || feedback.length === 0;

  return (
    <section className="panel education" aria-label="Painel educativo" aria-live="polite">
      <h3 className="panel-title">
        <span className="dot dot-yellow" /> {mode === 'laboratorio' ? 'Laboratório' : `Nível ${level.id}: ${level.title}`}
      </h3>
      <p className="intro">{level.intro}</p>

      {mode !== 'laboratorio' && (
        <div className="mission">
          <h4 className="sub-title">Missão</h4>
          <ul>
            {level.requirements.map((r) => (
              <li key={r} className={evaluation.complete ? 'done' : ''}>
                <span>{evaluation.complete ? '✓' : '○'}</span> {r}
              </li>
            ))}
          </ul>
          {evaluation.requiredMasses > 1 && (
            <p className="progress-note">
              Massas diferentes com acerto: {evaluation.distinctMasses}/{evaluation.requiredMasses}
            </p>
          )}
        </div>
      )}

      {mode !== 'desafio' && liveForces && <ForceList forces={liveForces} mass={mass} />}

      {feedback.length > 0 && (
        <div className="feedback">
          <h4 className="sub-title">O que aconteceu</h4>
          {feedback.map((f, i) => (
            <article key={`${f.title}-${i}`} className={`feedback-item tone-${f.tone}`}>
              <header>
                {f.law && <span className={`law-badge law-${f.law}`}>{LAW_BADGE[f.law]}</span>}
                <strong>{f.title}</strong>
              </header>
              <p>{f.text}</p>
            </article>
          ))}
        </div>
      )}

      {showLaws && (
        <div className="laws-focus">
          <h4 className="sub-title">Leis de Newton em foco</h4>
          {laws.map((l) => (
            <article key={l.id} className={`law-card law-${l.id}`}>
              <header>
                <span className={`law-badge law-${l.id}`}>{LAW_BADGE[l.id]}</span>
                <strong>{l.name}</strong>
              </header>
              <code>{l.formula}</code>
              <p>{l.inTheGame[0]}</p>
            </article>
          ))}
        </div>
      )}

      <div className="tips">
        {level.tips.map((t) => (
          <p key={t}>💡 {t}</p>
        ))}
      </div>
    </section>
  );
}
