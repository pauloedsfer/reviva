/* ============================================================
   paginas/prescricoes.js — Hospital Reviva
   Prescrições AGRUPADAS POR PACIENTE. A lista mostra um cartão por
   paciente; ao abrir, vê-se a prescrição completa dele e edita-se
   cada item ali mesmo. Filtro por paciente no topo.
   Campo "Qtd. por horário" (padrão 1) permite mais de um comprimido
   por dose — usado direto na dispensação e no mapa.
   ============================================================ */

let _prescPac = "";  // paciente selecionado (filtro / detalhe). "" = lista geral.
function filtrarPrescPaciente(id) { _prescPac = id; document.getElementById("viewport").innerHTML = renderPage(); }

/* -------- linhas de medicamento (nova prescrição múltipla) -------- */
function addMedRow() {
  const cont = document.getElementById("prMeds");
  const row = document.createElement("div");
  row.className = "item-row";
  row.style.gridTemplateColumns = "1.5fr .8fr .5fr .5fr .9fr .4fr";
  row.innerHTML = `
    <div><select class="m-sub">${_optSubs()}</select></div>
    <div><input type="text" class="m-dose" value="1 comp." placeholder="Dose"></div>
    <div><input type="number" class="m-qtd" min="1" step="1" value="1" title="Qtd. por horário"></div>
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
    qtd: Math.max(1, parseInt(r.querySelector(".m-qtd").value, 10) || 1),
    via: r.querySelector(".m-via").value.trim(),
    horarios: r.querySelector(".m-hor").value.split(",").map((h) => h.trim()).filter(Boolean),
  })).filter((m) => m.sub && m.horarios.length);
  if (!meds.length) throw new Error("Adicione ao menos uma substância com horário(s).");
  return meds;
}

/* -------- nova prescrição (múltiplas substâncias) -------- */
function abrirFormPrescricao(pacientePre) {
  const corpo = `
    <div class="ff row2">
      <div><label>Paciente *</label><select id="rPac">${_optPats(pacientePre || "")}</select></div>
      <div><label>Data da prescrição *</label><input id="rData" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
    </div>
    <div class="ff"><label>Médico prescritor</label>
      <select id="rPresc" onchange="_toggleBloco('rPresc','blocoNovoPresc')">${_optPresc()}</select>
    </div>
    ${_blocoNovoPrescritor()}
    <div class="item-head">Medicamentos da prescrição</div>
    <div class="item-row" style="grid-template-columns:1.5fr .8fr .5fr .5fr .9fr .4fr;font-size:11px;color:var(--muted);font-weight:600">
      <div>Substância</div><div>Dose</div><div>Qtd/hor.</div><div>Via</div><div>Horários</div><div></div>
    </div>
    <div id="prMeds"></div>
    <button type="button" class="btn ghost sm add-item" onclick="addMedRow()">+ Adicionar substância</button>
    <div class="note-box" style="margin:8px 0 0">Horários separados por vírgula (ex.: <b>08h, 22h</b>) ou <b>SOS</b>. <b>Qtd/hor.</b> = quantos comprimidos por horário (ex.: 2).</div>
  `;
  abrirModal("Nova prescrição", corpo, async () => {
    const pac = fv("rPac"); const data = fv("rData");
    if (!pac) throw new Error("Selecione o paciente.");
    if (!data) throw new Error("Informe a data da prescrição.");
    const prescritorId = await resolvePrescritor("rPresc");
    const meds = coletarMeds();
    const rows = meds.map((m) => ({
      paciente_id: pac, substancia_id: m.sub, prescritor_id: prescritorId,
      dose: m.dose || null, via: m.via || null, horarios: m.horarios, qtd_por_horario: m.qtd,
      data_inicio: data, ativo: true, ...usuarioId(),
    }));
    const { error } = await window.SB.from("prescricoes").insert(rows);
    if (error) throw error;
    _prescPac = pac; // ao criar, já abre o paciente
  }, "Cadastrar prescrição");
  addMedRow();
}

/* -------- edição individual de um item -------- */
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
    <div class="ff row2">
      <div><label>Dose (texto)</label><input id="eDose" value="${(pr.dose || "").replace(/"/g, "&quot;")}"></div>
      <div><label>Qtd. por horário *</label><input id="eQtd" type="number" min="1" step="1" value="${pr.qtdPorHorario || 1}"></div>
    </div>
    <div class="ff row2">
      <div><label>Via</label><input id="eVia" value="${pr.via || "VO"}"></div>
      <div><label>Horários</label><input id="eHor" value="${(pr.horarios || []).join(", ")}"></div>
    </div>
  `;
  abrirModal("Editar prescrição", corpo, async () => {
    const pac = fv("ePac"); const sub = fv("eSub"); const data = fv("eData");
    if (!pac || !sub || !data) throw new Error("Paciente, substância e data são obrigatórios.");
    let prescritorId = fv("ePresc");
    if (prescritorId === "__novo__") prescritorId = await resolvePrescritor("ePresc");
    const dados = {
      paciente_id: pac, substancia_id: sub, prescritor_id: prescritorId || null,
      dose: fvOrNull("eDose"), via: fvOrNull("eVia"),
      horarios: fv("eHor").split(",").map((h) => h.trim()).filter(Boolean),
      qtd_por_horario: Math.max(1, fvNum("eQtd") || 1),
      data_inicio: data,
    };
    const { error } = await window.SB.from("prescricoes").update(dados).eq("id", id);
    if (error) throw error;
  }, "Salvar alterações");
}

