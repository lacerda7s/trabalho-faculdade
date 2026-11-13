/*
 * Mini carregador de módulos (sem etapa de build).
 *
 * 1. Busca os arquivos .ts/.tsx via fetch.
 * 2. Transpila cada um com o Babel (presets TypeScript + React) para CommonJS.
 * 3. Descobre as dependências (require("./x")) e carrega o grafo inteiro.
 * 4. Executa os módulos de forma síncrona, com um `require` próprio.
 *
 * Observação: o Babel apenas remove os tipos; ele NÃO faz checagem de tipos.
 * Com Node instalado, `npx tsc --noEmit` usa o tsconfig.json do projeto para isso.
 */
(function () {
  'use strict';

  var EXTERNALS = {
    react: function () { return window.React; },
    'react-dom': function () { return window.ReactDOM; },
    'react-dom/client': function () { return window.ReactDOM; },
  };

  var pending = {};   // caminho base -> Promise<registro>
  var registry = {};  // caminho base -> { path, code, deps }
  var instances = {}; // caminho base -> module

  function dirname(p) {
    var i = p.lastIndexOf('/');
    return i < 0 ? '' : p.slice(0, i);
  }

  function join(base, spec) {
    var parts = base ? base.split('/') : [];
    spec.split('/').forEach(function (seg) {
      if (seg === '.' || seg === '') return;
      if (seg === '..') parts.pop();
      else parts.push(seg);
    });
    return parts.join('/');
  }

  function candidatesFor(base) {
    if (/\.(tsx?|js)$/.test(base)) return [base];
    var tsxFirst = /(components|screens|render\/react)\//.test(base) || /(main|App)$/.test(base);
    return tsxFirst ? [base + '.tsx', base + '.ts'] : [base + '.ts', base + '.tsx'];
  }

  async function fetchSource(base) {
    var list = candidatesFor(base);
    // Versão empacotada (dist/): os fontes já vêm embutidos na página.
    var bundled = window.__SOURCES__;
    if (bundled) {
      for (var j = 0; j < list.length; j++) {
        if (Object.prototype.hasOwnProperty.call(bundled, list[j])) return { path: list[j], src: bundled[list[j]] };
      }
    }
    for (var i = 0; i < list.length; i++) {
      var res = await fetch(list[i], { cache: 'no-cache' });
      if (res.ok) return { path: list[i], src: await res.text() };
    }
    throw new Error('Módulo não encontrado: ' + base + ' (tentado: ' + list.join(', ') + ')');
  }

  function transpile(path, src) {
    return window.Babel.transform(src, {
      filename: path,
      sourceType: 'module',
      presets: [
        ['typescript', { isTSX: path.endsWith('.tsx'), allExtensions: true }],
        ['react', { runtime: 'classic' }],
      ],
      plugins: ['transform-modules-commonjs'],
    }).code;
  }

  function loadModule(base) {
    if (pending[base]) return pending[base];
    pending[base] = (async function () {
      var found = await fetchSource(base);
      var code;
      try {
        code = transpile(found.path, found.src);
      } catch (err) {
        throw new Error('Erro de sintaxe em ' + found.path + ':\n' + err.message);
      }
      var deps = {};
      var jobs = [];
      var re = /require\((["'])([^"']+)\1\)/g;
      var m;
      while ((m = re.exec(code))) {
        var spec = m[2];
        if (EXTERNALS[spec] || deps[spec]) continue;
        var resolved = join(dirname(found.path), spec);
        deps[spec] = resolved;
        jobs.push(loadModule(resolved));
      }
      registry[base] = { path: found.path, code: code, deps: deps };
      await Promise.all(jobs);
      return registry[base];
    })();
    return pending[base];
  }

  function execute(base) {
    if (instances[base]) return instances[base].exports;
    var rec = registry[base];
    if (!rec) throw new Error('Módulo não carregado: ' + base);
    var module = { exports: {} };
    instances[base] = module;
    var localRequire = function (spec) {
      if (EXTERNALS[spec]) return EXTERNALS[spec]();
      return execute(rec.deps[spec]);
    };
    var fn = new Function('require', 'module', 'exports', rec.code + '\n//# sourceURL=' + location.origin + '/' + rec.path);
    fn(localRequire, module, module.exports);
    return module.exports;
  }

  function showError(err) {
    console.error(err);
    var box = document.getElementById('boot-error');
    if (!box) return;
    box.hidden = false;
    var pre = box.querySelector('pre');
    if (pre) pre.textContent = String(err && err.message ? err.message : err);
    var spinner = document.getElementById('boot-loading');
    if (spinner) spinner.hidden = true;
  }

  async function start(entry) {
    if (location.protocol === 'file:' && !window.__SOURCES__) {
      showError(new Error(
        'Este projeto precisa ser aberto por um servidor local (o navegador bloqueia fetch em file://).\n\n' +
        'Dê dois cliques em "iniciar.bat" ou rode, nesta pasta:\n  python -m http.server 5173\n' +
        'e abra http://localhost:5173'
      ));
      return;
    }
    try {
      if (!window.React || !window.ReactDOM || !window.Babel) {
        throw new Error('Não foi possível carregar React/Babel da CDN. Verifique sua conexão com a internet.');
      }
      await loadModule(entry);
      execute(entry);
      var spinner = document.getElementById('boot-loading');
      if (spinner) spinner.hidden = true;
    } catch (err) {
      showError(err);
    }
  }

  window.ModuleLoader = { start: start };
  var script = document.currentScript;
  var entry = script && script.getAttribute('data-entry');
  if (entry) window.addEventListener('DOMContentLoaded', function () { start(entry); });
})();
