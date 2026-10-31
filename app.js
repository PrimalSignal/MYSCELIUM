"use strict";
/* CHANGELOG
v0.7.8 (CI): o workflow roda também tests/worklet.test.js, que a v0.7.6 deixou vermelho por dois motivos de teste, não de som: (1) o teste do dobrador comparava com a curva do seno sem considerar o atraso de 17 amostras da sobreamostragem; (2) a heurística de alocação lê o arquivo a partir do primeiro process( e pegou a tabela do FIR (arrow function e .map no nível do módulo), que agora fica no topo do dsp-worklet.js. O som é idêntico ao da v0.7.7. Novo: tools/verifica.js roda local exatamente os passos do CI (sintaxe, build, os dois arquivos de teste) e diz se pode publicar.
v0.7.7 (ligações legíveis): tocar numa saída, numa entrada (● áudio, ◇ CV, ▷ gate) ou no ponto de um cipó destaca tudo que combina com ela: anéis que piscam suave (parados se o sistema pede menos movimento), com o tipo da porta escrito, e uma seta na borda quando o destino está fora da tela, onde o toque continua valendo depois de arrastar o fundo. Toque numa que pisca liga (modo toque, sem arrastar); arrastar de uma saída continua igual, mas agora mostra os destinos durante o arrasto. O ponto do cipó agora seleciona no primeiro toque (vira ✕) e corta no segundo. As regras do que pode ligar ficaram numa função só (motivoNao), a mesma que conecta usa, então o destaque nunca mente. Som, preset e saves inalterados.
v0.7.6 (DSP do worklet, só no modo worklet; o nativo não muda): (1) o ladder limita a ressonância em 1,08 (acima de ~1,12 ele virava um tom permanente a cerca de −25 dBFS, que nascia até do silêncio, nos últimos ~4% do slider "reso"); (2) o volume de saída do ladder passa a ser normalizado pelo drive em torno do drive do preset (4,6 = 1+0,45×8), então o drive mexe no timbre sem variar ~16 dB de volume (−24 a −8 dBFS com sinal de baixo); no preset a saída é idêntica à da v0.7.5, amostra por amostra; (3) o dobrador roda sobreamostrado 4× (FIR de fase linear, atraso de 17 amostras = 0,35 ms, ganho plano até 18 kHz): o aliasing audível (<16 kHz) com sinal forte e agudo cai de −1…−50 dB para −55…−117 dB da energia, ao custo de ~4× a CPU do dobrador (medido offline: 1,2% → 4,5% de um núcleo). Atenção: medido offline, não ouvido; o volume do ladder fora do preset muda de propósito (drive baixo fica mais alto, drive alto mais baixo).
v0.7.5 (menu, visual): com o menu recolhido a floresta passa a ocupar a tela toda: a altura útil (FH) cresce com suavização de H*0,54 até H−88, então módulos, cipós, caules e partículas do espectro se espalham pelo espaço liberado (os caules nascem rente à faixa); expandido, tudo volta exatamente à posição de antes. Só visual; som, preset e saves inalterados.
v0.7.4 (menu): o painel do módulo ganha um botão ▾/▴ no cabeçalho (ou toque no cabeçalho) que recolhe tudo numa faixa fina com o nome do módulo e libera o canvas; o estado fica em localStorage (micelio_menu) e não entra no save do preset (micelio42). Som, preset e saves inalterados.
v0.7.3 (hats): o painel dos Esporos ganha swing (atraso dos passos ímpares só nos hats, 0–100% = de reto até swing de 75%, independente do swing do Pulsar-mãe), síncopa (chance de empurrar o hat meio passo para trás), humano (variação aleatória de tempo e de volume), tom (corte do passa-altas, 3–16 kHz) e metal (ressonância do filtro, com ganho compensado). Todos os padrões reproduzem o som da v0.7.2: swing, síncopa e humano em 0 (sem consumir sorteios), tom 0,5 = 7 kHz e metal 0,3 = Q 1. Saves antigos ganham os padrões ao carregar.
v0.7.2 (só tipografia): a fonte padrão de toda a interface (painel, barra do topo, HUD, instruções e rótulos do canvas) passa a ser a Syne, sem itálico (a Syne não tem; font-synthesis desligado para não gerar oblíquo falso). Carrega de syne.woff na mesma pasta (funciona offline; tools/build.js embute o arquivo no HTML único) e, se esse arquivo não existir, do Google Fonts (index.html); sem nenhum dos dois cai em system-ui.
v0.7.1: corrige a v0.7.0 (3 testes do painel falhavam): as abas de página voltam a ter className exato "opt" (o estilo de aba agora vem de data-pg) e o teste do Raiz-baixo aceita o rótulo do slider sem o valor colado (o valor agora é um elemento à parte). Sem mudança visual nem de som.
v0.7.0 (só visual do painel de opções, sem mudança de som nem de dados): o painel herda a cor do módulo (variável CSS --c, via m.cor); sliders viram fio fino com nó e valor em mono à direita (sem valor formatado mostra 0–100); botões de opção viram pílulas, células dos passos ganham cantos de folha e brilho na cor do módulo (acabou o amarelo único); cada linha de passos tem rótulo (kick, baixo, oitava, chapéu, acento); abas de página mais discretas; fundo do painel translúcido com desfoque. Mesmos nomes de classe e mesmos handlers da v0.6.1.
v0.6.1: o painel do Raiz-baixo agora também edita as notas do baixo (nome da nota, oitava e acento por passo, páginas, raiz, escala, comprimento e direção da trilha do baixo), sem precisar abrir o Tronco-relógio; mesmo dado, mesmas teclas.
v0.6.0 (controle de notas, sem mudança de som no preset): (1) cada passo do baixo agora tem nota (grau da escala escolhida, mostrado como nome da nota, por exemplo E2) e oitava própria (nova linha "oitava", de −1 a +2); o salto de oitava que era automático a cada 8º passo virou dado por passo e saves antigos ganham os mesmos saltos ao carregar (normS), então o som do preset não muda. (2) o Tronco-relógio ganha "escala" (frígia, menor, pentat., cromática): em cromática cada passo é um semitom; graus além do tamanho da escala sobem uma oitava. (3) o slider raiz mostra o nome da nota. (4) Samambaia-FM ganha "notas" (sorteio, como antes, ou segue baixo, 2 oitavas acima da última nota do baixo) e "transp" (−24 a +24 semitones). O sorteio do FM passa a usar a escala escolhida. Salvamento: mesma chave micelio42 (compatível nos dois sentidos: a v0.5.9 ignora os campos novos; parâmetros novos ficam nos padrões se o save não os tiver). Lógica pura nova: nota.
v0.5.9 (corrige a H2 da v0.5.8; ?diag): (1) o reinício do LFO por gate usava o ganho de profundidade (m.o.gain) como fade e depois o forçava a 1 num setTimeout: o LFO sumia por ~0,1 s e a profundidade do patch era ignorada; agora cada oscilador tem o próprio ganho de crossfade e m.o.gain fica só com a profundidade. (2) dispEnv chamava valueAtTime, que não existe em AudioParam; agora usa cancelAndHoldAtTime (com reserva para navegadores sem ele). (3) a queda do kick volta a ser exponencial (a v0.5.8 a trocou por linear sem avisar) e termina em zero. (4) o sidechain do baixo e do FM desce em 4 ms em vez de dar degrau. (5) chapéu e FM terminam em zero (o chapéu era cortado em 0,3 s com queda longa). (6) janela de agendamento do relógio de 120 para 180 ms (aguenta travadas de até ~150 ms na thread principal). (7) worklet: valores de parâmetro constantes agora são suavizados em 5 ms dentro do processador (antes atribuir param.value era um degrau) e estados são zerados quando ficam minúsculos (denormais). (8) lista de eventos visuais limitada. (9) ?diag no fim do endereço mostra no HUD estouros do relógio, atraso de pico, vozes de pico e tamanho da fila. Preset, parâmetros, cabos e salvamento (micelio42) inalterados.
v0.5.8 (H2: descontinuidades de DSP): envelopes agora partem do valor atual no retrigger (evitam degrau), release com piso de rampa de 5ms (corte mais suave), voice stealing e fim de nota com fade de 10ms (sem corte brusco), reinício do LFO por gate agora faz crossfade de 3ms (evita salto se fase não for zero), mudanças de parâmetros de áudio (ganho, cutoff, drive, fold, bias, esmaga, taxa) têm suavização automática de 5ms no modo nativo (worklet já usa AudioParam com rampa implícita), troca de preset e mudança de BPM agora aplicam rampa de parâmetros (sem degrau), resetar() faz fade de 10ms ao parar as vozes. Proteção contra denormals nos filtros do worklet (offset de 1e-18 nos estados). Diagnóstico detalhado em docs/diagnostico-v0.5.8.md.
v0.5.7 (Etapa B, infraestrutura): o app agora é um repositório com index.html, style.css, app.js e dsp-worklet.js; o AudioWorklet carrega de arquivo (addModule("dsp-worklet.js"), exige https ou localhost, como o GitHub Pages). Se o arquivo falhar, o app cai no modo nativo e o HUD mostra o motivo; abrir com ?nativo no fim do endereço força o modo nativo (para comparar o som dos dois). tools/build.js monta o arquivo único (worklet embutido) para teste offline e para abrir direto no Chrome do Android por content://; os testes rodam nesse arquivo. Modo nativo, interface, preset e salvamento (micelio42) inalterados. Mudança de som só no modo worklet, que ainda não tinha rodado no aparelho: medido offline, o ladder do worklet saía ~8 dB mais alto que o nativo e com DC (~0,1), e o dobrador com bias tinha DC (~0,1) até em silêncio; agora ladder e dobrador têm filtro de DC (passa-altas de 8 Hz) e o ladder tem ganho de saída ×0,38, que iguala o RMS ao do nativo no preset (diferença < 0,5 dB, só no modelo offline, não ouvido); atenção: o localStorage é por origem, então o save de content:// não aparece no endereço https. Para trazer o preset de fábrica no endereço novo, segure "padrão" por 0,7 s. Pendência: o ladder do worklet (4 polos com tanh e drive) é outro filtro que o nativo (2 biquads, sem drive): o timbre difere mesmo com o nível igualado e precisa ser ouvido e recalibrado no aparelho (Etapa B, aceite).
v0.5.6 (Etapa A, alvos de toque e limpeza, sem mudança de som): a grade de passos do Tronco-relógio agora tem 4 páginas de 8 passos (1–8, 9–16, 17–24, 25–32) com botões de 44 px de altura e cerca de 46 px de largura em tela de 400 px (antes 16 colunas de 36 px de altura); os botões de opção, pânico, padrão e os sliders passaram a 44 px (sliders 40 px); as portas de gate do relógio e do tronco ficam a 30 px uma da outra (antes 22) e a captura da porta mais próxima vale até 24 px. resetar() agora para os osciladores dos LFOs e os envelopes antigos antes de recriar os módulos (antes ficavam rodando sem destino). Preset, parâmetros, cabos e salvamento (micelio42) inalterados. Pendências que continuam: kick longo em 200 BPM, 2–6 kHz abaixo da referência, onda quadrada do LFO com salto no reinício.
v0.5.5 (fecha a Fase 1, gate com duração): novo módulo Folha-duração (dur): recebe um gate e o reemite com duração controlável (parâmetro dur, de 1/4 a 8 passos de semicolcheia, 1 passo no padrão); a duração viaja no gate como dur (em segundos, calculada com o BPM do instante do pulso). Novo módulo Folha-VCA (vca): entrada de áudio, saída de áudio e entrada de CV (alvo nível, ganho base 0 no parâmetro base): com um envelope no CV vira um VCA de verdade. Os envelopes ganham o parâmetro modo: curto (como antes, ataque e queda) ou gate (sobe no ataque, segura em 1 enquanto o gate dura e solta com a queda); a duração vem de dur, senão de n (intervalo até o próximo pulso da saída), senão de uma semicolcheia. Lógica pura nova: gateLen, gateDur, envPlan. O modo curto gera a mesma automação da v0.5.4. Padrão de fábrica inalterado (os módulos novos entram sem cabos). Salvamento: mesma chave micelio42 (parâmetros novos ficam nos padrões se o save não os tiver; saves antigos carregam sem perda).
v0.5.4 (correção do ruído contínuo + preset psycore 200): CAUSAS ACHADAS renderizando o patch offline. (1) O saturador do Eco da caverna era tanh com ganho 7 no laço de feedback (0,45): ganho de pequeno sinal 3,15 > 1, então o laço nunca decaía e travava em saturação (zumbido contínuo, filtrado em 1,8 kHz) e, por a curva ter tamanho par, somava DC. Agora o saturador tem inclinação 1 (curvaEco, tanh sem ganho), o laço sempre decai, e as curvas têm tamanho ímpar (centro exato em zero, sem DC). (2) O CV do LFO no corte do ladder valia ±1750 Hz em torno de um corte de 240 Hz: o corte batia em 0 Hz em metade de cada ciclo e o filtro ressonante gerava rajadas infrassônicas que saturavam o limitador. Agora a escala do CV de corte é proporcional ao corte (1,5× o corte base × quanto). (3) O ladder nativo (sem worklet) era um filtro de 12 dB/oitava; agora são 2 biquads em cascata (24 dB/oitava), com o corte controlado por um ConstantSource (CV e envelope continuam no mesmo parâmetro). (4) Kick ganhou o parâmetro clique (nível do transiente; padrão 0,2 = igual ao anterior). PRESET NOVO (padrão de fábrica, a partir da análise da música de referência KARAPARI-NN200: 200 BPM, grave de 60–140 Hz dominante, kick ~55 Hz, baixo em mi (E2), médios esparsos): BPM 200, raiz do baixo em mi (E2), kick afino .78 soco .08 drive .45 queda .2 clique .74, baixo sub .77, ladder corte .55 reso .5 env .6, FM mais baixo e raro (vol .28, índice .35, chance .08), eco mix .22 fb .4, chapéus mais altos e abertos nos passos 2 e 4 de cada tempo (como na referência), acento no 4º passo de cada tempo. O preset anterior (darkpsy 150) segue na v0.5.3. Para aplicar o preset novo em um salvamento antigo: segure "padrão" por 0,7 s (restaura preset completo e BPM 200); os parâmetros salvos têm prioridade sobre o padrão. Salvamento: mesma chave micelio42.
v0.5.3 (Fase 1, relógio mestre): o Pulsar-mãe (clk) agora tem 5 saídas de gate: 1 (cada semicolcheia, como antes), ÷2 e ÷4 (a cada 2 e 4 semicolcheias), ×2 e ×3 (2 e 3 pulsos por semicolcheia). O swing vale em todas: ×2 e ×3 dividem o intervalo real até a próxima semicolcheia (que já inclui o atraso do swing), e ÷2 e ÷4 caem nos tempos sem swing. O gate agora leva n (duração, em segundos, até o próximo pulso esperado daquela saída); o divisor ×N usa o n recebido para subdividir de forma certa em vez de usar o intervalo anterior, então ×N de um clock com swing acompanha o swing; sem n, cai no método antigo. div ÷, euc e prob removem o n (pulsam de forma irregular); sh e qnt repassam. Salvamento: mesma chave micelio42; cabos antigos do clk sem porta são migrados para a porta 1 ao carregar (migraCabos, pura e testada). O cabo clk→seq do padrão de fábrica agora sai da porta 1. Lógica pura nova: clkT, clkSaidas, migraCabos.
v0.5.2 (Fase 1, LFO sincronizado): os dois LFOs ganham "sync" (livre ou bpm) e "ciclo" (1/16, 1/8, 1/4, 1/2, 1c, 2c, 4c, 8c; c = compasso de 16 semicolcheias). Em sync bpm a taxa acompanha o BPM em tempo real e o slider taxa some; em livre, tudo como antes. Cada LFO agora tem entrada de gate (▷): cada gate recebido reinicia a fase do LFO no instante do gate (a onda recomeça do início); em sync bpm os LFOs também reiniciam ao apertar ▶, alinhados ao primeiro tempo. A lógica da taxa (lfoHz) é pura e testada. O visual do LFO acompanha o reinício e a taxa sincronizada. Salvamento: mesma chave micelio42 (parâmetros novos ficam nos padrões se o save não os tiver). Padrão de fábrica inalterado (sync livre, sem cabo de gate no LFO).
v0.5.1 (Fase 1, acento): nova linha "acento" (▲) no painel do tronco, 32 passos, que acompanha o cursor e o comprimento da trilha do baixo. Passo acentuado: nota mais forte (+até 30% de nível) e envelope do filtro mais aberto (+até 80%), no estilo 303; o parâmetro "acento" do baixo (0 a 1) dá a intensidade, e 0 desliga o efeito. O acento viaja no gate como ac (o chapéu continua usando a). O padrão de fábrica acentua os passos 8 e 15 do baixo (os que já tocam notas) e o botão padrão de toque longo os restaura. Salvamento: mesma chave micelio42 (compatível nos dois sentidos: saves da v0.5 ganham a linha vazia; a v0.5 ignora a linha nova).
v0.5 (Fase 1, sequenciador por trilha): cada trilha do seq (kick, baixo, chapéu) tem comprimento próprio de 1 a 32 passos (comp k/b/h) e direção própria (→ frente, ← atrás, ↔ pingue-pongue, ? aleatório), então dá para fazer polirritmia. O padrão agora tem 32 passos por trilha (painel com páginas 1–16 e 17–32; passos além do comprimento aparecem apagados); o padrão padrão continua com 16 passos para frente, igual ao da v0.4.1. Cada trilha tem seu cursor visual. A oitava do baixo (a cada 8º passo) e a mutação passam a usar o índice e o comprimento do baixo. Salvamento: nova chave micelio42, que lê a micelio41 se a nova não existir (padrões de 16 passos são completados até 32 e todo o conteúdo lido é validado e limitado); micelio41 fica intocada. Lógica pura (comp, proximo, normS) isolada entre marcas PURO e testada em Node. Painel com rolagem (max 54% da altura).
v0.4.1 (preset darkpsy/psycore + visual): kick mais curto com clique de ataque e pitch maior no soco; baixo rolante em sol (G1, 49 Hz) com dois dentes-de-serra levemente desafinados e seno no fundamental, padrão fixo de raiz com ♭2 e saltos de oitava (a mutação agora favorece raiz, ♭2, 4ª e 5ª); sidechain também no FM; FM com mergulho de afinação (zap) e mais índice; chapéus: abertos longos no contratempo e semicolcheias fechadas; ladder mais ressonante com envelope mais forte; eco mais escuro; LFO 2 ligado ao dobrador. Visual: fundo em cache (sem criar gradiente por quadro), cabos fora da tela não são desenhados, sem alocar arrays de tracejado por quadro, portas do tronco pulsam e os cabos delas só brilham quando a porta dispara, portas mais espaçadas com seleção da mais próxima, modo leve também reduz as partículas. Salvamento: nova chave micelio41 (o patch antigo em micelio4 fica intocado, mas não é carregado, para o novo preset valer); segurar o botão padrão por 0,7 s restaura o preset completo (parâmetros, cabos e padrão); toque curto mantém o comportamento de antes.
v0.4 (Fase 1, tempo vira sinal): novo tipo de cabo GATE (tracejado curto, entrada ▷ à esquerda de cada módulo, saída ▶ ou ● do módulo). Novos módulos: relógio mestre (clk, com swing), divisor/multiplicador (div), euclidiano (euc), probabilidade (prob), amostra-e-segura (sh), quantizador de escala (qnt). O sequenciador agora é avançado por gate (entrada ▷) e tem 4 saídas de gate (k kick, b baixo com altura, h chapéu com acento, v passos sem kick). Kick, baixo, chapéu e FM disparam por gate; envelopes disparam por gate (sem cabo, usam o parâmetro gate antigo como reserva). O fm deixou de ter probabilidade interna: ela virou o módulo prob. Ordem dos eventos visuais corrigida. Salvamento: chave micelio4; patch da v0.3 é migrado (ganha os cabos de gate do patch padrão e a probabilidade do fm).
v0.3.3: volume mestre -5 dB (pico ainda passava de 0 dB); HUD e aviso explicam por que o AudioWorklet não carrega (exige https).
v0.3.2: modo compatível com nós nativos (filtro, dobrador, crusher) quando o AudioWorklet é bloqueado, como na pré-visualização dentro do chat; volume mestre menor (pico passava de 0 dB); canvas com DPR até 1,5 e modo visual leve automático se fps<45; floresta desce para não colidir com o HUD.
v0.3.1 (Fase 0, estabilização): botão pânico; HUD (fps, pico/clip, latência, vozes, atraso do relógio, estado do DSP);
 limitador suave final; limite de vozes; relógio se recupera após aba em segundo plano; aplicar() protegido durante a
 inicialização; erros globais viram aviso na tela; alvos de toque maiores.
v0.3: LFOs, envelopes, CV por cabo, sequenciador editável, pan do mundo. v0.2: cabos de áudio e AudioWorklet. v0.1: protótipo. */
const WK=window.MICELIO_WK||null; // no arquivo único (build) o worklet vem embutido; no repositório ele é carregado de dsp-worklet.js

