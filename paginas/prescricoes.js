/* ============================================================
   paginas/prescricoes.js — Hospital Reviva
   Mapa de prescrição: nova/editar prescrição, com data e médico.
   ============================================================ */

function _formPrescricao(pr) {
  pr = pr || {};
  const horarios = (pr.horarios || []).join(", ");
  return `
    <div class="ff row2">
      <div><label>Paciente *</label><select id="rPac">${_optPats(pr.paciente)}</select></div>
      <div><label>Data da prescrição *</label><input id="rData" type="date" value="${pr.dataInicio || new Date().toISOString().slice(0,10)}"></div>
    </div>
    <div class="ff"><label>Substância *</label><select id="rSub">${_optSubs(pr.subId)}</select></div>
    <div class="ff"><label>Médico prescritor</label>
      <select id="rPresc" onchange="_toggleBloco('rPresc','blocoNovoPresc')">${_optPresc(pr.prescritorId)}</select>
    </div>
    ${_blocoNovoPrescritor()}
    <div class="ff row3">
      <div><label>Dose</label><input id="rDose" value="${(pr.dose || "1 comp.").replace(/"/g, "&quot;")}"></div>
      <div><label>Via</label><input id="rVia" value="${pr.via || "VO"}"></div>
      <div><label>Horários</label><input id="rHor" value="${horarios}" placeholder="08h, 22h ou SOS"></div>
    </div>
    <div class="note-box" style="margin:6px 0 0">Separe os horários por vírgula. Use <b>SOS</b> para se necessário.</div>
  `;
}

function abrirFormPrescricao(id) {
  const pr = id ? prescriptions.find((x) => x.id === id) : null;
  abrirModal(id ? "Editar prescrição" : "Nova prescrição", _formPrescricao(pr), async () => {
    const pac = fv("rPac"); const sub = fv("rSub"); const data = fv("rData");
    if (!pac) throw new Error("Selecione o paciente.");
    if (!sub) throw new Error("Selecione a substância.");
    if (!data) throw new Error("Informe a data da prescrição.");
    const prescritorId = await resolvePrescritor("rPresc");
    const horarios = fv("rHor").split(",").map((h) => h.trim()).filter(Boolean);
    const dados = {
      paciente_id: pac, substancia_id: sub, prescritor_id: prescritorId,
      dose: fvOrNull("rDose"), via: fvOrNull("rVia"), horarios: horarios,
      data_inicio: data, ativo: true,
    };
    if (id) {
      const { error } = await window.SB.from("prescricoes").update(dados).eq("id", id);
      if (error) throw error;
    } else {
      const { error } = await window.SB.from("prescricoes").insert({ ...dados, ...usuarioId() });
      if (error) throw error;
    }
  }, id ? "Salvar alterações" : "Cadastrar prescrição");
}

function renderPage() {
  return `
    <div class="panel">
      <div class="panel-head">
        <div><div class="panel-title">Mapa de prescrição diária</div><div class="panel-title-sub">Base médica que alimenta a montagem da dose unitária</div></div>
        <button class="btn sm" onclick="abrirFormPrescricao()">+ Nova prescrição</button>
      </div>
      <div class="panel-body">
        <table>
          <thead><tr><th>Paciente</th><th>Substância</th><th>Dose</th><th>Via</th><th>Horários</th><th>Prescritor</th><th>Data</th><th></th></tr></thead>
          <tbody>
            ${prescriptions.map(pr=>`
              <tr>
                <td><b>${patById(pr.paciente).nome}</b> <span style="color:var(--muted)">· ${patById(pr.paciente).leito}</span></td>
                <td>${subById(pr.subId).nome}</td>
                <td>${pr.dose || "—"}</td>
                <td class="mono">${pr.via || "—"}</td>
                <td>${pr.horarios.map(h=>`<span class="tag" style="background:var(--primary-tint);color:var(--primary-dark)">${h}</span>`).join(' ')}</td>
                <td style="color:var(--muted)">${pr.prescritorId ? prescNome(pr.prescritorId) : "—"}</td>
                <td class="mono">${pr.dataInicio ? fmtDate(pr.dataInicio) : "—"}</td>
                <td><button class="btn ghost sm" onclick="abrirFormPrescricao('${pr.id}')">Editar</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
