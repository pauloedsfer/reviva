/* ============================================================
   dados.js — Hospital Reviva | Sistema de Escrituração e Estoque
   Fonte única de dados e funções de cálculo, compartilhada por
   todas as páginas do sistema. Nenhuma página deve duplicar
   dados ou lógica de cálculo — sempre referenciar este arquivo.

   Arquitetura: MOVIMENTAÇÕES são a fonte única de verdade.
   Saldos, custos e relatórios são sempre derivados delas.
   ============================================================ */

const CAPACIDADE_TOTAL = 35;

const HOJE = "2026-07-14";

const DIARIA_INTERNACAO = 180; // valor ilustrativo — hospedagem/estrutura, não inclui medicamentos

const patients = [
  { id: "P01", nome: "J. A. S.", leito: "Q-01", admissao: "2026-06-30", prescritor: "Dr. R. Almeida — CRM-GO 11234" },
  { id: "P02", nome: "M. T. O.", leito: "Q-02", admissao: "2026-07-02", prescritor: "Dr. R. Almeida — CRM-GO 11234" },
  { id: "P03", nome: "C. F. L.", leito: "Q-03", admissao: "2026-07-05", prescritor: "Dra. L. Cardoso — CRM-GO 9870" },
  { id: "P04", nome: "V. R. P.", leito: "Q-04", admissao: "2026-07-09", prescritor: "Dra. L. Cardoso — CRM-GO 9870" },
];

const substances = [
  { id: "S01", nome: "Diazepam 10mg comp.", lista: "B1", unidade: "comp." },
  { id: "S02", nome: "Clonazepam 2mg comp.", lista: "B1", unidade: "comp." },
  { id: "S03", nome: "Haloperidol 5mg comp.", lista: "C1", unidade: "comp." },
  { id: "S04", nome: "Prometazina 25mg comp.", lista: "C1", unidade: "comp." },
  { id: "S05", nome: "Naltrexona 50mg comp.", lista: "—", unidade: "comp." },
  { id: "S06", nome: "Dissulfiram 250mg comp.", lista: "—", unidade: "comp." },
];

// Notas fiscais — cada item gera um lote em estoque. canal: 'drogaria' (início, poucos pacientes) ou 'distribuidora' (escala)

const invoices = [
  { id:"NF001", numero:"4482", data:"2026-07-10", fornecedor:"Drogaria São João — Anápolis", canal:"drogaria", itens:[
    { subId:"S01", qtd:60, lote:"DZP-2607", validade:"2028-01-31", custoUnit:0.38 },
    { subId:"S02", qtd:60, lote:"CLZ-2607", validade:"2027-11-30", custoUnit:0.52 },
    { subId:"S03", qtd:40, lote:"HAL-2607", validade:"2027-09-30", custoUnit:1.15 },
    { subId:"S04", qtd:30, lote:"PRO-2607", validade:"2027-08-31", custoUnit:0.90 },
    { subId:"S05", qtd:30, lote:"NTX-2607", validade:"2027-06-30", custoUnit:4.20 },
    { subId:"S06", qtd:30, lote:"DSF-2607", validade:"2027-05-31", custoUnit:2.75 },
  ]},
  { id:"NF002", numero:"5104", data:"2026-07-13", fornecedor:"Farmoquímica Distribuidora Ltda", canal:"distribuidora", itens:[
    { subId:"S01", qtd:60, lote:"DZP-2701", validade:"2027-08-15", custoUnit:0.40 },
    { subId:"S03", qtd:20, lote:"HAL-2701", validade:"2026-09-30", custoUnit:1.20 },
  ]},
];

// Doações — sem custo real ao hospital; entram no estoque geral, disponível para qualquer paciente

const donations = [
  { id:"DO001", data:"2026-07-12", doador:"Farmácia Solidária Anápolis", itens:[
    { subId:"S05", qtd:15, lote:"NTX-DOA1", validade:"2027-02-28", valorEstimado:4.50 },
    { subId:"S06", qtd:20, lote:"DSF-DOA1", validade:"2027-01-31", valorEstimado:2.80 },
  ]},
];

// Medicação trazida pelo próprio paciente/família — CUSTÓDIA, não é doação ao hospital.
// Fica vinculada a um único paciente, sem custo, e não pode ser usada em outro paciente. Devolvida se sobrar na alta.

const patientMeds = [
  { id:"PM001", data:"2026-07-09", paciente:"P04", itens:[
    { subId:"S05", qtd:14, lote:"PROP-P04-01", validade:"2027-04-30", obs:"Trazido pela família na admissão, embalagem original lacrada" },
  ]},
];

// Devoluções ao estoque — medicação SOS não utilizada ou recusada pelo paciente, reintegrada ao lote de origem

