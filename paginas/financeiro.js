/* ============================================================
   paginas/financeiro.js — Hospital Reviva
   Custos & Indicadores — foco EXCLUSIVO na farmácia: medicamentos
   dispensados, valor em estoque e economia. Não inclui diária de
   internação, salários ou sistema.

   REGRA DE CUSTO (a mesma da tela de Pacientes, para as duas não
   divergirem): cada saída é cobrada uma vez só. Dose saída de lote
   que nasceu de TRANSFERÊNCIA para a custódia não é cobrada de novo —
   o custo foi lançado na data da transferência, quando o medicamento
   deixou o estoque da clínica. Medicação trazida pela família tem
   custo zero para o hospital por natureza, mas conta como consumo.
   ============================================================ */

let _fnIni = null, _fnFim = null;        // período (ISO); definido no primeiro render
let _fnGrupo = "dia";                    // dia | semana | mes | total
let _fnPac = "";                         // "" = todos
let _fnTipo = "todos";                   // todos | medicamento | material

/* ---------------- período ---------------- */
function _fnAdd(iso, n) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}
function _fnSegunda(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return _fnAdd(iso, -((new Date(y, m - 1, d).getDay() + 6) % 7));
}
function _fnPrimeiroDiaMes(iso) { return iso.slice(0, 8) + "01"; }
function _fnPrimeiraData() {
  const datas = movements.map((m) => m.data).filter(Boolean).sort();
  return datas.length ? datas[0] : HOJE;
}
function _fnPeriodoPadrao() {
  if (_fnIni && _fnFim) return;
  _fnIni = _fnPrimeiroDiaMes(HOJE);
  _fnFim = HOJE;
}

function fnPreset(qual) {
  if (qual === "hoje") { _fnIni = HOJE; _fnFim = HOJE; }
  else if (qual === "7") { _fnIni = _fnAdd(HOJE, -6); _fnFim = HOJE; }
  else if (qual === "30") { _fnIni = _fnAdd(HOJE, -29); _fnFim = HOJE; }
  else if (qual === "mes") { _fnIni = _fnPrimeiroDiaMes(HOJE); _fnFim = HOJE; }
  else if (qual === "mespassado") { const p = _fnAdd(_fnPrimeiroDiaMes(HOJE), -1); _fnIni = _fnPrimeiroDiaMes(p); _fnFim = p; }
  else if (qual === "tudo") { _fnIni = _fnPrimeiraData(); _fnFim = HOJE; }
  _fnRedesenha();
}
function fnSetData(qual, v) { if (!v) return; if (qual === "ini") _fnIni = v; else _fnFim = v; _fnRedesenha(); }
function fnSetGrupo(v) { _fnGrupo = v; _fnRedesenha(); }
function fnSetTipo(v) { _fnTipo = v; _fnRedesenha(); }
/* Escolher um paciente também ajusta o período para a internação dele: ao
   clicar num nome quer-se o extrato da internação, não o mês corrente
   recortado. Voltando para "todos", o período escolhido permanece. */
function fnSetPac(v) {
  _fnPac = v || "";
  const p = _fnPac ? patById(_fnPac) : null;
  if (p && p.admissao) {
    _fnIni = p.admissao;
    _fnFim = (p.dataAlta && p.dataAlta < HOJE) ? p.dataAlta : HOJE;
  }
  _fnRedesenha();
}
function _fnRedesenha() { document.getElementById("viewport").innerHTML = renderPage(); }

/* ---------------- dados do período ---------------- */
// Inclui quem já teve alta: extrato de internação encerrada é o caso mais
// pedido, e o paciente sai da lista de internados no dia seguinte.
function _fnPacientesComMovimento() {
  const ids = new Set(movements.filter((m) => m.tipo === "saida" && m.paciente).map((m) => m.paciente));
  return patients.filter((p) => ids.has(p.id) || pacInternado(p))
    .sort((a, b) => (pacInternado(b) ? 1 : 0) - (pacInternado(a) ? 1 : 0) ||
                    a.nome.localeCompare(b.nome, "pt-BR"));
}

function _fnEhDose(m) { return /^Dose |^SOS/.test(String(m.ref || "")); }
function _fnEhTransfer(m) { return /^Transferência para/.test(String(m.ref || "")); }

/* Saídas do período, já com o custo pela regra do cabeçalho.
   `jaCobrada` marca a dose que saiu de lote transferido: aparece como
   consumo, com custo zero, e o detalhe explica por quê. */
function _fnLinhas() {
  const transf = _lotesTransferidos();
  return movements.filter((m) => m.tipo === "saida" && m.data >= _fnIni && m.data <= _fnFim)
    .filter((m) => !_fnPac || m.paciente === _fnPac)
    .filter((m) => {
      if (_fnTipo === "todos") return true;
      const s = subById(m.subId);
      return _fnTipo === "material" ? ehMaterial(s) : !ehMaterial(s);
    })
    .map((m) => {
      const jaCobrada = transf.has(m.lote) && !_fnEhTransfer(m);
      return { ...m, custo: jaCobrada ? 0 : m.qtd * (m.custoUnit || 0), dose: _fnEhDose(m), jaCobrada };
    });
}

function _fnChaveGrupo(data) {
  if (_fnGrupo === "dia") return data;
  if (_fnGrupo === "semana") return _fnSegunda(data);
  if (_fnGrupo === "mes") return data.slice(0, 7);
  return "total";
}
const _FN_MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
function _fnRotuloGrupo(k) {
  if (_fnGrupo === "dia") return fmtDate(k);
  if (_fnGrupo === "semana") return `${fmtDate(k).slice(0, 5)} a ${fmtDate(_fnAdd(k, 6)).slice(0, 5)}`;
  if (_fnGrupo === "mes") { const [y, m] = k.split("-"); return `${_FN_MES[+m - 1]}/${y.slice(2)}`; }
  return "Total do período";
}
function _fnRotuloCurto(k) {
  if (_fnGrupo === "mes") return _fnRotuloGrupo(k);
  return fmtDate(k).slice(0, 5);
}

