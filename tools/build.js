#!/usr/bin/env node
// Monta o arquivo único do Micélio (HTML + CSS + JS + worklet embutido), para teste offline
// e para abrir direto no Chrome do Android por content://, onde arquivos externos não carregam.
// Uso: node tools/build.js [saida.html]   (padrão: dist/micelio-single.html)
const fs = require('fs'), path = require('path');
const raiz = path.join(__dirname, '..');
const ler = f => fs.readFileSync(path.join(raiz, f), 'utf8');
const html = ler('index.html'), css = ler('style.css'), app = ler('app.js'), wk = ler('dsp-worklet.js');

const LINK = '<link rel="stylesheet" href="style.css">', SCRIPT = '<script src="app.js"></script>';
for (const [nome, marca] of [['link do CSS', LINK], ['script do app', SCRIPT]])
  if (html.split(marca).length !== 2) { console.error('index.html precisa ter exatamente um ' + nome + ': ' + marca); process.exit(1); }
for (const [nome, txt] of [['app.js', app], ['dsp-worklet.js', wk], ['style.css', css]])
  if (/<\/(script|style)/i.test(txt)) { console.error(nome + ' contém uma tag de fechamento que quebraria o HTML embutido'); process.exit(1); }

const saida = path.resolve(process.argv[2] || path.join(raiz, 'dist', 'micelio-single.html'));
const out = html.split(LINK).join('<style>\n' + css + '</style>')
  .split(SCRIPT).join('<script>window.MICELIO_WK=' + JSON.stringify(wk).replace(/</g, '\\u003c') + ';</script>\n<script>\n' + app + '</script>');
fs.mkdirSync(path.dirname(saida), { recursive: true });
fs.writeFileSync(saida, out);
console.log('gerado ' + saida + ' (' + out.length + ' bytes)');