async function suspenderItem(id) {
  const pr = prescriptions.find((x) => x.id === id); if (!pr) return;
  if (!confirm(`Suspender ${subById(pr.subId).nome} de ${patById(pr.paciente).nome}?\n\nDeixa de aparecer no mapa e na dispensação. O histórico é mantido.`)) return;
  const { error } = await window.SB.from("prescricoes").update({ ativo: false }).eq("id", id);
  if (error) { alert("Erro: " + error.message); return; }
  await recarregarTela();
}

/* -------- render: lista por paciente OU detalhe de um paciente -------- */
function _itensDoPaciente(pacId) {
  return prescriptions.filter((pr) => pr.paciente === pacId)
    .sort((a, b) => subById(a.subId).nome.localeCompare(subById(b.subId).nome));
}
function _prescResumo(pacId) {
  const its = _itensDoPaciente(pacId);
  return its.map((pr) => subById(pr.subId).nome).join(", ");
}

function _cardsPorPaciente() {
  // pacientes com ao menos uma prescrição, ordenados por leito
  const ids = [...new Set(prescriptions.map((p) => p.paciente))];
  const pacs = ids.map((id) => patById(id))
    .sort((a, b) => String(a.leito || "").localeCompare(String(b.leito || "")) || (a.nome || "").localeCompare(b.nome || ""));
  if (!pacs.length) return `<div style="color:var(--muted);font-size:13px;padding:8px 0">Nenhuma prescrição cadastrada. Use <b>+ Nova prescrição</b>.</div>`;
  return `<table>
    <thead><tr><th>Paciente</th><th>Leito</th><th>Medicações</th><th>Itens</th><th></th></tr></thead>
    <tbody>
      ${pacs.map((p) => {
        const its = _itensDoPaciente(p.id);
        const resumo = its.slice(0, 4).map((pr) => subById(pr.subId).nome).join(", ") + (its.length > 4 ? ` +${its.length - 4}` : "");
        return `<tr>
          <td><b>${p.nome}</b></td>
          <td class="mono">${p.leito || "—"}</td>
          <td style="color:var(--muted)">${resumo}</td>
          <td class="num mono">${its.length}</td>
          <td style="text-align:right"><button class="btn ghost sm" onclick="filtrarPrescPaciente('${p.id}')">Abrir prescrição</button></td>
        </tr>`;
      }).join("")}
    </tbody>
  </table>`;
}

