/* ============================================================
   paginas/previsao.js — Hospital Reviva
   Previsão de cobertura e alertas de compra.

   Base do cálculo: as PRESCRIÇÕES ATIVAS (consumo conhecido), e não o
   histórico de dispensação — numa unidade nova o histórico é curto e
   subestima o consumo. Para cada medicamento soma-se o consumo diário de
   todos os pacientes em uso e compara-se com o saldo disponível.

   Custódia é tratada em separado: a medicação em custódia pertence ao
   paciente, cobre apenas o consumo DELE e, ao acabar, quem precisa
   providenciar é a família — não a clínica.
   ============================================================ */

let _pvCfg = { critico: 7, atencao: 15, cobertura: 30 };

function _pvSet(campo, valor) {
  _pvCfg[campo] = Math.max(1, parseInt(valor, 10) || 1);
  document.getElementById("viewport").innerHTML = renderPage();
}

// prescrição "se necessário" não tem consumo diário previsível
function _pvSOS(pr) {
  return (pr.horarios || []).some((h) => /\bSOS\b|S\.?O\.?S\.?|SE\s+NECESS/i.test(String(h)));
}
// horários com hora definida (JEJUM conta como uma administração do dia)
function _pvDosesDia(pr) {
  return (pr.horarios || []).filter((h) => !/\bSOS\b|S\.?O\.?S\.?|SE\s+NECESS/i.test(String(h))).length;
}
// consumo diário de uma prescrição, já considerando o descarte de fração
function _pvConsumoDia(pr) {
  return qtdConsumida(pr) * _pvDosesDia(pr);
}

function _pvStatus(dias) {
  if (dias === null) return { k: "sem", cor: "#8a938d", bg: "#F1F3F1", txt: "sem consumo previsto" };
  if (dias <= 0) return { k: "zero", cor: "#B04A3F", bg: "#F7E3E1", txt: "SEM ESTOQUE" };
  if (dias <= _pvCfg.critico) return { k: "crit", cor: "#B04A3F", bg: "#F7E3E1", txt: "comprar agora" };
  if (dias <= _pvCfg.atencao) return { k: "aten", cor: "#B07A2F", bg: "#FBF3E3", txt: "programar compra" };
  return { k: "ok", cor: "#2C5F5A", bg: "#E7F0E3", txt: "adequado" };
}
function _pvBolinha(st) {
  const b = st.k === "ok" ? "🟢" : st.k === "aten" ? "🟡" : st.k === "sem" ? "⚪" : "🔴";
  return `<span title="${st.txt}">${b}</span>`;
}
function _pvDias(d) {
  if (d === null) return "—";
  if (d === Infinity) return "∞";
  return d < 1 ? "<1 dia" : Math.floor(d) + (Math.floor(d) === 1 ? " dia" : " dias");
}

/* ---- ESTOQUE GERAL: consumo dos pacientes que NÃO têm custódia ---- */
function _pvLinhasEstoque() {
  const grupos = gruposSubstancias();
  return grupos.map((g) => {
    let consumoDia = 0, pacs = [], sos = 0;
    prescriptions.filter((pr) => pr.ativo !== false && g.subIds.indexOf(pr.subId) !== -1).forEach((pr) => {
      const p = patById(pr.paciente);
      if (!p || p.ativo === false) return;               // paciente com alta não consome
      if (_pvSOS(pr)) { sos++; return; }
      // paciente com custódia própria desta substância é coberto pela custódia
      const temCustodia = lotesCustodiaDoPaciente(pr.subId, pr.paciente)
        .reduce((a, l) => a + l.saldo, 0) > 0;
      if (temCustodia) return;
      consumoDia += _pvConsumoDia(pr);
      if (pacs.indexOf(pr.paciente) === -1) pacs.push(pr.paciente);
    });
    const estoque = g.subIds.reduce((a, id) => a + saldo(id), 0);
    const dias = consumoDia > 0 ? estoque / consumoDia : null;
    const necessario = consumoDia * _pvCfg.cobertura;
    const comprar = consumoDia > 0 ? Math.max(0, Math.ceil(necessario - estoque)) : 0;
    return { g, consumoDia, pacs: pacs.length, sos, estoque, dias, comprar, st: _pvStatus(dias) };
  }).filter((r) => r.consumoDia > 0 || r.estoque > 0 || r.sos > 0)
    .sort((a, b) => {
      const va = a.dias === null ? 1e9 : a.dias, vb = b.dias === null ? 1e9 : b.dias;
      return va - vb || a.g.label.localeCompare(b.g.label, "pt-BR");
    });
}

