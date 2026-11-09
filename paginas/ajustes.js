/* ============================================================
   paginas/ajustes.js — Hospital Reviva
   Ajuste de estoque / inventário: quando a contagem física diverge
   do sistema, registra um lançamento de ajuste (com justificativa
   obrigatória) que reconcilia o saldo. Nada é digitado à mão —
   o saldo continua derivado das movimentações.
   ============================================================ */

/* ===================== SELEÇÃO DE LOTE =====================
   A lista vinha de allLotes(): TODOS os lotes que já existiram. Lote zerado
   não some do sistema — e não deve sumir, porque é ele que sustenta a
   escrituração passada —, então a lista só cresce. Com alguns meses de
   histórico, achar o lote conferido vira rolagem.

   Por padrão aparece só o que tem saldo diferente de zero. Zero é o estado
   de quem já saiu da prateleira; quem confere contagem olha o que existe.

   Saldo NEGATIVO continua sempre visível, mesmo com o filtro ligado: é a
   inconsistência que o ajuste existe para resolver, e escondê-la seria
   escondê-la de quem tem a função de corrigi-la.

   Zerado segue alcançável pela caixa "incluir zerados", porque a contagem
   física às vezes acha unidade num lote que o sistema dá como vazio — sobra
   sobre saldo zero é dos casos que mais precisam de ajuste. */
function _ajListaLotes(termo, incluirZerados, manter) {
  const t = (termo || "").trim().toLowerCase();
  return allLotes().filter((l) => {
    // o lote já escolhido na linha nunca sai da lista, senão trocar o filtro
    // apagaria a seleção que o usuário já tinha feito
    if (manter && l.chave === manter) return true;
    if (!incluirZerados && saldoLoteChave(l.chave) === 0) return false;
    if (!t) return true;
    const sub = subById(l.subId) || {};
    const pac = l.restritoPaciente ? (patById(l.restritoPaciente) || {}).nome || "" : "";
    return `${sub.nome || ""} ${l.lote} ${pac}`.toLowerCase().indexOf(t) >= 0;
  });
}

// Opções de lote, agrupadas por substância (ordem alfabética), lote por validade.
function _optLotesAjuste(termo, incluirZerados, manter) {
  const lista = _ajListaLotes(termo, incluirZerados, manter);
  if (!lista.length) return `<option value="">— nenhum lote encontrado —</option>`;
  const porSub = {};
  lista.forEach((l) => { (porSub[l.subId] ||= []).push(l); });
  const subs = Object.keys(porSub).sort((a, b) =>
    ((subById(a) || {}).nome || "").localeCompare((subById(b) || {}).nome || "", "pt-BR"));
  return `<option value="">— selecione o lote —</option>` +
    subs.map((id) => `<optgroup label="${_esc((subById(id) || {}).nome || "—")}">` +
      porSub[id].sort((a, b) => (a.validade < b.validade ? -1 : 1))
        .map((l) => {
          const s = saldoLoteChave(l.chave);
          return `<option value="${l.chave}">${_esc(l.lote)} · val. ${fmtDate(l.validade)}${l.restritoPaciente ? " · custódia " + _esc((patById(l.restritoPaciente)||{}).nome||"") : ""} (sistema: ${s}${s < 0 ? " ⚠" : ""})</option>`;
        }).join("") +
      `</optgroup>`).join("");
}

/* Os controles de filtro, iguais nos dois formulários de ajuste. */
function _ajControlesFiltro() {
  return `
    <div class="ff row2" style="margin-bottom:4px">
      <div><label>Buscar lote</label>
        <input id="ajBusca" type="text" placeholder="substância, número do lote ou paciente" oninput="_ajAplicaFiltro()"></div>
      <div><label>&nbsp;</label>
        <label style="display:flex;align-items:center;gap:7px;font-weight:400;padding:9px 0">
          <input id="ajZerados" type="checkbox" onchange="_ajAplicaFiltro()" style="width:auto;margin:0">
          Incluir lotes zerados
        </label></div>
    </div>
    <div class="note-box" id="ajContador" style="margin:0 0 12px"></div>`;
}

/* Refaz as opções de TODOS os selects de lote abertos, preservando o que já
   estava escolhido em cada um. No formulário de vários lotes isso importa:
   escolher três, filtrar para achar o quarto e perder os três seria pior do
   que a lista comprida. */
function _ajAplicaFiltro() {
  const termo = (document.getElementById("ajBusca") || {}).value || "";
  const incZ = !!(document.getElementById("ajZerados") || {}).checked;
  document.querySelectorAll("#ajLote, #ajLinhas .a-lote").forEach((sel) => {
    const atual = sel.value;
    sel.innerHTML = _optLotesAjuste(termo, incZ, atual);
    sel.value = atual;
  });
  _ajContador();
}

