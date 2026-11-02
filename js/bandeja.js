/* ============================================================
   MundoMoedas - Página inicial "Bandeja"
   Grade de peças, filtros, busca e ordenação.
   Depende de logica.js e app.js.
   ============================================================ */

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

async function iniciarBandeja() {
  const grade = document.getElementById('grade');
  const chips = document.getElementById('chips');
  const ordem = document.getElementById('ordem');
  const contagem = document.getElementById('contagem');
  const busca = document.getElementById('busca');

  const todos = await carregarCatalogo();
  grade.removeAttribute('aria-busy');

  if (!todos.length) {
    grade.innerHTML = `<div class="empty">
      <h3>Não foi possível carregar as peças</h3>
      <p>Você pode ver o catálogo completo direto na nossa loja.</p>
      <a class="btn btn--primario" href="${LOJA.shopee}" target="_blank" rel="noopener">Abrir a loja na Shopee</a>
    </div>`;
    return;
  }

  let estado = estadoDaURL(location.search);
  busca.value = estado.q;
  ordem.value = estado.ordem;

  const porGrupo = contarGrupos(todos);
  const opcoes = [{ id: '', rotulo: 'Tudo', n: todos.length },
    ...GRUPOS.filter(g => porGrupo[g.id]).map(g => ({ id: g.id, rotulo: g.rotulo, n: porGrupo[g.id] }))];
  chips.innerHTML = opcoes.map(o =>
    `<button type="button" class="chip" data-grupo="${o.id}" aria-pressed="false">${o.rotulo}<span class="chip__n">${o.n}</span></button>`
  ).join('');

  function desenhar() {
    const lista = ordenar(filtrar(todos, estado), estado.ordem);

    chips.querySelectorAll('.chip').forEach(c =>
      c.setAttribute('aria-pressed', String(c.dataset.grupo === estado.grupo)));
    contagem.innerHTML = lista.length === todos.length
      ? `<strong>${todos.length}</strong> peças`
      : `<strong>${lista.length}</strong> de ${todos.length} peças`;

    const qs = estadoParaURL(estado);
    history.replaceState(null, '', qs ? '?' + qs : location.pathname);

    if (!lista.length) {
      const o = estado.q ? `Nenhuma peça para “${escapeHTML(estado.q)}”` : 'Nenhuma peça neste filtro';
      grade.innerHTML = `<div class="empty">
        <h3>${o}</h3>
        <p>Confira a grafia, busque só pelo ano ou volte a ver todas as peças.</p>
        <button type="button" class="btn btn--primario" id="limpar">Limpar busca e filtros</button>
      </div>`;
      document.getElementById('limpar').addEventListener('click', () => {
        estado = { q: '', grupo: '', ordem: estado.ordem };
        busca.value = '';
        desenhar();
      });
      return;
    }
    grade.innerHTML = lista.map(pecaHTML).join('');
  }

  chips.addEventListener('click', e => {
    const c = e.target.closest('.chip');
    if (!c) return;
    estado.grupo = (c.dataset.grupo === estado.grupo) ? '' : c.dataset.grupo;
    desenhar();
  });
  ordem.addEventListener('change', () => { estado.ordem = ordem.value; desenhar(); });
  busca.addEventListener('input', () => { estado.q = busca.value.trim(); desenhar(); });
  busca.form.addEventListener('submit', e => e.preventDefault());

  desenhar();
}

document.addEventListener('DOMContentLoaded', iniciarBandeja);
