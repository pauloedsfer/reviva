/* ============================================================
   paginas/mapa.js — Hospital Reviva
   Mapa Diário de Medicação para a enfermagem. Gera um impresso
   por dia (um por página), a partir das prescrições ativas, com
   Nome/Idade/Leito e colunas por período (Manhã/Tarde/Noite ou
   Manhã/Noite). Inclui linhas em branco por paciente e fichas de
   paciente em branco, para anotarem novas medicações/pacientes à
   mão no fim de semana — e depois dar baixa no sistema.
   ============================================================ */

// Paciente internado na data d (admitido até lá, sem alta anterior).
function _internadoEm(p, dISO) {
  if (p.admissao && p.admissao > dISO) return false;
  if (p.dataAlta && p.dataAlta < dISO) return false;
  return true;
}

function _idade(dataNasc) {
  if (!dataNasc) return "";
  const n = new Date(dataNasc), h = new Date();
  let a = h.getFullYear() - n.getFullYear();
  const mm = h.getMonth() - n.getMonth();
  if (mm < 0 || (mm === 0 && h.getDate() < n.getDate())) a--;
  return a >= 0 && a < 130 ? a + " anos" : "";
}

// Período de um horário ("08h" -> manha). SOS/sem número -> null.
function _periodoDe(hor, nPeriodos) {
  const m = String(hor).match(/\d{1,2}/);
  if (!m) return null;
  const h = parseInt(m[0], 10);
  if (nPeriodos === 2) return h < 12 ? "manha" : "noite";
  if (h >= 5 && h < 12) return "manha";
  if (h >= 12 && h < 18) return "tarde";
  return "noite";
}

