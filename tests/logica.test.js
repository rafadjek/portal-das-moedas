const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../js/logica.js');

const prod = (nome, estoque = 5, preco = 10, extra = {}) =>
  ({ id: nome, nome, variacoes: [{ nome: 'Padrão', preco, estoque }], ...extra });

test('extrairAno acha o ano no fim do nome', () => {
  assert.equal(L.extrairAno('40 Réis 1896 Original'), 1896);
  assert.equal(L.extrairAno('Cédula Antiga Império Austríaco 1000 kronen 1902'), 1902);
  assert.equal(L.extrairAno('Moeda de 5 Cruzeiros de 1985 (FAO - Alimentos para o Mundo)'), 1985);
  assert.equal(L.extrairAno('2000 Réis 1936'), 1936);
});

test('extrairAno não inventa ano a partir de denominação ou quantidade', () => {
  assert.equal(L.extrairAno('1500 Réis'), null);
  assert.equal(L.extrairAno('Cédulas do Sudão SOB/FE'), null);
  assert.equal(L.extrairAno('Lote 3000 moedas'), null);
});

test('gruposDe classifica pelo nome com palavra inteira ou prefixo', () => {
  assert.deepEqual(L.gruposDe({ nome: 'Moeda de 5 Cruzeiros de 1985' }), ['cruzeiros']);
  const g = L.gruposDe({ nome: 'Moeda 400 Réis Império' });
  assert.ok(g.includes('reis') && g.includes('imperio'));
  assert.deepEqual(L.gruposDe({ nome: 'Cédulas do Sudão' }), ['cedulas']);
  assert.ok(!L.gruposDe({ nome: 'Rei Pedro' }).includes('reis'));
});

test('GRUPOS tem os sete grupos do catálogo com rótulo em português', () => {
  assert.deepEqual(L.GRUPOS.map(g => g.id),
    ['reis', 'cruzeiros', 'centavos', 'cedulas', 'prata', 'imperio', 'lotes']);
  assert.deepEqual(L.GRUPOS.map(g => g.rotulo),
    ['Réis', 'Cruzeiros', 'Centavos', 'Cédulas', 'Prata', 'Império', 'Lotes']);
});

test('contarGrupos soma por grupo', () => {
  const c = L.contarGrupos([prod('40 Réis 1896'), prod('5 Cruzeiros 1985'), prod('10 Cruzeiros 1986')]);
  assert.equal(c.reis, 1);
  assert.equal(c.cruzeiros, 2);
  assert.equal(c.cedulas || 0, 0);
});

test('filtrar ignora acento e caixa e acha pelo ano', () => {
  const lista = [prod('40 Réis 1896'), prod('Cédula 1000 kronen 1902'), prod('5 Cruzeiros 1985')];
  assert.deepEqual(L.filtrar(lista, { q: 'REIS' }).map(p => p.nome), ['40 Réis 1896']);
  assert.deepEqual(L.filtrar(lista, { q: 'cedula' }).map(p => p.nome), ['Cédula 1000 kronen 1902']);
  assert.deepEqual(L.filtrar(lista, { q: '1896' }).map(p => p.nome), ['40 Réis 1896']);
});

test('filtrar com grupo inexistente devolve lista vazia sem lançar', () => {
  assert.deepEqual(L.filtrar([prod('40 Réis 1896')], { grupo: 'xyz' }), []);
});

test('filtrar sem critérios devolve tudo', () => {
  const lista = [prod('a'), prod('b')];
  assert.equal(L.filtrar(lista, {}).length, 2);
});

test('ordenar destaques: em estoque primeiro, maior preço primeiro', () => {
  const lista = [prod('barata', 5, 5), prod('esgotada cara', 0, 900), prod('cara', 5, 100)];
  assert.deepEqual(L.ordenar(lista, 'destaques').map(p => p.nome), ['cara', 'barata', 'esgotada cara']);
});

test('ordenar antigas: ano crescente, sem ano depois, esgotadas no fim', () => {
  const lista = [
    prod('Moeda 1985', 5), prod('Moeda sem data', 5), prod('Moeda 1896', 5), prod('Moeda 1800', 0)
  ];
  assert.deepEqual(L.ordenar(lista, 'antigas').map(p => p.nome),
    ['Moeda 1896', 'Moeda 1985', 'Moeda sem data', 'Moeda 1800']);
});

test('ordenar menor e maior preço mantêm esgotadas no fim', () => {
  const lista = [prod('a', 5, 30), prod('b', 0, 1), prod('c', 5, 10)];
  assert.deepEqual(L.ordenar(lista, 'menor').map(p => p.nome), ['c', 'a', 'b']);
  assert.deepEqual(L.ordenar(lista, 'maior').map(p => p.nome), ['a', 'c', 'b']);
});

test('ordenar não altera a lista original', () => {
  const lista = [prod('a', 5, 1), prod('b', 5, 9)];
  L.ordenar(lista, 'maior');
  assert.deepEqual(lista.map(p => p.nome), ['a', 'b']);
});

test('estadoEstoque soma as variações', () => {
  assert.equal(L.estadoEstoque(prod('x', 0)), 'esgotada');
  assert.equal(L.estadoEstoque(prod('x', 1)), 'ultima');
  assert.equal(L.estadoEstoque(prod('x', 2)), 'ok');
  const duas = { nome: 'x', variacoes: [{ preco: 1, estoque: 1 }, { preco: 1, estoque: 1 }] };
  assert.equal(L.estadoEstoque(duas), 'ok');
});

test('precos e estoqueTotal funcionam com e sem variações', () => {
  assert.deepEqual(L.precos({ variacoes: [{ preco: 5795, estoque: 1 }, { preco: 6595, estoque: 1 }] }),
    { min: 5795, max: 6595 });
  assert.deepEqual(L.precos({ preco: 7 }), { min: 7, max: 7 });
  assert.equal(L.estoqueTotal({ estoque: 3 }), 3);
});

test('norm remove acento e caixa', () => {
  assert.equal(L.norm('  Cédula ÁÉÍ '), 'cedula aei');
});

test('estadoDaURL lê parâmetros válidos', () => {
  assert.deepEqual(L.estadoDaURL('?q=reis&grupo=cruzeiros&ordem=maior'),
    { q: 'reis', grupo: 'cruzeiros', ordem: 'maior' });
});

test('estadoDaURL traduz parâmetros antigos ?cat=', () => {
  assert.equal(L.estadoDaURL('?cat=cedulas').grupo, 'cedulas');
  assert.equal(L.estadoDaURL('?cat=colecoes').grupo, 'lotes');
  assert.equal(L.estadoDaURL('?cat=ouro').grupo, 'prata');
});

test('estadoDaURL ignora valores inválidos ou sem equivalente', () => {
  assert.equal(L.estadoDaURL('?cat=acessorios').grupo, '');
  assert.equal(L.estadoDaURL('?grupo=xyz').grupo, '');
  assert.equal(L.estadoDaURL('?ordem=foo').ordem, 'destaques');
  assert.deepEqual(L.estadoDaURL(''), { q: '', grupo: '', ordem: 'destaques' });
});

test('estadoParaURL omite valores padrão e codifica a busca', () => {
  assert.equal(L.estadoParaURL({ q: '', grupo: '', ordem: 'destaques' }), '');
  assert.equal(L.estadoParaURL({ q: 'réis 1896', grupo: 'reis', ordem: 'maior' }),
    'q=r%C3%A9is+1896&grupo=reis&ordem=maior');
});