function _detalhePaciente(pacId) {
  const p = patById(pacId);
  const its = _itensDoPaciente(pacId);
  const linhas = its.map((pr) => {
    const nq = pr.qtdPorHorario || 1;
    const ext = pr.prescritorId && (prescById(pr.prescritorId) || {}).externo
      ? ' <span class="tag" style="background:var(--accent-tint);color:var(--accent)">EXTERNO</span>' : "";
    return `<tr>
      <td><b>${subById(pr.subId).nome}</b></td>
      <td>${pr.dose || "—"}${nq > 1 ? ` <span class="tag" style="background:var(--primary-tint);color:var(--primary-dark)">${nq}×/horário</span>` : ""}</td>
      <td class="mono">${pr.via || "—"}</td>
      <td>${(pr.horarios || []).map((h) => `<span class="tag" style="background:var(--primary-tint);color:var(--primary-dark)">${h}</span>`).join(" ")}</td>
      <td style="color:var(--muted)">${pr.prescritorId ? prescNome(pr.prescritorId) + ext : "—"}</td>
      <td class="mono">${pr.dataInicio ? fmtDate(pr.dataInicio) : "—"}</td>
      <td style="text-align:right;white-space:nowrap">
        <button class="btn ghost sm" onclick="abrirEditarPrescricao('${pr.id}')">Editar</button>
        <button class="btn ghost sm" onclick="suspenderItem('${pr.id}')">Suspender</button>
      </td>
    </tr>`;
  }).join("");
  return `
    <div class="toolbar" style="margin-bottom:14px">
      <button class="btn ghost sm" onclick="filtrarPrescPaciente('')">← Todos os pacientes</button>
    </div>
    <div class="panel">
      <div class="panel-head">
        <div><div class="panel-title">${p.nome}</div><div class="panel-title-sub">Leito ${p.leito || "—"} · ${its.length} medicação(ões) na prescrição</div></div>
        <div class="toolbar">
          <button class="btn ghost sm" onclick="imprimirReceituario('${pacId}','C')">🖶 Receituário C</button>
          <button class="btn ghost sm" onclick="imprimirReceituario('${pacId}','comum')">🖶 Receituário comum</button>
          <button class="btn sm" onclick="abrirFormPrescricao('${pacId}')">+ Adicionar medicação</button>
        </div>
      </div>
      <div class="panel-body">
        ${its.length ? `<table>
          <thead><tr><th>Substância</th><th>Dose</th><th>Via</th><th>Horários</th><th>Prescritor</th><th>Data</th><th></th></tr></thead>
          <tbody>${linhas}</tbody>
        </table>` : `<div style="color:var(--muted);font-size:13px;padding:8px 0">Sem medicações. Use <b>+ Adicionar medicação</b>.</div>`}
      </div>
    </div>`;
}

function renderPage() {
  if (_prescPac && prescriptions.some((pr) => pr.paciente === _prescPac)) return _detalhePaciente(_prescPac);
  const optPacs = `<option value="">Ver todos os pacientes</option>` +
    [...new Set(prescriptions.map((p) => p.paciente))]
      .map((id) => patById(id))
      .sort((a, b) => (a.nome || "").localeCompare(b.nome || ""))
      .map((p) => `<option value="${p.id}">${p.nome}${p.leito ? " · " + p.leito : ""}</option>`).join("");
  return `
    <div class="panel">
      <div class="panel-head">
        <div><div class="panel-title">Prescrições por paciente</div><div class="panel-title-sub">Abra um paciente para ver e editar a prescrição completa dele</div></div>
        <div class="toolbar">
          <select onchange="filtrarPrescPaciente(this.value)" style="padding:8px 10px;border:1px solid var(--line);border-radius:8px;font:inherit">${optPacs}</select>
          <button class="btn sm" onclick="abrirFormPrescricao()">+ Nova prescrição</button>
        </div>
      </div>
      <div class="panel-body">${_cardsPorPaciente()}</div>
    </div>
  `;
}

/* ============================================================
   Receituários imprimíveis (a partir da prescrição do paciente)
   - tipo "C": Receita de Controle Especial, branca, 2 vias
     (lista C1 e adendos — pré-preenche itens com lista iniciada em "C").
   - tipo "comum": Receituário comum (itens não controlados / sem lista).
   Pré-preenche emitente (estabelecimento), prescritor e paciente; o médico
   confere, ajusta quantidades e assina.
   ============================================================ */