/* ---- CUSTÓDIA: cobertura do próprio paciente ---- */
function _pvLinhasCustodia() {
  const out = [];
  prescriptions.filter((pr) => pr.ativo !== false).forEach((pr) => {
    const p = patById(pr.paciente);
    if (!p || p.ativo === false) return;
    const cust = lotesCustodiaDoPaciente(pr.subId, pr.paciente);
    const saldoCust = cust.reduce((a, l) => a + l.saldo, 0);
    if (saldoCust <= 0) return;
    const consumoDia = _pvSOS(pr) ? 0 : _pvConsumoDia(pr);
    const dias = consumoDia > 0 ? saldoCust / consumoDia : null;
    const s = subById(pr.subId);
    out.push({ p, s, saldoCust, consumoDia, dias, st: _pvStatus(dias),
               validade: cust[0] ? cust[0].validade : null });
  });
  return out.sort((a, b) => {
    const va = a.dias === null ? 1e9 : a.dias, vb = b.dias === null ? 1e9 : b.dias;
    return va - vb || a.p.nome.localeCompare(b.p.nome, "pt-BR");
  });
}

function renderPage() {
  const est = _pvLinhasEstoque();
  const cus = _pvLinhasCustodia();
  const cont = (arr, k) => arr.filter((r) => r.st.k === k).length;
  const nCrit = cont(est, "crit") + cont(est, "zero");
  const nAten = cont(est, "aten");
  const nOk = cont(est, "ok");
  const custCrit = cont(cus, "crit") + cont(cus, "zero");

  const cartao = (n, rot, cor, bg) => `
    <div style="flex:1;min-width:130px;background:${bg};border:1px solid ${cor}33;border-radius:10px;padding:12px 14px">
      <div style="font-size:26px;font-weight:700;color:${cor};line-height:1">${n}</div>
      <div style="font-size:12px;color:${cor};margin-top:3px">${rot}</div>
    </div>`;

  const linhasEst = est.map((r) => `
    <tr style="background:${r.st.k === "crit" || r.st.k === "zero" ? "#FDF6F5" : "transparent"}">
      <td style="text-align:center;font-size:15px">${_pvBolinha(r.st)}</td>
      <td><b>${_esc(r.g.label)}</b>${r.g.lista && r.g.lista !== "—" ? ` <span class="tag ${listaTagClass(r.g.lista)}">${r.g.lista}</span>` : ""}
        ${r.g.nomes.length > 1 ? `<div style="font-size:11px;color:var(--muted)">${_esc(r.g.nomes.join(" · "))}</div>` : ""}
        ${r.sos ? `<div style="font-size:11px;color:var(--muted)">+ ${r.sos} prescrição(ões) SOS (consumo não previsível)</div>` : ""}</td>
      <td class="num mono">${r.pacs || "—"}</td>
      <td class="num mono">${r.consumoDia ? fmtDose(r.consumoDia) : "—"}</td>
      <td class="num mono">${r.estoque}</td>
      <td class="num mono" style="font-weight:700;color:${r.st.cor}">${_pvDias(r.dias)}</td>
      <td class="num mono">${r.comprar ? "<b>" + r.comprar + "</b>" : "—"}</td>
    </tr>`).join("");

  const linhasCus = cus.map((r) => `
    <tr style="background:${r.st.k === "crit" || r.st.k === "zero" ? "#FDF6F5" : "transparent"}">
      <td style="text-align:center;font-size:15px">${_pvBolinha(r.st)}</td>
      <td><b>${_esc(r.p.nome)}</b>${r.p.leito ? `<div style="font-size:11px;color:var(--muted)">leito ${_esc(r.p.leito)}</div>` : ""}</td>
      <td>${_esc(r.s.nome)}</td>
      <td class="num mono">${r.consumoDia ? fmtDose(r.consumoDia) : "SOS"}</td>
      <td class="num mono">${r.saldoCust}</td>
      <td class="num mono" style="font-weight:700;color:${r.st.cor}">${_pvDias(r.dias)}</td>
      <td class="mono">${r.validade ? fmtDate(r.validade) : "—"}</td>
    </tr>`).join("");

  return `
    <div class="note-box"><b>Como é calculado.</b> O consumo diário vem das <b>prescrições ativas</b>: quantidade por horário × número de horários por dia, já contando o descarte quando a dose é fracionada (meio comprimido consome uma unidade inteira). Medicação em <b>custódia</b> cobre apenas o próprio paciente e é mostrada em quadro separado — quando ela acaba, quem precisa repor é a família. Prescrições <b>SOS</b> não entram no consumo diário porque não têm frequência definida.</div>

    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px">
      ${cartao(nCrit, "comprar agora", "#B04A3F", "#F7E3E1")}
      ${cartao(nAten, "programar compra", "#B07A2F", "#FBF3E3")}
      ${cartao(nOk, "estoque adequado", "#2C5F5A", "#E7F0E3")}
      ${cartao(custCrit, "custódia acabando", "#B04A3F", "#F7E3E1")}
    </div>

    <div class="panel">
      <div class="panel-head">
        <div><div class="panel-title">Parâmetros de alerta</div><div class="panel-title-sub">Ajuste conforme o prazo de entrega dos fornecedores</div></div>
      </div>
      <div class="panel-body">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px 14px">
          <div><label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px">🔴 Crítico até (dias)</label>
            <input type="number" min="1" max="60" value="${_pvCfg.critico}" onchange="_pvSet('critico', this.value)" style="width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:8px;font:inherit"></div>
          <div><label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px">🟡 Atenção até (dias)</label>
            <input type="number" min="2" max="120" value="${_pvCfg.atencao}" onchange="_pvSet('atencao', this.value)" style="width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:8px;font:inherit"></div>
          <div><label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px">Cobertura desejada (dias)</label>
            <input type="number" min="7" max="180" value="${_pvCfg.cobertura}" onchange="_pvSet('cobertura', this.value)" style="width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:8px;font:inherit"></div>
        </div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head">
        <div><div class="panel-title">Cobertura do estoque da clínica</div><div class="panel-title-sub">Por princípio ativo + dosagem · ordenado do mais urgente</div></div>
        <button class="btn ghost sm" onclick="imprimirPrevisao()">🖶 Imprimir</button>
      </div>
      <div class="panel-body">
        ${est.length ? `<table>
          <thead><tr><th style="width:34px"></th><th>Medicamento</th><th class="num">Pac.</th><th class="num">Consumo/dia</th><th class="num">Estoque</th><th class="num">Cobertura</th><th class="num">Comprar p/ ${_pvCfg.cobertura}d</th></tr></thead>
          <tbody>${linhasEst}</tbody></table>`
          : `<div style="color:var(--muted);font-size:13px;padding:8px 0">Nenhuma prescrição ativa e nenhum saldo em estoque.</div>`}
        <div class="foot-signoff"><span>Farmacêutico RT: ${rtLinha()}</span><span>Projeção baseada nas prescrições vigentes em ${fmtDate(HOJE)}</span></div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head">
        <div><div class="panel-title">Medicação em custódia — cobertura por paciente</div><div class="panel-title-sub">Ao acabar, a reposição é responsabilidade da família</div></div>
      </div>
      <div class="panel-body">
        ${cus.length ? `<table>
          <thead><tr><th style="width:34px"></th><th>Paciente</th><th>Medicamento</th><th class="num">Consumo/dia</th><th class="num">Saldo</th><th class="num">Cobertura</th><th>Validade</th></tr></thead>
          <tbody>${linhasCus}</tbody></table>`
          : `<div style="color:var(--muted);font-size:13px;padding:8px 0">Nenhum paciente com medicação em custódia com saldo.</div>`}
      </div>
    </div>
  `;
}

