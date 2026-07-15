/* ============================================================
   paginas/estoque.js — Hospital Reviva
   Lógica de renderização exclusiva desta página.
   Depende de assets/dados.js (dados + cálculo) já carregado.
   ============================================================ */

function renderPage(){
  const lotes = allLotes().sort((a,b)=> a.validade < b.validade ? -1 : 1);
  return `
    <div class="panel">
      <div class="panel-head">
        <div><div class="panel-title">Substâncias controladas e estoque</div><div class="panel-title-sub">Saldo = soma dos lotes ativos (calculado, não digitado) · custo médio ponderado pelas compras</div></div>
        <button class="btn sm">+ Nova substância</button>
      </div>
      <div class="panel-body">
        <table>
          <thead><tr><th>Substância</th><th>Lista</th><th>Saldo atual</th><th>Custo médio/un.</th><th>Valor em estoque</th><th>Situação</th></tr></thead>
          <tbody>
            ${substances.map(s=>{
              const bal = saldo(s.id);
              const cm = custoMedio(s.id);
              const low = bal <= 10;
              return `<tr>
                <td><b>${s.nome}</b></td>
                <td>${s.lista==='—' ? '<span style="color:var(--muted)">não controlado</span>' : `<span class="tag ${listaTagClass(s.lista)}">Lista ${s.lista}</span>`}</td>
                <td class="num mono">${bal} ${s.unidade}</td>
                <td class="num mono">${fmtBRL(cm)}</td>
                <td class="num mono"><b>${fmtBRL(bal*cm)}</b></td>
                <td>${low ? '<span class="pill low">● abaixo do mínimo</span>' : '<span class="pill">● regular</span>'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head">
        <div><div class="panel-title">Lotes &amp; Validade</div><div class="panel-title-sub">Todo lote recebido, por compra ou doação, com saldo e status de vencimento</div></div>
      </div>
      <div class="panel-body">
        <table>
          <thead><tr><th>Lote</th><th>Substância</th><th>Origem</th><th>Validade</th><th>Status</th><th>Recebido</th><th>Saldo do lote</th></tr></thead>
          <tbody>
            ${lotes.map(l=>{
              const vs = validadeStatus(l.validade);
              const bal = saldoLote(l.lote);
              const statusTag = vs.key==='vencido' ? `<span class="pill low">● ${vs.label}</span>`
                : vs.key==='critico' ? `<span class="pill warn">● ${vs.label}</span>`
                : `<span class="pill">● ${vs.label}</span>`;
              const origemTag = l.origem==='compra' ? '<span class="tag tag-in">COMPRA</span>'
                : l.origem==='doacao' ? '<span class="tag" style="background:var(--accent)">DOAÇÃO</span>'
                : '<span class="tag tag-proprio">PRÓPRIA DO PACIENTE</span>';
              return `<tr>
                <td><span class="folio">${l.lote}</span></td>
                <td>${subById(l.subId).nome}</td>
                <td>${origemTag}</td>
                <td class="mono">${fmtDate(l.validade)}</td>
                <td>${statusTag}</td>
                <td class="num mono">${l.qtd}</td>
                <td class="num mono"><b>${bal}</b></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
        <div class="foot-signoff">
          <span>Lotes "própria do paciente" ficam em custódia — não contam no saldo geral disponível da tabela acima</span>
          <span>${lotes.filter(l=>l.origem==='proprio').length} lote(s) em custódia de paciente</span>
        </div>
        <div class="foot-signoff">
          <span>Lotes vencidos ou próximos do vencimento (≤ 90 dias) exigem separação e baixa formal do estoque</span>
          <span>${lotes.filter(l=>validadeStatus(l.validade).key!=='ok').length} lote(s) exigindo atenção</span>
        </div>
      </div>
    </div>
  `;
}
