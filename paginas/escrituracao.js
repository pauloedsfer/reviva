/* ============================================================
   paginas/escrituracao.js — Hospital Reviva
   Livro de Registro Específico (movimentações), com FILTROS:
   paciente, período (de/até), tipo de movimento, substância e
   lista/classe (controlados). O SALDO APÓS é sempre o saldo REAL
   acumulado sobre todos os lançamentos — os filtros só escolhem
   quais linhas aparecem, nunca recalculam o saldo dentro do recorte.
   ============================================================ */

// validade de um lote (para exibir no livro)
function _validadeLote(lote) { const l = allLotes().find((x) => x.lote === lote); return l ? l.validade : null; }

let _lvFiltro = { pac: "", de: "", ate: "", tipo: "todos", sub: "", lista: "", lote: "" };

function _lvSet(campo, valor) { _lvFiltro[campo] = valor; document.getElementById("viewport").innerHTML = renderPage(); }
function _lvLimpar() { _lvFiltro = { pac: "", de: "", ate: "", tipo: "todos", sub: "", lista: "", lote: "" }; document.getElementById("viewport").innerHTML = renderPage(); }

// aplica os filtros escolhidos a um lançamento já enriquecido com saldo real
function _lvPassa(m) {
  const f = _lvFiltro;
  if (f.pac && m.paciente !== f.pac) return false;
  if (f.de && m.data < f.de) return false;
  if (f.ate && m.data > f.ate) return false;
  if (f.sub && m.subId !== f.sub) return false;
  if (f.lista) { const s = subById(m.subId); if ((s.lista || "") !== f.lista) return false; }
  if (f.lote && m.lote !== f.lote) return false;
  if (f.tipo !== "todos") {
    if (f.tipo === "entrada" && m.tipo !== "entrada") return false;
    if (f.tipo === "saida" && m.tipo !== "saida") return false;
    if (f.tipo === "devolucao" && m.tipo !== "devolucao") return false;
    if (f.tipo === "ajuste" && m.tipo !== "ajuste_entrada" && m.tipo !== "ajuste_saida") return false;
  }
  return true;
}

// gera todas as linhas com SALDO REAL acumulado; devolve só as que passam no filtro
function _livroDados() {
  const running = {};
  substances.forEach((s) => (running[s.id] = 0));
  const linhas = [];
  movements.forEach((m) => {
    const neg = (m.tipo === "saida" || m.tipo === "ajuste_saida");
    running[m.subId] = (running[m.subId] || 0) + (neg ? -m.qtd : m.qtd);
    if (_lvPassa(m)) linhas.push({ m, saldo: running[m.subId] });
  });
  return linhas;
}

function _livroLinhas(paraImpressao) {
  const TXT = { entrada: "Entrada", devolucao: "Devolução", saida: "Saída", ajuste_entrada: "Ajuste +", ajuste_saida: "Ajuste −" };
  return _livroDados().map(({ m, saldo }) => {
    const tipo = paraImpressao ? (TXT[m.tipo] || m.tipo) : movTipoTag(m.tipo);
    const pacRef = `${m.paciente ? patById(m.paciente).nome + " · " : ""}${m.ref}`;
    if (paraImpressao) {
      return `<tr>
        <td class="mono">${m.id}</td><td class="mono">${fmtDate(m.data)}</td><td>${tipo}</td>
        <td>${subById(m.subId).nome}</td><td class="mono">${m.lote || "—"}</td><td class="mono">${fmtDate(_validadeLote(m.lote))}</td>
        <td class="num mono">${movSign(m.tipo)}${m.qtd}</td>
        <td>${pacRef}</td><td class="num mono">${saldo}</td></tr>`;
    }
    return `<tr>
      <td><span class="folio">${m.id}</span></td><td class="mono">${fmtDate(m.data)}</td><td>${tipo}</td>
      <td>${subById(m.subId).nome}</td><td class="mono">${m.lote || "—"}</td><td class="mono">${fmtDate(_validadeLote(m.lote))}</td>
      <td class="num mono">${movSign(m.tipo)}${m.qtd}</td>
      <td style="color:var(--muted)">${pacRef}</td><td class="num mono"><b>${saldo}</b></td></tr>`;
  }).join("");
}