/*PURO*/
const LFOMULT=[1,2,4,8,16,32,64,128];
const lfoHz=(p,bpm)=>p.sync?1/((60/bpm/4)*(LFOMULT[p.ciclo==null?4:p.ciclo|0]||16)):.05*Math.pow(400,p.taxa);
const clkT=(c,prox,sd,sw)=>prox+(c%2?sw*sd*.5:0);
function clkSaidas(c,tt,n,sd){const r=[["1",tt,n]];if(c%2===0)r.push(["÷2",tt,2*sd]);if(c%4===0)r.push(["÷4",tt,4*sd]);for(let j=0;j<2;j++)r.push(["×2",tt+j*n/2,n/2]);for(let j=0;j<3;j++)r.push(["×3",tt+j*n/3,n/3]);return r}
const migraCabos=C=>C.map(c=>c[0]==="clk"&&c[2]==="g"&&c[3]===undefined?[c[0],c[1],c[2],"1"]:c);
const comp=v=>1+Math.round(Math.min(1,Math.max(0,+v||0))*31);
function proximo(st,n,dir){
 n=Math.max(1,n|0);let i=st.i;
 if(dir===3)return st.i=Math.floor(Math.random()*n);
 if(i==null)i=dir===1?n-1:0;
 if(i>=n)i=dir===0?0:n-1;
 if(i<0)i=0;
 if(dir===1){st.i=i>0?i-1:n-1;return i}
 if(dir===2){let d=st.d||1;if(n<2){st.i=0;return 0}if(d>0&&i>=n-1)d=-1;else if(d<0&&i<=0)d=1;st.i=i+d;st.d=d;return i}
 st.i=(i+1)%n;return i}
