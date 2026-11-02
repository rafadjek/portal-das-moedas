// Verifica as páginas de verdade: sobe um servidor local e abre cada URL no Edge/Chrome sem janela,
// lendo o DOM depois que o JavaScript rodou. Sem navegador instalado, os testes são ignorados.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NAVEGADORES = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
];
const NAVEGADOR = NAVEGADORES.find(p => fs.existsSync(p));
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

let bloquearCatalogo = false;
const servidor = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (bloquearCatalogo && url.pathname === '/catalog.json') { res.writeHead(404); return res.end(); }
  const arq = path.join(RAIZ, url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname));
  if (!arq.startsWith(RAIZ) || !fs.existsSync(arq) || fs.statSync(arq).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
  fs.createReadStream(arq).pipe(res);
});
await new Promise(ok => servidor.listen(0, '127.0.0.1', ok));
const BASE = `http://127.0.0.1:${servidor.address().port}`;
test.after(() => servidor.close());

/** DOM final da página, depois do JavaScript */
function dom(caminho) {
  const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-'));
  return new Promise((ok, falha) => {
    execFile(NAVEGADOR, ['--headless=new', '--disable-gpu', `--user-data-dir=${perfil}`,
      '--virtual-time-budget=8000', '--dump-dom', BASE + caminho],
      { maxBuffer: 64 * 1024 * 1024, timeout: 60000 }, (err, out) => {
        fs.rmSync(perfil, { recursive: true, force: true });
        err ? falha(err) : ok(out);
      });
  });
}
const opts = { skip: NAVEGADOR ? false : 'nenhum navegador encontrado' };
const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const pecas = html => html.split('<a class="peca"').slice(1);
const nomes = html => [...html.matchAll(/class="peca__nome">([^<]*)</g)].map(m => m[1]);

test('início: mostra as 167 peças, com as esgotadas no fim', opts, async () => {
  const html = await dom('/index.html');
  const lista = pecas(html);
  assert.equal(lista.length, 167);
  assert.ok(!lista[0].includes('selo--esgotada'), 'primeira peça não pode estar esgotada');
  assert.ok(lista.at(-1).includes('selo--esgotada'), 'última peça deve estar esgotada');
});

test('início: tem o chip Tudo e os 7 grupos, sem categoria de ouro', opts, async () => {
  const html = await dom('/index.html');
  assert.equal([...html.matchAll(/data-grupo="/g)].length, 8);
  assert.ok(!/Moedas de Ouro/.test(html));
});

test('início: ano aparece em Fraunces quando o nome tem ano', opts, async () => {
  const html = await dom('/index.html');
  assert.ok(html.includes('class="peca__ano">1896<'), 'a 40 Réis de 1896 deve mostrar o ano');
});

test('início: busca "cedula" mostra só cédulas e a contagem confere', opts, async () => {
  const html = await dom('/index.html?q=cedula');
  const lista = nomes(html);
  assert.ok(lista.length > 0);
  assert.ok(lista.every(n => norm(n).includes('cedula')));
  assert.ok(new RegExp(`<strong>${lista.length}</strong> de 167`).test(html));
});

test('início: busca sem resultado explica o que fazer', opts, async () => {
  const html = await dom('/index.html?q=zzzz');
  assert.equal(pecas(html).length, 0);
  assert.ok(html.includes('class="empty"') && html.includes('zzzz'));
  assert.ok(html.includes('Limpar busca e filtros'));
});

test('início: parâmetros inválidos são ignorados', opts, async () => {
  const html = await dom('/index.html?grupo=xyz&ordem=foo');
  assert.equal(pecas(html).length, 167);
});

test('início: se o catálogo não carregar, mostra aviso com link da Shopee', opts, async () => {
  bloquearCatalogo = true;
  try {
    const html = await dom('/index.html');
    assert.equal(pecas(html).length, 0);
    assert.ok(html.includes('class="empty"') && html.includes('shopee.com.br'));
  } finally { bloquearCatalogo = false; }
});
