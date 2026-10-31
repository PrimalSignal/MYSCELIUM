// Testes do Micélio. Uso (na raiz do repositório): node tools/build.js && node tests/logica.test.js dist/micelio-single.html [versao-anterior.html]
// O segundo arquivo (opcional) liga os testes de compatibilidade entre versões.
// Recriado na v0.5.5 a partir da descrição do prompt mestre: não é idêntico à suíte antiga de 50 testes.
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const path = require('path'), cp = require('child_process');
const RAIZ = path.join(__dirname, '..');
const ARQ = process.argv[2] || path.join(RAIZ, 'dist', 'micelio-single.html'), ANT = process.argv[3] || null;

const fila = [];
const T = (nome, f) => fila.push([nome, f]);

// ---------- extração da lógica pura ----------
const blocos = html => html.split('<script>').slice(1).map(b => b.split('</script>')[0]); // o último bloco é o app; o anterior (se houver) é o worklet embutido
function puras(arq) {
  const js = blocos(fs.readFileSync(arq, 'utf8')).pop();
  const code = js.split('/*PURO*/')[1].split('/*FIMPURO*/')[0];
  const nomes = ['LFOMULT', 'lfoHz', 'clkT', 'clkSaidas', 'migraCabos', 'comp', 'proximo', 'normS', 'nota', 'gateLen', 'gateDur', 'envPlan']
    .filter(n => new RegExp('(const|function) ' + n + '\\b').test(code));
  return new Function(code + ';return {' + nomes.join(',') + '}')();
}

// ---------- ambiente de mentira ----------
function fakeParam() {
  const p = { value: 0, calls: [], lastVal: 0 };
  for (const m of ['setValueAtTime', 'linearRampToValueAtTime', 'exponentialRampToValueAtTime', 'setTargetAtTime', 'cancelScheduledValues'])
    p[m] = (...a) => { p.calls.push([m, ...a]); if (m === 'setValueAtTime') p.lastVal = a[1]; return p; };
  p.valueAtTime = (t) => p.lastVal;
  return p;
}
const PARAMS = ['gain', 'frequency', 'detune', 'offset', 'Q', 'delayTime', 'threshold', 'ratio', 'fold', 'bias'];
class No {
  constructor(kind) { this.kind = kind; this.con = []; for (const n of PARAMS) this[n] = fakeParam(); this.fftSize = 0; }
  connect(x) { this.con.push(x); return x; }
  disconnect(x) { this.con = x ? this.con.filter(y => y !== x) : []; }
  start() {} stop() { this.stopped = true; }
  getByteFrequencyData() {} getFloatTimeDomainData(a) { a.fill(0); }
}
class AC {
  constructor() {
    this.currentTime = 0; this.sampleRate = 44100; this.baseLatency = 0; this.outputLatency = 0; this.state = 'running';
    this.destination = new No('dest'); this.audioWorklet = { addModule: () => Promise.reject(new Error('bloqueado')) };
  }
  resume() { return Promise.resolve(); }
  createBuffer(c, n) { return { getChannelData: () => new Float32Array(n) }; }
}
for (const n of ['Gain', 'Oscillator', 'ConstantSource', 'BiquadFilter', 'WaveShaper', 'Delay', 'DynamicsCompressor', 'Analyser', 'BufferSource'])
  AC.prototype['create' + n] = function () { return new No(n); };

const ctx2d = new Proxy({}, {
  get: (t, k) => k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : (k in t ? t[k] : () => {}),
  set: (t, k, v) => { t[k] = v; return true; }
});
function el() {
  return {
    style: {}, classList: { toggle() {}, add() {}, remove() {} }, dataset: {}, children: [], value: '', textContent: '', innerHTML: '',
    appendChild(c) { this.children.push(c); return c; }, addEventListener() {}, setPointerCapture() {},
    getContext() { return ctx2d; }, querySelectorAll() { return []; }
  };
}
const SEED = 'Math.random=(()=>{let s=12345;return()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}})();\n';

class AWN extends No {
  constructor(c, nome) { super('worklet:' + nome); this.nome = nome; this.pp = {}; this.parameters = { get: n => this.pp[n] || (this.pp[n] = fakeParam()) }; }
}
// opts: worklet (addModule resolve e AudioWorkletNode existe), https (isSecureContext), search (location.search)
function carrega(arq, store, opts) {
  opts = opts || {};
  const ls = Object.assign({}, store || {}), elems = {}, urls = [];
  const partes = arq.endsWith('.js') ? [fs.readFileSync(arq, 'utf8')] : blocos(fs.readFileSync(arq, 'utf8'));
  let app = partes.pop();
  const antes = app;
  app = app.replace('const conta=o=>{voz++;o.onended=()=>voz--};', 'const conta=o=>{};');
  assert.notStrictEqual(app, antes, 'não achei a função conta para neutralizar');
  const sb = {
    document: {
      getElementById: id => elems[id] || (elems[id] = el()), createElement: () => el(), querySelectorAll: () => [],
      addEventListener() {}, hidden: false
    },
    localStorage: { getItem: k => Object.prototype.hasOwnProperty.call(ls, k) ? ls[k] : null, setItem: (k, v) => { ls[k] = String(v); } },
    performance: { now: () => Date.now() }, setInterval: () => 0, clearInterval() {}, setTimeout: () => 0, clearTimeout() {},
    requestAnimationFrame() {}, addEventListener() {}, devicePixelRatio: 1, innerWidth: 400, innerHeight: 800, isSecureContext: !!opts.https,
    location: { search: opts.search || '' },
    URL: { createObjectURL: () => 'blob:x' }, Blob: class {}, AudioWorkletNode: opts.worklet ? AWN : undefined,
    AudioContext: class extends AC {
      constructor() { super(); this.audioWorklet = { addModule: u => { urls.push(u); return opts.worklet ? Promise.resolve() : Promise.reject(new Error('bloqueado')); } }; }
    }
  };
  sb.window = sb;
  vm.createContext(sb);
  for (const p of partes) vm.runInContext(p, sb);
  vm.runInContext(SEED + app, sb);
  const run = s => vm.runInContext(s, sb);
  return { sb, ls, elems, urls, run, j: e => JSON.parse(run('JSON.stringify(' + e + ')')) };
}
async function roda(h, passos) {
  await h.run('iniciar()');
  h.sb.document.getElementById('msg').innerHTML = '';
  h.run('PS={k:{},b:{},h:{}};cnt=0;prox=.06;playing=true');
  for (let i = 0; i < passos; i++) { h.run('ctx.currentTime=' + (i * 0.025)); h.run('relogio()'); }
  assert.ok(!/erro/.test(String(h.sb.document.getElementById('msg').innerHTML)), 'o relógio gerou erro: ' + h.sb.document.getElementById('msg').innerHTML);
}
const near = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) <= e, a + ' ≠ ' + b);

