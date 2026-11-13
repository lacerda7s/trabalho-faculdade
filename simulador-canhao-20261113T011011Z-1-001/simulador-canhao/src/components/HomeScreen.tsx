/** Tela inicial. */
import React from 'react';
import type { Screen } from '../App';

export function HomeScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  return (
    <div className="home">
      <div className="home-hero">
        <div className="home-text">
          <p className="eyebrow">Física · Engenharia de Software · Jogo</p>
          <h1>
            Simulador de Canhão:
            <span> Engenharia e Leis de Newton</span>
          </h1>
          <p className="subtitle">
            Aprenda física, desenvolva estratégias e entenda como o software transforma fórmulas em uma experiência interativa.
          </p>
          <blockquote>
            Ajuste os parâmetros do disparo, observe as forças atuando sobre o projétil e use as leis de Newton para acertar o alvo. Ao mesmo
            tempo, descubra como conceitos de engenharia de software são usados para construir o simulador.
          </blockquote>
          <div className="home-actions">
            <button type="button" className="btn btn-fire btn-big" onClick={() => onNavigate({ name: 'game', mode: 'desafio' })}>
              ▶ Começar jogo
            </button>
            <button type="button" className="btn btn-primary btn-big" onClick={() => onNavigate({ name: 'game', mode: 'aprendizado' })}>
              📘 Modo aprendizado
            </button>
            <button type="button" className="btn btn-secondary btn-big" onClick={() => onNavigate({ name: 'game', mode: 'laboratorio' })}>
              🧪 Modo laboratório
            </button>
            <button type="button" className="btn btn-ghost btn-big" onClick={() => onNavigate({ name: 'how' })}>
              ⚙ Como funciona
            </button>
            <button type="button" className="btn btn-ghost btn-big" onClick={() => onNavigate({ name: 'newton' })}>
              🍎 Ver leis de Newton
            </button>
          </div>
        </div>

        <svg className="home-art" viewBox="0 0 420 300" role="img" aria-label="Canhão lançando um projétil em direção a um alvo">
          <defs>
            <linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#69db7c" />
              <stop offset="1" stopColor="#2b8a3e" />
            </linearGradient>
          </defs>
          <path d="M0 250 Q 120 230 210 245 T 420 240 V300 H0Z" fill="url(#hg)" />
          <path className="home-arc" d="M95 200 Q 230 -20 352 178" fill="none" stroke="#fff" strokeWidth="3" strokeDasharray="2 9" strokeLinecap="round" />
          <circle className="home-ball" r="8" fill="#343a40" />
          <g transform="translate(70 222)">
            <rect x="-6" y="-14" width="62" height="20" rx="9" fill="#343a40" transform="rotate(-48)" />
            <circle r="18" fill="#8d5524" stroke="#5c3a17" strokeWidth="4" />
            <circle r="4" fill="#adb5bd" />
          </g>
          <g transform="translate(352 200)">
            <rect x="-3" y="10" width="6" height="40" fill="#5c3a17" />
            <circle r="24" fill="#e03131" />
            <circle r="18" fill="#fff" />
            <circle r="12" fill="#e03131" />
            <circle r="6" fill="#fcc419" />
          </g>
          <g className="home-vectors" fontFamily="Nunito" fontWeight="800" fontSize="12">
            <line x1="150" y1="120" x2="190" y2="88" stroke="#2f9e44" strokeWidth="3" />
            <text x="194" y="84" fill="#2f9e44">v</text>
            <line x1="150" y1="120" x2="150" y2="160" stroke="#e03131" strokeWidth="3" />
            <text x="156" y="160" fill="#e03131">g</text>
          </g>
        </svg>
      </div>

      <div className="home-cards">
        <article>
          <h3>🎯 Desafio</h3>
          <p>7 níveis progressivos: trajetória, massas, recuo, vento, ar, obstáculos e um desafio de engenharia.</p>
        </article>
        <article>
          <h3>📘 Aprendizado</h3>
          <p>Explicações a cada disparo: qual lei de Newton agiu e por que o projétil caiu antes ou depois do alvo.</p>
        </article>
        <article>
          <h3>🧪 Laboratório</h3>
          <p>Ligue e desligue gravidade, vento, ar, colisões e recuo. Compare trajetórias e veja gráficos.</p>
        </article>
        <article>
          <h3>⚙ Engenharia</h3>
          <p>Veja a arquitetura, a máquina de estados, o loop de animação e os testes automatizados do próprio jogo.</p>
        </article>
      </div>
    </div>
  );
}
