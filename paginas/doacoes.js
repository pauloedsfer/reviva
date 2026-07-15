/* ============================================================
   paginas/doacoes.js — Hospital Reviva
   Lógica de renderização exclusiva desta página.
   Depende de assets/dados.js (dados + cálculo) já carregado.
   ============================================================ */

function renderPage(){
  const totalEstimado = donations.reduce((a,d)=> a + d.itens.reduce((x,it)=>x+it.qtd*it.valorEstimado,0), 0);
  return `
    <div class="note-box"><b>Custo real ao hospital: R$ 0,00.</b> Itens doados entram em estoque e na escrituração normalmente, mas não compõem o custo de medicamentos — apenas o valor de mercado estimado, para demonstrar a economia gerada pelas parcerias.</div>
    <div class="grid cards" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr));margin-bottom:22px">
      <div class="card"><div class="card-label">Doações recebidas</div><div class="card-value">${donations.length}</div><div class="card-note">registro(s) no período</div></div>
      <div class="card"><div class="card-label">Valor de mercado estimado</div><div class="card-value" style="color:var(--accent)">${fmtBRL(totalEstimado)}</div><div class="card-note">economia gerada ao hospital</div></div>
    </div>
    ${donations.map(d=>{
      const total = d.itens.reduce((a,it)=>a+it.qtd*it.valorEstimado,0);
      return `
      <div class="panel">
        <div class="panel-head">
          <div><div class="panel-title">${d.doador}</div><div class="panel-title-sub">${fmtDate(d.data)} · ${d.itens.length} item(ns)</div></div>
          <div style="text-align:right"><div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px">Valor estimado</div><div class="mono" style="font-size:17px;font-weight:700;color:var(--accent)">${fmtBRL(total)}</div></div>
        </div>
        <div class="panel-body">
          <table>
            <thead><tr><th>Substância</th><th>Lote</th><th>Validade</th><th>Qtd.</th><th>Valor de mercado/un.</th><th>Subtotal</th></tr></thead>
            <tbody>
              ${d.itens.map(it=>`
                <tr>
                  <td><b>${subById(it.subId).nome}</b></td>
                  <td><span class="folio">${it.lote}</span></td>
                  <td class="mono">${fmtDate(it.validade)}</td>
                  <td class="num mono">${it.qtd}</td>
                  <td class="num mono">${fmtBRL(it.valorEstimado)}</td>
                  <td class="num mono"><b>${fmtBRL(it.qtd*it.valorEstimado)}</b></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;}).join('')}
    <div style="text-align:right;margin-top:4px"><button class="btn sm">+ Lançar nova Doação</button></div>
  `;
}
