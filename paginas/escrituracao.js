/* ============================================================
   paginas/escrituracao.js — Hospital Reviva
   Livro de Registro (movimentações). Botão de impressão gera a
   versão limpa para fiscalização (assets/relatorios.js).
   ============================================================ */

function _livroLinhas(paraImpressao) {
  const running = {};
  substances.forEach((s) => (running[s.id] = 0));
  const TXT = { entrada: "Entrada", devolucao: "Devolução", saida: "Saída", ajuste_entrada: "Ajuste +", ajuste_saida: "Ajuste −" };
  return movements.map((m) => {
    const neg = (m.tipo === "saida" || m.tipo === "ajuste_saida");
    running[m.subId] += neg ? -m.qtd : m.qtd;
    const tipo = paraImpressao ? (TXT[m.tipo] || m.tipo) : movTipoTag(m.tipo);
    const pacRef = `${m.paciente ? patById(m.paciente).nome + " · " : ""}${m.ref}`;
    if (paraImpressao) {
      return `<tr>
        <td class="mono">${m.id}</td><td class="mono">${fmtDate(m.data)}</td><td>${tipo}</td>
        <td>${subById(m.subId).nome}</td><td class="num mono">${movSign(m.tipo)}${m.qtd}</td>
        <td>${pacRef}</td><td class="num mono">${running[m.subId]}</td></tr>`;
    }
    return `<tr>
      <td><span class="folio">${m.id}</span></td><td class="mono">${fmtDate(m.data)}</td><td>${tipo}</td>
      <td>${subById(m.subId).nome}</td><td class="num mono">${movSign(m.tipo)}${m.qtd}</td>
      <td style="color:var(--muted)">${pacRef}</td><td class="num mono"><b>${running[m.subId]}</b></td></tr>`;
  }).join("");
}

function imprimirLivro() {
  const corpo = `<table>
    <thead><tr><th>Folio</th><th>Data</th><th>Tipo</th><th>Substância</th><th class="num">Qtd.</th><th>Paciente / Referência</th><th class="num">Saldo após</th></tr></thead>
    <tbody>${_livroLinhas(true)}</tbody></table>`;
  const periodo = movements.length
    ? `Período: ${fmtDate(movements[0].data)} a ${fmtDate(movements[movements.length - 1].data)} · ${movements.length} lançamentos`
    : "Sem movimentações registradas";
  imprimirRelatorio("Livro de Registro Específico", periodo, corpo);
}

function renderPage() {
  return `
    <div class="panel">
      <div class="panel-head">
        <div><div class="panel-title">Livro de Registro Específico</div><div class="panel-title-sub">Toda entrada e saída de substâncias controladas, com folio sequencial</div></div>
        <div class="toolbar">
          <button class="btn sm" onclick="imprimirLivro()">Imprimir para fiscalização</button>
        </div>
      </div>
      <div class="panel-body">
        <table>
          <thead><tr><th>Folio</th><th>Data</th><th>Tipo</th><th>Substância</th><th>Qtd.</th><th>Paciente / Referência</th><th>Saldo após</th></tr></thead>
          <tbody>${_livroLinhas(false)}</tbody>
        </table>
        <div class="foot-signoff">
          <span>Responsável técnico: ${rtLinha()}</span>
          <span>Escrituração derivada das movimentações — sem digitação manual de saldo</span>
        </div>
      </div>
    </div>
  `;
}
