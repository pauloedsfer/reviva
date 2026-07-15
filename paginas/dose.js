/* ============================================================
   paginas/dose.js — Hospital Reviva
   Kits de dose por paciente/horário, impressão de etiquetas
   (uma por horário de cada paciente) e registro de devolução.
   ============================================================ */

// Horários reais em uso, ordenados (SOS por último).
function _slots() {
  const set = new Set();
  prescriptions.forEach((pr) => pr.horarios.forEach((h) => set.add(h)));
  const arr = Array.from(set);
  arr.sort((a, b) => (a === "SOS" ? 1 : b === "SOS" ? -1 : a.localeCompare(b)));
  return arr;
}

// Uma etiqueta por (paciente, horário) com todos os medicamentos daquele horário.
function _gerarEtiquetas() {
  const slots = _slots();
  const labels = [];
  patients.forEach((p) => {
    const pres = prescriptions.filter((pr) => pr.paciente === p.id);
    slots.forEach((slot) => {
      const items = pres.filter((pr) => pr.horarios.includes(slot));
      if (items.length) labels.push({ patient: p, slot, items });
    });
  });
  return labels;
}

window.printLabels = function () {
  const est = window.ESTAB || {};
  const hosp = est.nome_fantasia || est.razao_social || "Hospital Reviva";
  const hoje = new Date().toLocaleDateString("pt-BR");
  const labels = _gerarEtiquetas();
  if (!labels.length) { alert("Não há prescrições ativas para gerar etiquetas."); return; }
  const cards = labels.map((l) => `
    <div class="lbl">
      <div class="lbl-h">${hosp} — Dose Unitária · ${hoje}</div>
      <div class="lbl-p">${l.patient.nome}</div>
      <div class="lbl-b">${l.patient.leito || ""}</div>
      <div class="lbl-t">${l.slot}${l.slot === "SOS" ? " — se necessário" : ""}</div>
      <div class="lbl-m">${l.items.map((it) => `${subById(it.subId).nome} — ${it.dose || ""}`).join("<br>")}</div>
      <div class="lbl-f">Preparo: __________ &nbsp; Checagem: __________</div>
    </div>`).join("");
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Etiquetas — Dose Unitária</title>
    <style>
      @page { size:A4; margin:10mm; }
      *{ box-sizing:border-box; } body{ font-family:"Public Sans",Arial,sans-serif; margin:0; }
      .grid{ display:grid; grid-template-columns:repeat(3,1fr); gap:6mm; }
      .lbl{ border:1px solid #333; border-radius:6px; padding:8px 10px; height:46mm; display:flex; flex-direction:column;
            page-break-inside:avoid; }
      .lbl-h{ font-size:8.5px; color:#555; border-bottom:1px solid #ccc; padding-bottom:3px; }
      .lbl-p{ font-weight:700; font-size:13px; margin-top:5px; }
      .lbl-b{ font-size:11px; color:#333; }
      .lbl-t{ display:inline-block; align-self:flex-start; background:#1E2A28; color:#fff; font-size:11px;
              padding:2px 8px; border-radius:10px; margin:5px 0; font-weight:600; }
      .lbl-m{ font-size:11px; line-height:1.35; flex:1; }
      .lbl-f{ font-size:8.5px; color:#555; border-top:1px dashed #ccc; padding-top:4px; }
      .toolbar{ position:fixed; top:12px; right:12px; }
      .toolbar button{ background:#2C5F5A; color:#fff; border:none; padding:9px 15px; border-radius:8px; cursor:pointer; font:inherit; }
      @media print{ .toolbar{ display:none; } }
    </style></head><body>
    <div class="toolbar"><button onclick="window.print()">Imprimir / Salvar PDF</button></div>
    <div class="grid">${cards}</div></body></html>`;
  const win = window.open("", "_blank");
  if (!win) { alert("Permita pop-ups para imprimir as etiquetas."); return; }
  win.document.open(); win.document.write(html); win.document.close();
};

/* ---------------- devolução ---------------- */
function _opcoesLoteDevolucao(subId) {
  const lotes = lotesComSaldo(subId);
  return lotes.map((l) => `<option value="${l}">${l} (saldo ${saldoLote(l)})</option>`).join("")
    || `<option value="">— sem lotes —</option>`;
}
function atualizaLotesDevolucao() {
  const sub = fv("dvSub");
  document.getElementById("dvLote").innerHTML = _opcoesLoteDevolucao(sub);
}
function abrirFormDevolucao() {
  const primeiraSub = substances[0] ? substances[0].id : "";
  const corpo = `
    <div class="ff row2">
      <div><label>Data *</label><input id="dvData" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
      <div><label>Paciente</label><select id="dvPac">${_optPats()}</select></div>
    </div>
    <div class="ff row2">
      <div><label>Substância *</label><select id="dvSub" onchange="atualizaLotesDevolucao()">${_optSubs(primeiraSub)}</select></div>
      <div><label>Lote *</label><select id="dvLote">${_opcoesLoteDevolucao(primeiraSub)}</select></div>
    </div>
    <div class="ff row2">
      <div><label>Quantidade *</label><input id="dvQtd" type="number" min="1" value="1"></div>
      <div><label>Motivo</label><input id="dvMotivo" placeholder="SOS não administrado…"></div>
    </div>
  `;
  abrirModal("Registrar devolução ao estoque", corpo, async () => {
    const data = fv("dvData"); const sub = fv("dvSub"); const lote = fv("dvLote"); const qtd = fvNum("dvQtd");
    if (!data) throw new Error("Informe a data.");
    if (!sub) throw new Error("Selecione a substância.");
    if (!lote) throw new Error("Selecione o lote de origem.");
    if (!qtd || qtd < 1) throw new Error("Informe a quantidade.");
    const { error } = await window.SB.from("devolucoes").insert({
      data, substancia_id: sub, numero_lote: lote, quantidade: qtd,
      motivo: fvOrNull("dvMotivo"), paciente_id: fvOrNull("dvPac"), ...usuarioId(),
    });
    if (error) throw error;
  }, "Registrar devolução");
}

function renderPage(){
  const slots = _slots();
  const cards = patients.map(p=>{
    const pres = prescriptions.filter(pr=>pr.paciente===p.id);
    if(!pres.length) return '';
    const slotsHtml = slots.map(slot=>{
      const items = pres.filter(pr=>pr.horarios.includes(slot));
      if(!items.length) return '';
      return `
        <div class="kit-slot">${slot}${slot==='SOS'?' — se necessário':''}</div>
        ${items.map(it=>`<div class="kit-item"><span>${subById(it.subId).nome}</span><span class="mono">${it.dose||''}</span></div>`).join('')}
      `;
    }).join('');
    return `
      <div class="kit-card">
        <div class="kit-head"><div><div class="kit-patient">${p.nome}</div><div class="kit-bed">${p.leito||''}</div></div></div>
        ${slotsHtml}
        <div class="check-row">
          <div class="check-chip">☐ Preparo</div>
          <div class="check-chip">☐ Dupla checagem</div>
          <div class="check-chip">☐ Administrado</div>
        </div>
      </div>
    `;
  }).join('');

  const returnsHoje = returns.filter(r=>r.data===HOJE);

  return `
    <div class="note-box"><b>Fluxo do dia — ${fmtDate(HOJE)}.</b> Cada card é o kit de dose unitária de um paciente, gerado a partir do mapa de prescrição. Os saquinhos identificados por horário vão à Enfermagem para dupla checagem e administração.</div>
    <div class="print-btn-row"><button class="btn" onclick="window.printLabels()">🖶 Imprimir etiquetas do dia</button></div>
    <div class="kit-grid">${cards || '<div class="note-box">Nenhuma prescrição ativa — cadastre em <b>Prescrições ativas</b>.</div>'}</div>

    <div class="panel" style="margin-top:22px">
      <div class="panel-head">
        <div><div class="panel-title">Devoluções ao estoque — hoje</div><div class="panel-title-sub">Medicação SOS não utilizada ou recusada, reintegrada ao lote de origem</div></div>
        <button class="btn sm" onclick="abrirFormDevolucao()">+ Registrar devolução</button>
      </div>
      <div class="panel-body">
        ${returnsHoje.length ? `
        <table>
          <thead><tr><th>Paciente</th><th>Substância</th><th>Lote</th><th>Qtd.</th><th>Motivo</th></tr></thead>
          <tbody>
            ${returnsHoje.map(r=>`
              <tr>
                <td><b>${r.paciente?patById(r.paciente).nome:'—'}</b></td>
                <td>${subById(r.subId).nome}</td>
                <td><span class="folio">${r.lote}</span></td>
                <td class="num mono">+${r.qtd}</td>
                <td style="color:var(--muted)">${r.motivo||''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>` : `<div style="color:var(--muted);font-size:13px;padding:8px 0">Nenhuma devolução registrada hoje.</div>`}
      </div>
    </div>
  `;
}