function normS(s){const f=(a,pad,lo,hi)=>{const r=[];for(let i=0;i<32;i++){const x=Array.isArray(a)&&typeof a[i]==="number"&&isFinite(a[i])?Math.round(a[i]):pad;r.push(Math.min(hi,Math.max(lo,x)))}return r};s=s||{};return{k:f(s.k,0,0,1),b:f(s.b,-1,-1,11),h:f(s.h,0,0,2),a:f(s.a,0,0,1),o:Array.isArray(s.o)?f(s.o,0,-1,2):Array.from({length:32},(_,i)=>i%8===7?1:0)}}
const nota=(sc,d,o)=>sc[d%sc.length]+12*(Math.floor(d/sc.length)+(o||0));
const gateLen=v=>.25*Math.pow(32,Math.min(1,Math.max(0,+v||0)));
const gateDur=(v,sd)=>sd*gateLen(v);
const envPlan=(modo,ataque,queda,dur)=>{const a=.002+ataque*.2,tau=.02+queda*.5;return{a,h:modo&&dur>a?dur:a,tau}};
/*FIMPURO*/
let M,C,S,ctx,ok=false,sel="seq",bpm=200,playing=false,erroWk="";
const FORCA_NATIVO=typeof location!=="undefined"&&/[?&]nativo\b/.test(location.search||"");
let kickShp,dly,fbg,wet,noiseBuf,master,an,pk,lim,pronto=false,voz=0;
const conta=o=>{voz++;o.onended=()=>voz--};
const ap=(m,n)=>m.n&&m.n.parameters&&m.n.parameters.get(n)||null;
// CV: alvos de cada módulo [nome, AudioParam, escala]
const ALV={
 kick:[["nível",()=>M.kick.o.gain,.5]],bass:[["nível",()=>M.bass.o.gain,.5]],
 fm:[["nível",()=>M.fm.o.gain,.5]],hat:[["nível",()=>M.hat.o.gain,.5]],
 ladder:[["corte",()=>ap(M.ladder,"cutoff"),()=>cutBase()*1.5,"cutoff"],["reso",()=>ap(M.ladder,"res"),.6,"res"],["drive",()=>ap(M.ladder,"drive"),6]],
 fold:[["dobra",()=>ap(M.fold,"fold"),8,"fold"],["bias",()=>ap(M.fold,"bias"),1]],
 crush:[["bits",()=>ap(M.crush,"bits"),-8],["taxa",()=>ap(M.crush,"rate"),40]],
 eco:[["mix",()=>wet.gain,.5],["fb",()=>fbg.gain,.4]],out:[["vol",()=>master.gain,.5]],vca:[["nível",()=>M.vca.o.gain,2]]
};
const OPT={gate:["kick","bass","hat","passo"],forma:["sine","triangle","square","sawtooth"],divisao:["÷2","÷3","÷4","÷8","×2","×3"],escala:["frígia","menor","pentat.","cromática"],sync:["livre","bpm"],modo:["curto","gate"],ciclo:["1/16","1/8","1/4","1/2","1c","2c","4c","8c"],dirk:["→","←","↔","?"],dirb:["→","←","↔","?"],dirh:["→","←","↔","?"],notas:["sorteio","segue baixo"]};
const opts=(k,n)=>n==="alvo"?ALV[k].map(a=>a[0]):OPT[n];
// o:1 = tem saída de áudio/CV, g:1 = emite gate, gi:1 = aceita gate, i:1 = entrada de áudio
const DEF=()=>{const m={
 kick:{nome:"Cogumelo-kick",cor:"#ff2e93",x:.04,y:0,o:1,g:1,gi:1,p:{queda:.2,soco:.08,drive:.45,afino:.78,clique:.74}},
 bass:{nome:"Raiz-baixo",cor:"#b14cff",x:.04,y:.33,o:1,g:1,gi:1,p:{duck:.8,sub:.77,acento:.5}},
 fm:{nome:"Samambaia-FM",cor:"#2dffe0",x:.04,y:.66,o:1,g:1,gi:1,p:{razao:.4,indice:.35,vol:.28,notas:0,transp:.5}},
 hat:{nome:"Esporos",cor:"#e8ff5a",x:.04,y:1,o:1,g:1,gi:1,p:{vol:.8,queda:.3,tom:.5,metal:.3,swing:0,sincopa:0,humano:0,ghost:.25}},
 ladder:{nome:"Trepadeira-ladder",cor:"#9dff6a",x:.2,y:.08,i:1,o:1,p:{corte:.55,reso:.5,env:.6,drive:.45}},
 fold:{nome:"Cipó dobrador",cor:"#ff9a3c",x:.2,y:.4,i:1,o:1,p:{dobra:.4,bias:.1}},
 crush:{nome:"Musgo pixelado",cor:"#6aa8ff",x:.2,y:.7,i:1,o:1,p:{esmaga:.3,taxa:.2}},
 seq:{nome:"Tronco-relógio (toque nas células)",cor:"#ffd24a",x:.2,y:1,g:1,gi:1,pts:["k","b","h","v"],p:{muta:.1,raiz:.75,escala:0,compk:15/31,compb:15/31,comph:15/31,dirk:0,dirb:0,dirh:0}},
 lfo1:{nome:"Vaga-lume LFO 1",cor:"#7dffb0",x:.36,y:.05,o:1,gi:1,p:{taxa:.35,forma:0,prof:.4,sync:0,ciclo:4}},
 lfo2:{nome:"Vaga-lume LFO 2",cor:"#7dffb0",x:.36,y:.35,o:1,gi:1,p:{taxa:.42,forma:1,prof:.6,sync:0,ciclo:4}},
 env1:{nome:"Pulso ENV 1",cor:"#ff6e6e",x:.36,y:.65,o:1,gi:1,p:{ataque:.05,queda:.35,gate:0,modo:0}},
 env2:{nome:"Pulso ENV 2",cor:"#ff6e6e",x:.36,y:.95,o:1,gi:1,p:{ataque:.05,queda:.5,gate:1,modo:0}},
 clk:{nome:"Pulsar-mãe (relógio mestre)",cor:"#fff2a8",x:.52,y:.05,g:1,pts:["1","÷2","÷4","×2","×3"],p:{swing:0}},
 div:{nome:"Cipó-divisor",cor:"#ffb86b",x:.52,y:.35,g:1,gi:1,p:{divisao:0}},
 euc:{nome:"Roseta euclidiana",cor:"#ff7ad9",x:.52,y:.65,g:1,gi:1,p:{passos:.47,pulsos:.4,rota:0}},
 prob:{nome:"Dado de esporos (probabilidade)",cor:"#8affc1",x:.52,y:.95,g:1,gi:1,p:{chance:.08}},
 sh:{nome:"Amostra-e-segura",cor:"#7ad7ff",x:.68,y:.05,g:1,gi:1,p:{centro:.5,faixa:.8}},
 qnt:{nome:"Escada quantizadora",cor:"#d0a2ff",x:.68,y:.35,g:1,gi:1,p:{escala:0,oitavas:.5}},
 dur:{nome:"Folha-duração (gate com comprimento)",cor:"#ffcf70",x:.68,y:.95,g:1,gi:1,p:{dur:.4}},
 vca:{nome:"Folha-VCA (áudio × CV)",cor:"#ff8a5c",x:.84,y:.15,i:1,o:1,p:{base:0}},
 eco:{nome:"Eco da caverna",cor:"#c9a0ff",x:.68,y:.68,i:1,o:1,p:{mix:.22,fb:.4}},
 out:{nome:"Coração",cor:"#ffffff",x:.84,y:.5,i:1,p:{vol:.8}}};
 for(const k in ALV){m[k].p.alvo=0;m[k].p.quanto=.5}return m};
const CABG=()=>[["clk","seq","g","1"],["seq","kick","g","k"],["seq","bass","g","b"],["seq","hat","g","h"],["seq","prob","g","v"],["prob","fm","g"],["kick","env1","g"],["bass","env2","g"]];
const CAB=()=>[["kick","out"],["bass","ladder"],["ladder","out"],["fm","fold"],["fold","eco"],["eco","out"],["hat","crush"],["crush","out"]].map(c=>[c[0],c[1],"a"]).concat([["lfo1","ladder","c"],["lfo2","fold","c"]]).concat(CABG());
const SEQ=()=>normS({k:[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],b:[-1,0,0,0,-1,0,0,1,-1,0,0,0,-1,0,3,1],h:[0,2,0,2,0,1,0,2,0,2,0,2,0,1,0,2],a:[0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1]});
M=DEF();C=CAB();S=SEQ();
const PC={k:"#ff2e93",b:"#b14cff",h:"#e8ff5a",v:"#2dffe0","1":"#fff2a8","÷2":"#ffb86b","÷4":"#ff9a3c","×2":"#7ad7ff","×3":"#8affc1"};
try{let raw=localStorage.getItem("micelio42")||localStorage.getItem("micelio41");const v4=true;
 const s=JSON.parse(raw);
 if(s){for(const k in s.p)if(M[k])Object.assign(M[k].p,s.p[k]);C=migraCabos(s.c.filter(c=>Array.isArray(c)&&M[c[0]]&&M[c[1]]));S=normS(s.S);
  if(!v4){C=C.filter(c=>c[2]!=="g").concat(CABG());if(s.p.fm&&typeof s.p.fm.prob==="number")M.prob.p.chance=s.p.fm.prob*.5}}
 delete M.fm.p.prob}catch(e){aviso("não consegui ler o salvamento: "+e.message)}
const save=()=>{try{const p={};for(const k in M)p[k]=M[k].p;localStorage.setItem("micelio42",JSON.stringify({p,c:C,S}))}catch(e){}};
const P=(m,k)=>M[m].p[k];
const liga=(a,b,k)=>{if(ctx&&k!=="g")try{M[a].o.connect(k==="c"?M[b].c:M[b].i)}catch(e){}};
const desliga=(a,b,k)=>{if(ctx&&k!=="g")try{M[a].o.disconnect(k==="c"?M[b].c:M[b].i)}catch(e){}};
function alcanca(de,para,k){const v={},f=n=>{if(n===para)return true;if(v[n])return false;v[n]=1;return C.some(c=>c[2]===k&&c[0]===n&&f(c[1]))};return f(de)}
// v0.7.7: regras de ligação num lugar só (usadas por conecta e pelo destaque do que combina). null = pode; "" = recusa em silêncio; texto = aviso
function motivoNao(a,b,k,pt){
 if(a===b)return"";
 if(k==="g"?(!M[a].g||!M[b].gi):(!M[a].o||(k==="a"?!M[b].i:!ALV[b])))return"essa saída não combina com essa entrada";
 if(C.some(c=>c[0]===a&&c[1]===b&&c[2]===k&&c[3]===pt))return"";
 if((k==="a"||k==="g")&&alcanca(b,a,k))return"esse cipó faria um laço fechado";
 return null}