function _ajContador() {
  const el = document.getElementById("ajContador"); if (!el) return;
  const termo = (document.getElementById("ajBusca") || {}).value || "";
  const incZ = !!(document.getElementById("ajZerados") || {}).checked;
  const todos = allLotes();
  const zerados = todos.filter((l) => saldoLoteChave(l.chave) === 0).length;
  const negativos = todos.filter((l) => saldoLoteChave(l.chave) < 0).length;
  const vis = _ajListaLotes(termo, incZ).length;
  el.innerHTML = `<b>${vis}</b> lote(s) na lista` +
    (incZ ? ` · os ${zerados} zerados estão incluídos` : ` · ${zerados} zerado(s) oculto(s)`) +
    (negativos ? ` · <b style="color:var(--warn)">${negativos} com saldo negativo</b>, sempre visível(is)` : "");
}

function _recalcAjuste() {
  const lote = fv("ajLote");
  const el = document.getElementById("ajDiff");
  if (!el) return;
  if (!lote) { el.innerHTML = ""; return; }
  const sis = saldoLoteChave(lote);
  const fisEl = document.getElementById("ajFisico");
  const fis = fisEl && fisEl.value !== "" ? Number(fisEl.value) : null;
  if (fis === null) { el.innerHTML = `Saldo no sistema: <b>${sis}</b>`; return; }
  const d = fis - sis;
  const cor = d === 0 ? "var(--success)" : d < 0 ? "var(--warn)" : "var(--accent)";
  el.innerHTML = `Saldo no sistema: <b>${sis}</b> · Contagem física: <b>${fis}</b> · Diferença: <b style="color:${cor}">${d > 0 ? "+" : ""}${d}</b>${d === 0 ? " — confere, nada a ajustar" : (d < 0 ? " (falta)" : " (sobra)")}`;
}

function abrirFormAjuste() {
  const corpo = `
    <div class="ff"><label>Data da conferência *</label><input id="ajData" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
    ${_ajControlesFiltro()}
    <div class="ff"><label>Lote conferido *</label><select id="ajLote" onchange="_recalcAjuste()">${_optLotesAjuste("", false)}</select></div>
    <div class="ff"><label>Contagem física (quantidade real contada) *</label><input id="ajFisico" type="number" min="0" oninput="_recalcAjuste()" placeholder="Ex.: 55"></div>
    <div class="note-box" id="ajDiff" style="margin:2px 0 12px"></div>
    <div class="ff"><label>Justificativa da divergência *</label><textarea id="ajJust" rows="3" placeholder="Ex.: 2 comprimidos não localizados na contagem mensal; perda por quebra; erro de lançamento anterior…"></textarea></div>
    <div class="note-box" style="margin:0">O ajuste entra no Livro de Registro como movimentação, com esta justificativa. Não altera saldo manualmente — reconcilia via lançamento.</div>
  `;
  setTimeout(_ajContador, 0);
  abrirModal("Novo ajuste / conferência de lote", corpo, async () => {
    const lote = fv("ajLote"); const data = fv("ajData"); const just = fv("ajJust");
    const fis = fvNum("ajFisico");
    if (!data) throw new Error("Informe a data.");
    if (!lote) throw new Error("Selecione o lote conferido.");
    if (fis === null || fis < 0) throw new Error("Informe a contagem física.");
    const l = allLotes().find((x) => x.chave === lote);
    if (!l) throw new Error("Lote inválido.");
    const sis = saldoLoteChave(lote);
    const delta = fis - sis;
    if (delta === 0) throw new Error("A contagem confere com o sistema — não há ajuste a registrar.");
    if (!just) throw new Error("A justificativa é obrigatória.");
    const { error } = await window.SB.from("ajustes_estoque").insert({
      data, substancia_id: l.subId, numero_lote: l.lote, paciente_id: l.restritoPaciente || null, saldo_sistema: sis,
      contagem_fisica: fis, quantidade: delta, justificativa: just, ...usuarioId(),
    });
    if (error) throw error;
  }, "Registrar ajuste");
}


/* ===================== AJUSTE MÚLTIPLO =====================
   Vários lotes conferidos na mesma contagem, com UMA justificativa.
   Cada linha vira um lançamento próprio no Livro (rastreável por lote),
   mas todas compartilham data e justificativa. */
