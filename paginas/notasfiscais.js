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
          <div style="text-align:right"><div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px">Valor total</div><div class="mono" style="font-size:17px;font-weight:700;color:var(--primary-dark)">${fmtBRL(total)}</div></div>
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