function conecta(a,b,k,pt){
 const r=motivoNao(a,b,k,pt);if(r!==null){if(r)aviso(r);return}
 C.push(pt?[a,b,k,pt]:[a,b,k]);liga(a,b,k);save();
}
function corta(i){const c=C.splice(i,1)[0];desliga(c[0],c[1],c[2]);save()}
function resetar(tudo){const t=ctx?ctx.currentTime:0,fd=.01;
 for(const c of C)desliga(c[0],c[1],c[2]);
 for(const k of ["lfo1","lfo2"])try{M[k].osc&&M[k].osc.stop(t+fd)}catch(e){}
 for(const k of ["env1","env2"])try{M[k].cs&&M[k].cs.stop(t+fd)}catch(e){}
 const ps={};for(const k in M)ps[k]=M[k].p;M=DEF();if(!tudo)for(const k in M)Object.assign(M[k].p,ps[k]);C=CAB();if(tudo){S=SEQ();bpm=200;document.getElementById("bpm").value=200;document.getElementById("bv").textContent=200}if(ctx)montaNos();save();painel()}
{const rb=document.getElementById("rst");let lp=0,lt;
 rb.onpointerdown=()=>{lp=0;clearTimeout(lt);lt=setTimeout(()=>{lp=1;resetar(true);aviso("preset darkpsy restaurado")},700)};
 rb.onpointerup=rb.onpointerleave=rb.onpointercancel=()=>clearTimeout(lt);
 rb.onclick=()=>{if(lp){lp=0;return}resetar(false)}}
function aviso(t){const m=document.getElementById("msg");m.innerHTML=t;m.style.opacity=1;setTimeout(()=>m.style.opacity=0,2400)}

// ---------- Áudio ----------
const curva=a=>{const n=1025,c=new Float32Array(n);for(let i=0;i<n;i++)c[i]=Math.tanh((i/(n-1)*2-1)*(1+a*12));return c};
const curvaEco=()=>{const n=1025,c=new Float32Array(n);for(let i=0;i<n;i++)c[i]=Math.tanh(i/(n-1)*2-1);return c};
const hz=n=>440*Math.pow(2,(n-69)/12);
const prende=(p,t)=>{if(p.cancelAndHoldAtTime)p.cancelAndHoldAtTime(t);else{p.cancelScheduledValues(t);p.setValueAtTime(p.value,t)}};
const wp=(m,n,v)=>{const p=ap(m,n);if(p)p.value=v*((m.fm&&m.fm[n])||1)};
function montaNos(){
 const G=()=>ctx.createGain(),mk=n=>ok?new AudioWorkletNode(ctx,n,{channelCount:1,channelCountMode:"explicit",outputChannelCount:[1]}):G();
 kickShp=ctx.createWaveShaper();kickShp.oversample="4x";M.kick.o=G();kickShp.connect(M.kick.o);
 M.bass.o=G();M.fm.o=G();M.hat.o=G();M.vca.i=M.vca.o=G();
 for(const k of ["ladder","fold","crush"]){
  if(ok){M[k].n=M[k].i=M[k].o=mk(k);continue}
  const m=M[k];let pr={};
  if(k==="ladder"){const b=ctx.createBiquadFilter(),b2=ctx.createBiquadFilter(),cs=ctx.createConstantSource();b.type=b2.type="lowpass";b.frequency.value=b2.frequency.value=0;b.Q.value=-3;cs.offset.value=240;cs.connect(b.frequency);cs.connect(b2.frequency);cs.start();b.connect(b2);m.i=b;m.o=b2;pr={cutoff:cs.offset,res:b2.Q};m.fm={res:14}}
  else if(k==="fold"){const pre=G(),w=ctx.createWaveShaper(),c=new Float32Array(4096);for(let i=0;i<4096;i++)c[i]=.85*Math.sin((i/4095*2-1)*18.85);w.curve=c;pre.connect(w);m.i=pre;m.o=w;pr={fold:pre.gain};m.fm={fold:1/12}}
  else{const w=ctx.createWaveShaper();m.i=m.o=m.qs=w;m.ql=-1}
  m.n={parameters:{get:n=>pr[n]||null}};
 }
 const E=M.eco;E.i=G();E.o=G();E.i.connect(E.o);dly=ctx.createDelay(2);fbg=G();wet=G();
 const lp=ctx.createBiquadFilter();lp.frequency.value=1800;const sat=ctx.createWaveShaper();sat.curve=curvaEco();
 E.i.connect(dly);dly.connect(lp);lp.connect(sat);sat.connect(fbg);fbg.connect(dly);sat.connect(wet);wet.connect(E.o);
 M.out.i=master;
 for(const k of ["lfo1","lfo2"]){const o=ctx.createOscillator(),og=G();M[k].osc=o;M[k].og=og;M[k].o=G();o.connect(og);og.connect(M[k].o);o.start()}
 for(const k of ["env1","env2"]){const c=ctx.createConstantSource();c.offset.value=0;c.start();M[k].cs=c;M[k].o=c}
 for(const k in ALV){M[k].c=G();M[k].ca=-1}
 for(const c of C)liga(c[0],c[1],c[2]);
 pronto=true;aplicar();
}
async function iniciar(){
 ctx=new (window.AudioContext||window.webkitAudioContext)({latencyHint:"interactive"});
 try{if(FORCA_NATIVO)throw new Error("forçado");await ctx.audioWorklet.addModule(WK?URL.createObjectURL(new Blob([WK],{type:"text/javascript"})):"dsp-worklet.js");ok=true}catch(e){ok=false;erroWk=String(e&&e.message||e).slice(0,40)}
 master=ctx.createGain();const comp=ctx.createDynamicsCompressor();comp.threshold.value=-10;comp.ratio.value=6;
 an=ctx.createAnalyser();an.fftSize=256;pk=ctx.createAnalyser();pk.fftSize=1024;lim=ctx.createWaveShaper();
 {const n=2048,c=new Float32Array(n);for(let i=0;i<n;i++){const x=i/(n-1)*2-1,a=Math.abs(x);c[i]=a<.8?x:Math.sign(x)*(.8+.2*Math.tanh((a-.8)/.2))}lim.curve=c}
 master.connect(pk);master.connect(comp);comp.connect(lim);lim.connect(an);an.connect(ctx.destination);
 noiseBuf=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
 montaNos();
 if(!ok)aviso("modo nativo"+(FORCA_NATIVO?" (forçado por ?nativo)":!window.isSecureContext?" (o AudioWorklet exige https)":" (falha ao carregar o worklet: "+erroWk+")")+": sem drive, bias e taxa");
}
const cutBase=()=>60*Math.pow(2,P("ladder","corte")*5);
const sm=5e-3;const suav=(p,v,t)=>{if(ctx&&p.cancelScheduledValues)p.cancelScheduledValues(t).setTargetAtTime(v,t,sm);else p.value=v};
function aplicar(){
 if(!pronto)return;
 const t=ctx?ctx.currentTime:0;
 kickShp.curve=curva(P("kick","drive"));
 suav(fbg.gain,P("eco","fb")*.9,t);suav(wet.gain,P("eco","mix"),t);suav(dly.delayTime,60/bpm*.75,t);
 wp(M.ladder,"res",P("ladder","reso")*1.15);wp(M.ladder,"drive",1+P("ladder","drive")*8);wp(M.ladder,"cutoff",cutBase());
 wp(M.fold,"fold",1+P("fold","dobra")*12);wp(M.fold,"bias",P("fold","bias")*1.2);
 wp(M.crush,"bits",16-P("crush","esmaga")*14);wp(M.crush,"rate",1+P("crush","taxa")*50);
 if(M.crush.qs){const q=Math.round(P("crush","esmaga")*100);if(q!==M.crush.ql){M.crush.ql=q;const L=Math.pow(2,16-q/100*14-1),c=new Float32Array(2048);for(let i=0;i<2048;i++)c[i]=Math.round((i/2047*2-1)*L)/L;M.crush.qs.curve=c}}
 suav(master.gain,(.2+P("out","vol")*.6)*.55,t);suav(M.vca.o.gain,P("vca","base"),t);
 for(const k of ["lfo1","lfo2"]){const m=M[k];m.osc.type=OPT.forma[m.p.forma];suav(m.osc.frequency,lfoHz(m.p,bpm),t);suav(m.o.gain,m.p.prof,t)}
 for(const k in ALV){const m=M[k],a=ALV[k][m.p.alvo]||ALV[k][0];
  if(m.ca!==m.p.alvo){try{m.c.disconnect()}catch(e){}const pr=a[1]();if(pr)m.c.connect(pr);m.ca=m.p.alvo}
  suav(m.c.gain,(typeof a[2]==="function"?a[2]():a[2])*m.p.quanto*((m.fm&&a[3]&&m.fm[a[3]])||1),t)}
}
const ESC=[0,1,3,5,7,8,10],ESCS=[ESC,[0,2,3,5,7,8,10],[0,3,5,7,10],[0,1,2,3,4,5,6,7,8,9,10,11]];
const escSeq=()=>ESCS[P("seq","escala")]||ESC,NN=["C","C♯","D","D♯","E","F","F♯","G","G♯","A","A♯","B"],nomeN=m=>NN[m%12]+(Math.floor(m/12)-1),raizM=()=>31+Math.round(P("seq","raiz")*12);let ultB=40;
const evs=[],E={};for(const k in M)E[k]=0;let beat=0,vis={k:0,b:0,h:0},pvk=-1,pvb=-1,pvh=-1,pg=0;
const ev=(t,m,i,tr)=>{evs.push({t,m,i,tr});if(evs.length>2000)evs.splice(0,1000)};
// ---------- Tempo como sinal: gates por cabo ----------
const temG=k=>C.some(c=>c[2]==="g"&&c[1]===k);
function dispEnv(k,t,d){const m=M[k],o=m.cs.offset,e=envPlan(m.p.modo,m.p.ataque,m.p.queda,d&&d.dur>0?d.dur:d&&d.n>0?d.n:60/bpm/4);
 if(o.cancelAndHoldAtTime)o.cancelAndHoldAtTime(t);else{const val0=o.valueAtTime?(o.valueAtTime(t-1e-6)||0):o.value;o.cancelScheduledValues(t);o.setValueAtTime(val0,t)}
 o.linearRampToValueAtTime(1,t+e.a);
 if(e.h>e.a)o.setValueAtTime(1,t+e.h);const release=Math.max(e.tau,.005);o.setTargetAtTime(0,t+Math.max(e.h,e.a),release);ev(t,k)}