/* Agrupa na granularidade escolhida. No modo diário os dias sem saída
   entram zerados de propósito: buraco na série é informação (dia sem
   dispensação), e sem eles o gráfico comprime o calendário e mente. */
function _fnPorGrupo(linhas) {
  const m = {};
  const add = (k) => (m[k] = m[k] || { k, custo: 0, doses: 0, unidades: 0, pacs: new Set(), linhas: [] });
  if (_fnGrupo === "dia" && diffDias(_fnIni, _fnFim) <= 92) {
    for (let d = _fnIni; d <= _fnFim; d = _fnAdd(d, 1)) add(d);
  }
  linhas.forEach((l) => {
    const g = add(_fnChaveGrupo(l.data));
    g.custo += l.custo;
    if (l.dose) { g.doses++; g.unidades += l.qtd; }
    if (l.paciente) g.pacs.add(l.paciente);
    g.linhas.push(l);
  });
  return Object.values(m).sort((a, b) => (a.k < b.k ? -1 : 1));
}

// Pacientes-dia do período: divisor honesto do custo médio. Com 14 leitos
// ocupados, R$/dia dividido por paciente-dia é o número comparável entre
// meses de ocupação diferente.
function _fnPacientesDia() {
  let n = 0;
  patients.forEach((p) => {
    if (!p.admissao) return;
    if (_fnPac && p.id !== _fnPac) return;
    const ini = p.admissao > _fnIni ? p.admissao : _fnIni;
    const alta = p.dataAlta && p.dataAlta < HOJE ? p.dataAlta : HOJE;
    const fim = alta < _fnFim ? alta : _fnFim;
    if (fim >= ini) n += diffDias(ini, fim) + 1;
  });
  return n;
}

/* Economia com medicação em custódia: o que o hospital DEIXOU de gastar
   porque a família comprou. Valorizada pelo custo médio da substância no
   estoque — se a clínica nunca comprou aquele item não há parâmetro e a
   parcela fica zerada, em vez de inventar preço. */
function _fnEconomiaCustodia(linhas) {
  return linhas.filter((l) => l.dose && l.custo === 0 && !l.jaCobrada)
    .reduce((a, l) => a + l.qtd * custoMedio(l.subId), 0);
}

