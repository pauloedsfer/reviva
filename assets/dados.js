/* ============================================================
   dados.js — Hospital Reviva | Sistema de Escrituração e Estoque
   Fonte de dados e funções de cálculo, compartilhada por todas
   as páginas. Os dados agora vêm do banco (Supabase); as funções
   de cálculo e gráficos permanecem idênticas ao protótipo.

   Arquitetura (mantida): MOVIMENTAÇÕES são a fonte de verdade do
   estoque. Saldos, custos e relatórios são sempre DERIVADOS delas.
   O carregamento é assíncrono: layout.js chama carregarConfig() e
   carregarDados() antes de renderizar a tela.
   ============================================================ */

const CAPACIDADE_TOTAL = 35;
const HOJE = new Date().toISOString().slice(0, 10); // data real de hoje
const DIARIA_INTERNACAO = 180; // parâmetro configurável — hospedagem/estrutura, sem medicamentos

/* ---- estado carregado do banco (preenchido por carregarDados) ---- */
let patients = [];
let substances = [];
let invoices = [];
let donations = [];
let patientMeds = [];
let initialInventory = [];   // inventário inicial (abertura do estoque)
let returns = [];
let ajustes = [];
let dispensations = [];
let prescriptions = [];
let prescritores = [];
let fornecedores = [];
let pops = [];
let cotacoes = [];
let custodiaDestinos = [];
let emergencyCart = { lacreAtual: "—", status: "—", ultimaConferencia: null, responsavelConferencia: "—", itens: [], historico: [] };
let movements = [];

/* ---- configuração (RT + estabelecimento), nunca hardcoded ---- */
window.RT = null;
window.ESTAB = null;

/* ---------------- carregamento do banco ---------------- */
async function carregarConfig() {
  const [{ data: rt }, { data: est }] = await Promise.all([
    window.SB.from("responsavel_tecnico").select("*").eq("ativo", true).limit(1),
    window.SB.from("estabelecimento").select("*").limit(1),
  ]);
  window.RT = (rt && rt[0]) || null;
  window.ESTAB = (est && est[0]) || null;
}