// reserva: envelope sem cabo de gate segue o parâmetro gate antigo
function gat(n,t){for(const k of ["env1","env2"])if(!temG(k)&&OPT.gate[M[k].p.gate]===n)dispEnv(k,t)}
function pulso(id,t,d,pt,dep){dep=dep||0;if(dep>8)return;if(pt)ev(t,id+":"+pt);for(const c of C)if(c[2]==="g"&&c[0]===id&&c[3]===pt)entra(c[1],t,d||{},dep+1)}
function entra(k,t,d,dep){
 const m=M[k],sd=60/bpm/4,raiz=31+Math.round(P("seq","raiz")*12),st=m.st||(m.st={});
 const sai=(x,pt)=>pulso(k,t,x||d,pt,dep),sn=()=>{const o=Object.assign({},d);delete o.n;return o};
 if(k==="seq")passoSeq(t,dep);
 else if(k==="kick"){if(voz<70){kick(t);sai()}}
 else if(k==="bass"){if(voz<70){ultB=raiz+(d.s||0);baixo(t,ultB,sd*.9,d.ac);sai()}}
 else if(k==="hat"){const th=Math.max(ctx.currentTime,t+(d.dt||0)),dd=Object.assign({},d);delete dd.dt;chapeu(th,d.a||1);pulso(k,th,dd,undefined,dep)}
 else if(k==="fm"){const e=escSeq(),tr=Math.round((P("fm","transp")-.5)*48),nt=P("fm","notas")===1?ultB+24:raiz+29+(d.s!==undefined?d.s:e[Math.floor(Math.random()*e.length)]+(Math.random()<.3?12:0));fm(t,nt+tr,sd*(2+Math.random()*4));sai()}
 else if(k==="lfo1"||k==="lfo2")reiniciaLfo(k,t);
 else if(k==="env1"||k==="env2")dispEnv(k,t,d);
 else if(k==="div"){const r=m.p.divisao;
  if(r<4){const N=[2,3,4,8][r];st.c=st.c||0;if(st.c%N===0){ev(t,k);sai(sn())}st.c++}
  else{const N=r-2,per=d.n>0?d.n:st.l&&t>st.l?Math.min(t-st.l,sd*16):sd;st.l=t;for(let j=0;j<N;j++){const tt=t+j*per/N;ev(tt,k);pulso(k,tt,Object.assign({},d,{n:per/N}),undefined,dep)}}}
 else if(k==="euc"){const n=1+Math.round(m.p.passos*15),h=Math.round(m.p.pulsos*n),i=((st.i||0)+Math.round(m.p.rota*(n-1)))%n;st.i=(st.i||0)+1;if((i*h)%n<h){ev(t,k);sai(sn())}}
 else if(k==="prob"){if(Math.random()<m.p.chance){ev(t,k);sai(sn())}}
 else if(k==="dur"){ev(t,k);sai(Object.assign({},d,{dur:gateDur(m.p.dur,sd)}))}
 else if(k==="sh"){const v=Math.min(1,Math.max(0,m.p.centro+(Math.random()-.5)*m.p.faixa));ev(t,k);sai(Object.assign({},d,{v}))}
 else if(k==="qnt"){const sc=ESCS[m.p.escala]||ESC,R=12*(1+Math.round(m.p.oitavas*2));
  const x=d.v!==undefined?d.v*R:d.s!==undefined?d.s:Math.random()*R;let b=0,bd=99;
  for(let o=0;o<=R/12;o++)for(const n of sc){const s=o*12+n,dd=Math.abs(s-x);if(dd<bd){bd=dd;b=s}}
  ev(t,k);sai(Object.assign({},d,{s:b}))}
}
// gate no LFO: troca o oscilador por um novo que começa em t (fase zero); o antigo para em t com crossfade
function reiniciaLfo(k,t){const m=M[k];if(!m.osc||!m.og)return;
 const o=ctx.createOscillator(),g=ctx.createGain(),v=m.osc,vg=m.og,cf=.003,t0=Math.max(t,ctx.currentTime);
 o.type=OPT.forma[m.p.forma];o.frequency.value=lfoHz(m.p,bpm);o.connect(g);g.connect(m.o);
 g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(1,t0+cf);
 prende(vg.gain,t0);vg.gain.linearRampToValueAtTime(0,t0+cf);
 o.start(t0);v.stop(t0+cf+.005);v.onended=()=>{try{v.disconnect();vg.disconnect()}catch(e){}};
 m.osc=o;m.og=g;m.rt=t0;ev(t0,k)}
function kick(t){
 const o=ctx.createOscillator(),g=ctx.createGain(),base=36+P("kick","afino")*24,ini=base+80+P("kick","soco")*420;
 o.frequency.setValueAtTime(ini,t);o.frequency.exponentialRampToValueAtTime(base,t+.035+P("kick","soco")*.05);
 g.gain.setValueAtTime(1,t);g.gain.exponentialRampToValueAtTime(.001,t+.12+P("kick","queda")*.4);g.gain.linearRampToValueAtTime(0,t+.58);
 conta(o);o.connect(g);g.connect(kickShp);o.start(t);o.stop(t+.6);
 {const c=ctx.createOscillator(),cg=ctx.createGain();c.type="square";c.frequency.value=1500;cg.gain.setValueAtTime(.08+P("kick","clique")*.5,t);cg.gain.exponentialRampToValueAtTime(.001,t+.008);c.connect(cg);cg.connect(M.kick.o);conta(c);c.start(t);c.stop(t+.02)}
 const d=M.bass.o.gain;prende(d,t);d.linearRampToValueAtTime(1-P("bass","duck")*.9,t+.004);d.linearRampToValueAtTime(1,t+.2);
 const f=M.fm.o.gain;prende(f,t);f.linearRampToValueAtTime(1-P("bass","duck")*.45,t+.004);f.linearRampToValueAtTime(1,t+.18);
 ev(t,"kick");gat("kick",t);
}
function baixo(t,nota,dur,ac){
 const o=ctx.createOscillator(),s=ctx.createOscillator(),sg=ctx.createGain(),g=ctx.createGain(),fr=hz(nota);
 o.type="sawtooth";o.frequency.value=fr;o.detune.value=-7;s.frequency.value=fr;sg.gain.value=P("bass","sub");const o2=ctx.createOscillator();o2.type="sawtooth";o2.frequency.value=fr;o2.detune.value=7;o2.connect(g);
 const nv=.28*(1+(ac?P("bass","acento")*.5:0));g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(nv,t+.004);g.gain.setValueAtTime(nv,t+dur*.8);g.gain.linearRampToValueAtTime(.0001,t+dur);
 o.connect(g);s.connect(sg);sg.connect(g);conta(o);g.connect(M.bass.o);o.start(t);s.start(t);o2.start(t);const fd=.01;o.stop(t+dur+fd);s.stop(t+dur+fd);o2.stop(t+dur+fd);
 const cp=ap(M.ladder,"cutoff");
 if(cp){const c=cutBase();cp.cancelScheduledValues(t);cp.setValueAtTime(Math.min(12000,c*(1+P("ladder","env")*12*(1+(ac?P("bass","acento")*.8:0)))),t);cp.exponentialRampToValueAtTime(c,t+dur*.9)}
 ev(t,"bass");gat("bass",t);
}
function fm(t,nota,dur){if(voz>40)return;
 const c=ctx.createOscillator(),m=ctx.createOscillator(),mg=ctx.createGain(),g=ctx.createGain(),fr=hz(nota),R=[1,1.41,2.76,3.5,5.19,7.07];
 c.frequency.setValueAtTime(fr*1.6,t);c.frequency.exponentialRampToValueAtTime(fr,t+.06);m.frequency.value=fr*R[Math.floor(P("fm","razao")*5.99)];
 mg.gain.setValueAtTime(fr*P("fm","indice")*8,t);mg.gain.exponentialRampToValueAtTime(fr*.1,t+dur);
 g.gain.setValueAtTime(P("fm","vol")*.35,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);g.gain.linearRampToValueAtTime(0,t+dur+.008);
 m.connect(mg);mg.connect(c.frequency);c.connect(g);g.connect(M.fm.o);conta(c);
 const fd=.01;c.start(t);m.start(t);c.stop(t+dur+fd);m.stop(t+dur+fd);ev(t,"fm");
}
const hatTomHz=v=>7000*Math.pow(2,(v-.5)*2.4),hatQ=v=>Math.pow(10,(v-.3)*1.2);
function chapeu(t,f){if(voz>56)return;
 const n=ctx.createBufferSource(),h=ctx.createBiquadFilter(),g=ctx.createGain();
 n.buffer=noiseBuf;conta(n);h.type="highpass";h.frequency.value=hatTomHz(P("hat","tom"));const q=hatQ(P("hat","metal"));h.Q.value=q;
 g.gain.setValueAtTime(P("hat","vol")*f*.5/Math.sqrt(Math.max(1,q)),t);const dh=.03+P("hat","queda")*.25*(f>=1?1.8:1);g.gain.exponentialRampToValueAtTime(.001,t+dh);g.gain.linearRampToValueAtTime(0,t+dh+.01);
 n.connect(h);h.connect(g);g.connect(M.hat.o);n.start(t);const fd=.01;n.stop(t+dh+.02);ev(t,"hat");gat("hat",t);
}
let PS={k:{},b:{},h:{}},prox=0,timer,cnt=0;
// o sequenciador avança um passo a cada gate recebido; cada trilha (k, b, h) tem comprimento e direção próprios; portas k, b, h, v
function passoSeq(t,dep){
 const o=(x,pt)=>pulso("seq",t,x,pt,dep),nb=comp(P("seq","compb")),
  ik=proximo(PS.k,comp(P("seq","compk")),P("seq","dirk")),ib=proximo(PS.b,nb,P("seq","dirb")),ih=proximo(PS.h,comp(P("seq","comph")),P("seq","dirh"));
 ev(t,"seq",ik,"k");ev(t,"seq",ib,"b");ev(t,"seq",ih,"h");gat("passo",t);
 if(S.k[ik])o({},"k");
 if(S.b[ib]>=0)o({s:nota(escSeq(),S.b[ib],S.o[ib]),ac:S.a[ib]},"b");
 const sdH=60/bpm/4,swH=P("hat","swing"),siH=P("hat","sincopa"),huH=P("hat","humano"),ni=PS.n||0,imp=ni&1;PS.n=ni+1;
 const hx=a=>{let dt=imp?swH*sdH*.5:0;if(siH>0&&Math.random()<siH*.6)dt+=sdH*.5;if(huH>0){dt+=(Math.random()-.5)*huH*sdH*.24;a*=1+(Math.random()-.5)*huH*.7}return{a,dt}};
 if(S.h[ih])o(hx(S.h[ih]===2?1:.4),"h");else if(Math.random()<P("hat","ghost")*.4)o(hx(.3),"h");
 if(!S.k[ik])o({},"v");
 if(ib===nb-1&&Math.random()<P("seq","muta")*3){const j=Math.floor(Math.random()*nb);if(S.b[j]>=0)S.b[j]=[0,0,0,1,1,3,4][Math.floor(Math.random()*7)]}
}
let atrasoMax=0,ult=0,estouros=0,atrasoPico=0,vozPico=0;const JAN=.18;
const DIAG=typeof location!=="undefined"&&/[?&]diag\b/.test(location.search||"");
const relogio=()=>{try{const n=performance.now();if(ult){const a=n-ult-25;atrasoMax=Math.max(atrasoMax,a);atrasoPico=Math.max(atrasoPico,a)}ult=n;
 if(prox<ctx.currentTime-.05){estouros++;prox=ctx.currentTime+.05}
 while(prox<ctx.currentTime+JAN){const sd=60/bpm/4,sw=P("clk","swing"),tt=clkT(cnt,prox,sd,sw),n=clkT(cnt+1,prox+sd,sd,sw)-tt;ev(tt,"clk");for(const s of clkSaidas(cnt,tt,n,sd))pulso("clk",s[1],{i:cnt,n:s[2]},s[0]);cnt++;prox+=sd}}catch(e){aviso("erro no relógio: "+e.message)}};
function panico(){
 if(!ctx||!pronto)return;
 master.gain.cancelScheduledValues(0);master.gain.setTargetAtTime(0,ctx.currentTime,.02);fbg.gain.value=0;wet.gain.value=0;
 if(playing)alternar();
 setTimeout(aplicar,700);aviso("silêncio");
}
document.getElementById("pan").onclick=panico;
addEventListener("error",e=>aviso("erro: "+(e.message||"desconhecido")));
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&ctx&&ctx.state!=="running")ctx.resume();ult=0});
async function alternar(){
 if(!ctx)await iniciar();
 await ctx.resume();playing=!playing;
 const b=document.getElementById("play");b.classList.toggle("on",playing);b.textContent=playing?"■":"▶";
 if(ok||playing)document.getElementById("msg").style.opacity=0;
 if(playing){PS={k:{},b:{},h:{}};cnt=0;for(const k in M)M[k].st=null;prox=ctx.currentTime+.06;for(const k of ["lfo1","lfo2"])if(M[k].p.sync)reiniciaLfo(k,prox);timer=setInterval(relogio,25)}else{clearInterval(timer);save()}
}
document.getElementById("play").onclick=alternar;
const bi=document.getElementById("bpm");bi.oninput=()=>{bpm=+bi.value;document.getElementById("bv").textContent=bpm;aplicar()};

