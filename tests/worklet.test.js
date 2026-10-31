// Testa os processadores do dsp-worklet.js em Node (sem navegador): estabilidade, limites e comportamento básico.
// Uso (na raiz do repositório): node tests/worklet.test.js
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const src = fs.readFileSync(path.join(__dirname, '..', 'dsp-worklet.js'), 'utf8');
const SR = 44100, B = 128;

function carrega() {
  const procs = {};
  vm.runInNewContext(src, { registerProcessor: (n, c) => { procs[n] = c; }, AudioWorkletProcessor: class {}, sampleRate: SR, Math });
  return procs;
}
const procs = carrega();
const fila = []; const T = (n, f) => fila.push([n, f]);
const near = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) <= e, a + ' ≠ ' + b);

// roda um processador por n amostras com entrada x(i) e parâmetros fixos (ou por função de i)
function roda(nome, x, n, par) {
  const p = new procs[nome](), y = new Float32Array(n), ent = new Float32Array(B), sai = new Float32Array(B);
  for (let off = 0; off < n; off += B) {
    for (let i = 0; i < B; i++) ent[i] = x(off + i);
    const P = {}; for (const k in par) { const v = typeof par[k] === 'function' ? par[k](off) : par[k]; P[k] = Float32Array.of(v); }
    assert.strictEqual(p.process([[ent]], [[sai]], P), true);
    y.set(sai.subarray(0, Math.min(B, n - off)), off);
  }
  return y;
}
const stats = y => { let pk = 0, ss = 0, s = 0, fin = true; for (const v of y) { if (!isFinite(v)) fin = false; pk = Math.max(pk, Math.abs(v)); ss += v * v; s += v; } return { pk, rms: Math.sqrt(ss / y.length), dc: s / y.length, fin }; };
const saw = (f, a) => i => a * (2 * ((i * f / SR) % 1) - 1);
const sen = (f, a) => i => a * Math.sin(2 * Math.PI * f * i / SR);

