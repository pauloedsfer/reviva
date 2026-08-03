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

// Paciente internado NA data: admitido até lá e sem alta anterior à data.
function _pacienteInternadoNaData(p, d) {
  if (p.admissao && p.admissao > d) return false;
  if (p.dataAlta && p.dataAlta < d) return false;
  return true;
}

// Prescrições ativas NA data de referência (início <= data). Sem início = sempre.
function _prescricoesNaData(d) {
  return prescriptions.filter((pr) => pr.ativo !== false && (!pr.dataInicio || pr.dataInicio <= d));
}

// Doses esperadas para a data de referência.
function _dosesEsperadas() {
  const d = dataRef();
  const list = [];
  patients.filter((p) => _pacienteInternadoNaData(p, d)).forEach((p) => {
    _prescricoesNaData(d).filter((pr) => pr.paciente === p.id).forEach((pr) => {
      pr.horarios.forEach((h) => {
        list.push({ pac: p.id, nomePac: p.nome, leito: p.leito || "", subId: pr.subId,
                    dose: pr.dose || "", horario: h,
                    qtd: qtdConsumida(pr),          // sai do estoque (unidade inteira em sólidos)
                    qtdAdm: qtdPorHorario(pr),      // administrada ao paciente (pode ser fração)
                    descarte: temDescarte(pr) });
      });
    });
  });
  // ordena por horário (JEJUM primeiro, SOS por último) e, dentro dele, por leito/paciente
  return list.sort((a, b) =>
    (_horValor(a.horario) - _horValor(b.horario)) ||
    String(a.horario).localeCompare(String(b.horario)) ||
    (a.leito || "").localeCompare(b.leito || "", "pt-BR", { numeric: true }) ||
    a.nomePac.localeCompare(b.nomePac, "pt-BR"));
}
function _dispensadoNaData(pac, subId, horario) {
  const d = dataRef();
  return dispensations.some((x) => x.data === d && x.paciente === pac && x.subId === subId && x.ref === "Dose " + horario);
}

/* -------- etiquetas (para a data de referência) -------- */
/* Kits do dia: um pacote por paciente e por horário.
   Cada item leva a quantidade a separar — sem ela a etiqueta não serve
   para montar o kit. Doses fracionadas mostram o que administrar e o que
   sai do estoque, e a medicação de custódia vem sinalizada. */
