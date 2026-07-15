/* ============================================================
   paginas/prescricoes.js — Hospital Reviva
   Lógica de renderização exclusiva desta página.
   Depende de assets/dados.js (dados + cálculo) já carregado.
   ============================================================ */

function renderPage(){
  return `
    <div class="panel">
      <div class="panel-head">
        <div><div class="panel-title">Mapa de prescrição diária</div><div class="panel-title-sub">Base médica que alimenta a montagem da dose unitária</div></div>
        <button class="btn sm">+ Nova prescrição</button>
      </div>
      <div class="panel-body">
        <table>
          <thead><tr><th>Paciente</th><th>Substância</th><th>Dose</th><th>Via</th><th>Horários</th></tr></thead>
          <tbody>
            ${prescriptions.map(pr=>`
              <tr>
                <td><b>${patById(pr.paciente).nome}</b> <span style="color:var(--muted)">· ${patById(pr.paciente).leito}</span></td>
                <td>${subById(pr.subId).nome}</td>
                <td>${pr.dose}</td>
                <td class="mono">${pr.via}</td>
                <td>${pr.horarios.map(h=>`<span class="tag" style="background:var(--primary-tint);color:var(--primary-dark)">${h}</span>`).join(' ')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