/* ---------------- tela ---------------- */
function renderPage() {
  _fnPeriodoPadrao();
  const linhas = _fnLinhas();
  const grupos = _fnPorGrupo(linhas);
  const dias = diffDias(_fnIni, _fnFim) + 1;
  const custoTotal = linhas.reduce((a, l) => a + l.custo, 0);
  const doses = linhas.filter((l) => l.dose).length;
  const pacDia = _fnPacientesDia();
  const valorEstoque = substances.reduce((a, s) => a + saldo(s.id) * custoMedio(s.id), 0);
  const doacoesPeriodo = donations.filter((d) => d.data >= _fnIni && d.data <= _fnFim)
    .reduce((a, d) => a + d.itens.reduce((x, it) => x + it.qtd * (it.valorEstimado || 0), 0), 0);
  const economiaCustodia = _fnEconomiaCustodia(linhas);
  const perdas = _fnPerdasAjuste().reduce((a, x) => a + x.valor, 0);
  const pac = _fnPac ? patById(_fnPac) : null;

  // ---- rankings ----
  const porPac = {};
  linhas.forEach((l) => { if (l.paciente) porPac[l.paciente] = (porPac[l.paciente] || 0) + l.custo; });
  const rankPac = Object.entries(porPac)
    .map(([id, v]) => ({ label: (patById(id) || {}).nome || "—", value: +v.toFixed(2) }))
    .filter((x) => x.value > 0).sort((a, b) => b.value - a.value).slice(0, 12);

  const porSub = {};
  linhas.forEach((l) => { porSub[l.subId] = (porSub[l.subId] || 0) + l.custo; });
  const subOrd = Object.entries(porSub)
    .map(([id, v]) => ({ label: subNomeExibicao(subById(id)), value: +v.toFixed(2) }))
    .filter((x) => x.value > 0).sort((a, b) => b.value - a.value);
  const rankSub = subOrd.slice(0, 10);
  const outras = subOrd.slice(10).reduce((a, x) => a + x.value, 0);
  if (outras > 0) rankSub.push({ label: `outras ${subOrd.length - 10} substâncias`, value: +outras.toFixed(2), color: CHART_COLORS.muted });

  // concentração: quantos itens somam 80% do custo — curva ABC enxuta,
  // a informação que orienta a negociação de preço na cotação
  let acum = 0, itens80 = 0;
  subOrd.forEach((x) => { if (acum < custoTotal * 0.8) { acum += x.value; itens80++; } });

  const serie = grupos.map((g) => ({ label: _fnRotuloCurto(g.k), value: +g.custo.toFixed(2) }));

  return `
  ${_fnBarraFiltros()}

  <div class="grid cards">
    <div class="card"><div class="card-label">Custo no período</div><div class="card-value">${fmtBRL(custoTotal)}</div>
      <div class="card-note">${dias} dia${dias > 1 ? "s" : ""} · ${fmtBRL(custoTotal / dias)}/dia</div></div>
    <div class="card"><div class="card-label">Custo por paciente-dia</div><div class="card-value">${fmtBRL(pacDia ? custoTotal / pacDia : 0)}</div>
      <div class="card-note">${pacDia} paciente-dia no período</div></div>
    <div class="card"><div class="card-label">Doses dispensadas</div><div class="card-value">${doses}</div>
      <div class="card-note">${itens80 ? `${itens80} substância${itens80 > 1 ? "s" : ""} concentram 80% do custo` : "sem custo apurado no período"}</div></div>
    <div class="card"><div class="card-label">Valor atual em estoque</div><div class="card-value">${fmtBRL(valorEstoque)}</div>
      <div class="card-note">saldo × custo médio ponderado</div></div>
    <div class="card"><div class="card-label">Economia com doações</div><div class="card-value" style="color:var(--accent)">${fmtBRL(doacoesPeriodo)}</div>
      <div class="card-note">entradas sem desembolso no período</div></div>
    <div class="card"><div class="card-label">Economia com custódia</div><div class="card-value" style="color:var(--accent)">${fmtBRL(economiaCustodia)}</div>
      <div class="card-note">doses da medicação da família, a custo médio</div></div>
    <div class="card"><div class="card-label">Perdas no período</div><div class="card-value" style="color:${perdas > 0 ? "var(--warn)" : "var(--primary-dark)"}">${fmtBRL(perdas)}</div>
      <div class="card-note">${custoTotal ? ((perdas / custoTotal) * 100).toFixed(1) + "% do custo" : "ajustes negativos de inventário"}</div></div>
  </div>

  ${pac ? _fnCabecalhoPaciente(pac, custoTotal, linhas) : ""}

  <div class="panel">
    <div class="panel-head"><div>
      <div class="panel-title">Custo ao longo do período</div>
      <div class="panel-title-sub">${_fnGrupo === "total" ? "Escolha diário, semanal ou mensal para ver a evolução" : "Passe o mouse sobre a barra para o valor exato"}</div>
    </div></div>
    <div class="panel-body">
      ${_fnGrupo === "total" ? '<div style="color:var(--muted);font-size:13px;padding:8px 0">Agrupamento em Total — sem série temporal.</div>'
        : serie.length ? svgBarChart(serie, { valueFmt: (v) => "R$ " + v.toFixed(2).replace(".", ","), axisFmt: (v) => "R$" + Math.round(v) })
        : '<div style="color:var(--muted);font-size:13px;padding:8px 0">Sem saídas no período.</div>'}
    </div>
  </div>

  ${!_fnPac ? `
  <div class="panel">
    <div class="panel-head"><div>
      <div class="panel-title">Custo por paciente</div>
      <div class="panel-title-sub">Somente medicamentos dispensados — sem diária de internação</div>
    </div></div>
    <div class="panel-body">
      ${rankPac.length ? svgHBarChart(rankPac, { valueFmt: fmtBRL })
        : '<div style="color:var(--muted);font-size:13px;padding:8px 0">Sem custo por paciente no período.</div>'}
    </div>
  </div>` : ""}

  <div class="panel">
    <div class="panel-head"><div>
      <div class="panel-title">Onde o dinheiro está</div>
      <div class="panel-title-sub">Substâncias por custo no período${pac ? " — " + _esc(pac.nome) : ""}</div>
    </div></div>
    <div class="panel-body">
      ${rankSub.length ? svgHBarChart(rankSub, { valueFmt: fmtBRL, color: CHART_COLORS.accent })
        : '<div style="color:var(--muted);font-size:13px;padding:8px 0">Sem custo por substância no período.</div>'}
    </div>
  </div>

  ${_fnPainelExecucao(grupos)}

  ${_fnPainelPerdas(custoTotal)}

  ${_fnPainelAVencer()}

  ${_fnPainelMensal()}

  ${_fnExtrato(grupos, custoTotal, doses)}
  `;
}

function _fnBarraFiltros() {
  const presets = [["hoje", "Hoje"], ["7", "7 dias"], ["30", "30 dias"], ["mes", "Este mês"], ["mespassado", "Mês passado"], ["tudo", "Tudo"]];
  const grupos = [["dia", "Diário"], ["semana", "Semanal"], ["mes", "Mensal"], ["total", "Total"]];
  return `
  <style>
    /* Barra de filtros própria da tela: as classes de formulário do projeto
       vivem dentro do modal e não valem aqui. */
    .fn-filtros{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:13px 16px;margin-bottom:18px;box-shadow:var(--shadow)}
    .fn-linha{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:9px}
    .fn-linha:last-child{margin-bottom:0}
    .fn-rot{font-size:10.5px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--muted);min-width:60px}
    .fn-det{font-size:12.5px;margin:2px 0 8px}
    .fn-det summary{cursor:pointer;color:var(--primary);font-weight:600;padding:2px 0}
    .fn-det table{margin-top:6px}
  </style>
  <div class="fn-filtros">
    <div class="fn-linha">
      <span class="fn-rot">Período</span>
      ${presets.map(([k, r]) => `<button class="btn ghost sm" onclick="fnPreset('${k}')">${r}</button>`).join("")}
      <input type="date" value="${_fnIni}" max="${_fnFim}" onchange="fnSetData('ini',this.value)">
      <span style="color:var(--muted);font-size:12.5px">até</span>
      <input type="date" value="${_fnFim}" min="${_fnIni}" max="${HOJE}" onchange="fnSetData('fim',this.value)">
    </div>
    <div class="fn-linha">
      <span class="fn-rot">Extrato</span>
      ${grupos.map(([k, r]) => `<button class="btn ${_fnGrupo === k ? "" : "ghost"} sm" onclick="fnSetGrupo('${k}')">${r}</button>`).join("")}
      <select onchange="fnSetPac(this.value)" style="min-width:230px;margin-left:10px">
        <option value="">Todos os pacientes</option>
        ${_fnPacientesComMovimento().map((p) => `<option value="${p.id}"${_fnPac === p.id ? " selected" : ""}>${_esc(p.nome)}${pacInternado(p) ? " · leito " + _esc(p.leito || "—") : " · alta"}</option>`).join("")}
      </select>
      <select onchange="fnSetTipo(this.value)">
        <option value="todos"${_fnTipo === "todos" ? " selected" : ""}>Medicamentos e materiais</option>
        <option value="medicamento"${_fnTipo === "medicamento" ? " selected" : ""}>Só medicamentos</option>
        <option value="material"${_fnTipo === "material" ? " selected" : ""}>Só materiais</option>
      </select>
      <button class="btn sm" onclick="imprimirExtratoCustos()">🖶 Imprimir extrato</button>
    </div>
  </div>`;
}