function _medControlada(pr) { const s = subById(pr.subId); return s && (s.lista || "").toUpperCase().startsWith("C"); }
// qualquer controle especial (B/A/C) — itens assim NÃO entram no receituário comum
function _medControladaQualquer(pr) { const s = subById(pr.subId); const l = (s && s.lista ? s.lista : "").trim(); return l !== "" && l !== "—"; }
function _medDescricao(pr) {
  const s = subById(pr.subId) || {};
  const partes = [s.nome];
  if (s.concentracao) partes.push(s.concentracao);
  if (s.forma) partes.push(s.forma);
  let linha = partes.filter(Boolean).join(" ");
  const pos = [];
  if (pr.dose) pos.push(pr.dose);
  if ((pr.qtdPorHorario || 1) > 1) pos.push(`${pr.qtdPorHorario}× por horário`);
  if (pr.via) pos.push(pr.via);
  if ((pr.horarios || []).length) pos.push((pr.horarios || []).join(", "));
  return { medicamento: linha, posologia: pos.join(" · ") };
}

function imprimirReceituario(pacId, tipo) {
  const p = patById(pacId); if (!p) return;
  const est = window.ESTAB || {};
  const its = _itensDoPaciente(pacId);
  const itens = its.filter((pr) => tipo === "C" ? _medControlada(pr) : !_medControladaQualquer(pr));
  // prescritor: pega o vinculado ao paciente (se houver)
  const presc = p.prescritorId ? prescById(p.prescritorId) : null;
  const prescTxt = presc ? `${presc.nome} — ${presc.conselho}-${presc.uf} ${presc.numero}` : "";
  const controlado = tipo === "C";
  const idade = (function (d) { if (!d) return ""; const t = new Date(), n = new Date(d); let a = t.getFullYear() - n.getFullYear(); const m = t.getMonth() - n.getMonth(); if (m < 0 || (m === 0 && t.getDate() < n.getDate())) a--; return a; })(p.dataNascimento);

  const linhasMed = itens.map((pr) => { const d = _medDescricao(pr); return `<tr><td class="mono">${_esc(d.medicamento)}</td><td>${_esc(d.posologia)}</td><td class="qt"></td></tr>`; }).join("");
  const linhasVazias = Array.from({ length: Math.max(controlado ? 3 : 5, 8 - itens.length) }, () => `<tr><td>&nbsp;</td><td></td><td class="qt"></td></tr>`).join("");

  // uma "folha" (via). No controlado, imprime 2 (1ª farmácia, 2ª paciente).
  const folha = (viaLabel) => `
    <section class="via">
      ${viaLabel ? `<div class="via-tag">${viaLabel}</div>` : ""}
      <div class="cab">
        <div class="tit">${controlado ? "RECEITUÁRIO DE CONTROLE ESPECIAL" : "RECEITUÁRIO"}</div>
        ${controlado ? '<div class="num">Nº ____________</div>' : ""}
      </div>
      <div class="bloco">
        <div class="bl-tit">Identificação do Emitente</div>
        <div class="linhas">
          <div><b>${_esc(est.razao_social || est.nome_fantasia || "Hospital Reviva")}</b>${est.cnpj ? " · CNPJ: " + _esc(est.cnpj) : ""}</div>
          <div>${_esc(est.endereco || "")}${est.municipio_uf ? " — " + _esc(est.municipio_uf) : ""}${est.telefone ? " · Tel.: " + _esc(est.telefone) : ""}</div>
          <div>Prescritor: ${prescTxt ? _esc(prescTxt) : "____________________________  CRM ____________"}</div>
        </div>
      </div>
      <div class="bloco">
        <div class="bl-tit">Paciente</div>
        <div class="linhas">
          <div>Nome: <b>${_esc(p.nome)}</b>${idade !== "" ? " · Idade: " + idade : ""}${p.leito ? " · Leito: " + _esc(p.leito) : ""}</div>
          <div>Endereço: ${_esc(p.endereco || "____________________________________________")}</div>
        </div>
      </div>
      <div class="bloco presc">
        <div class="bl-tit">Prescrição</div>
        <table class="med"><thead><tr><th>Medicamento</th><th>Posologia / orientação</th><th class="qt">Qtd.</th></tr></thead>
        <tbody>${linhasMed}${linhasVazias}</tbody></table>
      </div>
      <div class="assin">
        <div>Data: ____ / ____ / ______</div>
        <div class="sig">____________________________<br><span>Assinatura e carimbo do prescritor</span></div>
      </div>
      ${controlado ? `
      <div class="reten">
        <div class="col">
          <div class="bl-tit">Identificação do Comprador</div>
          <div class="mini">Nome: __________________________________</div>
          <div class="mini">RG: ________________ Órgão emissor: ________</div>
          <div class="mini">Endereço: ______________________________</div>
          <div class="mini">Telefone: ______________________________</div>
        </div>
        <div class="col">
          <div class="bl-tit">Identificação do Fornecedor (dispensação)</div>
          <div class="mini">Farmacêutico: __________________________</div>
          <div class="mini">CRF: ____________ Data: ____ / ____ / ______</div>
          <div class="mini">Assinatura: ____________________________</div>
        </div>
      </div>` : ""}
    </section>`;

  const corpo = controlado
    ? folha("1ª via — Retenção da Farmácia") + folha("2ª via — Orientação ao Paciente")
    : folha("");

  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${controlado ? "Receituário de Controle Especial" : "Receituário"} — ${_esc(p.nome)}</title>
  <style>@page{size:A4 portrait;margin:12mm 12mm}*{box-sizing:border-box}body{font-family:"Public Sans",Arial,sans-serif;color:#1E2A28;font-size:11px;margin:0}
  .via{border:1.5px solid #1E2A28;border-radius:4px;padding:10px 12px;margin-bottom:8px}
  ${controlado ? ".via{min-height:138mm}" : ".via{min-height:150mm}"}
  .via-tag{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#2C5F5A;text-align:right;margin-bottom:2px}
  .cab{display:flex;justify-content:space-between;align-items:baseline;border-bottom:1.5px solid #1E2A28;padding-bottom:5px;margin-bottom:8px}
  .cab .tit{font-size:14px;font-weight:700;letter-spacing:.02em}.cab .num{font-size:11px;font-family:"IBM Plex Mono",monospace}
  .bloco{margin-bottom:8px}.bl-tit{font-size:8.5px;text-transform:uppercase;letter-spacing:.04em;color:#6a736e;border-bottom:1px solid #cfd6cf;margin-bottom:3px;padding-bottom:1px}
  .linhas div{margin:2px 0;font-size:11px}
  table.med{width:100%;border-collapse:collapse;margin-top:2px}table.med th,table.med td{border:1px solid #cfd6cf;padding:5px 6px;font-size:11px;text-align:left;vertical-align:top}
  table.med th{background:#EEF2EC;text-transform:uppercase;font-size:8.5px}table.med td{height:22px}.qt{width:60px;text-align:center}.mono{font-weight:600}
  .presc{margin-bottom:10px}
  .assin{display:flex;justify-content:space-between;align-items:flex-end;margin-top:10px}.assin .sig{text-align:center;font-size:9px}.assin .sig span{color:#6a736e}
  .reten{display:flex;gap:14px;border-top:1px dashed #9aa39d;margin-top:10px;padding-top:8px}.reten .col{flex:1}.reten .mini{font-size:10px;margin:3px 0}
  .btn{position:fixed;top:12px;right:12px;background:#2C5F5A;color:#fff;border:none;padding:9px 15px;border-radius:8px;cursor:pointer;font:inherit;z-index:9}@media print{.btn{display:none}}
  </style></head><body>
  <button class="btn" onclick="window.print()">Imprimir / Salvar PDF</button>
  ${corpo}
  </body></html>`;
  const win = window.open("", "_blank"); if (!win) { alert("Permita pop-ups para imprimir o receituário."); return; }
  win.document.open(); win.document.write(html); win.document.close();
}
