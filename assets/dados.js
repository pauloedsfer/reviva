/* ============================================================
   dados.js — Hospital Reviva | Sistema de Escrituração e Estoque
   Fonte de dados e funções de cálculo, compartilhada por todas
   as páginas. Os dados agora vêm do banco (Supabase); as funções
   de cálculo e gráficos.

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
let transferenciasCustodia = [];
let prescriptions = [];
let prescritores = [];
let fornecedores = [];
let pops = [];
let cotacoes = [];
let custodiaDestinos = [];
// cache das posições de estoque; zerado a cada recarga de dados
let _cachePosicoes = null;
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

/* ------------------------------------------------------------------
   sbFetchAll — leitura COMPLETA de uma tabela.

   O PostgREST (camada REST do Supabase) devolve no máximo 1000 linhas
   por requisição. Um `.select("*")` puro NÃO devolve a tabela inteira:
   devolve a primeira página. Sem paginação, a partir da linha 1001 os
   registros ficam invisíveis para o sistema — o INSERT grava, o banco
   guarda, mas a tela nunca mais enxerga. Foi exatamente o que
   aconteceu com `dispensacoes`.

   Aqui a leitura é feita em blocos de 1000 via `.range()`, com ordem
   estável por `id` (chave primária, sempre única) para que nenhuma
   linha seja pulada nem repetida entre as páginas.
   ------------------------------------------------------------------ */
const SB_PAGINA = 1000;

async function sbFetchAll(tabela, select) {
  const out = [];
  let ini = 0;
  for (;;) {
    const { data, error } = await window.SB
      .from(tabela)
      .select(select || "*")
      .order("id", { ascending: true })
      .range(ini, ini + SB_PAGINA - 1);
    if (error) throw error;
    const lote = data || [];
    out.push(...lote);
    if (lote.length < SB_PAGINA) break;   // última página
    ini += SB_PAGINA;
    if (ini > 500000) break;              // trava de segurança
  }
  return out;
}

