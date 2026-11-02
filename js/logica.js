/* ============================================================
   MundoMoedas - Lógica do catálogo (funções puras)
   Sem acesso a DOM: roda no navegador e em Node (testes).
   ============================================================ */

/** Remove acentos e normaliza para busca */
function norm(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Preço mínimo/máximo de um produto */
function precos(p) {
  if (p.variacoes && p.variacoes.length) {
    const vs = p.variacoes.map(v => Number(v.preco) || 0).filter(v => v > 0);
    if (vs.length) return { min: Math.min(...vs), max: Math.max(...vs) };
  }
  return { min: Number(p.preco) || 0, max: Number(p.preco) || 0 };
}

/** Estoque total somando variações */
function estoqueTotal(p) {
  if (p.variacoes && p.variacoes.length) {
    return p.variacoes.reduce((s, v) => s + (Number(v.estoque) || 0), 0);
  }
  return Number(p.estoque) || 0;
}

/* ---------- Ano ---------- */

// Número de 4 dígitos entre 1500 e 2099 que não seja parte de número maior
const RE_ANO = /(?<!\d)(1[5-9]\d\d|20\d\d)(?!\d)/g;
// Se o número vem logo antes de uma denominação, é valor da moeda e não ano
const RE_DENOMINACAO = /^\s*(reis|cruzeiros?|cruzados?|centavos?|kronen|mil)\b/;

/** Ano da peça, lido do nome (o último número que não seja denominação) */
function extrairAno(nome) {
  const texto = String(nome || '');
  let ano = null;
  for (const m of texto.matchAll(RE_ANO)) {
    const depois = norm(texto.slice(m.index + m[0].length));
    if (!RE_DENOMINACAO.test(depois)) ano = Number(m[0]);
  }
  return ano;
}

/* ---------- Grupos (filtros) ---------- */

// Palavras já sem acento; casam no início de uma palavra do nome
const GRUPOS = [
  { id: 'reis',      rotulo: 'Réis',      palavras: ['reis'] },
  { id: 'cruzeiros', rotulo: 'Cruzeiros', palavras: ['cruzeiro'] },
  { id: 'centavos',  rotulo: 'Centavos',  palavras: ['centavo'] },
  { id: 'cedulas',   rotulo: 'Cédulas',   palavras: ['cedula'] },
  { id: 'prata',     rotulo: 'Prata',     palavras: ['prata'] },
  { id: 'imperio',   rotulo: 'Império',   palavras: ['imperio', 'imperial'] },
  { id: 'lotes',     rotulo: 'Lotes',     palavras: ['lote', 'conjunto', 'kit', 'colecao'] }
];

/** Ids dos grupos a que a peça pertence (pode ser mais de um) */
function gruposDe(p) {
  const nome = norm(p.nome);
  return GRUPOS
    .filter(g => g.palavras.some(w => new RegExp('\\b' + w).test(nome)))
    .map(g => g.id);
}

/** { idDoGrupo: quantidade } */
function contarGrupos(lista) {
  const c = {};
  lista.forEach(p => gruposDe(p).forEach(id => { c[id] = (c[id] || 0) + 1; }));
  return c;
}

/* ---------- Estoque, filtro e ordem ---------- */

function estadoEstoque(p) {
  const n = estoqueTotal(p);
  if (n <= 0) return 'esgotada';
  if (n === 1) return 'ultima';
  return 'ok';
}

/** Filtra por texto (nome, sem acento) e por grupo; grupo desconhecido não casa com nada */
function filtrar(lista, { q = '', grupo = '' } = {}) {
  const busca = norm(q);
  if (grupo && !GRUPOS.some(g => g.id === grupo)) return [];
  return lista.filter(p => {
    if (grupo && !gruposDe(p).includes(grupo)) return false;
    if (busca && !norm(p.nome).includes(busca)) return false;
    return true;
  });
}

const ORDENS = {
  destaques: (a, b) => precos(b).max - precos(a).max,
  menor:     (a, b) => precos(a).min - precos(b).min,
  maior:     (a, b) => precos(b).max - precos(a).max,
  antigas:   (a, b) => {
    const x = extrairAno(a.nome), y = extrairAno(b.nome);
    if (x === null && y === null) return 0;
    if (x === null) return 1;
    if (y === null) return -1;
    return x - y;
  }
};

/** Nova lista ordenada; peças esgotadas ficam sempre no fim */
function ordenar(lista, modo) {
  const cmp = ORDENS[modo] || ORDENS.destaques;
  const esgotada = p => (estadoEstoque(p) === 'esgotada' ? 1 : 0);
  return [...lista].sort((a, b) => esgotada(a) - esgotada(b) || cmp(a, b));
}

/* ---------- Estado na URL ---------- */

// Parâmetros ?cat= do site antigo
const CAT_ANTIGA = { cedulas: 'cedulas', colecoes: 'lotes', ouro: 'prata' };

function estadoDaURL(search) {
  const params = new URLSearchParams(search || '');
  const ids = GRUPOS.map(g => g.id);
  let grupo = params.get('grupo') || '';
  if (!ids.includes(grupo)) grupo = CAT_ANTIGA[params.get('cat')] || '';
  const ordem = params.get('ordem');
  return {
    q: (params.get('q') || '').trim(),
    grupo,
    ordem: ORDENS[ordem] ? ordem : 'destaques'
  };
}

/** Query string sem "?", omitindo o que é padrão */
function estadoParaURL({ q = '', grupo = '', ordem = 'destaques' } = {}) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (grupo) params.set('grupo', grupo);
  if (ordem && ordem !== 'destaques') params.set('ordem', ordem);
  return params.toString();
}

if (typeof module !== 'undefined') {
  module.exports = {
    norm, precos, estoqueTotal, extrairAno, GRUPOS, gruposDe, contarGrupos,
    estadoEstoque, filtrar, ordenar, estadoDaURL, estadoParaURL
  };
}
