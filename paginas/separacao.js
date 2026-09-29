/* ============================================================
   separacao.js — Hospital Reviva
   Tela dedicada da Separação da farmácia.

   Por que deixou de ser modal: o modal fechava a cada impressão, e o
   fluxo real é gerar vários impressos seguidos do MESMO período —
   checklist, etiquetas dos kits, etiquetas dos sacos e folha de preparo.
   Refazer a seleção quatro vezes por dia era o custo. Aqui a tela
   permanece, e cada impresso tem o seu botão.

   Dependência de carga: esta tela reaproveita as funções de dose.js
   (_gerarEtiquetas, imprimirChecklistSeparacao, printLabels,
   imprimirEtiquetasSacos, imprimirFolhaPreparo e os utilitários de
   horário). Por isso separacao.html carrega dose.js ANTES deste arquivo,
   e o renderPage() daqui é o que vale, por ser o último declarado.
   Duplicar aquelas funções seria pior: dois lugares para corrigir o mesmo
   impresso.

   A separação é ANTECIPADA por natureza: hoje se separa o que será
   administrado amanhã e, nas sextas, o fim de semana inteiro, porque a
   farmácia fecha. Por isso ela tem período próprio, independente da data
   de dispensação (que baixa estoque e só aceita hoje ou retroativo).
   ============================================================ */

// Horários com prescrição vigente no período escolhido, já sem SOS.
// Varre todos os dias do período: uma prescrição pode começar no meio dele.
function _sepHorariosDoPeriodo(dias, pacId) {
  const set = new Set();
  dias.forEach((d) => {
    patients.filter((p) => _pacienteInternadoNaData(p, d))
      .filter((p) => !pacId || p.id === pacId)
      .forEach((p) => {
        _prescricoesNaData(d).filter((pr) => pr.paciente === p.id)
          .forEach((pr) => pr.horarios.forEach((h) => { if (!_ehSOSHor(h)) set.add(h); }));
      });
  });
  return Array.from(set).sort((a, b) => _horValor(a) - _horValor(b));
}

// Lê a tela. Concentrado aqui para os botões não repetirem a leitura.
function _sepOpts() {
  const ini = fv("sepIni") || _sepAmanha();
  const nd = Math.max(1, Math.min(14, parseInt(fv("sepDias"), 10) || 1));
  const dias = Array.from({ length: nd }, (_, i) => _fsAddDiasLocal(ini, i));
  const pac = fv("sepPac") || null;
  const horarios = Array.from(document.querySelectorAll(".sep-hor:checked")).map((c) => c.value);
  const incluirSOS = document.getElementById("sepSOS").checked;
  const colunas = parseInt(fv("sepCols"), 10) === 2 ? 2 : 3;
  return { ini, dias, pac, horarios, incluirSOS, colunas };
}

function _sepDias() { return _sepOpts().dias; }

/* Redesenha só os horários e o resumo quando muda data, quantidade de dias
   ou paciente — os horários disponíveis dependem das prescrições vigentes
   naquele período, não das de hoje. Preserva o que já estava marcado. */
function sepAtualizar() {
  const marcados = Array.from(document.querySelectorAll(".sep-hor:checked")).map((c) => c.value);
  const box = document.getElementById("sepHorBox");
  if (box) box.innerHTML = _sepChips(_sepDias(), fv("sepPac") || null, marcados.length ? marcados : null);
  sepResumo();
}

function _sepChips(dias, pacId, marcados) {
  const hor = _sepHorariosDoPeriodo(dias, pacId);
  if (!hor.length) return '<span style="color:var(--muted);font-size:12.5px">Nenhum horário com prescrição vigente neste período.</span>';
  return hor.map((h) =>
    `<label style="display:inline-flex;align-items:center;gap:5px;font-size:12.5px;margin:0 12px 6px 0">
      <input type="checkbox" class="sep-hor" value="${_esc(h)}"${!marcados || marcados.indexOf(h) !== -1 ? " checked" : ""}> ${_esc(h)}</label>`).join("");
}

/* Prévia do que vai sair. Conferir o volume ANTES de mandar para a
   impressora evita descobrir no papel que o período ou o paciente estavam
   errados — e diz de quantos sacos e etiquetas a bancada vai precisar. */
function sepResumo() {
  const el = document.getElementById("sepResumo");
  if (!el) return;
  const o = _sepOpts();
  let kits = 0;
  const pacs = new Set();
  o.dias.forEach((dia) => {
    _gerarEtiquetas({ ...o, data: dia }).forEach((l) => { kits++; pacs.add(l.patient.id); });
  });
  const d1 = fmtDate(o.dias[0]), d2 = fmtDate(o.dias[o.dias.length - 1]);
  el.innerHTML = kits
    ? `<b>${o.dias.length === 1 ? d1 : d1 + " a " + d2}</b> · ${pacs.size} paciente${pacs.size === 1 ? "" : "s"} · <b>${kits}</b> etiqueta${kits === 1 ? "" : "s"} de kit (uma por paciente e horário)`
    : '<span style="color:var(--muted)">Nada a separar com esta seleção — confira período, paciente e horários.</span>';
}

function _sepValida(o, tipo) {
  if (!o.horarios.length && !o.incluirSOS && tipo !== "prep") {
    alert("Selecione ao menos um horário.");
    return false;
  }
  return true;
}

