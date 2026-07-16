/* ============================================================
   paginas/financeiro.js — Hospital Reviva
   Custos & Indicadores — foco EXCLUSIVO na farmácia:
   medicamentos dispensados, valor em estoque e economia com
   doações. Não inclui diária de internação, salários ou sistema.
   ============================================================ */

function renderPage(){
  const custoTotalMedicamentos = movements.filter(m=>m.tipo==='saida').reduce((a,m)=>a+m.qtd*(m.custoUnit||0),0);
  const valorEstoque = substances.reduce((a,s)=> a + saldo(s.id)*custoMedio(s.id), 0);
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

  // custo por substância (medicamentos dispensados)
  const porSub = {};
  movements.filter(m=>m.tipo==='saida').forEach(m=>{ porSub[m.subId] = (porSub[m.subId]||0) + m.qtd*(m.custoUnit||0); });
  const dataSub = Object.entries(porSub)
    .map(([subId,value])=>({ label: subById(subId).nome.split(' ').slice(0,2).join(' '), value: +value.toFixed(2) }))
    .sort((a,b)=>b.value-a.value);

  const temCusto = custoTotalMedicamentos>0 || valorEstoque>0;

  return `
    <div class="grid cards">
      <div class="card"><div class="card-label">Custo com medicamentos dispensados</div><div class="card-value">${fmtBRL(custoTotalMedicamentos)}</div><div class="card-note">saídas do período, a custo de aquisição</div></div>
      <div class="card"><div class="card-label">Valor atual em estoque</div><div class="card-value">${fmtBRL(valorEstoque)}</div><div class="card-note">saldo × custo médio ponderado</div></div>
      <div class="card"><div class="card-label">Economia com doações</div><div class="card-value" style="color:var(--accent)">${fmtBRL(economiaDoacoes)}</div><div class="card-note">valor de mercado não desembolsado</div></div>
    </div>

    ${!temCusto ? `<div class="note-box">Sem custo de farmácia no momento — não há estoque adquirido por compra. Medicação em custódia do paciente não gera custo ao hospital, então os valores aqui ficam zerados até você lançar Notas Fiscais de compra.</div>` : ''}

    <div class="panel">
      <div class="panel-head">
        <div><div class="panel-title">Custo diário com medicamentos</div><div class="panel-title-sub">Soma das dispensações por dia, a custo de aquisição</div></div>
      </div>
      <div class="panel-body">
        ${dataDiaria.length ? svgBarChart(dataDiaria, { valueFmt: v => 'R$'+v.toFixed(0) }) : '<div style="color:var(--muted);font-size:13px;padding:8px 0">Sem dispensações com custo registradas.</div>'}
      </div>
    </div>

    <div class="panel">
      <div class="panel-head">
        <div><div class="panel-title">Custo por substância</div><div class="panel-title-sub">Onde o orçamento de medicamentos está concentrado</div></div>
      </div>
      <div class="panel-body">
        ${dataSub.length ? svgHBarChart(dataSub, { valueFmt: fmtBRL, color: CHART_COLORS.accent }) : '<div style="color:var(--muted);font-size:13px;padding:8px 0">Sem custo por substância ainda.</div>'}
      </div>
    </div>

    <div class="panel">
      <div class="panel-head">
        <div><div class="panel-title">Custo de medicamentos por paciente</div><div class="panel-title-sub">Apenas medicamentos efetivamente dispensados (sem diária de internação)</div></div>
      </div>
      <div class="panel-body">
        <table>
          <thead><tr><th>Paciente</th><th>Dias internado</th><th>Custo medicamentos</th><th>Custo médio/dia</th></tr></thead>
          <tbody>
            ${patients.map(p=>{
              const dias = diasInternado(p);
              const cm = custoMedicamentosPaciente(p.id);
              return `<tr>
                <td><b>${p.nome}</b> <span style="color:var(--muted)">· ${p.leito}</span></td>
                <td class="num mono">${dias}</td>
                <td class="num mono"><b>${fmtBRL(cm)}</b></td>
                <td class="num mono">${fmtBRL(dias?cm/dias:0)}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
        <div class="foot-signoff">
          <span>Custo restrito à farmácia — não inclui diária de internação, salários ou sistema</span>
          <span>Farmacêutico RT: ${rtLinha()}</span>
        </div>
      </div>
    </div>
  `;
}
