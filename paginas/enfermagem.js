/* ============================================================
   paginas/enfermagem.js — Hospital Reviva
   Documentos e registros próprios da enfermagem — somente impressão.
   Não grava dados: gera a folha em papel, com cabeçalho da clínica e
   do paciente já preenchidos (ou em branco, para preenchimento manual).
   Primeiro documento: Sinais Vitais.
   ============================================================ */

let _enfCfg = { doc: "sinaisvitais", pac: "", linhas: 30, folhas: 1 };

function _enfSet(campo, valor) {
  _enfCfg[campo] = campo === "linhas" || campo === "folhas" ? (parseInt(valor, 10) || 1) : valor;
  document.getElementById("viewport").innerHTML = renderPage();
}

// idade a partir da data de nascimento
function _enfIdade(d) {
  if (!d) return "";
  const t = new Date(), n = new Date(d);
  let a = t.getFullYear() - n.getFullYear();
  const m = t.getMonth() - n.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < n.getDate())) a--;
  return a >= 0 && a < 130 ? String(a) : "";
}

// cabeçalho institucional (logo + dados do estabelecimento), igual ao impresso em uso
function _enfCabecalho() {
  const est = window.ESTAB || {};
  const logo = new URL("assets/logo-reviva.png", location.href).href;
  const linha2 = [est.cnpj ? "CNPJ: " + _esc(est.cnpj) : "", _esc(est.endereco || ""), _esc(est.municipio_uf || "")]
    .filter(Boolean).join(" · ");
  return `
    <div class="cab">
      <div class="cab-logo"><img src="${logo}" onerror="this.style.display='none'"></div>
      <div class="cab-txt">
        <div class="cab-nome">${_esc(est.razao_social || est.nome_fantasia || "Hospital Reviva")}</div>
        ${linha2 ? `<div class="cab-sub">${linha2}</div>` : ""}
      </div>
    </div>`;
}

// bloco de identificação do paciente (preenchido ou em branco)
function _enfBlocoPaciente(p) {
  const L = (rot, val, larg) =>
    `<div class="campo" style="flex:${larg || 1}"><span class="rot">${rot}:</span><span class="val">${val || ""}</span></div>`;
  if (!p) {
    return `<div class="pac">
      <div class="linha">${L("Nome", "", 3)}${L("Idade", "", 1)}${L("Sexo", "", 1)}</div>
      <div class="linha">${L("Prontuário", "", 1)}${L("Leito", "", 1)}${L("Data de internação", "", 1.4)}</div>
    </div>`;
  }
  return `<div class="pac">
    <div class="linha">${L("Nome", `<b>${_esc(p.nome)}</b>`, 3)}${L("Idade", _enfIdade(p.dataNascimento), 1)}${L("Sexo", "", 1)}</div>
    <div class="linha">${L("Prontuário", _esc(p.prontuario || ""), 1)}${L("Leito", _esc(p.leito || ""), 1)}${L("Data de internação", p.admissao ? fmtDate(p.admissao) : "", 1.4)}</div>
  </div>`;
}

