/**
 * Ponto de entrada da página de testes (test.html).
 * Importa todos os arquivos *.test.ts, executa e mostra o relatório.
 */
import './physics.test';
import './collision.test';
import './game.test';
import { runAll, type TestResult } from './testRunner';

declare global {
  interface Window {
    __TEST_RESULTS__?: { passed: number; failed: number; results: TestResult[] };
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);
}

const results = runAll();
const failed = results.filter((r) => !r.passed).length;
const passed = results.length - failed;
window.__TEST_RESULTS__ = { passed, failed, results };

const bySuite = new Map<string, TestResult[]>();
results.forEach((r) => bySuite.set(r.suite, [...(bySuite.get(r.suite) ?? []), r]));

const root = document.getElementById('test-root');
if (root) {
  const suites = [...bySuite.entries()]
    .map(
      ([suite, list]) => `
      <section class="test-suite">
        <h2>${escapeHtml(suite)}</h2>
        <ul>
          ${list
            .map(
              (r) => `<li class="${r.passed ? 'ok' : 'fail'}">
                <span class="mark">${r.passed ? '✓' : '✗'}</span> ${escapeHtml(r.name)}
                <span class="ms">${r.ms.toFixed(1)} ms</span>
                ${r.error ? `<pre>${escapeHtml(r.error)}</pre>` : ''}
              </li>`,
            )
            .join('')}
        </ul>
      </section>`,
    )
    .join('');
  root.innerHTML = `
    <h1>Testes automatizados</h1>
    <p class="test-summary ${failed ? 'fail' : 'ok'}">
      ${failed ? '✗' : '✓'} ${passed} de ${results.length} testes passaram${failed ? ` — ${failed} falharam` : ''}
    </p>
    <p class="muted"><a href="index.html">← Voltar ao simulador</a></p>
    ${suites}`;
}
document.title = `${failed ? '✗' : '✓'} ${passed}/${results.length} — Testes`;
