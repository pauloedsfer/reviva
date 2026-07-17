/* ============================================================
   paginas/dose.js — Hospital Reviva
   Dispensação POR DATA (dose unitária). Selecione o dia — inclusive
   dias passados — para dar baixa retroativa a partir dos Mapas de
   Medicação preenchidos. Pendentes, baixa e a data gravada no
   estoque respeitam o dia escolhido. Etiquetas e devolução também.
   ============================================================ */

let _dataRef = null;
function dataRef() { return _dataRef || HOJE; }
function mudarDataDisp(v) { _dataRef = v || HOJE; document.getElementById("viewport").innerHTML = renderPage(); }

function _slots() {
  const set = new Set();
  prescriptions.forEach((pr) => pr.horarios.forEach((h) => set.add(h)));
  const arr = Array.from(set);
  arr.sort((a, b) => (a === "SOS" ? 1 : b === "SOS" ? -1 : a.localeCompare(b)));
  return arr;
}

// Prescrições ativas NA data de referência (início <= data). Sem início = sempre.
function _prescricoesNaData(d) {
  return prescriptions.filter((pr) => !pr.dataInicio || pr.dataInicio <= d);
}

// Doses esperadas para a data de referência.
function _dosesEsperadas() {
  const d = dataRef();
  const list = [];
  patients.forEach((p) => {
    _prescricoesNaData(d).filter((pr) => pr.paciente === p.id).forEach((pr) => {
      pr.horarios.forEach((h) => {
        list.push({ pac: p.id, nomePac: p.nome, leito: p.leito || "", subId: pr.subId,
                    dose: pr.dose || "", horario: h, qtd: qtdDaDose(pr.dose) });
      });
    });
  });
  return list.sort((a, b) => (a.nomePac + a.horario).localeCompare(b.nomePac + b.horario));
}
function _dispensadoNaData(pac, subId, horario) {
  const d = dataRef();
  return dispensations.some((x) => x.data === d && x.paciente === pac && x.subId === subId && x.ref === "Dose " + horario);
}