// Cabeçalho do extrato de internação — só quando há um paciente escolhido.
function _fnCabecalhoPaciente(p, custoTotal, linhas) {
  const alta = p.dataAlta && p.dataAlta < HOJE ? p.dataAlta : null;
  const diasInt = diasInternado(p);
  const noPeriodo = diffDias(_fnIni, _fnFim) + 1;
  return `
  <div class="panel">
    <div class="panel-head"><div>
      <div class="panel-title">${_esc(p.nome)}${p.leito ? ` · leito ${_esc(p.leito)}` : ""}</div>
      <div class="panel-title-sub">Admissão ${fmtDate(p.admissao)}${alta ? ` · alta ${fmtDate(alta)}` : " · internado"} · ${diasInt} dia${diasInt > 1 ? "s" : ""} de internação</div>
    </div></div>
    <div class="panel-body">
      <table>
        <thead><tr><th>Período do extrato</th><th class="num">Dias</th><th class="num">Doses</th><th class="num">Custo</th><th class="num">Custo/dia</th></tr></thead>
        <tbody><tr>
          <td>${fmtDate(_fnIni)} a ${fmtDate(_fnFim)}</td>
          <td class="num mono">${noPeriodo}</td>
          <td class="num mono">${linhas.filter((l) => l.dose).length}</td>
          <td class="num mono"><b>${fmtBRL(custoTotal)}</b></td>
          <td class="num mono">${fmtBRL(custoTotal / noPeriodo)}</td>
        </tr></tbody>
      </table>
    </div>
  </div>`;
}

function _fnExtrato(grupos, custoTotal, doses) {
  const comAlgo = grupos.filter((g) => g.linhas.length);
  const titulo = _fnGrupo === "dia" ? "diário" : _fnGrupo === "semana" ? "semanal" : _fnGrupo === "mes" ? "mensal" : "total";
  if (!comAlgo.length) {
    return `<div class="panel"><div class="panel-head"><div><div class="panel-title">Extrato ${titulo}</div></div></div>
      <div class="panel-body"><div style="color:var(--muted);font-size:13px">Nenhuma saída no período selecionado.</div></div></div>`;
  }
  const divisor = (g) => _fnGrupo === "dia" ? 1
    : _fnGrupo === "semana" ? 7
    : _fnGrupo === "mes" ? new Date(+g.k.slice(0, 4), +g.k.slice(5, 7), 0).getDate()
    : diffDias(_fnIni, _fnFim) + 1;

  const corpo = comAlgo.map((g) => `<tr>
      <td><b>${_fnRotuloGrupo(g.k)}</b></td>
      <td class="num mono">${g.pacs.size || "—"}</td>
      <td class="num mono">${g.doses}</td>
      <td class="num mono">${fmtDose(g.unidades)}</td>
      <td class="num mono"><b>${fmtBRL(g.custo)}</b></td>
      <td class="num mono">${fmtBRL(g.custo / divisor(g))}</td>
    </tr>
    ${_fnPac ? `<tr><td colspan="6" style="padding-top:0;border-top:none">${_fnDetalhe(g)}</td></tr>` : ""}`).join("");

  return `
  <div class="panel">
    <div class="panel-head"><div>
      <div class="panel-title">Extrato ${titulo}</div>
      <div class="panel-title-sub">${fmtDate(_fnIni)} a ${fmtDate(_fnFim)}${_fnPac ? " — abra cada linha para ver as saídas" : ""}</div>
    </div></div>
    <div class="panel-body">
      <table>
        <thead><tr><th>Período</th><th class="num">Pacientes</th><th class="num">Doses</th><th class="num">Unidades</th><th class="num">Custo</th><th class="num">Custo/dia</th></tr></thead>
        <tbody>${corpo}
          <tr><td><b>TOTAL</b></td><td class="num mono">—</td><td class="num mono"><b>${doses}</b></td>
            <td class="num mono">—</td><td class="num mono"><b>${fmtBRL(custoTotal)}</b></td>
            <td class="num mono">${fmtBRL(custoTotal / (diffDias(_fnIni, _fnFim) + 1))}</td></tr>
        </tbody>
      </table>
      <div class="foot-signoff">
        <span>Custo restrito à farmácia — não inclui diária de internação, salários ou sistema</span>
        <span>Farmacêutico RT: ${rtLinha()}</span>
      </div>
    </div>
  </div>`;
}

