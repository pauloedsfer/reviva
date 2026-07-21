/* ============================================================
   paginas/cotacao.js — Hospital Reviva
   Cotação de compras.
   Fase A: montar itens e imprimir a solicitação para os fornecedores.
   Fase B: lançar os preços que voltaram, comparar por preço unitário
           e gerar o pedido por fornecedor (melhor preço por item).
   ============================================================ */

let _cotAberta = null;
let _cotView = "itens";       // itens | precos | comp
let _fornSel = "";            // fornecedor selecionado no lançamento de preços

/* ============================ FASE A ============================ */
function _proxIdentificador() {
  const ano = new Date().getFullYear();
  const n = cotacoes.filter((c) => (c.identificador || "").includes("-" + ano + "-")).length + 1;
  return `COT-${ano}-${String(n).padStart(3, "0")}`;
}

function abrirNovaCotacao() {
  const corpo = `
    <div class="ff row2">
      <div><label>Identificador</label><input id="ctId" value="${_proxIdentificador()}"></div>
      <div><label>Data</label><input id="ctData" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
    </div>
    <div class="ff"><label>Observação</label><input id="ctObs" placeholder="Ex.: primeira compra / padronização inicial"></div>`;
  abrirModal("Nova cotação", corpo, async () => {
    const { data, error } = await window.SB.from("cotacoes")
      .insert({ identificador: fvOrNull("ctId"), data: fv("ctData") || new Date().toISOString().slice(0,10), observacao: fvOrNull("ctObs"), ...usuarioId() })
      .select("id").single();
    if (error) throw error;
    _cotAberta = data.id; _cotView = "itens";
  }, "Criar cotação");
}

function abrirFormItemCotacao() {
  const temSub = substances.length > 0;
  const corpo = `
    <div class="ff"><label>Tipo de item</label>
      <select id="itTipo" onchange="_toggleItemCot()">
        ${temSub ? '<option value="sub">Substância cadastrada</option>' : ''}
        <option value="livre"${temSub ? '' : ' selected'}>Item livre (digitar)</option>
      </select></div>
    <div id="itBlocoSub" style="display:${temSub ? 'block' : 'none'}">
      <div class="ff"><label>Substância</label><select id="itSub">${_optSubs()}</select></div></div>
    <div id="itBlocoLivre" style="display:${temSub ? 'none' : 'block'}">
      <div class="ff row2">
        <div><label>Descrição *</label><input id="itDesc" placeholder="Ex.: Sertralina 50 mg comp."></div>
        <div><label>Unidade</label><input id="itUnid" placeholder="comp., amp., frasco…"></div></div></div>
    <div class="ff"><label>Quantidade a cotar *</label><input id="itQtd" type="number" min="0" step="1" placeholder="Ex.: 30"></div>`;
  abrirModal("Adicionar item à cotação", corpo, async () => {
    const tipo = fv("itTipo"); const qtd = fvNum("itQtd");
    if (qtd == null || qtd < 0) throw new Error("Informe a quantidade a cotar.");
    let descricao, unidade, substancia_id = null;
    if (tipo === "sub") {
      const s = substances.find((x) => x.id === fv("itSub"));
      if (!s) throw new Error("Selecione a substância.");
      substancia_id = s.id; descricao = s.nome; unidade = s.unidade;
    } else {
      descricao = fv("itDesc"); unidade = fvOrNull("itUnid");
      if (!descricao) throw new Error("Informe a descrição do item.");
    }
    const ordem = (cotacoes.find((c) => c.id === _cotAberta)?.itens.length) || 0;
    const { error } = await window.SB.from("cotacao_itens").insert({ cotacao_id: _cotAberta, substancia_id, descricao, unidade, quantidade: qtd, ordem });
    if (error) throw error;
  }, "Adicionar item");
}
function _toggleItemCot() {
  document.getElementById("itBlocoSub").style.display = fv("itTipo") === "sub" ? "block" : "none";
  document.getElementById("itBlocoLivre").style.display = fv("itTipo") === "livre" ? "block" : "none";
}
async function adicionarTodasSubstancias() {
  const cot = cotacoes.find((c) => c.id === _cotAberta);
  const jaTem = new Set(cot.itens.map((i) => i.substanciaId).filter(Boolean));
  const novas = substances.filter((s) => !jaTem.has(s.id));
  if (!novas.length) { alert("Todas as substâncias já estão na cotação."); return; }
  if (!confirm(`Adicionar ${novas.length} substância(s) (quantidade 0, ajuste depois)?`)) return;
  const base = cot.itens.length;
  const { error } = await window.SB.from("cotacao_itens").insert(novas.map((s, i) => ({ cotacao_id: _cotAberta, substancia_id: s.id, descricao: s.nome, unidade: s.unidade, quantidade: 0, ordem: base + i })));
  if (error) { alert("Erro: " + error.message); return; }
  await recarregarTela();
}
async function removerItemCotacao(id) {
  if (!confirm("Remover este item da cotação?")) return;
  const { error } = await window.SB.from("cotacao_itens").delete().eq("id", id);
  if (error) { alert("Erro: " + error.message); return; }
  await recarregarTela();
}
function abrirCotacao(id) { _cotAberta = id; _cotView = "itens"; document.getElementById("viewport").innerHTML = renderPage(); }
function voltarLista() { _cotAberta = null; document.getElementById("viewport").innerHTML = renderPage(); }
function mudarView(v) { _cotView = v; document.getElementById("viewport").innerHTML = renderPage(); }