function _ajLinha() {
  const cont = document.getElementById("ajLinhas");
  const row = document.createElement("div");
  row.className = "item-row";
  row.style.gridTemplateColumns = "2fr .8fr 1.4fr .3fr";
  row.innerHTML = `
    <div><select class="a-lote" onchange="_ajRecalcLinha(this)">${_optLotesAjuste(
        (document.getElementById("ajBusca") || {}).value || "",
        !!(document.getElementById("ajZerados") || {}).checked)}</select></div>
    <div><input type="number" class="a-fis" min="0" placeholder="Contagem" oninput="_ajRecalcLinha(this)"></div>
    <div class="a-info" style="font-size:12px;color:var(--muted);padding:8px 0">—</div>
    <button type="button" class="item-del" onclick="this.parentElement.remove(); _ajResumo()">✕</button>`;
  cont.appendChild(row);
}
function _ajRecalcLinha(el) {
  const row = el.closest(".item-row");
  const lote = row.querySelector(".a-lote").value;
  const info = row.querySelector(".a-info");
  if (!lote) { info.textContent = "—"; _ajResumo(); return; }
  const sis = saldoLoteChave(lote);
  const v = row.querySelector(".a-fis").value;
  if (v === "") { info.innerHTML = `sistema: <b>${sis}</b>`; _ajResumo(); return; }
  const d = Number(v) - sis;
  const cor = d === 0 ? "var(--success)" : d < 0 ? "var(--warn)" : "var(--accent)";
  info.innerHTML = `sistema <b>${sis}</b> → diferença <b style="color:${cor}">${d > 0 ? "+" : ""}${d}</b>${d === 0 ? " (confere)" : (d < 0 ? " (falta)" : " (sobra)")}`;
  _ajResumo();
}
function _ajResumo() {
  const el = document.getElementById("ajResumo"); if (!el) return;
  const linhas = _ajColeta(true);
  const comDif = linhas.filter((l) => l.delta !== 0);
  el.innerHTML = linhas.length
    ? `<b>${linhas.length}</b> lote(s) conferido(s) · <b>${comDif.length}</b> com divergência a registrar${comDif.length ? " · " + comDif.map((l) => `${l.nome} ${l.delta > 0 ? "+" : ""}${l.delta}`).join(" · ") : ""}`
    : "Adicione os lotes conferidos.";
}
function _ajColeta(parcial) {
  return Array.from(document.querySelectorAll("#ajLinhas .item-row")).map((r) => {
    const lote = r.querySelector(".a-lote").value;
    const v = r.querySelector(".a-fis").value;
    if (!lote || v === "") return null;
    const l = allLotes().find((x) => x.chave === lote);
    if (!l) return null;
    const sis = saldoLoteChave(lote), fis = Number(v);
    return { lote: l.lote, chave: lote, subId: l.subId, dono: l.restritoPaciente || null,
             nome: subById(l.subId).nome + (l.restritoPaciente ? " · custódia " + ((patById(l.restritoPaciente)||{}).nome||"") : ""),
             sis, fis, delta: fis - sis };
  }).filter(Boolean);
}
function abrirFormAjusteMultiplo() {
  const corpo = `
    <div class="ff"><label>Data da conferência *</label><input id="ajmData" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
    ${_ajControlesFiltro()}
    <div class="item-head">Lotes conferidos</div>
    <div class="item-row" style="grid-template-columns:2fr .8fr 1.4fr .3fr;font-size:11px;color:var(--muted);font-weight:600">
      <div>Lote</div><div>Contagem</div><div>Situação</div><div></div>
    </div>
    <div id="ajLinhas"></div>
    <button type="button" class="btn ghost sm" onclick="_ajLinha()" style="margin-top:6px">+ Adicionar lote</button>
    <div class="note-box" id="ajResumo" style="margin:12px 0">Adicione os lotes conferidos.</div>
    <div class="ff"><label>Justificativa (vale para todos os lotes) *</label><textarea id="ajmJust" rows="3" placeholder="Ex.: contagem mensal de inventário — divergências apuradas e conferidas em dupla checagem"></textarea></div>
    <div class="note-box" style="margin:0">Cada lote com divergência gera um lançamento próprio no Livro de Registro, todos com esta mesma justificativa e data. Lotes que conferem não geram lançamento.</div>
  `;
  abrirModal("Ajuste de vários lotes (mesma justificativa)", corpo, async () => {
    const data = fv("ajmData"), just = fv("ajmJust");
    if (!data) throw new Error("Informe a data da conferência.");
    _periodoOk(data);
    const linhas = _ajColeta();
    if (!linhas.length) throw new Error("Adicione ao menos um lote com a contagem física.");
    const comDif = linhas.filter((l) => l.delta !== 0);
    if (!comDif.length) throw new Error("Todas as contagens conferem com o sistema — não há ajuste a registrar.");
    if (!just) throw new Error("A justificativa é obrigatória.");
    const { error } = await window.SB.from("ajustes_estoque").insert(
      comDif.map((l) => ({
        data, substancia_id: l.subId, numero_lote: l.lote, paciente_id: l.dono || null, saldo_sistema: l.sis,
        contagem_fisica: l.fis, quantidade: l.delta, justificativa: just, ...usuarioId(),
      })));
    if (error) throw error;
  }, "Registrar ajustes");
  setTimeout(() => { _ajLinha(); _ajLinha(); _ajContador(); }, 0);
}

