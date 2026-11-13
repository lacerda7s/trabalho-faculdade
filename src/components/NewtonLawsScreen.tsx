/** Tela "Leis de Newton" com mini animações de cada lei. */
import React from 'react';
import { NEWTON_LAWS } from '../core/education';

function Demo({ law }: { law: 1 | 2 | 3 }) {
  if (law === 1) {
    return (
      <svg viewBox="0 0 300 110" className="law-demo" aria-label="Bola seguindo em linha reta com velocidade constante">
        <rect width="300" height="110" rx="12" fill="#0b1e3f" />
        {[20, 60, 100, 140, 180, 220, 260].map((x) => (
          <circle key={x} cx={x} cy="55" r="1.6" fill="#4dabf7" opacity="0.6" />
        ))}
        <circle className="demo-inertia" cy="55" r="10" fill="#ffd43b" />
        <text x="150" y="98" textAnchor="middle" fill="#a5d8ff" fontSize="11">sem forças → mesma velocidade, mesma direção</text>
      </svg>
    );
  }
  if (law === 2) {
    return (
      <svg viewBox="0 0 300 110" className="law-demo" aria-label="Mesma força em massas diferentes: a leve acelera mais">
        <rect width="300" height="110" rx="12" fill="#0b1e3f" />
        <g className="demo-light">
          <circle cy="35" r="8" fill="#ff8787" />
        </g>
        <g className="demo-heavy">
          <circle cy="75" r="15" fill="#748ffc" />
        </g>
        <text x="290" y="38" textAnchor="end" fill="#ffc9c9" fontSize="11">m pequena → a grande</text>
        <text x="290" y="79" textAnchor="end" fill="#bac8ff" fontSize="11">m grande → a pequena</text>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 300 110" className="law-demo" aria-label="Canhão recua enquanto o projétil vai para frente">
      <rect width="300" height="110" rx="12" fill="#0b1e3f" />
      <line x1="0" y1="88" x2="300" y2="88" stroke="#495057" />
      <g className="demo-cannon">
        <rect x="110" y="58" width="48" height="16" rx="7" fill="#adb5bd" />
        <circle cx="122" cy="78" r="10" fill="#8d5524" />
      </g>
      <circle className="demo-shot" cy="66" r="6" fill="#ffd43b" />
      <text x="70" y="30" fill="#f783ac" fontSize="11" textAnchor="middle">← reação</text>
      <text x="230" y="30" fill="#b197fc" fontSize="11" textAnchor="middle">ação →</text>
    </svg>
  );
}

export function NewtonLawsScreen({ onPlay }: { onPlay: () => void }) {
  return (
    <div className="page">
      <header className="page-head">
        <h1>As três leis de Newton</h1>
        <p>Publicadas em 1687 nos “Principia”, elas descrevem como forças mudam o movimento — exatamente o que o simulador calcula a cada 1/120 s.</p>
      </header>
      <div className="laws-grid">
        {NEWTON_LAWS.map((law) => (
          <article key={law.id} className={`law-full law-${law.id}`}>
            <span className={`law-badge law-${law.id}`}>{law.id}ª lei</span>
            <h2>{law.name}</h2>
            <Demo law={law.id} />
            <p className="statement">{law.statement}</p>
            <code className="formula">{law.formula}</code>
            <h3>No jogo</h3>
            <ul>
              {law.inTheGame.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      <div className="page-cta">
        <button type="button" className="btn btn-fire btn-big" onClick={onPlay}>
          Testar no Modo Aprendizado ▶
        </button>
      </div>
    </div>
  );
}