/* ---- FOLHA DE SINAIS VITAIS ---- */
function imprimirSinaisVitais() {
  const p = _enfCfg.pac ? patById(_enfCfg.pac) : null;
  const nLin = Math.max(5, Math.min(60, _enfCfg.linhas));
  const nFolhas = Math.max(1, Math.min(20, _enfCfg.folhas));

  const colunas = ["Data", "Hora", "PA", "FC (bpm)", "SpO₂ (%)", "Temperatura (°C)", "HGT", "Assinatura da Enfermagem"];
  const th = colunas.map((c, i) => `<th${i === colunas.length - 1 ? ' class="ass"' : ""}>${c}</th>`).join("");
  const linhas = Array.from({ length: nLin }, () => `<tr>${colunas.map(() => "<td></td>").join("")}</tr>`).join("");

  const folha = () => `
    <section class="folha">
      ${_enfCabecalho()}
      <h1>SINAIS VITAIS</h1>
      ${_enfBlocoPaciente(p)}
      <table><thead><tr>${th}</tr></thead><tbody>${linhas}</tbody></table>
      <div class="rod">Registro de enfermagem — documento integrante do prontuário do paciente.</div>
    </section>`;

  const corpo = Array.from({ length: nFolhas }, folha).join("");

  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Sinais Vitais${p ? " — " + _esc(p.nome) : ""}</title>
  <style>
  @page{size:A4 portrait;margin:10mm 10mm}
  *{box-sizing:border-box}
  body{font-family:"Public Sans",Arial,sans-serif;color:#1E2A28;font-size:11px;margin:0}
  .folha{page-break-after:always}.folha:last-child{page-break-after:auto}
  .cab{display:flex;align-items:center;gap:12px;border:1px solid #1E2A28;border-bottom:none;padding:7px 10px}
  .cab-logo img{height:40px;width:auto;display:block}
  .cab-txt{flex:1;text-align:center}
  .cab-nome{font-size:15px;font-weight:700;letter-spacing:.02em}
  .cab-sub{font-size:9.5px;color:#4a544f;margin-top:2px}
  h1{font-size:13px;letter-spacing:.08em;text-align:center;margin:0;padding:4px 0;border:1px solid #1E2A28;border-bottom:none;background:#EEF2EC;font-weight:700}
  .pac{border:1px solid #1E2A28;border-bottom:none;padding:5px 10px}
  .pac .linha{display:flex;gap:14px;margin:3px 0}
  .campo{display:flex;align-items:baseline;gap:5px;border-bottom:1px dotted #9aa39d;min-height:16px}
  .campo .rot{font-size:9px;text-transform:uppercase;color:#6a736e;font-weight:600;white-space:nowrap}
  .campo .val{font-size:11.5px;flex:1}
  table{width:100%;border-collapse:collapse}
  th,td{border:1px solid #1E2A28;padding:0 4px;font-size:10px;height:21px;text-align:center}
  th{background:#EEF2EC;font-size:8.5px;text-transform:uppercase;font-weight:700;height:24px}
  th.ass{width:22%}
  .rod{margin-top:5px;font-size:8.5px;color:#8a938d;text-align:center}
  .btn{position:fixed;top:12px;right:12px;background:#2C5F5A;color:#fff;border:none;padding:9px 15px;border-radius:8px;cursor:pointer;font:inherit;z-index:9}
  @media print{.btn{display:none}}
  </style></head><body>
  <button class="btn" onclick="window.print()">Imprimir / Salvar PDF</button>
  ${corpo}
  </body></html>`;

  const win = window.open("", "_blank");
  if (!win) { alert("Permita pop-ups para imprimir."); return; }
  win.document.open(); win.document.write(html); win.document.close();
}

/* ---- catálogo de documentos da enfermagem (cresce com o tempo) ---- */
const _ENF_DOCS = [
  { id: "sinaisvitais", nome: "Sinais Vitais",
    desc: "Data, hora, PA, FC, SpO₂, temperatura, HGT e assinatura da enfermagem.",
    fn: "imprimirSinaisVitais()" },
];

function renderPage() {
  const optPac = `<option value="">— em branco (preencher à mão) —</option>` +
    patients.filter((p) => p.ativo !== false)
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
      .map((p) => `<option value="${p.id}"${p.id === _enfCfg.pac ? " selected" : ""}>${p.nome}${p.leito ? " · leito " + p.leito : ""}</option>`).join("");

  const cards = _ENF_DOCS.map((d) => `
    <div style="border:1px solid var(--line);border-radius:10px;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;gap:16px">
      <div>
        <div style="font-weight:700;font-size:14.5px">${d.nome}</div>
        <div style="font-size:12.5px;color:var(--muted);margin-top:2px">${d.desc}</div>
      </div>
      <button class="btn sm" onclick="${d.fn}">🖶 Imprimir</button>
    </div>`).join("");

  return `
    <div class="note-box">Documentos próprios da enfermagem, para <b>impressão e preenchimento à mão</b>. O sistema não guarda esses registros — a folha impressa e assinada é o documento do prontuário. Escolha um paciente para sair com o cabeçalho preenchido, ou deixe em branco.</div>

    <div class="panel">
      <div class="panel-head">
        <div><div class="panel-title">Configuração da impressão</div><div class="panel-title-sub">Vale para os documentos abaixo</div></div>
      </div>
      <div class="panel-body">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px 14px">
          <div><label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px">Paciente</label>
            <select onchange="_enfSet('pac', this.value)" style="width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:8px;font:inherit">${optPac}</select></div>
          <div><label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px">Linhas por folha</label>
            <input type="number" min="5" max="60" value="${_enfCfg.linhas}" onchange="_enfSet('linhas', this.value)" style="width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:8px;font:inherit"></div>
          <div><label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px">Quantidade de folhas</label>
            <input type="number" min="1" max="20" value="${_enfCfg.folhas}" onchange="_enfSet('folhas', this.value)" style="width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:8px;font:inherit"></div>
        </div>
        <div class="note-box" style="margin-top:12px">${_enfCfg.pac
          ? `Sairá com o cabeçalho de <b>${_esc(patById(_enfCfg.pac).nome)}</b> preenchido (nome, idade, prontuário, leito e data de internação). O campo <b>Sexo</b> fica em branco — não consta no cadastro.`
          : "Sairá <b>em branco</b>, com as linhas de identificação para preencher à mão."}</div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head">
        <div><div class="panel-title">Documentos disponíveis</div><div class="panel-title-sub">${_ENF_DOCS.length} documento(s)</div></div>
      </div>
      <div class="panel-body">
        <div style="display:flex;flex-direction:column;gap:10px">${cards}</div>
      </div>
    </div>
  `;
}