/* ===================== FOLHA DE CONTAGEM / INVENTÁRIO ===================== */
/* Quantos lotes cada categoria tem hoje, para o seletor mostrar o tamanho da
   folha antes de imprimir. Categoria vazia não adianta oferecer. */
function _fcLotesPorCategoria() {
  const m = {};
  allLotes().forEach((l) => {
    const c = (subById(l.subId) || {}).categoria || "NAO CLASSIFICADO";
    m[c] = (m[c] || 0) + 1;
  });
  return m;
}

function _fcMarcarCategorias(todas) {
  document.querySelectorAll("#fcCats input[type=checkbox]").forEach((c) => (c.checked = !!todas));
  _fcResumoCategorias();
}

function _fcResumoCategorias() {
  const el = document.getElementById("fcCatResumo"); if (!el) return;
  const marcadas = [...document.querySelectorAll("#fcCats input[type=checkbox]")].filter((c) => c.checked);
  const total = document.querySelectorAll("#fcCats input[type=checkbox]").length;
  el.innerHTML = marcadas.length === total
    ? "Todas as categorias entram na folha."
    : marcadas.length
      ? `<b>${marcadas.length}</b> de ${total} categoria(s) selecionada(s).`
      : '<b style="color:var(--warn)">Nenhuma categoria marcada</b> — a folha sairia vazia.';
}

function abrirFolhaContagem() {
  const optsSub = `<option value="">Todas as substâncias</option>` +
    substances.slice().sort((a, b) => a.nome.localeCompare(b.nome))
      .map((s) => `<option value="${s.id}">${s.nome}</option>`).join("");
  const porCat = _fcLotesPorCategoria();
  const cats = categoriasAlfabeticas().filter((c) => porCat[c]);
  const corpo = `
    <div class="ff row2">
      <div><label>O que contar</label>
        <select id="fcTipo">
          <option value="medicamento" selected>Somente medicamentos</option>
          <option value="material">Somente materiais</option>
          <option value="todos">Medicamentos e materiais</option>
        </select>
        <div class="dica">Medicamento e material ficam em lugares diferentes da farmácia, e contar os dois na mesma folha obriga a ir e voltar.</div></div>
      <div><label>Controle especial</label>
        <select id="fcControle">
          <option value="todos" selected>Controlados e não controlados</option>
          <option value="sim">Somente Portaria 344/98</option>
          <option value="nao">Somente não controlados</option>
        </select>
        <div class="dica">A folha só dos controlados é a que acompanha a conferência do Livro.</div></div>
    </div>
    <div class="ff"><label>Categorias <span style="font-weight:400;color:var(--muted)">— desmarque o que não vai contar agora</span></label>
      <div style="display:flex;gap:8px;margin-bottom:6px">
        <button type="button" class="btn ghost sm" onclick="_fcMarcarCategorias(true)">Marcar todas</button>
        <button type="button" class="btn ghost sm" onclick="_fcMarcarCategorias(false)">Desmarcar todas</button>
      </div>
      <div id="fcCats" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:4px 12px;max-height:190px;overflow:auto;border:1px solid var(--line);border-radius:8px;padding:8px 10px">
        ${cats.map((c) => `<label style="display:flex;align-items:center;gap:7px;font-weight:400;font-size:13px">
          <input type="checkbox" value="${_esc(c)}" checked onchange="_fcResumoCategorias()" style="width:auto;margin:0">
          ${_esc(catRotulo(c))} <span style="color:var(--muted)">(${porCat[c]})</span>
        </label>`).join("")}
      </div>
      <div class="dica" id="fcCatResumo">Todas as categorias entram na folha.</div></div>
    <div class="ff"><label>Substância <span style="font-weight:400;color:var(--muted)">— para conferir um item só</span></label><select id="fcSub">${optsSub}</select>
      <div class="dica">Escolhendo uma substância, os filtros acima são ignorados: a folha sai só com ela.</div></div>
    <div class="ff"><label>Faixa de vencimento</label>
      <select id="fcVenc" onchange="_fcToggleIntervalo()">
        <option value="todas">Todas</option>
        <option value="vencidas">Somente vencidas</option>
        <option value="30">A vencer em até 30 dias</option>
        <option value="60">A vencer em até 60 dias</option>
        <option value="90">A vencer em até 90 dias</option>
        <option value="intervalo">Intervalo de datas…</option>
      </select>
    </div>
    <div class="ff row2" id="fcIntervalo" style="display:none">
      <div><label>Vence de</label><input id="fcDe" type="date"></div>
      <div><label>até</label><input id="fcAte" type="date"></div>
    </div>
    <div class="ff"><label>Medicações zeradas</label>
      <select id="fcZerados">
        <option value="ocultar" selected>Não imprimir lotes com saldo 0</option>
        <option value="incluir">Incluir lotes zerados</option>
      </select>
    </div>
    <div class="note-box" style="margin:0">Gera uma folha A4 com Substância · Lote · Validade · Saldo no sistema e colunas em branco para a <b>contagem física</b> e a <b>diferença</b>. Depois, lance os ajustes onde divergir.</div>
  `;
  abrirModal("Folha de contagem / inventário", corpo, async () => {
    const marcadas = [...document.querySelectorAll("#fcCats input[type=checkbox]")]
      .filter((c) => c.checked).map((c) => c.value);
    if (!fv("fcSub") && !marcadas.length) throw new Error("Marque ao menos uma categoria, ou escolha uma substância.");
    imprimirFolhaContagem(fv("fcSub"), fv("fcVenc"), fv("fcZerados") === "ocultar", fv("fcDe"), fv("fcAte"),
      { tipo: fv("fcTipo"), controle: fv("fcControle"), categorias: marcadas, totalCategorias: cats.length });
  }, "Gerar folha");
}
function _fcToggleIntervalo() {
  const v = document.getElementById("fcVenc").value;
  document.getElementById("fcIntervalo").style.display = v === "intervalo" ? "grid" : "none";
}

