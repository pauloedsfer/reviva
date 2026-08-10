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
    prescriptions.filter((pr) => prescVigenteEm(pr) && g.subIds.indexOf(pr.subId) !== -1).forEach((pr) => {
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

/* ---- CUSTÓDIA: cobertura do próprio paciente ----
   Agrupa por PACIENTE + SUBSTÂNCIA. Um mesmo paciente pode ter mais de uma
   prescrição da mesma substância (doses diferentes ao longo do dia, ex.:
   insulina 25 UI de manhã e 15 UI à noite). Nesse caso o consumo diário é a
   SOMA das prescrições, e o saldo do lote é dividido uma única vez — antes,
   cada prescrição gerava uma linha dividindo o lote inteiro pelo seu próprio
   consumo, superestimando a cobertura. */
function _pvLinhasCustodia() {
  const mapa = {};
  prescriptions.filter((pr) => prescVigenteEm(pr)).forEach((pr) => {
    const p = patById(pr.paciente);
    if (!p || p.ativo === false) return;
    const k = pr.paciente + "|" + pr.subId;
    if (!mapa[k]) mapa[k] = { p, subId: pr.subId, consumoDia: 0, nPresc: 0, sos: 0, doses: [] };
    const g = mapa[k];
    g.nPresc++;
    if (_pvSOS(pr)) { g.sos++; return; }
    g.consumoDia += _pvConsumoDia(pr);
    g.doses.push(fmtDose(qtdPorHorario(pr)) + "×" + _pvDosesDia(pr));
  });
  // saldo da clínica por grupo (princípio + dosagem), para saber se ela cobre
  const grupos = gruposSubstancias();
  const saldoDaClinica = (subId) => {
    const gr = grupos.find((x) => x.subIds.indexOf(subId) !== -1);
    return gr ? gr.subIds.reduce((a, id) => a + saldo(id), 0) : saldo(subId);
  };

  const out = [];
  Object.values(mapa).forEach((g) => {
    const cust = lotesCustodiaDoPaciente(g.subId, g.p.id);
    const saldoCust = cust.reduce((a, l) => a + l.saldo, 0);
    const s = subById(g.subId);

    if (saldoCust > 0) {
      // medicação do próprio paciente
      const dias = g.consumoDia > 0 ? saldoCust / g.consumoDia : null;
      out.push({ tipo: "custodia", p: g.p, s, saldoCust, consumoDia: g.consumoDia, dias,
                 nPresc: g.nPresc, sos: g.sos, doses: g.doses,
                 st: _pvStatus(dias), validade: cust[0] ? cust[0].validade : null });
      return;
    }
    // sem custódia: só entra se a CLÍNICA também não tem como fornecer.
    // Nesse caso o caminho prático é o médico prescrever e a família adquirir.
    if (saldoDaClinica(g.subId) > 0) return;
    if (!g.consumoDia && !g.sos) return;
    out.push({ tipo: "faltante", p: g.p, s, saldoCust: 0, consumoDia: g.consumoDia, dias: 0,
               nPresc: g.nPresc, sos: g.sos, doses: g.doses,
               st: _pvStatus(0), validade: null });
  });
  return out.sort((a, b) => {
    // faltantes primeiro (ação imediata), depois por cobertura
    if ((a.tipo === "faltante") !== (b.tipo === "faltante")) return a.tipo === "faltante" ? -1 : 1;
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
  const nFalt = cus.filter((r) => r.tipo === "faltante").length;
  const custCrit = cus.filter((r) => r.tipo === "custodia" && (r.st.k === "crit" || r.st.k === "zero")).length;

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

  const linhasCus = cus.map((r) => {
    const falt = r.tipo === "faltante";
    return `<tr style="background:${falt ? "#FDF0EE" : (r.st.k === "crit" || r.st.k === "zero" ? "#FDF6F5" : "transparent")}">
      <td style="text-align:center;font-size:15px">${falt ? "🔴" : _pvBolinha(r.st)}</td>
      <td><b>${_esc(r.p.nome)}</b>${r.p.leito ? `<div style="font-size:11px;color:var(--muted)">leito ${_esc(r.p.leito)}</div>` : ""}</td>
      <td>${_esc(r.s.nome)}${r.nPresc > 1 ? `<div style="font-size:11px;color:var(--muted)">${r.nPresc} prescrições somadas${r.doses.length ? " (" + _esc(r.doses.join(" + ")) + ")" : ""}${r.sos ? " · " + r.sos + " SOS" : ""}</div>` : ""}</td>
      <td class="num mono">${r.consumoDia ? fmtDose(r.consumoDia) : "SOS"}</td>
      <td class="num mono">${falt ? "—" : r.saldoCust}</td>
      <td style="font-weight:700;color:${falt ? "#B04A3F" : r.st.cor}" class="${falt ? "" : "num mono"}">${falt
        ? '<span style="font-size:12px">sem estoque na clínica<br><span style="font-weight:400;font-size:11px">solicitar prescrição e aquisição pela família</span></span>'
        : _pvDias(r.dias)}</td>
      <td class="mono">${r.validade ? fmtDate(r.validade) : "—"}</td>
    </tr>`;
  }).join("");

  return `
    <div class="note-box"><b>Como é calculado.</b> O consumo diário vem das <b>prescrições ativas</b>: quantidade por horário × número de horários por dia, já contando o descarte quando a dose é fracionada (meio comprimido consome uma unidade inteira). Medicação em <b>custódia</b> cobre apenas o próprio paciente e é mostrada em quadro separado — quando ela acaba, quem precisa repor é a família. Prescrições <b>SOS</b> não entram no consumo diário porque não têm frequência definida.</div>

    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px">
      ${cartao(nCrit, "comprar agora", "#B04A3F", "#F7E3E1")}
      ${cartao(nAten, "programar compra", "#B07A2F", "#FBF3E3")}
      ${cartao(nOk, "estoque adequado", "#2C5F5A", "#E7F0E3")}
      ${cartao(custCrit + nFalt, nFalt ? "família precisa repor" : "custódia acabando", "#B04A3F", "#F7E3E1")}
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
        <button class="btn ghost sm" onclick="abrirImprimirPrevisao()">🖶 Imprimir</button>
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
        <div><div class="panel-title">Medicação por paciente — custódia e reposição</div><div class="panel-title-sub">O que o paciente já tem e o que a família precisa adquirir${nFalt ? ` · <b style="color:var(--warn)">${nFalt} item(ns) sem estoque na clínica</b>` : ""}</div></div>
        ${cus.length ? '<button class="btn ghost sm" onclick="imprimirSolicitacaoFamilia()">🖶 Lista para médico/família</button>' : ""}
      </div>
      <div class="panel-body">
        ${nFalt ? `<div class="note-box" style="margin-top:0;background:#FDF0EE;border-color:#e6b8b1"><b>${nFalt} medicamento(s) prescrito(s) sem estoque na clínica e sem custódia do paciente.</b> Enquanto a compra não chega, o caminho é solicitar ao médico a prescrição para aquisição e à família a compra. Use a lista imprimível ao lado.</div>` : ""}
        ${cus.length ? `<table>
          <thead><tr><th style="width:34px"></th><th>Paciente</th><th>Medicamento</th><th class="num">Consumo/dia</th><th class="num">Saldo</th><th>Cobertura / situação</th><th>Validade</th></tr></thead>
          <tbody>${linhasCus}</tbody></table>`
          : `<div style="color:var(--muted);font-size:13px;padding:8px 0">Nenhuma medicação em custódia e nenhum item prescrito em falta.</div>`}
      </div>
    </div>
  `;
}

/* ---- impressão: escolha da faixa de cobertura ---- */
function abrirImprimirPrevisao() {
  const est = _pvLinhasEstoque(), cus = _pvLinhasCustodia();
  const n = (arr, ks) => arr.filter((r) => ks.indexOf(r.st.k) !== -1).length;
  abrirModal("Imprimir previsão de cobertura", `
    <div class="note-box" style="margin-top:0">Escolha o que entra no relatório. Para levar à direção, a faixa <b>crítica</b> costuma bastar — é a lista do que precisa ser comprado agora.</div>
    <div class="ff"><label>O que imprimir</label>
      <select id="pvConteudo" onchange="_pvAtualizaModal()">
        <option value="ambos">Os dois quadros — estoque da clínica e medicação por paciente</option>
        <option value="estoque">Somente cobertura do estoque da clínica</option>
        <option value="pacientes">Somente medicação por paciente — custódia e reposição (${cus.length})</option>
      </select></div>
    <div class="ff" id="pvBlocoFaixa"><label>Faixa de cobertura <span style="font-weight:400;color:var(--muted)">— aplica-se ao quadro do estoque</span></label>
      <select id="pvFaixa">
        ${[["comconsumo", "Itens com consumo previsto"],
           ["crit", "🔴 Apenas crítico — comprar agora"],
           ["critaten", "🔴 + 🟡 Crítico e atenção"],
           ["aten", "🟡 Apenas atenção — programar compra"],
           ["ok", "🟢 Adequado"],
           ["sem", "⚪ Sem consumo previsto (em estoque, sem prescrição)"],
           ["todos", "Todos os itens"]].map(([k, rot]) => {
             const q = n(est, _PV_FAIXAS[k].ks);
             const sel = k === (n(est, ["crit", "zero"]) ? "crit" : "comconsumo");
             return `<option value="${k}"${q ? "" : " disabled"}${sel && q ? " selected" : ""}>${rot} (${q})</option>`;
           }).join("")}
      </select>
      <div style="font-size:11px;color:var(--muted);margin-top:4px">O número entre parênteses é quanto sai no relatório. Opções sem itens ficam indisponíveis.</div></div>
    <div class="note-box" style="margin:0">O quadro de <b>medicação por paciente</b> mostra a custódia de cada um e o que está sem estoque na clínica — é o documento que interessa à equipe e à família. O quadro de <b>estoque da clínica</b> é o que sustenta a compra junto à direção.</div>
  `, async () => {
    const cont = fv("pvConteudo") || "ambos";
    const faixa = fv("pvFaixa") || "comconsumo";
    setTimeout(() => imprimirPrevisao({
      faixa, incEst: cont !== "pacientes", incCust: cont !== "estoque",
    }), 60);
  }, "Gerar relatório");
}

// esconde a faixa de cobertura quando o relatório é só de pacientes
function _pvAtualizaModal() {
  const c = document.getElementById("pvConteudo");
  const b = document.getElementById("pvBlocoFaixa");
  if (c && b) b.style.display = c.value === "pacientes" ? "none" : "";
}

const _PV_FAIXAS = {
  todos:    { ks: ["crit", "zero", "aten", "ok", "sem"], rot: "todos os itens" },
  crit:     { ks: ["crit", "zero"],                      rot: "situação crítica — comprar agora" },
  critaten: { ks: ["crit", "zero", "aten"],              rot: "crítico e atenção" },
  aten:     { ks: ["aten"],                              rot: "atenção — programar compra" },
  ok:       { ks: ["ok"],                                rot: "cobertura adequada" },
  sem:      { ks: ["sem"],                               rot: "sem consumo previsto (em estoque, sem prescrição ativa)" },
  comconsumo: { ks: ["crit", "zero", "aten", "ok"],      rot: "itens com consumo previsto" },
};

/* ---- impressão da projeção ---- */
function imprimirPrevisao(o) {
  o = o || { faixa: "todos", incEst: true, incCust: true };
  if (o.incEst === undefined) o.incEst = true;
  const fx = _PV_FAIXAS[o.faixa] || _PV_FAIXAS.todos;
  const est0 = _pvLinhasEstoque(), cus0 = _pvLinhasCustodia();
  const est = o.incEst ? est0.filter((r) => fx.ks.indexOf(r.st.k) !== -1) : [];
  const cus = o.incCust ? cus0 : [];
  if (!o.incEst && !cus.length) { alert("Nenhuma medicação em custódia e nenhum item prescrito em falta."); return; }
  if (o.incEst && !est.length) {
    const dist = ["crit", "zero", "aten", "ok", "sem"].map((k) => ({ k, n: est0.filter((r) => r.st.k === k).length })).filter((x) => x.n);
    const rot = { crit: "crítico", zero: "sem estoque", aten: "atenção", ok: "adequado", sem: "sem consumo previsto" };
    alert(`Nenhum item em "${fx.rot}".\n\nDistribuição atual:\n` +
          dist.map((x) => `  ${x.n} ${rot[x.k]}`).join("\n") +
          `\n\nEscolha outra faixa.`);
    return;
  }
  const tb = (r) => `<tr>
    <td class="c">${r.st.k === "ok" ? "OK" : r.st.k === "aten" ? "ATENÇÃO" : r.st.k === "sem" ? "—" : "CRÍTICO"}</td>
    <td>${_esc(r.g.label)}${r.g.lista && r.g.lista !== "—" ? " [" + r.g.lista + "]" : ""}</td>
    <td class="c mono">${r.pacs || "—"}</td>
    <td class="c mono">${r.consumoDia ? fmtDose(r.consumoDia) : "—"}</td>
    <td class="c mono">${r.estoque}</td>
    <td class="c mono">${_pvDias(r.dias)}</td>
    <td class="c mono">${r.comprar || "—"}</td></tr>`;
  const tc = (r) => `<tr>
    <td class="c">${r.tipo === "faltante" ? "EM FALTA" : r.st.k === "ok" ? "OK" : r.st.k === "aten" ? "ATENÇÃO" : r.st.k === "sem" ? "—" : "CRÍTICO"}</td>
    <td>${_esc(r.p.nome)}</td><td>${_esc(r.s.nome)}</td>
    <td class="c mono">${r.consumoDia ? fmtDose(r.consumoDia) : "SOS"}</td>
    <td class="c mono">${r.tipo === "faltante" ? "—" : r.saldoCust}</td>
    <td class="c">${r.tipo === "faltante" ? "sem estoque na clínica — solicitar à família" : _pvDias(r.dias)}</td></tr>`;
  const corpo = `
    <style>
      table{width:100%;border-collapse:collapse;margin-bottom:14px}
      th,td{border:1px solid #cfd6cf;padding:4px 6px;font-size:10.5px}
      th{background:#EEF2EC;text-transform:uppercase;font-size:8.5px}
      td.c,th.c{text-align:center}.mono{font-family:"IBM Plex Mono",monospace}
      h2{font-size:11px;text-transform:uppercase;color:#2C5F5A;margin:12px 0 4px;border-bottom:1px solid #cfd6cf;padding-bottom:2px}
      .leg{font-size:9.5px;color:#6a736e;margin-bottom:8px}
      .recorte{background:#EEF2EC;border-left:3px solid #2C5F5A;padding:5px 9px;font-size:11px;margin-bottom:8px}
    </style>
    <div class="recorte"><b>Recorte deste relatório:</b> ${o.incEst ? `${_esc(fx.rot)} — ${est.length} de ${est0.length} item(ns)` : "medicação por paciente (custódia e reposição)"}${!o.incCust ? " · sem o quadro por paciente" : ""}${!o.incEst ? " · sem o quadro do estoque da clínica" : ""}.</div>
    <div class="leg">Consumo diário calculado a partir das prescrições ativas. Crítico: até ${_pvCfg.critico} dias · Atenção: até ${_pvCfg.atencao} dias · Sugestão de compra para ${_pvCfg.cobertura} dias de cobertura.</div>
    ${o.incEst ? `<h2>Cobertura do estoque da clínica</h2>
    <table><thead><tr><th class="c">Situação</th><th>Medicamento</th><th class="c">Pac.</th><th class="c">Consumo/dia</th><th class="c">Estoque</th><th class="c">Cobertura</th><th class="c">Comprar</th></tr></thead>
    <tbody>${est.map(tb).join("") || '<tr><td colspan="7" class="c">Sem dados</td></tr>'}</tbody></table>` : ""}
    ${o.incCust ? `<h2>Medicação por paciente — custódia e reposição</h2>
    <table><thead><tr><th class="c">Situação</th><th>Paciente</th><th>Medicamento</th><th class="c">Consumo/dia</th><th class="c">Saldo</th><th class="c">Cobertura</th></tr></thead>
    <tbody>${cus.map(tc).join("") || '<tr><td colspan="6" class="c">Sem custódia com saldo</td></tr>'}</tbody></table>` : ""}`;
  const totalCompra = est.reduce((a, r) => a + (r.comprar || 0), 0);
  const titulo = o.incEst ? "Previsão de Cobertura e Compras" : "Medicação por Paciente — Custódia e Reposição";
  const sub = o.incEst
    ? `Projeção com base nas prescrições vigentes em ${fmtDate(HOJE)} · recorte: ${fx.rot} · ${est.length} item(ns)`
    : `Situação por paciente em ${fmtDate(HOJE)} · ${cus.length} item(ns) · ${cus.filter((r) => r.tipo === "faltante").length} sem estoque na clínica`;
  imprimirRelatorio(titulo, sub,
    corpo.replace("<h2>Cobertura do estoque da clínica</h2>",
      `<h2>Cobertura do estoque da clínica — ${fx.rot}</h2>` +
      (totalCompra ? `<div class="leg" style="margin-bottom:6px"><b>${totalCompra}</b> unidade(s) a adquirir para ${_pvCfg.cobertura} dias de cobertura.</div>` : "")));
}

/* ============================================================
   LISTA PARA MÉDICO / FAMÍLIA
   Relação, por paciente, dos medicamentos prescritos que a clínica
   não tem em estoque e que o paciente também não trouxe. Serve para
   o médico emitir a prescrição e a família adquirir.
   ============================================================ */
function imprimirSolicitacaoFamilia() {
  const linhas = _pvLinhasCustodia().filter((r) => r.tipo === "faltante");
  if (!linhas.length) { alert("Nenhum medicamento prescrito está em falta — a clínica ou a própria custódia cobrem todos."); return; }

  const porPac = {};
  linhas.forEach((r) => { (porPac[r.p.id] = porPac[r.p.id] || { p: r.p, itens: [] }).itens.push(r); });

  const blocos = Object.values(porPac)
    .sort((a, b) => (a.p.leito || "").localeCompare(b.p.leito || "", "pt-BR", { numeric: true }) || a.p.nome.localeCompare(b.p.nome, "pt-BR"))
    .map((g) => `
      <section class="pac">
        <div class="pac-h"><b>${_esc(g.p.nome)}</b>${g.p.leito ? ` · leito ${_esc(g.p.leito)}` : ""}${g.p.prontuario ? ` · prontuário ${_esc(g.p.prontuario)}` : ""}</div>
        <table><thead><tr><th>Medicamento</th><th class="c">Uso por dia</th><th class="c">Sugestão p/ 30 dias</th><th class="c">Prescrito</th><th class="c">Adquirido</th></tr></thead>
        <tbody>${g.itens.map((r) => `<tr>
          <td><b>${_esc(r.s.nome)}</b>${r.sos ? ' <span class="sos">uso se necessário</span>' : ""}</td>
          <td class="c mono">${r.consumoDia ? fmtDose(r.consumoDia) + " " + _esc(r.s.unidade || "") : "SOS"}</td>
          <td class="c mono">${r.consumoDia ? Math.ceil(r.consumoDia * 30) + " " + _esc(r.s.unidade || "") : "—"}</td>
          <td class="c bx"></td><td class="c bx"></td></tr>`).join("")}</tbody></table>
      </section>`).join("");

  const corpo = `
    <style>
      .aviso{background:#FDF0EE;border-left:3px solid #B04A3F;padding:7px 10px;font-size:11px;margin-bottom:12px;line-height:1.5}
      .pac{border:1px solid #cfd6cf;border-radius:6px;padding:8px 10px;margin-bottom:10px;break-inside:avoid;page-break-inside:avoid}
      .pac-h{font-size:12.5px;border-bottom:1px solid #1E2A28;padding-bottom:3px;margin-bottom:5px}
      table{width:100%;border-collapse:collapse}
      th,td{border:1px solid #cfd6cf;padding:4px 6px;font-size:11px}
      th{background:#EEF2EC;font-size:8.5px;text-transform:uppercase}
      td.c,th.c{text-align:center}.mono{font-family:"IBM Plex Mono",monospace}
      td.bx{width:64px;height:24px}
      .sos{font-size:9px;color:#B07A2F;font-weight:600}
      .nota{font-size:10px;color:#4a544f;margin-top:10px;line-height:1.5}
    </style>
    <div class="aviso">
      <b>Medicamentos prescritos sem disponibilidade na farmácia da clínica.</b>
      Estes itens constam da prescrição vigente, não há saldo no estoque da clínica e o paciente não possui medicação própria em custódia.
      Solicita-se ao médico assistente a emissão da prescrição para aquisição e, à família, a compra e entrega na clínica,
      onde a medicação será registrada em custódia e utilizada exclusivamente para o próprio paciente.
    </div>
    ${blocos}
    <div class="nota">
      A quantidade sugerida corresponde a 30 dias de tratamento no esquema prescrito e pode ser ajustada pelo médico.
      Ao entregar, a medicação deve estar na embalagem original, com lote e validade legíveis.
      Medicamentos sujeitos a controle especial exigem receita própria e retenção conforme a Portaria SVS/MS nº 344/1998.
    </div>`;

  imprimirRelatorio("Medicamentos a Adquirir — Solicitação à Família",
    `${linhas.length} item(ns) · ${Object.keys(porPac).length} paciente(s) · emitido em ${fmtDate(HOJE)}`, corpo);
}
