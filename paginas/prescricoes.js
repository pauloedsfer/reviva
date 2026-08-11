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
    <div><input type="number" class="m-qtd" min="0.25" step="0.25" value="1" title="Qtd. por horário (aceita fração: 0,5 = meio comprimido)"></div>
    <div><input type="text" class="m-via" value="VO" placeholder="Via"></div>
    <div><input type="text" class="m-hor" placeholder="09:00, 21:00">${_chipsHorario(".m-hor")}</div>
    <button type="button" class="item-del" onclick="this.parentElement.remove()">✕</button>`;
  cont.appendChild(row);
}
/* ---- horários padronizados clicáveis ----
   Alterna o valor no campo de texto ao qual os chips pertencem. */
function _chipsHorario(alvoSel) {
  return `<div class="hor-chips" style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">` +
    HORARIOS_PADRAO.map((h) => {
      const esp = h === "JEJUM" || h === "SOS";
      return `<button type="button" class="hchip" data-h="${h}" data-alvo="${alvoSel}"
        onclick="_toggleHorario(this)"
        style="font:inherit;font-size:11px;padding:2px 7px;border-radius:11px;cursor:pointer;border:1px solid var(--line);background:${esp ? "#FBF3E3" : "#fff"};color:${esp ? "#B07A2F" : "var(--primary-dark)"}">${h}</button>`;
    }).join("") + `</div>`;
}
function _toggleHorario(btn) {
  const sel = btn.dataset.alvo, h = btn.dataset.h;
  const campo = sel.startsWith("#") ? document.getElementById(sel.slice(1))
                                    : btn.closest(".item-row").querySelector(sel);
  if (!campo) return;
  const atuais = campo.value.split(",").map((x) => x.trim()).filter(Boolean);
  const i = atuais.findIndex((x) => x.toUpperCase() === h.toUpperCase());
  if (i >= 0) atuais.splice(i, 1); else atuais.push(h);
  // ordena: JEJUM primeiro, horários por hora, SOS por último
  atuais.sort((a, b) => {
    const val = (x) => /JEJUM/i.test(x) ? -1 : (/SOS/i.test(x) ? 9999 : (parseInt((x.match(/\d{1,2}/) || ["0"])[0], 10)));
    return val(a) - val(b);
  });
  campo.value = atuais.join(", ");
  _marcarChips(campo);
}
function _marcarChips(campo) {
  const wrap = campo.parentElement.querySelector(".hor-chips") || campo.closest("div").querySelector(".hor-chips");
  if (!wrap) return;
  const atuais = campo.value.split(",").map((x) => x.trim().toUpperCase()).filter(Boolean);
  wrap.querySelectorAll(".hchip").forEach((b) => {
    const on = atuais.includes(b.dataset.h.toUpperCase());
    b.style.background = on ? "var(--primary-dark)" : (b.dataset.h === "JEJUM" || b.dataset.h === "SOS" ? "#FBF3E3" : "#fff");
    b.style.color = on ? "#fff" : (b.dataset.h === "JEJUM" || b.dataset.h === "SOS" ? "#B07A2F" : "var(--primary-dark)");
    b.style.borderColor = on ? "var(--primary-dark)" : "var(--line)";
  });
}

