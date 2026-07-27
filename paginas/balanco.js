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

// Lotes de custódia (medicação própria) não integram o BMPO do estabelecimento.
// Exceção: custódia INTEGRADA ao estoque (alta com medicação deixada) passa a contar.
function _lotesProprios() {
  return new Set(allLotes().filter((l) => l.origem === "proprio" && !l.integrado).map((l) => l.lote));
}

// Recebe um GRUPO (princípio ativo + dosagem) — a identidade do BMPO.
// Vários nomes comerciais de mesmo princípio e dosagem formam uma única linha.
function _bmpoLinha(g, mes) {
  const proprios = _lotesProprios();
  const inicioMes = mes + "-01";
  let inicial = 0, entradas = 0, saidas = 0;
  movements.forEach((m) => {
    if (g.subIds.indexOf(m.subId) === -1) return;
    if (proprios.has(m.lote)) return; // custódia fora do BMPO
    const neg = (m.tipo === "saida" || m.tipo === "ajuste_saida");
    const sinal = neg ? -m.qtd : m.qtd;
    if (m.data < inicioMes) { inicial += sinal; return; }
    if (m.data.slice(0, 7) !== mes) return;
    if (neg) saidas += m.qtd;
    else entradas += m.qtd; // entrada, devolução e ajuste positivo
  });
  return { inicial, entradas, saidas, final: inicial + entradas - saidas };
}

function _bmpoRows(mes, paraImpressao) {
  return gruposSubstancias().filter(grupoControlado).map((g) => {
    const b = _bmpoLinha(g, mes);
    const comerciais = g.nomes.length > 1 ? g.nomes.join(" · ") : "";
    if (paraImpressao) {
      return `<tr>
        <td>${g.label}${g.forma ? " — " + g.forma : ""}${comerciais ? `<div style="font-size:8.5px;color:#6a736e">${comerciais}</div>` : ""}</td><td>Lista ${g.lista}</td>
        <td class="num mono">${b.inicial}</td><td class="num mono">+${b.entradas}</td>
        <td class="num mono">-${b.saidas}</td><td class="num mono">${b.final}</td></tr>`;
    }
    return `<tr>
      <td><b>${g.label}</b>${g.forma ? ` <span style="color:var(--muted);font-size:12px">${g.forma}</span>` : ""}${comerciais ? `<div style="font-size:11px;color:var(--muted)">${comerciais}</div>` : ""}</td>
      <td><span class="tag ${listaTagClass(g.lista)}">Lista ${g.lista}</span></td>
      <td class="num mono">${b.inicial}</td><td class="num mono">+${b.entradas}</td>
      <td class="num mono">−${b.saidas}</td><td class="num mono"><b>${b.final}</b></td></tr>`;
  }).join("");
}

function mudarMesBMPO(mes) {
  _mesBMPO = mes;
  document.getElementById("viewport").innerHTML = renderPage();
}

function imprimirBMPO() {
  const mes = _mesRef();
  const corpo = `<table>
    <thead><tr><th>Substância</th><th>Lista</th><th class="num">Estoque inicial</th><th class="num">Entradas</th><th class="num">Saídas</th><th class="num">Saldo final</th></tr></thead>
    <tbody>${_bmpoRows(mes, true)}</tbody></table>`;
  imprimirRelatorio("Balanço de Substâncias Psicotrópicas e Entorpecentes (BMPO)", "Referência: " + _nomeMes(mes), corpo);
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
          <thead><tr><th>Substância</th><th>Lista</th><th>Estoque inicial</th><th>Entradas</th><th>Saídas</th><th>Saldo final</th></tr></thead>
          <tbody>${_bmpoRows(mes, false)}</tbody>
        </table>
        <div class="foot-signoff">
          <span>Estoque inicial = saldo derivado das movimentações anteriores a ${fmtDate(mes + "-01")}</span>
          <span>Farmacêutico RT: ${rtLinha()}</span>
        </div>
      </div>
    </div>
  `;
}
