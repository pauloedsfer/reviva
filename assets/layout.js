/* ============================================================
   layout.js — Hospital Reviva
   Estrutura de navegação compartilhada por todas as páginas:
   menu lateral, título da página, gaveta mobile.
   Cada página HTML define <body data-page="ID"> e carrega,
   depois deste arquivo, seu próprio paginas/ID.js contendo
   window.renderPage().
   ============================================================ */

const NAV = [
  { group: "Operação", items: [
    { id: "dashboard", label: "Painel", href: "index.html" },
    { id: "pacientes", label: "Pacientes", href: "pacientes.html" },
    { id: "dose", label: "Dose Unitária — hoje", href: "dose.html" },
  ]},
  { group: "Farmácia", items: [
    { id: "estoque", label: "Substâncias, Lotes & Validade", href: "estoque.html" },
    { id: "prescricoes", label: "Prescrições ativas", href: "prescricoes.html" },
    { id: "medicacaopropria", label: "Medicação do Paciente", href: "medicacaopropria.html" },
    { id: "carrinho", label: "Carrinho de Emergência", href: "carrinho.html" },
  ]},
  { group: "Suprimentos", items: [
    { id: "notasfiscais", label: "Notas Fiscais", href: "notasfiscais.html" },
    { id: "doacoes", label: "Doações", href: "doacoes.html" },
    { id: "previsao", label: "Previsão de Compras", href: "previsao.html" },
  ]},
  { group: "Financeiro", items: [
    { id: "financeiro", label: "Custos & Indicadores", href: "financeiro.html" },
  ]},
  { group: "Compliance", items: [
    { id: "escrituracao", label: "Livro de Registro", href: "escrituracao.html" },
    { id: "balanco", label: "Balanço Mensal (BMPO)", href: "balanco.html" },
    { id: "pops", label: "POPs do Fluxo", href: "pops.html" },
  ]},
  { group: "Roadmap", items: [
    { id: "roadmap", label: "Evoluções futuras", href: "roadmap.html" },
  ]},
];

const TITLES = {
  dashboard: ["Sistema de Controle de Estoque e Escrituração de Medicamentos da Farmácia Hospitalar", "Visão geral da farmácia e da ocupação"],
  pacientes: ["Pacientes", "Cadastro ativo — capacidade e ocupação atual"],
  dose: ["Dose Unitária — hoje", "Kits de dose por paciente e horário, prontos para dupla checagem"],
  estoque: ["Substâncias, Lotes & Validade", "Saldo por lote calculado a partir das movimentações"],
  prescricoes: ["Prescrições ativas", "Base para a montagem diária da dose unitária"],
  medicacaopropria: ["Medicação do Paciente", "Custódia — trazida pelo paciente/família, sem custo e restrita a ele"],
  carrinho: ["Carrinho de Emergência", "Controle de lacre e itens padronizados"],
  notasfiscais: ["Notas Fiscais", "Entradas por compra — cada item gera um lote em estoque"],
  doacoes: ["Doações", "Entradas sem custo ao hospital — valor estimado para relatório de economia"],
  previsao: ["Previsão de Compras", "Consumo médio, dias restantes e sugestão de reposição"],
  financeiro: ["Custos & Indicadores", "Custo com medicamentos, diárias de internação e custo por paciente"],
  escrituracao: ["Livro de Registro", "Todas as movimentações — fonte única de verdade do estoque"],
  balanco: ["Balanço Mensal (BMPO)", "Estoque inicial, entradas, saídas e saldo final por substância"],
  pops: ["POPs do Fluxo", "Procedimentos que precisam existir formalmente para blindar o sistema"],
  roadmap: ["Evoluções futuras", "Possibilidades de expansão do sistema em próximas fases"],
};

function renderNav(activePage){
  const nav = document.getElementById('nav');
  nav.innerHTML = NAV.map(group => `
    <div class="nav-group-label">${group.group}</div>
    ${group.items.map(it => `
      <a class="nav-item${it.id===activePage ? ' active' : ''}" href="${it.href}">
        <span class="nav-dot"></span><span class="label">${it.label}</span>
      </a>
    `).join('')}
  `).join('');
}

function renderTitle(activePage){
  const t = TITLES[activePage];
  if(!t) return;
  const titleEl = document.getElementById('pageTitle');
  titleEl.textContent = t[0];
  titleEl.classList.toggle('long', t[0].length > 40);
  document.getElementById('pageSub').textContent = t[1];
  document.title = t[0] + ' — Hospital Reviva';
}

function initLayout(){
  const page = document.body.dataset.page;
  renderNav(page);
  renderTitle(page);

  if (typeof renderPage === 'function') {
    document.getElementById('viewport').innerHTML = renderPage();
  }

  const sidebarEl = document.getElementById('sidebar');
  const backdropEl = document.getElementById('backdrop');
  const openDrawer = () => { sidebarEl.classList.add('open'); backdropEl.classList.add('open'); };
  const closeDrawer = () => { sidebarEl.classList.remove('open'); backdropEl.classList.remove('open'); };
  document.getElementById('menuBtn').addEventListener('click', openDrawer);
  document.getElementById('sidebarClose').addEventListener('click', closeDrawer);
  backdropEl.addEventListener('click', closeDrawer);

  // No celular, a sidebar já começa visível para deixar claro que a navegação está ali
  if (window.matchMedia('(max-width:820px)').matches){
    openDrawer();
  }
}

document.addEventListener('DOMContentLoaded', initLayout);