function imprimirCotacao(id) {
  const cot = cotacoes.find((c) => c.id === id); if (!cot) return;
  const est = window.ESTAB || {}, rt = window.RT || {};
  const rtTxt = rt.nome ? `${rt.nome} — ${rt.conselho}-${rt.uf} ${rt.numero_registro}` : "";
  const linhas = cot.itens.map((it, i) => `<tr><td class="num">${i+1}</td><td>${(it.descricao||"").replace(/</g,"&lt;")}</td><td class="c">${it.unidade||""}</td><td class="c mono">${it.quantidade||""}</td><td></td><td></td><td></td></tr>`).join("");
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Cotação ${cot.identificador||""}</title>
  <style>@page{size:A4 portrait;margin:14mm 12mm}*{box-sizing:border-box}body{font-family:"Public Sans",Arial,sans-serif;color:#1E2A28;font-size:11px;margin:0}
  .estab{border-bottom:2px solid #2C5F5A;padding-bottom:6px;margin-bottom:8px}.estab .n{font-size:14px;font-weight:700}.estab .s{font-size:10px;color:#4a544f}
  h1{font-size:14px;margin:8px 0 2px}.sub{font-size:10.5px;color:#6a736e;margin-bottom:8px}
  .instr{background:#EEF2EC;border:1px solid #cfd6cf;border-radius:6px;padding:7px 9px;font-size:10.5px;margin-bottom:8px}
  table{width:100%;border-collapse:collapse}th,td{border:1px solid #cfd6cf;padding:4px 6px;font-size:10.5px}
  th{background:#EEF2EC;text-transform:uppercase;font-size:9px}td.c,th.c{text-align:center}td.num,th.num{text-align:center;width:26px}.mono{font-family:"IBM Plex Mono",monospace}.fill{background:#FCFBF6}.foot{margin-top:16px;font-size:10.5px}
  .btn{position:fixed;top:12px;right:12px;background:#2C5F5A;color:#fff;border:none;padding:9px 15px;border-radius:8px;cursor:pointer;font:inherit}@media print{.btn{display:none}}</style></head><body>
  <button class="btn" onclick="window.print()">Imprimir / Salvar PDF</button>
  <div class="estab"><div class="n">${est.razao_social||est.nome_fantasia||"Hospital Reviva"}</div><div class="s">${est.cnpj?"CNPJ: "+est.cnpj+" · ":""}${est.endereco||""}${est.municipio_uf?" — "+est.municipio_uf:""}</div></div>
  <h1>Solicitação de Cotação${cot.identificador?" — "+cot.identificador:""}</h1><div class="sub">Data: ${fmtDate(cot.data)}${cot.observacao?" · "+cot.observacao:""}</div>
  <div class="instr"><b>Prezado fornecedor:</b> favor preencher, por item, a <b>embalagem (unid. por caixa)</b>, o <b>preço por caixa</b> e a <b>validade</b>. Indicar "—" nos indisponíveis.</div>
  <table><thead><tr><th class="num">#</th><th>Descrição</th><th class="c">Unid.</th><th class="c">Qtde.</th><th class="c fill">Unid./caixa</th><th class="c fill">Preço/caixa</th><th class="c fill">Validade</th></tr></thead><tbody>${linhas||'<tr><td colspan="7" class="c">Sem itens.</td></tr>'}</tbody></table>
  <div class="foot">Fornecedor: ____________________  ·  Vendedor: ________________  ·  Data: ___/___/____<br><br>Responsável Técnico (solicitante): ${rtTxt||"____________________"}</div>
  </body></html>`;
  const win = window.open("", "_blank"); if (!win) { alert("Permita pop-ups."); return; }
  win.document.open(); win.document.write(html); win.document.close();
}

/* ============================ FASE B ============================ */
function _precoUnit(p) { return (p && p.disponivel && p.precoCaixa != null && p.unidPorCaixa) ? p.precoCaixa / p.unidPorCaixa : null; }
function _fornNome(id) { const f = fornecedores.find((x) => x.id === id); return f ? f.nome : "—"; }
function _melhor(item) {
  let best = null;
  (item.precos || []).forEach((p) => { const u = _precoUnit(p); if (u != null && (best == null || u < best.unit)) best = { fornecedorId: p.fornecedorId, unit: u, p }; });
  return best;
}
function _fornDaCotacao(cot) {
  const ids = new Set();
  cot.itens.forEach((it) => (it.precos || []).forEach((p) => ids.add(p.fornecedorId)));
  return fornecedores.filter((f) => ids.has(f.id));
}

function abrirNovoFornecedor() {
  abrirModal("Novo fornecedor", `
    <div class="ff"><label>Nome *</label><input id="nfoNome" placeholder="Razão social"></div>
    <div class="ff row2">
      <div><label>CNPJ</label><input id="nfoCnpj"></div>
      <div><label>Tipo</label><select id="nfoTipo"><option value="">—</option><option value="drogaria">drogaria</option><option value="distribuidora">distribuidora</option></select></div>
    </div>`, async () => {
    const nome = fv("nfoNome"); if (!nome) throw new Error("Informe o nome.");
    const { error } = await window.SB.from("fornecedores").insert({ nome, cnpj: fvOrNull("nfoCnpj"), tipo: fvOrNull("nfoTipo") });
    if (error) throw error;
  }, "Cadastrar fornecedor");
}

async function salvarPrecosFornecedor() {
  const cot = cotacoes.find((c) => c.id === _cotAberta);
  const forn = _fornSel;
  if (!forn) { alert("Selecione um fornecedor."); return; }
  const rows = [];
  cot.itens.forEach((it) => {
    const upc = document.getElementById("p-upc-" + it.id);
    const pre = document.getElementById("p-pre-" + it.id);
    const val = document.getElementById("p-val-" + it.id);
    const ind = document.getElementById("p-ind-" + it.id);
    if (ind && ind.checked) { rows.push({ cotacao_item_id: it.id, fornecedor_id: forn, disponivel: false }); return; }
    const preco = pre && pre.value !== "" ? Number(pre.value) : null;
    if (preco == null) return; // sem preço e não indisponível -> não cotou este item
    rows.push({ cotacao_item_id: it.id, fornecedor_id: forn, disponivel: true,
      unid_por_caixa: upc && upc.value !== "" ? Number(upc.value) : null,
      preco_caixa: preco, validade: val && val.value ? val.value : null });
  });
  const btn = document.getElementById("btnSalvarPrecos"); if (btn) { btn.disabled = true; btn.textContent = "Salvando…"; }
  try {
    const itemIds = cot.itens.map((i) => i.id);
    // regrava a resposta deste fornecedor nesta cotação (delete + insert)
    const { error: ed } = await window.SB.from("cotacao_precos").delete().eq("fornecedor_id", forn).in("cotacao_item_id", itemIds);
    if (ed) throw ed;
    if (rows.length) { const { error: ei } = await window.SB.from("cotacao_precos").insert(rows); if (ei) throw ei; }
    await recarregarTela();
  } catch (e) { alert("Erro ao salvar: " + (e.message || e)); if (btn) { btn.disabled = false; btn.textContent = "Salvar preços deste fornecedor"; } }
}
function selecionarForn(id) { _fornSel = id; document.getElementById("viewport").innerHTML = renderPage(); }

function _pedidos(cot) {
  const map = {};
  cot.itens.forEach((it) => {
    const b = _melhor(it); if (!b) return;
    const qtd = Number(it.quantidade) || 0;
    const caixas = b.p.unidPorCaixa ? Math.ceil(qtd / b.p.unidPorCaixa) : 0;
    const subtotal = caixas * (b.p.precoCaixa || 0);
    (map[b.fornecedorId] = map[b.fornecedorId] || []).push({ it, p: b.p, unit: b.unit, caixas, subtotal });
  });
  return map;
}
function imprimirPedidos(id) {
  const cot = cotacoes.find((c) => c.id === id); if (!cot) return;
  const est = window.ESTAB || {}, rt = window.RT || {};
  const rtTxt = rt.nome ? `${rt.nome} — ${rt.conselho}-${rt.uf} ${rt.numero_registro}` : "";
  const brl = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const map = _pedidos(cot);
  const fids = Object.keys(map);
  if (!fids.length) { alert("Ainda não há preços lançados para gerar pedidos."); return; }
  const paginas = fids.map((fid) => {
    const linhas = map[fid].map((r, i) => `<tr><td class="num">${i+1}</td><td>${(r.it.descricao||"").replace(/</g,"&lt;")}</td><td class="c">${r.it.unidade||""}</td><td class="c mono">${r.it.quantidade||0}</td><td class="c mono">${r.p.unidPorCaixa||"—"}</td><td class="c mono">${r.caixas}</td><td class="r mono">${brl(r.p.precoCaixa||0)}</td><td class="r mono">${brl(r.subtotal)}</td></tr>`).join("");
    const total = map[fid].reduce((a, r) => a + r.subtotal, 0);
    return `<section class="ped"><div class="estab"><div class="n">${est.razao_social||est.nome_fantasia||"Hospital Reviva"}</div><div class="s">${est.cnpj?"CNPJ: "+est.cnpj+" · ":""}${est.municipio_uf||""}</div></div>
      <h1>Pedido de Compra${cot.identificador?" — "+cot.identificador:""}</h1>
      <div class="sub">Fornecedor: <b>${_fornNome(fid)}</b> · Data: ${new Date().toLocaleDateString("pt-BR")}</div>
      <table><thead><tr><th class="num">#</th><th>Descrição</th><th class="c">Unid.</th><th class="c">Qtde.</th><th class="c">Un/cx</th><th class="c">Caixas</th><th class="r">Preço/cx</th><th class="r">Subtotal</th></tr></thead><tbody>${linhas}</tbody>
      <tfoot><tr><td colspan="7" class="r"><b>Total do pedido</b></td><td class="r mono"><b>${brl(total)}</b></td></tr></tfoot></table>
      <div class="foot">Responsável Técnico: ${rtTxt||"____________________"}  ·  Assinatura: __________________________</div></section>`;
  }).join("");
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Pedidos — ${cot.identificador||""}</title>
  <style>@page{size:A4 portrait;margin:14mm 12mm}*{box-sizing:border-box}body{font-family:"Public Sans",Arial,sans-serif;color:#1E2A28;font-size:11px;margin:0}
  .ped{page-break-after:always}.ped:last-child{page-break-after:auto}
  .estab{border-bottom:2px solid #2C5F5A;padding-bottom:6px;margin-bottom:8px}.estab .n{font-size:14px;font-weight:700}.estab .s{font-size:10px;color:#4a544f}
  h1{font-size:14px;margin:8px 0 2px}.sub{font-size:10.5px;color:#6a736e;margin-bottom:8px}
  table{width:100%;border-collapse:collapse}th,td{border:1px solid #cfd6cf;padding:4px 6px;font-size:10.5px}th{background:#EEF2EC;text-transform:uppercase;font-size:9px}
  td.c,th.c{text-align:center}td.r,th.r{text-align:right}td.num,th.num{text-align:center;width:24px}.mono{font-family:"IBM Plex Mono",monospace}.foot{margin-top:14px;font-size:10.5px}
  .btn{position:fixed;top:12px;right:12px;background:#2C5F5A;color:#fff;border:none;padding:9px 15px;border-radius:8px;cursor:pointer;font:inherit}@media print{.btn{display:none}}</style></head><body>
  <button class="btn" onclick="window.print()">Imprimir / Salvar PDF</button>${paginas}</body></html>`;
  const win = window.open("", "_blank"); if (!win) { alert("Permita pop-ups."); return; }
  win.document.open(); win.document.write(html); win.document.close();
}

/* ============================ VIEWS ============================ */
function _subnav() {
  const b = (v, t) => `<button class="btn ${_cotView===v?'':'ghost'} sm" onclick="mudarView('${v}')">${t}</button>`;
  return `<div class="toolbar" style="margin-bottom:14px">
    <button class="btn ghost sm" onclick="voltarLista()">← Voltar</button>
    ${b('itens','Itens')} ${b('precos','Lançar preços')} ${b('comp','Comparativo & Pedidos')}
  </div>`;
}

function _viewItens(cot) {
  return `
    <div class="panel">
      <div class="panel-head">
        <div><div class="panel-title">${cot.identificador||"Cotação"} · itens</div><div class="panel-title-sub">${fmtDate(cot.data)}${cot.observacao?" · "+cot.observacao:""} · ${cot.itens.length} item(ns)</div></div>
        <div class="toolbar">
          ${substances.length ? '<button class="btn ghost sm" onclick="adicionarTodasSubstancias()">+ Todas as substâncias</button>' : ''}
          <button class="btn ghost sm" onclick="abrirFormItemCotacao()">+ Item</button>
          <button class="btn sm" onclick="imprimirCotacao('${cot.id}')">🖶 Imprimir solicitação</button>
        </div>
      </div>
      <div class="panel-body">
        ${cot.itens.length ? `<table><thead><tr><th>#</th><th>Descrição</th><th>Unid.</th><th>Qtde.</th><th>Origem</th><th></th></tr></thead><tbody>
          ${cot.itens.map((it,i)=>`<tr><td class="num mono">${i+1}</td><td><b>${it.descricao}</b></td><td class="mono">${it.unidade||"—"}</td><td class="num mono">${it.quantidade||"—"}</td>
          <td>${it.substanciaId?'<span class="tag">cadastrada</span>':'<span class="tag" style="background:var(--accent-tint);color:var(--accent)">livre</span>'}</td>
          <td style="text-align:right"><button class="btn ghost sm" onclick="removerItemCotacao('${it.id}')">Remover</button></td></tr>`).join('')}
        </tbody></table>` : `<div style="color:var(--muted);font-size:13px;padding:8px 0">Cotação sem itens. Use <b>+ Item</b>.</div>`}
      </div>
    </div>`;
}

function _viewPrecos(cot) {
  const optForn = `<option value="">— selecione o fornecedor —</option>` + fornecedores.map((f)=>`<option value="${f.id}"${f.id===_fornSel?' selected':''}>${f.nome}</option>`).join('');
  const sel = _fornSel;
  const precosDoForn = {};
  if (sel) cot.itens.forEach((it)=>{ const p=(it.precos||[]).find((x)=>x.fornecedorId===sel); if(p) precosDoForn[it.id]=p; });
  return `
    <div class="panel">
      <div class="panel-head">
        <div><div class="panel-title">Lançar preços</div><div class="panel-title-sub">Escolha o fornecedor e registre a resposta da cotação dele</div></div>
        <div class="toolbar">
          <select onchange="selecionarForn(this.value)" style="padding:8px 10px;border:1px solid var(--line);border-radius:8px;font:inherit">${optForn}</select>
          <button class="btn ghost sm" onclick="abrirNovoFornecedor()">+ Novo fornecedor</button>
        </div>
      </div>
      <div class="panel-body">
        ${!fornecedores.length ? `<div class="note-box">Nenhum fornecedor cadastrado. Clique em <b>+ Novo fornecedor</b> para começar.</div>` :
          !sel ? `<div style="color:var(--muted);font-size:13px;padding:8px 0">Selecione um fornecedor acima para lançar os preços dele.</div>` : `
          <table>
            <thead><tr><th>Descrição</th><th>Qtde.</th><th>Unid./caixa</th><th>Preço/caixa (R$)</th><th>Validade</th><th>Indisp.</th></tr></thead>
            <tbody>
              ${cot.itens.map((it)=>{ const p=precosDoForn[it.id]; return `<tr>
                <td><b>${it.descricao}</b> <span style="color:var(--muted)">${it.unidade||''}</span></td>
                <td class="num mono">${it.quantidade||0}</td>
                <td><input id="p-upc-${it.id}" type="number" min="1" step="1" style="width:80px" value="${p&&p.unidPorCaixa!=null?p.unidPorCaixa:''}"></td>
                <td><input id="p-pre-${it.id}" type="number" min="0" step="0.01" style="width:100px" value="${p&&p.precoCaixa!=null?p.precoCaixa:''}"></td>
                <td><input id="p-val-${it.id}" type="date" value="${p&&p.validade?p.validade:''}"></td>
                <td style="text-align:center"><input id="p-ind-${it.id}" type="checkbox" ${p&&p.disponivel===false?'checked':''}></td>
              </tr>`;}).join('')}
            </tbody>
          </table>
          <div style="margin-top:14px;text-align:right"><button class="btn" id="btnSalvarPrecos" onclick="salvarPrecosFornecedor()">Salvar preços deste fornecedor</button></div>
          <div class="note-box" style="margin-top:12px">Deixe em branco os itens que este fornecedor não cotou. Marque <b>Indisp.</b> quando ele informar que não tem o produto. O preço unitário para comparação = preço/caixa ÷ unid./caixa.</div>`}
      </div>
    </div>`;
}

function _viewComp(cot) {
  const forns = _fornDaCotacao(cot);
  const brl = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  if (!forns.length) return `<div class="note-box">Nenhum preço lançado ainda. Vá em <b>Lançar preços</b> e registre a resposta de pelo menos um fornecedor.</div>`;
  const head = `<th>Descrição</th>` + forns.map((f)=>`<th style="text-align:center">${f.nome}</th>`).join('');
  const body = cot.itens.map((it)=>{
    const best=_melhor(it);
    const cells = forns.map((f)=>{
      const p=(it.precos||[]).find((x)=>x.fornecedorId===f.id);
      const u=_precoUnit(p);
      if (p && p.disponivel===false) return `<td style="text-align:center;color:var(--muted)">indisp.</td>`;
      if (u==null) return `<td style="text-align:center;color:var(--muted)">—</td>`;
      const win = best && best.fornecedorId===f.id;
      return `<td class="mono" style="text-align:center;${win?'background:#E7F0E3;font-weight:700':''}">${brl(u)}</td>`;
    }).join('');
    return `<tr><td><b>${it.descricao}</b></td>${cells}</tr>`;
  }).join('');
  const map=_pedidos(cot);
  const resumo = Object.keys(map).map((fid)=>{
    const total=map[fid].reduce((a,r)=>a+r.subtotal,0);
    return `<tr><td><b>${_fornNome(fid)}</b></td><td class="num mono">${map[fid].length}</td><td class="num mono">${brl(total)}</td></tr>`;
  }).join('');
  const totalGeral = Object.values(map).flat().reduce((a,r)=>a+r.subtotal,0);
  return `
    <div class="panel">
      <div class="panel-head"><div><div class="panel-title">Comparativo por preço unitário</div><div class="panel-title-sub">O menor preço de cada item aparece destacado — é o escolhido no pedido</div></div></div>
      <div class="panel-body" style="overflow-x:auto"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>
    </div>
    <div class="panel">
      <div class="panel-head">
        <div><div class="panel-title">Pedidos por fornecedor</div><div class="panel-title-sub">Cada fornecedor recebe os itens em que teve o melhor preço unitário</div></div>
        <button class="btn sm" onclick="imprimirPedidos('${cot.id}')">🖶 Imprimir pedidos</button>
      </div>
      <div class="panel-body">
        ${resumo ? `<table><thead><tr><th>Fornecedor</th><th>Itens</th><th>Total</th></tr></thead><tbody>${resumo}</tbody>
          <tfoot><tr><td style="text-align:right"><b>Total geral</b></td><td></td><td class="num mono"><b>${brl(totalGeral)}</b></td></tr></tfoot></table>`
          : `<div style="color:var(--muted);font-size:13px;padding:8px 0">Sem itens com preço válido ainda.</div>`}
      </div>
    </div>`;
}

function _viewDetalhe(cot) {
  const inner = _cotView === "precos" ? _viewPrecos(cot) : _cotView === "comp" ? _viewComp(cot) : _viewItens(cot);
  return _subnav() + inner;
}

function _viewLista() {
  return `
    <div class="note-box">Monte a cotação com os itens e quantidades a comprar, imprima a solicitação para os fornecedores e, quando os preços voltarem, use <b>Lançar preços</b> — o sistema compara por preço unitário e gera o <b>pedido por fornecedor</b>. (Previsão por consumo entra quando houver histórico.)</div>
    <div class="panel">
      <div class="panel-head">
        <div><div class="panel-title">Cotações</div><div class="panel-title-sub">${cotacoes.length} cotação(ões)</div></div>
        <button class="btn sm" onclick="abrirNovaCotacao()">+ Nova cotação</button>
      </div>
      <div class="panel-body">
        ${cotacoes.length ? `<table><thead><tr><th>Identificador</th><th>Data</th><th>Itens</th><th>Status</th><th></th></tr></thead><tbody>
          ${cotacoes.map(c=>`<tr><td><b>${c.identificador||"—"}</b></td><td class="mono">${fmtDate(c.data)}</td><td class="num mono">${c.itens.length}</td><td><span class="tag">${c.status}</span></td>
          <td style="text-align:right"><button class="btn ghost sm" onclick="abrirCotacao('${c.id}')">Abrir</button> <button class="btn ghost sm" onclick="imprimirCotacao('${c.id}')">Imprimir</button></td></tr>`).join('')}
        </tbody></table>` : `<div style="color:var(--muted);font-size:13px;padding:8px 0">Nenhuma cotação. Crie a primeira com <b>+ Nova cotação</b>.</div>`}
      </div>
    </div>`;
}

function renderPage() {
  const cot = _cotAberta ? cotacoes.find((c) => c.id === _cotAberta) : null;
  return cot ? _viewDetalhe(cot) : _viewLista();
}
