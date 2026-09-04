/* ============================================================
   paginas/balanco.js — Hospital Reviva
   Balanço Mensal (BMPO). Estoque inicial é DERIVADO das
   movimentações anteriores ao mês de referência (decisão 2:
   inventário inicial + entradas/saídas anteriores). Seletor de
   mês e impressão limpa para fiscalização.
   ============================================================ */

let _mesBMPO = null;

function _mesesDisponiveis() {
  const set = new Set(movements.map((m) => m.data.slice(0, 7)));
  set.add(new Date().toISOString().slice(0, 7));
  return Array.from(set).sort().reverse();
}
function _mesRef() {
  const disp = _mesesDisponiveis();
  return _mesBMPO || disp[0] || new Date().toISOString().slice(0, 7);
}
function _nomeMes(mes) {
  const [y, m] = mes.split("-");
  const nomes = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  return `${nomes[+m - 1]} / ${y}`;
}

/* A medicação em custódia de paciente é sujeita a controle especial e fica
   sob guarda da farmácia — portanto é escriturada e precisa constar do BMPO.
   Mas ela NÃO é estoque do estabelecimento: pertence ao paciente. Por isso
   o balanço apresenta as duas colunas separadas, com o total ao lado —
   o que permite conferir o físico da casa sem confundir a propriedade.

   Custódia INTEGRADA ao estoque (alta em que o paciente deixa a medicação)
   deixa de ser de terceiro e passa a compor a coluna do estabelecimento. */
function _ehCustodia(m) {
  const b = _lotesAgrupados();
  const k = _chaveDaSaida(m.subId, m.lote, m.paciente);
  const l = b[k];
  return !!(l && l.restritoPaciente && !l.integrado);
}

// Recebe um GRUPO (princípio ativo + dosagem) — a identidade do BMPO.
// Vários nomes comerciais de mesmo princípio e dosagem formam uma única linha.
function _bmpoLinha(g, mes) {
  const inicioMes = mes + "-01";
  const z = () => ({ inicial: 0, entradas: 0, saidas: 0 });
  const est = z(), cus = z();
  movements.forEach((m) => {
    if (g.subIds.indexOf(m.subId) === -1) return;
    const alvo = _ehCustodia(m) ? cus : est;
    const neg = (m.tipo === "saida" || m.tipo === "ajuste_saida");
    const sinal = neg ? -m.qtd : m.qtd;
    if (m.data < inicioMes) { alvo.inicial += sinal; return; }
    if (m.data.slice(0, 7) !== mes) return;
    if (neg) alvo.saidas += m.qtd;
    else alvo.entradas += m.qtd; // entrada, devolução e ajuste positivo
  });
  est.final = est.inicial + est.entradas - est.saidas;
  cus.final = cus.inicial + cus.entradas - cus.saidas;
  return {
    est, cus,
    // totais (estabelecimento + custódia) — o físico sob guarda da farmácia
    inicial: est.inicial + cus.inicial,
    entradas: est.entradas + cus.entradas,
    saidas: est.saidas + cus.saidas,
    final: est.final + cus.final,
  };
}

