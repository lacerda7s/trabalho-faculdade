# Simulador de Canhão: Engenharia e Leis de Newton

Jogo educativo em React + TypeScript + Canvas que une lançamento de projéteis, as três leis de Newton e boas práticas de engenharia de software.

## Como rodar

Não precisa instalar Node. Só Python (já instalado) e internet (React e Babel vêm de CDN).

- Dê dois cliques em `iniciar.bat`, **ou**
- nesta pasta: `python -m http.server 5173` e abra http://localhost:5173

Testes automatizados: http://localhost:5173/test.html

> Abrir o `index.html` direto (file://) não funciona: o navegador bloqueia o carregamento dos módulos.

## Como funciona sem build

`loader.js` busca cada arquivo `.ts/.tsx`, transpila com o Babel no navegador (remove os tipos e converte JSX) e resolve os `import` entre módulos. O Babel **não checa tipos**; com Node instalado, `npx tsc --noEmit` usa o `tsconfig.json` para isso.

## Estrutura

```
src/
  core/        regra de negócio — TypeScript puro, sem React/DOM
    types.ts               tipos compartilhados
    PhysicsEngine.ts       forças, integração (Euler semi-implícito), recuo
    Simulation.ts          voo passo a passo + colisões + amostras
    TrajectoryCalculator.ts previsão e fórmulas analíticas
    CollisionDetector.ts   círculo × retângulo, alvo, solo, limites
    WindSystem.ts          força do vento e sorteio por disparo
    ScoreSystem.ts         pontuação, precisão, estrelas
    LevelManager.ts        7 níveis (dados) + laboratório + regras de conclusão
    GameStateManager.ts    máquina de estados (reducer puro)
    Terrain.ts · Cannon.ts · Projectile.ts · validation.ts · education.ts
  render/      desenho no Canvas (Cannon, Projectile, Target, Terrain, vetores, efeitos)
  components/  telas e painéis React (GameScreen, GameControls, EducationPanel…)
tests/         testes (física, colisões, pontuação, estados, validação, níveis)
```

## Modelo físico

- Disparo: a pólvora aplica a força F por 0,01 s → a = F/m, v₀ = a·0,01 s (2ª lei).
- Voo: gravidade (m·g), vento (força horizontal proporcional à área) e arrasto quadrático (−½·ρ·Cd·A·|v|·v), passo fixo de 1/120 s.
- Recuo: conservação do momento horizontal, m·v₀·cosθ = M·V, freado por atrito de rolamento (3ª lei).
- Quique: restituição na direção normal do terreno, atrito na tangencial.

## Criar um nível novo

Adicione um objeto `LevelConfig` em `LEVELS` (`src/core/LevelManager.ts`). O teste "nível N tem solução" verifica automaticamente se ele pode ser vencido.
