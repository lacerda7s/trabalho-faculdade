/**
 * Mini executor de testes com API no estilo Jest/Vitest (describe / it / expect).
 * Permite rodar os testes no navegador sem instalar nada.
 * Os arquivos *.test.ts podem migrar para o Vitest trocando apenas o import.
 */

type TestFn = () => void;

interface TestCase {
  suite: string;
  name: string;
  fn: TestFn;
}

export interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  error?: string;
  ms: number;
}

const cases: TestCase[] = [];
let currentSuite = '';

export function describe(name: string, fn: () => void): void {
  const previous = currentSuite;
  currentSuite = previous ? `${previous} › ${name}` : name;
  fn();
  currentSuite = previous;
}

export function it(name: string, fn: TestFn): void {
  cases.push({ suite: currentSuite, name, fn });
}

class AssertionError extends Error {}

const show = (v: unknown): string => {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
};

export function expect(actual: unknown) {
  const fail = (msg: string): never => {
    throw new AssertionError(msg);
  };
  const api = {
    toBe(expected: unknown) {
      if (!Object.is(actual, expected)) fail(`esperado ${show(expected)}, recebido ${show(actual)}`);
    },
    toEqual(expected: unknown) {
      if (show(actual) !== show(expected)) fail(`esperado ${show(expected)}, recebido ${show(actual)}`);
    },
    /** Igual ao Jest: |real − esperado| < 10^(−dígitos) / 2 */
    toBeCloseTo(expected: number, digits = 2) {
      const tol = Math.pow(10, -digits) / 2;
      if (typeof actual !== 'number' || Math.abs(actual - expected) >= tol) {
        fail(`esperado ≈ ${expected} (±${tol}), recebido ${show(actual)}`);
      }
    },
    toBeGreaterThan(expected: number) {
      if (!((actual as number) > expected)) fail(`esperado > ${expected}, recebido ${show(actual)}`);
    },
    toBeGreaterThanOrEqual(expected: number) {
      if (!((actual as number) >= expected)) fail(`esperado ≥ ${expected}, recebido ${show(actual)}`);
    },
    toBeLessThan(expected: number) {
      if (!((actual as number) < expected)) fail(`esperado < ${expected}, recebido ${show(actual)}`);
    },
    toBeTruthy() {
      if (!actual) fail(`esperado valor verdadeiro, recebido ${show(actual)}`);
    },
    toBeFalsy() {
      if (actual) fail(`esperado valor falso, recebido ${show(actual)}`);
    },
    toBeNull() {
      if (actual !== null) fail(`esperado null, recebido ${show(actual)}`);
    },
    toContain(item: unknown) {
      const ok = typeof actual === 'string' ? actual.includes(String(item)) : Array.isArray(actual) && actual.includes(item);
      if (!ok) fail(`esperado conter ${show(item)}, recebido ${show(actual)}`);
    },
    toHaveLength(n: number) {
      const len = (actual as { length?: number })?.length;
      if (len !== n) fail(`esperado tamanho ${n}, recebido ${show(len)}`);
    },
    toThrow() {
      if (typeof actual !== 'function') fail('toThrow espera uma função');
      let threw = false;
      try {
        (actual as () => void)();
      } catch {
        threw = true;
      }
      if (!threw) fail('esperado que a função lançasse um erro');
    },
  };
  return api;
}

export function runAll(): TestResult[] {
  return cases.map((c) => {
    const start = performance.now();
    try {
      c.fn();
      return { suite: c.suite, name: c.name, passed: true, ms: performance.now() - start };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { suite: c.suite, name: c.name, passed: false, error: message, ms: performance.now() - start };
    }
  });
}