function coletarMeds() {
  const rows = Array.from(document.querySelectorAll("#prMeds .item-row"));
  const meds = rows.map((r) => ({
    sub: r.querySelector(".m-sub").value,
    dose: r.querySelector(".m-dose").value.trim(),
    qtd: Math.max(0.25, parseFloat((r.querySelector(".m-qtd").value || "1").replace(",", ".")) || 1),
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
    <div class="ff" style="margin-top:12px"><label>Data limite <span style="font-weight:400;color:var(--muted)">— opcional, vale para as medicações acima</span></label>
      <input id="mFim" type="date">
      <div style="font-size:11px;color:var(--muted);margin-top:3px">Para tratamento com duração definida (ex.: antimicrobiano por 7 dias). Passada a data, sai do mapa e da dispensação sozinha. Em branco = uso contínuo.</div></div>
    <div class="note-box" style="margin:8px 0 0">Clique nos horários padronizados ou digite separando por vírgula. <b>JEJUM</b> aparece no topo do mapa e <b>SOS</b> no final. <b>Qtd/hor.</b> = quanto por horário, aceita fração (0,5 = meio comprimido).</div>
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
      data_inicio: data, data_fim: fvOrNull("mFim"), ativo: true, ...usuarioId(),
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
    <div class="ff"><label>Data limite <span style="font-weight:400;color:var(--muted)">— opcional, para tratamento com duração definida</span></label>
      <input id="eFim" type="date" value="${pr.dataFim || ""}">
      <div style="font-size:11px;color:var(--muted);margin-top:3px">Ex.: antimicrobiano por 7 dias. Passada a data, a prescrição sai do mapa e da dispensação automaticamente, sem precisar suspender à mão. Deixe em branco para uso contínuo.</div></div>
    <div class="ff"><label>Substância *</label><select id="eSub">${_optSubs(pr.subId)}</select></div>
    <div class="ff"><label>Médico prescritor</label>
      <select id="ePresc" onchange="_toggleBloco('ePresc','blocoNovoPresc')">${_optPresc(pr.prescritorId)}</select>
    </div>
    ${_blocoNovoPrescritor()}
    <div class="ff row2">
      <div><label>Dose (texto)</label><input id="eDose" value="${(pr.dose || "").replace(/"/g, "&quot;")}"></div>
      <div><label>Qtd. por horário *</label><input id="eQtd" type="number" min="0.25" step="0.25" value="${pr.qtdPorHorario || 1}">
        <div style="font-size:11px;color:var(--muted);margin-top:3px">Aceita fração: 0,5 = meio comprimido. Em comprimido, o restante é descartado e o estoque baixa a unidade inteira.</div></div>
    </div>
    <div class="ff row2">
      <div><label>Via</label><input id="eVia" value="${pr.via || "VO"}"></div>
      <div><label>Horários</label><input id="eHor" value="${(pr.horarios || []).join(", ")}">${_chipsHorario("#eHor")}</div>
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
      qtd_por_horario: Math.max(0.25, fvNum("eQtd") || 1),
      data_fim: fvOrNull("eFim"),
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
function _itensDoPaciente(pacId, incluirSuspensas) {
  return prescriptions.filter((pr) => pr.paciente === pacId && (incluirSuspensas || prescVigenteEm(pr)))
    .sort((a, b) => subById(a.subId).nome.localeCompare(subById(b.subId).nome));
}
function _prescResumo(pacId) {
  const its = _itensDoPaciente(pacId);
  return its.map((pr) => subById(pr.subId).nome).join(", ");
}

function _cardsPorPaciente() {
  // pacientes com ao menos uma prescrição, ordenados por leito
  const ids = [...new Set(prescriptions.filter((p) => prescVigenteEm(p)).map((p) => p.paciente))];
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
    const nq = qtdPorHorario(pr);
    const ext = pr.prescritorId && (prescById(pr.prescritorId) || {}).externo
      ? ' <span class="tag" style="background:var(--accent-tint);color:var(--accent)">EXTERNO</span>' : "";
    return `<tr>
      <td><b>${subById(pr.subId).nome}</b></td>
      <td>${pr.dose || "—"}${nq !== 1 ? ` <span class="tag" style="background:var(--primary-tint);color:var(--primary-dark)">${fmtDose(nq)}/horário</span>` : ""}${temDescarte(pr) ? ` <span class="tag" style="background:#FBF3E3;color:#B07A2F" title="Parte o comprimido: administra a fração e descarta o restante; o estoque baixa ${fmtDose(qtdConsumida(pr))}">baixa ${fmtDose(qtdConsumida(pr))}</span>` : ""}</td>
      <td class="mono">${pr.via || "—"}</td>
      <td>${(pr.horarios || []).map((h) => `<span class="tag" style="background:var(--primary-tint);color:var(--primary-dark)">${h}</span>`).join(" ")}</td>
      <td style="color:var(--muted)">${pr.prescritorId ? prescNome(pr.prescritorId) + ext : "—"}</td>
      <td class="mono">${pr.dataInicio ? fmtDate(pr.dataInicio) : "—"}${(() => {
        if (!pr.dataFim) return "";
        const d = prescDiasRestantes(pr);
        const cor = d < 0 ? "#F1F3F1;color:#6a736e" : d <= 2 ? "#F7E3E1;color:#B04A3F" : "#FBF3E3;color:#B07A2F";
        const txt = d < 0 ? "encerrada em " + fmtDate(pr.dataFim)
                  : d === 0 ? "último dia" : `até ${fmtDate(pr.dataFim)} · ${d} dia${d > 1 ? "s" : ""}`;
        return `<div><span class="tag" style="background:${cor}">${txt}</span></div>`;
      })()}</td>
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
          <button class="btn ghost sm" onclick="abrirImpressaoPrescricoes('${pacId}')">🖶 Imprimir prescrição</button>
          <button class="btn ghost sm" onclick="imprimirPrescricaoMedica('${pacId}')">🖶 Folha de prescrição</button>
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
          <button class="btn sm" onclick="abrirImpressaoPrescricoes()">🖶 Imprimir prescrições</button>
          <button class="btn ghost sm" onclick="imprimirPrescricaoMedica(null)">🖶 Folha em branco</button>
          <button class="btn ghost sm" onclick="imprimirReceituario(null,'C')">🖶 Receituário C em branco</button>
          <button class="btn ghost sm" onclick="imprimirReceituario(null,'comum')">🖶 Comum em branco</button>
          <button class="btn sm" onclick="abrirFormPrescricao()">+ Nova prescrição</button>
        </div>
      </div>
      <div class="panel-body">${(() => {
        const enc = prescriptions.filter((pr) => prescEncerrada(pr));
        if (!enc.length) return "";
        return `<div class="note-box" style="margin-top:0;background:#F1F3F1">
          <b>${enc.length} prescrição(ões) encerrada(s) por prazo</b> — saíram do mapa e da dispensação automaticamente.
          <div style="font-size:12.5px;margin-top:4px">${enc.slice(0, 8).map((pr) => {
            const p = patById(pr.paciente);
            return `${_esc(subById(pr.subId).nome)} <span style="color:var(--muted)">· ${_esc(p ? p.nome : "")} · até ${fmtDate(pr.dataFim)}</span>`;
          }).join(" · ")}${enc.length > 8 ? ` <span style="color:var(--muted)">e mais ${enc.length - 8}</span>` : ""}</div></div>`;
      })()}${_cardsPorPaciente()}</div>
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
  if (qtdPorHorario(pr) !== 1) pos.push(`${fmtDose(qtdPorHorario(pr))} por horário`);
  if (pr.via) pos.push(pr.via);
  if ((pr.horarios || []).length) pos.push((pr.horarios || []).join(", "));
  return { medicamento: linha, posologia: pos.join(" · ") };
}

function imprimirReceituario(pacId, tipo) {
  const p = pacId ? patById(pacId) : null;
  const est = window.ESTAB || {};
  const emBranco = !p;
  const its = p ? _itensDoPaciente(pacId) : [];
  const itens = its.filter((pr) => tipo === "C" ? _medControlada(pr) : !_medControladaQualquer(pr));
  const presc = p && p.prescritorId ? prescById(p.prescritorId) : null;
  const prescTxt = presc ? `${presc.nome} — ${presc.conselho}-${presc.uf} ${presc.numero}` : "";
  const controlado = tipo === "C";
  const idade = (function (d) { if (!d) return ""; const t = new Date(), n = new Date(d); let a = t.getFullYear() - n.getFullYear(); const m = t.getMonth() - n.getMonth(); if (m < 0 || (m === 0 && t.getDate() < n.getDate())) a--; return a; })(p && p.dataNascimento);

  // corpo da prescrição: pré-preenchido (com paciente) OU pautado em branco (sem paciente)
  let blocoPresc;
  if (emBranco) {
    const linhas = Array.from({ length: controlado ? 4 : 12 }, () => `<div class="pauta"></div>`).join("");
    blocoPresc = `<div class="bloco presc"><div class="bl-tit">Prescrição</div><div class="pautas">${linhas}</div></div>`;
  } else {
    const linhasMed = itens.map((pr) => { const d = _medDescricao(pr); return `<tr><td class="mono">${_esc(d.medicamento)}</td><td>${_esc(d.posologia)}</td><td class="qt"></td></tr>`; }).join("");
    const linhasVazias = Array.from({ length: Math.max(controlado ? 2 : 5, (controlado ? 4 : 8) - itens.length) }, () => `<tr><td>&nbsp;</td><td></td><td class="qt"></td></tr>`).join("");
    blocoPresc = `<div class="bloco presc"><div class="bl-tit">Prescrição</div>
      <table class="med"><thead><tr><th>Medicamento</th><th>Posologia / orientação</th><th class="qt">Qtd.</th></tr></thead>
      <tbody>${linhasMed}${linhasVazias}</tbody></table></div>`;
  }

  const linhaPaciente = emBranco
    ? `<div>Paciente: ______________________________________________________</div>
       <div>Endereço: ______________________________________________________</div>`
    : `<div>Nome: <b>${_esc(p.nome)}</b>${idade !== "" ? " · Idade: " + idade : ""}${p.leito ? " · Leito: " + _esc(p.leito) : ""}</div>
       <div>Endereço: ${_esc(p.endereco || "____________________________________________")}</div>`;

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
        <div class="linhas">${linhaPaciente}</div>
      </div>
      ${blocoPresc}
      <div class="assin">
        <div>Data: ____ / ____ / ______</div>
        <div class="sig">____________________________<br><span>Assinatura e carimbo do prescritor</span></div>
      </div>
      ${controlado ? `
      <div class="reten">
        <div class="col">
          <div class="bl-tit">Identificação do Comprador</div>
          <div class="mini">Nome: __________________________________</div>
          <div class="mini">Ident.: ______________ Órgão Em.: ________</div>
          <div class="mini">Endereço: ______________________________</div>
          <div class="mini">Cidade: __________________ UF: ______</div>
          <div class="mini">Telefone: ______________________________</div>
        </div>
        <div class="col">
          <div class="bl-tit">Identificação do Fornecedor (dispensação)</div>
          <div class="mini">Farmacêutico: __________________________</div>
          <div class="mini">CRF: ____________</div>
          <div class="mini">Assinatura do funcionário: ______________</div>
          <div class="mini">Data: ____ / ____ / ______</div>
        </div>
      </div>` : ""}
    </section>`;

  const corpo = controlado
    ? folha("1ª via — Retenção da Farmácia") + folha("2ª via — Orientação ao Paciente")
    : folha("");

  const titulo = (controlado ? "Receituário de Controle Especial" : "Receituário") + (emBranco ? " (em branco)" : " — " + _esc(p.nome));
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${titulo}</title>
  <style>@page{size:A4 portrait;margin:12mm 12mm}*{box-sizing:border-box}body{font-family:"Public Sans",Arial,sans-serif;color:#1E2A28;font-size:11px;margin:0}
  .via{border:1.5px solid #1E2A28;border-radius:4px;padding:10px 12px;margin-bottom:8px}
  ${controlado ? ".via{min-height:118mm}" : ".via{min-height:150mm}"}
  .via-tag{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#2C5F5A;text-align:right;margin-bottom:2px}
  .cab{display:flex;justify-content:space-between;align-items:baseline;border-bottom:1.5px solid #1E2A28;padding-bottom:5px;margin-bottom:8px}
  .cab .tit{font-size:14px;font-weight:700;letter-spacing:.02em}.cab .num{font-size:11px;font-family:"IBM Plex Mono",monospace}
  .bloco{margin-bottom:8px}.bl-tit{font-size:8.5px;text-transform:uppercase;letter-spacing:.04em;color:#6a736e;border-bottom:1px solid #cfd6cf;margin-bottom:3px;padding-bottom:1px}
  .linhas div{margin:3px 0;font-size:11px}
  .pautas{margin-top:6px}.pauta{border-bottom:1px solid #b9c1ba;height:20px}
  table.med{width:100%;border-collapse:collapse;margin-top:2px}table.med th,table.med td{border:1px solid #cfd6cf;padding:5px 6px;font-size:11px;text-align:left;vertical-align:top}
  table.med th{background:#EEF2EC;text-transform:uppercase;font-size:8.5px}table.med td{height:22px}.qt{width:60px;text-align:center}.mono{font-weight:600}
  .presc{margin-bottom:10px}
  .assin{display:flex;justify-content:space-between;align-items:flex-end;margin-top:10px}.assin .sig{text-align:center;font-size:9px}.assin .sig span{color:#6a736e}
  .reten{display:flex;gap:14px;border-top:1px dashed #9aa39d;margin-top:8px;padding-top:6px}.reten .col{flex:1}.reten .mini{font-size:10px;margin:2px 0}
  .btn{position:fixed;top:12px;right:12px;background:#2C5F5A;color:#fff;border:none;padding:9px 15px;border-radius:8px;cursor:pointer;font:inherit;z-index:9}@media print{.btn{display:none}}
  </style></head><body>
  <button class="btn" onclick="window.print()">Imprimir / Salvar PDF</button>
  ${corpo}
  </body></html>`;
  const win = window.open("", "_blank"); if (!win) { alert("Permita pop-ups para imprimir o receituário."); return; }
  win.document.open(); win.document.write(html); win.document.close();
}

/* ============================================================
   Folha de Prescrição Médica (uso na consulta, arquivo no prontuário)
   Documento INTERNO — não vai à farmácia; sem vias/retenção.
   Traz TODAS as medicações ativas (controladas e não), pois é a
   ordem médica completa. pacId nulo = folha em branco para preencher à mão.
   ============================================================ */
function imprimirPrescricaoMedica(pacId) {
  const p = pacId ? patById(pacId) : null;
  const est = window.ESTAB || {};
  const emBranco = !p;
  const its = p ? _itensDoPaciente(pacId) : [];
  const presc = p && p.prescritorId ? prescById(p.prescritorId) : null;
  const prescTxt = presc ? `${presc.nome} — ${presc.conselho}-${presc.uf} ${presc.numero}` : "";
  const idade = (function (d) { if (!d) return ""; const t = new Date(), n = new Date(d); let a = t.getFullYear() - n.getFullYear(); const m = t.getMonth() - n.getMonth(); if (m < 0 || (m === 0 && t.getDate() < n.getDate())) a--; return a; })(p && p.dataNascimento);

  // linhas de medicação: numeradas
  let linhasMed;
  if (emBranco) {
    linhasMed = Array.from({ length: 14 }, (_, i) => `<tr><td class="n">${i + 1}</td><td></td><td></td><td></td><td></td></tr>`).join("");
  } else {
    const preench = its.map((pr, i) => {
      const d = _medDescricao(pr);
      const s = subById(pr.subId) || {};
      const freq = (pr.horarios || []).join(", ");
      const obs = qtdPorHorario(pr) !== 1 ? `${fmtDose(qtdPorHorario(pr))} por horário` : "";
      return `<tr><td class="n">${i + 1}</td><td class="mono">${_esc(s.nome || d.medicamento)}</td><td>${_esc(pr.dose || "")}</td><td>${_esc(pr.via || "")}</td><td>${_esc(freq)}${obs ? " · " + _esc(obs) : ""}</td></tr>`;
    }).join("");
    const restantes = Array.from({ length: Math.max(3, 12 - its.length) }, (_, i) => `<tr><td class="n">${its.length + i + 1}</td><td></td><td></td><td></td><td></td></tr>`).join("");
    linhasMed = preench + restantes;
  }

  const pacBloco = emBranco
    ? `<div>Paciente: ____________________________________________  Prontuário: ____________</div>
       <div>Leito: __________  Idade: ______  Data de internação: ____ / ____ / ______</div>`
    : `<div>Paciente: <b>${_esc(p.nome)}</b>  ${p.prontuario ? "Prontuário: " + _esc(p.prontuario) : "Prontuário: ____________"}</div>
       <div>${p.leito ? "Leito: " + _esc(p.leito) + "  " : ""}${idade !== "" ? "Idade: " + idade + "  " : ""}${p.admissao ? "Data de internação: " + fmtDate(p.admissao) : ""}</div>`;

  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Prescrição Médica${emBranco ? " (em branco)" : " — " + _esc(p.nome)}</title>
  <style>@page{size:A4 portrait;margin:14mm 13mm}*{box-sizing:border-box}body{font-family:"Public Sans",Arial,sans-serif;color:#1E2A28;font-size:11.5px;margin:0}
  .estab{border-bottom:2px solid #2C5F5A;padding-bottom:6px;margin-bottom:6px}.estab .n{font-size:14px;font-weight:700}.estab .s{font-size:10px;color:#4a544f}
  .tit{text-align:center;font-size:15px;font-weight:700;letter-spacing:.03em;margin:6px 0}
  .datahora{text-align:right;font-size:11px;margin-bottom:6px}
  .pac{border:1px solid #cfd6cf;border-radius:6px;padding:7px 9px;margin-bottom:7px}.pac div{margin:3px 0}
  .alerg{border:1.5px solid #B04A3F;border-radius:6px;padding:6px 9px;margin-bottom:9px;font-size:11.5px}.alerg b{color:#B04A3F;text-transform:uppercase;font-size:10px;letter-spacing:.03em}
  table{width:100%;border-collapse:collapse}th,td{border:1px solid #cfd6cf;padding:5px 6px;font-size:11px;text-align:left;vertical-align:top}
  th{background:#EEF2EC;text-transform:uppercase;font-size:8.5px}td{height:24px}td.n{width:26px;text-align:center;color:#6a736e}.mono{font-weight:600}
  th.med{width:34%}th.dose{width:13%}th.via{width:10%}
  .cuid{margin-top:9px}.cuid .bl{font-size:8.5px;text-transform:uppercase;color:#6a736e;letter-spacing:.03em;margin-bottom:3px}
  .cuid .linha{border-bottom:1px solid #b9c1ba;height:20px}
  .assin{margin-top:26px;display:flex;justify-content:space-between;align-items:flex-end}
  .assin .sig{text-align:center;font-size:9px;color:#6a736e}.assin .sig .l{border-top:1px solid #1E2A28;padding-top:4px;color:#1E2A28;font-size:11px}
  .rod{margin-top:10px;font-size:9px;color:#8a938d;text-align:center;border-top:1px solid #e2e7e1;padding-top:5px}
  .btn{position:fixed;top:12px;right:12px;background:#2C5F5A;color:#fff;border:none;padding:9px 15px;border-radius:8px;cursor:pointer;font:inherit;z-index:9}@media print{.btn{display:none}}
  </style></head><body>
  <button class="btn" onclick="window.print()">Imprimir / Salvar PDF</button>
  <div class="estab"><div class="n">${_esc(est.razao_social || est.nome_fantasia || "Hospital Reviva")}</div><div class="s">${est.cnpj ? "CNPJ: " + _esc(est.cnpj) + " · " : ""}${_esc(est.endereco || "")}${est.municipio_uf ? " — " + _esc(est.municipio_uf) : ""}</div></div>
  <div class="tit">PRESCRIÇÃO MÉDICA</div>
  <div class="datahora">Data: ____ / ____ / ______   Hora: ______</div>
  <div class="pac">${pacBloco}</div>
  <div class="alerg"><b>Alergias:</b> ${emBranco ? "___________________________________________________" : "___________________________________________  ( ) Nega alergias"}</div>
  <table>
    <thead><tr><th class="n">#</th><th class="med">Medicamento</th><th class="dose">Dose</th><th class="via">Via</th><th>Frequência / horários · observações</th></tr></thead>
    <tbody>${linhasMed}</tbody>
  </table>
  <div class="cuid">
    <div class="bl">Cuidados / orientações</div>
    ${Array.from({ length: emBranco ? 4 : 3 }, () => `<div class="linha"></div>`).join("")}
  </div>
  <div class="assin">
    <div>Carimbo:</div>
    <div class="sig" style="min-width:260px"><div class="l">${prescTxt ? _esc(prescTxt) : "____________________________"}</div>Assinatura e CRM do médico</div>
  </div>
  <div class="rod">Documento integrante do prontuário do paciente — arquivar após a consulta.</div>
  </body></html>`;
  const win = window.open("", "_blank"); if (!win) { alert("Permita pop-ups para imprimir a prescrição."); return; }
  win.document.open(); win.document.write(html); win.document.close();
}

/* ============================================================
   IMPRESSÃO PERSONALIZADA DE PRESCRIÇÕES
   A prescrição é um documento só: o médico assina e a farmácia
   dispensa. Aqui o RT escolhe exatamente quais medicações entram,
   se o prescritor sai preenchido ou em branco, e pode gerar de
   vários pacientes de uma vez.
   ============================================================ */
let _prImpSel = {};   // { pacienteId: [prescricaoId, ...] }

function abrirImpressaoPrescricoes(pacId) {
  const alvos = patients.filter((p) => p.ativo !== false)
    .filter((p) => !pacId || p.id === pacId)
    .filter((p) => _itensDoPaciente(p.id).length)
    .sort((a, b) => (a.leito || "").localeCompare(b.leito || "", "pt-BR", { numeric: true }) || a.nome.localeCompare(b.nome, "pt-BR"));
  if (!alvos.length) { alert("Nenhum paciente internado com prescrição ativa."); return; }

  _prImpSel = {};
  const blocos = alvos.map((p) => {
    const its = _itensDoPaciente(p.id);
    const linhas = its.map((pr) => {
      const s = subById(pr.subId);
      const lista = (s.lista || "").trim();
      const ctrl = lista && lista !== "—";
      const notif = /^[AB]/i.test(lista);
      const d = _medDescricao(pr);
      return `<label style="display:flex;align-items:flex-start;gap:8px;padding:4px 0;font-size:13px">
        <input type="checkbox" class="pri-med" data-pac="${p.id}" data-pr="${pr.id}" checked style="margin-top:3px">
        <span style="flex:1">${_esc(s.nome)}
          ${ctrl ? `<span class="tag ${listaTagClass(lista)}">${_esc(lista)}</span>` : ""}
          ${notif ? '<span class="tag" style="background:#F7E3E1;color:#B04A3F" title="Exige Notificação de Receita própria">exige Notificação</span>' : ""}
          <div style="font-size:11.5px;color:var(--muted)">${_esc(d.posologia || "sem posologia registrada")}</div></span></label>`;
    }).join("");
    return `<div style="border:1px solid var(--line);border-radius:9px;padding:10px 12px;margin-bottom:10px">
      <label style="display:flex;align-items:center;gap:8px;font-weight:700;font-size:13.5px;border-bottom:1px solid var(--line);padding-bottom:5px;margin-bottom:5px">
        <input type="checkbox" class="pri-pac" data-pac="${p.id}" checked onchange="_priTogglePac('${p.id}', this.checked)">
        ${_esc(p.nome)}${p.leito ? ` <span style="font-weight:400;color:var(--muted)">· leito ${_esc(p.leito)}</span>` : ""}
        <span style="margin-left:auto;font-weight:400;font-size:11.5px;color:var(--muted)">${its.length} medicação(ões)</span></label>
      ${linhas}</div>`;
  }).join("");

  abrirModal("Imprimir prescrições", `
    <div class="note-box" style="margin-top:0">Marque exatamente o que deve constar de cada prescrição. Sai <b>uma prescrição por paciente</b>, com os medicamentos escolhidos — controlados e não controlados no mesmo documento, como o médico assina e a farmácia dispensa.</div>
    <div class="ff row2">
      <div><label>Modelo</label>
        <select id="priModelo">
          <option value="ce">Receituário de Controle Especial — 2 vias</option>
          <option value="simples">Receituário simples — 1 via</option>
        </select>
        <div style="font-size:11px;color:var(--muted);margin-top:3px">Use o de Controle Especial quando houver item da lista C.</div></div>
      <div><label>Prescritor</label>
        <select id="priPresc">
          <option value="branco">Deixar em branco (médico preenche e assina)</option>
          <option value="preenchido">Preencher com o prescritor do paciente</option>
        </select></div>
    </div>
    <div class="ff"><label>Dados do paciente no documento</label>
      <label style="display:inline-flex;align-items:center;gap:6px;font-size:12.5px;margin-right:14px"><input type="checkbox" id="priCPF" checked> CPF</label>
      <label style="display:inline-flex;align-items:center;gap:6px;font-size:12.5px;margin-right:14px"><input type="checkbox" id="priEnd" checked> Endereço</label>
      <label style="display:inline-flex;align-items:center;gap:6px;font-size:12.5px"><input type="checkbox" id="priTel"> Telefone</label>
      <div style="font-size:11px;color:var(--muted);margin-top:3px">O CPF facilita a compra na farmácia e a retenção da receita.</div></div>
    <div class="item-head">Pacientes e medicações</div>
    ${blocos}
  `, async () => {
    const sel = {};
    document.querySelectorAll(".pri-med:checked").forEach((c) => {
      const pac = c.getAttribute("data-pac");
      (sel[pac] = sel[pac] || []).push(c.getAttribute("data-pr"));
    });
    // só pacientes com o cabeçalho marcado
    document.querySelectorAll(".pri-pac:not(:checked)").forEach((c) => { delete sel[c.getAttribute("data-pac")]; });
    if (!Object.keys(sel).length) throw new Error("Selecione ao menos uma medicação.");
    const opts = {
      modelo: fv("priModelo"),
      prescritor: fv("priPresc"),
      cpf: document.getElementById("priCPF").checked,
      endereco: document.getElementById("priEnd").checked,
      telefone: document.getElementById("priTel").checked,
    };
    setTimeout(() => imprimirPrescricoesSelecionadas(sel, opts), 60);
  }, "Gerar prescrições");
}

function _priTogglePac(pacId, v) {
  document.querySelectorAll('.pri-med[data-pac="' + pacId + '"]').forEach((c) => (c.checked = v));
}

function imprimirPrescricoesSelecionadas(sel, o) {
  const est = window.ESTAB || {};
  const ce = o.modelo === "ce";
  const folhas = [];

  Object.keys(sel).forEach((pacId) => {
    const p = patById(pacId); if (!p) return;
    const its = _itensDoPaciente(pacId).filter((pr) => sel[pacId].indexOf(pr.id) !== -1);
    if (!its.length) return;
    const presc = o.prescritor === "preenchido" && p.prescritorId ? prescById(p.prescritorId) : null;
    const prescTxt = presc ? `${presc.nome} — ${presc.conselho}-${presc.uf} ${presc.numero}` : "";
    const idade = (function (d) {
      if (!d) return "";
      const t = new Date(), n = new Date(d);
      let a = t.getFullYear() - n.getFullYear();
      const m = t.getMonth() - n.getMonth();
      if (m < 0 || (m === 0 && t.getDate() < n.getDate())) a--;
      return a >= 0 && a < 130 ? a + " anos" : "";
    })(p.dataNascimento);

    const linhasMed = its.map((pr, i) => {
      const d = _medDescricao(pr);
      const s = subById(pr.subId);
      const lista = (s.lista || "").trim();
      return `<tr>
        <td class="n">${i + 1}</td>
        <td class="med"><b>${_esc(d.medicamento)}</b>${lista && lista !== "—" ? ` <span class="lst">${_esc(lista)}</span>` : ""}</td>
        <td class="pos">${_esc(d.posologia)}</td>
        <td class="qt"></td></tr>`;
    }).join("");
    const vazias = Array.from({ length: Math.max(2, 7 - its.length) }, () =>
      `<tr><td class="n">&nbsp;</td><td class="med"></td><td class="pos"></td><td class="qt"></td></tr>`).join("");

    const idLinhas = [
      `<div><span class="rot">Paciente:</span> <b>${_esc(p.nome)}</b>${idade ? ` · ${idade}` : ""}</div>`,
      o.cpf ? `<div><span class="rot">CPF:</span> ${_esc(p.cpf || "____________________")}${p.prontuario ? ` &nbsp; <span class="rot">Prontuário:</span> ${_esc(p.prontuario)}` : ""}</div>` : "",
      o.endereco ? `<div><span class="rot">Endereço:</span> ${_esc(p.endereco || "_______________________________________________")}</div>` : "",
      o.telefone ? `<div><span class="rot">Telefone:</span> ${_esc(p.telefone || "____________________")}</div>` : "",
    ].filter(Boolean).join("");

    const via = (rot) => `
      <section class="folha">
        ${rot ? `<div class="via">${rot}</div>` : ""}
        <div class="cab">
          <div class="tit">${ce ? "RECEITUÁRIO DE CONTROLE ESPECIAL" : "RECEITUÁRIO"}</div>
          ${ce ? '<div class="num">Nº ____________</div>' : ""}
        </div>
        <div class="bl"><div class="bl-t">Identificação do Emitente</div>
          <div class="linhas">
            <div><b>${_esc(est.razao_social || est.nome_fantasia || "Clínica Reviva")}</b>${est.cnpj ? ` · CNPJ: ${_esc(est.cnpj)}` : ""}</div>
            <div>${_esc(est.endereco || "")}${est.municipio_uf ? ` — ${_esc(est.municipio_uf)}` : ""}</div>
            <div><span class="rot">Prescritor:</span> ${prescTxt ? _esc(prescTxt) : "___________________________________  CRM ______________"}</div>
          </div></div>
        <div class="bl"><div class="bl-t">Paciente</div><div class="linhas">${idLinhas}</div></div>
        <div class="bl presc"><div class="bl-t">Prescrição</div>
          <table><thead><tr><th class="n">#</th><th class="med">Medicamento</th><th class="pos">Posologia / orientação</th><th class="qt">Qtd.</th></tr></thead>
          <tbody>${linhasMed}${vazias}</tbody></table></div>
        <div class="assin">
          <div>Data: ____ / ____ / ______</div>
          <div class="sig">____________________________<br><span>Assinatura e carimbo do prescritor</span></div>
        </div>
        ${ce ? `
        <div class="ret">
          <div class="col"><div class="bl-t">Identificação do Comprador</div>
            <div class="mini">Nome: __________________________________</div>
            <div class="mini">Ident.: ______________ Órgão Em.: ________</div>
            <div class="mini">Endereço: ______________________________</div>
            <div class="mini">Cidade: __________________ UF: ______</div>
            <div class="mini">Telefone: ______________________________</div></div>
          <div class="col"><div class="bl-t">Identificação do Fornecedor</div>
            <div class="mini">Farmacêutico: __________________________</div>
            <div class="mini">CRF: ____________</div>
            <div class="mini">Assinatura do funcionário: ______________</div>
            <div class="mini">Data: ____ / ____ / ______</div></div>
        </div>` : ""}
      </section>`;

    folhas.push(ce ? via("1ª via — Farmácia") + via("2ª via — Paciente") : via(""));
  });

  if (!folhas.length) { alert("Nada selecionado para imprimir."); return; }

  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Prescrições — ${Object.keys(sel).length} paciente(s)</title>
  <style>
  @page{size:A4 portrait;margin:11mm 11mm}
  *{box-sizing:border-box}body{font-family:"Public Sans",Arial,sans-serif;color:#1E2A28;font-size:11px;margin:0}
  .folha{border:1.5px solid #1E2A28;border-radius:4px;padding:9px 11px;margin-bottom:7px;${ce ? "min-height:132mm" : "min-height:150mm"};page-break-inside:avoid}
  .via{font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#2C5F5A;text-align:right;margin-bottom:2px}
  .cab{display:flex;justify-content:space-between;align-items:baseline;border-bottom:1.5px solid #1E2A28;padding-bottom:4px;margin-bottom:7px}
  .cab .tit{font-size:13.5px;font-weight:700;letter-spacing:.02em}
  .cab .num{font-size:11px;font-family:"IBM Plex Mono",monospace}
  .bl{margin-bottom:7px}
  .bl-t{font-size:8px;text-transform:uppercase;letter-spacing:.04em;color:#6a736e;border-bottom:1px solid #cfd6cf;margin-bottom:3px;padding-bottom:1px;font-weight:700}
  .linhas div{margin:2.5px 0;font-size:11px}
  .rot{font-size:9px;text-transform:uppercase;color:#6a736e;font-weight:600}
  table{width:100%;border-collapse:collapse;margin-top:2px}
  th,td{border:1px solid #cfd6cf;padding:4px 6px;font-size:11px;text-align:left;vertical-align:top}
  th{background:#EEF2EC;text-transform:uppercase;font-size:8px}
  td{height:20px}.n{width:22px;text-align:center;color:#6a736e}.med{width:42%}.qt{width:58px;text-align:center}
  .lst{background:#E7F0E3;color:#2C5F5A;font-size:8px;font-weight:700;padding:1px 4px;border-radius:3px}
  .assin{display:flex;justify-content:space-between;align-items:flex-end;margin-top:9px}
  .assin .sig{text-align:center;font-size:8.5px}.assin .sig span{color:#6a736e}
  .ret{display:flex;gap:14px;border-top:1px dashed #9aa39d;margin-top:8px;padding-top:6px}
  .ret .col{flex:1}.ret .mini{font-size:9.5px;margin:2px 0}
  .btn{position:fixed;top:12px;right:12px;background:#2C5F5A;color:#fff;border:none;padding:9px 15px;border-radius:8px;cursor:pointer;font:inherit;z-index:9}
  @media print{.btn{display:none}}
  </style></head><body>
  <button class="btn" onclick="window.print()">Imprimir / Salvar PDF</button>
  ${folhas.join("")}
  </body></html>`;
  const win = window.open("", "_blank");
  if (!win) { alert("Permita pop-ups para imprimir."); return; }
  win.document.open(); win.document.write(html); win.document.close();
}