// Detalhe linha a linha só no extrato de um paciente: com todos juntos
// viraria uma segunda cópia do Livro de Registro dentro da tela de custos.
function _fnDetalhe(g) {
  return `<details class="fn-det"><summary>${g.linhas.length} saída${g.linhas.length > 1 ? "s" : ""}</summary>
    <table>
      <thead><tr><th>Data</th><th>Medicamento</th><th>Referência</th><th class="num">Qtd</th><th class="num">Custo</th></tr></thead>
      <tbody>${g.linhas.map((l) => `<tr>
        <td class="mono">${fmtDate(l.data)}</td>
        <td>${_esc(subNomeExibicao(subById(l.subId)))}</td>
        <td style="font-size:12px;color:var(--muted)">${_esc(l.ref || "—")}${l.jaCobrada ? " · custo lançado na transferência" : (l.custo === 0 && l.dose ? " · medicação do paciente" : "")}</td>
        <td class="num mono">${fmtDose(l.qtd)}</td>
        <td class="num mono">${l.custo ? fmtBRL(l.custo) : "—"}</td></tr>`).join("")}</tbody>
    </table></details>`;
}

/* ---------------- impressão ---------------- */
function imprimirExtratoCustos() {
  const linhas = _fnLinhas();
  const grupos = _fnPorGrupo(linhas).filter((g) => g.linhas.length);
  const custoTotal = linhas.reduce((a, l) => a + l.custo, 0);
  const doses = linhas.filter((l) => l.dose).length;
  const est = window.ESTAB || {};
  const pac = _fnPac ? patById(_fnPac) : null;
  const dias = diffDias(_fnIni, _fnFim) + 1;
  const nCols = pac ? 5 : 6;
  const grupoRot = _fnGrupo === "dia" ? "diário" : _fnGrupo === "semana" ? "semanal" : _fnGrupo === "mes" ? "mensal" : "total";

  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
  <title>Extrato de consumo e custos — ${fmtDate(_fnIni)} a ${fmtDate(_fnFim)}</title>
  <style>
  @page{size:A4 portrait;margin:12mm}
  body{font-family:"Public Sans",Arial,sans-serif;color:#1E2A28;font-size:11px;margin:0}
  .btn{position:fixed;top:12px;right:12px;background:#2C5F5A;color:#fff;border:none;padding:9px 15px;border-radius:8px;cursor:pointer;font:inherit;z-index:1000}
  @media print{.btn{display:none}}
  h1{font-size:15px;margin:0 0 3px}
  .sub{font-size:11px;color:#555;margin-bottom:12px;line-height:1.5}
  table{width:100%;border-collapse:collapse}
  th{text-align:left;font-size:9.5px;text-transform:uppercase;letter-spacing:.4px;color:#555;border-bottom:1px solid #333;padding:4px 6px}
  td{padding:3.5px 6px;border-bottom:1px solid #E5E1D5}
  .num{text-align:right;font-family:"IBM Plex Mono",monospace}
  .gr td{background:#F3F1EA;font-weight:700;page-break-after:avoid}
  .tot td{font-weight:700;border-top:1px solid #333;border-bottom:none}
  tr{page-break-inside:avoid}
  .rod{margin-top:16px;border-top:1px solid #333;padding-top:6px;font-size:9.5px;color:#555;display:flex;justify-content:space-between;gap:20px}
  </style></head><body>
  <button class="btn" onclick="window.print()">Imprimir / Salvar PDF</button>
  <h1>${_esc(est.nome_fantasia || est.razao_social || "Hospital Reviva")} — Extrato de consumo e custos da farmácia</h1>
  <div class="sub">
    ${pac ? `<b>Paciente:</b> ${_esc(pac.nome)}${pac.leito ? " · leito " + _esc(pac.leito) : ""} · admissão ${fmtDate(pac.admissao)}${pac.dataAlta ? " · alta " + fmtDate(pac.dataAlta) : ""}<br>` : "<b>Todos os pacientes</b><br>"}
    <b>Período:</b> ${fmtDate(_fnIni)} a ${fmtDate(_fnFim)} (${dias} dia${dias > 1 ? "s" : ""}) ·
    <b>Agrupamento:</b> ${grupoRot} ·
    <b>Doses:</b> ${doses} ·
    <b>Custo:</b> ${fmtBRL(custoTotal)}
  </div>
  <table>
    <thead><tr><th>Data</th><th>Medicamento</th>${pac ? "" : "<th>Paciente</th>"}<th>Referência</th><th class="num">Qtd</th><th class="num">Custo</th></tr></thead>
    <tbody>
      ${grupos.map((g) => `
        <tr class="gr"><td colspan="${nCols}">${_fnRotuloGrupo(g.k)} — ${g.doses} dose${g.doses === 1 ? "" : "s"} · ${fmtBRL(g.custo)}</td></tr>
        ${g.linhas.map((l) => `<tr>
          <td>${fmtDate(l.data)}</td>
          <td>${_esc(subNomeExibicao(subById(l.subId)))}</td>
          ${pac ? "" : `<td>${_esc(l.paciente ? ((patById(l.paciente) || {}).nome || "—") : "—")}</td>`}
          <td style="color:#555">${_esc(l.ref || "—")}${l.jaCobrada ? " (custo na transferência)" : ""}</td>
          <td class="num">${fmtDose(l.qtd)}</td>
          <td class="num">${l.custo ? fmtBRL(l.custo) : "—"}</td></tr>`).join("")}`).join("")}
      <tr class="tot"><td colspan="${nCols - 1}">TOTAL DO PERÍODO</td><td class="num">${fmtBRL(custoTotal)}</td></tr>
    </tbody>
  </table>
  <div class="rod">
    <span>Custo a preço de aquisição, restrito à farmácia. Medicação em custódia do paciente não gera custo ao hospital.</span>
    <span>Farmacêutico RT: ${rtLinha()}</span>
  </div>
  </body></html>`;
  const win = window.open("", "_blank");
  if (!win) { alert("Permita pop-ups para imprimir."); return; }
  win.document.open(); win.document.write(html); win.document.close();
}

/* ============================================================
   INDICADORES DE QUALIDADE E PERDA
   Tudo abaixo responde a uma pergunta que a tela antiga não fazia:
   quanto do dinheiro NÃO virou tratamento, e quanto do tratamento
   prescrito não chegou ao paciente.
   ============================================================ */

const _FN_SOS = /\bSOS\b|S\.?O\.?S\.?|SE\s+NECESS/i;
function _fnInternadoEm(p, d) {
  if (!p.admissao || p.admissao > d) return false;
  if (p.dataAlta && p.dataAlta < d) return false;
  return true;
}
// O lote é do estabelecimento? Perda de medicação da família não é perda
// do hospital — quem pagou foi a família.
function _fnLoteDaCasa(subId, lote, dono) {
  const b = _lotesAgrupados()[_chaveDaSaida(subId, lote, dono)];
  return !!b && !b.restritoPaciente;
}

/* ---- 3. Prescrito × dispensado ----
   Doses esperadas por dia: prescrições vigentes naquele dia, dos pacientes
   internados naquele dia, sem SOS (que não é previsível).
   Ressalva honesta: a prescrição é lida na versão de HOJE. Se uma dose foi
   suspensa ontem, o passado é recontado com a regra de agora. Serve para
   olhar os últimos dias, não para auditar meses fechados. */
/* Prescrições já filtradas e agrupadas por paciente, com o número de
   horários fixos pré-contado. Montado UMA vez: percorrer a lista inteira
   de prescrições para cada dia do período era quadrático e, num período
   longo com o banco cheio, é o tipo de conta que trava a tela. */
function _fnPrescPorPaciente() {
  const m = {};
  prescriptions.filter((pr) => {
    if (_fnPac && pr.paciente !== _fnPac) return false;
    if (_fnTipo === "todos") return true;
    const s = subById(pr.subId);
    return _fnTipo === "material" ? ehMaterial(s) : !ehMaterial(s);
  }).forEach((pr) => {
    const n = (pr.horarios || []).filter((h) => !_FN_SOS.test(String(h))).length;
    if (!n) return;
    (m[pr.paciente] = m[pr.paciente] || []).push({ pr, n });
  });
  return m;
}
function _fnEsperadasNoDia(d, porPac, alvos) {
  let n = 0;
  alvos.forEach((p) => {
    if (!_fnInternadoEm(p, d)) return;
    (porPac[p.id] || []).forEach((x) => { if (prescVigenteEm(x.pr, d)) n += x.n; });
  });
  return n;
}
function _fnExecucao(grupos) {
  const porPac = _fnPrescPorPaciente();
  const alvos = patients.filter((p) => !_fnPac || p.id === _fnPac);
  const esperadoPorDia = {};
  for (let d = _fnIni; d <= _fnFim; d = _fnAdd(d, 1)) esperadoPorDia[d] = _fnEsperadasNoDia(d, porPac, alvos);
  return grupos.map((g) => {
    const dias = _fnGrupo === "total" ? Object.keys(esperadoPorDia)
      : Object.keys(esperadoPorDia).filter((d) => _fnChaveGrupo(d) === g.k);
    const esperado = dias.reduce((a, d) => a + esperadoPorDia[d], 0);
    const feito = g.linhas.filter((l) => l.dose && !_FN_SOS.test(String(l.ref || ""))).length;
    return { k: g.k, esperado, feito, pct: esperado ? (feito / esperado) * 100 : null };
  });
}

/* ---- 1 e 4. Perdas e devoluções ---- */
function _fnPerdasAjuste() {
  return movements.filter((m) => m.tipo === "ajuste_saida" && m.data >= _fnIni && m.data <= _fnFim)
    .filter((m) => _fnLoteDaCasa(m.subId, m.lote, m.dono))
    .map((m) => ({ ...m, valor: m.qtd * custoUnitDaSaida(m.subId, m.lote, m.dono) }));
}
function _fnDevolucoes() {
  return movements.filter((m) => m.tipo === "devolucao" && m.data >= _fnIni && m.data <= _fnFim)
    .filter((m) => !_fnPac || m.paciente === _fnPac)
    .map((m) => ({ ...m, valor: m.qtd * (m.custoUnit || 0) }));
}
/* Lotes vencidos ainda com saldo: perda que já aconteceu mas ninguém
   lançou. Não é ajuste — é dinheiro parado na prateleira esperando baixa. */
function _fnVencidosEmEstoque() {
  return allLotes().filter((l) => !l.restritoPaciente && l.validade && l.validade < HOJE)
    .map((l) => ({ ...l, saldo: saldoLoteChave(l.chave) }))
    .filter((l) => l.saldo > 0)
    .map((l) => ({ ...l, valor: l.saldo * (l.custoUnit || 0) }))
    .sort((a, b) => b.valor - a.valor);
}

/* ---- 2. Validade a vencer ---- */
function _fnAVencer() {
  return allLotes().filter((l) => !l.restritoPaciente && l.validade && l.validade >= HOJE)
    .map((l) => ({ ...l, saldo: saldoLoteChave(l.chave), dias: diffDias(HOJE, l.validade) }))
    .filter((l) => l.saldo > 0 && l.dias <= 90)
    .map((l) => ({ ...l, valor: l.saldo * (l.custoUnit || 0) }))
    .sort((a, b) => a.dias - b.dias);
}

/* ---- 5. Evolução mensal ----
   Independe do período escolhido de propósito: a comparação com os meses
   anteriores é o contexto que diz se o mês atual está caro ou normal. */
function _fnEvolucaoMensal(n) {
  const transf = _lotesTransferidos();
  const fim = _fnFim.slice(0, 7);
  const meses = [];
  let [y, m] = fim.split("-").map(Number);
  for (let i = 0; i < n; i++) { meses.unshift(`${y}-${String(m).padStart(2, "0")}`); if (--m === 0) { m = 12; y--; } }
  const soma = {};
  meses.forEach((k) => (soma[k] = 0));
  movements.filter((m2) => m2.tipo === "saida")
    .filter((m2) => !_fnPac || m2.paciente === _fnPac)
    .filter((m2) => {
      if (_fnTipo === "todos") return true;
      const s = subById(m2.subId);
      return _fnTipo === "material" ? ehMaterial(s) : !ehMaterial(s);
    })
    .forEach((m2) => {
      const k = String(m2.data).slice(0, 7);
      if (soma[k] === undefined) return;
      if (transf.has(m2.lote) && !_fnEhTransfer(m2)) return;
      soma[k] += m2.qtd * (m2.custoUnit || 0);
    });
  return meses.map((k, i) => {
    const ant = i ? soma[meses[i - 1]] : null;
    return { k, valor: soma[k], varPct: ant ? ((soma[k] - ant) / ant) * 100 : null };
  });
}

/* ---- painéis ---- */
function _fnPainelExecucao(grupos) {
  if (_fnGrupo === "total") return "";
  const ex = _fnExecucao(grupos).filter((x) => x.esperado > 0);
  if (!ex.length) return "";
  const totEsp = ex.reduce((a, x) => a + x.esperado, 0);
  const totFeito = ex.reduce((a, x) => a + x.feito, 0);
  const pct = totEsp ? (totFeito / totEsp) * 100 : 0;
  // Abaixo de 95% costuma ser baixa não lançada, não dose não administrada.
  const cor = (p) => (p >= 98 ? CHART_COLORS.success : p >= 90 ? CHART_COLORS.accent : CHART_COLORS.warn);
  const serie = ex.map((x) => ({ label: _fnRotuloCurto(x.k), value: +x.pct.toFixed(1), color: cor(x.pct) }));
  const piores = ex.filter((x) => x.pct < 100).sort((a, b) => a.pct - b.pct).slice(0, 8);
  return `
  <div class="panel">
    <div class="panel-head"><div>
      <div class="panel-title">Execução do mapa — prescrito × dispensado</div>
      <div class="panel-title-sub">${totFeito} de ${totEsp} doses previstas (${pct.toFixed(1)}%) · SOS fora da conta, por não ser previsível</div>
    </div></div>
    <div class="panel-body">
      ${svgBarChart(serie, { valueFmt: (v) => v.toFixed(0) + "%", axisFmt: (v) => Math.round(v) + "%" })}
      ${piores.length ? `
      <table style="margin-top:14px">
        <thead><tr><th>Período abaixo do previsto</th><th class="num">Previstas</th><th class="num">Dispensadas</th><th class="num">Faltam</th><th class="num">%</th></tr></thead>
        <tbody>${piores.map((x) => `<tr>
          <td>${_fnRotuloGrupo(x.k)}</td>
          <td class="num mono">${x.esperado}</td><td class="num mono">${x.feito}</td>
          <td class="num mono"><b>${x.esperado - x.feito}</b></td>
          <td class="num mono">${x.pct.toFixed(1)}%</td></tr>`).join("")}</tbody>
      </table>
      <div style="font-size:12px;color:var(--muted);margin-top:8px">Lacuna quase sempre é baixa não lançada, não dose não administrada. A prescrição é lida na versão atual, então dias antigos podem ser recontados com regra de hoje.</div>` : ""}
    </div>
  </div>`;
}

function _fnPainelPerdas(custoTotal) {
  const ajustes = _fnPerdasAjuste();
  const devol = _fnDevolucoes();
  const vencidos = _fnVencidosEmEstoque();
  const vAj = ajustes.reduce((a, x) => a + x.valor, 0);
  const vDev = devol.reduce((a, x) => a + x.valor, 0);
  const vVenc = vencidos.reduce((a, x) => a + x.valor, 0);
  if (!vAj && !vDev && !vVenc) return "";
  return `
  <div class="panel">
    <div class="panel-head"><div>
      <div class="panel-title">Perdas e devoluções</div>
      <div class="panel-title-sub">O que não virou tratamento — e o que voltou para o estoque</div>
    </div></div>
    <div class="panel-body">
      <table>
        <thead><tr><th>Indicador</th><th class="num">Qtd</th><th class="num">Valor</th><th class="num">% do custo</th></tr></thead>
        <tbody>
          <tr><td><b>Perda lançada no período</b><div style="font-size:12px;color:var(--muted)">ajuste de inventário negativo — quebra, extravio, descarte</div></td>
            <td class="num mono">${ajustes.length}</td><td class="num mono"><b>${fmtBRL(vAj)}</b></td>
            <td class="num mono">${custoTotal ? ((vAj / custoTotal) * 100).toFixed(1) + "%" : "—"}</td></tr>
          <tr><td><b>Devolvido ao estoque</b><div style="font-size:12px;color:var(--muted)">kit não usado, alta ou mudança de prescrição — crédito, não perda</div></td>
            <td class="num mono">${devol.length}</td><td class="num mono" style="color:var(--accent)"><b>${fmtBRL(vDev)}</b></td>
            <td class="num mono">${custoTotal ? ((vDev / custoTotal) * 100).toFixed(1) + "%" : "—"}</td></tr>
          <tr><td><b>Vencido ainda em estoque</b><div style="font-size:12px;color:var(--muted)">já perdido, sem baixa lançada — conferir e ajustar</div></td>
            <td class="num mono">${vencidos.length}</td><td class="num mono" style="color:var(--warn)"><b>${fmtBRL(vVenc)}</b></td>
            <td class="num mono">—</td></tr>
        </tbody>
      </table>
      ${vencidos.length ? `<details class="fn-det" style="margin-top:10px"><summary>Ver os ${vencidos.length} lote${vencidos.length > 1 ? "s" : ""} vencido${vencidos.length > 1 ? "s" : ""} com saldo</summary>
        <table><thead><tr><th>Medicamento</th><th>Lote</th><th>Venceu em</th><th class="num">Saldo</th><th class="num">Valor</th></tr></thead>
        <tbody>${vencidos.map((l) => `<tr><td>${_esc(subNomeExibicao(subById(l.subId)))}</td><td class="mono">${_esc(l.lote)}</td>
          <td class="mono">${fmtDate(l.validade)}</td><td class="num mono">${fmtDose(l.saldo)}</td>
          <td class="num mono">${fmtBRL(l.valor)}</td></tr>`).join("")}</tbody></table></details>` : ""}
    </div>
  </div>`;
}

function _fnPainelAVencer() {
  const lotes = _fnAVencer();
  if (!lotes.length) return "";
  const faixa = (d) => (d <= 30 ? "30" : d <= 60 ? "60" : "90");
  const tot = { "30": 0, "60": 0, "90": 0 };
  lotes.forEach((l) => (tot[faixa(l.dias)] += l.valor));
  const rot = { "30": "Vence em até 30 dias", "60": "31 a 60 dias", "90": "61 a 90 dias" };
  const cor = { "30": CHART_COLORS.warn, "60": CHART_COLORS.accent, "90": CHART_COLORS.primary };
  return `
  <div class="panel">
    <div class="panel-head"><div>
      <div class="panel-title">Validade a vencer, em dinheiro</div>
      <div class="panel-title-sub">Estoque do estabelecimento com vencimento nos próximos 90 dias — consumir antes de virar perda</div>
    </div></div>
    <div class="panel-body">
      ${svgHBarChart(["30", "60", "90"].filter((f) => tot[f] > 0).map((f) => ({ label: rot[f], value: +tot[f].toFixed(2), color: cor[f] })), { valueFmt: fmtBRL })}
      <table style="margin-top:14px">
        <thead><tr><th>Medicamento</th><th>Lote</th><th>Validade</th><th class="num">Dias</th><th class="num">Saldo</th><th class="num">Valor</th></tr></thead>
        <tbody>${lotes.slice(0, 15).map((l) => `<tr>
          <td>${_esc(subNomeExibicao(subById(l.subId)))}</td>
          <td class="mono">${_esc(l.lote)}</td>
          <td class="mono">${fmtDate(l.validade)}</td>
          <td class="num mono" style="${l.dias <= 30 ? "color:var(--warn);font-weight:700" : ""}">${l.dias}</td>
          <td class="num mono">${fmtDose(l.saldo)}</td>
          <td class="num mono"><b>${fmtBRL(l.valor)}</b></td></tr>`).join("")}</tbody>
      </table>
      ${lotes.length > 15 ? `<div style="font-size:12px;color:var(--muted);margin-top:8px">Mostrando os 15 mais próximos do vencimento, de ${lotes.length}.</div>` : ""}
    </div>
  </div>`;
}

function _fnPainelMensal() {
  /* Corta os meses zerados do começo: antes da primeira compra o gráfico
     ficava com uma fileira de barras vazias que não dizem nada. Zero no
     meio da série permanece — aí é informação. */
  const todos = _fnEvolucaoMensal(12);
  const primeiro = todos.findIndex((x) => x.valor > 0);
  const meses = primeiro === -1 ? [] : todos.slice(primeiro);
  if (meses.length < 2) return "";
  const serie = meses.map((x) => ({ label: `${_FN_MES[+x.k.slice(5, 7) - 1]}/${x.k.slice(2, 4)}`, value: +x.valor.toFixed(2) }));
  const seta = (v) => (v == null ? "—" : `<span style="color:${v > 0 ? "var(--warn)" : "var(--success)"}">${v > 0 ? "▲" : "▼"} ${Math.abs(v).toFixed(1)}%</span>`);
  return `
  <div class="panel">
    <div class="panel-head"><div>
      <div class="panel-title">Evolução mensal</div>
      <div class="panel-title-sub">Últimos ${meses.length} meses${_fnPac ? " — " + _esc(patById(_fnPac).nome) : ""} · independe do período escolhido acima</div>
    </div></div>
    <div class="panel-body">
      ${svgBarChart(serie, { valueFmt: (v) => "R$ " + v.toFixed(2).replace(".", ","), axisFmt: (v) => "R$" + Math.round(v) })}
      <table style="margin-top:14px">
        <thead><tr><th>Mês</th><th class="num">Custo</th><th class="num">Variação</th></tr></thead>
        <tbody>${meses.slice().reverse().map((x) => `<tr>
          <td>${_FN_MES[+x.k.slice(5, 7) - 1]}/${x.k.slice(0, 4)}</td>
          <td class="num mono"><b>${fmtBRL(x.valor)}</b></td>
          <td class="num mono">${seta(x.varPct)}</td></tr>`).join("")}</tbody>
      </table>
    </div>
  </div>`;
}
