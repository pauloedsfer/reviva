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

let _pvCfg = { critico: 7, atencao: 15, cobertura: 30, janela: 90, base: "90" };

function _pvSetTxt(campo, valor) {
  _pvCfg[campo] = valor;
  document.getElementById("viewport").innerHTML = renderPage();
}

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

/* ============================================================
   COBERTURA PELO CONSUMO REAL

   O quadro de cima projeta pelas PRESCRIÇÕES ATIVAS: é o consumo que se
   sabe que vai acontecer. Este aqui olha para trás, para o que de fato
   saiu da farmácia. Os dois respondem perguntas diferentes e por isso
   convivem:

     · prescrição responde "o que os pacientes de hoje vão consumir";
     · consumo real responde "o que esta casa gasta por mês", e pega o que
       a prescrição não enxerga — SOS, intercorrência, reposição de
       carrinho, consumo de setor, perda e descarte.

   Para REPOSIÇÃO DE ESTOQUE o consumo real costuma ser a base melhor,
   porque é ele que esvazia a prateleira. A prescrição subestima: não
   conta o que sai sem prescrição individual, que nesta casa não é pouco.

   SÓ ENTRA O QUE SAIU DO ESTOQUE DA CLÍNICA. Dose que saiu da custódia de
   um paciente é medicação da família: quando acabar, quem repõe é ela, e
   incluí-la aqui faria a clínica comprar o que não precisa. Quem decide
   isso é movEhCustodia(), a mesma função que separa os dois mundos no
   Livro — inclusive nas transferências, em que o dono do saldo de origem
   é o que importa, não o paciente de destino.

   Devolução ao estoque entra como consumo NEGATIVO: o que voltou não
   precisa ser recomprado.

   Ajuste de inventário fica de fora de propósito. Ajuste é correção de
   divergência, não consumo; somá-lo ao gasto mensal faria o erro de
   contagem virar previsão de compra.
   ============================================================ */

// data de N dias atrás, ancorada em HOJE. Meio-dia evita o pulo de fuso
// que faz a data voltar um dia ao converter para ISO.
function _pvDataMenos(dias) {
  const d = new Date(HOJE + "T12:00:00");
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10);
}

/* Primeiro dia de uma janela de N dias que termina HOJE.
   É (N - 1) e não N porque as duas pontas entram na contagem: de ontem até
   hoje são 2 dias, não 1. Dividir o consumo por N tendo somado N+1 dias de
   movimentação subestima a média diária — e média subestimada vira compra
   a menos, que é o erro que este relatório existe para evitar. */
function _pvInicioJanela(n) { return _pvDataMenos(Math.max(0, n - 1)); }

function _pvConsumoPorSub(deData) {
  const acc = {};
  const reg = (subId, qtd, data, sinal) => {
    if (!acc[subId]) acc[subId] = { un: 0, dias: new Set() };
    acc[subId].un += sinal * qtd;
    if (sinal > 0) acc[subId].dias.add(data);
  };
  movements.forEach((m) => {
    if (m.data < deData || m.data > HOJE) return;
    if (m.tipo === "saida") { if (!movEhCustodia(m)) reg(m.subId, m.qtd, m.data, 1); }
    else if (m.tipo === "devolucao") { if (!movEhCustodia(m)) reg(m.subId, m.qtd, m.data, -1); }
  });
  return acc;
}

