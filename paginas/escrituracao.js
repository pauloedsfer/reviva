/* ============================================================
   paginas/escrituracao.js — Hospital Reviva
   Livro de Registro Específico (movimentações), com FILTROS:
   paciente, período (de/até), tipo de movimento, substância e
   lista/classe (controlados). O SALDO APÓS é sempre o saldo REAL
   acumulado sobre todos os lançamentos — os filtros só escolhem
   quais linhas aparecem, nunca recalculam o saldo dentro do recorte.
   ============================================================ */

let _lvFiltro = { pac: "", de: "", ate: "", tipo: "todos", sub: "", lista: "" };

function _lvSet(campo, valor) { _lvFiltro[campo] = valor; document.getElementById("viewport").innerHTML = renderPage(); }
function _lvLimpar() { _lvFiltro = { pac: "", de: "", ate: "", tipo: "todos", sub: "", lista: "" }; document.getElementById("viewport").innerHTML = renderPage(); }

// aplica os filtros escolhidos a um lançamento já enriquecido com saldo real
function _lvPassa(m) {
  const f = _lvFiltro;
  if (f.pac && m.paciente !== f.pac) return false;
  if (f.de && m.data < f.de) return false;
  if (f.ate && m.data > f.ate) return false;
  if (f.sub && m.subId !== f.sub) return false;
  if (f.lista) { const s = subById(m.subId); if ((s.lista || "") !== f.lista) return false; }
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
        <td>${subById(m.subId).nome}</td><td class="num mono">${movSign(m.tipo)}${m.qtd}</td>
        <td>${pacRef}</td><td class="num mono">${saldo}</td></tr>`;
    }
    return `<tr>
      <td><span class="folio">${m.id}</span></td><td class="mono">${fmtDate(m.data)}</td><td>${tipo}</td>
      <td>${subById(m.subId).nome}</td><td class="num mono">${movSign(m.tipo)}${m.qtd}</td>
      <td style="color:var(--muted)">${pacRef}</td><td class="num mono"><b>${saldo}</b></td></tr>`;
  }).join("");
}

// descrição textual dos filtros ativos (cabeçalho da impressão / tela)
function _lvDescricao() {
  const f = _lvFiltro; const p = [];
  if (f.pac) p.push("Paciente: " + patById(f.pac).nome);
  if (f.sub) p.push("Substância: " + subById(f.sub).nome);
  if (f.lista) p.push("Lista: " + f.lista);
  if (f.tipo !== "todos") p.push("Tipo: " + ({ entrada: "entradas", saida: "saídas", devolucao: "devoluções", ajuste: "ajustes de inventário" }[f.tipo]));
  if (f.de || f.ate) p.push(`Período: ${f.de ? fmtDate(f.de) : "início"} a ${f.ate ? fmtDate(f.ate) : "hoje"}`);
  return p.length ? p.join(" · ") : "Todos os lançamentos";
}

function imprimirLivro() {
  const linhas = _livroDados();
  const corpo = `<table>
    <thead><tr><th>Folio</th><th>Data</th><th>Tipo</th><th>Substância</th><th class="num">Qtd.</th><th>Paciente / Referência</th><th class="num">Saldo após</th></tr></thead>
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

  const total = _livroDados().length;
  const ativo = f.pac || f.sub || f.lista || f.de || f.ate || f.tipo !== "todos";

  return `
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
          <div><label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px">De</label>
            <input type="date" value="${f.de}" onchange="_lvSet('de',this.value)" style="width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:8px;font:inherit"></div>
          <div><label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px">Até</label>
            <input type="date" value="${f.ate}" onchange="_lvSet('ate',this.value)" style="width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:8px;font:inherit"></div>
        </div>
        <div style="font-size:12.5px;color:var(--muted);margin-bottom:10px">${_lvDescricao()} · <b>${total}</b> lançamento(s)</div>
        <table>
          <thead><tr><th>Folio</th><th>Data</th><th>Tipo</th><th>Substância</th><th>Qtd.</th><th>Paciente / Referência</th><th>Saldo após</th></tr></thead>
          <tbody>${_livroLinhas(false) || `<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:10px">Nenhum lançamento no recorte selecionado.</td></tr>`}</tbody>
        </table>
        <div class="foot-signoff">
          <span>Responsável técnico: ${rtLinha()}</span>
          <span>Escrituração derivada das movimentações — o saldo após é o saldo real acumulado</span>
        </div>
      </div>
    </div>
  `;
}