/* -------- etiquetas (para a data de referência) -------- */
function _gerarEtiquetas() {
  const slots = _slots(); const labels = [];
  const d = dataRef();
  patients.forEach((p) => {
    const pres = _prescricoesNaData(d).filter((pr) => pr.paciente === p.id);
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
  const dataTxt = fmtDate(dataRef());
  const labels = _gerarEtiquetas();
  if (!labels.length) { alert("Não há prescrições ativas para gerar etiquetas nessa data."); return; }
  const cards = labels.map((l) => `
    <div class="lbl">
      <div class="lbl-h">${hosp} — Dose Unitária · ${dataTxt}</div>
      <div class="lbl-p">${l.patient.nome}</div>
      <div class="lbl-b">${l.patient.leito || ""}</div>
      <div class="lbl-t">${l.slot}${l.slot === "SOS" ? " — se necessário" : ""}</div>
      <div class="lbl-m">${l.items.map((it) => `${subById(it.subId).nome} — ${it.dose || ""}`).join("<br>")}</div>
      <div class="lbl-f">Preparo: __________ &nbsp; Checagem: __________</div>
    </div>`).join("");
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Etiquetas — Dose Unitária</title>
    <style>@page{size:A4;margin:10mm}*{box-sizing:border-box}body{font-family:"Public Sans",Arial,sans-serif;margin:0}
      .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6mm}
      .lbl{border:1px solid #333;border-radius:6px;padding:8px 10px;height:46mm;display:flex;flex-direction:column;page-break-inside:avoid}
      .lbl-h{font-size:8.5px;color:#555;border-bottom:1px solid #ccc;padding-bottom:3px}
      .lbl-p{font-weight:700;font-size:13px;margin-top:5px}.lbl-b{font-size:11px;color:#333}
      .lbl-t{display:inline-block;align-self:flex-start;background:#1E2A28;color:#fff;font-size:11px;padding:2px 8px;border-radius:10px;margin:5px 0;font-weight:600}
      .lbl-m{font-size:11px;line-height:1.35;flex:1}.lbl-f{font-size:8.5px;color:#555;border-top:1px dashed #ccc;padding-top:4px}
      .toolbar{position:fixed;top:12px;right:12px}.toolbar button{background:#2C5F5A;color:#fff;border:none;padding:9px 15px;border-radius:8px;cursor:pointer;font:inherit}
      @media print{.toolbar{display:none}}</style></head><body>
      <div class="toolbar"><button onclick="window.print()">Imprimir / Salvar PDF</button></div>
      <div class="grid">${cards}</div></body></html>`;
  const win = window.open("", "_blank");
  if (!win) { alert("Permita pop-ups para imprimir as etiquetas."); return; }
  win.document.open(); win.document.write(html); win.document.close();
};

/* -------- dispensação -------- */
function _selLote(subId) {
  const disp = lotesDisponiveis(subId);
  if (!disp.length) return `<select class="disp-lote" disabled><option value="">sem saldo</option></select>`;
  return `<select class="disp-lote">${disp.map((l, i) => `<option value="${l.lote}"${i === 0 ? " selected" : ""}>${l.lote} · saldo ${l.saldo} · val ${fmtDate(l.validade)}</option>`).join("")}</select>`;
}

async function confirmarDispensacao() {
  const d = dataRef();
  const checks = Array.from(document.querySelectorAll(".disp-check:checked"));
  if (!checks.length) { alert("Selecione ao menos uma dose para dispensar."); return; }
  const rows = [];
  for (const c of checks) {
    const tr = c.closest("tr");
    const sel = tr.querySelector(".disp-lote");
    const lote = sel ? sel.value : "";
    if (!lote) { alert(`Sem lote com saldo para ${c.dataset.nome} (${subById(c.dataset.sub).nome}). Dê entrada de estoque antes.`); return; }
    rows.push({ data: d, substancia_id: c.dataset.sub, numero_lote: lote,
      quantidade: Number(c.dataset.qtd), referencia: "Dose " + c.dataset.hor,
      paciente_id: c.dataset.pac, ...usuarioId() });
  }
  const msgData = d === HOJE ? "" : ` na data ${fmtDate(d)} (baixa retroativa)`;
  if (!confirm(`Confirmar a dispensação de ${rows.length} dose(s)${msgData}? Isso dará baixa no estoque.`)) return;
  const btn = document.getElementById("btnDispensar");
  if (btn) { btn.disabled = true; btn.textContent = "Dispensando…"; }
  try {
    const { error } = await window.SB.from("dispensacoes").insert(rows);
    if (error) throw error;
    await recarregarTela();
  } catch (e) {
    alert("Erro ao dispensar: " + (e.message || e));
    if (btn) { btn.disabled = false; btn.textContent = "Confirmar dispensação"; }
  }
}

async function estornarDispensacao(id) {
  if (!confirm("Estornar esta dispensação? A quantidade volta ao estoque.")) return;
  try {
    const { error } = await window.SB.from("dispensacoes").delete().eq("id", id);
    if (error) throw error;
    await recarregarTela();
  } catch (e) { alert("Erro ao estornar: " + (e.message || e)); }
}

function marcarTodas(v) {
  document.querySelectorAll(".disp-check:not(:disabled)").forEach((c) => (c.checked = v));
}

function renderPage() {
  const d = dataRef();
  const ehHoje = d === HOJE;
  const esperadas = _dosesEsperadas();
  const pendentes = esperadas.filter((x) => !_dispensadoNaData(x.pac, x.subId, x.horario));
  const dispensadasData = dispensations.filter((x) => x.data === d && x.ref && x.ref.indexOf("Dose ") === 0);
  const returnsData = returns.filter((r) => r.data === d);

  const bannerRetro = ehHoje ? "" :
    `<div class="note-box" style="border-color:#E0C9A6;background:#FBF3E4"><b>Dispensação retroativa — ${fmtDate(d)}.</b> Você está dando baixa em um dia passado, a partir do Mapa de Medicação preenchido. As saídas serão gravadas com esta data.</div>`;

  const pendentesHtml = pendentes.length ? `
    <table>
      <thead><tr><th style="width:34px"><input type="checkbox" onclick="marcarTodas(this.checked)"></th><th>Paciente</th><th>Horário</th><th>Substância</th><th>Qtd.</th><th>Lote (saída)</th></tr></thead>
      <tbody>
        ${pendentes.map((x) => {
          const semSaldo = lotesDisponiveis(x.subId).length === 0;
          return `<tr>
            <td><input type="checkbox" class="disp-check" ${semSaldo ? "disabled" : ""}
                 data-pac="${x.pac}" data-sub="${x.subId}" data-hor="${x.horario}" data-qtd="${x.qtd}" data-nome="${x.nomePac.replace(/"/g,'&quot;')}"></td>
            <td><b>${x.nomePac}</b> <span style="color:var(--muted)">· ${x.leito}</span></td>
            <td><span class="tag" style="background:var(--primary-tint);color:var(--primary-dark)">${x.horario}</span></td>
            <td>${subById(x.subId).nome}</td>
            <td class="num mono">${x.qtd}</td>
            <td>${_selLote(x.subId)}</td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>
    <div style="margin-top:14px;text-align:right"><button class="btn" id="btnDispensar" onclick="confirmarDispensacao()">Confirmar dispensação${ehHoje ? "" : " (retroativa)"}</button></div>
  ` : `<div style="color:var(--muted);font-size:13px;padding:8px 0">Nada pendente nesta data — todas as doses já foram dispensadas (ou não há prescrições ativas em ${fmtDate(d)}).</div>`;

  const dispHtml = dispensadasData.length ? `
    <table>
      <thead><tr><th>Paciente</th><th>Horário/Ref.</th><th>Substância</th><th>Lote</th><th>Qtd.</th><th></th></tr></thead>
      <tbody>
        ${dispensadasData.map((x) => `<tr>
          <td><b>${x.paciente ? patById(x.paciente).nome : "—"}</b></td>
          <td>${x.ref}</td>
          <td>${subById(x.subId).nome}</td>
          <td><span class="folio">${x.lote}</span></td>
          <td class="num mono">−${x.qtd}</td>
          <td><button class="btn ghost sm" onclick="estornarDispensacao('${x.id}')">Estornar</button></td>
        </tr>`).join("")}
      </tbody>
    </table>` : `<div style="color:var(--muted);font-size:13px;padding:8px 0">Nenhuma dose dispensada nesta data.</div>`;

  return `
    <div class="panel">
      <div class="panel-head">
        <div><div class="panel-title">Dispensação por data</div><div class="panel-title-sub">Selecione o dia para dar baixa — inclusive dias passados, a partir dos mapas preenchidos</div></div>
        <div class="toolbar">
          <label style="font-size:12px;color:var(--muted);align-self:center">Dia:</label>
          <input type="date" value="${d}" max="${HOJE}" onchange="mudarDataDisp(this.value)" style="padding:8px 10px;border:1px solid var(--line);border-radius:8px;font:inherit">
          <button class="btn ghost sm" onclick="window.printLabels()">🖶 Etiquetas do dia</button>
        </div>
      </div>
    </div>

    ${bannerRetro}

    <div class="panel">
      <div class="panel-head"><div><div class="panel-title">A dispensar — ${fmtDate(d)}</div><div class="panel-title-sub">${pendentes.length} dose(s) pendente(s) · lote de saída pré-selecionado por validade mais próxima (FEFO)</div></div></div>
      <div class="panel-body">${pendentesHtml}</div>
    </div>

    <div class="panel">
      <div class="panel-head"><div><div class="panel-title">Dispensados — ${fmtDate(d)}</div><div class="panel-title-sub">${dispensadasData.length} baixa(s) nesta data</div></div></div>
      <div class="panel-body">${dispHtml}</div>
    </div>

    <div class="panel">
      <div class="panel-head">
        <div><div class="panel-title">Devoluções ao estoque — ${fmtDate(d)}</div><div class="panel-title-sub">Medicação SOS não utilizada ou recusada, reintegrada ao lote de origem</div></div>
        <button class="btn sm" onclick="abrirFormDevolucao()">+ Registrar devolução</button>
      </div>
      <div class="panel-body">
        ${returnsData.length ? `<table>
          <thead><tr><th>Paciente</th><th>Substância</th><th>Lote</th><th>Qtd.</th><th>Motivo</th></tr></thead>
          <tbody>${returnsData.map((r) => `<tr>
            <td><b>${r.paciente ? patById(r.paciente).nome : "—"}</b></td>
            <td>${subById(r.subId).nome}</td>
            <td><span class="folio">${r.lote}</span></td>
            <td class="num mono">+${r.qtd}</td>
            <td style="color:var(--muted)">${r.motivo || ""}</td>
          </tr>`).join("")}</tbody>
        </table>` : `<div style="color:var(--muted);font-size:13px;padding:8px 0">Nenhuma devolução registrada nesta data.</div>`}
      </div>
    </div>
  `;
}

/* -------- devolução -------- */
function _opcoesLoteDevolucao(subId) {
  const lotes = lotesComSaldo(subId);
  return lotes.map((l) => `<option value="${l}">${l} (saldo ${saldoLote(l)})</option>`).join("") || `<option value="">— sem lotes —</option>`;
}
function atualizaLotesDevolucao() {
  document.getElementById("dvLote").innerHTML = _opcoesLoteDevolucao(fv("dvSub"));
}
function abrirFormDevolucao() {
  const primeiraSub = substances[0] ? substances[0].id : "";
  const corpo = `
    <div class="ff row2">
      <div><label>Data *</label><input id="dvData" type="date" value="${dataRef()}"></div>
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