// ---------- lógica pura ----------
const U = puras(ARQ);
T('puro: gateLen nas pontas, no padrão e com entradas ruins', () => {
  near(U.gateLen(0), .25); near(U.gateLen(1), 8); near(U.gateLen(.4), 1, 1e-9);
  near(U.gateLen(-3), .25); near(U.gateLen(9), 8); near(U.gateLen(NaN), .25); near(U.gateLen(undefined), .25);
});
T('puro: gateLen é estritamente crescente', () => { let p = 0; for (let i = 0; i <= 100; i++) { const x = U.gateLen(i / 100); assert.ok(x > p); p = x; } });
T('puro: gateDur escala com a semicolcheia', () => { near(U.gateDur(.4, .075), .075, 1e-9); near(U.gateDur(1, .1), .8); near(U.gateDur(0, .1), .025); });
T('puro: envPlan modo curto igual à fórmula da v0.5.4', () => {
  for (const [a, q] of [[0, 0], [.05, .35], [1, 1], [.5, .5]]) {
    const e = U.envPlan(0, a, q, 5); near(e.a, .002 + a * .2); near(e.tau, .02 + q * .5); near(e.h, e.a);
  }
});
T('puro: envPlan modo gate segura pela duração', () => { const e = U.envPlan(1, .05, .35, .5); near(e.h, .5); near(e.a, .012); near(e.tau, .195); });
T('puro: envPlan modo gate com duração menor que o ataque ou ausente cai no ataque', () => {
  near(U.envPlan(1, .5, .3, .01).h, .102); near(U.envPlan(1, .5, .3, undefined).h, .102); near(U.envPlan(1, .5, .3, 0).h, .102);
});
T('puro: comp, proximo, normS', () => {
  assert.strictEqual(U.comp(0), 1); assert.strictEqual(U.comp(1), 32); assert.strictEqual(U.comp(15 / 31), 16); assert.strictEqual(U.comp('x'), 1);
  let st = {}, r = []; for (let i = 0; i < 6; i++) r.push(U.proximo(st, 4, 0)); assert.deepStrictEqual(r, [0, 1, 2, 3, 0, 1]);
  st = {}; r = []; for (let i = 0; i < 6; i++) r.push(U.proximo(st, 4, 1)); assert.deepStrictEqual(r, [3, 2, 1, 0, 3, 2]);
  st = {}; r = []; for (let i = 0; i < 8; i++) r.push(U.proximo(st, 3, 2)); assert.deepStrictEqual(r, [0, 1, 2, 1, 0, 1, 2, 1]);
  const s = U.normS({ k: [5, -2, 'x'], b: [99], h: [3], a: [2] });
  assert.strictEqual(s.k.length, 32); assert.strictEqual(s.k[0], 1); assert.strictEqual(s.k[1], 0); assert.strictEqual(s.b[0], 11); assert.strictEqual(s.b[1], -1);
  assert.strictEqual(s.h[0], 2); assert.strictEqual(s.a[0], 1); assert.strictEqual(U.normS(null).k.length, 32);
});
T('puro: lfoHz livre e sincronizado', () => {
  near(U.lfoHz({ sync: 0, taxa: 0 }, 120), .05); near(U.lfoHz({ sync: 0, taxa: 1 }, 120), 20);
  near(U.lfoHz({ sync: 1, ciclo: 4 }, 120), 1 / (60 / 120 / 4 * 16)); near(U.lfoHz({ sync: 1, ciclo: 0 }, 120), 1 / (60 / 120 / 4));
});
T('puro: clkT só atrasa os ímpares', () => { near(U.clkT(0, 1, .1, .5), 1); near(U.clkT(1, 1, .1, .5), 1.025); near(U.clkT(2, 1, .1, .5), 1); });
T('puro: clkSaidas conta as portas certas', () => {
  const nome = c => U.clkSaidas(c, 0, .1, .1).map(x => x[0]).join(',');
  assert.strictEqual(nome(0), '1,÷2,÷4,×2,×2,×3,×3,×3'); assert.strictEqual(nome(1), '1,×2,×2,×3,×3,×3');
  assert.strictEqual(nome(2), '1,÷2,×2,×2,×3,×3,×3'); assert.strictEqual(nome(4), '1,÷2,÷4,×2,×2,×3,×3,×3');
  const x3 = U.clkSaidas(0, 1, .3, .075).filter(x => x[0] === '×3'); near(x3[1][1], 1.1); near(x3[2][2], .1);
});
T('puro: migraCabos leva clk sem porta para a porta 1', () => {
  assert.deepStrictEqual(U.migraCabos([['clk', 'seq', 'g'], ['clk', 'seq', 'g', '÷2'], ['kick', 'out', 'a']]), [['clk', 'seq', 'g', '1'], ['clk', 'seq', 'g', '÷2'], ['kick', 'out', 'a']]);
});

// ---------- carga e preset ----------
T('carga: sem salvamento, o padrão de fábrica tem os módulos novos e nenhum cabo neles', () => {
  const h = carrega(ARQ);
  assert.ok(h.j('M.dur') && h.j('M.vca'));
  assert.strictEqual(h.j('C.length'), 18);
  assert.strictEqual(h.j('C.filter(c=>c[0]==="dur"||c[1]==="dur"||c[0]==="vca"||c[1]==="vca").length'), 0);
  assert.strictEqual(h.j('bpm'), 200);
  assert.strictEqual(h.j('M.env1.p.modo'), 0); assert.strictEqual(h.j('M.env2.p.modo'), 0);
  assert.strictEqual(h.j('M.dur.p.dur'), .4); assert.strictEqual(h.j('M.vca.p.base'), 0);
  assert.strictEqual(h.j('JSON.stringify(S)===JSON.stringify(normS(S))'), true);
});
T('carga: ids dos módulos antigos continuam todos presentes', () => {
  const h = carrega(ARQ);
  for (const k of 'kick bass fm hat ladder fold crush seq lfo1 lfo2 env1 env2 clk div euc prob sh qnt eco out'.split(' ')) assert.ok(h.j('M.' + k), k);
});
T('carga: painel abre para todos os módulos sem erro e o env mostra a opção modo', () => {
  const h = carrega(ARQ);
  for (const k of h.j('Object.keys(M)')) h.run('sel="' + k + '";painel()');
  assert.deepStrictEqual(h.j('opts("env1","modo")'), ['curto', 'gate']);
  assert.deepStrictEqual(h.j('opts("vca","alvo")'), ['nível']);
});
T('carga: chave de salvamento continua micelio42 e guarda os parâmetros novos', () => {
  const h = carrega(ARQ);
  h.run('M.env1.p.modo=1;M.dur.p.dur=.7;M.vca.p.base=.3;C.push(["clk","dur","g","1"],["dur","env1","g"]);save()');
  assert.deepStrictEqual(Object.keys(h.ls), ['micelio42']);
  const s = JSON.parse(h.ls.micelio42);
  assert.strictEqual(s.p.env1.modo, 1); assert.strictEqual(s.p.dur.dur, .7); assert.strictEqual(s.p.vca.base, .3);
  const h2 = carrega(ARQ, h.ls);
  assert.strictEqual(h2.j('M.env1.p.modo'), 1); assert.strictEqual(h2.j('M.dur.p.dur'), .7); assert.strictEqual(h2.j('M.vca.p.base'), .3);
  assert.strictEqual(h2.j('C.filter(c=>c[1]==="dur"||c[0]==="dur").length'), 2);
});
T('carga: salvamento sem os módulos novos (formato antigo) carrega e usa os padrões', () => {
  const h0 = carrega(ARQ); h0.run('save()');
  const s = JSON.parse(h0.ls.micelio42); delete s.p.dur; delete s.p.vca; delete s.p.env1.modo; delete s.p.env2.modo;
  const h = carrega(ARQ, { micelio42: JSON.stringify(s) });
  assert.strictEqual(h.j('M.dur.p.dur'), .4); assert.strictEqual(h.j('M.env1.p.modo'), 0); assert.strictEqual(h.j('C.length'), 18);
});
T('carga: lê micelio41 se micelio42 não existir e dados ruins viram aviso sem quebrar', () => {
  const h0 = carrega(ARQ); h0.run('save()');
  const h = carrega(ARQ, { micelio41: h0.ls.micelio42 }); assert.strictEqual(h.j('C.length'), 18);
  const h2 = carrega(ARQ, { micelio42: '{lixo' }); assert.strictEqual(h2.j('C.length'), 18);
  assert.ok(/não consegui ler/.test(h2.sb.document.getElementById('msg').innerHTML));
});
if (ANT) {
  T('compat: preset de fábrica da versão anterior é idêntico (parâmetros, cabos, padrão, BPM)', () => {
    const a = carrega(ANT), b = carrega(ARQ);
    for (const k of a.j('Object.keys(M)')) {
      const pa = a.j('M.' + k + '.p'), pb = b.j('M.' + k + '.p');
      for (const q in pa) assert.deepStrictEqual(pb[q], pa[q], k + '.' + q);
    }
    assert.strictEqual(JSON.stringify(a.j('C')), JSON.stringify(b.j('C'))); for (const t of ['k', 'b', 'h', 'a']) assert.deepStrictEqual(b.j('S.' + t), a.j('S.' + t), 'S.' + t); // v0.6.0 acrescenta S.o (oitava por passo); o resto do padrão é idêntico
    assert.strictEqual(a.j('bpm'), b.j('bpm'));
  });
  T('compat: save da versão anterior carrega na nova sem perda', () => {
    const a = carrega(ANT); a.run('M.kick.p.drive=.9;S.k[1]=1;save()');
    const b = carrega(ARQ, a.ls);
    assert.strictEqual(b.j('M.kick.p.drive'), .9); assert.strictEqual(b.j('S.k[1]'), 1); assert.strictEqual(b.j('C.length'), 18);
  });
  T('compat: save da nova versão com cabos novos carrega na anterior sem quebrar (cabos desconhecidos são descartados)', () => {
    const b = carrega(ARQ); b.run('C.push(["clk","dur","g","1"],["vca","out","a"]);save()');
    const a = carrega(ANT, b.ls); assert.strictEqual(a.j('C.length'), a.j('!!M.dur') ? 20 : 18);
  });
  T('som: o modo curto do envelope gera a mesma automação da versão anterior', async () => {
    const out = [];
    for (const f of [ANT, ARQ]) { const h = carrega(f); await h.run('iniciar()'); h.run('dispEnv("env1",1,{})'); out.push(JSON.stringify(h.j('M.env1.cs.offset.calls'))); }
    assert.strictEqual(out[0], out[1]); assert.ok(out[0].includes('setTargetAtTime'));
  });
}