// descrição textual dos filtros ativos (cabeçalho da impressão / tela)
function _lvDescricao() {
  const f = _lvFiltro; const p = [];
  if (f.pac) p.push("Paciente: " + patById(f.pac).nome);
  if (f.sub) p.push("Substância: " + subById(f.sub).nome);
  if (f.lista) p.push("Lista: " + f.lista);
  if (f.lote) p.push("Lote: " + f.lote);
  if (f.tipo !== "todos") p.push("Tipo: " + ({ entrada: "entradas", saida: "saídas", devolucao: "devoluções", ajuste: "ajustes de inventário" }[f.tipo]));
  if (f.de || f.ate) p.push(`Período: ${f.de ? fmtDate(f.de) : "início"} a ${f.ate ? fmtDate(f.ate) : "hoje"}`);
  return p.length ? p.join(" · ") : "Todos os lançamentos";
}

function imprimirLivro() {
  const linhas = _livroDados();
  const corpo = `<table>
    <thead><tr><th>Folio</th><th>Data</th><th>Tipo</th><th>Substância</th><th>Lote</th><th>Validade</th><th class="num">Qtd.</th><th>Paciente / Referência</th><th class="num">Saldo após</th></tr></thead>
    <tbody>${_livroLinhas(true)}</tbody></table>`;
  const periodo = linhas.length
    ? `${_lvDescricao()} · ${linhas.length} lançamento(s)`
    : "Nenhum lançamento no recorte selecionado";
  imprimirRelatorio("Livro de Registro Específico", periodo, corpo);
}