async function carregarDados() {
  const q = (sel) => window.SB.from(sel.t).select(sel.s || "*");
  const [
    subs, pacs, presc, invs, dons, mprop, inv, disp, devs, popsR, cart, cartItens, cartHist, prescs, forns,
  ] = await Promise.all([
    window.SB.from("substancias").select("*"),
    window.SB.from("pacientes").select("*, prescritores(nome,conselho,uf,numero)"),
    window.SB.from("prescricoes").select("*"),
    window.SB.from("notas_fiscais").select("*, fornecedores(nome), nota_fiscal_itens(*)"),
    window.SB.from("doacoes").select("*, doacao_itens(*)"),
    window.SB.from("medicacao_propria").select("*, medicacao_propria_itens(*)"),
    window.SB.from("inventario_inicial").select("*"),
    window.SB.from("dispensacoes").select("*"),
    window.SB.from("devolucoes").select("*"),
    window.SB.from("pops").select("*"),
    window.SB.from("carrinho_emergencia").select("*").limit(1),
    window.SB.from("carrinho_itens").select("*"),
    window.SB.from("carrinho_historico").select("*"),
    window.SB.from("prescritores").select("*"),
    window.SB.from("fornecedores").select("*"),
  ]).then((rs) => rs.map((r) => { if (r.error) throw r.error; return r.data || []; }));

  substances = subs.map((s) => ({ id: s.id, nome: s.nome, lista: s.lista, unidade: s.unidade,
    principio_ativo: s.principio_ativo, concentracao: s.concentracao, forma: s.forma }));
  prescritores = prescs.map((p) => ({ id: p.id, nome: p.nome, conselho: p.conselho, uf: p.uf, numero: p.numero, externo: !!p.externo }));
  fornecedores = forns.map((f) => ({ id: f.id, nome: f.nome, cnpj: f.cnpj, tipo: f.tipo }));

  patients = pacs.map((p) => {
    const pr = p.prescritores;
    const prescritor = pr ? `${pr.nome} — ${pr.conselho}-${pr.uf} ${pr.numero}` : "";
    return { id: p.id, nome: p.nome_completo, leito: p.leito, admissao: p.data_admissao,
             prescritor, prescritorId: p.prescritor_id, cpf: p.cpf, prontuario: p.prontuario,
             endereco: p.endereco, telefone: p.telefone, dataNascimento: p.data_nascimento, ativo: p.ativo, dataAlta: p.data_alta };
  });

  prescriptions = presc.map((x) => ({
    id: x.id, paciente: x.paciente_id, subId: x.substancia_id, dose: x.dose, via: x.via,
    horarios: Array.isArray(x.horarios) ? x.horarios : (x.horarios || []),
    qtdPorHorario: x.qtd_por_horario != null ? Number(x.qtd_por_horario) : 1,
    prescritorId: x.prescritor_id, dataInicio: x.data_inicio, ativo: x.ativo,
  }));

  invoices = invs.map((nf) => ({
    id: nf.id, numero: nf.numero, data: nf.data_emissao,
    fornecedor: nf.fornecedores ? nf.fornecedores.nome : "", canal: nf.canal,
    itens: (nf.nota_fiscal_itens || []).map((it) => ({
      subId: it.substancia_id, qtd: it.quantidade, lote: it.numero_lote,
      validade: it.validade, custoUnit: Number(it.custo_unit),
    })),
  }));

  donations = dons.map((d) => ({
    id: d.id, data: d.data, doador: d.doador,
    itens: (d.doacao_itens || []).map((it) => ({
      subId: it.substancia_id, qtd: it.quantidade, lote: it.numero_lote,
      validade: it.validade, valorEstimado: Number(it.valor_estimado),
    })),
  }));

  patientMeds = mprop.map((m) => ({
    id: m.id, data: m.data, paciente: m.paciente_id,
    itens: (m.medicacao_propria_itens || []).map((it) => ({
      id: it.id, subId: it.substancia_id, qtd: it.quantidade, lote: it.numero_lote,
      validade: it.validade, obs: it.obs,
    })),
  }));

  initialInventory = inv.map((i) => ({
    subId: i.substancia_id, qtd: i.quantidade, lote: i.numero_lote, validade: i.validade,
    custoUnit: Number(i.custo_unit), data: i.data, obs: i.observacao,
  }));

  dispensations = disp.map((d) => ({
    id: d.id, data: d.data, subId: d.substancia_id, lote: d.numero_lote, qtd: d.quantidade,
    ref: d.referencia, paciente: d.paciente_id,
  }));

  returns = devs.map((r) => ({
    data: r.data, subId: r.substancia_id, lote: r.numero_lote, qtd: r.quantidade,
    motivo: r.motivo, paciente: r.paciente_id,
  }));

  pops = popsR.map((p) => ({ id: p.id, area: p.area, titulo: p.titulo, status: p.status,
    codigo: p.codigo, versao: p.versao, dataVigencia: p.data_vigencia, proximaRevisao: p.proxima_revisao,
    responsavel: p.responsavel, observacao: p.observacao, ordem: p.ordem || 0 }))
    .sort((a, b) => (a.ordem - b.ordem) || (a.titulo || "").localeCompare(b.titulo || ""));

  const c = cart[0];
  if (c) {
    emergencyCart = {
      id: c.id, lacreAtual: c.lacre_atual, status: c.status, ultimaConferencia: c.ultima_conferencia,
      responsavelConferencia: (window.RT ? window.RT.nome : "—"),
      itens: cartItens.filter((i) => i.carrinho_id === c.id)
        .map((i) => ({ nome: i.nome, qtdPadrao: i.qtd_padrao, validade: i.validade })),
      historico: cartHist.filter((h) => h.carrinho_id === c.id)
        .sort((a, b) => (a.data < b.data ? 1 : -1))
        .map((h) => ({ data: h.data, evento: h.evento, responsavel: (window.RT ? window.RT.nome : "—") })),
    };
  }

  // Ajustes de inventário (tabela adicionada por migration_ajustes.sql).
  // Carrega de forma tolerante: se a migração ainda não rodou, segue sem ajustes.
  try {
    const { data: ajs, error: eaj } = await window.SB.from("ajustes_estoque").select("*");
    if (eaj) throw eaj;
    ajustes = (ajs || []).map((a) => ({
      id: a.id, data: a.data, subId: a.substancia_id, lote: a.numero_lote,
      delta: a.quantidade, saldoSistema: a.saldo_sistema, contagemFisica: a.contagem_fisica,
      justificativa: a.justificativa,
    }));
  } catch (e) { ajustes = []; }


  // Destinos de custódia (migration_alta.sql). Carga tolerante.
  try {
    const { data: cds, error: ecd } = await window.SB.from("custodia_destinos").select("*");
    if (ecd) throw ecd;
    custodiaDestinos = (cds || []).map((d) => ({ id: d.id, data: d.data, itemId: d.medicacao_propria_item_id, tipo: d.tipo, qtd: d.quantidade, obs: d.obs }));
  } catch (e) { custodiaDestinos = []; }

  movements = buildMovements();

  // Cotações (tabela adicionada por migration_cotacao.sql). Carga tolerante.
  try {
    const { data: cots, error: ec } = await window.SB.from("cotacoes").select("*, cotacao_itens(*, cotacao_precos(*))");
    if (ec) throw ec;
    cotacoes = (cots || []).map((c) => ({
      id: c.id, identificador: c.identificador, data: c.data, status: c.status, observacao: c.observacao,
      itens: (c.cotacao_itens || [])
        .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
        .map((it) => ({ id: it.id, substanciaId: it.substancia_id, descricao: it.descricao, unidade: it.unidade, quantidade: it.quantidade,
          precos: (it.cotacao_precos || []).map((p) => ({ id: p.id, fornecedorId: p.fornecedor_id, disponivel: p.disponivel,
            unidPorCaixa: p.unid_por_caixa == null ? null : Number(p.unid_por_caixa),
            precoCaixa: p.preco_caixa == null ? null : Number(p.preco_caixa), validade: p.validade })) })),
    })).sort((a, b) => (a.data < b.data ? 1 : -1));
  } catch (e) { cotacoes = []; }

}