function _fmtDiaLongo(d) {
  const dias = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
  return `${dias[d.getDay()]}, ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function _linhasVazias(n, cols) {
  let r = "";
  for (let i = 0; i < n; i++) {
    r += `<tr><td>&nbsp;</td>${'<td></td>'.repeat(cols)}</tr>`;
  }
  return r;
}

function _tabelaPaciente(p, periodos, blankRows) {
  const cols = periodos.length;
  const pres = prescriptions.filter((pr) => pr.paciente === p.id);
  const linhas = pres.map((pr) => {
    const cells = {};
    periodos.forEach((per) => (cells[per.key] = []));
    let sos = false;
    (pr.horarios || []).forEach((hor) => {
      const per = _periodoDe(hor, cols);
      if (!per) { sos = true; return; }
      if (cells[per]) cells[per].push(hor);
    });
    const nome = subById(pr.subId).nome + (pr.dose ? " — " + pr.dose : "") + (sos ? " (SOS)" : "");
    const tds = periodos.map((per) => `<td class="chk">${cells[per.key].join("<br>")}</td>`).join("");
    return `<tr><td class="med">${nome}</td>${tds}</tr>`;
  }).join("");
  const cabPer = periodos.map((per) => `<th>${per.label}</th>`).join("");
  return `
    <div class="pac">
      <div class="pac-id"><b>${p.nome}</b> &nbsp;·&nbsp; Idade: ${_idade(p.dataNascimento) || "____"} &nbsp;·&nbsp; Leito: ${p.leito || "____"}</div>
      <table>
        <thead><tr><th class="med">Medicação</th>${cabPer}</tr></thead>
        <tbody>${linhas}${_linhasVazias(blankRows, cols)}</tbody>
      </table>
    </div>`;
}

function _fichaVazia(periodos, blankRows) {
  const cols = periodos.length;
  const cabPer = periodos.map((per) => `<th>${per.label}</th>`).join("");
  return `
    <div class="pac">
      <div class="pac-id">Paciente: ______________________________ &nbsp;·&nbsp; Idade: ______ &nbsp;·&nbsp; Leito: ______</div>
      <table>
        <thead><tr><th class="med">Medicação</th>${cabPer}</tr></thead>
        <tbody>${_linhasVazias(blankRows + 2, cols)}</tbody>
      </table>
    </div>`;
}

function imprimirMapa() {
  const nPer = document.getElementById("mapaPeriodos").value === "2" ? 2 : 3;
  const periodos = nPer === 2
    ? [{ key: "manha", label: "Manhã" }, { key: "noite", label: "Noite" }]
    : [{ key: "manha", label: "Manhã" }, { key: "tarde", label: "Tarde" }, { key: "noite", label: "Noite" }];
  const dataIni = document.getElementById("mapaData").value || new Date().toISOString().slice(0, 10);
  const nDias = Math.max(1, Math.min(14, parseInt(document.getElementById("mapaDias").value, 10) || 1));
  const blankRows = Math.max(0, Math.min(10, parseInt(document.getElementById("mapaLinhas").value, 10)));
  const blankPacs = Math.max(0, Math.min(10, parseInt(document.getElementById("mapaFichas").value, 10)));
  const pularSemPresc = document.getElementById("mapaSemPresc").value === "pular";

  const est = window.ESTAB || {};
  const hosp = est.nome_fantasia || est.razao_social || "Hospital Reviva";
  let pacsAll = patients.slice().sort((a, b) => String(a.leito || "").localeCompare(String(b.leito || "")) || a.nome.localeCompare(b.nome));
  if (pularSemPresc) pacsAll = pacsAll.filter((p) => _temPrescricao(p));

  const paginas = [];
  for (let i = 0; i < nDias; i++) {
    const d = new Date(dataIni + "T00:00:00");
    d.setDate(d.getDate() + i);
    const dISO = d.toISOString().slice(0, 10);
    const pacs = pacsAll.filter((p) => _internadoEm(p, dISO));
    const corpoPacientes = pacs.map((p) => _tabelaPaciente(p, periodos, blankRows)).join("");
    const fichas = Array.from({ length: blankPacs }, () => _fichaVazia(periodos, blankRows)).join("");
    paginas.push(`
      <section class="dia">
        <div class="cab">
          <div class="cab-h">${hosp}</div>
          <div class="cab-t">Mapa Diário de Medicação</div>
          <div class="cab-d">${_fmtDiaLongo(d)}</div>
        </div>
        ${corpoPacientes || '<div class="vazio">Nenhum paciente com prescrição ativa.</div>'}
        ${fichas ? `<div class="novos">Novos pacientes / anotações do plantão</div>${fichas}` : ""}
        <div class="rodape">Enfermagem responsável: ____________________________  ·  Assinatura: ____________________________</div>
      </section>`);
  }

  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Mapa de Medicação</title>
  <style>
    @page{ size:A4 portrait; margin:12mm 10mm; }
    *{ box-sizing:border-box; } body{ font-family:"Public Sans",Arial,sans-serif; color:#1E2A28; margin:0; font-size:12px; }
    .dia{ page-break-after:always; }
    .dia:last-child{ page-break-after:auto; }
    .cab{ border-bottom:2px solid #2C5F5A; padding-bottom:6px; margin-bottom:10px; display:flex; align-items:baseline; gap:12px; flex-wrap:wrap; }
    .cab-h{ font-weight:700; font-size:14px; } .cab-t{ font-size:13px; } .cab-d{ margin-left:auto; font-size:12px; color:#4a544f; }
    .pac{ margin-bottom:12px; page-break-inside:avoid; }
    .pac-id{ font-size:12.5px; margin-bottom:3px; }
    table{ width:100%; border-collapse:collapse; }
    th,td{ border:1px solid #b9c2b9; padding:5px 7px; font-size:11.5px; }
    th{ background:#EEF2EC; text-transform:uppercase; font-size:10px; letter-spacing:.03em; }
    th.med,td.med{ width:44%; text-align:left; }
    td.chk{ height:26px; text-align:center; vertical-align:middle; }
    .novos{ margin:14px 0 6px; font-weight:700; font-size:12px; color:#8B4A3A; border-top:1px dashed #b9c2b9; padding-top:8px; }
    .rodape{ margin-top:14px; font-size:11px; color:#4a544f; }
    .vazio{ color:#6a736e; padding:10px 0; }
    .toolbar{ position:fixed; top:12px; right:12px; }
    .toolbar button{ background:#2C5F5A; color:#fff; border:none; padding:9px 15px; border-radius:8px; cursor:pointer; font:inherit; }
    @media print{ .toolbar{ display:none; } }
  </style></head><body>
    <div class="toolbar"><button onclick="window.print()">Imprimir / Salvar PDF</button></div>
    ${paginas.join("")}
  </body></html>`;

  const win = window.open("", "_blank");
  if (!win) { alert("Permita pop-ups para imprimir o mapa."); return; }
  win.document.open(); win.document.write(html); win.document.close();
}

/* ---- formato POR PACIENTE (prontuário): 1 folha/paciente, dias em colunas ---- */
function _diasSpan(dataIni, nDias) {
  const dias = [];
  for (let i = 0; i < nDias; i++) {
    const d = new Date(dataIni + "T00:00:00");
    d.setDate(d.getDate() + i);
    dias.push(d);
  }
  return dias;
}
const _DOW = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
function _temPrescricao(p) { return prescriptions.some((pr) => pr.paciente === p.id && (pr.horarios || []).length); }

