/** Painel "Como o sistema funciona": a engenharia de software por trás do jogo. */
import React, { useEffect, useState } from 'react';
import { STATE_LABELS, TRANSITIONS, GameState } from '../core/GameStateManager';

const FLOW = [
  { title: 'Entrada do jogador', detail: 'Sliders, campos numéricos e teclado (GameControls).' },
  { title: 'Validação dos parâmetros', detail: 'validation.ts confere limites e restrições do nível; erros bloqueiam o disparo.' },
  { title: 'Cálculo das forças', detail: 'PhysicsEngine soma gravidade, vento (WindSystem) e arrasto: ΣF.' },
  { title: 'Atualização da física', detail: 'a = ΣF/m; v ← v + a·Δt; x ← x + v·Δt — 120 vezes por segundo.' },
  { title: 'Verificação de colisões', detail: 'CollisionDetector testa alvo, obstáculos e terreno a cada passo.' },
  { title: 'Atualização da pontuação', detail: 'ScoreSystem aplica bônus e penalidades; LevelManager avalia a missão.' },
  { title: 'Renderização da cena', detail: 'SceneRenderer desenha tudo no Canvas a partir do estado atual.' },
];

const MODULES = [
  { layer: 'core', name: 'PhysicsEngine', file: 'core/PhysicsEngine.ts', role: 'Forças, integração numérica e recuo (momento).' },
  { layer: 'core', name: 'TrajectoryCalculator', file: 'core/TrajectoryCalculator.ts', role: 'Previsão da trajetória e fórmulas analíticas.' },
  { layer: 'core', name: 'CollisionDetector', file: 'core/CollisionDetector.ts', role: 'Círculo × retângulo, alvo, solo e limites.' },
  { layer: 'core', name: 'WindSystem', file: 'core/WindSystem.ts', role: 'Força do vento e sorteio por disparo.' },
  { layer: 'core', name: 'ScoreSystem', file: 'core/ScoreSystem.ts', role: 'Regras de pontuação em tabela.' },
  { layer: 'core', name: 'LevelManager', file: 'core/LevelManager.ts', role: 'Níveis como dados + regras de conclusão.' },
  { layer: 'core', name: 'GameStateManager', file: 'core/GameStateManager.ts', role: 'Máquina de estados (reducer puro).' },
  { layer: 'core', name: 'Terrain', file: 'core/Terrain.ts', role: 'Altura e normal do terreno.' },
  { layer: 'render', name: 'Cannon · Projectile · Target · Terrain', file: 'render/*View.ts', role: 'Desenho de cada elemento no Canvas.' },
  { layer: 'render', name: 'SceneRenderer', file: 'render/SceneRenderer.ts', role: 'Compõe a cena; não contém regras de jogo.' },
  { layer: 'ui', name: 'GameScreen', file: 'components/GameScreen.tsx', role: 'Orquestra estado, loop de animação e camadas.' },
  { layer: 'ui', name: 'GameControls', file: 'components/GameControls.tsx', role: 'Entrada: sliders e campos validados.' },
  { layer: 'ui', name: 'EducationPanel', file: 'components/EducationPanel.tsx', role: 'Explicações e missão do nível.' },
];

const LAYER_LABEL: Record<string, string> = { core: 'Regra de negócio', render: 'Desenho', ui: 'Interface React' };

const LOOP_CODE = `// Loop de animação com passo fixo
const frame = (agora) => {
  acumulado += (agora - antes) / 1000;
  while (acumulado >= DT) {          // DT = 1/120 s
    advanceFlight(voo, ambiente, DT); // física
    acumulado -= DT;
  }
  drawScene(ctx, estadoAtual);       // apresentação
  requestAnimationFrame(frame);
};`;

const COLLISION_CODE = `// Círculo × retângulo
function circleIntersectsRect(c, r, ret) {
  const px = clamp(c.x, ret.x, ret.x + ret.width);
  const py = clamp(c.y, ret.y, ret.y + ret.height);
  return (c.x - px) ** 2 + (c.y - py) ** 2 <= r * r;
}`;

const TEST_CODE = `it('alcance a 45° bate com R = v²·sen(2θ)/g', () => {
  const voo = simulateFlight(corpo(45°, 20 m/s), vacuo);
  expect(|voo.impacto.x − analyticRange(20, 45, 9.81)|)
    .toBeLessThan(0.5);
});`;