// ---------- áudio de mentira ----------
T('áudio: regressões do eco, das curvas e do CV do corte', async () => {
  const h = carrega(ARQ); await h.run('iniciar()');
  const ce = h.j('Array.from(curvaEco())'); assert.strictEqual(ce.length % 2, 1); assert.strictEqual(ce[(ce.length - 1) / 2], 0);
  near(ce[513] - ce[512], 1 / 512, 1e-4);
  for (let i = 0; i < ce.length; i++) near(ce[i], -ce[ce.length - 1 - i], 1e-9);
  const cv = h.j('Array.from(curva(.5))'); assert.strictEqual(cv.length % 2, 1); assert.strictEqual(cv[(cv.length - 1) / 2], 0);
  assert.ok(h.j('fbg.gain.value') < 1, 'ganho do laço do eco precisa ser < 1');
  near(h.j('ALV.ladder[0][2]()'), h.j('cutBase()') * 1.5);
});
T('áudio: VCA cria nó, ganho base e CV ligado ao ganho', async () => {
  const h = carrega(ARQ); await h.run('iniciar()');
  assert.strictEqual(h.run('M.vca.i===M.vca.o'), true); assert.strictEqual(h.j('M.vca.o.gain.value'), 0);
  h.run('M.vca.p.base=.3;aplicar()'); assert.ok(h.j('M.vca.o.gain.calls').length > 0, 'deve ter chamadas de automação');
  assert.strictEqual(h.run('M.vca.c.con.includes(M.vca.o.gain)'), true, 'o CV deveria estar ligado ao ganho do VCA');
  near(h.j('ALV.vca[0][2]'), 2);
});
T('áudio: cabos novos (áudio, CV e gate) com as mesmas regras de validação', async () => {
  const h = carrega(ARQ); await h.run('iniciar()');
  h.run('conecta("fm","vca","a");conecta("vca","out","a");conecta("env1","vca","c");conecta("clk","dur","g","1");conecta("dur","env1","g")');
  assert.strictEqual(h.run('M.fm.o.con.includes(M.vca.i)'), true); assert.strictEqual(h.run('M.vca.o.con.includes(master)'), true);
  assert.strictEqual(h.run('M.env1.o.con.includes(M.vca.c)'), true);
  const n = h.j('C.length'); assert.strictEqual(n, 23);
  h.run('conecta("dur","clk","g");conecta("env1","dur","c");conecta("clk","vca","g","1");conecta("dur","dur","g")');
  assert.strictEqual(h.j('C.length'), n, 'ligações inválidas deveriam ser recusadas');
  h.run('conecta("dur","div","g")'); const m = h.j('C.length'); h.run('conecta("div","dur","g")');
  assert.strictEqual(h.j('C.length'), m, 'laço de gate deveria ser barrado');
  h.run('corta(C.findIndex(c=>c[0]==="fm"&&c[1]==="vca"))'); assert.strictEqual(h.run('M.fm.o.con.includes(M.vca.i)'), false);
});
T('áudio: resetar(true) com áudio ligado volta ao padrão sem erro', async () => {
  const h = carrega(ARQ); await h.run('iniciar()');
  h.run('conecta("fm","vca","a");M.env1.p.modo=1;resetar(true)');
  assert.strictEqual(h.j('C.length'), 18); assert.strictEqual(h.j('M.env1.p.modo'), 0);
});
T('envelope: modo curto, automação completa', async () => {
  const h = carrega(ARQ); await h.run('iniciar()'); h.run('dispEnv("env1",1,{})');
  const c = h.j('M.env1.cs.offset.calls'); assert.deepStrictEqual(c.map(x => x[0]), ['cancelScheduledValues', 'setValueAtTime', 'linearRampToValueAtTime', 'setTargetAtTime']);
  near(c[2][2], 1.012); near(c[3][2], 1.012); near(c[3][3], .195);
});
T('envelope: modo gate segura em 1 pela duração do gate (dur)', async () => {
  const h = carrega(ARQ); await h.run('iniciar()'); h.run('M.env1.p.modo=1;dispEnv("env1",1,{dur:.5})');
  const c = h.j('M.env1.cs.offset.calls'); assert.ok(c.length >= 4, 'pelo menos 4 chamadas de automação');
  assert.strictEqual(c[0][0], 'cancelScheduledValues'); assert.strictEqual(c[1][0], 'setValueAtTime');
  assert.strictEqual(c[2][0], 'linearRampToValueAtTime'); near(c[2][2], 1.012);
  const releaseIdx = c.findIndex(x => x[0] === 'setTargetAtTime');
  assert.ok(releaseIdx >= 0); near(c[releaseIdx][2], 1.5);
});
T('envelope: modo gate sem dur usa n e, sem n, uma semicolcheia', async () => {
  const h = carrega(ARQ); await h.run('iniciar()'); h.run('M.env1.p.modo=1;dispEnv("env1",2,{n:.3});dispEnv("env2",2,{});M.env2.p.modo=1;dispEnv("env2",5,{})');
  const c = h.j('M.env1.cs.offset.calls'); const releaseIdx = c.findIndex(x => x[0] === 'setTargetAtTime'); near(releaseIdx >= 0 ? c[releaseIdx][2] : c[2][2], 2.3);
  const d = h.j('M.env2.cs.offset.calls'); const releaseIdx2 = d.findIndex(x => x[0] === 'setTargetAtTime'); assert.ok(releaseIdx2 >= 0 || d[2][2] > 5, 'release deve ser em tempo razoável');
});
T('envelope: dispEnv sem d (reserva por parâmetro gate) não quebra', async () => {
  const h = carrega(ARQ); await h.run('iniciar()'); h.run('M.env1.p.modo=1;dispEnv("env1",1)'); assert.ok(h.j('M.env1.cs.offset.calls.length') >= 4);
});

