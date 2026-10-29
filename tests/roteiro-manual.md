# Roteiro manual de teste (15 minutos, no aparelho)

Anote: **modelo do celular, versão do Android, versão do Chrome, versão do Micélio (título da aba) e o endereço usado.**
Mande um print do HUD (fps, pico, latência, vozes, relógio, estado do DSP) no começo, no meio e no fim.

## 0. Abertura
1. Abra o endereço https do GitHub Pages no Chrome.
2. O HUD precisa mostrar **DSP worklet** depois de tocar ▶. Se mostrar **DSP nativo**, anote o texto entre parênteses (ele diz o motivo).
3. Segure **padrão** por 0,7 s ("preset darkpsy restaurado") para começar do preset de fábrica.

## 1. Som (ouvir com fone e depois sem)
1. Toque ▶ por 1 minuto no preset de fábrica. Anote: grave forte e limpo? Algum chiado contínuo? Estalos? Algo estourando?
2. Abra o mesmo endereço com `?nativo` no fim e compare o grave (ladder) e o dobrador. Anote qual soa mais alto e qual soa melhor.
3. Mexa em corte, reso e drive do ladder, dobra e bias do dobrador, esmaga e taxa do musgo. Anote o que soa errado.

## 2. Diagnóstico avançado (modo ?diag)
1. Abra o endereço com `?diag` no fim (ex.: https://primalsignal.github.io/MYSCELIUM/?diag).
2. O HUD expandido mostra: underruns/glitches, pior tempo de process() do worklet (µs), fps mínimo dos últimos 10s, jitter máximo do relógio, contagem de clicks detectados, latência real.
3. Segure "padrão" por 0,7 s e toque ▶ por 10 minutos.
4. Anote os valores finais e clique no botão de exportar log (ou copie o texto do log).
5. Repita em `?nativo?diag` para comparar os dois modos DSP.

## 3. Cabos
1. Crie e corte um cabo de **áudio** (● → ○), um de **CV** (● ou ■ → ◇ no topo) e um de **gate** (▶ → ▷ à esquerda).
2. Tente criar um laço fechado de áudio e de gate: deve aparecer o aviso e não criar.
3. Patch de gate com duração: `clk ÷2 → Folha-duração → ENV 1` (ENV 1 em modo gate) e `ENV 1 → ◇ do VCA`, com `FM → VCA → Coração`. O FM deve abrir e fechar pelo comprimento do gate.

## 4. Sequenciador
1. Edite passos nas 4 páginas (1–8, 9–16, 17–24, 25–32). O contorno ciano deve seguir o cursor da página certa.
2. Mude comprimento (comp k, b, h) e direção (dir k, b, h). Confira o apagado dos passos fora do comprimento.
3. Ligue o acento ▲ em alguns passos do baixo.

## 5. Mundo e interface
1. Arraste o fundo para andar pelo mundo e volte. Selecione módulos tocando neles.
2. Confira que dá para tocar em cada botão sem acertar o vizinho (passos, opções, pânico, padrão).
3. Aperte **pânico**: silêncio. Toque ▶ de novo e o som volta.

## 6. Salvar e recarregar
1. Mude alguns parâmetros e um cabo. Feche a aba e abra de novo no mesmo endereço: tudo deve voltar.
2. Toque curto em **padrão** restaura os cabos e mantém os parâmetros. Toque longo restaura o preset completo.

## 7. Resistência
1. Toque 10 minutos. No final, o HUD deve mostrar: fps ≥ 50, pico abaixo de 0 dB, relógio abaixo de 30 ms, vozes estáveis (sem crescer).
2. Mande a tela do celular apagar e volte: o som pode parar (limitação conhecida); anote o que acontece.

## Metas
| Medida | Meta | Limite aceitável |
| --- | --- | --- |
| fps | 60 | 45 |
| Pico de saída | abaixo de −1 dB | abaixo de 0 dB |
| Atraso do relógio | menos de 15 ms | menos de 30 ms |
| Latência de saída | menos de 45 ms | menos de 60 ms |
| Estalos | nenhum em 1 hora | nenhum em 10 minutos |
