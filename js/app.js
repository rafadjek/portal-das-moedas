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

  _ultimo: null,

  updateBadge() {
    const n = Cart.count();
    const subiu = Cart._ultimo !== null && n > Cart._ultimo;
    Cart._ultimo = n;
    document.querySelectorAll('[data-cart-count]').forEach(el => {
      el.textContent = n > 99 ? '99+' : n;
      el.hidden = n === 0;
      if (subiu) {
        el.classList.remove('pulsa');
        void el.offsetWidth;
        el.classList.add('pulsa');
      }
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

function estoqueInfo(item) {
  const n = Number(item) || 0;
  if (n <= 0) return { txt: 'Indisponível', cls: 'out' };
  if (n === 1) return { txt: 'Última unidade', cls: 'low' };
  if (n <= 5)  return { txt: `Últimas ${n} unidades`, cls: 'low' };
  return { txt: `${n} disponíveis`, cls: 'ok' };
}

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

/* ---------- Cabeçalho e rodapé (definidos uma só vez, usados em todas as páginas) ---------- */
function montarCasca() {
  const topo = document.getElementById('topo');
  if (topo) {
    topo.innerHTML = `
    <div class="wrap header__in">
      <a href="index.html" class="logo" aria-label="MundoMoedas — página inicial">
        <img src="assets/images/logo.svg" alt="" class="logo__mark" width="36" height="36">
        <span class="logo__name">MundoMoedas</span>
      </a>

      <form class="busca" action="index.html" method="get" role="search">
        <label class="sr-only" for="busca">Buscar peça por nome ou ano</label>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input type="search" id="busca" name="q" placeholder="Buscar por nome ou ano" autocomplete="off">
      </form>

      <nav class="nav" data-nav aria-label="Navegação principal">
        <a href="sobre.html">Sobre</a>
        <a href="como-comprar.html">Como comprar</a>
        <a href="contato.html">Contato</a>
      </nav>

      <div class="header__actions">
        <a href="carrinho.html" class="icon-btn" aria-label="Carrinho">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
          <span class="cart-count" data-cart-count hidden>0</span>
        </a>
        <button class="burger" data-burger aria-label="Abrir menu" aria-expanded="false">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
        </button>
      </div>
    </div>`;
  }

  const rodape = document.getElementById('rodape');
  if (rodape) {
    rodape.innerHTML = `
    <div class="wrap footer__in">
      <div>
        <span class="footer__nome">MundoMoedas</span>
        <p class="footer__about">Peças selecionadas com rigor para quem coleciona. Do Império à República, do Brasil ao mundo.</p>
      </div>
      <div>
        <h4>Loja</h4>
        <a href="index.html">Todas as peças</a>
        <a href="como-comprar.html">Como comprar</a>
        <a href="sobre.html">Sobre nós</a>
        <a href="carrinho.html">Meu carrinho</a>
      </div>
      <div>
        <h4>Atendimento</h4>
        <a href="${LOJA.shopee}" target="_blank" rel="noopener">Loja na Shopee</a>
        <a href="#" data-whatsapp>Pedir pelo WhatsApp</a>
        <a href="contato.html">Contato</a>
        <a href="mailto:${LOJA.email}">${LOJA.email}</a>
        <p class="footer__hora">Seg a Sex, 9h às 18h</p>
      </div>
    </div>
    <div class="wrap footer__bottom">© ${new Date().getFullYear()} MundoMoedas. Todos os direitos reservados.</div>`;
  }
}

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

function escapeHTML(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* ---------- Peça na grade (início e relacionadas) ---------- */
function pecaHTML(p) {
  const { min, max } = precos(p);
  const ano = extrairAno(p.nome);
  const est = estadoEstoque(p);
  const selo = est === 'esgotada' ? '<span class="selo selo--esgotada">Esgotada</span>'
             : est === 'ultima'   ? '<span class="selo selo--ultima">Última unidade</span>'
             : '';
  const preco = max > min ? `<small>a partir de</small> ${brl(min)}` : brl(min);

  return `<a class="peca" href="produto.html?id=${encodeURIComponent(p.id)}">
    <span class="peca__foto">
      <img src="${escapeHTML(p.imagem)}" alt="${escapeHTML(p.nome)}" width="400" height="400" loading="lazy"
           onerror="this.onerror=null;this.src='assets/images/placeholder.svg'">
      ${selo}
    </span>
    ${ano ? `<span class="peca__ano">${ano}</span>` : ''}
    <span class="peca__nome">${escapeHTML(p.nome)}</span>
    <span class="peca__preco">${preco}</span>
  </a>`;
}

/* ---------- Inicialização ---------- */
document.addEventListener('DOMContentLoaded', () => {
  montarCasca();
  initHeader();
  document.querySelectorAll('[data-whatsapp]').forEach(b => {
    b.addEventListener('click', ev => {
      ev.preventDefault();
      Cart.pedido();
    });
  });
});