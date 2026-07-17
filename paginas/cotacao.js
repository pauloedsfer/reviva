/* ============================================================
   paginas/cotacao.js — Hospital Reviva
   Cotação de compras (Fase A). Monta a lista a cotar (itens de
   substâncias cadastradas ou livres) e gera a planilha imprimível
   no formato para enviar aos fornecedores. A entrada dos preços que
   voltam e a comparação (Fase B) virão depois.
   ============================================================ */

let _cotAberta = null;

function _proxIdentificador() {
  const ano = new Date().getFullYear();
  const n = cotacoes.filter((c) => (c.identificador || "").includes("-" + ano + "-")).length + 1;
  return `COT-${ano}-${String(n).padStart(3, "0")}`;
}

/* -------- nova cotação -------- */
function abrirNovaCotacao() {
  const corpo = `
    <div class="ff row2">
      <div><label>Identificador</label><input id="ctId" value="${_proxIdentificador()}"></div>
      <div><label>Data</label><input id="ctData" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
    </div>
    <div class="ff"><label>Observação</label><input id="ctObs" placeholder="Ex.: primeira compra / padronização inicial"></div>
  `;
  abrirModal("Nova cotação", corpo, async () => {
    const { data, error } = await window.SB.from("cotacoes")
      .insert({ identificador: fvOrNull("ctId"), data: fv("ctData") || new Date().toISOString().slice(0,10), observacao: fvOrNull("ctObs"), ...usuarioId() })
      .select("id").single();
    if (error) throw error;
    _cotAberta = data.id;
  }, "Criar cotação");
}

/* -------- itens -------- */
function abrirFormItemCotacao() {
  const temSub = substances.length > 0;
  const corpo = `
    <div class="ff"><label>Tipo de item</label>
      <select id="itTipo" onchange="_toggleItemCot()">
        ${temSub ? '<option value="sub">Substância cadastrada</option>' : ''}
        <option value="livre"${temSub ? '' : ' selected'}>Item livre (digitar)</option>
      </select>
    </div>
    <div id="itBlocoSub" style="display:${temSub ? 'block' : 'none'}">
      <div class="ff"><label>Substância</label><select id="itSub">${_optSubs()}</select></div>
    </div>
    <div id="itBlocoLivre" style="display:${temSub ? 'none' : 'block'}">
      <div class="ff row2">
        <div><label>Descrição *</label><input id="itDesc" placeholder="Ex.: Sertralina 50 mg comp."></div>
        <div><label>Unidade</label><input id="itUnid" placeholder="comp., amp., frasco…"></div>
      </div>
    </div>
    <div class="ff"><label>Quantidade a cotar *</label><input id="itQtd" type="number" min="0" step="1" placeholder="Ex.: 30"></div>
  `;
  abrirModal("Adicionar item à cotação", corpo, async () => {
    const tipo = fv("itTipo");
    const qtd = fvNum("itQtd");
    if (!qtd || qtd < 0) throw new Error("Informe a quantidade a cotar.");
    let descricao, unidade, substancia_id = null;
    if (tipo === "sub") {
      const sid = fv("itSub");
      const s = substances.find((x) => x.id === sid);
      if (!s) throw new Error("Selecione a substância.");
      substancia_id = sid; descricao = s.nome; unidade = s.unidade;
    } else {
      descricao = fv("itDesc"); unidade = fvOrNull("itUnid");
      if (!descricao) throw new Error("Informe a descrição do item.");
    }
    const ordem = (cotacoes.find((c) => c.id === _cotAberta)?.itens.length) || 0;
    const { error } = await window.SB.from("cotacao_itens")
      .insert({ cotacao_id: _cotAberta, substancia_id, descricao, unidade, quantidade: qtd, ordem, ...(window.USUARIO_ID ? {} : {}) });
    if (error) throw error;
  }, "Adicionar item");
}
function _toggleItemCot() {
  const t = fv("itTipo");
  document.getElementById("itBlocoSub").style.display = t === "sub" ? "block" : "none";
  document.getElementById("itBlocoLivre").style.display = t === "livre" ? "block" : "none";
}

async function adicionarTodasSubstancias() {
  const cot = cotacoes.find((c) => c.id === _cotAberta);
  const jaTem = new Set(cot.itens.map((i) => i.substanciaId).filter(Boolean));
  const novas = substances.filter((s) => !jaTem.has(s.id));
  if (!novas.length) { alert("Todas as substâncias cadastradas já estão na cotação."); return; }
  if (!confirm(`Adicionar ${novas.length} substância(s) cadastrada(s) à cotação (quantidade 0, você ajusta depois)?`)) return;
  const base = cot.itens.length;
  const rows = novas.map((s, i) => ({ cotacao_id: _cotAberta, substancia_id: s.id, descricao: s.nome, unidade: s.unidade, quantidade: 0, ordem: base + i }));
  const { error } = await window.SB.from("cotacao_itens").insert(rows);
  if (error) { alert("Erro: " + error.message); return; }
  await recarregarTela();
}