function _pvLinhasConsumo() {
  const jan = _pvCfg.janela;
  const cJan = _pvConsumoPorSub(_pvInicioJanela(jan));
  const c30 = _pvConsumoPorSub(_pvInicioJanela(30));
  const soma = (ids, acc) => ids.reduce((a, id) => a + ((acc[id] || {}).un || 0), 0);

  return gruposSubstancias().map((g) => {
    const un = soma(g.subIds, cJan), un30 = soma(g.subIds, c30);
    const diasComSaida = new Set();
    g.subIds.forEach((id) => ((cJan[id] || {}).dias || new Set()).forEach((d) => diasComSaida.add(d)));

    // consumo negativo (devolveu mais do que saiu no período) não é consumo
    const mediaJan = Math.max(un, 0) / jan;
    const media30 = Math.max(un30, 0) / 30;
    const base = _pvCfg.base === "30" ? media30
               : _pvCfg.base === "maior" ? Math.max(mediaJan, media30)
               : mediaJan;

    const estoque = g.subIds.reduce((a, id) => a + saldo(id), 0);
    const dias = base > 0 ? estoque / base : null;
    const comprar = base > 0 ? Math.max(0, Math.ceil(base * _pvCfg.cobertura - estoque)) : 0;

    const preco = g.subIds.map((id) => custoMedio(id)).find((v) => v > 0) || 0;
    const s0 = subById(g.subIds[0]) || {};
    const fator = s0.fatorUnidade && s0.fatorUnidade > 1 ? s0.fatorUnidade : null;

    // validade mais próxima do que está na prateleira: comprar 90 dias de um
    // item que vence em 30 é comprar para descartar
    let venceEm = null;
    allLotes().forEach((l) => {
      if (g.subIds.indexOf(l.subId) === -1 || l.restritoPaciente) return;
      if (saldoLoteChave(l.chave) <= 0 || !l.validade) return;
      if (!venceEm || l.validade < venceEm) venceEm = l.validade;
    });

    /* Saída concentrada em pouquíssimos dias não é rotina: é um episódio.
       A média diária de um item que saiu uma vez só projeta uma compra que
       nunca mais vai girar. O marcador existe para o RT olhar antes. */
    const episodico = un > 0 && diasComSaida.size <= 3 && jan >= 30;
    const tend = mediaJan > 0 ? media30 / mediaJan : (media30 > 0 ? Infinity : 1);

    return { g, un, un30, diasSaida: diasComSaida.size, mediaJan, media30, base, estoque,
             dias, comprar, preco, fator, venceEm, episodico, tend,
             valor: comprar * preco, st: _pvStatus(dias) };
  }).filter((r) => r.un > 0 || r.estoque > 0)
    .sort((a, b) => {
      const va = a.dias === null ? 1e9 : a.dias, vb = b.dias === null ? 1e9 : b.dias;
      return va - vb || a.g.label.localeCompare(b.g.label, "pt-BR");
    });
}

