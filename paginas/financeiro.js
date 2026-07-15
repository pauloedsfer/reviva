/* ============================================================
   paginas/financeiro.js — Hospital Reviva
   Lógica de renderização exclusiva desta página.
   Depende de assets/dados.js (dados + cálculo) já carregado.
   ============================================================ */

function renderPage(){
  const custoTotalMedicamentos = movements.filter(m=>m.tipo==='saida').reduce((a,m)=>a+m.qtd*(m.custoUnit||0),0);
  const custoTotalInternacoes = patients.reduce((a,p)=>a+custoTotalPaciente(p),0);
  const somaDiasPaciente = patients.reduce((a,p)=>a+diasInternado(p),0);
  const custoMedioPacienteDia = somaDiasPaciente ? custoTotalInternacoes/somaDiasPaciente : 0;
  const economiaDoacoes = donations.reduce((a,d)=>a+d.itens.reduce((x,it)=>x+it.qtd*it.valorEstimado,0),0);

  // custo diário com medicamentos (por data de dispensação)
  const porDia = {};
  dispensations.forEach(d=>{
    const lote = allLotes().find(l=>l.lote===d.lote);
    const custo = d.qtd * (lote ? lote.custoUnit : 0);
    porDia[d.data] = (porDia[d.data]||0) + custo;
  });
  const diasOrdenados = Object.keys(porDia).sort();
  const dataDiaria = diasOrdenados.map(d=>({ label: fmtDate(d).slice(0,5), value: +porDia[d].toFixed(2) }));

  // custo por substância (top, medicamentos dispensados)
  const porSub = {};
  movements.filter(m=>m.tipo==='saida').forEach(m=>{
    porSub[m.subId] = (porSub[m.subId]||0) + m.qtd*(m.custoUnit||0);
  });
  const dataSub = Object.entries(porSub)
    .map(([subId,value])=>({ label: subById(subId).nome.split(' ').slice(0,2).join(' '), value: +value.toFixed(2) }))
    .sort((a,b)=>b.value-a.value);

  return `
    <div class="grid cards">
      <div class="card"><div class="card-label">Custo total — medicamentos</div><div class="card-value">${fmtBRL(custoTotalMedicamentos)}</div><div class="card-note">dispensações registradas no período</div></div>
      <div class="card"><div class="card-label">Custo médio / paciente-dia</div><div class="card-value">${fmtBRL(custoMedioPacienteDia)}</div><div class="card-note">diária + medicamentos, por dia internado</div></div>
      <div class="card"><div class="card-label">Custo total de internação</div><div class="card-value">${fmtBRL(custoTotalInternacoes)}</div><div class="card-note">todos os pacientes ativos, até hoje</div></div>
      <div class="card"><div class="card-label">Economia com doações</div><div class="card-value" style="color:var(--accent)">${fmtBRL(economiaDoacoes)}</div><div class="card-note">valor de mercado não desembolsado</div></div>
    </div>

    <div class="panel">
      <div class="panel-head">
        <div><div class="panel-title">Custo diário com medicamentos</div><div class="panel-title-sub">Soma das dispensações por dia, a custo de aquisição</div></div>
      </div>
      <div class="panel-body">
        ${svgBarChart(dataDiaria, { valueFmt: v => 'R$'+v.toFixed(0) })}
      </div>
    </div>

    <div class="panel">
      <div class="panel-head">
        <div><div class="panel-title">Custo por substância</div><div class="panel-title-sub">Onde o orçamento de medicamentos está concentrado</div></div>
      </div>
      <div class="panel-body">
        ${svgHBarChart(dataSub, { valueFmt: fmtBRL, color: CHART_COLORS.accent })}
      </div>
    </div>

    <div class="panel">
      <div class="panel-head">
        <div><div class="panel-title">Custo por paciente</div><div class="panel-title-sub">Diária de internação (${fmtBRL(DIARIA_INTERNACAO)}/dia) + medicamentos efetivamente dispensados</div></div>
      </div>
      <div class="panel-body">
        <table>
          <thead><tr><th>Paciente</th><th>Dias internado</th><th>Custo diárias</th><th>Custo medicamentos</th><th>Custo total</th><th>Custo médio/dia</th></tr></thead>
          <tbody>
            ${patients.map(p=>{
              const dias = diasInternado(p);
              const cd = custoDiariasPaciente(p);
              const cm = custoMedicamentosPaciente(p.id);
              const total = cd+cm;
              return `<tr>
                <td><b>${p.nome}</b> <span style="color:var(--muted)">· ${p.leito}</span></td>
                <td class="num mono">${dias}</td>
                <td class="num mono">${fmtBRL(cd)}</td>
                <td class="num mono">${fmtBRL(cm)}</td>
                <td class="num mono"><b>${fmtBRL(total)}</b></td>
                <td class="num mono">${fmtBRL(total/dias)}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
        <div class="foot-signoff">
          <span>Valores ilustrativos — diária de internação é parâmetro configurável pelo hospital</span>
          <span>Farmacêutico RT: ${rtLinha()}</span>
        </div>
      </div>
    </div>
  `;
}