// ---------- cenários completos ----------
T('cenário: clock ÷2 e ÷4 disparam dois envelopes', async () => {
  const h = carrega(ARQ);
  h.run('C=C.filter(c=>c[1]!=="env1"&&c[1]!=="env2");C.push(["clk","env1","g","÷2"],["clk","env2","g","÷4"])');
  await roda(h, 200);
  const n = h.j('cnt'), e1 = h.j('evs.filter(v=>v.m==="env1").length'), e2 = h.j('evs.filter(v=>v.m==="env2").length');
  assert.ok(n > 50, 'poucos ticks: ' + n);
  assert.strictEqual(e1, Math.ceil(n / 2)); assert.strictEqual(e2, Math.ceil(n / 4));
  assert.strictEqual(h.j('M.env1.cs.offset.calls.filter(c=>c[0]==="setTargetAtTime").length'), Math.ceil(n / 2));
  assert.strictEqual(h.j('M.env2.cs.offset.calls.filter(c=>c[0]==="setTargetAtTime").length'), Math.ceil(n / 4));
});
T('cenário: relógio emite ticks de semicolcheia exatos e o patch de fábrica toca sem erro', async () => {
  const h = carrega(ARQ); await roda(h, 120);
  const ts = h.j('evs.filter(v=>v.m==="clk").map(v=>v.t)').sort((a, b) => a - b); assert.ok(ts.length > 20);
  for (let i = 1; i < ts.length; i++) near(ts[i] - ts[i - 1], .075, 1e-9);
  assert.ok(h.j('evs.filter(v=>v.m==="kick").length') > 5); assert.ok(h.j('evs.filter(v=>v.m==="bass").length') > 3);
  assert.ok(h.j('evs.filter(v=>v.m==="env1").length') > 5, 'kick→env1 deveria disparar');
});
for (const [dur, esperado] of [[.4, .075], [1, .6], [0, .01875]]) {
  T('cenário: clock → Folha-duração(' + dur + ') → envelope gate segura ' + esperado + ' s', async () => {
    const h = carrega(ARQ);
    h.run('C=C.filter(c=>c[1]!=="env1");C.push(["clk","dur","g","1"],["dur","env1","g"]);M.env1.p.modo=1;M.dur.p.dur=' + dur);
    h.run('globalThis.__cap=[];const __e=entra;entra=function(k,t,d,dep){if(k==="env1")__cap.push([t,d.dur,d.n]);return __e(k,t,d,dep)}');
    await roda(h, 120);
    const cap = h.j('__cap'); assert.ok(cap.length > 10);
    for (const [t, d, n] of cap) { near(d, esperado, 1e-9); near(n, .075, 1e-9); assert.ok(t >= 0); }
    const c = h.j('M.env1.cs.offset.calls'), a = .012;
    const t0 = cap[0][0], seg = c.slice(0, 5);
    assert.strictEqual(seg[0][0], 'cancelScheduledValues'); near(seg[2][2], t0 + a);
    if (esperado > a) { assert.strictEqual(seg[3][0], 'setValueAtTime'); near(seg[3][2], t0 + esperado, 1e-9); near(seg[4][2], t0 + esperado, 1e-9); }
    else { assert.strictEqual(seg[3][0], 'setTargetAtTime'); near(seg[3][2], t0 + a, 1e-9); }
  });
}
T('cenário: Folha-duração preserva s, a e ac que passam por ela (cadeia seq → dur → baixo)', async () => {
  const h = carrega(ARQ);
  h.run('C=C.filter(c=>!(c[0]==="seq"&&c[1]==="bass"));C.push(["seq","dur","g","b"],["dur","bass","g"])');
  h.run('globalThis.__cap=[];const __e=entra;entra=function(k,t,d,dep){if(k==="bass")__cap.push(JSON.stringify(d));return __e(k,t,d,dep)}');
  await roda(h, 120);
  const cap = h.j('__cap').map(JSON.parse); assert.ok(cap.length > 3);
  for (const d of cap) { assert.ok(typeof d.s === 'number'); assert.ok(d.ac === 0 || d.ac === 1); assert.ok(d.dur > 0); }
});
T('cenário: 10 min simulados do patch de fábrica não geram erro nem estouram profundidade', async () => {
  const h = carrega(ARQ); await h.run('iniciar()'); h.sb.document.getElementById('msg').innerHTML = '';
  h.run('PS={k:{},b:{},h:{}};cnt=0;prox=.06;playing=true');
  for (let i = 0; i < 24000; i++) { h.run('ctx.currentTime=' + (i * 0.025)); h.run('relogio()'); if (i % 200 === 0) h.run('evs.length=0'); }
  assert.ok(!/erro/.test(String(h.sb.document.getElementById('msg').innerHTML)));
  assert.ok(h.j('cnt') > 7000);
});


// ---------- v0.5.6: grade de 8 passos e resetar ----------
const abre = (h, pg) => { h.elems.ps.children.length = 0; h.run('sel="seq";pg=' + pg + ';painel()'); return h.elems.ps.children; };
T('painel: grade do tronco com 8 passos por página e 4 páginas, cobrindo 0..31 sem repetir', () => {
  const h = carrega(ARQ), vistos = [];
  for (let pg = 0; pg < 4; pg++) {
    const k = abre(h, pg), linhas = k.filter(c => c.className === 'gr');
    assert.strictEqual(linhas.length, 5);
    for (const l of linhas) assert.deepStrictEqual(l.children.map(b => +b.dataset.i), [0, 1, 2, 3, 4, 5, 6, 7].map(j => pg * 8 + j));
    vistos.push(...linhas[0].children.map(b => +b.dataset.i));
    assert.deepStrictEqual(k.find(c => c.className === 'opt').children.map(b => b.textContent), ['passos 1–8', '9–16', '17–24', '25–32']);
  }
  assert.deepStrictEqual(vistos, Array.from({ length: 32 }, (_, i) => i));
});
T('painel: botão de página troca a página e botão de passo edita o passo certo', () => {
  const h = carrega(ARQ), k = abre(h, 0);
  k.find(c => c.className === 'opt').children[3].onclick(); assert.strictEqual(h.j('pg'), 3);
  const k2 = h.elems.ps.children, linhaK = k2.filter(c => c.className === 'gr').slice(-5)[0]; // o mock não limpa os filhos: pega a grade redesenhada
  const antes = h.j('S.k[24]'); linhaK.children[0].onclick(); assert.strictEqual(h.j('S.k[24]'), (antes + 1) % 2);
  assert.strictEqual(h.j('S.k[0]'), 1, 'não pode mexer no passo 0');
});
T('painel: os passos além do comprimento continuam sendo apagados por dimSeq sem erro', () => {
  const h = carrega(ARQ); abre(h, 2); h.run('M.seq.p.compk=0;dimSeq()');
});
T('portas: espaçamento de 30 px entre as portas do clk', () => {
  const h = carrega(ARQ), y = ['1', '÷2', '÷4', '×2', '×3'].map(p => h.j('pOut(M.clk,"' + p + '")[1]'));
  for (let i = 1; i < y.length; i++) near(y[i] - y[i - 1], 30);
});
T('resetar: para os osciladores de LFO e os envelopes antigos e recria nós novos', async () => {
  const h = carrega(ARQ); await h.run('iniciar()');
  h.run('globalThis.__a=[M.lfo1.osc,M.lfo2.osc,M.env1.cs,M.env2.cs];resetar(true)');
  assert.strictEqual(h.run('__a.every(n=>n.stopped===true)'), true);
  assert.strictEqual(h.run('M.lfo1.osc!==__a[0]&&M.env1.cs!==__a[2]'), true);
  assert.strictEqual(h.run('M.lfo1.osc.stopped===true'), false);
});
T('resetar: sem áudio ligado não quebra', () => { const h = carrega(ARQ); h.run('resetar(true);resetar(false)'); assert.strictEqual(h.j('C.length'), 18); });

// ---------- v0.5.7: repositório, worklet por arquivo, build ----------
const APPJS = path.join(RAIZ, 'app.js');
T('repo: os quatro arquivos existem e o index.html aponta para eles', () => {
  for (const f of ['index.html', 'style.css', 'app.js', 'dsp-worklet.js']) assert.ok(fs.existsSync(path.join(RAIZ, f)), f);
  const h = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
  assert.ok(h.includes('<link rel="stylesheet" href="style.css">') && h.includes('<script src="app.js"></script>'));
  assert.ok(!/<style>|<script>/.test(h), 'o index.html não deve ter CSS nem JS embutido');
  assert.ok(!/<\/(script|style)/i.test(fs.readFileSync(APPJS, 'utf8') + fs.readFileSync(path.join(RAIZ, 'dsp-worklet.js'), 'utf8')));
});
T('build: gera o arquivo único de forma reproduzível e idêntica ao arquivo testado', () => {
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'mic-')), a = path.join(tmp, 'a.html'), b = path.join(tmp, 'b.html');
  cp.execFileSync('node', [path.join(RAIZ, 'tools', 'build.js'), a]); cp.execFileSync('node', [path.join(RAIZ, 'tools', 'build.js'), b]);
  assert.ok(fs.readFileSync(a).equals(fs.readFileSync(b)), 'dois builds deram arquivos diferentes');
  if (path.basename(ARQ).startsWith('micelio-single')) assert.ok(fs.readFileSync(a).equals(fs.readFileSync(ARQ)), 'o arquivo testado não é o build atual: rode node tools/build.js');
  const blk = blocos(fs.readFileSync(a, 'utf8')); assert.strictEqual(blk.length, 2);
  assert.strictEqual(blk[1], '\n' + fs.readFileSync(APPJS, 'utf8'));
});
T('worklet: no repositório (https) o app carrega dsp-worklet.js por arquivo e usa nós de worklet', async () => {
  const h = carrega(APPJS, null, { worklet: true, https: true }); await h.run('iniciar()');
  assert.deepStrictEqual(h.urls, ['dsp-worklet.js']); assert.strictEqual(h.j('ok'), true);
  for (const k of ['ladder', 'fold', 'crush']) assert.ok(String(h.run('M.' + k + '.n.kind')).startsWith('worklet:'), k);
  near(h.j('M.ladder.n.pp.cutoff.value'), h.j('cutBase()'), 1e-9); assert.ok(h.j('M.ladder.n.pp.res.value') > 0);
  assert.ok(h.j('M.fold.n.pp.fold.value') >= 1); assert.ok(h.j('M.crush.n.pp.bits.value') <= 16);
});
T('worklet: no arquivo único o worklet embutido vai por blob', async () => {
  if (!path.basename(ARQ).startsWith('micelio-single')) return;
  const h = carrega(ARQ, null, { worklet: true, https: true }); await h.run('iniciar()');
  assert.deepStrictEqual(h.urls, ['blob:x']); assert.strictEqual(h.j('ok'), true);
});
T('worklet: falha de carga em https cai no modo nativo e mostra o motivo no aviso', async () => {
  const h = carrega(APPJS, null, { https: true }); await h.run('iniciar()');
  assert.strictEqual(h.j('ok'), false); assert.ok(/falha ao carregar o worklet: bloqueado/.test(h.sb.document.getElementById('msg').innerHTML), h.sb.document.getElementById('msg').innerHTML);
  assert.strictEqual(h.j('M.ladder.o.kind'), 'BiquadFilter');
});
T('worklet: sem https o aviso explica que o AudioWorklet exige https', async () => {
  const h = carrega(APPJS, null, { https: false }); await h.run('iniciar()'); assert.ok(/exige https/.test(h.sb.document.getElementById('msg').innerHTML));
});
T('worklet: ?nativo força o modo nativo sem tentar carregar o worklet', async () => {
  const h = carrega(APPJS, null, { worklet: true, https: true, search: '?nativo' }); await h.run('iniciar()');
  assert.deepStrictEqual(h.urls, []); assert.strictEqual(h.j('ok'), false); assert.ok(/forçado por \?nativo/.test(h.sb.document.getElementById('msg').innerHTML));
  const h2 = carrega(APPJS, null, { worklet: true, https: true, search: '?x=1&nativo' }); await h2.run('iniciar()'); assert.deepStrictEqual(h2.urls, []);
  const h3 = carrega(APPJS, null, { worklet: true, https: true, search: '?nativos' }); await h3.run('iniciar()'); assert.deepStrictEqual(h3.urls, ['dsp-worklet.js']);
});
T('worklet: patch de fábrica toca 10 s simulados com nós de worklet sem erro', async () => {
  const h = carrega(APPJS, null, { worklet: true, https: true }); await roda(h, 400);
  assert.ok(h.j('evs.filter(v=>v.m==="kick").length') > 10);
});

