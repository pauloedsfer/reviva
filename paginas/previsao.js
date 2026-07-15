/* ============================================================
   paginas/previsao.js — Hospital Reviva
   Lógica de renderização exclusiva desta página.
   Depende de assets/dados.js (dados + cálculo) já carregado.
   ============================================================ */

function renderPage(){
  const rows = substances.map(s=>{
    const bal = saldo(s.id);
    const consumo = consumoMedioDiario(s.id);
    const diasRestantes = consumo > 0 ? bal / consumo : null;
    const sugestao = consumo > 0 ? Math.max(0, Math.ceil(consumo*60 - bal)) : 0;
    let status;
    if(consumo === 0) status = { key:'ok', label:'Sem consumo recente' };
    else if(diasRestantes < 7) status = { key:'low', label:'Crítico' };
    else if(diasRestantes < 20) status = { key:'warn', label:'Atenção' };
    else status = { key:'ok', label:'Regular' };
    return { s, bal, consumo, diasRestantes, sugestao, status };
  }).sort((a,b)=> (a.diasRestantes ?? 999) - (b.diasRestantes ?? 999));

  return `
    <div class="note-box"><b>Como é calculado.</b> Consumo médio diário = total dispensado ÷ dias do período observado (${periodoDispensacaoDias()} dias, nesta amostra). Sugestão de compra cobre 60 dias de consumo projetado. Em uso real, a base de cálculo cresce a cada dia de operação e fica mais precisa.</div>
    <div class="panel">
      <div class="panel-head">
        <div><div class="panel-title">Projeção de reposição</div><div class="panel-title-sub">Ordenado pelas substâncias mais urgentes</div></div>
      </div>
      <div class="panel-body">
        <table>
          <thead><tr><th>Substância</th><th>Saldo atual</th><th>Consumo médio/dia</th><th>Dias restantes</th><th>Sugestão de compra</th><th>Status</th></tr></thead>
          <tbody>
            ${rows.map(r=>`
              <tr>
                <td><b>${r.s.nome}</b></td>
                <td class="num mono">${r.bal} ${r.s.unidade}</td>
                <td class="num mono">${r.consumo.toFixed(2)}</td>
                <td class="num mono">${r.diasRestantes===null ? '—' : Math.floor(r.diasRestantes)+'d'}</td>
                <td class="num mono">${r.sugestao>0 ? r.sugestao+' '+r.s.unidade : '—'}</td>
                <td>${r.status.key==='low' ? `<span class="pill low">● ${r.status.label}</span>` : r.status.key==='warn' ? `<span class="pill warn">● ${r.status.label}</span>` : `<span class="pill">● ${r.status.label}</span>`}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