function imprimirMapaPaciente() {
  const nPer = document.getElementById("mapaPeriodos").value === "2" ? 2 : 3;
  const periodos = nPer === 2
    ? [{ key: "manha", label: "Manhã" }, { key: "noite", label: "Noite" }]
    : [{ key: "manha", label: "Manhã" }, { key: "tarde", label: "Tarde" }, { key: "noite", label: "Noite" }];
  const dataIni = document.getElementById("mapaData").value || new Date().toISOString().slice(0, 10);
  const nDias = Math.max(1, Math.min(14, parseInt(document.getElementById("mapaDias").value, 10) || 5));
  const blankRows = Math.max(0, Math.min(10, parseInt(document.getElementById("mapaLinhas").value, 10)));
  const blankPacs = Math.max(0, Math.min(10, parseInt(document.getElementById("mapaFichas").value, 10)));
  const pularSemPresc = document.getElementById("mapaSemPresc").value === "pular";
  const est = window.ESTAB || {};
  const hosp = est.nome_fantasia || est.razao_social || "Hospital Reviva";
  const dias = _diasSpan(dataIni, nDias);

  // pacientes internados em algum dia do período — uma PÁGINA por paciente
  let pacs = patients
    .filter((p) => dias.some((d) => _internadoEm(p, d.toISOString().slice(0, 10))))
    .sort((a, b) => String(a.leito || "").localeCompare(String(b.leito || "")) || a.nome.localeCompare(b.nome));
  if (pularSemPresc) pacs = pacs.filter((p) => _temPrescricao(p));
  if (!pacs.length && !blankPacs) { alert("Nenhum paciente com prescrição no período (ou todos foram ignorados). Ajuste a opção 'Pacientes sem prescrição' ou gere fichas em branco."); return; }

  const paginas = pacs.map((p) => {
    // repete o MESMO bloco do Mapa Diário, um por dia, para este paciente
    const blocosDia = dias.map((d) => {
      const iso = d.toISOString().slice(0, 10);
      if (!_internadoEm(p, iso)) return "";   // não repete dias fora da internação
      return `
        <div class="dia-bloco">
          <div class="dia-cab"><span class="dia-data">${_fmtDiaLongo(d)}</span> <span class="dia-pac"><b>${p.nome}</b> · Idade: ${_idade(p.dataNascimento) || "____"} · Leito: ${p.leito || "____"}${p.prontuario ? " · Prontuário: " + p.prontuario : ""}</span></div>
          ${_tabelaPaciente(p, periodos, blankRows)}
        </div>`;
    }).join("");

    return `
      <section class="folha">
        <div class="cab">
          <div class="cab-h">${hosp}</div>
          <div class="cab-t">Mapa de Medicação — ${p.nome}</div>
          <div class="cab-d">${fmtDate(dias[0].toISOString().slice(0,10))} a ${fmtDate(dias[dias.length-1].toISOString().slice(0,10))}</div>
        </div>
        ${blocosDia}
        <div class="rodape">Enfermagem responsável: ____________________________ &nbsp;·&nbsp; Arquivar no prontuário do paciente</div>
      </section>`;
  }).join("");

  // fichas em branco para novos pacientes (uma folha cada, blocos de dia vazios)
  const brancas = Array.from({ length: blankPacs }, () => {
    const blocos = dias.map((d) => `
      <div class="dia-bloco">
        <div class="dia-cab"><span class="dia-data">${_fmtDiaLongo(d)}</span> <span class="dia-pac"><b>Paciente:</b> __________________ · Idade: ____ · Leito: ____</span></div>
        <table>
          <thead><tr><th class="med">Medicação</th>${periodos.map((per) => `<th>${per.label}</th>`).join("")}</tr></thead>
          <tbody>${_linhasVazias(blankRows + 3, periodos.length)}</tbody>
        </table>
      </div>`).join("");
    return `
      <section class="folha">
        <div class="cab"><div class="cab-h">${hosp}</div><div class="cab-t">Mapa de Medicação — novo paciente</div>
          <div class="cab-d">${fmtDate(dias[0].toISOString().slice(0,10))} a ${fmtDate(dias[dias.length-1].toISOString().slice(0,10))}</div></div>
        ${blocos}
        <div class="rodape">Enfermagem responsável: ____________________________ &nbsp;·&nbsp; Arquivar no prontuário do paciente</div>
      </section>`;
  }).join("");

  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Mapa por Paciente</title>
  <style>
    @page{ size:A4 portrait; margin:12mm 10mm; }
    *{ box-sizing:border-box; } body{ font-family:"Public Sans",Arial,sans-serif; color:#1E2A28; margin:0; font-size:12px; }
    .folha{ page-break-after:always; } .folha:last-child{ page-break-after:auto; }
    .cab{ border-bottom:2px solid #2C5F5A; padding-bottom:6px; margin-bottom:10px; display:flex; align-items:baseline; gap:12px; flex-wrap:wrap; }
    .cab-h{ font-weight:700; font-size:14px; } .cab-t{ font-size:12.5px; } .cab-d{ margin-left:auto; font-size:12px; color:#4a544f; }
    .dia-bloco{ margin-bottom:12px; page-break-inside:avoid; }
    .dia-cab{ background:#EEF2EC; border-left:3px solid #2C5F5A; padding:4px 8px; font-size:12px; margin-bottom:4px; }
    .dia-data{ font-weight:700; text-transform:capitalize; } .dia-pac{ color:#4a544f; margin-left:8px; }
    .pac .pac-id{ display:none; }  /* o cabeçalho do dia já mostra o paciente */
    table{ width:100%; border-collapse:collapse; }
    th,td{ border:1px solid #b9c2b9; padding:4px 6px; font-size:11px; }
    th{ background:#EEF2EC; text-transform:uppercase; font-size:9.5px; letter-spacing:.02em; }
    th.med,td.med{ text-align:left; width:46%; }
    td.chk{ height:26px; text-align:center; vertical-align:middle; }
    .rodape{ margin-top:10px; font-size:11px; color:#4a544f; }
    .toolbar{ position:fixed; top:12px; right:12px; }
    .toolbar button{ background:#2C5F5A; color:#fff; border:none; padding:9px 15px; border-radius:8px; cursor:pointer; font:inherit; }
    @media print{ .toolbar{ display:none; } }
  </style></head><body>
    <div class="toolbar"><button onclick="window.print()">Imprimir / Salvar PDF</button></div>
    ${paginas}${brancas}
  </body></html>`;

  const win = window.open("", "_blank");
  if (!win) { alert("Permita pop-ups para imprimir o mapa."); return; }
  win.document.open(); win.document.write(html); win.document.close();
}

function renderPage() {
  const hoje = new Date().toISOString().slice(0, 10);
  return `
    <div class="note-box">Gera o Mapa de Medicação da enfermagem em dois formatos: <b>por paciente</b> (uma folha por paciente com os dias em colunas — para rubricar a administração e arquivar no prontuário) ou <b>por dia</b> (uma folha por dia com todos os pacientes). As <b>linhas em branco</b> servem para anotarem à mão novas medicações — depois você dá baixa no sistema.</div>

    <style>
      .mapa-cfg{ display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:14px 18px; }
      .mapa-cfg label{ display:block; font-size:12.5px; font-weight:600; margin:0 0 5px; }
      .mapa-cfg select, .mapa-cfg input{ width:100%; padding:9px 11px; border:1px solid var(--line); border-radius:8px; font:inherit; font-size:13.5px; background:#fff; }
    </style>

    <div class="panel">
      <div class="panel-head"><div><div class="panel-title">Configurar impressão</div><div class="panel-title-sub">${patients.length} paciente(s) com cadastro ativo entram no mapa</div></div></div>
      <div class="panel-body">
        <div class="mapa-cfg">
          <div><label>Períodos</label>
            <select id="mapaPeriodos">
              <option value="3">Manhã / Tarde / Noite</option>
              <option value="2">Manhã / Noite</option>
            </select>
          </div>
          <div><label>Data inicial</label><input id="mapaData" type="date" value="${hoje}"></div>
          <div><label>Quantos dias</label>
            <select id="mapaDias">
              <option>1</option><option>2</option><option>3</option><option>4</option><option selected>5</option><option>6</option><option>7</option>
            </select>
          </div>
          <div><label>Linhas em branco por paciente</label><input id="mapaLinhas" type="number" min="0" max="10" value="3"></div>
          <div><label>Fichas de paciente em branco (no fim)</label><input id="mapaFichas" type="number" min="0" max="10" value="2"></div>
          <div><label>Pacientes sem prescrição</label>
            <select id="mapaSemPresc">
              <option value="incluir">Incluir no mapa</option>
              <option value="pular" selected>Ignorar (não imprimir)</option>
            </select>
          </div>
        </div>
        <div style="margin-top:18px;display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn" onclick="imprimirMapaPaciente()">🖶 Mapa por paciente (prontuário)</button>
          <button class="btn ghost" onclick="imprimirMapa()">🖶 Mapa por dia (geral)</button>
        </div>
        <div style="margin-top:10px;font-size:12.5px;color:var(--muted)"><b>Por paciente:</b> uma folha por paciente, com o bloco do dia (Manhã/Tarde/Noite) repetido para cada dia do período — para a enfermagem marcar a administração e arquivar no prontuário. <b>Por dia:</b> uma folha por dia com todos os pacientes (visão geral do posto).</div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head"><div><div class="panel-title">Como o horário vira coluna</div></div></div>
      <div class="panel-body" style="font-size:13px;color:var(--muted)">
        <b>3 períodos:</b> Manhã 05h–11h · Tarde 12h–17h · Noite 18h–04h. &nbsp;•&nbsp; <b>2 períodos:</b> Manhã até 11h · Noite a partir de 12h.<br>
        Medicações marcadas como <b>SOS</b> aparecem com "(SOS)" no nome, para a enfermagem administrar quando necessário.
      </div>
    </div>
  `;
}