const returns = [
  { data:"2026-07-13", subId:"S04", lote:"PRO-2607", qtd:1, motivo:"SOS não administrado — paciente já estava calmo", paciente:"P03" },
];

// Dispensações (saídas) — base da Dose Unitária, já referenciando o lote consumido

const dispensations = [
  { data:"2026-07-11", subId:"S01", lote:"DZP-2607", qtd:1, ref:"Dose 22h", paciente:"P01" },
  { data:"2026-07-11", subId:"S03", lote:"HAL-2607", qtd:1, ref:"Dose 08h", paciente:"P03" },
  { data:"2026-07-12", subId:"S01", lote:"DZP-2607", qtd:1, ref:"Dose 22h", paciente:"P01" },
  { data:"2026-07-12", subId:"S02", lote:"CLZ-2607", qtd:1, ref:"Dose 22h", paciente:"P02" },
  { data:"2026-07-12", subId:"S04", lote:"PRO-2607", qtd:2, ref:"Dose 08h + SOS", paciente:"P03" },
  { data:"2026-07-13", subId:"S01", lote:"DZP-2607", qtd:1, ref:"Dose 22h", paciente:"P01" },
  { data:"2026-07-13", subId:"S02", lote:"CLZ-2607", qtd:1, ref:"Dose 22h", paciente:"P02" },
  { data:"2026-07-13", subId:"S03", lote:"HAL-2607", qtd:1, ref:"Dose 08h", paciente:"P03" },
  { data:"2026-07-14", subId:"S01", lote:"DZP-2607", qtd:1, ref:"Dose 08h", paciente:"P01" },
  { data:"2026-07-14", subId:"S05", lote:"PROP-P04-01", qtd:1, ref:"Dose 08h (medicação própria)", paciente:"P04" },
  { data:"2026-07-14", subId:"S06", lote:"DSF-2607", qtd:1, ref:"Dose 08h", paciente:"P03" },
];

const prescriptions = [
  { paciente:"P01", subId:"S01", dose:"1 comp.", via:"VO", horarios:["08h","22h"] },
  { paciente:"P02", subId:"S02", dose:"1 comp.", via:"VO", horarios:["22h"] },
  { paciente:"P03", subId:"S03", dose:"1 comp.", via:"VO", horarios:["08h"] },
  { paciente:"P03", subId:"S06", dose:"1 comp.", via:"VO", horarios:["08h"] },
  { paciente:"P03", subId:"S04", dose:"1 comp.", via:"VO", horarios:["SOS"] },
  { paciente:"P04", subId:"S05", dose:"1 comp.", via:"VO", horarios:["08h"] },
];

// Carrinho de emergência — itens padronizados, controle de lacre

const emergencyCart = {
  lacreAtual: "LAC-004821",
  status: "intacto",
  ultimaConferencia: "2026-07-10",
  responsavelConferencia: "Paulo Edson Fernandes — CRF-GO 9303",
  itens: [
    { nome:"Adrenalina 1mg/mL amp.", qtdPadrao: 5, validade:"2027-04-30" },
    { nome:"Atropina 0,25mg/mL amp.", qtdPadrao: 5, validade:"2027-02-28" },
    { nome:"Diazepam 10mg/2mL amp.", qtdPadrao: 3, validade:"2027-06-30" },
    { nome:"Flumazenil 0,1mg/mL amp.", qtdPadrao: 3, validade:"2026-11-30" },
    { nome:"Naloxona 0,4mg/mL amp.", qtdPadrao: 5, validade:"2027-01-31" },
    { nome:"Soro Glicosado 50% 10mL amp.", qtdPadrao: 5, validade:"2027-08-31" },
  ],
  historico: [
    { data:"2026-07-10", evento:"Conferência de rotina — lacre íntegro, itens completos", responsavel:"Paulo Edson Fernandes" },
    { data:"2026-06-15", evento:"Lacre rompido em atendimento de emergência — carrinho reabastecido e relacrado (novo lacre LAC-004821)", responsavel:"Paulo Edson Fernandes" },
  ],
};

// POPs necessários para blindar cada etapa do fluxo perante fiscalização

const pops = [
  { area:"Farmácia", titulo:"Admissão e Cadastro do Paciente", status:"pendente" },
  { area:"Farmácia", titulo:"Recebimento e Conferência de Notas Fiscais", status:"pendente" },
  { area:"Farmácia", titulo:"Recebimento de Doações", status:"pendente" },
  { area:"Farmácia", titulo:"Medicação Trazida pelo Paciente (Custódia)", status:"pendente" },
  { area:"Farmácia", titulo:"Preparo e Etiquetagem da Dose Unitária", status:"pendente" },
  { area:"Enfermagem", titulo:"Dupla Checagem e Administração de Medicamentos", status:"pendente" },
  { area:"Farmácia", titulo:"Devolução e Reintegração de Medicação SOS ao Estoque", status:"pendente" },
  { area:"Farmácia + Enfermagem", titulo:"Controle do Carrinho de Emergência e Lacre", status:"pendente" },
  { area:"Farmácia", titulo:"Escrituração e Balanço Mensal de Controlados", status:"pendente" },
  { area:"Farmácia", titulo:"Backup e Continuidade do Sistema", status:"pendente" },
];

