/** Raiz da aplicação: navegação entre telas. */
import React, { useState } from 'react';
import type { GameMode } from './core/types';
import { HomeScreen } from './components/HomeScreen';
import { GameScreen } from './components/GameScreen';
import { HowItWorks } from './components/HowItWorks';
import { NewtonLawsScreen } from './components/NewtonLawsScreen';
import { ErrorBoundary } from './components/ErrorBoundary';

export type Screen = { name: 'home' } | { name: 'game'; mode: GameMode } | { name: 'how' } | { name: 'newton' };

const NAV: Array<{ label: string; screen: Screen }> = [
  { label: 'Início', screen: { name: 'home' } },
  { label: 'Desafio', screen: { name: 'game', mode: 'desafio' } },
  { label: 'Aprendizado', screen: { name: 'game', mode: 'aprendizado' } },
  { label: 'Laboratório', screen: { name: 'game', mode: 'laboratorio' } },
  { label: 'Como funciona', screen: { name: 'how' } },
  { label: 'Leis de Newton', screen: { name: 'newton' } },
];

const sameScreen = (a: Screen, b: Screen) => a.name === b.name && (a.name !== 'game' || b.name !== 'game' || a.mode === b.mode);

export function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' });

  const navigate = (s: Screen) => {
    setScreen(s);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="app">
      <header className="topbar">
        <button type="button" className="brand" onClick={() => navigate({ name: 'home' })}>
          <span className="brand-mark" aria-hidden="true">
            ◉
          </span>
          Simulador de Canhão
        </button>
        <nav className="topnav" aria-label="Navegação principal">
          {NAV.map((n) => (
            <button key={n.label} type="button" className={sameScreen(screen, n.screen) ? 'active' : ''} onClick={() => navigate(n.screen)}>
              {n.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="main">
        <ErrorBoundary key={screen.name === 'game' ? `game-${screen.mode}` : screen.name} onReset={() => navigate({ name: 'home' })}>
          {screen.name === 'home' && <HomeScreen onNavigate={navigate} />}
          {screen.name === 'game' && (
            <GameScreen
              key={screen.mode}
              mode={screen.mode}
              onNavigate={(to) => navigate(to === 'lab' ? { name: 'game', mode: 'laboratorio' } : { name: 'home' })}
            />
          )}
          {screen.name === 'how' && <HowItWorks onPlay={() => navigate({ name: 'game', mode: 'laboratorio' })} />}
          {screen.name === 'newton' && <NewtonLawsScreen onPlay={() => navigate({ name: 'game', mode: 'aprendizado' })} />}
        </ErrorBoundary>
      </main>

      <footer className="footer">
        Feito com React + TypeScript + Canvas · física em passos de 1/120 s · <a href="test.html">testes automatizados</a>
      </footer>
    </div>
  );
}