function renderPage() {
  const f = _lvFiltro;
  const optPacs = `<option value="">Todos os pacientes</option>` +
    patients.slice().sort((a, b) => (a.nome || "").localeCompare(b.nome || ""))
      .map((p) => `<option value="${p.id}"${p.id === f.pac ? " selected" : ""}>${p.nome}</option>`).join("");
  const optSubs = `<option value="">Todas as substâncias</option>` +
    substances.slice().sort((a, b) => a.nome.localeCompare(b.nome))
      .map((s) => `<option value="${s.id}"${s.id === f.sub ? " selected" : ""}>${s.nome}</option>`).join("");
  const listas = [...new Set(substances.map((s) => s.lista).filter((l) => l && l !== "—"))].sort();
  const optLista = `<option value="">Todas as listas</option>` +
    listas.map((l) => `<option value="${l}"${l === f.lista ? " selected" : ""}>Lista ${l}</option>`).join("");
  const optTipo = [["todos", "Todos os tipos"], ["entrada", "Entradas"], ["saida", "Saídas"], ["devolucao", "Devoluções"], ["ajuste", "Ajustes de inventário"]]
    .map(([v, t]) => `<option value="${v}"${v === f.tipo ? " selected" : ""}>${t}</option>`).join("");
  const lotesDisp = [...new Set(allLotes().filter((l) => !f.sub || l.subId === f.sub).map((l) => l.lote))].sort();
  const optLote = `<option value="">Todos os lotes</option>` +
    lotesDisp.map((l) => `<option value="${l}"${l === f.lote ? " selected" : ""}>${l}</option>`).join("");

  const total = _livroDados().length;
  const ativo = f.pac || f.sub || f.lista || f.lote || f.de || f.ate || f.tipo !== "todos";

  const _fsIni = _fsSemana.ini || _fsSegunda(HOJE);
  const _fsFim = _fsAddDias(_fsIni, 6);
  const _fsPrev = _folhaSemanalDados();

  return `
    <div class="panel">
      <div class="panel-head">
        <div><div class="panel-title">Folha de Registro Semanal</div><div class="panel-title-sub">Para transcrição ao livro físico — agrupada por princípio ativo + dosagem</div></div>
        <div class="toolbar">
          <button class="btn sm" onclick="imprimirFolhaSemanal()">🖶 Imprimir folha da semana</button>
        </div>
      </div>
      <div class="panel-body">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px 14px;align-items:end">
          <div><label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px">Semana (segunda-feira)</label>
            <input type="date" value="${_fsIni}" onchange="_fsSet('ini', _fsSegunda(this.value))" style="width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:8px;font:inherit"></div>
          <div><label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px">Período</label>
            <div style="padding:8px 0;font-size:13.5px"><b>${fmtDate(_fsIni)}</b> a <b>${fmtDate(_fsFim)}</b></div></div>
          <div><label style="display:flex;align-items:center;gap:8px;font-size:13px;padding:8px 0">
            <input type="checkbox" ${_fsSemana.incluirNaoControlados ? "checked" : ""} onchange="_fsSet('incluirNaoControlados', this.checked)"> Incluir não controlados</label></div>
          <div style="display:flex;gap:8px">
            <button class="btn ghost sm" onclick="_fsSet('ini', _fsAddDias(_fsSemana.ini || _fsSegunda(HOJE), -7))">◀ Semana anterior</button>
            <button class="btn ghost sm" onclick="_fsSet('ini', _fsAddDias(_fsSemana.ini || _fsSegunda(HOJE), 7))">Próxima ▶</button>
          </div>
        </div>
        <div class="note-box" style="margin-top:14px">${_fsPrev.blocos.length
          ? `<b>${_fsPrev.blocos.length} item(ns)</b> na folha desta semana (por princípio ativo + dosagem). O nome comercial é consolidado: mesmo princípio e dosagem contam como um único item no Livro e no BMPO.`
          : "Nenhuma movimentação ou saldo nesta semana."}</div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head">
        <div><div class="panel-title">Livro de Registro Específico</div><div class="panel-title-sub">Toda entrada e saída de substâncias controladas, com folio sequencial e saldo real</div></div>
        <div class="toolbar">
          ${ativo ? '<button class="btn ghost sm" onclick="_lvLimpar()">Limpar filtros</button>' : ''}
          <button class="btn sm" onclick="imprimirLivro()">Imprimir${ativo ? " (filtrado)" : " para fiscalização"}</button>
        </div>
      </div>
      <div class="panel-body">
        <div class="mapa-cfg" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px 14px;margin-bottom:14px">
          <div><label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px">Paciente</label>
            <select onchange="_lvSet('pac',this.value)" style="width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:8px;font:inherit">${optPacs}</select></div>
          <div><label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px">Tipo de movimento</label>
            <select onchange="_lvSet('tipo',this.value)" style="width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:8px;font:inherit">${optTipo}</select></div>
          <div><label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px">Substância</label>
            <select onchange="_lvSet('sub',this.value)" style="width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:8px;font:inherit">${optSubs}</select></div>
          <div><label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px">Lista / classe</label>
            <select onchange="_lvSet('lista',this.value)" style="width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:8px;font:inherit">${optLista}</select></div>
          <div><label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px">Lote</label>
            <select onchange="_lvSet('lote',this.value)" style="width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:8px;font:inherit">${optLote}</select></div>
          <div><label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px">De</label>
            <input type="date" value="${f.de}" onchange="_lvSet('de',this.value)" style="width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:8px;font:inherit"></div>
          <div><label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px">Até</label>
            <input type="date" value="${f.ate}" onchange="_lvSet('ate',this.value)" style="width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:8px;font:inherit"></div>
        </div>
        <div style="font-size:12.5px;color:var(--muted);margin-bottom:10px">${_lvDescricao()} · <b>${total}</b> lançamento(s)</div>
        <table>
          <thead><tr><th>Folio</th><th>Data</th><th>Tipo</th><th>Substância</th><th>Lote</th><th>Validade</th><th>Qtd.</th><th>Paciente / Referência</th><th>Saldo após</th></tr></thead>
          <tbody>${_livroLinhas(false) || `<tr><td colspan="9" style="text-align:center;color:var(--muted);padding:10px">Nenhum lançamento no recorte selecionado.</td></tr>`}</tbody>
        </table>
        <div class="foot-signoff">
          <span>Responsável técnico: ${rtLinha()}</span>
          <span>Escrituração derivada das movimentações — o saldo após é o saldo real acumulado</span>
        </div>
      </div>
    </div>
  `;
}