/* ---------------- helpers ---------------- */
const $ = (sel, el=document) => el.querySelector(sel);

const subById = id => substances.find(s => s.id === id);

const patById = id => patients.find(p => p.id === id);

const fmtDate = d => { const [y,m,dd]=d.split('-'); return `${dd}/${m}/${y}`; };

const fmtBRL = v => (v||0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' });

const diffDias = (d1,d2) => Math.round((new Date(d2) - new Date(d1)) / 86400000);

function allLotes(){
  const list = [];
  invoices.forEach(nf => nf.itens.forEach(it => list.push({
    subId:it.subId, lote:it.lote, validade:it.validade, qtd:it.qtd, custoUnit:it.custoUnit,
    origem:'compra', canal:nf.canal, fonte:`NF ${nf.numero} — ${nf.fornecedor}`, data:nf.data,
  })));
  donations.forEach(d => d.itens.forEach(it => list.push({
    subId:it.subId, lote:it.lote, validade:it.validade, qtd:it.qtd, custoUnit:0, valorEstimado:it.valorEstimado,
    origem:'doacao', fonte:`Doação — ${d.doador}`, data:d.data,
  })));
  patientMeds.forEach(pm => pm.itens.forEach(it => list.push({
    subId:it.subId, lote:it.lote, validade:it.validade, qtd:it.qtd, custoUnit:0,
    origem:'proprio', restritoPaciente:pm.paciente, fonte:`Medicação própria — ${patById(pm.paciente).nome}`, data:pm.data,
  })));
  return list;
}

function saldoLote(lote){
  const l = allLotes().find(x=>x.lote===lote);
  if(!l) return 0;
  const consumido = dispensations.filter(x=>x.lote===lote).reduce((a,x)=>a+x.qtd,0);
  const devolvido = returns.filter(x=>x.lote===lote).reduce((a,x)=>a+x.qtd,0);
  return l.qtd - consumido + devolvido;
}

function saldo(subId){
  return allLotes().filter(l=>l.subId===subId && l.origem!=='proprio').reduce((a,l)=>a+saldoLote(l.lote),0);
}

function custoMedio(subId){
  const compras = allLotes().filter(l=>l.subId===subId && l.origem==='compra');
  const totalQtd = compras.reduce((a,l)=>a+l.qtd,0);
  const totalVal = compras.reduce((a,l)=>a+l.qtd*l.custoUnit,0);
  return totalQtd ? totalVal/totalQtd : 0;
}

function validadeStatus(validade){
  const dias = diffDias(HOJE, validade);
  if(dias < 0) return { key:'vencido', label:'Vencido', dias };
  if(dias <= 90) return { key:'critico', label:`Vence em ${dias}d`, dias };
  return { key:'ok', label:'Regular', dias };
}

function movTipoTag(tipo){
  if(tipo==='entrada') return '<span class="tag tag-in">ENTRADA</span>';
  if(tipo==='devolucao') return '<span class="tag tag-dev">DEVOLUÇÃO</span>';
  return '<span class="tag tag-out">SAÍDA</span>';
}

function movSign(tipo){ return tipo==='saida' ? '−' : '+'; }

// Movimentações — geradas a partir de NF, doações, medicação própria, dispensações e devoluções. Fonte única de verdade do estoque.

const movements = (() => {
  let seq = 0;
  const nextId = () => 'M' + String(++seq).padStart(3,'0');
  const list = [];
  allLotes().forEach(l => list.push({
    id: nextId(), data:l.data, tipo:'entrada', subId:l.subId, qtd:l.qtd, ref:l.fonte,
    paciente:l.restritoPaciente||null, lote:l.lote, custoUnit:l.custoUnit, origem:l.origem,
  }));
  dispensations.forEach(d => {
    const lote = allLotes().find(l => l.lote === d.lote);
    list.push({
      id: nextId(), data:d.data, tipo:'saida', subId:d.subId, qtd:d.qtd, ref:d.ref,
      paciente:d.paciente, lote:d.lote, custoUnit: lote ? lote.custoUnit : custoMedio(d.subId),
    });
  });
  returns.forEach(r => {
    const lote = allLotes().find(l => l.lote === r.lote);
    list.push({
      id: nextId(), data:r.data, tipo:'devolucao', subId:r.subId, qtd:r.qtd, ref:`Devolução — ${r.motivo}`,
      paciente:r.paciente, lote:r.lote, custoUnit: lote ? lote.custoUnit : custoMedio(r.subId),
    });
  });
  list.sort((a,b)=> a.data < b.data ? -1 : a.data > b.data ? 1 : 0);
  list.forEach((m,i)=> m.id = 'M' + String(i+1).padStart(3,'0'));
  return list;
})();

function diasInternado(p){ return diffDias(p.admissao, HOJE) + 1; }

function custoMedicamentosPaciente(patId){
  return movements.filter(m=>m.tipo==='saida' && m.paciente===patId).reduce((a,m)=>a+m.qtd*(m.custoUnit||0), 0);
}

function custoDiariasPaciente(p){ return diasInternado(p) * DIARIA_INTERNACAO; }

function custoTotalPaciente(p){ return custoDiariasPaciente(p) + custoMedicamentosPaciente(p.id); }

function periodoDispensacaoDias(){
  if(!dispensations.length) return 1;
  const datas = dispensations.map(d=>d.data).sort();
  return Math.max(diffDias(datas[0], datas[datas.length-1]) + 1, 1);
}

function consumoMedioDiario(subId){
  const total = dispensations.filter(d=>d.subId===subId).reduce((a,d)=>a+d.qtd, 0);
  return total / periodoDispensacaoDias();
}

/* ---------------- mini gráficos SVG (sem dependências externas) ---------------- */

const CHART_COLORS = { primary:'#2C5F5A', accent:'#A9784F', success:'#5C7F58', warn:'#8B4A3A', line:'#DEDACD', ink:'#1E2A28', muted:'#8A928F' };

function svgBarChart(data, opts={}){
  const width = opts.width || 600, height = opts.height || 190;
  const pad = { top:26, right:14, bottom:30, left:14 };
  const chartW = width - pad.left - pad.right, chartH = height - pad.top - pad.bottom;
  const max = Math.max(...data.map(d=>d.value), 1);
  const gap = chartW / data.length;
  const barW = Math.min(gap * 0.5, 46);
  let bars = '';
  data.forEach((d,i)=>{
    const h = max ? (d.value/max) * chartH : 0;
    const x = pad.left + i*gap + (gap-barW)/2;
    const y = pad.top + chartH - h;
    bars += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(h,1).toFixed(1)}" rx="5" fill="${opts.color||CHART_COLORS.primary}"/>
      <text x="${(x+barW/2).toFixed(1)}" y="${(y-8).toFixed(1)}" text-anchor="middle" font-size="11" font-family="IBM Plex Mono, monospace" fill="${CHART_COLORS.ink}">${opts.valueFmt ? opts.valueFmt(d.value) : d.value}</text>
      <text x="${(x+barW/2).toFixed(1)}" y="${height-10}" text-anchor="middle" font-size="10.5" font-family="Public Sans, sans-serif" fill="${CHART_COLORS.muted}">${d.label}</text>`;
  });
  return `<svg viewBox="0 0 ${width} ${height}" style="width:100%;height:${height}px;display:block">${bars}</svg>`;
}

function svgHBarChart(data, opts={}){
  const width = opts.width || 600;
  const barH = opts.barHeight || 24, rowGap = opts.gap || 16;
  const labelW = opts.labelWidth || 168;
  const chartW = width - labelW - 74;
  const max = Math.max(...data.map(d=>d.value), 1);
  const height = data.length * (barH + rowGap);
  let rows = '';
  data.forEach((d,i)=>{
    const y = i * (barH + rowGap);
    const w = Math.max((d.value/max) * chartW, 2);
    rows += `<text x="0" y="${y+barH/2+4}" font-size="12" font-family="Public Sans, sans-serif" fill="${CHART_COLORS.ink}">${d.label}</text>
      <rect x="${labelW}" y="${y}" width="${w.toFixed(1)}" height="${barH}" rx="5" fill="${opts.color||CHART_COLORS.primary}"/>
      <text x="${(labelW+w+8).toFixed(1)}" y="${y+barH/2+4}" font-size="11.5" font-family="IBM Plex Mono, monospace" fill="${CHART_COLORS.ink}">${opts.valueFmt ? opts.valueFmt(d.value) : d.value}</text>`;
  });
  return `<svg viewBox="0 0 ${width} ${height}" style="width:100%;height:${height}px;display:block">${rows}</svg>`;
}

function listaTagClass(lista){
  if(lista==='A') return 'tag-a';
  if(lista.startsWith('B')) return 'tag-b';
  if(lista.startsWith('C')) return 'tag-c';
  return '';
}

/* ---------------- nav render ---------------- */