/* Linha de identificação do RT, montada a partir da configuração. */
function rtLinha() {
  const rt = window.RT;
  if (!rt) return "Responsável técnico não configurado";
  return `${rt.nome} — ${rt.conselho}-${rt.uf} ${rt.numero_registro}`;
}

/* ---------------- helpers (idênticos ao protótipo) ---------------- */
const $ = (sel, el = document) => el.querySelector(sel);
const subById = (id) => substances.find((s) => s.id === id) || { nome: "—", lista: "—", unidade: "" };
const patById = (id) => patients.find((p) => p.id === id) || { nome: "—", leito: "—" };
const prescById = (id) => prescritores.find((p) => p.id === id) || null;
const prescNome = (id) => { const p = prescById(id); return p ? `${p.nome} — ${p.conselho}-${p.uf} ${p.numero}` : "—"; };
// Lotes existentes de uma substância com saldo > 0 (para devolução escolher a origem).
function lotesComSaldo(subId) {
  return allLotes().filter((l) => l.subId === subId).map((l) => l.lote)
    .filter((v, i, a) => a.indexOf(v) === i);
}
// Lotes disponíveis (saldo > 0) com validade e saldo, ordenados por FEFO (validade mais próxima primeiro).
function lotesDisponiveis(subId) {
  // Estoque GERAL: exclui custódia de pacientes (não-integrada)
  return allLotes().filter((l) => l.subId === subId && (l.origem !== "proprio" || l.integrado))
    .map((l) => ({ lote: l.lote, validade: l.validade, saldo: saldoLote(l.lote) }))
    .filter((x) => x.saldo > 0)
    .sort((a, b) => ((a.validade || "9999") < (b.validade || "9999") ? -1 : 1));
}
// Lotes de CUSTÓDIA do próprio paciente para uma substância (com saldo)
function lotesCustodiaDoPaciente(subId, pacienteId) {
  return allLotes().filter((l) => l.subId === subId && l.origem === "proprio" && !l.integrado && l.restritoPaciente === pacienteId)
    .map((l) => ({ lote: l.lote, validade: l.validade, saldo: saldoLote(l.lote) }))
    .filter((x) => x.saldo > 0)
    .sort((a, b) => ((a.validade || "9999") < (b.validade || "9999") ? -1 : 1));
}
function loteFEFO(subId) { const d = lotesDisponiveis(subId); return d[0] ? d[0].lote : ""; }
// Quantidade a partir do texto da dose ("1 comp." -> 1, "2 comp" -> 2; padrão 1).
function qtdDaDose(dose) { const m = (dose || "").match(/\d+/); return m ? parseInt(m[0], 10) : 1; }
// Quantidade a dispensar por horário: usa o campo explícito da prescrição (padrão 1).
function qtdPorHorario(pr) { return pr && pr.qtdPorHorario != null && pr.qtdPorHorario > 0 ? pr.qtdPorHorario : 1; }

