/* ============================================================
   MundoMoedas - Página inicial "Vitrine"
   Régua de épocas, filtros, busca, ordenação e grade de peças.
   Depende de logica.js e app.js (pecaHTML fica em app.js).
   ============================================================ */

async function iniciarBandeja() {
  const grade = document.getElementById('grade');
  const chips = document.getElementById('chips');
  const ordem = document.getElementById('ordem');
  const contagem = document.getElementById('contagem');
  const busca = document.getElementById('busca');
  const regua = document.getElementById('regua');
  const reguaLimpar = document.getElementById('reguaLimpar');

  const todos = await carregarCatalogo();
  grade.removeAttribute('aria-busy');

  if (!todos.length) {
    document.querySelector('.vitrine__regua').hidden = true;
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

  // Régua de épocas: uma barra por década que existe no catálogo (o eixo não muda com os filtros)
  const decadas = Object.keys(contarDecadas(todos)).map(Number).sort((a, b) => a - b);
  regua.innerHTML = decadas.map(d =>
    `<button type="button" class="epoca" data-decada="${d}" aria-pressed="false"><span class="epoca__barra"></span><span class="epoca__ano">${d}</span></button>`
  ).join('');

  /** As barras mostram quantas peças há em cada década com a busca e o tipo atuais */
  function atualizarRegua() {
    const c = contarDecadas(filtrar(todos, { q: estado.q, grupo: estado.grupo }));
    const maior = Math.max(1, ...Object.values(c));
    regua.querySelectorAll('.epoca').forEach(b => {
      const d = Number(b.dataset.decada);
      const n = c[d] || 0;
      const texto = `Década de ${d}: ${n} ${n === 1 ? 'peça' : 'peças'}`;
      b.style.setProperty('--h', Math.round((n / maior) * 100) + '%');
      b.title = texto;
      b.setAttribute('aria-label', texto);
      b.setAttribute('aria-pressed', String(d === estado.decada));
      b.disabled = n === 0 && d !== estado.decada;
    });
    reguaLimpar.hidden = estado.decada === '';
  }

  function desenhar() {
    const lista = ordenar(filtrar(todos, estado), estado.ordem);

    chips.querySelectorAll('.chip').forEach(c =>
      c.setAttribute('aria-pressed', String(c.dataset.grupo === estado.grupo)));
    atualizarRegua();
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
        estado = { q: '', grupo: '', ordem: estado.ordem, decada: '' };
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
  regua.addEventListener('click', e => {
    const b = e.target.closest('.epoca');
    if (!b || b.disabled) return;
    const d = Number(b.dataset.decada);
    estado.decada = (d === estado.decada) ? '' : d;
    desenhar();
  });
  reguaLimpar.addEventListener('click', () => { estado.decada = ''; desenhar(); });
  ordem.addEventListener('change', () => { estado.ordem = ordem.value; desenhar(); });
  busca.addEventListener('input', () => { estado.q = busca.value.trim(); desenhar(); });
  busca.form.addEventListener('submit', e => e.preventDefault());

  desenhar();
}

document.addEventListener('DOMContentLoaded', iniciarBandeja);
