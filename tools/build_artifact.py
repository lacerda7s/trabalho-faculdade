"""
Empacota o simulador em páginas autocontidas (dist/), sem servidor:
  dist/simulador.html  -> o jogo (CSS, loader e fontes .ts/.tsx embutidos)
  dist/test.html       -> a página de testes

Uso:  python tools/build_artifact.py
"""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"

CDN = [
    "https://unpkg.com/react@18.3.1/umd/react.production.min.js",
    "https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js",
    "https://unpkg.com/@babel/standalone@7.24.7/babel.min.js",
]
FONTS = (
    "https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800"
    "&family=Nunito:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap"
)


def read(rel: str) -> str:
    return (ROOT / rel).read_text(encoding="utf-8")


def collect(*dirs: str) -> dict:
    out = {}
    for d in dirs:
        for f in sorted((ROOT / d).rglob("*")):
            if f.suffix in (".ts", ".tsx"):
                out[f.relative_to(ROOT).as_posix()] = f.read_text(encoding="utf-8")
    return out


def script_safe(text: str) -> str:
    return text.replace("</", "<\\/")


def scripts(entry: str, sources: dict) -> str:
    tags = [f'<script src="{u}"></script>' for u in CDN]
    tags.append(f"<script>window.__SOURCES__ = {script_safe(json.dumps(sources, ensure_ascii=False))};</script>")
    tags.append(f'<script data-entry="{entry}">\n{script_safe(read("loader.js"))}\n</script>')
    return "\n".join(tags)


BOOT = """<div id="boot-loading" class="boot"><div class="boot-spinner"></div><p>Carregando o laboratório…</p></div>
<div id="boot-error" class="boot boot-error" hidden><h2>Não foi possível iniciar o simulador</h2><pre></pre></div>"""


def build_game() -> str:
    # Sem <html>/<head>/<body>: a hospedagem do Artifact adiciona o esqueleto.
    return f"""<title>Simulador de Canhão</title>
<meta name="description" content="Jogo educativo: Engenharia de Software e Leis de Newton com um canhão." />
<link rel="stylesheet" href="{FONTS}" />
<style>
{read("styles.css")}
</style>
<div id="root"></div>
{BOOT}
{scripts("src/main", collect("src"))}
"""


def build_tests() -> str:
    return f"""<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Testes do Simulador</title>
<link rel="stylesheet" href="{FONTS}" />
<style>
{read("styles.css")}
</style>
</head>
<body class="test-page">
<main id="test-root" class="test-root"><h1>Testes automatizados</h1><p class="muted">Executando…</p></main>
{BOOT}
{scripts("tests/run", collect("src", "tests"))}
</body>
</html>
"""


def main() -> None:
    DIST.mkdir(exist_ok=True)
    (DIST / "simulador.html").write_text(build_game(), encoding="utf-8")
    tests = build_tests().replace('href="index.html"', 'href="./"')
    (DIST / "test.html").write_text(tests, encoding="utf-8")
    for f in ("simulador.html", "test.html"):
        print(f"dist/{f}: {(DIST / f).stat().st_size / 1024:.0f} KB")


if __name__ == "__main__":
    main()
