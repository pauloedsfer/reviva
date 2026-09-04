/* ============================================================
   paginas/notasfiscais.js — Hospital Reviva
   Lista de NFs + lançamento de nova NF (cada item gera um lote).
   ============================================================ */

function abrirFormNF() {
  const corpo = `
    <div class="ff row3">
      <div><label>Número *</label><input id="nfNum"></div>
      <div><label>Série</label><input id="nfSerie"></div>
      <div><label>Emissão *</label><input id="nfData" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
    </div>
    <div class="ff row2">
      <div><label>Fornecedor</label><select id="nfForn" onchange="_toggleBloco('nfForn','blocoNovoForn')">${_optForn()}</select></div>
      <div><label>Canal</label><select id="nfCanal"><option value="">—</option><option value="drogaria">drogaria</option><option value="distribuidora">distribuidora</option></select></div>
    </div>
    ${_blocoNovoFornecedor()}
    <div class="item-head">Itens da nota</div>
    <div id="nfItens"></div>
    <button type="button" class="btn ghost sm add-item" onclick="addItemRow('nfItens','nf')">+ Adicionar item</button>
  `;
  abrirModal("Lançar nova Nota Fiscal", corpo, async () => {
    const numero = fv("nfNum"); const dataE = fv("nfData");
    validarPeriodoAberto(dataE);
    if (!numero) throw new Error("Informe o número da NF.");
    if (!dataE) throw new Error("Informe a data de emissão.");
    const fornId = await resolveFornecedor("nfForn");
    const itens = coletarItens("nfItens", "nf");
    const { data: nf, error } = await window.SB.from("notas_fiscais")
      .insert({ numero, serie: fvOrNull("nfSerie"), data_emissao: dataE, fornecedor_id: fornId, canal: fvOrNull("nfCanal"), ...usuarioId() })
      .select("id").single();
    if (error) throw error;
    const rows = itens.map((it) => ({ nota_fiscal_id: nf.id, substancia_id: it.sub, quantidade: it.qtd, numero_lote: it.lote, validade: it.val, custo_unit: it.extra || 0 }));
    const { error: e2 } = await window.SB.from("nota_fiscal_itens").insert(rows);
    if (e2) throw e2;
  }, "Lançar NF");
  addItemRow("nfItens", "nf");
}

