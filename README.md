# MundoMoedas (portal-das-moedas)

Vitrine da loja de moedas e cédulas, com carrinho que fecha o pedido pelo WhatsApp e link para cada anúncio na Shopee.

- **No ar:** https://www.mundomoedas.com.br (GitHub Pages, ramo `main`, domínio no `CNAME`)
- **Catálogo:** `catalog.json` (167 anúncios sincronizados da Shopee; não editar à mão)
- **Fichas técnicas:** `fichas.json`, separado do catálogo para não se perder quando ele for sincronizado. Para cada anúncio de um único tipo de moeda, guarda o número do Numista e **só três dados: material, peso e diâmetro**, que aparecem na página da peça logo abaixo de Tipo, Itens e Disponibilidade. Cédulas, lotes, conjuntos com valores diferentes e anúncios que misturam tipos ao longo dos anos ficam sem ficha.
  - Gerar dados de uma moeda: `node "D:\Projetos Claude\apoio\ferramentas\numista\numista.mjs" anuncio <N#>` (chave na variável `NUMISTA_API_KEY`).
  - Anúncio novo: achar o N# no Numista e acrescentar `"<id do anúncio>": { "numista": N#, "material": "...", "peso": "x g", "diametro": "y mm" }`.
- **Testes:** `node --test tests/` (abre as páginas no Edge/Chrome sem janela; inclui as fichas).