function _bmpoRows(mes, paraImpressao) {
  return gruposSubstancias().filter(grupoControlado).map((g) => {
    const b = _bmpoLinha(g, mes);
    const comerciais = g.nomes.length > 1 ? g.nomes.join(" · ") : "";
    const temCus = b.cus.inicial || b.cus.entradas || b.cus.saidas || b.cus.final;
    if (paraImpressao) {
      return `<tr>
        <td>${g.label}${g.forma ? " — " + g.forma : ""}${comerciais ? `<div style="font-size:8.5px;color:#6a736e">${comerciais}</div>` : ""}</td><td>Lista ${g.lista}</td>
        <td class="num mono">${b.est.inicial}</td><td class="num mono">+${b.est.entradas}</td>
        <td class="num mono">-${b.est.saidas}</td><td class="num mono">${b.est.final}</td>
        <td class="num mono cus">${temCus ? b.cus.inicial : "—"}</td><td class="num mono cus">${temCus ? "+" + b.cus.entradas : "—"}</td>
        <td class="num mono cus">${temCus ? "-" + b.cus.saidas : "—"}</td><td class="num mono cus">${temCus ? b.cus.final : "—"}</td>
        <td class="num mono tot"><b>${b.final}</b></td></tr>`;
    }
    return `<tr>
      <td><b>${g.label}</b>${g.forma ? ` <span style="color:var(--muted);font-size:12px">${g.forma}</span>` : ""}${comerciais ? `<div style="font-size:11px;color:var(--muted)">${comerciais}</div>` : ""}</td>
      <td><span class="tag ${listaTagClass(g.lista)}">Lista ${g.lista}</span></td>
      <td class="num mono">${b.est.inicial}</td><td class="num mono">+${b.est.entradas}</td>
      <td class="num mono">−${b.est.saidas}</td><td class="num mono"><b>${b.est.final}</b></td>
      <td class="num mono" style="background:#FBF3E3">${temCus ? b.cus.inicial : "—"}</td>
      <td class="num mono" style="background:#FBF3E3">${temCus ? "+" + b.cus.entradas : "—"}</td>
      <td class="num mono" style="background:#FBF3E3">${temCus ? "−" + b.cus.saidas : "—"}</td>
      <td class="num mono" style="background:#FBF3E3"><b>${temCus ? b.cus.final : "—"}</b></td>
      <td class="num mono" style="background:var(--primary-tint)"><b>${b.final}</b></td></tr>`;
  }).join("");
}

function mudarMesBMPO(mes) {
  _mesBMPO = mes;
  document.getElementById("viewport").innerHTML = renderPage();
}

function imprimirBMPO() {
  const mes = _mesRef();
  const corpo = `
  <style>
    table th.c, table td.c{text-align:center}
    table th.cus, table td.cus{background:#FBF3E3}
    table th.tot, table td.tot{background:#EEF2EC;font-weight:700}
    .bmpo-nota{font-size:9.5px;color:#4a544f;line-height:1.5;margin-bottom:8px;
               background:#F4F6F3;border-left:3px solid #2C5F5A;padding:5px 9px}
  </style>
  <div class="bmpo-nota">
    <b>Estoque do estabelecimento</b> — substâncias adquiridas pela clínica.
    <b>Custódia de pacientes</b> — medicação de propriedade do paciente, entregue à farmácia
    e mantida sob guarda em separado, com uso exclusivo dele; é escriturada por estar sob
    controle especial, mas não integra o patrimônio do estabelecimento.
    <b>Total sob guarda</b> — soma das duas colunas, correspondente ao que existe fisicamente na farmácia.
    Custódia deixada pelo paciente na alta e integrada ao estoque passa a compor a coluna do estabelecimento.
  </div>
  <table>
    <thead>
      <tr>
        <th rowspan="2">Substância</th><th rowspan="2">Lista</th>
        <th colspan="4" class="num" style="text-align:center">Estoque do estabelecimento</th>
        <th colspan="4" class="num" style="text-align:center;background:#FBF3E3">Custódia de pacientes</th>
        <th rowspan="2" class="num" style="background:var(--primary-tint)">Total sob guarda</th>
      </tr>
      <tr>
        <th class="num">Inicial</th><th class="num">Entradas</th><th class="num">Saídas</th><th class="num">Final</th>
        <th class="num" style="background:#FBF3E3">Inicial</th><th class="num" style="background:#FBF3E3">Entradas</th>
        <th class="num" style="background:#FBF3E3">Saídas</th><th class="num" style="background:#FBF3E3">Final</th>
      </tr>
    </thead>
    <tbody>${_bmpoRows(mes, true)}</tbody></table>`;
  imprimirRelatorio("Balanço de Substâncias Psicotrópicas e Entorpecentes (BMPO)", "Referência: " + _nomeMes(mes), corpo);
}

/* Fechamento do mês, na própria tela do BMPO — é aqui que o RT conclui a
   escrituração, então é aqui que ele fecha o período. O mesmo controle
   existe em Configurações. */
