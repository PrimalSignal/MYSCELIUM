#!/usr/bin/env node
// Roda localmente os mesmos passos do CI (.github/workflows/ci.yml): sintaxe, arquivo único, testes de lógica e testes do worklet.
// Uso (na raiz do repositório): node tools/verifica.js   — só publique se a última linha disser "tudo verde".
const { spawnSync } = require('child_process'), path = require('path');
const raiz = path.join(__dirname, '..');
const passos = [
  ['sintaxe de app.js', ['--check', 'app.js']],
  ['sintaxe de dsp-worklet.js', ['--check', 'dsp-worklet.js']],
  ['sintaxe de tools/build.js', ['--check', 'tools/build.js']],
  ['montar o arquivo único', ['tools/build.js']],
  ['testes de lógica e do app', ['tests/logica.test.js', 'dist/micelio-single.html']],
  ['testes do worklet', ['tests/worklet.test.js']]
];
let falhou = false;
for (const [nome, args] of passos) {
  const r = spawnSync(process.execPath, args, { cwd: raiz, encoding: 'utf8' });
  const saida = (r.stdout || '') + (r.stderr || ''), linhas = saida.trim().split('\n'), ultima = (linhas.filter(l => /passaram/.test(l)).pop() || '').trim();
  console.log((r.status === 0 ? 'ok     ' : 'FALHOU ') + nome + (r.status === 0 && /passaram/.test(ultima) ? '  —  ' + ultima : ''));
  if (r.status !== 0) { falhou = true; console.log(linhas.filter(l => /FALHOU|Error|erro/i.test(l)).slice(0, 12).join('\n') || saida.slice(-1500)); break; }
}
console.log(falhou ? '\nCI local: FALHOU — não publique.' : '\nCI local: tudo verde — pode publicar.');
process.exit(falhou ? 1 : 0);