// ---------- v0.5.9: H2 corrigida ----------
T('v0.5.9: reinício do LFO por gate não mexe na profundidade (m.o.gain) nem usa setTimeout', async () => {
  const h = carrega(ARQ); await h.run('iniciar()'); h.run('reiniciaLfo("lfo1",1)');
  assert.deepStrictEqual(h.j('M.lfo1.o.gain.calls.filter(c=>c[0]!=="setTargetAtTime"&&c[0]!=="cancelScheduledValues").length'), 0);
  assert.ok(h.j('M.lfo1.og.gain.calls.length') >= 2); assert.strictEqual(h.j('M.lfo1.osc!==undefined'), true);
});
T('v0.5.9: dispEnv usa cancelAndHoldAtTime quando existe e não chama valueAtTime', async () => {
  const h = carrega(ARQ); await h.run('iniciar()');
  h.run('M.env1.cs.offset.cancelAndHoldAtTime=function(t){this.calls.push(["cancelAndHoldAtTime",t])};M.env1.cs.offset.valueAtTime=function(){throw new Error("valueAtTime não existe em AudioParam")}');
  h.run('dispEnv("env1",1,{})'); const c = h.j('M.env1.cs.offset.calls');
  assert.deepStrictEqual(c.map(x => x[0]), ['cancelAndHoldAtTime', 'linearRampToValueAtTime', 'setTargetAtTime']);
});
T('v0.5.9: sidechain do baixo desce em rampa de 4 ms (sem degrau) e volta em 0,2 s', async () => {
  const h = carrega(ARQ); await h.run('iniciar()'); h.run('kick(1)');
  const d = h.j('M.bass.o.gain.calls').filter(c => c[0] === 'linearRampToValueAtTime');
  assert.ok(d.some(c => Math.abs(c[2] - 1.004) < 1e-9 && c[1] < 1) && d.some(c => Math.abs(c[2] - 1.2) < 1e-9 && c[1] === 1));
});
T('v0.5.9: fila de eventos visuais é limitada', async () => {
  const h = carrega(ARQ); await h.run('iniciar()'); h.run('for(let i=0;i<5000;i++)ev(1e9,"kick")');
  assert.ok(h.j('evs.length') <= 2000);
});

// ---------- v0.6.0: controle de notas ----------
T('v0.6.0 puro: nota sobe de oitava além da escala e soma a oitava do passo', () => {
  const ESC = [0, 1, 3, 5, 7, 8, 10], CR = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  assert.strictEqual(U.nota(ESC, 0, 0), 0); assert.strictEqual(U.nota(ESC, 6, 0), 10); assert.strictEqual(U.nota(ESC, 7, 0), 12); assert.strictEqual(U.nota(ESC, 1, 1), 13);
  assert.strictEqual(U.nota(CR, 11, 0), 11); assert.strictEqual(U.nota([0, 3, 5, 7, 10], 5, 0), 12); assert.strictEqual(U.nota(ESC, 2, -1), -9); assert.strictEqual(U.nota(ESC, 2), 3);
});
T('v0.6.0 puro: normS deriva o salto de oitava dos saves antigos e limita o campo o', () => {
  const a = U.normS({ k: [], b: [0, 0, 0, 0, 0, 0, 0, 1] });
  for (let i = 0; i < 32; i++) assert.strictEqual(a.o[i], i % 8 === 7 ? 1 : 0);
  const b = U.normS({ o: [9, -9, 1, 'x'] }); assert.deepStrictEqual(b.o.slice(0, 4), [2, -1, 1, 0]); assert.strictEqual(b.o.length, 32);
  assert.strictEqual(U.normS(null).o[7], 1);
});
T('v0.6.0: nota do baixo no preset é idêntica à regra antiga (grau da frígia + oitava a cada 8º passo)', () => {
  const ESC = [0, 1, 3, 5, 7, 8, 10];
  for (let i = 0; i < 32; i++) for (let d = 0; d <= 6; d++) assert.strictEqual(U.nota(ESC, d, U.normS({}).o[i]), ESC[d] + (i % 8 === 7 ? 12 : 0));
});
T('v0.6.0: seq em cromática e oitava por passo chegam ao gate do baixo', async () => {
  const h = carrega(ARQ); await h.run('iniciar()');
  h.run('M.seq.p.escala=3;S.b[0]=5;S.o[0]=2;globalThis.__s=[];pulso=function(id,t,d,pt){if(id==="seq"&&pt==="b")__s.push(d.s)};PS={k:{},b:{},h:{}};passoSeq(1,0)');
  assert.deepStrictEqual(h.j('__s'), [29]);
});
T('v0.6.0: FM segue o baixo (2 oitavas acima) e aplica a transposição; sorteio usa a escala escolhida', async () => {
  const h = carrega(ARQ); await h.run('iniciar()');
  h.run('globalThis.__n=[];fm=function(t,n){__n.push(n)};M.fm.p.notas=1;M.fm.p.transp=.5;ultB=40;entra("fm",1,{},0)');
  assert.strictEqual(h.j('__n[0]'), 64);
  h.run('M.fm.p.transp=.75;entra("fm",1,{},0)'); assert.strictEqual(h.j('__n[1]'), 76);
  h.run('M.fm.p.notas=0;M.fm.p.transp=.5;M.seq.p.escala=2;for(let i=0;i<40;i++)entra("fm",1,{},0)');
  const base = h.j('31+Math.round(P("seq","raiz")*12)+29'), ok = new Set([0, 3, 5, 7, 10, 12, 15, 17, 19, 22]);
  assert.ok(h.j('__n.slice(2)').every(n => ok.has(n - base)), 'notas fora da pentatônica');
});
T('v0.6.0: painel do Tronco tem linha de oitava e o botão de oitava cicla de −1 a +2', () => {
  const h = carrega(ARQ), k = abre(h, 0);
  const rows = k.filter(c => c.className === 'gr'); assert.strictEqual(rows.length, 5);
  const o = rows[2]; o.children[0].onclick(); assert.strictEqual(h.j('S.o[0]'), 1); o.children[0].onclick(); o.children[0].onclick(); assert.strictEqual(h.j('S.o[0]'), -1);
  assert.strictEqual(h.j('S.o.every(v=>v>=-1&&v<=2)'), true);
});
T('v0.6.0: save sem o (formato da v0.5.9) carrega com os saltos de oitava de antes', () => {
  const h = carrega(ARQ); assert.strictEqual(h.j('S.o[7]'), 1); assert.strictEqual(h.j('S.o[15]'), 1); assert.strictEqual(h.j('S.o[0]'), 0);
});