function imprimirFolhaContagem(subId, faixaVenc, ocultarZerados, de, ate, filtros) {
  filtros = filtros || { tipo: "todos", controle: "todos", categorias: null };
  const est = window.ESTAB || {}, rt = window.RT || {};
  const rtTxt = rt.nome ? `${rt.nome} — ${rt.conselho}-${rt.uf} ${rt.numero_registro}` : "____________________";

  // um registro por lote, com saldo e status de validade
  let linhas = allLotes().map((l) => ({
    subId: l.subId, lote: l.lote, validade: l.validade, saldo: saldoLoteChave(l.chave),
    // custódia: lote de uso exclusivo de um paciente (trazido por ele ou
    // transferido do estoque). A contagem física é feita em separado —
    // fica em outro local e não pode ser somada ao estoque da clínica.
    pacId: l.restritoPaciente || null,
    pacNome: l.restritoPaciente ? ((patById(l.restritoPaciente) || {}).nome || "—") : null,
    categoria: (subById(l.subId) || {}).categoria || "NAO CLASSIFICADO",
  }));

  /* Escolher UMA substância é o recorte mais específico que existe: ignora
     tipo, controle e categoria de propósito. Quem pede a folha de um item só
     quer aquele item, e não o item filtrado por algo que esqueceu marcado. */
  if (subId) {
    linhas = linhas.filter((x) => x.subId === subId);
  } else {
    // medicamento e material ficam em lugares diferentes da farmácia
    if (filtros.tipo === "medicamento") linhas = linhas.filter((x) => !ehMaterial(subById(x.subId)));
    else if (filtros.tipo === "material") linhas = linhas.filter((x) => ehMaterial(subById(x.subId)));

    /* Controle especial pela LISTA da substância, que é o que a Portaria
       344/98 usa: lista preenchida e diferente de "—" é controlado. Mesmo
       critério de grupoControlado(), para a folha não divergir do Livro. */
    if (filtros.controle === "sim") linhas = linhas.filter((x) => grupoControlado(subById(x.subId) || {}));
    else if (filtros.controle === "nao") linhas = linhas.filter((x) => !grupoControlado(subById(x.subId) || {}));

    if (filtros.categorias && filtros.categorias.length) {
      linhas = linhas.filter((x) => filtros.categorias.indexOf(x.categoria) !== -1);
    }
  }

  // "ocultar zerados" esconde apenas o que está exatamente em zero.
  // Saldo NEGATIVO nunca é ocultado: é inconsistência que precisa de
  // contagem física e ajuste, justamente o que a folha existe para apurar.
  if (ocultarZerados) linhas = linhas.filter((x) => x.saldo !== 0);

  // faixa de vencimento
  linhas = linhas.filter((x) => {
    if (faixaVenc === "todas") return true;
    const st = validadeStatus(x.validade); // { key, dias }
    if (faixaVenc === "vencidas") return st.dias < 0;
    if (faixaVenc === "intervalo") {
      if (!x.validade) return false;
      if (de && x.validade < de) return false;
      if (ate && x.validade > ate) return false;
      return true;
    }
    const lim = parseInt(faixaVenc, 10); // 30/60/90
    return st.dias >= 0 && st.dias <= lim;
  });

  linhas.sort((a, b) =>
    (a.pacId ? 1 : 0) - (b.pacId ? 1 : 0) ||                                   // geral antes da custódia
    String(a.pacNome || "").localeCompare(String(b.pacNome || ""), "pt-BR") || // custódia agrupada por paciente
    /* Dentro do estoque da clínica, agrupa por categoria: é assim que o
       material está disposto na prateleira, e contar saltando de categoria em
       categoria é o que faz a conferência errar e ter de recomeçar. Ordem
       alfabética pelo rótulo, a mesma dos outros impressos.
       A custódia fica fora disso de propósito — ela é contada por paciente,
       em outro local, e misturar categoria ali só quebraria o agrupamento
       que importa lá, que é de quem é o medicamento. */
    (a.pacId ? 0 : catRotulo(a.categoria).localeCompare(catRotulo(b.categoria), "pt-BR")) ||
    subById(a.subId).nome.localeCompare(subById(b.subId).nome) ||
    (String(a.validade || "") < String(b.validade || "") ? -1 : 1));

  if (!linhas.length) { alert("Nenhum lote atende aos filtros escolhidos."); return; }
  const nNeg = linhas.filter((x) => x.saldo < 0).length;

  let secao = "__inicio__", cat = "__inicio__", n = 0;
  const corpo = linhas.map((x) => {
    const st = validadeStatus(x.validade);
    const cls = [st.dias < 0 ? "venc" : st.dias <= 90 ? "crit" : "", x.saldo < 0 ? "neg" : ""].filter(Boolean).join(" ");
    const marca = st.dias < 0 ? "VENCIDO" : st.dias <= 90 ? `${st.dias}d` : "";
    // cabeçalho ao mudar de seção (estoque da clínica → cada paciente)
    const chave = x.pacId ? "P:" + x.pacId : "GERAL";
    let cab = "";
    if (chave !== secao) {
      secao = chave; cat = "__inicio__"; n = 0;
      const qtd = linhas.filter((y) => (y.pacId ? "P:" + y.pacId : "GERAL") === chave).length;
      cab = x.pacId
        ? `<tr class="sec cust"><td colspan="7">CUSTÓDIA — ${_esc(x.pacNome)} <span class="sq">${qtd} lote(s) · contar em separado, não somar ao estoque da clínica</span></td></tr>`
        : `<tr class="sec"><td colspan="7">ESTOQUE DA CLÍNICA <span class="sq">${qtd} lote(s)</span></td></tr>`;
    }
    // faixa de categoria, só dentro do estoque da clínica
    if (!x.pacId && x.categoria !== cat) {
      cat = x.categoria; n = 0;
      const qtdCat = linhas.filter((y) => !y.pacId && y.categoria === cat).length;
      cab += `<tr class="sec cat"><td colspan="7">${_esc(catRotulo(cat))} <span class="sq">${qtdCat} lote(s)</span></td></tr>`;
    }
    n++;
    return cab + `<tr class="${cls}">
      <td class="num">${n}</td>
      <td>${subNomeExibicao(x.subId)}</td>
      <td class="mono">${x.lote}</td>
      <td class="c mono">${fmtDate(x.validade)}${marca ? ` <span class="mk">${marca}</span>` : ""}</td>
      <td class="c mono">${(() => {
        const sb = subById(x.subId);
        if (!temUnidadeCompra(sb)) return x.saldo;
        // líquidos: mostra a base e o equivalente em frascos, que é como se conta
        const inteiros = Math.floor(x.saldo / sb.fatorUnidade);
        const resto = x.saldo - inteiros * sb.fatorUnidade;
        return `${x.saldo}<div class="conv">${inteiros} ${_esc(sb.unidadeCompra)}${inteiros === 1 ? "" : "s"}${resto ? ` + ${resto}` : ""}</div>`;
      })()}${x.saldo < 0 ? ' <span class="mk">NEGATIVO</span>' : ""}</td>
      <td class="fis"></td>
      <td class="fis"></td>
    </tr>`;
  }).join("");

  /* O recorte vai IMPRESSO. Folha de contagem é documento que se arquiva e
     se confere depois; sem dizer o que ela cobre, uma folha parcial parece
     um inventário completo com itens faltando. */
  const filtroTxt = [];
  if (subId) {
    filtroTxt.push("Substância: " + subById(subId).nome + " (demais filtros ignorados)");
  } else {
    filtroTxt.push(filtros.tipo === "medicamento" ? "Somente medicamentos"
                 : filtros.tipo === "material" ? "Somente materiais"
                 : "Medicamentos e materiais");
    if (filtros.controle === "sim") filtroTxt.push("SOMENTE CONTROLADOS — Portaria SVS/MS 344/98");
    else if (filtros.controle === "nao") filtroTxt.push("somente não controlados");
    if (filtros.categorias && filtros.totalCategorias && filtros.categorias.length < filtros.totalCategorias) {
      filtroTxt.push(`Categorias (${filtros.categorias.length} de ${filtros.totalCategorias}): ` +
        filtros.categorias.map((c) => catRotulo(c)).sort((a, b) => a.localeCompare(b, "pt-BR")).join(", "));
    } else {
      filtroTxt.push("Todas as categorias");
    }
  }
  filtroTxt.push("Vencimento: " + (
    faixaVenc === "todas" ? "todas" :
    faixaVenc === "vencidas" ? "somente vencidas" :
    faixaVenc === "intervalo" ? `${de ? fmtDate(de) : "…"} a ${ate ? fmtDate(ate) : "…"}` :
    `a vencer em até ${faixaVenc} dias`));
  filtroTxt.push(ocultarZerados ? "sem lotes zerados" : "incluindo zerados");

  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Folha de Contagem — Inventário</title>
  <style>@page{size:A4 portrait;margin:14mm 12mm}*{box-sizing:border-box}body{font-family:"Public Sans",Arial,sans-serif;color:#1E2A28;font-size:11px;margin:0}
  .estab{border-bottom:2px solid #2C5F5A;padding-bottom:6px;margin-bottom:8px}.estab .n{font-size:14px;font-weight:700}.estab .s{font-size:10px;color:#4a544f}
  h1{font-size:14px;margin:8px 0 2px}.sub{font-size:10.5px;color:#6a736e;margin-bottom:4px}
  .filtros{font-size:10px;color:#4a544f;margin-bottom:8px}
  table{width:100%;border-collapse:collapse}th,td{border:1px solid #cfd6cf;padding:4px 6px;font-size:10.5px}
  th{background:#EEF2EC;text-transform:uppercase;font-size:9px}td.c,th.c{text-align:center}td.num,th.num{text-align:center;width:26px}
  .mono{font-family:"IBM Plex Mono",monospace}td.fis{background:#FCFBF6;min-width:70px}th.fis{background:#EEF2EC}
  tr.crit td{background:#FBF3E3}tr.venc td{background:#F7E3E1}.mk{font-size:8px;background:#2C5F5A;color:#fff;padding:1px 3px;border-radius:3px;vertical-align:middle}
  tr.venc .mk{background:#B04A3F}tr.crit .mk{background:#B07A2F}
  tr.sec td{background:#1E2A28;color:#fff;font-weight:700;font-size:10px;letter-spacing:.05em;padding:4px 8px}
  tr.sec.cust td{background:#B07A2F}
  tr.sec.cat td{background:#DCE6DA;color:#1E2A28;font-size:9.5px;letter-spacing:.04em}
  tr.sec .sq{font-weight:400;opacity:.9;font-size:9px;margin-left:8px;letter-spacing:0}
  tr.neg td{background:#F7E3E1}tr.neg .mk{background:#B04A3F}
  .conv{font-size:8px;color:#6a736e;font-family:"Public Sans",Arial,sans-serif}
  .alerta{background:#F7E3E1;border-left:3px solid #B04A3F;padding:5px 9px;font-size:10px;margin:6px 0}
  .foot{margin-top:18px;font-size:10.5px;display:flex;justify-content:space-between;gap:30px}
  .foot .l{border-top:1px solid #1E2A28;padding-top:5px;text-align:center;flex:1}
  .btn{position:fixed;top:12px;right:12px;background:#2C5F5A;color:#fff;border:none;padding:9px 15px;border-radius:8px;cursor:pointer;font:inherit}@media print{.btn{display:none}}</style></head><body>
  <button class="btn" onclick="window.print()">Imprimir / Salvar PDF</button>
  <div class="estab"><div class="n">${est.razao_social || est.nome_fantasia || "Hospital Reviva"}</div><div class="s">${est.cnpj ? "CNPJ: " + est.cnpj + " · " : ""}${est.endereco || ""}${est.municipio_uf ? " — " + est.municipio_uf : ""}</div></div>
  <h1>Folha de Contagem de Estoque — ${!subId && filtros.controle === "sim" ? "Medicamentos sob Controle Especial" : "Inventário"}</h1>
  <div class="sub">Data da contagem: ____ / ____ / ______ &nbsp;·&nbsp; Conferente: ________________________ &nbsp;·&nbsp; ${linhas.length} lote(s)${(() => { const c = new Set(linhas.filter((x) => !x.pacId).map((x) => x.categoria)); return c.size ? ` · ${c.size} categoria(s) no estoque da clínica` : ""; })()}</div>
  <div class="filtros">Filtros — ${filtroTxt.join(" · ")}</div>
  ${nNeg ? `<div class="alerta"><b>${nNeg} lote(s) com saldo negativo.</b> Saldo negativo indica saída lançada além do que entrou — conte fisicamente e registre o ajuste com justificativa.</div>` : ""}
  <table><thead><tr><th class="num">#</th><th>Substância</th><th>Lote</th><th class="c">Validade</th><th class="c">Saldo sistema</th><th class="c fis">Contagem física</th><th class="c fis">Diferença</th></tr></thead>
  <tbody>${corpo}</tbody></table>
  <div class="foot"><div class="l">Conferente (assinatura)</div><div class="l">${rtTxt}<br>Farmacêutico(a) Responsável Técnico</div></div>
  </body></html>`;
  const win = window.open("", "_blank"); if (!win) { alert("Permita pop-ups para imprimir a folha."); return; }
  win.document.open(); win.document.write(html); win.document.close();
}

function renderPage() {
  const hist = ajustes.slice().sort((a, b) => (a.data < b.data ? 1 : -1));
  return `
    <div class="note-box"><b>Conferência de estoque.</b> Conte fisicamente um lote e informe a quantidade real. Se divergir do sistema, o ajuste é registrado como movimentação — com justificativa — e o saldo se reconcilia automaticamente. A escrituração continua sem digitação manual de saldo.</div>

    <div class="panel">
      <div class="panel-head">
        <div><div class="panel-title">Ajustes de inventário</div><div class="panel-title-sub">${hist.length} ajuste(s) registrado(s)</div></div>
        <div class="toolbar">
          <button class="btn ghost sm" onclick="abrirFolhaContagem()">🖶 Folha de contagem</button>
          <button class="btn ghost sm" onclick="abrirFormAjuste()">+ Ajuste de um lote</button>
          <button class="btn sm" onclick="abrirFormAjusteMultiplo()">+ Ajuste de vários lotes</button>
        </div>
      </div>
      <div class="panel-body">
        ${hist.length ? `<table>
          <thead><tr><th>Data</th><th>Substância</th><th>Lote</th><th>Sistema</th><th>Contagem</th><th>Ajuste</th><th>Justificativa</th></tr></thead>
          <tbody>
            ${hist.map((a) => {
              const cor = a.delta < 0 ? "var(--warn)" : "var(--accent)";
              return `<tr>
                <td class="mono">${fmtDate(a.data)}</td>
                <td><b>${subById(a.subId).nome}</b></td>
                <td><span class="folio">${a.lote}</span></td>
                <td class="num mono">${a.saldoSistema}</td>
                <td class="num mono">${a.contagemFisica}</td>
                <td class="num mono"><b style="color:${cor}">${a.delta > 0 ? "+" : ""}${a.delta}</b></td>
                <td style="color:var(--muted)">${a.justificativa}</td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>` : `<div style="color:var(--muted);font-size:13px;padding:8px 0">Nenhum ajuste registrado. Use <b>+ Novo ajuste / conferência</b> quando a contagem física divergir do sistema.</div>`}
      </div>
    </div>
  `;
}


/* Trava de período — tolerante a versão desatualizada do assets/dados.js.
   Se a função central não estiver carregada, o lançamento segue e a trava
   do banco continua valendo; assim uma atualização parcial não quebra a tela. */
function _periodoOk(data) {
  if (typeof validarPeriodoAberto === "function") return validarPeriodoAberto(data);
  return true;
}
