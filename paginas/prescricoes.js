/* ============================================================
   paginas/prescricoes.js — Hospital Reviva
   Nova prescrição com VÁRIAS substâncias (cabeçalho + linhas),
   cada substância vira uma linha do mapa. Edição individual por linha.
   ============================================================ */

/* -------- linhas de medicamento (para a nova prescrição múltipla) -------- */
function addMedRow() {
  const cont = document.getElementById("prMeds");
  const row = document.createElement("div");
  row.className = "item-row";
  row.style.gridTemplateColumns = "1.6fr .9fr .6fr 1fr .5fr";
  row.innerHTML = `
    <div><select class="m-sub">${_optSubs()}</select></div>
    <div><input type="text" class="m-dose" value="1 comp." placeholder="Dose"></div>
    <div><input type="text" class="m-via" value="VO" placeholder="Via"></div>
    <div><input type="text" class="m-hor" placeholder="08h, 22h"></div>
    <button type="button" class="item-del" onclick="this.parentElement.remove()">✕</button>`;
  cont.appendChild(row);
}
function coletarMeds() {
  const rows = Array.from(document.querySelectorAll("#prMeds .item-row"));
  const meds = rows.map((r) => ({
    sub: r.querySelector(".m-sub").value,
    dose: r.querySelector(".m-dose").value.trim(),
    via: r.querySelector(".m-via").value.trim(),
    horarios: r.querySelector(".m-hor").value.split(",").map((h) => h.trim()).filter(Boolean),
  })).filter((m) => m.sub && m.horarios.length);
  if (!meds.length) throw new Error("Adicione ao menos uma substância com horário(s).");
  return meds;
}

/* -------- nova prescrição (múltiplas substâncias) -------- */
function abrirFormPrescricao() {
  const corpo = `
    <div class="ff row2">
      <div><label>Paciente *</label><select id="rPac">${_optPats()}</select></div>
      <div><label>Data da prescrição *</label><input id="rData" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
    </div>
    <div class="ff"><label>Médico prescritor</label>
      <select id="rPresc" onchange="_toggleBloco('rPresc','blocoNovoPresc')">${_optPresc()}</select>
    </div>
    ${_blocoNovoPrescritor()}
    <div class="item-head">Medicamentos da prescrição</div>
    <div id="prMeds"></div>
    <button type="button" class="btn ghost sm add-item" onclick="addMedRow()">+ Adicionar substância</button>
    <div class="note-box" style="margin:8px 0 0">Horários separados por vírgula (ex.: <b>08h, 22h</b>) ou <b>SOS</b>.</div>
  `;
  abrirModal("Nova prescrição", corpo, async () => {
    const pac = fv("rPac"); const data = fv("rData");
    if (!pac) throw new Error("Selecione o paciente.");
    if (!data) throw new Error("Informe a data da prescrição.");
    const prescritorId = await resolvePrescritor("rPresc");
    const meds = coletarMeds();
    const rows = meds.map((m) => ({
      paciente_id: pac, substancia_id: m.sub, prescritor_id: prescritorId,
      dose: m.dose || null, via: m.via || null, horarios: m.horarios,
      data_inicio: data, ativo: true, ...usuarioId(),
    }));
    const { error } = await window.SB.from("prescricoes").insert(rows);
    if (error) throw error;
  }, "Cadastrar prescrição");
  addMedRow();
}

/* -------- edição individual de uma linha -------- */
function abrirEditarPrescricao(id) {
  const pr = prescriptions.find((x) => x.id === id); if (!pr) return;
  const corpo = `
    <div class="ff row2">
      <div><label>Paciente *</label><select id="ePac">${_optPats(pr.paciente)}</select></div>
      <div><label>Data da prescrição *</label><input id="eData" type="date" value="${pr.dataInicio || new Date().toISOString().slice(0,10)}"></div>
    </div>
    <div class="ff"><label>Substância *</label><select id="eSub">${_optSubs(pr.subId)}</select></div>
    <div class="ff"><label>Médico prescritor</label>
      <select id="ePresc" onchange="_toggleBloco('ePresc','blocoNovoPresc')">${_optPresc(pr.prescritorId)}</select>
    </div>
    ${_blocoNovoPrescritor()}
    <div class="ff row3">
      <div><label>Dose</label><input id="eDose" value="${(pr.dose || "").replace(/"/g, "&quot;")}"></div>
      <div><label>Via</label><input id="eVia" value="${pr.via || "VO"}"></div>
      <div><label>Horários</label><input id="eHor" value="${(pr.horarios || []).join(", ")}"></div>
    </div>
  `;
  abrirModal("Editar prescrição", corpo, async () => {
    const pac = fv("ePac"); const sub = fv("eSub"); const data = fv("eData");
    if (!pac || !sub || !data) throw new Error("Paciente, substância e data são obrigatórios.");
    // no form de edição, o select de prescritor tem id ePresc; resolvePrescritor lê os campos np*
    let prescritorId = fv("ePresc");
    if (prescritorId === "__novo__") prescritorId = await resolvePrescritor("ePresc");
    const dados = {
      paciente_id: pac, substancia_id: sub, prescritor_id: prescritorId || null,
      dose: fvOrNull("eDose"), via: fvOrNull("eVia"),
      horarios: fv("eHor").split(",").map((h) => h.trim()).filter(Boolean),
      data_inicio: data,
    };
    const { error } = await window.SB.from("prescricoes").update(dados).eq("id", id);
    if (error) throw error;
  }, "Salvar alterações");
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
                <td style="color:var(--muted)">${pr.prescritorId ? prescNome(pr.prescritorId) + ((prescById(pr.prescritorId)||{}).externo ? ' <span class="tag" style="background:var(--accent-tint);color:var(--accent)">EXTERNO</span>' : '') : "—"}</td>
                <td class="mono">${pr.dataInicio ? fmtDate(pr.dataInicio) : "—"}</td>
                <td><button class="btn ghost sm" onclick="abrirEditarPrescricao('${pr.id}')">Editar</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