T('v0.6.1: o painel do Raiz-baixo edita notas, oitava e acento, e mexe no mesmo S do Tronco', () => {
  const h = carrega(ARQ); h.elems.ps.children.length = 0; h.run('sel="bass";pg=0;painel()'); const k = h.elems.ps.children;
  const rows = k.filter(c => c.className === 'gr'); assert.strictEqual(rows.length, 3);
  assert.deepStrictEqual(rows.map(r => r.children[0].dataset.tr), ['b', 'b', 'b']);
  const o0 = h.j('S.o[0]'); rows[1].children[0].onclick(); assert.strictEqual(h.j('S.o[0]'), o0 + 1);
  const b0 = h.j('S.b[0]'); rows[0].children[0].onclick(); assert.strictEqual(h.j('S.b[0]'), b0 >= 6 ? -1 : b0 + 1);
  const txt = k.filter(c => c.className === 'p').map(c => c.children[0].textContent);
  assert.ok(txt.some(t => /^raiz/.test(t)) && txt.some(t => /^comp b/.test(t)) && txt.some(t => /^duck/.test(t)), txt.join('|'));
  assert.ok(k.some(c => c.className === 'opt' && c.children.some(b => /escala/.test(b.textContent))));
});
T('v0.6.1: painel do Tronco continua com as 5 linhas e sem os sliders do baixo duplicados', () => {
  const h = carrega(ARQ), k = abre(h, 0); assert.strictEqual(k.filter(c => c.className === 'gr').length, 5);
  assert.ok(!k.some(c => c.className === 'p' && /^duck/.test(c.children[0].textContent)));
});

T('v0.7.3: padrões dos hats reproduzem o som antigo (7 kHz, Q 1) e não mexem no tempo', async () => {
  const h = carrega(ARQ); await h.run('iniciar()');
  assert.deepStrictEqual(h.j('["swing","sincopa","humano","tom","metal"].map(k=>M.hat.p[k])'), [0, 0, 0, .5, .3]);
  assert.strictEqual(h.j('hatTomHz(M.hat.p.tom)'), 7000); assert.strictEqual(h.j('hatQ(M.hat.p.metal)'), 1);
  h.run('globalThis.__c=[];chapeu=function(t,f){__c.push([t,f])};S.h.fill(2);PS={k:{},b:{},h:{}};for(let i=0;i<12;i++)entra("seq",1+i*.075,{},0)');
  assert.ok(h.j('__c.length') >= 12); assert.ok(h.j('__c.every((c,i)=>Math.abs(c[0]-(1+i*.075))<1e-9&&c[1]===1)'), 'hat saiu do tempo ou do volume com os padrões');
});
T('v0.7.3: swing dos hats atrasa só os passos ímpares, até meio passo', async () => {
  const h = carrega(ARQ); await h.run('iniciar()');
  h.run('globalThis.__c=[];chapeu=function(t,f){__c.push(t)};S.h.fill(2);PS={k:{},b:{},h:{}};M.hat.p.swing=1;for(let i=0;i<8;i++)entra("seq",1+i*.075,{},0)');
  for (let i = 0; i < 8; i++) { const d = h.j('__c[' + i + ']') - (1 + i * .075); assert.ok(Math.abs(d - (i % 2 ? .0375 : 0)) < 1e-9, 'passo ' + i + ' atraso ' + d); }
  h.run('__c.length=0;PS={k:{},b:{},h:{}};M.hat.p.swing=.5;for(let i=0;i<2;i++)entra("seq",1+i*.075,{},0)');
  assert.ok(Math.abs(h.j('__c[1]') - (1.075 + .01875)) < 1e-9);
});
T('v0.7.3: síncopa empurra hats meio passo e humano varia tempo e volume dentro dos limites', async () => {
  const h = carrega(ARQ); await h.run('iniciar()');
  h.run('globalThis.__c=[];chapeu=function(t,f){__c.push([t,f])};S.h.fill(2);PS={k:{},b:{},h:{}};M.hat.p.sincopa=1;for(let i=0;i<60;i++)entra("seq",1+i*.075,{},0)');
  const ds = h.j('__c.map((c,i)=>Math.round((c[0]-(1+i*.075))*10000))'); assert.ok(ds.every(d => d === 0 || d === 375), ds.join(','));
  assert.ok(ds.includes(0) && ds.includes(375), 'síncopa deveria misturar hats no tempo e deslocados');
  h.run('__c.length=0;PS={k:{},b:{},h:{}};M.hat.p.sincopa=0;M.hat.p.humano=1;for(let i=0;i<60;i++)entra("seq",1+i*.075,{},0)');
  assert.ok(h.j('__c.every((c,i)=>Math.abs(c[0]-(1+i*.075))<=.075*.12+1e-9&&c[1]>=.65-1e-9&&c[1]<=1.35+1e-9)'), 'humano fora dos limites');
  assert.ok(h.j('new Set(__c.map(c=>c[1])).size')>10, 'humano deveria variar o volume');
});
T('v0.7.3: tom e metal mudam o filtro do chapéu e o ganho é compensado na ressonância', () => {
  const h = carrega(ARQ);
  assert.ok(h.j('hatTomHz(0)') > 3000 && h.j('hatTomHz(0)') < 3100 && h.j('hatTomHz(1)') > 16000 && h.j('hatTomHz(1)') < 16200);
  assert.ok(h.j('hatQ(0)') < 1 && h.j('hatQ(1)') > 5 && h.j('hatQ(1)') < 8);
  assert.ok(h.j('hatTomHz(.7)') > h.j('hatTomHz(.5)'));
});
T('v0.7.3: painel dos Esporos tem os 5 sliders novos em grupos e saves antigos ganham os padrões', () => {
  const h = carrega(ARQ); h.elems.ps.children.length = 0; h.run('sel="hat";painel()'); const k = h.elems.ps.children;
  const nomes = k.filter(c => c.className === 'p').map(c => c.children[0].textContent); assert.deepStrictEqual(nomes, ['vol', 'queda', 'tom', 'metal', 'swing', 'síncopa', 'humano', 'ghost', 'quanto'], JSON.stringify(nomes));
  const gr = k.filter(c => c.className === 'lbl').map(c => c.textContent); assert.deepStrictEqual(gr, ['nível', 'timbre', 'ritmo'], JSON.stringify(gr));
  h.run('save()'); const s = JSON.parse(h.ls.micelio42); for (const x of ['tom', 'metal', 'swing', 'sincopa', 'humano']) delete s.p.hat[x];
  const h2 = carrega(ARQ, { micelio42: JSON.stringify(s) });
  assert.deepStrictEqual(h2.j('["tom","metal","swing","sincopa","humano"].map(k=>M.hat.p[k])'), [.5, .3, 0, 0, 0]);
});

T('v0.7.4: menu recolhível guarda o estado fora do save do preset e começa como foi deixado', () => {
  const h = carrega(ARQ);
  assert.strictEqual(h.j('menuMin'), false);
  h.run('menuAlterna()'); assert.strictEqual(h.ls.micelio_menu, '1'); assert.strictEqual(h.j('menuMin'), true);
  assert.ok(!('micelio_menu' in JSON.parse(h.run('JSON.stringify(Object.assign({},M.hat.p))'))), 'o estado do menu não pode entrar nos parâmetros');
  h.run('save()'); assert.ok(!/menu/.test(h.ls.micelio42), 'o save do preset não deve carregar o estado do menu');
  const h2 = carrega(ARQ, { micelio_menu: '1' }); assert.strictEqual(h2.j('menuMin'), true);
  h2.run('menuAlterna()'); assert.strictEqual(h2.ls.micelio_menu, '0'); assert.strictEqual(h2.j('menuMin'), false);
  const h3 = carrega(ARQ, { micelio_menu: 'lixo' }); assert.strictEqual(h3.j('menuMin'), false);
});

