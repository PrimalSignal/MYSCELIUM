# Diagnóstico v0.5.8 - Travadas e clicks no Chrome Android

**Versão atual:** v0.5.7
**Problema reportado:** leve travada no som e clicks esporádicos no Chrome Android
**Dados do HUD (celular):** DSP worklet, pico ~-3 dB, latência 43 ms, relógio +26 ms (meta 15, limite 30), visual leve ativo

---

## H1: Underruns do worklet por carga na thread principal

### Trechos suspeitos
- **app.js:141** - `latencyHint: "interactive"` no AudioContext (folga de buffer configurada, mas não ajustável)
- **app.js:262** - `setInterval(relogio, 25)` - relógio na thread principal, sem Worker
- **app.js:245-247** - agendador com janela de apenas 120ms (`prox < ctx.currentTime + .12`)
- **app.js:312-329** - interações de pointer no canvas podem bloquear a thread principal
- **app.js:402-408** - HUD atualiza a cada 500ms, mas não há medição de underruns do worklet

### Diagnóstico
O relógio roda na thread principal com `setInterval` 25ms, o que sofre com GC, canvas e outras tarefas. A janela de agendamento (120ms) é curta para BPM alto (200 BPM = 7.5ms por semicolcheia). Não há Worker para o agendador. O modo "visual leve" existe (LQ), mas não há medição de custo do canvas nem do worklet.

### Plano de ação
1. Adicionar contadores de underruns/glitches no worklet (detectar lacunas entre currentTime esperado e real)
2. Medir tempo de process() do worklet (pior e média)
3. Expor latencyHint configurável no ?diag
4. Considerar mover o relógio para um Worker (se possível sem dependências externas)
5. Melhorar o modo visual leve: reduzir taxa de canvas, pausar com aba oculta, evitar alocações no loop de desenho

---

## H2: Descontinuidades no próprio DSP

### Trechos suspeitos
- **app.js:171** - `dispEnv` usa `setValueAtTime` e `linearRampToValueAtTime` - não há suavização em mudanças de parâmetros durante o envelope
- **app.js:156-158** - `wp()` (aplica parâmetros) faz atribuição direta `p.value=v` - sem rampa em mudanças de cutoff, drive, fold, bias, etc.
- **app.js:198** - `reiniciaLfo` cria novo oscilador e para o antigo no mesmo instante `t` - degrau garantido se a fase não coincidir
- **app.js:202, 213, 222, 230** - envelopes de kick, baixo, FM e chapéu usam `exponentialRampToValueAtTime` para ganho, mas não há fade de voice stealing
- **app.js:205-206** - mudanças de ganho de bass e FM no kick não têm rampa
- **app.js:214-215** - envelope de cutoff do ladder não tem suavização em mudanças de parâmetros durante a nota
- **app.js:106** - `resetar()` não faz fade ao parar as vozes, só desconecta
- **dsp-worklet.js:4-6** - ladder e fold não têm proteção contra denormals nos estados internos

### Diagnóstico
**Envelope sem suavização de parâmetros:** `wp()` atribui parâmetros diretamente, sem rampa. Se o usuário mexer em cutoff, drive, etc. durante a reprodução, causa degrau.

**Voice stealing:** Não há fade ao limitar vozes (kick < 70, bass < 70, fm > 40, hat > 56). Quando o limite é atingido, novas notas simplesmente não tocam, mas não há fade nas notas que terminam.

**Reinício do LFO:** `reiniciaLfo` cria novo oscilador e para o antigo no mesmo instante. Se o valor do antigo não for próximo de zero, há degrau.

**Mudança de preset/BPM:** `resetar()` desconecta tudo sem fade. Mudança de BPM afeta envelopes e LFOs em tempo real sem rampa.

**DC e denormals:** O ladder e fold têm filtro de DC, mas não há flush-to-zero manual nos estados de filtro.

### Plano de ação
1. Implementar suavização (rampa 3-10ms) para toda mudança de parâmetro de áudio no worklet (via AudioParam do worklet ou no código nativo)
2. Envelopes: retrigger deve partir do valor atual, não de zero
3. Envelopes: release com piso de rampa (2-5ms) para evitar corte brusco
4. Voice stealing e fim de nota com fade curto (5-10ms)
5. Reinício do LFO: se a fase atual for diferente de zero, fazer crossfade ou reiniciar na passagem por zero
6. Troca de preset e mudança de BPM com rampa de parâmetros e flush controlado
7. Proteção contra denormals nos filtros do worklet (offset minúsculo ou flush-to-zero manual)
8. Proteção final no master: limitador/soft-clip simples + DC blocker (já existe limiter, verificar se suficiente)

---

## H3: Agendador/relógio com jitter

### Trechos suspeitos
- **app.js:245-247** - `prox` avança com `prox += sd` (semicolcheia), janela de 120ms
- **app.js:262** - `setInterval(relogio, 25)` - timer fixo, sem ajuste dinâmico
- **app.js:246** - `if(prox < ctx.currentTime - .05) prox = ctx.currentTime + .05` - recuperação após atraso excessivo, mas não previne jitter

