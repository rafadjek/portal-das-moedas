/* ============================================================
   MundoMoedas - App compartilhado
   Header, carrinho (localStorage) e envio de pedido
   ============================================================ */

/* ---------- Configuração da loja ---------- */
const LOJA = {
  nome: 'MundoMoedas',
  // ALTERE AQUI o seu WhatsApp (com código do país, só números)
  whatsapp: '5511943016366',
  shopee: 'https://shopee.com.br/shop/486896133',
  email: 'contato@mundomoedas.com.br'
};

/* ---------- Carrinho ---------- */
const CART_KEY = 'mundomoedas_cart';

const Cart = {
  read() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn('Carrinho corrompido, recriando.', e);
      return [];
    }
  },

  write(items) {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('Nao foi possivel salvar o carrinho.', e);
    }
    Cart.updateBadge();
  },

  add(produto, variacaoId, qtd) {
    const items = Cart.read();
    const key = `${produto.id}::${variacaoId || 'padrao'}`;
    const existing = items.find(i => i.key === key);
    const q = Math.max(1, qtd || 1);

    if (existing) {
      existing.qtd += q;
    } else {
      items.push({
        key: key,
        id: produto.id,
        nome: produto.nome,
        imagem: produto.imagem,
        variacaoId: variacaoId || '',
        variacaoNome: variacaoId ? (variacaoId.nome || '') : 'Padrão',
        preco: Number(variacaoId ? variacaoId.preco : produto.preco) || 0,
        estoque: Number(variacaoId ? variacaoId.estoque : produto.estoque) || 0,
        qtd: q
      });
    }

    Cart.write(items);
    Toast.show('Adicionado ao carrinho');
    return items;
  },

  setQtd(key, qtd) {
    let items = Cart.read();
    const item = items.find(i => i.key === key);
    if (!item) return;

    if (qtd <= 0) {
      items = items.filter(i => i.key !== key);
    } else {
      item.qtd = qtd;
    }
    Cart.write(items);
  },

  remove(key) {
    Cart.write(Cart.read().filter(i => i.key !== key));
  },

  clear() {
    Cart.write([]);
  },

  count() {
    return Cart.read().reduce((s, i) => s + i.qtd, 0);
  },

  total() {
    return Cart.read().reduce((s, i) => s + (i.preco * i.qtd), 0);
  },

  updateBadge() {
    const n = Cart.count();
    document.querySelectorAll('[data-cart-count]').forEach(el => {
      el.textContent = n > 99 ? '99+' : n;
      el.hidden = n === 0;
    });
  },

  /** Monta a mensagem e abre o WhatsApp */
  pedido() {
    const items = Cart.read();
    if (!items.length) {
      Toast.show('Seu carrinho está vazio');
      return;
    }

    const linhas = items.map((i, n) =>
      `${n + 1}. ${i.nome}\n   Variação: ${i.variacaoNome}\n   Qtd: ${i.qtd} x ${brl(i.preco)} = ${brl(i.preco * i.qtd)}`
    ).join('\n\n');

    const texto =
`Olá! Gostaria de fazer um pedido na ${LOJA.nome}:

${linhas}

─────────────────────────────
TOTAL: ${brl(Cart.total())}
Quantidade de itens: ${Cart.count()}

Aguardo confirmação de disponibilidade e prazo de entrega.
Pode me passar as instruções de pagamento?`;

    window.open(`https://wa.me/${LOJA.whatsapp}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
  }
};

/* ---------- Utilidades ---------- */
function brl(v) {
  return Number(v || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

/** Remove acentos e normaliza para busca */
function norm(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function estoqueInfo(item) {
  const n = Number(item) || 0;
  if (n <= 0) return { txt: 'Indisponível', cls: 'out' };
  if (n <= 5)  return { txt: `Últimas ${n} unidades`, cls: 'low' };
  return { txt: `${n} disponíveis`, cls: 'ok' };
}

/** Descobre a categoria amigável a partir do nome do produto */
function categorizar(nome) {
  const n = norm(nome);
  if (/cedula|nota|celula|bilhete/.test(n))  return 'cedulas';
  if (/lote|conjunto|colecao|kit/.test(n))   return 'colecoes';
  if (/busto|suporte|album|estojo|encosto|acessorio|chaveiro|bolsa|caixa/.test(n)) return 'acessorios';
  if (/ouro|platina|prata/.test(n))          return 'ouro';
  if (/comemorativ|olimpiad|jogos|world cup|copa/.test(n)) return 'comemorativas';
  return 'moedas';
}

const CATEGORIAS = {
  moedas:        'Moedas do Brasil',
  antigas:       'Moedas Antigas',
  ouro:          'Moedas de Ouro',
  comemorativas: 'Moedas Comemorativas',
  acessorios:    'Acessórios',
  cedulas:       'Cédulas',
  colecoes:      'Coleções e Lotes'
};

/* ---------- Toast ---------- */
const Toast = {
  show(msg) {
    let t = document.querySelector('.toast');
    if (!t) {
      t = document.createElement('div');
      t.className = 'toast';
      t.setAttribute('role', 'status');
      t.setAttribute('aria-live', 'polite');
      document.body.appendChild(t);
    }
    t.innerHTML =
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg><span></span>`;
    t.querySelector('span').textContent = msg;
    requestAnimationFrame(() => t.classList.add('is-on'));

    clearTimeout(this._timer);
    this._timer = setTimeout(() => t.classList.remove('is-on'), 3200);
  }
};