/* ---- custódia: eventos de destino e status derivado ---- */
function destinosDoItem(itemId) { return custodiaDestinos.filter((d) => d.itemId === itemId); }
function itemIntegrado(itemId) { return destinosDoItem(itemId).some((d) => d.tipo === "integracao_estoque"); }
// saldo saído do lote por devolução à família / descarte (reduz o saldo)
function _saidaDestinos(itemId) {
  return destinosDoItem(itemId).filter((d) => d.tipo !== "integracao_estoque").reduce((a, d) => a + d.qtd, 0);
}
// status derivado de um item de custódia
function statusCustodia(pm, it) {
  if (itemIntegrado(it.id)) return "integrado";
  const saldoAtual = saldoLote(it.lote);
  const devolvido = destinosDoItem(it.id).some((d) => d.tipo === "devolucao_familia");
  if (devolvido && saldoAtual <= 0) return "devolvido";
  const p = patById(pm.paciente);
  if (p && p.ativo === false) return "aguardando";
  return "custodia";
}
const fmtDate = (d) => { if (!d) return "—"; const [y, m, dd] = d.split("-"); return `${dd}/${m}/${y}`; };
const fmtBRL = (v) => (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const diffDias = (d1, d2) => Math.round((new Date(d2) - new Date(d1)) / 86400000);

function allLotes() {
  const list = [];
  initialInventory.forEach((it) => list.push({
    subId: it.subId, lote: it.lote, validade: it.validade, qtd: it.qtd, custoUnit: it.custoUnit,
    origem: "inventario", fonte: "Inventário inicial", data: it.data,
  }));
  invoices.forEach((nf) => nf.itens.forEach((it) => list.push({
    subId: it.subId, lote: it.lote, validade: it.validade, qtd: it.qtd, custoUnit: it.custoUnit,
    origem: "compra", canal: nf.canal, fonte: `NF ${nf.numero} — ${nf.fornecedor}`, data: nf.data,
  })));
  donations.forEach((d) => d.itens.forEach((it) => list.push({
    subId: it.subId, lote: it.lote, validade: it.validade, qtd: it.qtd, custoUnit: 0, valorEstimado: it.valorEstimado,
    origem: "doacao", fonte: `Doação — ${d.doador}`, data: d.data,
  })));
  patientMeds.forEach((pm) => pm.itens.forEach((it) => {
    const integrado = itemIntegrado(it.id);
    list.push({
      subId: it.subId, lote: it.lote, validade: it.validade, qtd: it.qtd, custoUnit: 0,
      origem: "proprio", integrado, itemCustodiaId: it.id,
      restritoPaciente: integrado ? null : pm.paciente,
      fonte: integrado ? `Custódia integrada ao estoque — ${patById(pm.paciente).nome}` : `Medicação própria — ${patById(pm.paciente).nome}`,
      data: pm.data,
    });
  }));
  return list;
}

function saldoLote(lote) {
  const l = allLotes().find((x) => x.lote === lote);
  if (!l) return 0;
  const consumido = dispensations.filter((x) => x.lote === lote).reduce((a, x) => a + x.qtd, 0);
  const devolvido = returns.filter((x) => x.lote === lote).reduce((a, x) => a + x.qtd, 0);
  const ajustado = ajustes.filter((x) => x.lote === lote).reduce((a, x) => a + x.delta, 0);
  const destinado = l.itemCustodiaId ? _saidaDestinos(l.itemCustodiaId) : 0; // devolução à família / descarte
  return l.qtd - consumido + devolvido + ajustado - destinado;
}

function saldo(subId) {
  return allLotes().filter((l) => l.subId === subId && (l.origem !== "proprio" || l.integrado)).reduce((a, l) => a + saldoLote(l.lote), 0);
}

function custoMedio(subId) {
  const compras = allLotes().filter((l) => l.subId === subId && l.origem === "compra");
  const totalQtd = compras.reduce((a, l) => a + l.qtd, 0);
  const totalVal = compras.reduce((a, l) => a + l.qtd * l.custoUnit, 0);
  return totalQtd ? totalVal / totalQtd : 0;
}

function validadeStatus(validade) {
  const dias = diffDias(HOJE, validade);
  if (dias < 0) return { key: "vencido", label: "Vencido", dias };
  if (dias <= 90) return { key: "critico", label: `Vence em ${dias}d`, dias };
  return { key: "ok", label: "Regular", dias };
}

function movTipoTag(tipo) {
  if (tipo === "entrada") return '<span class="tag tag-in">ENTRADA</span>';
  if (tipo === "devolucao") return '<span class="tag tag-dev">DEVOLUÇÃO</span>';
  if (tipo === "ajuste_entrada") return '<span class="tag tag-in">AJUSTE +</span>';
  if (tipo === "ajuste_saida") return '<span class="tag tag-out">AJUSTE −</span>';
  return '<span class="tag tag-out">SAÍDA</span>';
}
function movSign(tipo) { return (tipo === "saida" || tipo === "ajuste_saida") ? "−" : "+"; }

/* Movimentações — derivadas de inventário, NF, doações, custódia, dispensações e devoluções. */
function buildMovements() {
  const list = [];
  allLotes().forEach((l) => list.push({
    data: l.data, tipo: "entrada", subId: l.subId, qtd: l.qtd, ref: l.fonte,
    paciente: l.restritoPaciente || null, lote: l.lote, custoUnit: l.custoUnit, origem: l.origem,
  }));
  dispensations.forEach((d) => {
    const lote = allLotes().find((l) => l.lote === d.lote);
    list.push({
      data: d.data, tipo: "saida", subId: d.subId, qtd: d.qtd, ref: d.ref,
      paciente: d.paciente, lote: d.lote, custoUnit: lote ? lote.custoUnit : custoMedio(d.subId),
    });
  });
  returns.forEach((r) => {
    const lote = allLotes().find((l) => l.lote === r.lote);
    list.push({
      data: r.data, tipo: "devolucao", subId: r.subId, qtd: r.qtd, ref: `Devolução — ${r.motivo}`,
      paciente: r.paciente, lote: r.lote, custoUnit: lote ? lote.custoUnit : custoMedio(r.subId),
    });
  });
  custodiaDestinos.forEach((d) => {
    // localizar o lote do item
    let loteInfo = null;
    patientMeds.some((pm) => pm.itens.some((it) => { if (it.id === d.itemId) { loteInfo = { lote: it.lote, subId: it.subId, pac: pm.paciente }; return true; } return false; }));
    if (!loteInfo) return;
    if (d.tipo === "integracao_estoque") return; // integração não movimenta saldo — muda a natureza do lote
    const rot = d.tipo === "devolucao_familia" ? "Devolução de custódia à família" : "Descarte de custódia";
    list.push({ data: d.data, tipo: "saida", subId: loteInfo.subId, qtd: d.qtd, ref: `${rot}${d.obs ? " — " + d.obs : ""}`,
      paciente: loteInfo.pac, lote: loteInfo.lote, custoUnit: 0, origem: "proprio" });
  });
  ajustes.forEach((a) => {
    list.push({
      data: a.data, tipo: a.delta >= 0 ? "ajuste_entrada" : "ajuste_saida", subId: a.subId,
      qtd: Math.abs(a.delta), ref: `Ajuste de inventário — ${a.justificativa}`,
      paciente: null, lote: a.lote, custoUnit: 0, origem: "ajuste",
    });
  });
  list.sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0));
  list.forEach((m, i) => (m.id = "M" + String(i + 1).padStart(3, "0")));
  return list;
}