function _painelFechamentoBMPO(mes) {
  const f = (window.ESTAB || {}).fechamento_ate;
  const ultimoDia = (() => {
    const [a, m] = mes.split("-").map(Number);
    return `${a}-${String(m).padStart(2, "0")}-${String(new Date(a, m, 0).getDate()).padStart(2, "0")}`;
  })();
  const jaFechado = f && f >= ultimoDia;
  return `
    <div class="panel">
      <div class="panel-head">
        <div><div class="panel-title">Fechamento da escrituração</div>
          <div class="panel-title-sub">Trava lançamentos no período já escriturado e transmitido</div></div>
      </div>
      <div class="panel-body">
        ${jaFechado
          ? `<div class="note-box" style="margin-top:0;background:#E7F0E3;border-color:#c9dcc2">
               <b>Período fechado até ${fmtDate(f)}.</b> Lançamentos com data até aí estão bloqueados.
               <button class="btn ghost sm" style="margin-left:10px" onclick="fecharMesBMPO(null)">Reabrir período</button>
             </div>`
          : `<div class="note-box" style="margin-top:0">Confira o balanço acima e a Folha de Registro Semanal antes de fechar. Depois de fechado, lançamentos com data até <b>${fmtDate(ultimoDia)}</b> deixam de ser aceitos — correções passam a ser feitas no mês aberto.</div>
             <button class="btn sm" onclick="fecharMesBMPO('${ultimoDia}')">🔒 Fechar ${_nomeMes(mes)}</button>
             ${f ? `<div style="font-size:12px;color:var(--muted);margin-top:8px">Atualmente fechado até ${fmtDate(f)}.</div>` : ""}`}
      </div>
    </div>`;
}

async function fecharMesBMPO(ate) {
  const est = window.ESTAB || {};
  if (!est.id) { alert("Configure os dados do estabelecimento antes de fechar o período."); return; }
  if (ate) {
    if (!confirm(`Fechar a escrituração até ${fmtDate(ate)}?\n\nLançamentos com data até essa data deixam de ser aceitos. Faça isso depois de conferir o BMPO e a Folha de Registro Semanal.`)) return;
  } else {
    if (!confirm("Reabrir o período?\n\nLançamentos retroativos voltam a ser aceitos. Faça isso apenas se o BMPO ainda não foi transmitido.")) return;
  }
  const { error } = await window.SB.from("estabelecimento").update({ fechamento_ate: ate }).eq("id", est.id);
  if (error) { alert("Erro ao gravar o fechamento: " + error.message); return; }
  window.ESTAB.fechamento_ate = ate;
  await recarregarTela();
}

function renderPage() {
  const mes = _mesRef();
  const opts = _mesesDisponiveis().map((m) => `<option value="${m}"${m === mes ? " selected" : ""}>${_nomeMes(m)}</option>`).join("");
  return `
    <div class="panel">
      <div class="panel-head">
        <div><div class="panel-title">Balanço Mensal de Psicotrópicos e Entorpecentes</div><div class="panel-title-sub">Referência: ${_nomeMes(mes)} — estoque inicial derivado do Livro de Registro</div></div>
        <div class="toolbar">
          <select onchange="mudarMesBMPO(this.value)">${opts}</select>
          <button class="btn sm" onclick="imprimirBMPO()">Imprimir BMPO</button>
        </div>
      </div>
      <div class="panel-body">
        <table>
          <thead>
            <tr>
              <th rowspan="2">Substância</th><th rowspan="2">Lista</th>
              <th colspan="4" class="c">Estoque do estabelecimento</th>
              <th colspan="4" class="c cus">Custódia de pacientes</th>
              <th rowspan="2" class="c tot">Total sob guarda</th>
            </tr>
            <tr>
              <th class="c">Inicial</th><th class="c">Entradas</th><th class="c">Saídas</th><th class="c">Final</th>
              <th class="c cus">Inicial</th><th class="c cus">Entradas</th><th class="c cus">Saídas</th><th class="c cus">Final</th>
            </tr>
          </thead>
          <tbody>${_bmpoRows(mes, false)}</tbody>
        </table>
        <div class="foot-signoff">
          <span>Estoque inicial = saldo derivado das movimentações anteriores a ${fmtDate(mes + "-01")}</span>
          <span>Farmacêutico RT: ${rtLinha()}</span>
        </div>
      </div>
    </div>
    ${_painelFechamentoBMPO(mes)}
  `;
}