function renderPage(){
  const totalGeral = invoices.reduce((a,nf)=> a + nf.itens.reduce((x,it)=>x+it.qtd*it.custoUnit,0), 0);
  return `
    <div class="note-box"><b>${invoices.length} nota(s) fiscal(is) lançada(s)</b> · valor total em compras: <b>${fmtBRL(totalGeral)}</b>. Cada item de NF gera automaticamente um lote rastreável em estoque, com validade e custo unitário próprios.</div>
    <div style="display:flex;justify-content:flex-end;gap:8px;margin:0 0 16px">
      <button class="btn ghost sm" onclick="abrirImportarNF()">⬆ Importar da DANFE</button>
      <button class="btn sm" onclick="abrirFormNF()">+ Lançar nova Nota Fiscal</button></div>
    ${invoices.length ? invoices.map(nf=>{
      const total = nf.itens.reduce((a,it)=>a+it.qtd*it.custoUnit,0);
      return `
      <div class="panel">
        <div class="panel-head">
          <div><div class="panel-title">NF ${nf.numero} — ${nf.fornecedor} <span class="tag" style="background:${nf.canal==='drogaria'?'var(--accent-tint)':'var(--primary-tint)'};color:${nf.canal==='drogaria'?'var(--accent)':'var(--primary-dark)'};text-transform:uppercase;font-size:10px;vertical-align:middle;margin-left:4px">${nf.canal||''}</span></div><div class="panel-title-sub">${fmtDate(nf.data)} · ${nf.itens.length} item(ns)</div></div>
          <div style="display:flex;align-items:center;gap:14px">
            <div style="text-align:right"><div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px">Valor total</div><div class="mono" style="font-size:17px;font-weight:700;color:var(--primary-dark)">${fmtBRL(total)}</div></div>
            <div class="toolbar">
              <button class="btn ghost sm" onclick="abrirEditarNF('${nf.id}')">Corrigir</button>
              <button class="btn ghost sm" onclick="excluirNF('${nf.id}')">Excluir</button>
            </div>
          </div>
        </div>
        <div class="panel-body">
          <table>
            <thead><tr><th>Substância</th><th>Lote</th><th>Validade</th><th>Qtd.</th><th>Custo/un.</th><th>Subtotal</th></tr></thead>
            <tbody>
              ${nf.itens.map(it=>`
                <tr>
                  <td><b>${subById(it.subId).nome}</b></td>
                  <td><span class="folio">${it.lote}</span></td>
                  <td class="mono">${fmtDate(it.validade)}</td>
                  <td class="num mono">${it.qtd}</td>
                  <td class="num mono">${fmtBRL(it.custoUnit)}</td>
                  <td class="num mono"><b>${fmtBRL(it.qtd*it.custoUnit)}</b></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;}).join('') : `<div class="note-box" style="text-align:center">Nenhuma nota fiscal lançada ainda.</div>`}
  `;
}

/* ============================================================
   CORRIGIR NOTA FISCAL
   Valor (custo unitário) é sempre corrigível — não altera saldo,
   só o custo médio e o financeiro. Quantidade e número do lote
   têm proteção: o lote é a chave que liga as baixas à entrada, e
   a quantidade não pode ficar abaixo do que já foi dispensado.
   ============================================================ */
function abrirEditarNF(nfId) {
  const nf = invoices.find((x) => x.id === nfId);
  if (!nf) return;

  const linhas = nf.itens.map((it, i) => {
    const usado = dispensations.filter((d) => d.lote === it.lote).reduce((a, d) => a + d.qtd, 0);
    const trava = usado > 0;
    return `<div class="item-row" style="grid-template-columns:1.6fr .7fr .8fr .9fr .9fr" data-item="${it.id}">
      <div style="padding:8px 0;font-size:13px"><b>${_esc(subById(it.subId).nome)}</b>
        ${trava ? `<div style="font-size:11px;color:var(--warn)">${usado} já administrado(s) — lote travado</div>` : ""}</div>
      <div><input class="e-qtd" type="number" min="${usado}" step="0.01" value="${it.qtd}" title="Quantidade recebida"></div>
      <div><input class="e-lote" value="${_esc(it.lote || "")}"${trava ? ' disabled style="background:#F1F3F1;color:var(--muted)"' : ""} title="Lote"></div>
      <div><input class="e-val" type="date" value="${it.validade || ""}" title="Validade"></div>
      <div><input class="e-custo" type="number" min="0" step="0.0001" value="${it.custoUnit}" title="Custo unitário"></div>
    </div>`;
  }).join("");

  const optForn = `<option value="">— sem fornecedor —</option>` +
    fornecedores.slice().sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
      .map((f) => `<option value="${f.id}"${f.id === nf.fornecedorId ? " selected" : ""}>${_esc(f.nome)}</option>`).join("");

  abrirModal(`Corrigir nota fiscal nº ${_esc(nf.numero || "")}`, `
    <div class="note-box" style="margin-top:0">Corrija aqui erros de digitação. O <b>custo unitário</b> pode ser alterado livremente — ele não mexe no saldo, apenas no custo médio e no financeiro. <b>Quantidade</b> e <b>lote</b> têm proteção quando já houve administração, para não romper a rastreabilidade.</div>
    <div class="ff row2">
      <div><label>Número *</label><input id="enNum" value="${_esc(nf.numero || "")}"></div>
      <div><label>Data de emissão *</label><input id="enData" type="date" value="${nf.data || ""}"></div>
    </div>
    <div class="ff row2">
      <div><label>Fornecedor</label><select id="enForn">${optForn}</select></div>
      <div><label>Valor total da nota</label><input id="enTotal" type="number" min="0" step="0.01" value="${nf.valorTotal != null ? nf.valorTotal : ""}"></div>
    </div>
    <div class="item-head">Itens da nota</div>
    <div class="item-row" style="grid-template-columns:1.6fr .7fr .8fr .9fr .9fr;font-size:11px;color:var(--muted);font-weight:600">
      <div>Substância</div><div>Qtd.</div><div>Lote</div><div>Validade</div><div>Custo unit.</div>
    </div>
    ${linhas}
  `, async () => {
    const numero = fv("enNum"); if (!numero) throw new Error("Informe o número da nota.");
    const data = fv("enData"); if (!data) throw new Error("Informe a data de emissão.");
    validarPeriodoAberto(data);
    // cabeçalho
    const { error: e1 } = await window.SB.from("notas_fiscais").update({
      numero, data_emissao: data, fornecedor_id: fvOrNull("enForn"),
      valor_total: fv("enTotal") === "" ? null : fvNum("enTotal"),
    }).eq("id", nfId);
    if (e1) throw e1;
    // itens
    const rows = Array.from(document.querySelectorAll('[data-item]'));
    for (const r of rows) {
      const itemId = r.getAttribute("data-item");
      const orig = nf.itens.find((x) => x.id === itemId);
      const usado = dispensations.filter((d) => d.lote === orig.lote).reduce((a, d) => a + d.qtd, 0);
      const qtd = parseFloat(r.querySelector(".e-qtd").value);
      if (!(qtd >= 0)) throw new Error("Quantidade inválida em " + subById(orig.subId).nome + ".");
      if (usado > 0 && qtd < usado)
        throw new Error(`${subById(orig.subId).nome}: a quantidade não pode ficar abaixo do já administrado (${usado}).`);
      const dados = {
        quantidade: qtd,
        validade: r.querySelector(".e-val").value || null,
        custo_unit: parseFloat(r.querySelector(".e-custo").value) || 0,
      };
      if (usado === 0) {
        const lote = r.querySelector(".e-lote").value.trim();
        if (!lote) throw new Error("Informe o lote em " + subById(orig.subId).nome + ".");
        dados.numero_lote = lote;
      }
      const { error: e2 } = await window.SB.from("nota_fiscal_itens").update(dados).eq("id", itemId);
      if (e2) throw e2;
    }
  }, "Salvar correção");
}

async function excluirNF(nfId) {
  const nf = invoices.find((x) => x.id === nfId); if (!nf) return;
  const usados = nf.itens.filter((it) => dispensations.some((d) => d.lote === it.lote));
  if (usados.length) {
    alert(`Esta nota não pode ser excluída.\n\nJá houve administração de ${usados.length} lote(s) que entraram por ela. ` +
          `Excluir apagaria a origem desses medicamentos, o que a escrituração não permite.\n\n` +
          `Use "Corrigir" para ajustar os dados.`);
    return;
  }
  if (!confirm(`Excluir a nota fiscal nº ${nf.numero}?\n\nNenhum item dela foi administrado, então pode ser removida.\nO estoque que entrou por esta nota será desfeito.\n\nEsta ação não pode ser desfeita.`)) return;
  await window.SB.from("nota_fiscal_itens").delete().eq("nota_fiscal_id", nfId);
  const { error } = await window.SB.from("notas_fiscais").delete().eq("id", nfId);
  if (error) { alert("Erro: " + error.message); return; }
  await recarregarTela();
}

/* ============================================================
   IMPORTAR NOTA FISCAL (colar dados extraídos da DANFE)
   Formato:
     NF;numero;serie;dd/mm/aaaa;FORNECEDOR;valor_total
     ITEM;NOME DO ITEM;CAIXAS;UNID_POR_CAIXA;LOTE;VALIDADE;VALOR_TOTAL_ITEM
   A quantidade em estoque é CAIXAS × UNID_POR_CAIXA, e o custo unitário
   é VALOR_TOTAL_ITEM ÷ quantidade — a DANFE traz preço por caixa, o
   estoque trabalha em unidades.
   ============================================================ */
let _impNF = null;

function abrirImportarNF() {
  _impNF = null;
  const optF = `<option value="">— identificar pelo nome no bloco —</option>` +
    fornecedores.filter(fornAtivo).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
      .map((f) => `<option value="${f.id}">${_esc(f.nome)}</option>`).join("");
  abrirModal("Importar nota fiscal", `
    <div class="note-box" style="margin-top:0">Cole o bloco gerado pela IA a partir da DANFE. Use <b>Conferir</b> antes de gravar — nada entra no estoque sem sua aprovação. O guia de extração está no arquivo <b>PROMPT-notas-fiscais.md</b>, na pasta do sistema.</div>
    <div class="ff"><label>Fornecedor <span style="font-weight:400;color:var(--muted)">— opcional, sobrepõe o do bloco</span></label>
      <select id="infForn">${optF}</select></div>
    <div class="ff"><label>Dados da nota</label>
      <textarea id="infTxt" rows="11" class="no-upper" style="width:100%;padding:9px 11px;border:1px solid var(--line);border-radius:8px;font:inherit;font-family:'IBM Plex Mono',monospace;font-size:11.5px;resize:vertical" placeholder="NF;259596;000;05/08/2026;DISTRIBUIDORA BRASIL;1551.15&#10;ITEM;ARIPIPRAZOL 10MG COMP.;1;30;26B72Y;13/02/2029;13.02&#10;ITEM;BIPERIDENO 2MG COMP.;1;200;50039554;02/03/2029;84.36"></textarea></div>
    <div style="display:flex;gap:10px;align-items:center;margin-bottom:6px">
      <button type="button" class="btn ghost sm" onclick="_infConferir()">Conferir antes de gravar</button>
      <span style="font-size:12px;color:var(--muted)">Separador: ponto-e-vírgula.</span>
    </div>
    <div id="infPrev"></div>
  `, async () => {
    if (!_impNF) _infConferir();
    if (!_impNF || !_impNF.ok.length) throw new Error("Nenhum item reconhecido. Use Conferir para ver o motivo.");
    const cab = _impNF.cab;
    const fid = fv("infForn") || cab.fornecedorId || null;
    if (!cab.numero) throw new Error("O bloco não traz o número da nota (linha NF).");
    validarPeriodoAberto(cab.data);
    const { data, error } = await window.SB.from("notas_fiscais").insert({
      numero: cab.numero, serie: cab.serie || null, data_emissao: cab.data,
      fornecedor_id: fid, canal: "distribuidora", valor_total: cab.valorTotal,
      ...usuarioId(),
    }).select().single();
    if (error) throw error;
    const itens = _impNF.ok.map((l) => ({
      nota_fiscal_id: data.id, substancia_id: l.subId, quantidade: l.qtdUnid,
      numero_lote: l.lote, validade: l.validade, custo_unit: l.custoUnit,
    }));
    const { error: e2 } = await window.SB.from("nota_fiscal_itens").insert(itens);
    if (e2) throw e2;
  }, "Gravar nota fiscal");
}

function _infNum(t) {
  let x = String(t == null ? "" : t).replace(/[^\d.,-]/g, "").trim();
  if (!x) return NaN;
  const p = x.includes("."), v = x.includes(",");
  if (p && v) x = x.lastIndexOf(",") > x.lastIndexOf(".") ? x.replace(/\./g, "").replace(",", ".") : x.replace(/,/g, "");
  else if (v) { const d = x.split(","); x = (d.length === 2 && d[1].length <= 2) ? x.replace(",", ".") : x.replace(/,/g, ""); }
  return parseFloat(x);
}
function _infData(t) {
  const s = String(t || "");
  let m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${String(m[2]).padStart(2,"0")}-${String(m[3]).padStart(2,"0")}`;
  m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) { const a = m[3].length === 2 ? "20" + m[3] : m[3];
           return `${a}-${String(m[2]).padStart(2,"0")}-${String(m[1]).padStart(2,"0")}`; }
  m = s.match(/(\d{1,2})\/(\d{4})/);
  if (m) { const u = new Date(Number(m[2]), Number(m[1]), 0).getDate();
           return `${m[2]}-${String(m[1]).padStart(2,"0")}-${u}`; }
  return null;
}

function _infConferir() {
  const txt = (document.getElementById("infTxt") || {}).value || "";
  const idx = {};
  substances.forEach((s) => { idx[(s.nome || "").trim().toUpperCase()] = s; });

  const cab = { numero: "", serie: "", data: null, fornecedorNome: "", fornecedorId: null, valorTotal: null };
  const ok = [], erro = [];

  txt.split(/\r?\n/).forEach((linha, n) => {
    const l = linha.trim();
    if (!l) return;
    const p = l.split(";").map((x) => x.trim());
    const tag = (p[0] || "").toUpperCase();

    if (tag === "NF") {
      cab.numero = p[1] || "";
      cab.serie = p[2] || "";
      cab.data = _infData(p[3]) || HOJE;
      cab.fornecedorNome = p[4] || "";
      cab.valorTotal = _infNum(p[5]);
      if (cab.fornecedorNome) {
        const alvo = cab.fornecedorNome.toUpperCase();
        const f = fornecedores.find((x) => (x.nome || "").toUpperCase() === alvo) ||
                  fornecedores.find((x) => (x.nome || "").toUpperCase().indexOf(alvo.split(" ")[0]) === 0);
        cab.fornecedorId = f ? f.id : null;
        cab.fornecedorAchado = f ? f.nome : null;
      }
      return;
    }
    if (tag !== "ITEM") { erro.push({ n: n + 1, l, m: "linha não começa com NF ou ITEM" }); return; }

    const nome = (p[1] || "").toUpperCase();
    const caixas = _infNum(p[2]);
    const unidCx = _infNum(p[3]);
    const lote = p[4] || "";
    const validade = _infData(p[5]);
    const total = _infNum(p[6]);

    if (!idx[nome]) { erro.push({ n: n + 1, l, m: `item não cadastrado: "${p[1]}"` }); return; }
    if (!(caixas > 0)) { erro.push({ n: n + 1, l, m: "quantidade de caixas inválida" }); return; }
    if (!(unidCx > 0)) { erro.push({ n: n + 1, l, m: "unidades por caixa inválida" }); return; }
    if (!lote) { erro.push({ n: n + 1, l, m: "lote não informado" }); return; }
    if (!validade) { erro.push({ n: n + 1, l, m: "validade inválida" }); return; }
    if (!(total >= 0)) { erro.push({ n: n + 1, l, m: "valor total do item inválido" }); return; }

    const qtdUnid = caixas * unidCx;
    ok.push({ subId: idx[nome].id, nome: idx[nome].nome, caixas, unidCx, qtdUnid,
              lote, validade, total, custoUnit: total / qtdUnid,
              lista: idx[nome].lista, vencido: validade < HOJE });
  });

  _impNF = { cab, ok, erro };

  const somaItens = ok.reduce((a, l) => a + l.total, 0);
  const difere = cab.valorTotal != null && !isNaN(cab.valorTotal) && Math.abs(somaItens - cab.valorTotal) > 0.05;
  const el = document.getElementById("infPrev");
  if (!el) return;
  el.innerHTML = `
    <div class="note-box" style="margin:10px 0 0;background:${erro.length ? "#FBF3E3" : "#E7F0E3"};border-color:${erro.length ? "#e8d9b0" : "#c9dcc2"}">
      <b>NF ${_esc(cab.numero || "—")}</b>${cab.serie ? ` · série ${_esc(cab.serie)}` : ""} · ${cab.data ? fmtDate(cab.data) : "sem data"}
      · <b>${ok.length}</b> item(ns)${erro.length ? ` · <b style="color:#B04A3F">${erro.length} com problema</b>` : ""}
      <div style="font-size:12.5px;margin-top:4px">
        Fornecedor: ${cab.fornecedorAchado ? `<b>${_esc(cab.fornecedorAchado)}</b>` : (cab.fornecedorNome ? `<span style="color:#B04A3F">“${_esc(cab.fornecedorNome)}” não encontrado — selecione acima</span>` : "selecione acima")}
      </div>
      <div style="font-size:12.5px">Soma dos itens: <b>${fmtBRL(somaItens)}</b>${cab.valorTotal ? ` · total declarado: <b>${fmtBRL(cab.valorTotal)}</b>` : ""}
        ${difere ? `<span style="color:#B04A3F"> — diferença de ${fmtBRL(Math.abs(somaItens - cab.valorTotal))}, confira</span>` : (cab.valorTotal ? " — confere" : "")}</div>
    </div>
    ${ok.length ? `<div style="max-height:210px;overflow:auto;margin-top:8px;border:1px solid var(--line);border-radius:8px">
      <table style="font-size:11.5px"><thead><tr><th>Item</th><th class="num">Cx</th><th class="num">Un/cx</th><th class="num">Unidades</th><th>Lote</th><th>Validade</th><th class="num">Custo un.</th></tr></thead>
      <tbody>${ok.map((o) => `<tr>
        <td>${_esc(o.nome)}${o.lista && o.lista !== "—" ? ` <span class="tag">${_esc(o.lista)}</span>` : ""}</td>
        <td class="num mono">${o.caixas}</td><td class="num mono">${o.unidCx}</td>
        <td class="num mono"><b>${o.qtdUnid}</b></td>
        <td class="mono">${_esc(o.lote)}</td>
        <td class="mono" style="color:${o.vencido ? "#B04A3F" : "inherit"}">${fmtDate(o.validade)}${o.vencido ? " ⚠" : ""}</td>
        <td class="num mono">${fmtBRL(o.custoUnit)}</td></tr>`).join("")}</tbody></table></div>` : ""}
    ${erro.length ? `<div style="margin-top:8px;font-size:12px"><b style="color:#B04A3F">Linhas não aplicadas:</b>
      <ul style="margin:4px 0 0 18px;padding:0">${erro.slice(0, 12).map((e) => `<li>linha ${e.n}: ${_esc(e.m)}</li>`).join("")}</ul></div>` : ""}`;
}
