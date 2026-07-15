/* ============================================================
   paginas/notasfiscais.js — Hospital Reviva
   Lógica de renderização exclusiva desta página.
   Depende de assets/dados.js (dados + cálculo) já carregado.
   ============================================================ */

function renderPage(){
  const totalGeral = invoices.reduce((a,nf)=> a + nf.itens.reduce((x,it)=>x+it.qtd*it.custoUnit,0), 0);
  return `
    <div class="note-box"><b>${invoices.length} nota(s) fiscal(is) lançada(s)</b> · valor total em compras: <b>${fmtBRL(totalGeral)}</b>. Cada item de NF gera automaticamente um lote rastreável em estoque, com validade e custo unitário próprios. Compra em <b>drogaria</b> é o canal recomendado para o volume atual de pacientes; migrar para <b>distribuidora</b> compensa a partir de um volume maior de compra recorrente.</div>
    ${invoices.map(nf=>{
      const total = nf.itens.reduce((a,it)=>a+it.qtd*it.custoUnit,0);
      return `
      <div class="panel">
        <div class="panel-head">
          <div><div class="panel-title">NF ${nf.numero} — ${nf.fornecedor} <span class="tag" style="background:${nf.canal==='drogaria'?'var(--accent-tint)':'var(--primary-tint)'};color:${nf.canal==='drogaria'?'var(--accent)':'var(--primary-dark)'};text-transform:uppercase;font-size:10px;vertical-align:middle;margin-left:4px">${nf.canal}</span></div><div class="panel-title-sub">${fmtDate(nf.data)} · ${nf.itens.length} item(ns)</div></div>
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
    `;}).join('')}
    <div style="text-align:right;margin-top:4px"><button class="btn sm">+ Lançar nova Nota Fiscal</button></div>
  `;
}