export function HowItWorks({ onPlay }: { onPlay: () => void }) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setActive((a) => (a + 1) % FLOW.length), 1400);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="page how">
      <header className="page-head">
        <h1>Como o sistema funciona</h1>
        <p>O próprio jogo é um estudo de caso de engenharia de software: cada responsabilidade mora em um módulo pequeno, testável e documentado.</p>
      </header>

      <section className="how-grid">
        <article className="how-card flow-card">
          <h2>Entrada → processamento → saída</h2>
          <p className="muted">O que acontece a cada disparo (o destaque percorre o fluxo):</p>
          <ol className="flowchart">
            {FLOW.map((f, i) => (
              <li key={f.title} className={i === active ? 'active' : ''} onMouseEnter={() => setActive(i)}>
                <strong>{f.title}</strong>
                <span>{f.detail}</span>
              </li>
            ))}
          </ol>
        </article>

        <article className="how-card">
          <h2>Separação de responsabilidades</h2>
          <div className="layers">
            <div className="layer layer-ui">
              <strong>Interface (React)</strong>
              <span>Mostra dados e captura ações. Não sabe calcular física.</span>
            </div>
            <div className="layer-arrow">↓ parâmetros validados · ↑ estado</div>
            <div className="layer layer-core">
              <strong>Regra de negócio (core/)</strong>
              <span>Física, colisões, pontuação, níveis. TypeScript puro: sem DOM, sem React.</span>
            </div>
            <div className="layer-arrow">↓ retrato do estado</div>
            <div className="layer layer-render">
              <strong>Apresentação visual (render/)</strong>
              <span>Desenha no Canvas. Não decide nada: só desenha o que recebe.</span>
            </div>
          </div>
          <p className="small">
            <strong>Regra de negócio × apresentação:</strong> trocar Canvas por SVG ou WebGL não muda nenhuma linha da física; mudar a gravidade
            não muda nenhuma linha do desenho. Por isso a física pode ser testada sem abrir o jogo.
          </p>
        </article>

        <article className="how-card wide">
          <h2>Componentização</h2>
          <div className="module-table" role="table" aria-label="Módulos do sistema">
            {MODULES.map((m) => (
              <div key={m.name} className="module-row" role="row">
                <span className={`layer-tag tag-${m.layer}`} role="cell">
                  {LAYER_LABEL[m.layer]}
                </span>
                <strong role="cell">{m.name}</strong>
                <code role="cell">{m.file}</code>
                <span role="cell">{m.role}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="how-card">
          <h2>Máquina de estados do jogo</h2>
          <p className="small">
            O jogo está sempre em <em>um</em> estado. Cada estado aceita apenas certos eventos; um evento inválido (ex.: disparar com o projétil
            em voo) é rejeitado e registrado. A tabela abaixo é gerada a partir do mesmo código que o jogo usa.
          </p>
          <ul className="state-table">
            {(Object.keys(TRANSITIONS) as GameState[]).map((s) => (
              <li key={s}>
                <span className="state-pill current">{STATE_LABELS[s]}</span>
                <span className="edges">
                  {Object.entries(TRANSITIONS[s])
                    .filter(([e]) => e !== 'RESET')
                    .map(([event, to]) => (
                      <span key={event} className="edge">
                        <code>{event}</code> → {STATE_LABELS[to as GameState]}
                      </span>
                    ))}
                </span>
              </li>
            ))}
          </ul>
        </article>

        <article className="how-card">
          <h2>Loop de animação e tempo real</h2>
          <p className="small">
            O navegador chama <code>requestAnimationFrame</code> ~60 vezes por segundo. A física avança em passos fixos de 1/120 s — assim o
            resultado não depende da velocidade do computador. A interface React é atualizada só 10× por segundo (indicadores), enquanto o Canvas
            é redesenhado a cada quadro.
          </p>
          <pre className="code">{LOOP_CODE}</pre>
        </article>

        <article className="how-card">
          <h2>Detecção de colisões</h2>
          <p className="small">
            O projétil é um círculo. Para obstáculos, procura-se o ponto do retângulo mais próximo do centro do círculo: se a distância for menor
            que o raio, houve colisão. Para o solo, compara-se a altura do projétil com a altura do terreno naquele x.
          </p>
          <pre className="code">{COLLISION_CODE}</pre>
        </article>

        <article className="how-card">
          <h2>Testes automatizados</h2>
          <p className="small">
            Os cálculos são verificados contra as fórmulas da física: alcance, tempo de voo e altura máxima no vácuo, conservação do momento no
            recuo, colisões, pontuação, validação e a máquina de estados.
          </p>
          <pre className="code">{TEST_CODE}</pre>
          <a className="btn btn-secondary" href="test.html" target="_blank" rel="noreferrer">
            Rodar os testes ↗
          </a>
        </article>

        <article className="how-card">
          <h2>Pronto para crescer</h2>
          <ul className="small">
            <li>Novo nível = novo objeto de dados em <code>LEVELS</code> (terreno, alvo, vento, restrições, dificuldade).</li>
            <li>Novo projétil = nova entrada em <code>PROJECTILES</code>.</li>
            <li>Dificuldade configurável: nº de disparos, quanto da trajetória aparece e se a previsão inclui vento e ar.</li>
            <li>Tipagem forte em <code>core/types.ts</code> garante que todos os módulos falem a mesma língua.</li>
          </ul>
        </article>
      </section>

      <div className="page-cta">
        <button type="button" className="btn btn-fire btn-big" onClick={onPlay}>
          Ver tudo isso em ação ▶
        </button>
      </div>
    </div>
  );
}
