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

/* ---------- Página da peça ---------- */
const catalogo = JSON.parse(fs.readFileSync(path.join(RAIZ, 'catalog.json'), 'utf8'));
const semNbsp = s => s.replace(/\u00a0|&nbsp;/g, ' ');

test('peça: mostra ano, nome, faixa de preço, variações e link direto da Shopee', opts, async () => {
  const html = semNbsp(await dom('/produto.html?id=19799075820'));
  assert.ok(html.includes('class="prod__ano">1896<'));
  assert.ok(html.includes('40 Réis 1896 Original'));
  assert.ok(html.includes('R$ 5.795,00'));
  assert.equal((html.match(/<label class="var-opt( is-on| is-off)*">/g) || []).length, 2);
  assert.ok(html.includes('2 variações'), 'plural correto de variações');
  assert.ok(!/Últimas 1[^0-9]/.test(html), 'singular quando resta uma unidade');
  assert.ok(html.includes('id="add" style="flex:1'), 'botão do carrinho habilitado');
  assert.ok(html.includes('i.486896133.19799075820'), 'o link da Shopee deve apontar para a peça');
});

test('peça: mostra 4 peças relacionadas', opts, async () => {
  const html = await dom('/produto.html?id=19799075820');
  const rel = html.split('id="relacionados"')[1] || '';
  assert.equal((rel.match(/<a class="peca"/g) || []).length, 4);
});

test('peça esgotada: botão de carrinho desabilitado', opts, async () => {
  const esgotada = catalogo.find(p => p.estoque_total === 0);
  const html = await dom('/produto.html?id=' + esgotada.id);
  assert.ok(html.includes('id="add" disabled="" style="flex:1'), 'botão do carrinho desabilitado');
});

test('peça: sem id ou com id inexistente leva de volta ao catálogo', opts, async () => {
  for (const url of ['/produto.html', '/produto.html?id=0000']) {
    const html = await dom(url);
    assert.ok(html.includes('class="empty"') && html.includes('href="index.html"'), url);
  }
});

/* ---------- catalogo.html (página antiga) e sitemap ---------- */
test('catalogo.html leva à página inicial e traduz o ?cat= antigo', opts, async () => {
  const casos = [
    ['/catalogo.html?cat=cedulas', 'data-grupo="cedulas" aria-pressed="true"'],
    ['/catalogo.html?cat=colecoes', 'data-grupo="lotes" aria-pressed="true"'],
    ['/catalogo.html?cat=ouro', 'data-grupo="prata" aria-pressed="true"'],
    ['/catalogo.html', 'data-grupo="" aria-pressed="true"'],
    ['/catalogo.html?cat=acessorios', 'data-grupo="" aria-pressed="true"']
  ];
  for (const [url, esperado] of casos) {
    const html = await dom(url);
    assert.ok(html.includes('id="grade"') && html.includes(esperado), url);
  }
});

test('catalogo.html não é indexado e aponta a página inicial como canônica', () => {
  const html = fs.readFileSync(path.join(RAIZ, 'catalogo.html'), 'utf8');
  assert.ok(html.includes('name="robots" content="noindex"'));
  assert.ok(html.includes('rel="canonical" href="https://mundomoedas.com.br/"'));
});

test('sitemap lista as páginas atuais e não o catalogo.html', () => {
  const xml = fs.readFileSync(path.join(RAIZ, 'sitemap.xml'), 'utf8');
  assert.ok(!xml.includes('catalogo.html'));
  for (const p of ['https://mundomoedas.com.br/', 'sobre.html', 'como-comprar.html', 'contato.html']) {
    assert.ok(xml.includes(p), p);
  }
  const datas = [...xml.matchAll(/<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/g)].map(m => m[1]);
  assert.ok(datas.length >= 4 && datas.every(d => d >= '2026-11-02'), 'lastmod atualizado para o novo visual');
});