function diasInternado(p) { return diffDias(p.admissao, p.dataAlta && p.dataAlta < HOJE ? p.dataAlta : HOJE) + 1; }
function custoMedicamentosPaciente(patId) {
  return movements.filter((m) => m.tipo === "saida" && m.paciente === patId).reduce((a, m) => a + m.qtd * (m.custoUnit || 0), 0);
}
function custoDiariasPaciente(p) { return diasInternado(p) * DIARIA_INTERNACAO; }
function custoTotalPaciente(p) { return custoDiariasPaciente(p) + custoMedicamentosPaciente(p.id); }
function periodoDispensacaoDias() {
  if (!dispensations.length) return 1;
  const datas = dispensations.map((d) => d.data).sort();
  return Math.max(diffDias(datas[0], datas[datas.length - 1]) + 1, 1);
}
function consumoMedioDiario(subId) {
  const total = dispensations.filter((d) => d.subId === subId).reduce((a, d) => a + d.qtd, 0);
  return total / periodoDispensacaoDias();
}

/* ---------------- mini gráficos SVG (sem dependências) ---------------- */
const CHART_COLORS = { primary: "#2C5F5A", accent: "#A9784F", success: "#5C7F58", warn: "#8B4A3A", line: "#DEDACD", ink: "#1E2A28", muted: "#8A928F" };