/* ============================================================
   FOLHA DE REGISTRO SEMANAL (para transcrição ao livro físico)
   Agrupa por PRINCÍPIO ATIVO + DOSAGEM (identidade do Livro/BMPO).
   - Saldo anterior: saldo real acumulado até o dia anterior ao início.
   - Entradas: uma linha por lote (data, lote, validade, origem, qtd).
   - Saídas: total agregado da semana + "PACIENTE e outros".
   - Saldo final: anterior + entradas − saídas.
   ============================================================ */
let _fsSemana = { ini: "", incluirNaoControlados: false };

// segunda-feira da semana de uma data (ISO)
function _fsSegunda(iso) {
  const d = iso ? new Date(iso + "T12:00:00") : new Date();
  const dow = d.getDay();                 // 0=dom
  const diff = (dow === 0 ? -6 : 1 - dow); // volta até segunda
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}
function _fsAddDias(iso, n) {
  const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function _fsSet(campo, valor) {
  _fsSemana[campo] = valor;
  document.getElementById("viewport").innerHTML = renderPage();
}

// dados da folha: um bloco por grupo (princípio + dosagem)
function _folhaSemanalDados() {
  const ini = _fsSemana.ini || _fsSegunda(HOJE);
  const fim = _fsAddDias(ini, 6);
  const grupos = gruposSubstancias().filter((g) => _fsSemana.incluirNaoControlados || grupoControlado(g));
  const blocos = grupos.map((g) => {
    const doGrupo = movements.filter((m) => g.subIds.indexOf(m.subId) !== -1);
    let anterior = 0;
    const entradas = [], saidas = [];
    doGrupo.forEach((m) => {
      const neg = (m.tipo === "saida" || m.tipo === "ajuste_saida");
      if (m.data < ini) { anterior += neg ? -m.qtd : m.qtd; return; }
      if (m.data > fim) return;
      (neg ? saidas : entradas).push(m);
    });
    const totEnt = entradas.reduce((n, m) => n + m.qtd, 0);
    const totSai = saidas.reduce((n, m) => n + m.qtd, 0);
    // pacientes distintos que tiveram saída no período
    const pacs = [];
    saidas.forEach((m) => { if (m.paciente && pacs.indexOf(m.paciente) === -1) pacs.push(m.paciente); });
    let quem = "—";
    if (pacs.length === 1) quem = patById(pacs[0]) ? patById(pacs[0]).nome : "—";
    else if (pacs.length > 1) quem = (patById(pacs[0]) ? patById(pacs[0]).nome : "—") + " e outros";
    return { g, ini, fim, anterior, entradas, saidas, totEnt, totSai, quem, nPacs: pacs.length, final: anterior + totEnt - totSai };
  });
  // só blocos com movimento na semana OU com saldo (para conferência)
  return { ini, fim, blocos: blocos.filter((b) => b.entradas.length || b.saidas.length || b.anterior !== 0) };
}

function imprimirFolhaSemanal() {
  const { ini, fim, blocos } = _folhaSemanalDados();
  if (!blocos.length) { alert("Nenhuma movimentação ou saldo no período selecionado."); return; }

  const bloco = (b) => {
    const linhasEnt = b.entradas.length
      ? b.entradas.map((m) => `<tr>
          <td class="mono">${fmtDate(m.data)}</td>
          <td class="mono">${_esc(m.lote || "—")}</td>
          <td class="mono">${m.lote ? fmtDate(_validadeLote(m.lote)) : "—"}</td>
          <td>${_esc(m.ref || "—")}</td>
          <td class="num mono">${m.qtd}</td></tr>`).join("")
      : `<tr><td colspan="5" class="vazio">Sem entradas no período</td></tr>`;
    const linhaSai = b.saidas.length
      ? `<tr><td class="mono">${fmtDate(b.ini)} a ${fmtDate(b.fim)}</td>
           <td colspan="3">${_esc(b.quem)}${b.nPacs > 1 ? ` <span class="obs">(${b.nPacs} pacientes)</span>` : ""}</td>
           <td class="num mono">${b.totSai}</td></tr>`
      : `<tr><td colspan="5" class="vazio">Sem saídas no período</td></tr>`;
    return `
      <section class="grupo">
        <div class="g-head">
          <div class="g-nome">${_esc(b.g.label)}${b.g.forma ? ` <span class="g-forma">${_esc(b.g.forma)}</span>` : ""}</div>
          <div class="g-lista">${b.g.lista ? "Lista " + _esc(b.g.lista) : "—"}</div>
        </div>
        ${b.g.nomes.length > 1 ? `<div class="g-comerciais">Nomes comerciais: ${_esc(b.g.nomes.join(" · "))}</div>` : ""}
        <table>
          <tr class="saldo"><td colspan="4">Saldo anterior (até ${fmtDate(_fsAddDias(b.ini, -1))})</td><td class="num mono">${b.anterior}</td></tr>
          <tr class="sec"><td colspan="5">ENTRADAS</td></tr>
          <tr class="th"><td>Data</td><td>Lote</td><td>Validade</td><td>Origem / documento</td><td class="num">Qtd.</td></tr>
          ${linhasEnt}
          ${b.entradas.length > 1 ? `<tr class="tot"><td colspan="4">Total de entradas</td><td class="num mono">${b.totEnt}</td></tr>` : ""}
          <tr class="sec"><td colspan="5">SAÍDAS</td></tr>
          <tr class="th"><td>Período</td><td colspan="3">Paciente</td><td class="num">Qtd.</td></tr>
          ${linhaSai}
          <tr class="saldo final"><td colspan="4">Saldo final em ${fmtDate(b.fim)}</td><td class="num mono">${b.final}</td></tr>
        </table>
        <div class="conf">Transcrito no livro em ____/____/______ &nbsp;&nbsp; Rubrica: ____________</div>
      </section>`;
  };

  const corpo = `
    <style>
      .grupo{border:1px solid #b9c1ba;border-radius:5px;padding:8px 10px;margin-bottom:10px;break-inside:avoid;page-break-inside:avoid}
      .g-head{display:flex;justify-content:space-between;align-items:baseline;border-bottom:1.5px solid #1E2A28;padding-bottom:4px;margin-bottom:5px}
      .g-nome{font-size:13px;font-weight:700}.g-forma{font-weight:400;color:#4a544f;font-size:11px}
      .g-lista{font-size:10px;font-weight:700;color:#2C5F5A;text-transform:uppercase}
      .g-comerciais{font-size:9.5px;color:#6a736e;margin-bottom:5px}
      .grupo table{width:100%;border-collapse:collapse}
      .grupo td{border:1px solid #cfd6cf;padding:3px 6px;font-size:10.5px}
      .grupo tr.th td{background:#EEF2EC;font-size:8.5px;text-transform:uppercase;font-weight:700}
      .grupo tr.sec td{background:#1E2A28;color:#fff;font-size:8.5px;letter-spacing:.06em;font-weight:700;padding:2px 6px}
      .grupo tr.saldo td{background:#F4F6F3;font-weight:700}
      .grupo tr.saldo.final td{background:#E7F0E3}
      .grupo tr.tot td{font-weight:700}
      .grupo td.num{text-align:right;width:62px}.grupo .mono{font-family:"IBM Plex Mono",monospace}
      .grupo td.vazio{color:#8a938d;font-style:italic;text-align:center}
      .obs{color:#6a736e;font-size:9.5px}
      .conf{margin-top:5px;font-size:9.5px;color:#6a736e;text-align:right}
      .aviso{font-size:10px;color:#4a544f;border-left:3px solid #2C5F5A;padding:4px 8px;margin-bottom:10px;background:#F4F6F3}
    </style>
    <div class="aviso">Agrupamento por <b>princípio ativo + dosagem</b> — identidade do medicamento para o Livro de Registro e o BMPO. Nomes comerciais distintos de mesmo princípio e dosagem são consolidados num único item. Entradas discriminadas por lote; saídas consolidadas no período.</div>
    ${blocos.map(bloco).join("")}`;

  imprimirRelatorio("Folha de Registro Semanal",
    `Período de ${fmtDate(ini)} a ${fmtDate(fim)} · ${blocos.length} item(ns) · para transcrição ao livro físico`,
    corpo);
}