/* ---------- Header / navegação ---------- */
function initHeader() {
  const burger = document.querySelector('[data-burger]');
  const nav = document.querySelector('[data-nav]');

  if (burger && nav) {
    burger.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', String(open));
      burger.innerHTML = open
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>';
    });

    nav.addEventListener('click', e => {
      if (e.target.tagName === 'A') {
        nav.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Marca o link da página atual
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === path || (path === '' && href === 'index.html')) {
      a.setAttribute('aria-current', 'page');
    }
  });

  Cart.updateBadge();
}

/* ---------- Carrega o catálogo ---------- */
let CATALOGO = [];

async function carregarCatalogo() {
  if (CATALOGO.length) return CATALOGO;

  try {
    const resp = await fetch('./catalog.json', { cache: 'no-cache' });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    CATALOGO = await resp.json();
  } catch (e) {
    console.error('Falha ao carregar catalog.json:', e);
    CATALOGO = [];
  }
  return CATALOGO;
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

/* ---------- Card de produto ---------- */
function cardHTML(p) {
  const { min, max } = precos(p);
  const est = estoqueInfo(estoqueTotal(p));
  const cat = CATEGORIAS[categorizar(p.nome)] || 'Moedas';
  const novo = p.publico_match === 'SIM';

  const precoTxt = (max > min)
    ? `<span style="font-size:.85rem;color:var(--muted)">a partir de</span> ${brl(min)}`
    : brl(min);

  return `
  <article class="card">
    <a class="card__media" href="produto.html?id=${encodeURIComponent(p.id)}" aria-label="${escapeHTML(p.nome)}">
      <img src="${p.imagem}" alt="${escapeHTML(p.nome)}" loading="lazy"
           onerror="this.src='assets/images/placeholder.svg'">
      ${novo ? '<span class="card__flag">Online</span>' : ''}
      ${est.cls === 'out' ? '<span class="card__flag card__flag--out">Esgotado</span>' : ''}
    </a>
    <div class="card__body">
      <span class="card__cat">${cat}</span>
      <h3 class="card__name"><a href="produto.html?id=${encodeURIComponent(p.id)}">${escapeHTML(p.nome)}</a></h3>
      <div class="card__price">${precoTxt}</div>
      <div class="card__stock card__stock--${est.cls}">${est.txt}</div>
      <div class="card__actions">
        <a class="btn btn--gold btn--block btn--sm"
           href="produto.html?id=${encodeURIComponent(p.id)}"
           ${est.cls === 'out' ? 'aria-disabled="true" tabindex="-1"' : ''}>
          ${est.cls === 'out' ? 'Indisponível' : 'Comprar'}
        </a>
      </div>
    </div>
  </article>`;
}

function escapeHTML(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* ---------- Inicialização ---------- */
document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  document.querySelectorAll('[data-whatsapp]').forEach(b => {
    b.addEventListener('click', ev => {
      ev.preventDefault();
      Cart.pedido();
    });
  });
});