function svgBarChart(data, opts = {}) {
  const width = opts.width || 600, height = opts.height || 190;
  const pad = { top: 26, right: 14, bottom: 30, left: 14 };
  const chartW = width - pad.left - pad.right, chartH = height - pad.top - pad.bottom;
  const max = Math.max(...data.map((d) => d.value), 1);
  const gap = chartW / (data.length || 1);
  const barW = Math.min(gap * 0.5, 46);
  let bars = "";
  data.forEach((d, i) => {
    const h = max ? (d.value / max) * chartH : 0;
    const x = pad.left + i * gap + (gap - barW) / 2;
    const y = pad.top + chartH - h;
    bars += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(h, 1).toFixed(1)}" rx="5" fill="${opts.color || CHART_COLORS.primary}"/>
      <text x="${(x + barW / 2).toFixed(1)}" y="${(y - 8).toFixed(1)}" text-anchor="middle" font-size="11" font-family="IBM Plex Mono, monospace" fill="${CHART_COLORS.ink}">${opts.valueFmt ? opts.valueFmt(d.value) : d.value}</text>
      <text x="${(x + barW / 2).toFixed(1)}" y="${height - 10}" text-anchor="middle" font-size="10.5" font-family="Public Sans, sans-serif" fill="${CHART_COLORS.muted}">${d.label}</text>`;
  });
  return `<svg viewBox="0 0 ${width} ${height}" style="width:100%;height:${height}px;display:block">${bars}</svg>`;
}

function svgHBarChart(data, opts = {}) {
  const width = opts.width || 600;
  const barH = opts.barHeight || 24, rowGap = opts.gap || 16;
  const labelW = opts.labelWidth || 168;
  const chartW = width - labelW - 74;
  const max = Math.max(...data.map((d) => d.value), 1);
  const height = (data.length || 1) * (barH + rowGap);
  let rows = "";
  data.forEach((d, i) => {
    const y = i * (barH + rowGap);
    const w = Math.max((d.value / max) * chartW, 2);
    rows += `<text x="0" y="${y + barH / 2 + 4}" font-size="12" font-family="Public Sans, sans-serif" fill="${CHART_COLORS.ink}">${d.label}</text>
      <rect x="${labelW}" y="${y}" width="${w.toFixed(1)}" height="${barH}" rx="5" fill="${opts.color || CHART_COLORS.primary}"/>
      <text x="${(labelW + w + 8).toFixed(1)}" y="${y + barH / 2 + 4}" font-size="11.5" font-family="IBM Plex Mono, monospace" fill="${CHART_COLORS.ink}">${opts.valueFmt ? opts.valueFmt(d.value) : d.value}</text>`;
  });
  return `<svg viewBox="0 0 ${width} ${height}" style="width:100%;height:${height}px;display:block">${rows}</svg>`;
}

function listaTagClass(lista) {
  if (lista === "A") return "tag-a";
  if (lista.startsWith("B")) return "tag-b";
  if (lista.startsWith("C")) return "tag-c";
  return "";
}