const FONTE='"SyneLocal","Syne",system-ui,sans-serif';
// ---------- Painel ----------
const TR=[["kick","k",1,v=>v?"●":""],["baixo","b",0,(v,i)=>v<0?"":nomeN(raizM()+nota(escSeq(),v,S.o[i]))],["oitava","o",0,v=>v?(v>0?"+":"−")+Math.abs(v):"","b"],["chapéu","h",2,v=>["","·","○"][v]],["acento","a",1,v=>v?"▲":"","b"]];
let pintas=[];
const NE=()=>Math.round(P("euc","passos")*15);
const GRUPOS={hat:{vol:"nível",tom:"timbre",swing:"ritmo"}};
const NOMES={sincopa:"síncopa",compk:"comp k",compb:"comp b",comph:"comp h",dirk:"dir k",dirb:"dir b",dirh:"dir h"};
const dimSeq=()=>{const n={k:comp(P("seq","compk")),b:comp(P("seq","compb")),h:comp(P("seq","comph"))};document.querySelectorAll(".gr button").forEach(b=>b.classList.toggle("fora",+b.dataset.i>=n[b.dataset.tr]))};
const FMT={hat:{swing:v=>Math.round(v*100)+"%",sincopa:v=>Math.round(v*100)+"%",humano:v=>Math.round(v*100)+"%",tom:v=>(Math.round(hatTomHz(v)/100)/10).toFixed(1).replace(".",",")+" kHz"},fm:{transp:v=>{const s=Math.round((v-.5)*48);return(s>0?"+":"")+s+" st"}},euc:{passos:v=>1+Math.round(v*15),pulsos:v=>Math.round(v*(1+NE())),rota:v=>Math.round(v*NE())},clk:{swing:v=>Math.round(v*100)+"%"},seq:{compk:comp,compb:comp,comph:comp,raiz:v=>nomeN(31+Math.round(v*12))},prob:{chance:v=>Math.round(v*100)+"%"},dur:{dur:v=>String(Math.round(gateLen(v)*100)/100).replace(".",",")+"p"},qnt:{oitavas:v=>1+Math.round(v*2)}};
const cssv=(el,k,v)=>{if(el&&el.style&&el.style.setProperty)el.style.setProperty(k,v)};
function painel(){
 const m=M[sel],box=document.getElementById("ps"),nb=sel==="bass";document.getElementById("nm").textContent=m.nome;box.innerHTML="";cssv(document.getElementById("panel"),"--c",m.cor);
 // controle (slider ou opções) de um parâmetro de qualquer módulo; o painel do baixo também edita notas e escala do Tronco
 const ctl=(mod,k)=>{const mm=M[mod];
  if((mod==="lfo1"||mod==="lfo2")&&((k==="taxa"&&mm.p.sync)||(k==="ciclo"&&!mm.p.sync)))return;
  if(opts(mod,k)){const d=document.createElement("div");d.className="opt";
   opts(mod,k).forEach((n,i)=>{const b=document.createElement("button");b.textContent=(k==="alvo"?"CV→ ":(NOMES[k]||k)+" ")+n;b.className=mm.p[k]===i?"on":"";
    b.onclick=()=>{mm.p[k]=i;aplicar();save();painel()};d.appendChild(b)});box.appendChild(d);return}
  const d=document.createElement("div");d.className="p";const lb=document.createElement("span"),vl=document.createElement("span");vl.className="v";d.appendChild(lb);
  const r=document.createElement("input");r.type="range";r.min=0;r.max=1;r.step=.01;r.value=mm.p[k];
  const rot=()=>{lb.textContent=NOMES[k]||k;vl.textContent=FMT[mod]&&FMT[mod][k]?String(FMT[mod][k](mm.p[k])):String(Math.round(mm.p[k]*100));cssv(r,"--v",Math.round(mm.p[k]*100)+"%")};rot();
  r.oninput=()=>{mm.p[k]=+r.value;rot();if(mod==="seq"){dimSeq();pintas.forEach(f=>f())}aplicar();save()};d.appendChild(r);d.appendChild(vl);box.appendChild(d)};
 if(sel==="seq"||nb){const d=document.createElement("div");d.className="opt";d.dataset.pg="1";
  ["passos 1–8","9–16","17–24","25–32"].forEach((n,j)=>{const b=document.createElement("button");b.textContent=n;b.className=pg===j?"on":"";b.onclick=()=>{pg=j;painel()};d.appendChild(b)});box.appendChild(d)}
 pintas=[];
 if(sel==="seq"||nb)for(const [nomeTr,key,mx,fmt,trk] of TR){
  if(nb&&key!=="b"&&key!=="o"&&key!=="a")continue;
  const lt=document.createElement("div");lt.className="lbl";lt.textContent=nomeTr;box.appendChild(lt);
  const r=document.createElement("div");r.className="gr";
  for(let j=0;j<8;j++){const i=pg*8+j,b=document.createElement("button");b.dataset.i=i;b.dataset.tr=trk||key;
   const pinta=()=>{b.textContent=fmt(S[key][i],i);b.classList.toggle("on",key==="b"?S[key][i]>=0:key==="o"?S[key][i]!==0:S[key][i]>0)};pinta();pintas.push(pinta);
   b.onclick=()=>{const v=S[key][i];S[key][i]=key==="b"?(v>=escSeq().length-1?-1:v+1):key==="o"?(v>=2?-1:v+1):(v+1)%(mx+1);pintas.forEach(f=>f());save()};r.appendChild(b)}
  box.appendChild(r);
 }
 if(sel==="seq"||nb){dimSeq();pvk=-1}
 if(nb)for(const k of ["raiz","escala","compb","dirb"])ctl("seq",k);
 for(const k in m.p){const gp=GRUPOS[sel]&&GRUPOS[sel][k];if(gp){const lt=document.createElement("div");lt.className="lbl";lt.textContent=gp;box.appendChild(lt)}ctl(sel,k)}
}
painel();
// menu recolhível (v0.7.4): recolhido, o painel vira uma faixa fina (nome do módulo + botão); o estado vai em micelio_menu, fora do save do preset
let menuMin=false;try{menuMin=localStorage.getItem("micelio_menu")==="1"}catch(e){}
function menuAplica(){const p=document.getElementById("panel"),b=document.getElementById("mn");if(p&&p.classList)p.classList.toggle("min",menuMin);
 if(b){b.textContent=menuMin?"▴":"▾";if(b.setAttribute){b.setAttribute("aria-expanded",menuMin?"false":"true");b.setAttribute("aria-label",menuMin?"Maximizar menu":"Minimizar menu")}}}
function menuAlterna(){menuMin=!menuMin;try{localStorage.setItem("micelio_menu",menuMin?"1":"0")}catch(e){}menuAplica()}
{const ph=document.getElementById("ph");if(ph)ph.onclick=menuAlterna}
menuAplica();

// ---------- Floresta ----------
const cv=document.getElementById("c"),g=cv.getContext("2d");
let W,H,cam=0,bgc,flc;
function tam(){const r=Math.min(devicePixelRatio||1,1.5);W=innerWidth;H=innerHeight;cv.width=W*r;cv.height=H*r;g.setTransform(r,0,0,r,0,0);fundo()}
addEventListener("resize",tam);tam();
function fundo(){bgc=document.createElement("canvas");flc=document.createElement("canvas");bgc.width=flc.width=W;bgc.height=flc.height=H;
 const a=bgc.getContext("2d"),b=flc.getContext("2d");let q=a.createRadialGradient(W/2,H*.4,10,W/2,H*.4,H*.8);q.addColorStop(0,"rgb(14,6,26)");q.addColorStop(1,"#05060a");a.fillStyle=q;a.fillRect(0,0,W,H);
 q=b.createRadialGradient(W/2,H*.4,10,W/2,H*.4,H*.8);q.addColorStop(0,"rgb(54,14,76)");q.addColorStop(1,"rgba(5,6,10,0)");b.fillStyle=q;b.fillRect(0,0,W,H)}