/* ---- impressão da projeção ---- */
function imprimirPrevisao() {
  const est = _pvLinhasEstoque(), cus = _pvLinhasCustodia();
  const tb = (r) => `<tr>
    <td class="c">${r.st.k === "ok" ? "OK" : r.st.k === "aten" ? "ATENÇÃO" : r.st.k === "sem" ? "—" : "CRÍTICO"}</td>
    <td>${_esc(r.g.label)}${r.g.lista && r.g.lista !== "—" ? " [" + r.g.lista + "]" : ""}</td>
    <td class="c mono">${r.pacs || "—"}</td>
    <td class="c mono">${r.consumoDia ? fmtDose(r.consumoDia) : "—"}</td>
    <td class="c mono">${r.estoque}</td>
    <td class="c mono">${_pvDias(r.dias)}</td>
    <td class="c mono">${r.comprar || "—"}</td></tr>`;
  const tc = (r) => `<tr>
    <td class="c">${r.st.k === "ok" ? "OK" : r.st.k === "aten" ? "ATENÇÃO" : r.st.k === "sem" ? "—" : "CRÍTICO"}</td>
    <td>${_esc(r.p.nome)}</td><td>${_esc(r.s.nome)}</td>
    <td class="c mono">${r.consumoDia ? fmtDose(r.consumoDia) : "SOS"}</td>
    <td class="c mono">${r.saldoCust}</td><td class="c mono">${_pvDias(r.dias)}</td></tr>`;
  const corpo = `
    <style>
      table{width:100%;border-collapse:collapse;margin-bottom:14px}
      th,td{border:1px solid #cfd6cf;padding:4px 6px;font-size:10.5px}
      th{background:#EEF2EC;text-transform:uppercase;font-size:8.5px}
      td.c,th.c{text-align:center}.mono{font-family:"IBM Plex Mono",monospace}
      h2{font-size:11px;text-transform:uppercase;color:#2C5F5A;margin:12px 0 4px;border-bottom:1px solid #cfd6cf;padding-bottom:2px}
      .leg{font-size:9.5px;color:#6a736e;margin-bottom:8px}
    </style>
    <div class="leg">Consumo diário calculado a partir das prescrições ativas. Crítico: até ${_pvCfg.critico} dias · Atenção: até ${_pvCfg.atencao} dias · Sugestão de compra para ${_pvCfg.cobertura} dias de cobertura.</div>
    <h2>Cobertura do estoque da clínica</h2>
    <table><thead><tr><th class="c">Situação</th><th>Medicamento</th><th class="c">Pac.</th><th class="c">Consumo/dia</th><th class="c">Estoque</th><th class="c">Cobertura</th><th class="c">Comprar</th></tr></thead>
    <tbody>${est.map(tb).join("") || '<tr><td colspan="7" class="c">Sem dados</td></tr>'}</tbody></table>
    <h2>Medicação em custódia — cobertura por paciente</h2>
    <table><thead><tr><th class="c">Situação</th><th>Paciente</th><th>Medicamento</th><th class="c">Consumo/dia</th><th class="c">Saldo</th><th class="c">Cobertura</th></tr></thead>
    <tbody>${cus.map(tc).join("") || '<tr><td colspan="6" class="c">Sem custódia com saldo</td></tr>'}</tbody></table>`;
  imprimirRelatorio("Previsão de Cobertura e Compras",
    `Projeção com base nas prescrições vigentes em ${fmtDate(HOJE)}`, corpo);
}