async function carregarDados() {
  _cachePosicoes = null;
  const [
    subs, pacs, presc, invs, dons, mprop, inv, disp, devs, popsR, cart, cartItens, cartHist, prescs, forns, transf,
  ] = await Promise.all([
    sbFetchAll("substancias"),
    sbFetchAll("pacientes", "*, prescritores(nome,conselho,uf,numero)"),
    sbFetchAll("prescricoes"),
    sbFetchAll("notas_fiscais", "*, fornecedores(nome), nota_fiscal_itens(*)"),
    sbFetchAll("doacoes", "*, doacao_itens(*)"),
    sbFetchAll("medicacao_propria", "*, medicacao_propria_itens(*)"),
    sbFetchAll("inventario_inicial"),
    sbFetchAll("dispensacoes"),
    sbFetchAll("devolucoes"),
    sbFetchAll("pops"),
    window.SB.from("carrinho_emergencia").select("*").limit(1)
      .then((r) => { if (r.error) throw r.error; return r.data || []; }),
    sbFetchAll("carrinho_itens"),
    sbFetchAll("carrinho_historico"),
    sbFetchAll("prescritores"),
    sbFetchAll("fornecedores"),
    sbFetchAll("transferencias_custodia"),
  ]);

  substances = subs.map((s) => ({ id: s.id, nome: s.nome, lista: s.lista, unidade: s.unidade,
    principio_ativo: s.principio_ativo, concentracao: s.concentracao, forma: s.forma,
    categoria: s.categoria || "NAO CLASSIFICADO", padronizado: s.padronizado !== false }));
  prescritores = prescs.map((p) => ({ id: p.id, nome: p.nome, conselho: p.conselho, uf: p.uf, numero: p.numero, externo: !!p.externo }));
  fornecedores = forns.map((f) => ({ id: f.id, nome: f.nome, cnpj: f.cnpj, tipo: f.tipo,
    situacao: f.situacao || "ativo",
    contato: f.contato, telefone: f.telefone, whatsapp: f.whatsapp, email: f.email,
    docAfe: !!f.doc_afe, docLicenca: !!f.doc_licenca, docCertidoes: !!f.doc_certidoes, docTabela: !!f.doc_tabela, docValidade: f.doc_validade,
    avalPrazo: f.aval_prazo, avalResposta: f.aval_resposta, avalAtendimento: f.aval_atendimento, avalData: f.aval_data, avalObs: f.aval_obs }));

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
    prescritorId: x.prescritor_id, dataInicio: x.data_inicio, dataFim: x.data_fim, ativo: x.ativo,
  }));

  invoices = invs.map((nf) => ({
    id: nf.id, numero: nf.numero, data: nf.data_emissao,
    fornecedor: nf.fornecedores ? nf.fornecedores.nome : "", fornecedorId: nf.fornecedor_id, canal: nf.canal,
    itens: (nf.nota_fiscal_itens || []).map((it) => ({
      id: it.id, subId: it.substancia_id, qtd: Number(it.quantidade), lote: it.numero_lote,
      validade: it.validade, custoUnit: Number(it.custo_unit),
    })),
    valorTotal: nf.valor_total == null ? null : Number(nf.valor_total),
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

  transferenciasCustodia = (transf || []).map((t) => ({
    id: t.id, data: t.data, subId: t.substancia_id, paciente: t.paciente_id,
    loteOrigem: t.lote_origem, loteDestino: t.lote_destino, validade: t.validade,
    qtd: Number(t.quantidade), custoUnit: Number(t.custo_unit || 0), obs: t.observacao,
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
    responsavel: p.responsavel, observacao: p.observacao, ordem: p.ordem || 0, corpo: p.corpo || null }))
    .sort(_popCmp);

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
    const ajs = await sbFetchAll("ajustes_estoque");
    ajustes = (ajs || []).map((a) => ({
      id: a.id, data: a.data, subId: a.substancia_id, lote: a.numero_lote,
      delta: a.quantidade, saldoSistema: a.saldo_sistema, contagemFisica: a.contagem_fisica,
      justificativa: a.justificativa,
    }));
  } catch (e) { ajustes = []; }


  // Destinos de custódia (migration_alta.sql). Carga tolerante.
  try {
    const cds = await sbFetchAll("custodia_destinos");
    custodiaDestinos = (cds || []).map((d) => ({ id: d.id, data: d.data, itemId: d.medicacao_propria_item_id, tipo: d.tipo, qtd: d.quantidade, obs: d.obs }));
  } catch (e) { custodiaDestinos = []; }

  _cachePosicoes = null;   // dados novos: recalcula as posições
  movements = buildMovements();

  // Cotações (tabela adicionada por migration_cotacao.sql). Carga tolerante.
  try {
    const cots = await sbFetchAll("cotacoes", "*, cotacao_itens(*, cotacao_precos(*))");
    cotacoes = (cots || []).map((c) => ({
      id: c.id, identificador: c.identificador, data: c.data, status: c.status, observacao: c.observacao,
      itens: (c.cotacao_itens || [])
        .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
        .map((it) => ({ id: it.id, substanciaId: it.substancia_id, descricao: it.descricao, unidade: it.unidade, quantidade: it.quantidade,
          decisaoFornecedorId: it.decisao_fornecedor_id, decisaoCaixas: it.decisao_caixas == null ? null : Number(it.decisao_caixas),
          decisaoObs: it.decisao_obs, decisaoStatus: it.decisao_status || "sugestao",
          precos: (it.cotacao_precos || []).map((p) => ({ id: p.id, fornecedorId: p.fornecedor_id, disponivel: p.disponivel,
            unidPorCaixa: p.unid_por_caixa == null ? null : Number(p.unid_por_caixa),
            precoCaixa: p.preco_caixa == null ? null : Number(p.preco_caixa), validade: p.validade })) })),
    })).sort((a, b) => (a.data < b.data ? 1 : -1));
  } catch (e) { cotacoes = []; }

}

/* Linha de identificação do RT, montada a partir da configuração. */
// atalho global de moeda (usado também fora das páginas que declaravam brl localmente)
function brl(v) { return (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

function rtLinha() {
  const rt = window.RT;
  if (!rt) return "Responsável técnico não configurado";
  return `${rt.nome} — ${rt.conselho}-${rt.uf} ${rt.numero_registro}`;
}

/* ---------------- helpers ---------------- */
const $ = (sel, el = document) => el.querySelector(sel);
const subById = (id) => substances.find((s) => s.id === id) || { nome: "—", lista: "—", unidade: "" };
/* ---- Paciente internado ----
   Paciente com alta continua no cadastro (histórico e escrituração), mas
   não ocupa leito nem entra em contagem, seletor ou mapa. */
function pacInternado(p) { return !!p && p.ativo !== false; }
function pacientesInternados() { return patients.filter(pacInternado); }

const patById = (id) => patients.find((p) => p.id === id) || { nome: "—", leito: "—" };
const prescById = (id) => prescritores.find((p) => p.id === id) || null;

/* ---- Vigência da prescrição ----
   Uma prescrição vale numa data quando não foi suspensa manualmente, já
   começou e ainda não passou da data limite. A data limite atende os
   tratamentos com duração definida (antimicrobianos, corticoides em
   esquema curto): terminado o prazo, a prescrição sai do mapa e da
   dispensação sozinha, sem depender de alguém lembrar de suspender. */
function prescVigenteEm(pr, d) {
  if (!pr || pr.ativo === false) return false;
  const dia = d || HOJE;
  if (pr.dataInicio && pr.dataInicio > dia) return false;
  if (pr.dataFim && pr.dataFim < dia) return false;
  return true;
}
// encerrada pela data limite (e não por suspensão manual)
function prescEncerrada(pr, d) {
  return !!(pr && pr.ativo !== false && pr.dataFim && pr.dataFim < (d || HOJE));
}
// dias restantes até a data limite (null se não houver)
function prescDiasRestantes(pr, d) {
  if (!pr || !pr.dataFim) return null;
  const dia = d || HOJE;
  return Math.round((new Date(pr.dataFim + "T12:00:00") - new Date(dia + "T12:00:00")) / 86400000);
}

/* ---- ordenação dos POPs: por código, FAR antes de ENF, número crescente ----
   POPs sem código vão para o fim (ordenados por 'ordem' e depois pelo título). */
const _POP_AREA_ORDEM = { FAR: 0, ENF: 1 };
function _popCmp(a, b) {
  const par = (p) => {
    const m = /^POP-([A-Za-z]+)-(\d+)/.exec((p.codigo || "").trim());
    if (!m) return null;
    const sigla = m[1].toUpperCase();
    const pri = _POP_AREA_ORDEM[sigla] !== undefined ? _POP_AREA_ORDEM[sigla] : 90;
    return { pri, sigla, num: parseInt(m[2], 10) };
  };
  const A = par(a), B = par(b);
  if (A && !B) return -1;             // com código vem antes de sem código
  if (!A && B) return 1;
  if (!A && !B) return (a.ordem - b.ordem) || (a.titulo || "").localeCompare(b.titulo || "");
  return (A.pri - B.pri)                       // FAR (0) antes de ENF (1)
      || A.sigla.localeCompare(B.sigla)        // desempate entre siglas de mesma prioridade
      || (A.num - B.num);                      // número crescente
}

/* ---- qualificação de fornecedores ---- */
function fornById(id) { return fornecedores.find((f) => f.id === id) || null; }
// habilitação: documentos essenciais (AFE + Licença) recebidos e não vencidos
function fornHabilitado(f) {
  if (!f) return false;
  const essenciais = f.docAfe && f.docLicenca;
  const vencido = f.docValidade && f.docValidade < HOJE;
  return essenciais && !vencido;
}
function fornDocsPendentes(f) {
  const p = [];
  if (!f.docAfe) p.push("AFE");
  if (!f.docLicenca) p.push("Licença");
  if (!f.docCertidoes) p.push("Certidões");
  if (!f.docTabela) p.push("Tabela");
  if (f.docValidade && f.docValidade < HOJE) p.push("Licença vencida");
  return p;
}
// Vínculos de um fornecedor — se houver, ele NÃO pode ser excluído, apenas
// inativado: apagar apagaria a rastreabilidade de compras já realizadas.
function fornVinculos(id) {
  const nfs = invoices.filter((n) => n.fornecedorId === id).length;
  let precos = 0;
  cotacoes.forEach((c) => (c.itens || []).forEach((it) =>
    (it.precos || []).forEach((p) => { if (p.fornecedorId === id) precos++; })));
  return { nfs, precos, total: nfs + precos };
}
function fornAtivo(f) { return f && f.situacao !== "inativo"; }

// desempenho consolidado: pior nota entre os critérios avaliados
function fornDesempenho(f) {
  const notas = [f.avalPrazo, f.avalResposta, f.avalAtendimento].filter(Boolean);
  if (!notas.length) return null;
  if (notas.includes("ruim")) return "ruim";
  if (notas.includes("regular")) return "regular";
  return "bom";
}
const prescNome = (id) => { const p = prescById(id); return p ? `${p.nome} — ${p.conselho}-${p.uf} ${p.numero}` : "—"; };
// Lotes existentes de uma substância com saldo > 0 (para devolução escolher a origem).
function lotesComSaldo(subId) {
  return allLotes().filter((l) => l.subId === subId).map((l) => l.lote)
    .filter((v, i, a) => a.indexOf(v) === i);
}
// Lotes disponíveis (saldo > 0) com validade e saldo, ordenados por FEFO (validade mais próxima primeiro).
function lotesDisponiveis(subId) {
  // Estoque GERAL: exclui todo lote restrito a paciente (trazido pela família
  // ou transferido do estoque), pois não está mais disponível ao serviço.
  return allPosicoes().filter((p) => p.subId === subId && !p.restritoPaciente)
    .map((p) => ({ lote: p.lote, validade: p.validade, saldo: saldoPosicao(p), chave: p.chave }))
    .filter((x) => x.saldo > 0)
    .sort((a, b) => ((a.validade || "9999") < (b.validade || "9999") ? -1 : 1));
}
// Lotes de CUSTÓDIA do próprio paciente para uma substância (com saldo)
// data da última administração de um lote (para saber se já está em uso)
function ultimoUsoLote(lote) {
  const ds = dispensations.filter((x) => x.lote === lote).map((x) => x.data).sort();
  return ds.length ? ds[ds.length - 1] : null;
}

/* Lotes de uso exclusivo do paciente: trazidos por ele (origem "proprio")
   ou transferidos do estoque da clínica (origem "transferido").

   ORDEM DIFERENTE DO ESTOQUE GERAL — aqui NÃO se usa FEFO puro.
   No estoque da clínica, começar pelo que vence antes evita perda para o
   serviço. Na custódia o medicamento é do paciente e já foi pago: abrir uma
   caixa nova enquanto restam poucos comprimidos na anterior gera sobra
   fracionada, confunde a separação e tende a vencer nas mãos dele.
   Por isso a preferência é: TERMINAR O LOTE JÁ EM USO; entre os não
   iniciados, aí sim o que vence primeiro. */
function lotesCustodiaDoPaciente(subId, pacienteId) {
  return allPosicoes().filter((p) => p.subId === subId && p.restritoPaciente === pacienteId)
    .map((p) => ({ lote: p.lote, validade: p.validade, saldo: saldoPosicao(p),
                   qtd: p.qtd, chave: p.chave, ultimoUso: ultimoUsoLote(p.lote) }))
    .filter((x) => x.saldo > 0)
    .map((x) => ({ ...x, emUso: x.saldo < x.qtd }))
    .sort((a, b) => {
      if (a.emUso !== b.emUso) return a.emUso ? -1 : 1;          // aberto primeiro
      if (a.emUso) return (b.ultimoUso || "").localeCompare(a.ultimoUso || ""); // o mais recente
      return String(a.validade || "9999").localeCompare(String(b.validade || "9999")); // FEFO entre os fechados
    });
}
// o lote de custódia que o sistema sugere por padrão
function loteCustodiaSugerido(subId, pacienteId) {
  const l = lotesCustodiaDoPaciente(subId, pacienteId);
  return l.length ? l[0] : null;
}
function loteFEFO(subId) { const d = lotesDisponiveis(subId); return d[0] ? d[0].lote : ""; }
// Quantidade a partir do texto da dose ("1 comp." -> 1, "2 comp" -> 2; padrão 1).
function qtdDaDose(dose) { const m = (dose || "").match(/\d+/); return m ? parseInt(m[0], 10) : 1; }
/* ---- Dose administrada x quantidade consumida do estoque ----
   A prescrição pode ser fracionada (ex.: meio comprimido). Em forma sólida,
   partir o comprimido descarta o restante — administra-se a fração, mas o
   estoque perde a UNIDADE INTEIRA. Em formas líquidas não há descarte: a
   quantidade consumida é igual à administrada. */
function qtdPorHorario(pr) { return pr && pr.qtdPorHorario != null && Number(pr.qtdPorHorario) > 0 ? Number(pr.qtdPorHorario) : 1; }

// forma sólida fracionável com descarte do restante (comprimido, cápsula, drágea)
function formaSolida(sub) {
  const f = ((sub && sub.forma) || "").toUpperCase();
  const u = ((sub && sub.unidade) || "").toUpperCase();
  if (/COMPRIMIDO|CAPSULA|CÁPSULA|DRAGEA|DRÁGEA/.test(f)) return true;
  if (/^(COMP|CAPS|DRAG)/.test(u)) return true;
  return false;
}
// quantidade que efetivamente SAI do estoque por horário
function qtdConsumida(pr) {
  const q = qtdPorHorario(pr);
  return formaSolida(pr ? subById(pr.subId) : null) ? Math.ceil(q) : q;
}
// há descarte de fração? (administra menos do que consome)
function temDescarte(pr) { return qtdConsumida(pr) > qtdPorHorario(pr) + 1e-9; }
// exibição de fração: 0,5 → ½ · 1,5 → 1½ · 2 → 2
/* Horários padronizados (clicáveis na prescrição). JEJUM e SOS são
   marcadores especiais: JEJUM vai ao topo do mapa, SOS ao final. */
const HORARIOS_PADRAO = ["JEJUM", "06:00", "09:00", "12:00", "15:00", "18:00", "21:00", "00:00", "SOS"];

function fmtDose(q) {
  const n = Number(q) || 0;
  const inteiro = Math.floor(n + 1e-9), frac = n - inteiro;
  let fs = "";
  if (Math.abs(frac - 0.5) < 0.01) fs = "½";
  else if (Math.abs(frac - 0.25) < 0.01) fs = "¼";
  else if (Math.abs(frac - 0.75) < 0.01) fs = "¾";
  else if (frac > 0.01) return n.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
  if (inteiro === 0) return fs || "0";
  return String(inteiro) + fs;
}

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
  // Transferido do estoque da clínica: vira lote de custódia do paciente,
  // preservando o custo (a clínica comprou — não é medicação da família).
  transferenciasCustodia.forEach((t) => list.push({
    subId: t.subId, lote: t.loteDestino, validade: t.validade, qtd: t.qtd,
    custoUnit: t.custoUnit, origem: "transferido", restritoPaciente: t.paciente,
    transferenciaId: t.id, loteOrigem: t.loteOrigem,
    fonte: `Transferido do estoque — ${patById(t.paciente) ? patById(t.paciente).nome : ""} (lote ${t.loteOrigem})`,
    data: t.data,
  }));
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

/* ============================================================
   POSIÇÕES DE ESTOQUE — a identidade correta de um saldo

   Um número de lote NÃO identifica um saldo. O mesmo lote de
   fábrica pode estar, ao mesmo tempo, na custódia do paciente A,
   na custódia do paciente B e no estoque da clínica. São três
   saldos independentes do mesmo objeto físico.

   O que identifica um saldo é a POSIÇÃO:
       substância + lote + validade + TITULAR
   onde titular é um paciente ou a clínica.

   Regra decorrente: mesmo titular, as entradas SOMAM (a família
   trouxe mais do mesmo lote); titulares diferentes, os saldos
   correm separados e o fim de um não bloqueia o outro.

   Antes, `saldoLote` pegava a PRIMEIRA entrada com aquele número
   (`.find`) e descontava TODAS as saídas daquele número
   (`.filter`) — entrada de um, baixa de todos. Era isso que
   zerava a custódia de um paciente quando outro terminava a dele.
   ============================================================ */

const TITULAR_CLINICA = "CLINICA";

function _titularDe(l) { return l.restritoPaciente || TITULAR_CLINICA; }
function chavePosicao(subId, lote, validade, titular) {
  return [subId, lote, validade || "", titular || TITULAR_CLINICA].join("|");
}
function _chaveDoLote(l) { return chavePosicao(l.subId, l.lote, l.validade, _titularDe(l)); }

/* Agrupa as entradas em posições. Entradas de mesma substância,
   mesmo lote, mesma validade e mesmo titular viram UMA posição
   com a quantidade somada. */
function allPosicoes() {
  if (_cachePosicoes) return _cachePosicoes;
  const mapa = new Map();
  allLotes().forEach((l) => {
    const k = _chaveDoLote(l);
    let p = mapa.get(k);
    if (!p) {
      p = { chave: k, subId: l.subId, lote: l.lote, validade: l.validade,
            titular: _titularDe(l), restritoPaciente: l.restritoPaciente || null,
            qtd: 0, custoTotal: 0, entradas: [], itensCustodia: [],
            data: l.data, origem: l.origem, fonte: l.fonte };
      mapa.set(k, p);
    }
    p.qtd += Number(l.qtd) || 0;
    p.custoTotal += (Number(l.qtd) || 0) * (Number(l.custoUnit) || 0);
    p.entradas.push(l);
    if (l.itemCustodiaId) p.itensCustodia.push(l.itemCustodiaId);
    if (l.data && (!p.data || l.data < p.data)) p.data = l.data;   // data da primeira entrada
  });
  _cachePosicoes = Array.from(mapa.values())
    .map((p) => ({ ...p, custoUnit: p.qtd ? p.custoTotal / p.qtd : 0 }));
  _alocarSaidas(_cachePosicoes);
  return _cachePosicoes;
}

/* ------------------------------------------------------------
   Alocação das saídas entre as posições de um mesmo lote.

   Uma baixa registra o número do lote e o paciente, mas não de
   qual titular saiu — a informação é reconstruída aqui, pela
   regra que corresponde à prática da farmácia:

     1. consome primeiro a custódia DO PRÓPRIO paciente;
     2. esgotada a custódia, consome o estoque da clínica.

   Uma posição só absorve saídas com data igual ou posterior à
   sua entrada: assim uma baixa feita ANTES de a família trazer o
   medicamento não é atribuída, retroativamente, à custódia.
   ------------------------------------------------------------ */
function _alocarSaidas(posicoes) {
  posicoes.forEach((p) => { p.consumido = 0; p.devolvido = 0; p.ajustado = 0; p.transferido = 0; });

  const porLote = new Map();
  posicoes.forEach((p) => {
    const k = p.subId + "|" + p.lote;
    if (!porLote.has(k)) porLote.set(k, []);
    porLote.get(k).push(p);
  });

  // candidatas a receber uma saída, na ordem de preferência
  const candidatas = (subId, lote, pacienteId, data) => {
    const ls = (porLote.get(subId + "|" + lote) || [])
      .filter((p) => !p.data || !data || p.data <= data);
    const doPaciente = ls.filter((p) => pacienteId && p.restritoPaciente === pacienteId);
    const daClinica  = ls.filter((p) => !p.restritoPaciente);
    const resto      = ls.filter((p) => p.restritoPaciente && p.restritoPaciente !== pacienteId);
    return [...doPaciente, ...daClinica, ...resto];
  };

  // distribui `qtd` entre as candidatas, respeitando a capacidade de cada uma
  const distribuir = (lista, qtd, campo) => {
    let resta = qtd;
    for (const p of lista) {
      if (resta <= 0) break;
      const capacidade = campo === "consumido" ? Math.max(0, p.qtd - p.consumido) : Infinity;
      const usa = Math.min(resta, capacidade);
      if (usa > 0) { p[campo] += usa; resta -= usa; }
    }
    // sobra sem posição compatível: joga na primeira, para o saldo ficar
    // negativo e o erro aparecer no balanço em vez de sumir silenciosamente
    if (resta > 0 && lista.length) lista[0][campo] += resta;
  };

  const ordenadas = (arr) => arr.slice().sort((a, b) => String(a.data || "").localeCompare(String(b.data || "")));

  ordenadas(dispensations).forEach((x) => {
    distribuir(candidatas(x.subId, x.lote, x.paciente, x.data), Number(x.qtd) || 0, "consumido");
  });
  ordenadas(returns).forEach((x) => {
    const ls = candidatas(x.subId, x.lote, x.paciente, x.data);
    if (ls.length) ls[0].devolvido += Number(x.qtd) || 0;
  });
  ajustes.forEach((x) => {
    const ls = (porLote.get(x.subId + "|" + x.lote) || []);
    // ajuste de inventário é do estoque da clínica, salvo se só houver custódia
    const alvo = ls.find((p) => !p.restritoPaciente) || ls[0];
    if (alvo) alvo.ajustado += Number(x.delta) || 0;
  });
  transferenciasCustodia.forEach((t) => {
    const ls = (porLote.get(t.subId + "|" + t.loteOrigem) || []).filter((p) => !p.restritoPaciente);
    if (ls.length) ls[0].transferido += Number(t.qtd) || 0;
  });
}

// saldo de UMA posição (o número que importa para dispensar)
function saldoPosicao(p) {
  if (!p) return 0;
  const destinado = (p.itensCustodia || []).reduce((a, id) => a + _saidaDestinos(id), 0);
  return p.qtd - p.consumido + p.devolvido + p.ajustado - destinado - p.transferido;
}

function posicoesDoLote(subId, lote) {
  return allPosicoes().filter((p) => p.lote === lote && (!subId || p.subId === subId));
}

/* Saldo FÍSICO de um número de lote — soma de todas as posições.
   Mantido para as telas que raciocinam por lote (estoque,
   escrituração, balanço): ali o que interessa é quanto daquele
   lote existe na casa, não de quem é. */
function saldoLote(lote) {
  return allPosicoes().filter((p) => p.lote === lote).reduce((a, p) => a + saldoPosicao(p), 0);
}

// Saldo do ESTOQUE DA CLÍNICA: exclui custódia (trazida pela família ou
// transferida para um paciente), pois deixou de estar disponível ao serviço.
function saldo(subId) {
  return allPosicoes()
    .filter((p) => p.subId === subId && !p.restritoPaciente)
    .reduce((a, p) => a + saldoPosicao(p), 0);
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

/* ---- Agrupamento por PRINCÍPIO ATIVO + DOSAGEM ----
   Para o Livro de Registro e o BMPO, a identidade do medicamento é o
   princípio ativo somado à dosagem. O nome comercial existe para facilitar
   a administração pela enfermagem e a prescrição médica, mas vários nomes
   comerciais de mesmo princípio e dosagem são UM único item na escrituração. */
function grupoSubKey(s) {
  if (!s) return "";
  const pa = (s.principio_ativo || s.nome || "").trim().toUpperCase();
  const dose = (s.concentracao || "").trim().toUpperCase();
  return pa + "|" + dose;
}
function grupoSubLabel(s) {
  const pa = (s.principio_ativo || s.nome || "").trim();
  const dose = (s.concentracao || "").trim();
  return (pa + (dose ? " " + dose : "")).trim();
}
// Lista de grupos (princípio+dosagem), cada um com os subIds e nomes comerciais que o compõem.
function gruposSubstancias() {
  const map = new Map();
  substances.forEach((s) => {
    const k = grupoSubKey(s);
    if (!map.has(k)) map.set(k, { key: k, label: grupoSubLabel(s), forma: s.forma || "", lista: s.lista || "", unidade: s.unidade || "", subIds: [], nomes: [] });
    const g = map.get(k);
    g.subIds.push(s.id);
    if (s.nome && g.nomes.indexOf(s.nome) === -1) g.nomes.push(s.nome);
    if (!g.lista && s.lista) g.lista = s.lista;
    if (!g.forma && s.forma) g.forma = s.forma;
  });
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
}
/* ---- Categorias (organização da cotação e dos pedidos) ----
   A ordem abaixo é a usada nos documentos impressos. */
const CATEGORIAS_ORDEM = [
  "PSICOTROPICOS - ORAL SOLIDO",
  "PSICOTROPICOS - ORAL LIQUIDO",
  "PSICOTROPICOS - INJETAVEL",
  "DEPENDENCIA QUIMICA",
  "SINTOMATICOS CLINICOS",
  "ANTIMICROBIANOS",
  "VITAMINAS E SUPLEMENTOS",
  "SOLUCOES PARENTERAIS E ELETROLITOS",
  "RESPIRATORIOS E CORTICOIDES",
  "URGENCIA E EMERGENCIA",
  "NAO CLASSIFICADO",
];
const CATEGORIA_ROTULO = {
  "PSICOTROPICOS - ORAL SOLIDO": "Psicotrópicos — oral sólido",
  "PSICOTROPICOS - ORAL LIQUIDO": "Psicotrópicos — oral líquido",
  "PSICOTROPICOS - INJETAVEL": "Psicotrópicos — injetável",
  "DEPENDENCIA QUIMICA": "Tratamento da dependência química",
  "SINTOMATICOS CLINICOS": "Sintomáticos clínicos",
  "ANTIMICROBIANOS": "Antimicrobianos",
  "VITAMINAS E SUPLEMENTOS": "Vitaminas e suplementos",
  "SOLUCOES PARENTERAIS E ELETROLITOS": "Soluções parenterais e eletrólitos",
  "RESPIRATORIOS E CORTICOIDES": "Respiratórios e corticoides",
  "URGENCIA E EMERGENCIA": "Urgência e emergência",
  "NAO CLASSIFICADO": "Não classificado",
};
function catRotulo(c) { return CATEGORIA_ROTULO[c] || c || "Não classificado"; }
function catOrdem(c) { const i = CATEGORIAS_ORDEM.indexOf(c); return i === -1 ? 998 : i; }
// categorias em ORDEM ALFABÉTICA pelo rótulo exibido (usada nos documentos impressos)
function categoriasAlfabeticas() {
  return [...CATEGORIAS_ORDEM].sort((a, b) => catRotulo(a).localeCompare(catRotulo(b), "pt-BR"));
}
// substâncias da padronização (o que a clínica compra) x medicação de paciente
function subsPadronizadas() { return substances.filter((s) => s.padronizado); }
function subsDePaciente() { return substances.filter((s) => !s.padronizado); }

// grupo controlado? (lista preenchida e diferente de "—")
function grupoControlado(g) { const l = (g.lista || "").trim(); return l !== "" && l !== "—"; }

/* Movimentações — derivadas de inventário, NF, doações, custódia, dispensações e devoluções. */
function buildMovements() {
  const list = [];
  allLotes().forEach((l) => list.push({
    data: l.data, tipo: "entrada", subId: l.subId, qtd: l.qtd, ref: l.fonte,
    paciente: l.restritoPaciente || null, lote: l.lote, custoUnit: l.custoUnit, origem: l.origem,
  }));
  // saída do estoque geral correspondente a cada transferência
  transferenciasCustodia.forEach((t) => {
    const p = patById(t.paciente);
    list.push({
      data: t.data, tipo: "saida", subId: t.subId, qtd: t.qtd,
      ref: `Transferência para custódia — ${p ? p.nome : ""}`,
      paciente: t.paciente, lote: t.loteOrigem, custoUnit: t.custoUnit,
    });
  });
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
// lotes que nasceram de transferência do estoque para a custódia
function _lotesTransferidos() {
  const set = new Set();
  transferenciasCustodia.forEach((t) => set.add(t.loteDestino));
  return set;
}
/* Custo de medicamentos do paciente.
   Na transferência do estoque para a custódia, o custo é atribuído ao
   paciente NO MOMENTO DA TRANSFERÊNCIA. As doses administradas depois saem
   desse lote e NÃO são cobradas outra vez — do contrário o mesmo comprimido
   seria contado duas vezes. */
function custoMedicamentosPaciente(patId) {
  const transf = _lotesTransferidos();
  return movements
    .filter((m) => m.tipo === "saida" && m.paciente === patId)
    .filter((m) => !(transf.has(m.lote) && !/^Transferência para custódia/.test(m.ref || "")))
    .reduce((a, m) => a + m.qtd * (m.custoUnit || 0), 0);
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