function _gerarEtiquetas(opts) {
  opts = opts || {};
  const d = dataRef();
  const labels = [];
  const alvos = patients.filter((p) => _pacienteInternadoNaData(p, d))
    .filter((p) => !opts.pac || p.id === opts.pac)
    .sort((a, b) => (a.leito || "").localeCompare(b.leito || "", "pt-BR", { numeric: true }) || a.nome.localeCompare(b.nome, "pt-BR"));
  alvos.forEach((p) => {
    const pres = _prescricoesNaData(d).filter((pr) => pr.paciente === p.id);
    const slots = [...new Set(pres.flatMap((pr) => pr.horarios))]
      .filter((h) => opts.incluirSOS ? true : !_ehSOSHor(h))
      .filter((h) => !opts.horarios || !opts.horarios.length || opts.horarios.indexOf(h) !== -1)
      .sort((a, b) => _horValor(a) - _horValor(b));
    slots.forEach((slot) => {
      const items = pres.filter((pr) => pr.horarios.includes(slot)).map((pr) => {
        const cust = lotesCustodiaDoPaciente(pr.subId, p.id).reduce((a, l) => a + l.saldo, 0) > 0;
        return { pr, sub: subById(pr.subId), qtdAdm: qtdPorHorario(pr), qtd: qtdConsumida(pr),
                 descarte: temDescarte(pr), custodia: cust };
      }).sort((a, b) => a.sub.nome.localeCompare(b.sub.nome, "pt-BR"));
      if (items.length) labels.push({ patient: p, slot, items });
    });
  });
  return labels;
}
window.printLabels = function (opts) {
  const est = window.ESTAB || {};
  const hosp = est.nome_fantasia || est.razao_social || "Hospital Reviva";
  const dataTxt = fmtDate(dataRef());
  const labels = _gerarEtiquetas(opts);
  if (!labels.length) { alert("Não há prescrições ativas para gerar etiquetas nessa data."); return; }
  const cards = labels.map((l) => `
    <div class="lbl">
      <div class="lbl-h">${hosp} — Dose Unitária · ${dataTxt}</div>
      <div class="lbl-p">${l.patient.nome}</div>
      <div class="lbl-b">${l.patient.leito || ""}</div>
      <div class="lbl-t">${l.slot}${l.slot === "SOS" ? " — se necessário" : ""}</div>
      <div class="lbl-m">${l.items.map((it) => `<div class="mi"><span class="mq">${fmtDose(it.qtdAdm)}</span> ${_esc(it.sub.nome)}${it.custodia ? ' <span class="cust">★ custódia</span>' : ""}${it.descarte ? `<span class="dsc">separar ${fmtDose(it.qtd)}</span>` : ""}</div>`).join("")}</div>
      <div class="lbl-f">Separou: __________ &nbsp; Conferiu: __________</div>
    </div>`).join("");
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Etiquetas — Dose Unitária</title>
    <style>@page{size:A4;margin:10mm}*{box-sizing:border-box}body{font-family:"Public Sans",Arial,sans-serif;margin:0}
      .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6mm}
      .lbl{border:1px solid #333;border-radius:6px;padding:8px 10px;height:46mm;display:flex;flex-direction:column;page-break-inside:avoid}
      .lbl-h{font-size:8.5px;color:#555;border-bottom:1px solid #ccc;padding-bottom:3px}
      .lbl-p{font-weight:700;font-size:13px;margin-top:5px}.lbl-b{font-size:11px;color:#333}
      .lbl-t{display:inline-block;align-self:flex-start;background:#1E2A28;color:#fff;font-size:11px;padding:2px 8px;border-radius:10px;margin:5px 0;font-weight:600}
      .lbl-m{font-size:11px;line-height:1.3;flex:1}.lbl-f{font-size:8.5px;color:#555;border-top:1px dashed #ccc;padding-top:4px}
      .lbl-m .mi{margin:2px 0;display:flex;gap:4px;align-items:baseline;flex-wrap:wrap}
      .lbl-m .mq{display:inline-block;min-width:22px;text-align:center;background:#EEF2EC;border:1px solid #cfd6cf;border-radius:4px;font-weight:700;font-size:10.5px;padding:0 3px}
      .lbl-m .cust{font-size:8.5px;color:#B07A2F;font-weight:600}
      .lbl-m .dsc{font-size:8.5px;color:#777}
      .toolbar{position:fixed;top:12px;right:12px}.toolbar button{background:#2C5F5A;color:#fff;border:none;padding:9px 15px;border-radius:8px;cursor:pointer;font:inherit}
      @media print{.toolbar{display:none}}</style></head><body>
      <div class="toolbar"><button onclick="window.print()">Imprimir / Salvar PDF</button></div>
      <div class="grid">${cards}</div></body></html>`;
  const win = window.open("", "_blank");
  if (!win) { alert("Permita pop-ups para imprimir as etiquetas."); return; }
  win.document.open(); win.document.write(html); win.document.close();
};

/* -------- dispensação -------- */
function _selLote(subId, pacienteId) {
  const cust = lotesCustodiaDoPaciente(subId, pacienteId);   // custódia DELE — preferência
  const geral = lotesDisponiveis(subId);                     // estoque geral — escolha manual
  if (!cust.length && !geral.length) return `<select class="disp-lote" disabled><option value="">sem saldo</option></select>`;
  const opts = [
    ...cust.map((l, i) => `<option value="${l.lote}"${i === 0 ? " selected" : ""}>★ custódia do paciente · ${l.lote} · saldo ${l.saldo} · val ${fmtDate(l.validade)}</option>`),
    ...geral.map((l, i) => `<option value="${l.lote}"${!cust.length && i === 0 ? " selected" : ""}>estoque · ${l.lote} · saldo ${l.saldo} · val ${fmtDate(l.validade)}</option>`),
  ];
  return `<select class="disp-lote">${opts.join("")}</select>`;
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

/* ============================================================
   Organização por HORÁRIO
   A dispensação segue o relógio: às 9h separam-se as doses das 9h,
   de todos os pacientes. Por isso as pendências são agrupadas por
   horário (e não por paciente), com filtro por período.
   SOS fica fora da rotina — só aparece quando pedido, porque é
   lançado retroativamente, após a enfermagem administrar.
   ============================================================ */
let _dispFiltro = [];   // horários selecionados; vazio = todos, menos SOS

function _ehSOSHor(h) { return /\bSOS\b|S\.?O\.?S\.?|SE\s+NECESS/i.test(String(h)); }
function _ehJejumHor(h) { return /JEJUM/i.test(String(h)); }
function _horValor(h) {
  if (_ehJejumHor(h)) return -1;
  if (_ehSOSHor(h)) return 9999;
  const m = String(h).match(/\d{1,2}/);
  return m ? parseInt(m[0], 10) : 9998;
}
function _periodoHor(h) {
  if (_ehJejumHor(h)) return "manha";
  if (_ehSOSHor(h)) return "sos";
  const v = _horValor(h);
  if (v >= 5 && v < 12) return "manha";
  if (v >= 12 && v < 18) return "tarde";
  return "noite";
}
const _PER_ROT = { manha: "Manhã", tarde: "Tarde", noite: "Noite", sos: "SOS" };

// horários distintos entre as doses pendentes, em ordem
function _horariosPendentes(pend) {
  return [...new Set(pend.map((x) => x.horario))].sort((a, b) => _horValor(a) - _horValor(b) || String(a).localeCompare(String(b)));
}
// período sugerido pelo relógio (só quando a data é hoje)
function _periodoAgora() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "manha";
  if (h >= 12 && h < 18) return "tarde";
  return "noite";
}
function _filtrarPend(pend) {
  if (!_dispFiltro.length) return pend.filter((x) => !_ehSOSHor(x.horario));
  return pend.filter((x) => _dispFiltro.indexOf(x.horario) !== -1);
}
function _dispSetFiltro(lista) {
  _dispFiltro = lista;
  document.getElementById("viewport").innerHTML = renderPage();
}
function togglePeriodoDisp(per, pendJSON) {
  const todos = JSON.parse(decodeURIComponent(pendJSON));
  const doPer = todos.filter((h) => _periodoHor(h) === per);
  const jaTodos = doPer.length && doPer.every((h) => _dispFiltro.indexOf(h) !== -1);
  _dispSetFiltro(jaTodos ? [] : doPer);
}
function toggleHorarioDisp(h) {
  const i = _dispFiltro.indexOf(h);
  const novo = _dispFiltro.slice();
  if (i >= 0) novo.splice(i, 1); else novo.push(h);
  _dispSetFiltro(novo);
}
function marcarGrupo(hor, v) {
  document.querySelectorAll('.disp-check[data-hor="' + hor + '"]:not(:disabled)').forEach((c) => (c.checked = v));
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

  // ---- filtros por horário / período ----
  const horTodos = _horariosPendentes(pendentes);
  const horJSON = encodeURIComponent(JSON.stringify(horTodos));
  const perDisp = [...new Set(horTodos.map(_periodoHor))].sort((a, b) => ["manha","tarde","noite","sos"].indexOf(a) - ["manha","tarde","noite","sos"].indexOf(b));
  const perAgora = ehHoje ? _periodoAgora() : null;
  const nSOS = pendentes.filter((x) => _ehSOSHor(x.horario)).length;

  const chipPer = perDisp.map((p) => {
    const doPer = horTodos.filter((h) => _periodoHor(h) === p);
    const ativo = doPer.length && doPer.every((h) => _dispFiltro.indexOf(h) !== -1) && _dispFiltro.length === doPer.length;
    const n = pendentes.filter((x) => _periodoHor(x.horario) === p).length;
    const sug = p === perAgora && !_dispFiltro.length;
    return `<button class="btn ${ativo ? "" : "ghost"} sm" onclick="togglePeriodoDisp('${p}','${horJSON}')"
      style="${sug ? "box-shadow:0 0 0 2px var(--primary-tint)" : ""}">${_PER_ROT[p]} (${n})${sug ? " · agora" : ""}</button>`;
  }).join("");

  const chipHor = horTodos.filter((h) => !_ehSOSHor(h)).map((h) => {
    const ativo = _dispFiltro.indexOf(h) !== -1;
    const n = pendentes.filter((x) => x.horario === h).length;
    return `<button class="btn ${ativo ? "" : "ghost"} sm" onclick="toggleHorarioDisp('${h}')">${h} (${n})</button>`;
  }).join("");

  const visiveis = _filtrarPend(pendentes);
  const grupos = _horariosPendentes(visiveis);

  const barraFiltro = pendentes.length ? `
    <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:12px">
      <button class="btn ${_dispFiltro.length ? "ghost" : ""} sm" onclick="_dispSetFiltro([])">Todos (${pendentes.length - nSOS})</button>
      ${chipPer}
      <span style="width:1px;height:22px;background:var(--line);margin:0 4px"></span>
      ${chipHor}
    </div>
    ${nSOS ? `<div class="note-box" style="margin:0 0 12px">
      <b>${nSOS} dose(s) SOS pendente(s).</b> SOS não entra na rotina: é lançado depois que a enfermagem administra, com a data em que ocorreu.
      <button class="btn ghost sm" style="margin-left:8px" onclick="_dispSetFiltro(${JSON.stringify(horTodos.filter(_ehSOSHor)).replace(/"/g, "&quot;")})">Ver apenas SOS</button></div>` : ""}` : "";

  const linha = (x) => {
    const semSaldo = lotesDisponiveis(x.subId).length === 0 && lotesCustodiaDoPaciente(x.subId, x.pac).length === 0;
    return `<tr>
      <td><input type="checkbox" class="disp-check" ${semSaldo ? "disabled" : ""}
           data-pac="${x.pac}" data-sub="${x.subId}" data-hor="${x.horario}" data-qtd="${x.qtd}" data-nome="${x.nomePac.replace(/"/g,'&quot;')}"></td>
      <td><b>${x.nomePac}</b> <span style="color:var(--muted)">· ${x.leito}</span></td>
      <td>${subById(x.subId).nome}</td>
      <td class="num mono">${fmtDose(x.qtdAdm)}${x.descarte ? `<div style="font-size:10px;color:var(--muted);font-family:inherit">baixa ${fmtDose(x.qtd)} (descarta ${fmtDose(x.qtd - x.qtdAdm)})</div>` : ""}</td>
      <td>${_selLote(x.subId, x.pac)}</td>
    </tr>`;
  };

  const corpoGrupos = grupos.map((h) => {
    const doGrupo = visiveis.filter((x) => x.horario === h);
    const sos = _ehSOSHor(h);
    return `<tr class="grupo-hor">
        <td colspan="5" style="background:${sos ? "#FBF3E3" : "var(--primary-dark)"};color:${sos ? "#B07A2F" : "#fff"};padding:6px 10px;font-size:12px;font-weight:700;letter-spacing:.04em">
          ${_esc(h)} <span style="font-weight:400;opacity:.85">· ${doGrupo.length} dose(s) · ${_PER_ROT[_periodoHor(h)]}</span>
          <button class="btn ghost sm" style="float:right;margin-top:-2px;background:rgba(255,255,255,.15);border-color:rgba(255,255,255,.3);color:${sos ? "#B07A2F" : "#fff"}" onclick="marcarGrupo('${_esc(h)}', true)">marcar todas</button>
        </td></tr>
      ${doGrupo.map(linha).join("")}`;
  }).join("");

  const pendentesHtml = pendentes.length ? `
    ${barraFiltro}
    ${visiveis.length ? `<table>
      <thead><tr><th style="width:34px"><input type="checkbox" onclick="marcarTodas(this.checked)"></th><th>Paciente</th><th>Substância</th><th>Qtd.</th><th>Lote (saída)</th></tr></thead>
      <tbody>${corpoGrupos}</tbody>
    </table>
    <div style="margin-top:14px;display:flex;justify-content:space-between;align-items:center;gap:12px">
      <div style="font-size:12.5px;color:var(--muted)">${visiveis.length} dose(s) na seleção atual${_dispFiltro.length ? ` · <a href="#" onclick="_dispSetFiltro([]);return false" style="color:var(--primary-dark)">ver todas</a>` : ""}</div>
      <button class="btn" id="btnDispensar" onclick="confirmarDispensacao()">Confirmar dispensação${ehHoje ? "" : " (retroativa)"}</button>
    </div>`
    : `<div style="color:var(--muted);font-size:13px;padding:8px 0">Nenhuma dose no filtro selecionado. <a href="#" onclick="_dispSetFiltro([]);return false" style="color:var(--primary-dark)">Ver todas</a>.</div>`}
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
          <button class="btn ghost sm" onclick="abrirSeparacao()">🖶 Separação da farmácia</button>
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

/* ============================================================
   SEPARAÇÃO DA FARMÁCIA — checklist e etiquetas de kit
   Checklist: uma folha por paciente, com os horários do dia e a
   quantidade de cada medicamento, para conferir enquanto separa.
   Etiquetas: um pacote por paciente e por horário.
   ============================================================ */
function abrirSeparacao() {
  const d = dataRef();
  const internados = patients.filter((p) => _pacienteInternadoNaData(p, d))
    .sort((a, b) => (a.leito || "").localeCompare(b.leito || "", "pt-BR", { numeric: true }) || a.nome.localeCompare(b.nome, "pt-BR"));
  if (!internados.length) { alert("Nenhum paciente internado nesta data."); return; }

  const horTodos = [...new Set(_dosesEsperadas().map((x) => x.horario))].sort((a, b) => _horValor(a) - _horValor(b));
  const chips = horTodos.filter((h) => !_ehSOSHor(h)).map((h) =>
    `<label style="display:inline-flex;align-items:center;gap:5px;font-size:12.5px;margin:0 10px 6px 0">
      <input type="checkbox" class="sep-hor" value="${_esc(h)}"${!_dispFiltro.length || _dispFiltro.indexOf(h) !== -1 ? " checked" : ""}> ${_esc(h)}</label>`).join("");

  abrirModal(`Separação da farmácia — ${fmtDate(d)}`, `
    <div class="note-box" style="margin-top:0">Gera o material para montar os kits do dia. O <b>checklist</b> é a folha de conferência da farmácia (uma por paciente); as <b>etiquetas</b> identificam cada pacote — um por paciente e por horário.</div>
    <div class="ff"><label>Paciente</label>
      <select id="sepPac">
        <option value="">★ TODOS os internados (${internados.length})</option>
        ${internados.map((p) => `<option value="${p.id}">${_esc(p.nome)}${p.leito ? " · leito " + _esc(p.leito) : ""}</option>`).join("")}
      </select></div>
    <div class="ff"><label>Horários a incluir</label>
      <div style="padding:4px 0">${chips || '<span style="color:var(--muted);font-size:12.5px">Nenhum horário com prescrição nesta data.</span>'}</div>
      <label style="display:inline-flex;align-items:center;gap:5px;font-size:12.5px">
        <input type="checkbox" id="sepSOS"> Incluir SOS <span style="color:var(--muted)">(normalmente não entra no kit)</span></label></div>
    <div class="ff"><label>O que imprimir</label>
      <select id="sepTipo">
        <option value="check">Checklist de separação (folha por paciente)</option>
        <option value="etiq">Etiquetas dos kits (uma por horário)</option>
        <option value="ambos">Os dois</option>
      </select></div>
  `, async () => {
    const pac = fv("sepPac");
    const horarios = Array.from(document.querySelectorAll(".sep-hor:checked")).map((c) => c.value);
    const incluirSOS = document.getElementById("sepSOS").checked;
    if (!horarios.length && !incluirSOS) throw new Error("Selecione ao menos um horário.");
    const tipo = fv("sepTipo");
    const opts = { pac: pac || null, horarios, incluirSOS };
    setTimeout(() => {
      if (tipo === "check" || tipo === "ambos") imprimirChecklistSeparacao(opts);
      if (tipo === "etiq" || tipo === "ambos") setTimeout(() => window.printLabels(opts), 400);
    }, 60);
  }, "Gerar");
}

function imprimirChecklistSeparacao(opts) {
  const d = dataRef();
  const est = window.ESTAB || {};
  const labels = _gerarEtiquetas(opts);
  if (!labels.length) { alert("Nada a separar com os filtros escolhidos."); return; }

  // agrupa por paciente
  const porPac = {};
  labels.forEach((l) => { (porPac[l.patient.id] = porPac[l.patient.id] || { p: l.patient, slots: [] }).slots.push(l); });

  const folha = (g) => {
    const totalItens = g.slots.reduce((a, s) => a + s.items.length, 0);
    const blocos = g.slots.map((s) => `
      <div class="hor">
        <div class="hor-h">${_esc(s.slot)}${_ehSOSHor(s.slot) ? " — se necessário" : ""}<span class="hor-n">${s.items.length} item(ns)</span></div>
        <table><thead><tr><th class="ck">✓</th><th class="qt">Qtd.</th><th>Medicamento</th><th class="lt">Lote separado</th></tr></thead>
        <tbody>${s.items.map((it) => `<tr>
          <td class="ck"></td>
          <td class="qt mono"><b>${fmtDose(it.qtdAdm)}</b>${it.descarte ? `<div class="sep">separar ${fmtDose(it.qtd)}</div>` : ""}</td>
          <td>${_esc(it.sub.nome)}${it.custodia ? ' <span class="cust">★ custódia do paciente</span>' : ""}</td>
          <td class="lt"></td></tr>`).join("")}</tbody></table>
      </div>`).join("");
    return `<section class="folha">
      <div class="cab">
        <div class="cab-nome">${_esc(est.nome_fantasia || est.razao_social || "Clínica Reviva")}</div>
        <div class="cab-tit">CHECKLIST DE SEPARAÇÃO — DOSE UNITÁRIA</div>
        <div class="cab-dt">${fmtDate(d)}</div>
      </div>
      <div class="pac">
        <div><span class="rot">Paciente:</span> <b>${_esc(g.p.nome)}</b></div>
        <div><span class="rot">Leito:</span> ${_esc(g.p.leito || "—")} &nbsp; <span class="rot">Prontuário:</span> ${_esc(g.p.prontuario || "—")}</div>
        <div><span class="rot">Kits:</span> ${g.slots.length} pacote(s) · ${totalItens} item(ns)</div>
      </div>
      ${blocos}
      <div class="assin">
        <div class="l">Separado por (farmácia)<br>_______________________ &nbsp; ___/___/____</div>
        <div class="l">Conferido por<br>_______________________ &nbsp; ___/___/____</div>
      </div>
      <div class="rod">Conferir medicamento, dose e paciente antes de fechar o pacote. Dose fracionada: separar a unidade inteira indicada. ★ custódia = usar o medicamento do próprio paciente.</div>
    </section>`;
  };

  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Checklist de separação — ${fmtDate(d)}</title>
  <style>
  @page{size:A4 portrait;margin:11mm 11mm}
  *{box-sizing:border-box}body{font-family:"Public Sans",Arial,sans-serif;color:#1E2A28;font-size:11px;margin:0}
  .folha{page-break-after:always}.folha:last-child{page-break-after:auto}
  .cab{display:flex;align-items:baseline;gap:10px;border-bottom:2px solid #1E2A28;padding-bottom:5px;margin-bottom:7px}
  .cab-nome{font-size:12px;font-weight:700}.cab-tit{flex:1;text-align:center;font-size:12.5px;font-weight:700;letter-spacing:.05em}
  .cab-dt{font-size:12px;font-weight:700}
  .pac{border:1px solid #1E2A28;border-radius:5px;padding:6px 10px;margin-bottom:9px;display:flex;gap:22px;flex-wrap:wrap;font-size:12px}
  .pac .rot{font-size:9px;text-transform:uppercase;color:#6a736e;font-weight:600}
  .hor{margin-bottom:9px;break-inside:avoid;page-break-inside:avoid}
  .hor-h{background:#1E2A28;color:#fff;font-size:11.5px;font-weight:700;padding:3px 9px;border-radius:4px 4px 0 0;letter-spacing:.04em}
  .hor-h .hor-n{float:right;font-weight:400;opacity:.85;font-size:10px}
  table{width:100%;border-collapse:collapse}
  th,td{border:1px solid #cfd6cf;padding:4px 6px;font-size:11px;height:22px}
  th{background:#EEF2EC;font-size:8.5px;text-transform:uppercase;font-weight:700}
  .ck{width:26px;text-align:center}.qt{width:62px;text-align:center}.lt{width:110px}
  .mono{font-family:"IBM Plex Mono",monospace}
  .sep{font-size:8.5px;color:#777;font-family:"Public Sans",Arial,sans-serif;font-weight:400}
  .cust{font-size:9px;color:#B07A2F;font-weight:600}
  .assin{display:flex;gap:26px;margin-top:16px}
  .assin .l{flex:1;border-top:1px solid #1E2A28;padding-top:5px;font-size:9.5px;color:#4a544f;text-align:center}
  .rod{margin-top:8px;font-size:8.5px;color:#8a938d;text-align:center;border-top:1px solid #e2e7e1;padding-top:5px}
  .btn{position:fixed;top:12px;right:12px;background:#2C5F5A;color:#fff;border:none;padding:9px 15px;border-radius:8px;cursor:pointer;font:inherit;z-index:9}
  @media print{.btn{display:none}}
  </style></head><body>
  <button class="btn" onclick="window.print()">Imprimir / Salvar PDF</button>
  ${Object.values(porPac).map(folha).join("")}
  </body></html>`;
  const win = window.open("", "_blank");
  if (!win) { alert("Permita pop-ups para imprimir."); return; }
  win.document.open(); win.document.write(html); win.document.close();
}