T('v0.7.5: menu recolhido espalha a floresta pela tela e expandido volta à altura de antes', () => {
  const h = carrega(ARQ);
  const base = h.j('FH()'); assert.strictEqual(base, 800 * .54);
  const y0 = h.j('pos(M.seq)[1]');
  h.run('menuAlterna()'); for (let i = 0; i < 80; i++) h.run('fhPasso()');
  const fim = h.j('FH()'); assert.strictEqual(fim, 800 - 88);
  assert.ok(h.j('pos(M.seq)[1]') !== y0 || h.j('M.seq.y') === 0, 'os módulos deviam se espalhar na vertical');
  const baixo = h.j('Math.max(...Object.keys(M).map(k=>pos(M[k])[1]))'); assert.ok(baixo <= 800 - 88 - 30, 'módulo fica atrás da faixa: ' + baixo);
  h.run('menuAlterna()'); for (let i = 0; i < 80; i++) h.run('fhPasso()');
  assert.strictEqual(h.j('FH()'), base); assert.strictEqual(h.j('pos(M.seq)[1]'), y0);
  const h2 = carrega(ARQ, { micelio_menu: '1' }); assert.strictEqual(h2.j('FH()'), 800 - 88);
});

// ---------- v0.7.6: DSP do worklet (ladder e dobrador) ----------
function carregaWK(sr) {
  const reg = {}, sb = { sampleRate: sr, AudioWorkletProcessor: class {}, registerProcessor: (n, c) => { reg[n] = c; }, Math };
  vm.createContext(sb); vm.runInContext(fs.readFileSync(path.join(RAIZ, 'dsp-worklet.js'), 'utf8'), sb); return reg;
}
function rodaWK(reg, nome, x, pr) {
  const P = new reg[nome](), y = new Float32Array(x.length);
  for (let i = 0; i < x.length; i += 128) {
    const n = Math.min(128, x.length - i), O = [[new Float32Array(n)]], pp = {}; for (const k in pr) pp[k] = [pr[k]];
    P.process([[x.subarray(i, i + n)]], O, pp); y.set(O[0][0], i);
  }
  return y;
}
const rmsWK = a => Math.sqrt(a.reduce((s, v) => s + v * v, 0) / a.length);
const baixoWK = sr => { const s = new Float32Array(sr * 2); for (let n = 0; n < s.length; n++) s[n] = .28 * (Math.sin(2 * Math.PI * 49 * n / sr) * .77 + ((n * 49 / sr) % 1 * 2 - 1) * 2); return s; };
function fftWK(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) { const a = -2 * Math.PI / len; for (let i = 0; i < n; i += len) for (let k = 0; k < len / 2; k++) { const c = Math.cos(a * k), s = Math.sin(a * k), xr = re[i + k + len / 2] * c - im[i + k + len / 2] * s, xi = re[i + k + len / 2] * s + im[i + k + len / 2] * c; re[i + k + len / 2] = re[i + k] - xr; im[i + k + len / 2] = im[i + k] - xi; re[i + k] += xr; im[i + k] += xi; } }
}
// energia fora dos harmônicos abaixo de 16 kHz (aliasing audível) em dB da energia total; k0 ímpar, sinal periódico em N amostras
function aliasWK(y, k0, sr) {
  const N = y.length, re = Float64Array.from(y), im = new Float64Array(N); fftWK(re, im);
  let eh = 0, ea = 0; const KL = Math.floor(16000 * N / sr);
  for (let k = 1; k < N / 2; k++) { const e = re[k] * re[k] + im[k] * im[k]; if (k % k0 === 0) eh += e; else if (k <= KL) ea += e; }
  return 10 * Math.log10(ea / (eh + ea));
}
T('v0.7.6: ladder no drive do preset é idêntico ao da v0.7.5 (impressão digital)', () => {
  const R = carregaWK(48000), y = rodaWK(R, 'ladder', baixoWK(48000), { cutoff: 404, res: .575, drive: 4.6 });
  let a = 0, q = 0; for (const v of y) { a += Math.abs(v); q += v * v; }
  assert.ok(Math.abs(a / 13785.1046562 - 1) < 1e-9, 'soma|y| ' + a); assert.ok(Math.abs(q / 4376.98067926 - 1) < 1e-9, 'soma y2 ' + q);
  assert.ok(Math.abs(y[30000] - -0.030168641358613968) < 1e-9 && Math.abs(y[90000] - 0.19153793156147003) < 1e-9);
});
T('v0.7.6: ladder não auto-oscila: ressonância no máximo morre depois de uma rajada e não nasce do silêncio', () => {
  const sr = 48000, R = carregaWK(sr);
  for (const drive of [1, 12]) for (const res of [1.15, 1.2]) {
    const x = new Float32Array(sr * 8); let s = 1; for (let n = 0; n < 2400; n++) { s = (s * 1664525 + 1013904223) >>> 0; x[n] = ((s / 4294967296) * 2 - 1) * .5; }
    const y = rodaWK(R, 'ladder', x, { cutoff: 800, res, drive }); assert.ok(rmsWK(y.subarray(6 * sr)) < 1e-6, 'rajada: drive ' + drive + ' res ' + res + ' rms ' + rmsWK(y.subarray(6 * sr)));
    const z = rodaWK(R, 'ladder', new Float32Array(sr * 12), { cutoff: 800, res, drive }); assert.ok(rmsWK(z.subarray(8 * sr)) < 1e-6, 'silêncio: drive ' + drive + ' res ' + res);
  }
});
T('v0.7.6: o drive do ladder mexe no timbre sem mexer o volume mais que 4 dB (antes: 16 dB)', () => {
  const sr = 48000, R = carregaWK(sr), s = baixoWK(sr), n = [];
  for (const d of [1, 2.5, 4.6, 7, 9, 12]) n.push(20 * Math.log10(rmsWK(rodaWK(R, 'ladder', s, { cutoff: 404, res: .575, drive: d }).subarray(sr))));
  const dif = Math.max(...n) - Math.min(...n); assert.ok(dif < 4, 'variação de ' + dif.toFixed(1) + ' dB: ' + n.map(v => v.toFixed(1)));
});
T('v0.7.6: dobrador com sobreamostragem é transparente em baixo nível (atraso de 17 amostras, erro < -60 dB)', () => {
  const sr = 48000, R = carregaWK(sr);
  for (const f of [200, 1000, 3000]) {
    const x = new Float32Array(sr / 2); for (let n = 0; n < x.length; n++) x[n] = .05 * Math.sin(2 * Math.PI * f * n / sr);
    const y = rodaWK(R, 'fold', x, { fold: 1, bias: 0 }), ref = new Float64Array(x.length), Rr = 1 - 6.2832 * 8 / sr; let dx = 1e-18, dy = 1e-18;
    for (let n = 0; n < x.length; n++) { const v = .85 * Math.sin(x[n] * 1.5708), o = v - dx + Rr * dy; dx = v; dy = o; ref[n] = o; }
    let e = 0, p = 0; for (let n = 8000; n < 20000; n++) { const d = y[n + 17] - ref[n]; e += d * d; p += ref[n] * ref[n]; }
    assert.ok(10 * Math.log10(e / p) < -60, f + ' Hz: erro ' + (10 * Math.log10(e / p)).toFixed(1) + ' dB');
  }
});
T('v0.7.6: dobrador sobreamostrado derruba o aliasing audível (<16 kHz) onde a v0.7.5 passava de -50 dB', () => {
  const sr = 48000, N = 4096, R = carregaWK(sr);
  for (const [k0, F, amp, lim] of [[187, 5.8, 1, -100], [93, 14, 1, -100], [187, 14, 1, -55], [373, 5.8, 1, -55], [373, 14, .3, -70], [373, 14, 1, -55]]) {
    const x = new Float32Array(N * 10); for (let n = 0; n < x.length; n++) x[n] = amp * Math.sin(2 * Math.PI * k0 * n / N);
    const a = aliasWK(rodaWK(R, 'fold', x, { fold: F, bias: 0 }).subarray(N * 9), k0, sr);
    assert.ok(a < lim, 'k0 ' + k0 + ' fold ' + F + ' entrada ' + amp + ': ' + a.toFixed(1) + ' dB (limite ' + lim + ')');
  }
});
T('v0.7.6: ladder, dobrador e crush ficam finitos em extremos e o dobrador não deixa resíduo no silêncio', () => {
  const sr = 48000, R = carregaWK(sr), x = new Float32Array(sr * 2); let s = 7; for (let n = 0; n < x.length; n++) { s = (s * 1664525 + 1013904223) >>> 0; x[n] = (s / 4294967296) * 2 - 1; }
  for (const [c, r, d] of [[14000, 1.2, 12], [20, 1.2, 12], [800, 1.2, 12]]) { const y = rodaWK(R, 'ladder', x, { cutoff: c, res: r, drive: d }); assert.ok(y.every(Number.isFinite) && y.every(v => Math.abs(v) < 4), 'ladder ' + c); }
  for (const F of [1, 14]) for (const B of [-1, 0, 1]) { const y = rodaWK(R, 'fold', x, { fold: F, bias: B }); assert.ok(y.every(Number.isFinite) && y.every(v => Math.abs(v) < 2), 'fold ' + F + ' ' + B); }
  const z = rodaWK(R, 'fold', new Float32Array(sr), { fold: 5.8, bias: 0 }); assert.ok(z.every(v => Math.abs(v) < 1e-12));
});