T('registra os três processadores', () => { assert.deepStrictEqual(Object.keys(procs).sort(), ['crush', 'fold', 'ladder']); });
T('todos devolvem true sem entrada (nó desconectado) e não quebram', () => {
  for (const n of ['ladder', 'fold', 'crush']) { const p = new procs[n](); assert.strictEqual(p.process([[]], [[new Float32Array(B)]], {}), true); }
});
T('ladder: parâmetros do preset dão saída finita e limitada', () => {
  const y = roda('ladder', saw(82.4, .5), SR * 2, { cutoff: 404, res: .575, drive: 4.6 }), s = stats(y);
  assert.ok(s.fin); assert.ok(s.pk < 3, 'pico ' + s.pk); assert.ok(Math.abs(s.dc) < .01, 'dc ' + s.dc);
});
T('ladder: extremos (res 1,2, drive 9,  corte 20 e 14000) ficam finitos e limitados', () => {
  for (const [c, r, d] of [[20, 1.2, 9], [14000, 1.2, 9], [14000, 0, 1], [20, 0, 12], [404, 1.2, 12]]) {
    const s = stats(roda('ladder', saw(82.4, 1), SR, { cutoff: c, res: r, drive: d })); assert.ok(s.fin, [c, r, d] + ' não finito'); assert.ok(s.pk < 12, [c, r, d] + ' pico ' + s.pk);
  }
});
T('ladder: corte fora da faixa (0, negativo, acima de Nyquist) não gera NaN', () => {
  for (const c of [0, -500, 5e4]) assert.ok(stats(roda('ladder', saw(110, .5), SR / 2, { cutoff: c, res: .6, drive: 2 })).fin, 'corte ' + c);
});
T('ladder: silêncio na entrada decai para silêncio (sem zumbido nem DC)', () => {
  const y = roda('ladder', i => i < 4000 ? Math.sin(i * .05) : 0, SR * 2, { cutoff: 800, res: .9, drive: 3 });
  assert.ok(stats(y.subarray(SR)).rms < 1e-4, 'rms final ' + stats(y.subarray(SR)).rms);
});
T('ladder: passa-baixas (graves passam, agudos caem)', () => {
  const g = stats(roda('ladder', sen(100, .1), SR, { cutoff: 800, res: 0, drive: 1 }).subarray(SR / 2)).rms, a = stats(roda('ladder', sen(8000, .1), SR, { cutoff: 800, res: 0, drive: 1 }).subarray(SR / 2)).rms;
  assert.ok(g > 20 * a, 'graves ' + g + ' agudos ' + a);
});
T('ladder: corte varrendo (CV) nunca gera NaN', () => {
  const y = roda('ladder', saw(82.4, .5), SR * 2, { cutoff: off => 20 + 13000 * Math.abs(Math.sin(off / 3000)), res: 1.0, drive: 5 }); assert.ok(stats(y).fin);
});
// limite: 0,85 do dobrador mais a ondulação do filtro de DC (que tira o bias constante)
T('fold: saída limitada (≤ 1,2 com o filtro de DC) e finita para qualquer dobra e bias', () => {
  for (const [f, b] of [[1, 0], [14, 0], [14, 1], [7, -1], [1, 1]]) { const s = stats(roda('fold', sen(110, 1), SR / 2, { fold: f, bias: b })); assert.ok(s.fin); assert.ok(s.pk <= 1.2, 'pico ' + s.pk); }
});
// o dobrador roda sobreamostrado 4× (v0.7.6): a saída chega ATRASO amostras depois da curva ideal
const ATRASO = 17;
T('fold: dobra 1 sem bias segue a curva do seno para sinais pequenos (com o atraso da sobreamostragem e o efeito do filtro de DC)', () => {
  const y = roda('fold', sen(110, .05), 4000, { fold: 1, bias: 0 }); let m = 0; for (let i = 2000; i < y.length; i++) m = Math.max(m, Math.abs(y[i] - .85 * Math.sin(.05 * Math.sin(2 * Math.PI * 110 * (i - ATRASO) / SR) * 1.5708))); assert.ok(m < .01, 'erro ' + m);
});
T('fold: o atraso da sobreamostragem é de exatamente 17 amostras', () => {
  // 1 kHz: em graves o filtro de DC adianta a fase e confunde a medida
  const y = roda('fold', sen(1000, .05), 6000, { fold: 1, bias: 0 }); let melhor = -1, lag = -1;
  for (let L = 0; L < 40; L++) { let c = 0; for (let i = 3000; i < 5000; i++) c += y[i] * Math.sin(.05 * Math.sin(2 * Math.PI * 1000 * (i - L) / SR) * 1.5708); if (c > melhor) { melhor = c; lag = L; } }
  assert.strictEqual(lag, ATRASO);
});
T('crush: 1 bit dá poucos níveis; 16 bits quase não altera; taxa segura amostras', () => {
  const y1 = roda('crush', sen(220, .9), 8000, { bits: 1, rate: 1 }), niv = new Set(Array.from(y1).map(v => v.toFixed(4))); assert.ok(niv.size <= 3, 'níveis ' + niv.size);
  const x = sen(220, .5), y16 = roda('crush', x, 2000, { bits: 16, rate: 1 }); let m = 0; for (let i = 0; i < 2000; i++) m = Math.max(m, Math.abs(y16[i] - x(i))); assert.ok(m < 1e-3);
  const yr = roda('crush', sen(220, .5), 1000, { bits: 16, rate: 10 }); let trocas = 0; for (let i = 1; i < yr.length; i++) if (yr[i] !== yr[i - 1]) trocas++; assert.ok(trocas < 130, 'trocas ' + trocas);
});
T('crush: faixa de parâmetros inteira fica finita', () => {
  for (const [b, r] of [[1, 80], [16, 1], [8, 40], [4, 1]]) assert.ok(stats(roda('crush', sen(330, 1), 4000, { bits: b, rate: r })).fin);
});
// referência do modo nativo: dois biquads lowpass do Web Audio em cascata (Q em dB), como o app monta sem worklet
function biquad(x, f, qdb) {
  const w = 2 * Math.PI * f / SR, al = Math.sin(w) / (2 * Math.pow(10, qdb / 20)), c = Math.cos(w), b0 = (1 - c) / 2, b1 = 1 - c, a0 = 1 + al, a1 = -2 * c, a2 = 1 - al;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0; const y = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) { const v = (b0 * x[i] + b1 * x1 + b0 * x2 - a1 * y1 - a2 * y2) / a0; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; }
  return y;
}
T('ladder: nível e DC do baixo do preset batem com o modo nativo (dentro de 2 dB) em corte baixo e com envelope aberto', () => {
  const f0 = 82.41, N = SR * 2, x = new Float32Array(N);
  for (let i = 0; i < N; i++) { const t = i / SR; x[i] = .28 * ((2 * ((t * f0 * Math.pow(2, -7 / 1200)) % 1) - 1) + (2 * ((t * f0 * Math.pow(2, 7 / 1200)) % 1) - 1) + .77 * Math.sin(2 * Math.PI * f0 * t)); }
  for (const cut of [404, 3300]) {
    const w = stats(roda('ladder', i => x[i], N, { cutoff: cut, res: .575, drive: 4.6 }).subarray(SR / 2)), n = stats(biquad(biquad(x, cut, -3), cut, .575 * 14).subarray(SR / 2));
    const dif = 20 * Math.log10(w.rms / n.rms); assert.ok(Math.abs(dif) < 2, 'corte ' + cut + ': worklet ' + w.rms.toFixed(3) + ' nativo ' + n.rms.toFixed(3) + ' (' + dif.toFixed(1) + ' dB)');
    assert.ok(Math.abs(w.dc) < .01, 'dc ' + w.dc); assert.ok(w.pk < 1, 'pico ' + w.pk);
  }
});
T('fold: bias do preset não deixa DC, nem em silêncio', () => {
  const idle = stats(roda('fold', () => 0, SR, { fold: 5.8, bias: .12 }).subarray(SR / 2)); assert.ok(Math.abs(idle.dc) < 1e-3 && idle.pk < 1e-2, 'ocioso: dc ' + idle.dc + ' pico ' + idle.pk);
  const s = stats(roda('fold', sen(1200, .1), SR, { fold: 5.8, bias: .12 }).subarray(SR / 2)); assert.ok(Math.abs(s.dc) < .01, 'dc ' + s.dc);
});
T('nenhum processador aloca dentro do process (sem new/array/objeto no laço)', () => {
  const corpo = src.slice(src.indexOf('process(')); // o laço de áudio de cada processador
  assert.ok(!/\bnew\s+(Array|Float32Array|Object)|\.map\(|\.filter\(|=>\s*\{|\[\s*\]\s*;/.test(corpo.replace(/constructor\(\)\{[^}]*\}/g, '')), 'possível alocação dentro do process');
});

(async () => {
  let ok = 0, falha = 0;
  for (const [n, f] of fila) { try { await f(); ok++; console.log('ok     ' + n); } catch (e) { falha++; console.log('FALHOU ' + n + '\n       ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join('\n       ') : e)); } }
  console.log('\n' + ok + ' testes do worklet passaram, ' + falha + ' falharam');
  process.exit(falha ? 1 : 0);
})();