async function removerItemCotacao(id) {
  if (!confirm("Remover este item da cotação?")) return;
  const { error } = await window.SB.from("cotacao_itens").delete().eq("id", id);
  if (error) { alert("Erro: " + error.message); return; }
  await recarregarTela();
}

function abrirCotacao(id) { _cotAberta = id; document.getElementById("viewport").innerHTML = renderPage(); }
function voltarLista() { _cotAberta = null; document.getElementById("viewport").innerHTML = renderPage(); }

/* -------- impressão (formato para o fornecedor preencher) -------- */
function imprimirCotacao(id) {
  const cot = cotacoes.find((c) => c.id === id); if (!cot) return;
  const est = window.ESTAB || {}, rt = window.RT || {};
  const rtTxt = rt.nome ? `${rt.nome} — ${rt.conselho}-${rt.uf} ${rt.numero_registro}` : "";
  const linhas = cot.itens.map((it, i) => `<tr>
      <td class="num">${i + 1}</td>
      <td>${(it.descricao || "").replace(/</g,"&lt;")}</td>
      <td class="c">${it.unidade || ""}</td>
      <td class="c mono">${it.quantidade || ""}</td>
      <td></td><td></td><td></td>
    </tr>`).join("");
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Cotação ${cot.identificador || ""}</title>
  <style>
    @page{ size:A4 portrait; margin:14mm 12mm; }
    *{ box-sizing:border-box; } body{ font-family:"Public Sans",Arial,sans-serif; color:#1E2A28; font-size:11px; margin:0; }
    .estab{ border-bottom:2px solid #2C5F5A; padding-bottom:6px; margin-bottom:8px; }
    .estab .n{ font-size:14px; font-weight:700; } .estab .s{ font-size:10px; color:#4a544f; }
    h1{ font-size:14px; margin:8px 0 2px; } .sub{ font-size:10.5px; color:#6a736e; margin-bottom:8px; }
    .instr{ background:#EEF2EC; border:1px solid #cfd6cf; border-radius:6px; padding:7px 9px; font-size:10.5px; margin-bottom:8px; }
    table{ width:100%; border-collapse:collapse; } th,td{ border:1px solid #cfd6cf; padding:4px 6px; font-size:10.5px; }
    th{ background:#EEF2EC; text-transform:uppercase; font-size:9px; letter-spacing:.03em; }
    td.c,th.c{ text-align:center; } td.num,th.num{ text-align:center; width:26px; } .mono{ font-family:"IBM Plex Mono",monospace; }
    .fill{ background:#FCFBF6; } .foot{ margin-top:16px; font-size:10.5px; }
    .btn{ position:fixed; top:12px; right:12px; background:#2C5F5A; color:#fff; border:none; padding:9px 15px; border-radius:8px; cursor:pointer; font:inherit; }
    @media print{ .btn{ display:none; } }
  </style></head><body>
    <button class="btn" onclick="window.print()">Imprimir / Salvar PDF</button>
    <div class="estab">
      <div class="n">${(est.razao_social || est.nome_fantasia || "Hospital Reviva")}</div>
      <div class="s">${est.cnpj ? "CNPJ: "+est.cnpj+" · " : ""}${est.endereco || ""}${est.municipio_uf ? " — "+est.municipio_uf : ""}</div>
    </div>
    <h1>Solicitação de Cotação${cot.identificador ? " — " + cot.identificador : ""}</h1>
    <div class="sub">Data: ${fmtDate(cot.data)}${cot.observacao ? " · " + cot.observacao : ""}</div>
    <div class="instr"><b>Prezado fornecedor:</b> favor preencher, para cada item, a <b>embalagem (unid. por caixa)</b>, o <b>preço por caixa</b> e a <b>validade</b>. Indicar com "—" os itens indisponíveis. Contato do RT ao final.</div>
    <table>
      <thead><tr><th class="num">#</th><th>Descrição</th><th class="c">Unid.</th><th class="c">Qtde.</th><th class="c fill">Unid./caixa</th><th class="c fill">Preço/caixa</th><th class="c fill">Validade</th></tr></thead>
      <tbody>${linhas || '<tr><td colspan="7" class="c">Sem itens.</td></tr>'}</tbody>
    </table>
    <div class="foot">
      Fornecedor: ____________________________  ·  Contato/Vendedor: ____________________  ·  Data da resposta: ___/___/____<br><br>
      Responsável Técnico (solicitante): ${rtTxt || "____________________"}
    </div>
  </body></html>`;
  const win = window.open("", "_blank");
  if (!win) { alert("Permita pop-ups para imprimir a cotação."); return; }
  win.document.open(); win.document.write(html); win.document.close();
}

/* -------- render -------- */
function _viewLista() {
  return `
    <div class="note-box">Monte uma cotação com os itens e quantidades a comprar (da padronização), e gere a planilha para enviar aos fornecedores. Como a clínica abriu agora e ainda não há consumo, a <b>previsão</b> por histórico entra mais tarde — aqui a quantidade vem da padronização.</div>
    <div class="panel">
      <div class="panel-head">
        <div><div class="panel-title">Cotações</div><div class="panel-title-sub">${cotacoes.length} cotação(ões)</div></div>
        <button class="btn sm" onclick="abrirNovaCotacao()">+ Nova cotação</button>
      </div>
      <div class="panel-body">
        ${cotacoes.length ? `<table>
          <thead><tr><th>Identificador</th><th>Data</th><th>Itens</th><th>Status</th><th></th></tr></thead>
          <tbody>
            ${cotacoes.map(c=>`<tr>
              <td><b>${c.identificador || "—"}</b></td>
              <td class="mono">${fmtDate(c.data)}</td>
              <td class="num mono">${c.itens.length}</td>
              <td><span class="tag">${c.status}</span></td>
              <td style="text-align:right">
                <button class="btn ghost sm" onclick="abrirCotacao('${c.id}')">Abrir</button>
                <button class="btn ghost sm" onclick="imprimirCotacao('${c.id}')">Imprimir</button>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>` : `<div style="color:var(--muted);font-size:13px;padding:8px 0">Nenhuma cotação. Crie a primeira com <b>+ Nova cotação</b>.</div>`}
      </div>
    </div>
  `;
}

function _viewDetalhe(cot) {
  return `
    <div style="margin-bottom:14px"><button class="btn ghost sm" onclick="voltarLista()">← Voltar</button></div>
    <div class="panel">
      <div class="panel-head">
        <div><div class="panel-title">${cot.identificador || "Cotação"}</div><div class="panel-title-sub">${fmtDate(cot.data)}${cot.observacao ? " · " + cot.observacao : ""} · ${cot.itens.length} item(ns)</div></div>
        <div class="toolbar">
          ${substances.length ? '<button class="btn ghost sm" onclick="adicionarTodasSubstancias()">+ Todas as substâncias</button>' : ''}
          <button class="btn ghost sm" onclick="abrirFormItemCotacao()">+ Item</button>
          <button class="btn sm" onclick="imprimirCotacao('${cot.id}')">🖶 Imprimir cotação</button>
        </div>
      </div>
      <div class="panel-body">
        ${cot.itens.length ? `<table>
          <thead><tr><th>#</th><th>Descrição</th><th>Unid.</th><th>Qtde. a cotar</th><th>Origem</th><th></th></tr></thead>
          <tbody>
            ${cot.itens.map((it,i)=>`<tr>
              <td class="num mono">${i+1}</td>
              <td><b>${it.descricao}</b></td>
              <td class="mono">${it.unidade || "—"}</td>
              <td class="num mono">${it.quantidade || "—"}</td>
              <td>${it.substanciaId ? '<span class="tag">cadastrada</span>' : '<span class="tag" style="background:var(--accent-tint);color:var(--accent)">livre</span>'}</td>
              <td style="text-align:right"><button class="btn ghost sm" onclick="removerItemCotacao('${it.id}')">Remover</button></td>
            </tr>`).join('')}
          </tbody>
        </table>` : `<div style="color:var(--muted);font-size:13px;padding:8px 0">Cotação sem itens. Use <b>+ Item</b> (ou <b>+ Todas as substâncias</b>, se já tiver cadastrado).</div>`}
      </div>
    </div>
    <div class="note-box">Ao imprimir, sai a planilha com as colunas em branco (unid./caixa, preço, validade) para o fornecedor preencher. Quando os preços voltarem, na <b>Fase B</b> você lança e o sistema compara os fornecedores.</div>
  `;
}

function renderPage() {
  const cot = _cotAberta ? cotacoes.find((c) => c.id === _cotAberta) : null;
  return cot ? _viewDetalhe(cot) : _viewLista();
}
