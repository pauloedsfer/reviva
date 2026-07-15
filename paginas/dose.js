/* ============================================================
   paginas/dose.js — Hospital Reviva
   Lógica de renderização exclusiva desta página.
   Depende de assets/dados.js (dados + cálculo) já carregado.
   ============================================================ */

function renderPage(){
  const slots = ["08h","22h","SOS"];
  const cards = patients.map(p=>{
    const pres = prescriptions.filter(pr=>pr.paciente===p.id);
    if(!pres.length) return '';
    const slotsHtml = slots.map(slot=>{
      const items = pres.filter(pr=>pr.horarios.includes(slot));
      if(!items.length) return '';
      return `
        <div class="kit-slot">${slot}${slot==='SOS'?' — se necessário':''}</div>
        ${items.map(it=>`<div class="kit-item"><span>${subById(it.subId).nome}</span><span class="mono">${it.dose}</span></div>`).join('')}
      `;
    }).join('');
    return `
      <div class="kit-card">
        <div class="kit-head">
          <div><div class="kit-patient">${p.nome}</div><div class="kit-bed">${p.leito}</div></div>
        </div>
        ${slotsHtml}
        <div class="check-row">
          <div class="check-chip">☐ Preparo</div>
          <div class="check-chip">☐ Dupla checagem</div>
          <div class="check-chip">☐ Administrado</div>
        </div>
      </div>
    `;
  }).join('');

  // Etiquetas — uma por paciente/horário, para impressão e separação em saquinhos
  const labels = [];
  patients.forEach(p=>{
    const pres = prescriptions.filter(pr=>pr.paciente===p.id);
    slots.forEach(slot=>{
      const items = pres.filter(pr=>pr.horarios.includes(slot));
      if(!items.length) return;
      labels.push({ patient:p, slot, items });
    });
  });
  const labelSheet = `
    <div class="label-sheet">
      <div class="label-grid">
        ${labels.map(l=>`
          <div class="label-card">
            <div class="label-hospital">Hospital Reviva — Dose Unitária</div>
            <div class="label-patient">${l.patient.nome}</div>
            <div class="label-bed">${l.patient.leito}</div>
            <span class="label-time">${l.slot}</span>
            <div class="label-meds">${l.items.map(it=>`${subById(it.subId).nome} — ${it.dose}`).join('<br>')}</div>
            <div class="label-foot">Preparo: ____________ &nbsp; Checagem: ____________</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  const returnsHoje = returns.filter(r=>r.data===HOJE);

  return `
    <div class="note-box"><b>Fluxo do dia — ${fmtDate(HOJE)}.</b> Cada card é o kit de dose unitária de um paciente, gerado automaticamente a partir do mapa de prescrição. A dupla checagem (farmácia + enfermagem) fica registrada aqui antes da liberação. Os saquinhos identificados por horário são entregues à Enfermagem, responsável pela dupla checagem final e administração.</div>
    <div class="print-btn-row"><button class="btn" onclick="window.printLabels()">🖶 Imprimir etiquetas do dia</button></div>
    <div class="kit-grid">${cards}</div>

    <div class="panel" style="margin-top:22px">
      <div class="panel-head">
        <div><div class="panel-title">Devoluções ao estoque — hoje</div><div class="panel-title-sub">Medicação SOS não utilizada ou recusada, reintegrada ao lote de origem</div></div>
        <button class="btn sm">+ Registrar devolução</button>
      </div>
      <div class="panel-body">
        ${returnsHoje.length ? `
        <table>
          <thead><tr><th>Paciente</th><th>Substância</th><th>Lote</th><th>Qtd.</th><th>Motivo</th></tr></thead>
          <tbody>
            ${returnsHoje.map(r=>`
              <tr>
                <td><b>${patById(r.paciente).nome}</b></td>
                <td>${subById(r.subId).nome}</td>
                <td><span class="folio">${r.lote}</span></td>
                <td class="num mono">+${r.qtd}</td>
                <td style="color:var(--muted)">${r.motivo}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>` : `<div style="color:var(--muted);font-size:13px;padding:8px 0">Nenhuma devolução registrada hoje.</div>`}
      </div>
    </div>

    ${labelSheet}
  `;
}
window.printLabels = function(){
  document.body.classList.add('printing-labels');
  window.print();
  setTimeout(()=> document.body.classList.remove('printing-labels'), 300);
};