### Diagnóstico
O relógio usa timer de 25ms com janela de agendamento de 120ms. Para 200 BPM (7.5ms por semicolcheia), a janela cobre 16 semicolcheias, o que é suficiente teoricamente. No entanto, o timer está na thread principal e pode sofrer com GC e canvas. Não há medição de jitter.

### Plano de ação
1. Aumentar lookahead (ex.: 100-150ms de janela, timer 25-50ms)
2. Medir e reportar jitter máximo (diferença entre tempo esperado e atual de cada tick)
3. Considerar Worker para o relógio (se possível sem dependências externas)
4. Ajustar timer dinamicamente baseado no jitter medido

---

## H4: Ladder do worklet diferente do nativo

### Trechos suspeitos
- **dsp-worklet.js:1-7** - ladder worklet: 4 polos com tanh, drive
- **app.js:125** - ladder nativo: 2 biquads lowpass em cascata, sem drive
- **app.js:156** - `wp(M.ladder,"drive",1+P("ladder","drive")*8)` - drive aplicado no worklet, mas não existe no nativo
- **tests/worklet.test.js:80-88** - teste compara worklet com nativo, mas há diferenença de até 2 dB aceita

### Diagnóstico
O ladder do worklet é um filtro de 4 polos não-linear com tanh e drive. O nativo é 2 biquads lowpass linear. São implementações fundamentalmente diferentes. O teste já aceita diferença de até 2 dB, o que indica que não são equivalentes. O drive do worklet pode causar saturação/instabilidade em ressonância alta.

### Plano de ação
1. Comparar resposta em frequência, ressonância e nível de saída com testes offline
2. Se divergirem, recalibrar o worklet para ficar mais próximo do nativo:
   - Limitar ressonância perto da auto-oscilação
   - Ajustar ganho de saída para equivaler ao nativo
   - Verificar estabilidade numérica em ressonância alta
3. Documentar os valores alterados e por quê
4. O som do grave deve ficar limpo e sem chiado

---

## H5: Desempenho geral

### Trechos suspeitos
- **dsp-worklet.js:4-6** - ladder: `g = 1 - Math.exp(-6.2832 * fc / sampleRate)` calculado por amostra
- **dsp-worklet.js:6** - `T(d * x[n] - 4 * r * s[3])` - Math.tanh por amostra no ladder
- **dsp-worklet.js:12** - fold: `Math.sin(x[n] * F * 1.5708 + B)` - Math.sin por amostra
- **app.js:378-400** - dist/ptr/bins/pb são criados no escopo, mas reutilizados
- **app.js:331-397** - loop de desenho pode criar objetos (rgba, tri)
- **dsp-worklet.js:3,9** - estados `s[0-3]` e `dx/dy` não têm proteção contra denormals

### Diagnóstico
**Worklet:** O cálculo de `g` e o `Math.tanh` são por amostra, mas o Vite já otimiza isso. Não há alocação no laço (confirmado no teste). No entanto, não há proteção explícita contra denormals nos estados de filtro.

**Canvas:** `rgba()` cria objeto string por chamada. `tri()` define função. O loop de desenho pode ter alocações.

**Custo por voz:** Não há medição de tempo por bloco no worklet.

### Plano de ação
1. Verificar se há alocações no loop de desenho (canvas) e otimizar
2. Adicionar proteção contra denormals nos estados de filtro do worklet (offset minúsculo ou flush-to-zero)
3. Reduzir custo por voz se possível (usar pré-cálculo por bloco em vez de por amostra onde der)
4. Medir tempo de process() do worklet no pior caso (todas as vozes + LFOs) em testes offline
5. Garantir que o modo visual leve realmente poupa CPU (reduzir taxa de canvas, desligar efeitos caros)

---

## Ordem de prioridade das correções

1. **H2 (primeiro)** - Determinístico, pode ser verificado offline com testes
2. **H4** - Comparação do ladder com referência, ajuste se necessário
3. **H5** - Otimizações de performance e proteção contra denormals
4. **H3** - Ajuste do agendador e medição de jitter
5. **H1** - Ferramentas de medição e ajuste de buffer/thread principal

---

## Ferramentas de medição a implementar

1. **HUD expandido (modo ?diag):**
   - Underruns/glitches do worklet (contados pelo processor)
   - Pior tempo de process() em µs e média
   - Pico de fps mínimo dos últimos 10s
   - Jitter máximo do relógio
   - Contagem de clicks detectados
   - Latência real (baseLatency + outputLatency)
   - Log exportável em texto

2. **Detector de click no worklet:**
   - Detectar quando |y[n] - y[n-1]| > limiar configurável
   - Reportar contagem e instante (compasso/passo do sequenciador)
   - Diferenciar clicks determinísticos (sempre no mesmo ponto) de aleatórios (underrun)

3. **Testes automatizados:**
   - Renderização offline sem clicks (30s simulados)
   - Eventos críticos sem degrau (retrigger, voice stealing, reinício LFO, troca preset, mudança BPM/cutoff)
   - Estabilidade do ladder (sem NaN, Infinity, DC acumulado)
   - Pico do master abaixo de -1 dBFS
   - Equivalência aproximada do ladder (worklet vs nativo)
   - Orçamento de CPU (tempo por bloco no pior caso)
