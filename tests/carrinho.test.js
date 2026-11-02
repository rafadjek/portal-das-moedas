// Regressão: o carrinho e o pedido por WhatsApp não podem mudar com a repaginada.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function carregarApp() {
  const memoria = new Map();
  const abertas = [];
  const noop = () => {};
  const ctx = {
    document: {
      addEventListener: noop, querySelector: () => null, querySelectorAll: () => [],
      getElementById: () => null, createElement: () => ({ setAttribute: noop, classList: { add: noop, remove: noop }, querySelector: () => ({}) }),
      body: { appendChild: noop }
    },
    localStorage: { getItem: k => (memoria.has(k) ? memoria.get(k) : null), setItem: (k, v) => memoria.set(k, v) },
    window: { open: (...args) => abertas.push(args) },
    requestAnimationFrame: noop, setTimeout: noop, clearTimeout: noop, console,
    location: { pathname: '/' }, fetch: noop
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'logica.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8'), ctx);
  return { ctx, abertas, run: s => vm.runInContext(s, ctx) };
}

const produto = { id: '19799075820', nome: '40 Réis 1896 Original', imagem: 'x.jpg' };
const variacao = { id: '149539600950', nome: 'Número 01', preco: 6595, estoque: 1 };

test('carrinho soma quantidade e total', () => {
  const { run } = carregarApp();
  run(`Cart.add(${JSON.stringify(produto)}, ${JSON.stringify(variacao)}, 2)`);
  assert.equal(run('Cart.count()'), 2);
  assert.equal(run('Cart.total()'), 13190);
});

test('pedido abre o WhatsApp do número da loja com a lista e o total', () => {
  const { run, abertas } = carregarApp();
  run(`Cart.add(${JSON.stringify(produto)}, ${JSON.stringify(variacao)}, 1)`);
  run('Cart.pedido()');
  assert.equal(abertas.length, 1);
  const url = new URL(abertas[0][0]);
  assert.equal(url.origin + url.pathname, 'https://wa.me/5511943016366');
  const texto = url.searchParams.get('text');
  assert.ok(texto.includes('40 Réis 1896 Original'));
  assert.ok(texto.includes('Variação: Número 01'));
  assert.ok(/TOTAL: R\$\s6\.595,00/.test(texto.replace(/ /g, ' ')));
});

test('pedido com carrinho vazio não abre o WhatsApp', () => {
  const { run, abertas } = carregarApp();
  run('Cart.pedido()');
  assert.equal(abertas.length, 0);
});

test('estoqueInfo usa o singular quando resta uma unidade', () => {
  const { run } = carregarApp();
  assert.equal(run('estoqueInfo(1).txt'), 'Última unidade');
  assert.equal(run('estoqueInfo(3).txt'), 'Últimas 3 unidades');
  assert.equal(run('estoqueInfo(0).txt'), 'Indisponível');
});