// Cada botão imprime e a tela continua aqui, com a seleção intacta.
function sepImprimir(tipo) {
  const o = _sepOpts();
  if (!_sepValida(o, tipo)) return;
  if (tipo === "check") return imprimirChecklistSeparacao(o);
  if (tipo === "etiq") return window.printLabels(o);
  if (tipo === "sacos") return imprimirEtiquetasSacos(o);
  if (tipo === "prep") return imprimirFolhaPreparo(o);
  /* "Tudo" abre quatro janelas: o espaçamento evita que o navegador
     descarte as seguintes como pop-up em rajada. */
  imprimirChecklistSeparacao(o);
  setTimeout(() => window.printLabels(o), 400);
  setTimeout(() => imprimirEtiquetasSacos(o), 800);
  setTimeout(() => imprimirFolhaPreparo(o), 1200);
}

function renderPage() {
  const internados = patients.filter((p) => _pacienteInternadoNaData(p, _sepAmanha()))
    .sort((a, b) => (a.leito || "").localeCompare(b.leito || "", "pt-BR", { numeric: true }) || a.nome.localeCompare(b.nome, "pt-BR"));
  if (!internados.length) {
    return `<div class="note-box"><b>Nenhum paciente internado na data de separação.</b> Confira as admissões e altas em Pacientes.</div>`;
  }
  const ini = _sepAmanha();

  return `
  <style>
    /* As classes .ff/.row2/.row3 do projeto existem só dentro de #modalRoot;
       fora do modal ficariam sem estilo. Estilos próprios da tela, com
       prefixo sep- para não colidir com nada. */
    .sep-row{display:grid;grid-template-columns:repeat(3,1fr);gap:13px;margin-bottom:13px}
    .sep-f{margin-bottom:13px}
    .sep-f label,.sep-row label{display:block;font-size:12px;font-weight:600;color:var(--ink-soft);margin-bottom:5px}
    .sep-f select,.sep-f input,.sep-row select,.sep-row input{width:100%}
    .sep-acoes{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}
    @media (max-width:820px){.sep-row{grid-template-columns:1fr}}
  </style>
  <div class="card">
    <div class="note-box" style="margin-top:0">Gera o material para montar os kits. O <b>checklist</b> é a folha de conferência da farmácia (uma por paciente); as <b>etiquetas dos kits</b> identificam cada pacote, um por paciente e por horário; as <b>etiquetas dos sacos</b> são as do saco do dia e as dos três períodos. Isto <b>não baixa estoque</b> — a baixa é feita na tela de Dispensação, no dia da administração.</div>

    <div class="sep-row">
      <div><label>A partir de *</label>
        <input id="sepIni" type="date" value="${ini}" onchange="sepAtualizar()"></div>
      <div><label>Quantos dias</label>
        <select id="sepDias" onchange="sepAtualizar()">
          <option value="1">1 dia</option>
          <option value="2">2 dias</option>
          <option value="3" selected>3 dias (fim de semana)</option>
          <option value="4">4 dias</option>
          <option value="7">7 dias (semana)</option>
        </select></div>
      <div><label>Paciente</label>
        <select id="sepPac" onchange="sepAtualizar()">
          <option value="">★ TODOS os internados (${internados.length})</option>
          ${internados.map((p) => `<option value="${p.id}">${_esc(p.nome)}${p.leito ? " · leito " + _esc(p.leito) : ""}</option>`).join("")}
        </select></div>
    </div>

    <div class="sep-f"><label>Horários a incluir</label>
      <div id="sepHorBox" style="padding:2px 0 6px">${_sepChips(Array.from({ length: 3 }, (_, i) => _fsAddDiasLocal(ini, i)), null, null)}</div>
      <label style="display:inline-flex;align-items:center;gap:5px;font-size:12.5px;font-weight:400;margin:0">
        <input type="checkbox" id="sepSOS" onchange="sepResumo()" style="width:auto"> Incluir SOS <span style="color:var(--muted)">(normalmente não entra no kit)</span></label></div>

    <div class="sep-f" style="max-width:360px"><label>Colunas das etiquetas dos kits</label>
      <select id="sepCols">
        <option value="2">2 colunas — etiqueta maior</option>
        <option value="3" selected>3 colunas — aproveita melhor a folha</option>
      </select></div>

    <div class="note-box" id="sepResumo" style="margin:0 0 14px">—</div>

    <div class="sep-acoes">
      <button class="btn" onclick="sepImprimir('check')">🖶 Checklist de separação</button>
      <button class="btn" onclick="sepImprimir('etiq')">🖶 Etiquetas dos kits</button>
      <button class="btn" onclick="sepImprimir('sacos')">🖶 Etiquetas dos sacos</button>
      <button class="btn" onclick="sepImprimir('prep')">🖶 Folha de preparo e SOS</button>
      <button class="btn ghost" onclick="sepImprimir('tudo')">🖶 Tudo</button>
    </div>

    <div class="note-box" style="margin-bottom:0">Insulina, gotas, xarope e pomada <b>não geram etiqueta</b>: aparecem no checklist marcadas como preparo na hora e saem na folha própria, com espaço para a enfermagem registrar glicemia, quantidade e rubrica. O SOS sai só nessa folha.</div>
  </div>`;
}

// O resumo depende do DOM já montado — daí rodar no afterRender.
function afterRender() { sepResumo(); }