function _pvTendIcone(r) {
  if (!r.un) return "";
  if (r.tend === Infinity) return `<span title="item novo: só consumiu nos últimos 30 dias" style="color:#B04A3F">▲ novo</span>`;
  if (r.tend >= 1.3) return `<span title="consumo dos últimos 30 dias acima da média do período" style="color:#B04A3F">▲ subindo</span>`;
  if (r.tend <= 0.7) return `<span title="consumo dos últimos 30 dias abaixo da média do período" style="color:#2C5F5A">▼ caindo</span>`;
  return `<span style="color:var(--muted)">= estável</span>`;
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

    ${_pvPainelConsumo()}

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

function _pvPainelConsumo() {
  const rows = _pvLinhasConsumo();
  const comCompra = rows.filter((r) => r.comprar > 0);
  const totalUn = comCompra.reduce((a, r) => a + r.comprar, 0);
  const totalRS = comCompra.reduce((a, r) => a + r.valor, 0);
  const semPreco = comCompra.filter((r) => !r.preco).length;
  const parados = rows.filter((r) => !r.un && r.estoque > 0).length;
  const deData = _pvInicioJanela(_pvCfg.janela);

  const linhas = rows.map((r) => `
    <tr style="background:${r.st.k === "crit" || r.st.k === "zero" ? "#FDF6F5" : "transparent"}">
      <td style="text-align:center;font-size:15px">${_pvBolinha(r.st)}</td>
      <td><b>${_esc(r.g.label)}</b>${r.g.lista && r.g.lista !== "—" ? ` <span class="tag ${listaTagClass(r.g.lista)}">${r.g.lista}</span>` : ""}
        ${r.episodico ? `<div style="font-size:11px;color:#B07A2F">saiu em apenas ${r.diasSaida} dia(s) — consumo episódico, confira antes de comprar</div>` : ""}
        ${r.venceEm && r.comprar ? `<div style="font-size:11px;color:var(--muted)">estoque atual vence em ${fmtDate(r.venceEm)}</div>` : ""}</td>
      <td class="num mono">${r.un || "—"}</td>
      <td class="num mono">${r.diasSaida || "—"}</td>
      <td class="num mono">${r.base ? fmtDose(r.base) : "—"}</td>
      <td style="font-size:11px">${_pvTendIcone(r)}</td>
      <td class="num mono">${r.estoque}</td>
      <td class="num mono" style="font-weight:700;color:${r.st.cor}">${_pvDias(r.dias)}</td>
      <td class="num mono">${r.comprar ? `<b>${r.comprar}</b>${r.fator ? `<div style="font-size:11px;color:var(--muted);font-weight:400">${Math.ceil(r.comprar / r.fator)} ${_esc(subById(r.g.subIds[0]).unidadeCompra || "cx")}</div>` : ""}` : "—"}</td>
      <td class="num mono">${r.comprar ? (r.preco ? fmtBRL(r.valor) : '<span style="color:var(--muted)">sem preço</span>') : "—"}</td>
    </tr>`).join("");

  return `
    <div class="panel">
      <div class="panel-head">
        <div><div class="panel-title">Cobertura e compras pelo consumo real</div>
          <div class="panel-title-sub">O que de fato saiu do estoque da clínica de ${fmtDate(deData)} a ${fmtDate(HOJE)} · ${_pvCfg.janela} dias</div></div>
        <button class="btn ghost sm" onclick="abrirImprimirCompras()">🖶 Lista de compras</button>
      </div>
      <div class="panel-body">
        <div class="note-box" style="margin-top:0"><b>Base diferente do quadro acima.</b> Aqui o consumo vem das <b>saídas registradas</b>, não das prescrições — então entra o que a prescrição não prevê: SOS, intercorrência, reposição de carrinho, consumo de setor, perda e descarte. <b>Só conta o que saiu do estoque da clínica</b>: dose tirada da custódia é medicação da família e quem repõe é ela. Devolução ao estoque abate. Ajuste de inventário não entra — é correção de contagem, não consumo.</div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px 14px;margin-bottom:14px">
          <div><label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px">Janela de consumo</label>
            <select onchange="_pvSet('janela', this.value)" style="width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:8px;font:inherit">
              ${[30, 60, 90, 120, 180].map((d) => `<option value="${d}"${d === _pvCfg.janela ? " selected" : ""}>${d} dias</option>`).join("")}
            </select></div>
          <div><label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px">Média usada no cálculo</label>
            <select onchange="_pvSetTxt('base', this.value)" style="width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:8px;font:inherit">
              <option value="90"${_pvCfg.base === "90" ? " selected" : ""}>Média da janela inteira — mais estável</option>
              <option value="30"${_pvCfg.base === "30" ? " selected" : ""}>Média dos últimos 30 dias — mais atual</option>
              <option value="maior"${_pvCfg.base === "maior" ? " selected" : ""}>A maior das duas — mais conservadora</option>
            </select></div>
          <div><label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px">Cobertura desejada</label>
            <input type="number" min="7" max="180" value="${_pvCfg.cobertura}" onchange="_pvSet('cobertura', this.value)" style="width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:8px;font:inherit"></div>
        </div>

        ${comCompra.length ? `<div class="note-box" style="background:#EEF2EC;border-color:#cfd6cf"><b>${comCompra.length} item(ns) a comprar</b> para ${_pvCfg.cobertura} dias de cobertura · <b>${totalUn}</b> unidade(s) · estimativa <b>${fmtBRL(totalRS)}</b>${semPreco ? ` <span style="color:var(--warn)">(${semPreco} sem preço de compra registrado, fora da estimativa)</span>` : ""}${parados ? ` · ${parados} item(ns) em estoque sem nenhuma saída no período` : ""}</div>` : ""}

        ${rows.length ? `<table>
          <thead><tr><th style="width:34px"></th><th>Medicamento</th><th class="num">Saiu<br>${_pvCfg.janela}d</th><th class="num">Dias c/<br>saída</th><th class="num">Média<br>/dia</th><th>Tendência</th><th class="num">Estoque</th><th class="num">Cobertura</th><th class="num">Comprar</th><th class="num">Estimativa</th></tr></thead>
          <tbody>${linhas}</tbody></table>`
          : `<div style="color:var(--muted);font-size:13px;padding:8px 0">Nenhuma saída do estoque da clínica no período e nenhum saldo.</div>`}
        <div class="foot-signoff"><span>Farmacêutico RT: ${rtLinha()}</span><span>Consumo apurado de ${fmtDate(deData)} a ${fmtDate(HOJE)}</span></div>
      </div>
    </div>`;
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
    <div class="ff" id="pvBlocoAgrup"><label>Quadro por paciente <span style="font-weight:400;color:var(--muted)">— como organizar as linhas</span></label>
      <select id="pvAgrup">
        <option value="paciente" selected>Agrupado por paciente — um bloco por paciente</option>
        <option value="urgencia">Lista corrida — em falta primeiro, depois por cobertura</option>
      </select>
      <div style="font-size:11px;color:var(--muted);margin-top:4px">Agrupado, cada paciente vira um bloco com todos os seus medicamentos e o total que a família precisa adquirir — é assim que se identifica de quem cobrar a compra.</div></div>
    <div class="note-box" style="margin:0">O quadro de <b>medicação por paciente</b> mostra a custódia de cada um e o que está sem estoque na clínica — é o documento que interessa à equipe e à família. O quadro de <b>estoque da clínica</b> é o que sustenta a compra junto à direção.</div>
  `, async () => {
    const cont = fv("pvConteudo") || "ambos";
    const faixa = fv("pvFaixa") || "comconsumo";
    const agrup = fv("pvAgrup") || "paciente";
    setTimeout(() => imprimirPrevisao({
      faixa, agrup, incEst: cont !== "pacientes", incCust: cont !== "estoque",
    }), 60);
  }, "Gerar relatório");
}

// esconde a faixa de cobertura quando o relatório é só de pacientes,
// e o agrupamento quando o relatório é só do estoque da clínica
function _pvAtualizaModal() {
  const c = document.getElementById("pvConteudo");
  const b = document.getElementById("pvBlocoFaixa");
  const a = document.getElementById("pvBlocoAgrup");
  if (c && b) b.style.display = c.value === "pacientes" ? "none" : "";
  if (c && a) a.style.display = c.value === "estoque" ? "none" : "";
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
  if (!o.agrup) o.agrup = "paciente";
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
  const _situ = (r) => r.tipo === "faltante" ? "EM FALTA"
    : r.st.k === "ok" ? "OK" : r.st.k === "aten" ? "ATENÇÃO" : r.st.k === "sem" ? "—" : "CRÍTICO";
  // colunas comuns aos dois modos (medicamento em diante)
  const _tcCols = (r) => `<td>${_esc(r.s.nome)}</td>
    <td class="c mono">${r.consumoDia ? fmtDose(r.consumoDia) : "SOS"}</td>
    <td class="c mono">${r.tipo === "faltante" ? "—" : r.saldoCust}</td>
    <td class="c">${r.tipo === "faltante" ? "sem estoque na clínica — solicitar à família" : _pvDias(r.dias)}</td>`;
  const tc = (r) => `<tr><td class="c">${_situ(r)}</td><td>${_esc(r.p.nome)}</td>${_tcCols(r)}</tr>`;
  const tcg = (r) => `<tr><td class="c">${_situ(r)}</td>${_tcCols(r)}</tr>`;

  /* Agrupado por paciente: o quadro deixa de ser uma lista corrida por
     urgência e passa a ter um bloco por paciente, com a contagem do que a
     família precisa adquirir. É o recorte usado para cobrar a reposição de
     quem é responsável por cada paciente. */
  const cusPorPaciente = () => {
    const m = {};
    cus.forEach((r) => { (m[r.p.id] = m[r.p.id] || { p: r.p, itens: [] }).itens.push(r); });
    return Object.values(m).sort((a, b) =>
      (a.p.leito || "").localeCompare(b.p.leito || "", "pt-BR", { numeric: true }) ||
      a.p.nome.localeCompare(b.p.nome, "pt-BR"));
  };
  const tabelaCustodia = () => {
    if (!cus.length) return `<table><thead><tr><th class="c">Situação</th><th>Paciente</th><th>Medicamento</th><th class="c">Consumo/dia</th><th class="c">Saldo</th><th class="c">Cobertura</th></tr></thead>
      <tbody><tr><td colspan="6" class="c">Sem custódia com saldo</td></tr></tbody></table>`;
    if (o.agrup !== "paciente") {
      return `<table><thead><tr><th class="c">Situação</th><th>Paciente</th><th>Medicamento</th><th class="c">Consumo/dia</th><th class="c">Saldo</th><th class="c">Cobertura</th></tr></thead>
        <tbody>${cus.map(tc).join("")}</tbody></table>`;
    }
    const grupos = cusPorPaciente().map((g) => {
      const falt = g.itens.filter((r) => r.tipo === "faltante").length;
      const itens = g.itens.slice().sort((a, b) => {
        if ((a.tipo === "faltante") !== (b.tipo === "faltante")) return a.tipo === "faltante" ? -1 : 1;
        const va = a.dias === null ? 1e9 : a.dias, vb = b.dias === null ? 1e9 : b.dias;
        return va - vb || a.s.nome.localeCompare(b.s.nome, "pt-BR");
      });
      return `<tr class="grp"><td colspan="5"><b>${_esc(g.p.nome)}</b>${g.p.leito ? " · leito " + _esc(g.p.leito) : ""}${g.p.prontuario ? " · prontuário " + _esc(g.p.prontuario) : ""}
        <span class="grp-n">${g.itens.length} item(ns)${falt ? ` · <b>${falt} a adquirir pela família</b>` : ""}</span></td></tr>
        ${itens.map(tcg).join("")}`;
    }).join("");
    return `<table class="cust-grp"><thead><tr><th class="c">Situação</th><th>Medicamento</th><th class="c">Consumo/dia</th><th class="c">Saldo</th><th class="c">Cobertura</th></tr></thead>
      <tbody>${grupos}</tbody></table>`;
  };
  const corpo = `
    <style>
      table{width:100%;border-collapse:collapse;margin-bottom:14px}
      th,td{border:1px solid #cfd6cf;padding:4px 6px;font-size:10.5px}
      th{background:#EEF2EC;text-transform:uppercase;font-size:8.5px}
      td.c,th.c{text-align:center}.mono{font-family:"IBM Plex Mono",monospace}
      h2{font-size:11px;text-transform:uppercase;color:#2C5F5A;margin:12px 0 4px;border-bottom:1px solid #cfd6cf;padding-bottom:2px}
      .leg{font-size:9.5px;color:#6a736e;margin-bottom:8px}
      .recorte{background:#EEF2EC;border-left:3px solid #2C5F5A;padding:5px 9px;font-size:11px;margin-bottom:8px}
      /* cabeçalho de cada paciente no quadro agrupado; page-break-after:avoid
         evita o nome do paciente sozinho no pé da página */
      tr.grp td{background:#E7EDE6;font-size:11px;border-top:2px solid #1E2A28;padding:4px 6px}
      tr.grp{page-break-after:avoid;break-after:avoid}
      tr.grp .grp-n{float:right;font-size:10px;color:#4a544f;font-weight:400}
    </style>
    <div class="recorte"><b>Recorte deste relatório:</b> ${o.incEst ? `${_esc(fx.rot)} — ${est.length} de ${est0.length} item(ns)` : "medicação por paciente (custódia e reposição)"}${!o.incCust ? " · sem o quadro por paciente" : (o.agrup === "paciente" ? " · quadro por paciente agrupado por paciente" : " · quadro por paciente em lista corrida")}${!o.incEst ? " · sem o quadro do estoque da clínica" : ""}.</div>
    <div class="leg">Consumo diário calculado a partir das prescrições ativas. Crítico: até ${_pvCfg.critico} dias · Atenção: até ${_pvCfg.atencao} dias · Sugestão de compra para ${_pvCfg.cobertura} dias de cobertura.</div>
    ${o.incEst ? `<h2>Cobertura do estoque da clínica</h2>
    <table><thead><tr><th class="c">Situação</th><th>Medicamento</th><th class="c">Pac.</th><th class="c">Consumo/dia</th><th class="c">Estoque</th><th class="c">Cobertura</th><th class="c">Comprar</th></tr></thead>
    <tbody>${est.map(tb).join("") || '<tr><td colspan="7" class="c">Sem dados</td></tr>'}</tbody></table>` : ""}
    ${o.incCust ? `<h2>Medicação por paciente — custódia e reposição</h2>
    ${tabelaCustodia()}` : ""}`;
  const totalCompra = est.reduce((a, r) => a + (r.comprar || 0), 0);
  const titulo = o.incEst ? "Previsão de Cobertura e Compras" : "Medicação por Paciente — Custódia e Reposição";
  const sub = o.incEst
    ? `Projeção com base nas prescrições vigentes em ${fmtDate(HOJE)} · recorte: ${fx.rot} · ${est.length} item(ns)`
    : `Situação por paciente em ${fmtDate(HOJE)} · ${new Set(cus.map((r) => r.p.id)).size} paciente(s) · ${cus.length} item(ns) · ${cus.filter((r) => r.tipo === "faltante").length} sem estoque na clínica`;
  imprimirRelatorio(titulo, sub,
    corpo.replace("<h2>Cobertura do estoque da clínica</h2>",
      `<h2>Cobertura do estoque da clínica — ${fx.rot}</h2>` +
      (totalCompra ? `<div class="leg" style="margin-bottom:6px"><b>${totalCompra}</b> unidade(s) a adquirir para ${_pvCfg.cobertura} dias de cobertura.</div>` : "")));
}

/* ============================================================
   LISTA DE COMPRAS PELO CONSUMO REAL
   É o documento que sustenta a cotação e a compra junto à direção:
   diz o que sai, há quanto tempo, quanto ainda cobre e quanto custa
   repor. Sai com a janela e a base impressas no papel, porque o mesmo
   item dá número diferente conforme a média escolhida — e relatório
   cujo total muda sem o papel dizer por quê é relatório que ninguém
   consegue conferir depois.
   ============================================================ */
function abrirImprimirCompras() {
  const rows = _pvLinhasConsumo();
  const n = (f) => rows.filter(f).length;
  abrirModal("Lista de compras pelo consumo", `
    <div class="note-box" style="margin-top:0">O recorte sai impresso no cabeçalho. Para levar à direção, <b>somente o que comprar</b> costuma bastar.</div>
    <div class="ff"><label>O que entra no relatório</label>
      <select id="pcFaixa">
        <option value="comprar" selected>Somente itens a comprar (${n((r) => r.comprar > 0)})</option>
        <option value="crit">🔴 Apenas crítico — comprar agora (${n((r) => r.st.k === "crit" || r.st.k === "zero")})</option>
        <option value="critaten">🔴 + 🟡 Crítico e atenção (${n((r) => ["crit", "zero", "aten"].indexOf(r.st.k) !== -1)})</option>
        <option value="comconsumo">Todos os itens com consumo no período (${n((r) => r.un > 0)})</option>
        <option value="todos">Todos os itens (${rows.length})</option>
      </select></div>
    <div class="ff">
      <label style="display:flex;align-items:center;gap:7px;font-weight:400">
        <input id="pcEpisodico" type="checkbox" checked style="width:auto;margin:0"> Marcar no papel os itens de consumo episódico
      </label>
      <div style="font-size:11px;color:var(--muted);margin-top:4px">Item que saiu em até 3 dias do período inteiro tem média diária enganosa — a marca avisa quem assina a compra.</div></div>
    <div class="note-box" style="margin:0">Janela: <b>${_pvCfg.janela} dias</b> · base: <b>${_pvCfg.base === "30" ? "média dos últimos 30 dias" : _pvCfg.base === "maior" ? "a maior das duas médias" : "média da janela inteira"}</b> · cobertura desejada: <b>${_pvCfg.cobertura} dias</b>. Mude nos seletores da tela antes de gerar, se precisar.</div>
  `, async () => {
    const faixa = fv("pcFaixa") || "comprar";
    const marcar = !!(document.getElementById("pcEpisodico") || {}).checked;
    setTimeout(() => imprimirCompras(faixa, marcar), 60);
  }, "Gerar relatório");
}

function imprimirCompras(faixa, marcarEpisodico) {
  const todas = _pvLinhasConsumo();
  const filtros = {
    comprar:    (r) => r.comprar > 0,
    crit:       (r) => r.st.k === "crit" || r.st.k === "zero",
    critaten:   (r) => ["crit", "zero", "aten"].indexOf(r.st.k) !== -1,
    comconsumo: (r) => r.un > 0,
    todos:      () => true,
  };
  const rot = {
    comprar: "somente itens a comprar", crit: "situação crítica — comprar agora",
    critaten: "crítico e atenção", comconsumo: "itens com consumo no período",
    todos: "todos os itens",
  };
  const rows = todas.filter(filtros[faixa] || filtros.comprar);
  if (!rows.length) { alert(`Nenhum item em "${rot[faixa] || faixa}". Escolha outro recorte.`); return; }

  const totalUn = rows.reduce((a, r) => a + r.comprar, 0);
  const totalRS = rows.reduce((a, r) => a + r.valor, 0);
  const semPreco = rows.filter((r) => r.comprar > 0 && !r.preco).length;
  const deData = _pvInicioJanela(_pvCfg.janela);
  const baseTxt = _pvCfg.base === "30" ? "média dos últimos 30 dias"
                : _pvCfg.base === "maior" ? "a maior entre a média da janela e a dos últimos 30 dias"
                : `média dos ${_pvCfg.janela} dias`;

  const linha = (r) => `<tr>
    <td class="c">${r.st.k === "ok" ? "OK" : r.st.k === "aten" ? "ATENÇÃO" : r.st.k === "sem" ? "—" : "CRÍTICO"}</td>
    <td>${_esc(r.g.label)}${r.g.lista && r.g.lista !== "—" ? " [" + r.g.lista + "]" : ""}${marcarEpisodico && r.episodico ? ' <b style="color:#B04A3F">*</b>' : ""}</td>
    <td class="c mono">${r.un || "—"}</td>
    <td class="c mono">${r.diasSaida || "—"}</td>
    <td class="c mono">${r.base ? fmtDose(r.base) : "—"}</td>
    <td class="c mono">${r.estoque}</td>
    <td class="c mono">${_pvDias(r.dias)}</td>
    <td class="c mono">${r.comprar || "—"}${r.comprar && r.fator ? ` (${Math.ceil(r.comprar / r.fator)} ${_esc(subById(r.g.subIds[0]).unidadeCompra || "cx")})` : ""}</td>
    <td class="c mono">${r.comprar ? (r.preco ? fmtBRL(r.valor) : "—") : "—"}</td>
    <td style="width:62px"></td></tr>`;

  const corpo = `
    <style>
      table{width:100%;border-collapse:collapse;margin-bottom:14px}
      th,td{border:1px solid #cfd6cf;padding:4px 6px;font-size:10.5px}
      th{background:#EEF2EC;text-transform:uppercase;font-size:8.5px}
      td.c,th.c{text-align:center}.mono{font-family:"IBM Plex Mono",monospace}
      .leg{font-size:9.5px;color:#6a736e;margin-bottom:8px;line-height:1.5}
      .recorte{background:#EEF2EC;border-left:3px solid #2C5F5A;padding:5px 9px;font-size:11px;margin-bottom:8px}
      tfoot td{background:#F7F9F6;font-weight:700}
    </style>
    <div class="recorte"><b>Recorte:</b> ${_esc(rot[faixa] || faixa)} — ${rows.length} de ${todas.length} item(ns). <b>Consumo apurado</b> de ${fmtDate(deData)} a ${fmtDate(HOJE)} (${_pvCfg.janela} dias). <b>Base do cálculo:</b> ${baseTxt}. <b>Cobertura desejada:</b> ${_pvCfg.cobertura} dias.</div>
    <div class="leg"><b>Como ler.</b> "Saiu" é o que deixou o estoque da clínica no período — doses, reposição de carrinho, consumo de setor, perdas e descartes —, já abatidas as devoluções ao estoque. Medicação em custódia de paciente não entra: é da família, e quem repõe é ela. Ajuste de inventário também não entra, por ser correção de contagem e não consumo. "Dias c/ saída" mostra se o consumo é rotina ou episódio. A estimativa usa o custo médio de compra do item; item nunca comprado sai sem valor.${marcarEpisodico && rows.some((r) => r.episodico) ? ' <b style="color:#B04A3F">*</b> saiu em até 3 dias do período — média diária pouco confiável, conferir antes de comprar.' : ""}</div>
    <table>
      <thead><tr><th class="c">Situação</th><th>Medicamento</th><th class="c">Saiu</th><th class="c">Dias c/ saída</th><th class="c">Média/dia</th><th class="c">Estoque</th><th class="c">Cobertura</th><th class="c">Comprar</th><th class="c">Estimativa</th><th class="c">Conferido</th></tr></thead>
      <tbody>${rows.map(linha).join("")}</tbody>
      <tfoot><tr><td colspan="7">Total a adquirir</td><td class="c mono">${totalUn || "—"}</td><td class="c mono">${fmtBRL(totalRS)}</td><td></td></tr></tfoot>
    </table>
    ${semPreco ? `<div class="leg"><b>${semPreco} item(ns) sem custo de compra registrado</b> — ficam fora da estimativa, então o total é piso, não teto.</div>` : ""}`;

  imprimirRelatorio("Previsão de Cobertura e Compras — consumo real",
    `Consumo de ${fmtDate(deData)} a ${fmtDate(HOJE)} · ${rows.length} item(ns) · ${totalUn} unidade(s) · estimativa ${fmtBRL(totalRS)}`,
    corpo);
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
