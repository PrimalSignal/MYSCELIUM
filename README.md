# Micélio

Sintetizador modular experimental (darkpsy e psycore) para celular Android: floresta bioluminescente, módulos que são plantas, cabos que são cipós. Feito só pelo celular, sem bibliotecas externas e sem rede.

Versão atual: **v0.5.7** (Etapa B, infraestrutura). O histórico por versão está no topo do `app.js` (CHANGELOG).

## Como abrir

- **Pelo endereço do GitHub Pages (https):** o AudioWorklet carrega de `dsp-worklet.js` e o HUD mostra **DSP worklet**. É o modo de qualidade.
- **`?nativo` no fim do endereço** força o modo nativo (sem worklet), para comparar o som dos dois modos.
- **Arquivo único** (`dist/micelio-single.html`, gerado por `node tools/build.js`): abre direto no Chrome do Android por `content://` e roda no preview do chat. Nesses casos o AudioWorklet é bloqueado e o HUD mostra **DSP nativo**.

O `localStorage` é por origem: o patch salvo em `content://` não aparece no endereço https. Para trazer o preset de fábrica num endereço novo, segure o botão **padrão** por 0,7 s.

## Arquivos

| Arquivo | Para quê |
| --- | --- |
| `index.html` | casca da página (canvas, painel, HUD) |
| `style.css` | estilos |
| `app.js` | o app inteiro (módulos, cabos, relógio, sequenciador, painel, desenho) e o CHANGELOG |
| `dsp-worklet.js` | processadores de áudio: `ladder`, `fold`, `crush` |
| `tools/build.js` | junta tudo num HTML único (`dist/micelio-single.html`) |
| `tests/logica.test.js` | lógica pura, simulação do app com DOM e áudio de mentira, migração de saves, caminho de carga do worklet |
| `tests/worklet.test.js` | processadores do worklet em Node (estabilidade, limites, DC, nível contra o modo nativo) |
| `tests/roteiro-manual.md` | roteiro de 10 minutos no aparelho |
| `.github/workflows/ci.yml` | roda o build e os testes a cada envio |

## Rodar os testes (precisa de Node 18 ou mais novo)

```
node tools/build.js
node tests/logica.test.js dist/micelio-single.html
node tests/worklet.test.js
```

Para comparar com uma versão anterior (saves e preset de fábrica), passe o HTML antigo como segundo argumento de `logica.test.js`.

## Regras do projeto

- Ids de módulos, chaves de salvamento (`micelio42`) e formato do patch são preservados. Se o formato mudar, usa-se uma chave nova e a anterior é lida e migrada.
- Lógica pura fica entre `/*PURO*/` e `/*FIMPURO*/` em `app.js` e é testada em Node.
- Medidas de áudio feitas fora do aparelho são estruturais; volume, pico e timbre só o aparelho confirma.
