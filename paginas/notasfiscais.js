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
    <div style="text-align:right;margin:0 0 16px"><button class="btn sm" onclick="abrirFormNF()">+ Lançar nova Nota Fiscal</button></div>
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
