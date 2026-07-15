/* ============================================================
   paginas/medicacaopropria.js — Hospital Reviva
   Lógica de renderização exclusiva desta página.
   Depende de assets/dados.js (dados + cálculo) já carregado.
   ============================================================ */

function renderPage(){
  return `
    <div class="note-box"><b>Custódia, não é doação.</b> Medicação trazida pelo paciente ou pela família na admissão continua sendo propriedade dele — o hospital apenas guarda e administra. Não gera custo ao hospital, não entra no estoque geral disponível para outros pacientes, e deve ser devolvida (se sobrar) na alta.</div>
    <div class="panel">
      <div class="panel-head">
        <div><div class="panel-title">Medicações em custódia</div><div class="panel-title-sub">${patientMeds.reduce((a,pm)=>a+pm.itens.length,0)} item(ns) registrado(s)</div></div>
        <button class="btn sm">+ Registrar medicação do paciente</button>
      </div>
      <div class="panel-body">
        <table>
          <thead><tr><th>Paciente</th><th>Substância</th><th>Lote</th><th>Validade</th><th>Recebido</th><th>Saldo em custódia</th><th>Origem</th></tr></thead>
          <tbody>
            ${patientMeds.flatMap(pm => pm.itens.map(it=>{
              const bal = saldoLote(it.lote);
              return `<tr>
                <td><b>${patById(pm.paciente).nome}</b> <span style="color:var(--muted)">· ${patById(pm.paciente).leito}</span></td>
                <td>${subById(it.subId).nome}</td>
                <td><span class="folio">${it.lote}</span></td>
                <td class="mono">${fmtDate(it.validade)}</td>
                <td class="num mono">${it.qtd}</td>
                <td class="num mono"><b>${bal}</b></td>
                <td><span class="tag tag-proprio">PRÓPRIA DO PACIENTE</span></td>
              </tr>`;
            })).join('')}
          </tbody>
        </table>
        <div class="foot-signoff">
          <span>${patientMeds.map(pm=>pm.itens.map(it=>it.obs).join('; ')).join('; ')}</span>
          <span>Restrita ao paciente — não disponível para dispensação a terceiros</span>
        </div>
      </div>
    </div>
  `;
}