// ---------- v0.7.7: destaque do que combina ----------
T('v0.7.7: a regra do destaque (motivoNao) concorda com conecta() em todas as combinações', () => {
  const h = carrega(ARQ);
  const r = h.j(`(()=>{const bad=[];let ok=0;for(const a in M)for(const b in M)for(const k of ["a","c","g"])for(const pt0 of ptsDe(a,k)){const pt=k==="g"?pt0:undefined,m=motivoNao(a,b,k,pt),n0=C.length;conecta(a,b,k,pt);const feito=C.length>n0;if(feito){C.pop();ok++}if((m===null)!==feito)bad.push([a,b,k,pt])}return{bad,ok}})()`);
  assert.deepStrictEqual(r.bad, []); assert.ok(r.ok > 40, 'poucas ligações possíveis: ' + r.ok);
});
T('v0.7.7: saída selecionada destaca só entradas que combinam (sem ela mesma, sem duplicata, sem laço)', () => {
  const h = carrega(ARQ), tem = (k, kind) => h.j(`alvos.some(x=>x.k==="${k}"&&x.kind==="${kind}")`);
  h.run('selPorta({t:"o",k:"kick"})');
  assert.ok(tem('ladder', 'a') && tem('out', 'c') && tem('env2', 'g'), 'devia destacar áudio, CV e gate livres');
  assert.ok(!tem('kick', 'a') && !tem('kick', 'g') && !tem('kick', 'c'), 'não pode destacar o próprio módulo');
  assert.ok(!tem('out', 'a') && !tem('env1', 'g'), 'ligações que já existem não são destino');
  assert.ok(!tem('fm', 'a'), 'fm não tem entrada de áudio');
  h.run('selPorta({t:"o",k:"eco"})');
  assert.ok(!tem('fold', 'a'), 'eco→fold fecharia um laço (fold→eco já existe)'); assert.ok(tem('crush', 'a'));
  h.run('selPorta({t:"o",k:"lfo1"})'); assert.ok(h.j('alvos.every(x=>x.kind!=="g")'), 'o LFO não tem saída de gate');
});
T('v0.7.7: entrada selecionada destaca as saídas que combinam, uma por porta do sequenciador e do relógio', () => {
  const h = carrega(ARQ);
  h.run('selPorta({t:"i",k:"dur",kind:"g"})');
  const o = h.j('alvos.filter(x=>x.k==="seq").map(x=>x.pt)'); assert.deepStrictEqual(o.sort(), ['b', 'h', 'k', 'v']);
  assert.strictEqual(h.j('alvos.filter(x=>x.k==="clk").length'), 5);
  assert.ok(h.j('!alvos.some(x=>x.k==="dur"||x.k==="lfo1"||x.k==="out")'));
  h.run('selPorta({t:"i",k:"ladder",kind:"a"})'); assert.ok(h.j('alvos.some(x=>x.k==="bass"&&x.role==="out")') === false, 'bass→ladder já existe');
  assert.ok(h.j('alvos.some(x=>x.k==="fm")') && h.j('alvos.every(x=>x.k!=="ladder")'));
  h.run('selPorta({t:"i",k:"kick",kind:"a"})'); assert.strictEqual(h.j('alvos.length'), 0, 'kick não tem entrada de áudio: nada combina');
});
T('v0.7.7: modo toque liga nos dois sentidos e toque fora do destaque só troca a seleção', () => {
  const h = carrega(ARQ), ligou = (a, b, k) => h.j(`C.some(c=>c[0]==="${a}"&&c[1]==="${b}"&&c[2]==="${k}")`);
  h.run('tocaSaida("fm",undefined)'); assert.strictEqual(h.j('psel.t'), 'o'); assert.strictEqual(h.run('tocaEntrada("vca","a")'), true);
  assert.ok(ligou('fm', 'vca', 'a')); assert.strictEqual(h.j('psel'), null);
  h.run('tocaEntrada("crush","a")'); assert.strictEqual(h.j('psel.t'), 'i'); assert.strictEqual(h.run('tocaSaida("fold",undefined)'), true);
  assert.ok(ligou('fold', 'crush', 'a')); assert.strictEqual(h.j('psel'), null);
  const n = h.j('C.length'); h.run('tocaSaida("kick",undefined)'); assert.strictEqual(h.run('tocaEntrada("fm","a")'), false);
  assert.strictEqual(h.j('C.length'), n, 'fm não tem entrada de áudio: não liga'); assert.strictEqual(h.j('psel.t'), 'i');
  h.run('tocaEntrada("fm","a")'); assert.strictEqual(h.j('psel'), null, 'tocar a mesma entrada de novo desmarca');
  h.run('tocaSaida("seq","k")'); h.run('tocaEntrada("div","g")'); assert.ok(h.j('C.some(c=>c[0]==="seq"&&c[1]==="div"&&c[2]==="g"&&c[3]==="k")'), 'a porta k do sequenciador deve ir junto');
  h.run('tocaSaida("kick",undefined)'); h.run('tocaSaida("kick",undefined)'); assert.strictEqual(h.j('togg'), true, 'tocar a mesma saída de novo marca para desmarcar');
});
T('v0.7.7: cipó selecionado mostra os outros destinos; só o segundo toque corta', () => {
  const h = carrega(ARQ), n = h.j('C.length');
  h.run('tocaCabo(0)'); assert.strictEqual(h.j('psel.t'), 'c'); assert.strictEqual(h.j('C.length'), n, 'o primeiro toque não corta');
  h.run('tocaCabo(1)'); assert.strictEqual(h.j('psel.i'), 1); assert.strictEqual(h.j('C.length'), n, 'outro cipó só troca a seleção');
  h.run('tocaCabo(1)'); assert.strictEqual(h.j('C.length'), n - 1); assert.strictEqual(h.j('psel'), null);
  h.run('C.push(["fm","vca","a"]);tocaCabo(C.length-1)'); assert.ok(h.j('!alvos.some(x=>x.k==="vca"&&x.kind==="a")'), 'o destino atual do cipó não é oferecido de novo');
});
T('v0.7.7: a seleção não entra no save e não muda nada do patch', () => {
  const h = carrega(ARQ); h.run('save()'); const antes = h.ls.micelio42;
  h.run('selPorta({t:"o",k:"kick"});tocaSaida("kick",undefined);save()'); assert.strictEqual(h.ls.micelio42, antes);
});

T('v0.7.7: desenhar os destaques não quebra em nenhuma seleção (saídas, entradas, cabos, tela deslocada, LQ)', () => {
  const h = carrega(ARQ);
  const r = h.j(`(()=>{let n=0;const sels=[];for(const k in M){const m=M[k];if(m.pts)for(const pt of m.pts)sels.push({t:"o",k,pt});else if(m.o||m.g)sels.push({t:"o",k});if(m.i)sels.push({t:"i",k,kind:"a"});if(ALV[k])sels.push({t:"i",k,kind:"c"});if(m.gi)sels.push({t:"i",k,kind:"g"})}
   for(let i=0;i<C.length;i++)sels.push({t:"c",i});
   for(const cm of [0,-W]){cam=cm;for(const lq of [false,true]){LQ=lq;for(const s of sels){selPorta(s);destaques(1.234);destaques(2.5);n++}}}
   selPorta(null);destaques(1);cam=0;LQ=false;return{n,sels:sels.length}})()`);
  assert.ok(r.n > 100, 'poucas seleções desenhadas: ' + r.n);
});

// ---------- execução ----------
(async () => {
  let ok = 0, falha = 0;
  for (const [n, f] of fila) {
    try { await f(); ok++; console.log('ok     ' + n); } catch (e) { falha++; console.log('FALHOU ' + n + '\n       ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join('\n       ') : e)); }
  }
  console.log('\n' + ok + ' testes passaram, ' + falha + ' falharam (' + ARQ + (ANT ? ' vs ' + ANT : '') + ')');
  process.exit(falha ? 1 : 0);
})();