// v0.7.5: menu recolhido libera a tela; FH (altura útil da floresta) vai de H*.54 a H-88 com suavização, expandido é H*.54 como antes
const fhAlvo=()=>menuMin?Math.max(H*.54,H-88):H*.54;let fhV=fhAlvo();
const FH=()=>fhV,PO=30;
function fhPasso(){const a=fhAlvo();fhV=Math.abs(a-fhV)<.5?a:fhV+(a-fhV)*.16}
const pos=m=>[cam+28+m.x*(W*2-56),122+m.y*(FH()-160)];
const pOut=(m,pt)=>{const [x,y]=pos(m);let dy=0;if(m.pts&&pt)dy=(m.pts.indexOf(pt)-(m.pts.length-1)/2)*30;return[x+PO,y+dy]};
const pIn=m=>{const [x,y]=pos(m);return[x-PO,y]};
const pGi=m=>{const [x,y]=pos(m);return[x-PO,y+(m.i?24:0)]};
const pCv=m=>{const [x,y]=pos(m);return[x,y-40]};
let drag=null,dport,pan=null,ptr=[0,0],hits=[],LQ=false;
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
// v0.7.7: seleção de saída, entrada ou cabo; tudo que combina fica destacado e pisca (psel = seleção; alvos = o que combina)
let psel=null,alvos=[],alvosC=null,alvosN=-1,down=[0,0],togg=false;
const REDUZ=typeof matchMedia==="function"&&matchMedia("(prefers-reduced-motion: reduce)").matches;
const ptsDe=(a,k)=>k==="g"&&M[a].pts?M[a].pts:[undefined];
const TIPO={a:"áudio",c:"CV",g:"gate"};
const nomeCurto=k=>M[k].nome.replace(/\s*\(.*$/,"");
const posAlvo=e=>{const m=M[e.k];return e.role==="out"?pOut(m,e.pt):e.kind==="a"?pIn(m):e.kind==="c"?pCv(m):pGi(m)};
const origemSel=s=>s.t==="o"?[s.k,s.pt]:s.t==="c"&&C[s.i]?[C[s.i][0],C[s.i][3]]:null;
function calcAlvos(s){const r=[];
 if(s.t==="i"){for(const a in M)for(const pt of ptsDe(a,s.kind))if(motivoNao(a,s.k,s.kind,pt)===null)r.push({role:"out",k:a,pt,kind:s.kind});return r}
 const o=origemSel(s);if(!o)return r;
 for(const b in M)for(const kind of["a","c","g"]){const pt=kind==="g"?o[1]:undefined;if(motivoNao(o[0],b,kind,pt)===null)r.push({role:"in",k:b,kind,pt})}
 return r}
function anuncia(s){const n=alvos.length,fora=alvos.filter(e=>{const p=posAlvo(e);return p[0]<14||p[0]>W-14}).length;let t;
 if(s.t==="i")t="entrada de "+TIPO[s.kind]+" · "+nomeCurto(s.k)+": "+(n?n+(n===1?" saída combina":" saídas combinam"):"nada combina agora");
 else{const o=origemSel(s);t=(s.t==="c"?"cipó de ":"saída de ")+nomeCurto(o[0])+(o[1]?" ("+o[1]+")":"")+": "+(n?n+(n===1?" destino possível":" destinos possíveis"):"nenhum destino livre")}
 if(n&&fora)t+=" · "+fora+" fora da tela";
 if(n)t+="<br>toque num que pisca para ligar";
 if(s.t==="c")t+="<br>toque de novo no ponto do cipó para cortar";
 aviso(t)}
function selPorta(s){psel=s;alvos=s?calcAlvos(s):[];alvosC=C;alvosN=C.length;if(s)anuncia(s)}
// toque em saída: liga se havia uma entrada selecionada que combina (devolve true); senão seleciona (e o arrasto pode começar)
function tocaSaida(a,pt){
 if(psel&&psel.t==="i"&&alvos.some(x=>x.k===a&&x.pt===pt)){conecta(a,psel.k,psel.kind,psel.kind==="g"?pt:undefined);selPorta(null);return true}
 if(psel&&psel.t==="o"&&psel.k===a&&psel.pt===pt){togg=true;return false}
 selPorta({t:"o",k:a,pt});return false}
function tocaEntrada(b,kind){
 if(psel&&psel.t!=="i"&&alvos.some(x=>x.k===b&&x.kind===kind)){const o=origemSel(psel);conecta(o[0],b,kind,kind==="g"?o[1]:undefined);selPorta(null);return true}
 if(psel&&psel.t==="i"&&psel.k===b&&psel.kind===kind){selPorta(null);return false}
 selPorta({t:"i",k:b,kind});return false}
function tocaCabo(i){if(psel&&psel.t==="c"&&psel.i===i){corta(i);selPorta(null)}else selPorta({t:"c",i})}
cv.addEventListener("pointerdown",e=>{
 ptr=[e.clientX,e.clientY];down=[e.clientX,e.clientY];togg=false;cv.setPointerCapture(e.pointerId);
 for(const k in M){const m=M[k];
  if(m.pts){let bp=null,bd=24;for(const pt of m.pts){const d=dist(ptr,pOut(m,pt));if(d<bd){bd=d;bp=pt}}if(bp){if(tocaSaida(k,bp))return;drag=k;dport=bp;sel=k;painel();return}}
  else if((m.o||m.g)&&dist(ptr,pOut(m))<26){if(tocaSaida(k,undefined))return;drag=k;dport=undefined;sel=k;painel();return}}
 {let bk=null,bd=26,bkind;for(const k in M){const m=M[k];
   if(m.i){const d=dist(ptr,pIn(m));if(d<bd){bd=d;bk=k;bkind="a"}}
   if(ALV[k]){const d=dist(ptr,pCv(m));if(d<bd){bd=d;bk=k;bkind="c"}}
   if(m.gi){const d=dist(ptr,pGi(m));if(d<bd){bd=d;bk=k;bkind="g"}}}
  if(bk){sel=bk;painel();tocaEntrada(bk,bkind);return}}
 for(const h of hits)if(dist(ptr,h.p)<18){tocaCabo(h.i);return}
 let b=null,dm=1e9;for(const k in M){const d=dist(ptr,pos(M[k]));if(d<dm){dm=d;b=k}}
 if(dm<48){sel=b;painel();selPorta(null)}else pan={x:e.clientX,c:cam,mv:0};
});
cv.addEventListener("pointermove",e=>{ptr=[e.clientX,e.clientY];if(pan){if(Math.abs(e.clientX-pan.x)>8)pan.mv=1;cam=Math.max(W-W*2,Math.min(0,pan.c+e.clientX-pan.x))}});
cv.addEventListener("pointerup",e=>{
 if(pan&&!pan.mv)selPorta(null);pan=null;
 if(drag){const q=[e.clientX,e.clientY];
  if(dist(q,down)<14){if(togg)selPorta(null)}
  else{let b=null,kd,dm=34;
   for(const k in M){if(M[k].i){const d=dist(q,pIn(M[k]));if(d<dm){dm=d;b=k;kd="a"}}if(ALV[k]){const d=dist(q,pCv(M[k]));if(d<dm){dm=d;b=k;kd="c"}}if(M[k].gi){const d=dist(q,pGi(M[k]));if(d<dm){dm=d;b=k;kd="g"}}}
   if(b)conecta(drag,b,kd,kd==="g"?dport:undefined);selPorta(null)}
  drag=null}
});
cv.addEventListener("pointercancel",()=>{pan=null;drag=null});
const arv=Array.from({length:22},()=>({x:Math.random(),h:.25+Math.random()*.5,f:Math.random()*6,z:Math.random()}));
const rgba=(hex,a)=>{const n=parseInt(hex.slice(1),16);return"rgba("+(n>>16)+","+(n>>8&255)+","+(n&255)+","+a+")"};
const DG=[2,6],DC=[7,5],DN=[];const tri=(px,py,s)=>{g.beginPath();g.moveTo(px-s*.8,py-s);g.lineTo(px+s,py);g.lineTo(px-s*.8,py+s);g.closePath()};
function planta(k,m,t){
 const [x,y]=pos(m);if(x<-80||x>W+80)return;
 const e=E[k],r=1+e*.3,c=m.cor,s=k===sel,sw=Math.sin(t*1.3+x)*3;
 g.save();g.translate(x,y);g.scale(.75,.75);
 g.shadowColor=c;g.shadowBlur=LQ?0:8+e*26+(s?10:0);g.strokeStyle=rgba(c,.55+e*.45);g.fillStyle=rgba(c,.12+e*.5);g.lineWidth=2.2;
 const L=(...a)=>{g.beginPath();g.moveTo(a[0],a[1]);for(let i=2;i<a.length;i+=2)g.lineTo(a[i],a[i+1]);g.stroke()};
 if(k==="kick"){L(-6,26,-4,0,0,-6,4,0,6,26);g.beginPath();g.ellipse(0,-8,34*r,22*r,0,Math.PI,0);g.closePath();g.fill();g.stroke()}
 else if(k==="bass"){for(let i=-3;i<=3;i++){g.beginPath();g.moveTo(0,30);g.bezierCurveTo(i*14,10,i*20+sw,-10,i*26*r+sw,-34+Math.abs(i)*4);g.stroke()}g.beginPath();g.arc(0,30,9*r,0,7);g.fill()}
 else if(k==="fm"){L(0,30,sw,0,0,-26);for(let i=0;i<9;i++){const a=-1.57+(i-4)*.32,l=(18+e*22)*1.4*(1-Math.abs(i-4)*.07);L(0,-10,Math.cos(a)*l+sw,-10+Math.sin(a)*l)}}
 else if(k==="hat"){for(let i=0;i<9;i++){const a=i*2.4+t*.4,d=8+i*3+e*14;g.beginPath();g.arc(Math.cos(a)*d,Math.sin(a)*d,1.5+e*2.5,0,7);g.fill()}}
 else if(k==="ladder"){L(0,32,0,-30);for(let i=0;i<4;i++){const yy=24-i*16,w=(24-i*3)*(1+e*.2);g.beginPath();g.ellipse(-w/2,yy,w/2,5,-.5,0,7);g.ellipse(w/2,yy-6,w/2,5,.5,0,7);g.fill();g.stroke()}}
 else if(k==="fold"){g.beginPath();g.moveTo(-34,0);for(let i=0;i<=34;i++)g.lineTo(-34+i*2,Math.sin(i*.55+t*2)*(10+e*20)*Math.sin(i/34*3.14));g.stroke();L(0,10,0,34)}
 else if(k==="crush"){for(let i=0;i<5;i++)for(let j=0;j<3;j++){if((i*7+j*3)%4===0&&e<.2)continue;g.fillRect(-30+i*12,-16+j*12,9,9)}}
 else if(k==="eco"){for(let i=1;i<=4;i++){g.globalAlpha=1-i*.2;g.beginPath();g.arc(0,0,i*9*(1+e*.2),0,7);g.stroke()}g.globalAlpha=1}
 else if(k==="seq"){const vb=vis.b%16;for(let i=0;i<16;i++){const a=i/16*6.283-1.57,on=S.k[i]||S.b[i]>=0;g.globalAlpha=i===vb?1:on?.6:.2;g.beginPath();g.arc(Math.cos(a)*28,Math.sin(a)*28,i===vb?5:3,0,7);g.fill()}g.globalAlpha=1;g.beginPath();g.arc(0,0,14,0,7);g.stroke()}
 else if(k==="clk"){g.beginPath();g.arc(0,0,22*r,0,7);g.stroke();for(let i=0;i<12;i++){const q=i/12*6.283-1.57,l=i%3?27:33;L(Math.cos(q)*22,Math.sin(q)*22,Math.cos(q)*l,Math.sin(q)*l)}const w=t*.6;L(0,0,Math.cos(w)*16,Math.sin(w)*16);g.beginPath();g.arc(0,0,4+e*5,0,7);g.fill()}
 else if(k==="div"){L(0,32,0,2);L(0,2,-24,-22);L(0,2,24,-22);for(const X of [-24,24,0]){g.beginPath();g.arc(X,X?-22:2,3+e*5,0,7);g.fill()}}
 else if(k==="euc"){const n=1+Math.round(P("euc","passos")*15),h=Math.round(P("euc","pulsos")*n);g.globalAlpha=.35;g.beginPath();g.arc(0,0,26,0,7);g.stroke();g.globalAlpha=1;for(let i=0;i<n;i++){const q=i/n*6.283-1.57,hit=(i*h)%n<h;g.beginPath();g.arc(Math.cos(q)*26,Math.sin(q)*26,hit?4.5+e*2.5:2,0,7);if(hit)g.fill();else g.stroke()}}
 else if(k==="prob"){g.strokeRect(-18,-18,36,36);for(const [X,Y] of [[-9,-9],[9,-9],[0,0],[-9,9],[9,9]]){g.beginPath();g.arc(X,Y,2.5+e*2.5,0,7);g.fill()}}
 else if(k==="sh"){L(-32,8,-16,8,-16,-12,0,-12,0,18,16,18,16,-4,32,-4);g.beginPath();g.arc(32,-4,3+e*5,0,7);g.fill()}
 else if(k==="qnt"){L(-32,24,-32,12,-16,12,-16,0,0,0,0,-12,16,-12,16,-24,32,-24);g.beginPath();g.arc(32,-24,3+e*5,0,7);g.fill()}
 else if(k==="dur"){const w=8+P("dur","dur")*40;L(-34,16,-28,16,-28,-16,-28+w,-16,-28+w,16,34,16);g.beginPath();g.arc(-28+w/2,-16,3+e*5,0,7);g.fill()}
 else if(k==="vca"){g.beginPath();g.moveTo(-26,-24);g.lineTo(26,0);g.lineTo(-26,24);g.closePath();g.fill();g.stroke();L(-34,0,-26,0)}
 else if(k[0]==="l"){const A=8+P(k,"prof")*18,f=lfoHz(m.p,bpm);g.beginPath();for(let i=0;i<=40;i++){const X=-34+i*1.7;g.lineTo(X,Math.sin(i*.4-t*Math.min(f,6)*3)*A)}g.stroke();g.beginPath();g.arc(0,0,3+e*4,0,7);g.fill()}
 else if(k[0]==="e"){g.beginPath();g.moveTo(-32,20);g.quadraticCurveTo(-26,-26*(.5+e*.5),-20,-26*(.5+e*.5));g.quadraticCurveTo(0,10,32,20);g.closePath();g.fill();g.stroke()}
 else{g.fillStyle=rgba(c,.3+beat*.6);g.shadowBlur=LQ?0:18+beat*30;g.beginPath();g.arc(0,0,14+beat*8,0,7);g.fill();g.beginPath();g.arc(0,0,26,0,7);g.stroke()}
 if(s){g.shadowBlur=0;g.setLineDash([3,5]);g.strokeStyle=rgba(c,.7);g.beginPath();g.arc(0,0,46,0,7);g.stroke()}
 g.restore();g.shadowBlur=0;g.lineWidth=2;
 if(m.o){const [px,py]=pOut(m),q=drag===k?3:0;g.fillStyle=rgba(c,.9);g.strokeStyle="#000";g.beginPath();
  if(m.p.prof!==undefined||m.p.gate!==undefined)g.rect(px-7-q,py-7-q,14+2*q,14+2*q);else g.arc(px,py,7+q,0,7);g.fill()}
 if(m.g&&!m.o&&!m.pts){const [px,py]=pOut(m);g.fillStyle=rgba(c,.95);tri(px,py,7+(drag===k?3:0));g.fill()}
 if(m.pts)m.pts.forEach(pt=>{const [px,py]=pOut(m,pt);g.fillStyle=rgba(PC[pt],.95);tri(px,py,5+(E[k+":"+pt]||0)*3+(drag===k&&dport===pt?3:0));g.fill();g.font="9px "+FONTE;g.fillStyle="#d8f5ea";g.fillText(pt,px+9,py+3)});
 if(m.i){const [px,py]=pIn(m);g.strokeStyle=rgba(c,.95);g.fillStyle="#05060a";g.beginPath();g.arc(px,py,7,0,7);g.fill();g.stroke()}
 if(m.gi){const [px,py]=pGi(m);g.strokeStyle=rgba(c,.95);g.fillStyle="#05060a";tri(px,py,7);g.fill();g.stroke()}
 if(ALV[k]){const [px,py]=pCv(m);g.strokeStyle=rgba(c,.95);g.fillStyle="#05060a";g.beginPath();g.moveTo(px,py-8);g.lineTo(px+8,py);g.lineTo(px,py+8);g.lineTo(px-8,py);g.closePath();g.fill();g.stroke()}
}
function cabo(a,b,cor,t,e,dash){
 const mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2+26+Math.abs(a[0]-b[0])*.12+Math.sin(t*1.5+a[1])*3;
 g.strokeStyle=rgba(cor,.3+e*.6);g.lineWidth=2.5;g.shadowColor=cor;g.shadowBlur=LQ?0:e*14;g.setLineDash(dash===true?DC:dash||DN);
 g.beginPath();g.moveTo(a[0],a[1]);g.quadraticCurveTo(mx,my,b[0],b[1]);g.stroke();g.shadowBlur=0;g.setLineDash(DN);
 const q=u=>{const v=1-u;return[v*v*a[0]+2*v*u*mx+u*u*b[0],v*v*a[1]+2*v*u*my+u*u*b[1]]};
 const u=(t*.45+a[1]*.003)%1,p=q(u);g.fillStyle=rgba(cor,.5+e*.5);g.beginPath();g.arc(p[0],p[1],2.5+e*3,0,7);g.fill();
 return q(.5);
}
// v0.7.7: anel fixo na porta selecionada; anéis que piscam suave em tudo que combina (e seta na borda se o destino está fora da tela)
function destaques(t){
 if(!psel)return;
 if(psel.t==="c"&&!C[psel.i]){selPorta(null);return}
 if(alvosC!==C||alvosN!==C.length){alvos=calcAlvos(psel);alvosC=C;alvosN=C.length}
 const pl=REDUZ?.8:.5+.5*Math.sin(t*5.2),o=psel.t==="i"?null:origemSel(psel),corO=o?(o[1]?PC[o[1]]:M[o[0]].cor):null;
 g.save();g.setLineDash(DN);g.font="10px "+FONTE;
 const sp=psel.t==="i"?posAlvo({role:"in",k:psel.k,kind:psel.kind}):pOut(M[o[0]],o[1]),sc=psel.t==="i"?M[psel.k].cor:corO;
 g.lineWidth=2;g.strokeStyle=rgba(sc,.95);g.shadowColor=sc;g.shadowBlur=LQ?0:14;g.beginPath();g.arc(sp[0],sp[1],17,0,7);g.stroke();
 g.shadowBlur=0;g.setLineDash([4,4]);g.beginPath();g.arc(sp[0],sp[1],22,0,7);g.stroke();g.setLineDash(DN);
 for(const e of alvos){const p=posAlvo(e),cor=e.role==="out"?(e.pt?PC[e.pt]:M[e.k].cor):corO;
  if(p[0]<14||p[0]>W-14){const L=p[0]<14,x=L?10:W-10,y=Math.max(70,Math.min(H-70,p[1])),s=L?-6:6;g.fillStyle=rgba(cor,.35+.5*pl);g.beginPath();g.moveTo(x+s,y);g.lineTo(x-s,y-6);g.lineTo(x-s,y+6);g.closePath();g.fill();continue}
  g.lineWidth=2;g.shadowColor=cor;g.shadowBlur=LQ?0:6+10*pl;g.strokeStyle=rgba(cor,.35+.6*pl);g.fillStyle=rgba(cor,.08+.16*pl);
  g.beginPath();g.arc(p[0],p[1],13+3*pl,0,7);g.fill();g.stroke();g.shadowBlur=0;
  const lab=e.role==="in"?(e.kind==="c"?ALV[e.k].map(x=>x[0]).join(" · "):TIPO[e.kind]):nomeCurto(e.k)+(e.pt?" "+e.pt:"");
  g.textAlign=e.role==="in"&&e.kind==="c"?"center":e.role==="in"?"right":"left";
  const tx=e.role==="in"?(e.kind==="c"?p[0]:p[0]-18):p[0]+(M[e.k].pts?24:18),ty=e.role==="in"&&e.kind==="c"?p[1]-17:p[1]+4;
  g.lineWidth=3;g.strokeStyle="rgba(5,6,10,.85)";g.strokeText(lab,tx,ty);g.fillStyle="#d8f5ea";g.fillText(lab,tx,ty)}
 g.restore();g.shadowBlur=0;g.lineWidth=2}
const bins=new Uint8Array(128),pb=new Float32Array(1024);let fr=0,pm=0,clipAte=0;
function quadro(){
 const t=performance.now()/1000;fhPasso();
 if(ctx)for(let i=0;i<evs.length;){if(evs[i].t<=ctx.currentTime){const v=evs.splice(i,1)[0];E[v.m]=1;if(v.m==="seq"&&v.tr)vis[v.tr]=v.i}else i++}
 for(const k in E)E[k]*=.93;
 for(const k of ["lfo1","lfo2"]){const m=M[k],ph=(ctx&&m.osc?ctx.currentTime-(m.rt||0):t)*Math.min(lfoHz(m.p,bpm),8);E[k]=.5+.5*Math.sin(ph*6.283)*m.p.prof}
 beat=Math.max(beat*.92,E.kick);if(an)an.getByteFrequencyData(bins);fr++;
 if(pk){pk.getFloatTimeDomainData(pb);let m=0;for(let i=0;i<1024;i++){const a=Math.abs(pb[i]);if(a>m)m=a}if(m>pm)pm=m}
 if(vis.k!==pvk||vis.b!==pvb||vis.h!==pvh){pvk=vis.k;pvb=vis.b;pvh=vis.h;if(sel==="seq")document.querySelectorAll(".gr button").forEach(b=>b.classList.toggle("now",+b.dataset.i===vis[b.dataset.tr]))}
g.drawImage(bgc,0,0,W,H);if(beat>.02){g.globalAlpha=Math.min(1,beat);g.drawImage(flc,0,0,W,H);g.globalAlpha=1}


 for(const a of arv){const x=a.x*W+cam*.2*a.z,b=FH()+60+40*a.z,h=a.h*FH()*(.6+a.z*.5)*1.3,sw=Math.sin(t*.8+a.f)*4*a.z;
  g.strokeStyle="rgba(29,107,74,"+(.2+a.z*.35)+")";g.lineWidth=3+a.z*7;g.beginPath();g.moveTo(x,b);g.quadraticCurveTo(x+sw,b-h/2,x+sw*2,b-h);g.stroke();
  g.fillStyle=rgba("#2dffe0",.05+beat*.22*a.z);g.beginPath();g.arc(x+sw*2,b-h,3+a.z*5+beat*4,0,7);g.fill()}
 g.fillStyle="#e8ff5a";
 for(let i=0;i<48;i+=LQ?2:1){const v=bins[i+2]/255;if(v<.05)continue;g.globalAlpha=v;g.beginPath();g.arc((i/48)*W+Math.sin(t+i)*10,FH()*.5+Math.cos(t*.7+i*1.7)*FH()*.35,1+v*3,0,7);g.fill()}
 g.globalAlpha=1;hits=[];
 C.forEach((c,i)=>{const a=M[c[0]],b=M[c[1]],kd=c[2],cor=c[3]?PC[c[3]]:a.cor,p0=pOut(a,c[3]),p1=kd==="c"?pCv(b):kd==="g"?pGi(b):pIn(b);if(Math.max(p0[0],p1[0])<-40||Math.min(p0[0],p1[0])>W+40)return;const p=cabo(p0,p1,cor,t,(psel&&psel.t==="c"&&psel.i===i)?1:E[c[3]?c[0]+":"+c[3]:c[0]]||0,kd==="c"?true:kd==="g"?DG:false);hits.push({i,p});
  g.fillStyle="#05060a";g.strokeStyle=cor;g.lineWidth=1.5;g.beginPath();g.arc(p[0],p[1],5,0,7);g.fill();g.stroke();
  if(psel&&psel.t==="c"&&psel.i===i){g.fillStyle="#05060a";g.strokeStyle="#fff";g.lineWidth=2;g.beginPath();g.arc(p[0],p[1],9,0,7);g.fill();g.stroke();g.beginPath();g.moveTo(p[0]-3.5,p[1]-3.5);g.lineTo(p[0]+3.5,p[1]+3.5);g.moveTo(p[0]+3.5,p[1]-3.5);g.lineTo(p[0]-3.5,p[1]+3.5);g.stroke()}});
 if(drag)cabo(pOut(M[drag],dport),ptr,dport?PC[dport]:M[drag].cor,t,.5,false);
 for(const k in M)planta(k,M[k],t);
 destaques(t);
 requestAnimationFrame(quadro);
}
const hud=document.getElementById("hud");
setInterval(()=>{
 const fps=Math.round(fr*2);fr=0;if(voz>vozPico)vozPico=voz;if(fps<45&&playing)LQ=true;if(pm>1)clipAte=performance.now()+2500;
 const db=pm>0?Math.round(20*Math.log10(pm)):-99;pm=0;
 const lat=ctx?Math.round(((ctx.baseLatency||0)+(ctx.outputLatency||0))*1000):0;
 hud.textContent=fps+" fps · pico "+(db<-90?"—":db+" dB")+" · lat "+lat+" ms · vozes "+voz+" · relógio +"+Math.round(atrasoMax)+" ms · "+(ctx?(ok?"DSP worklet":"DSP nativo"+(FORCA_NATIVO?" (forçado)":!window.isSecureContext?" (origem não segura)":erroWk?" ("+erroWk+")":"")):"parado")+(LQ?" · visual leve":"")+(DIAG?" · diag: estouros "+estouros+" · atraso pico "+Math.round(atrasoPico)+" ms · vozes pico "+vozPico+" · fila "+evs.length+" · ctx "+(ctx?ctx.state:"-"):"");
 atrasoMax=0;hud.classList.toggle("clip",performance.now()<clipAte);
},500);
quadro();
