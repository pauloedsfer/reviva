/* ============================================================
   layout.js — Hospital Reviva
   Navegação compartilhada + inicialização assíncrona:
   1) exige login  2) carrega config (RT/estabelecimento) e dados
   do banco  3) só então renderiza a tela. Preenche o rodapé do RT
   dinamicamente e mostra o banner de dados de teste quando houver.
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
  { group: "Sistema", items: [
    { id: "configuracoes", label: "Configurações (RT & Estabelecimento)", href: "configuracoes.html" },
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
  escrituracao: ["Livro de Registro", "Todas as movimentações — fonte de verdade do estoque"],
  balanco: ["Balanço Mensal (BMPO)", "Estoque inicial, entradas, saídas e saldo final por substância"],
  pops: ["POPs do Fluxo", "Procedimentos que precisam existir formalmente para blindar o sistema"],
  configuracoes: ["Configurações", "Dados do Responsável Técnico e do estabelecimento — usados nos rodapés e relatórios"],
  roadmap: ["Evoluções futuras", "Possibilidades de expansão do sistema em próximas fases"],
};

function renderNav(activePage) {
  const nav = document.getElementById("nav");
  nav.innerHTML = NAV.map((group) => `
    <div class="nav-group-label">${group.group}</div>
    ${group.items.map((it) => `
      <a class="nav-item${it.id === activePage ? " active" : ""}" href="${it.href}">
        <span class="nav-dot"></span><span class="label">${it.label}</span>
      </a>
    `).join("")}
  `).join("");
}

function renderTitle(activePage) {
  const t = TITLES[activePage];
  if (!t) return;
  const titleEl = document.getElementById("pageTitle");
  titleEl.textContent = t[0];
  titleEl.classList.toggle("long", t[0].length > 40);
  document.getElementById("pageSub").textContent = t[1];
  document.title = t[0] + " — Hospital Reviva";
}

function aplicarRTFooter() {
  const nameEl = document.getElementById("footRtName");
  const roleEl = document.getElementById("footRtRole");
  const rt = window.RT;
  if (nameEl) nameEl.textContent = rt ? rt.nome : "RT não configurado";
  if (roleEl) roleEl.textContent = rt ? `Farmacêutico RT · ${rt.conselho}-${rt.uf} ${rt.numero_registro}` : "Configure em Configurações";
}

async function aplicarBanner() {
  const el = document.getElementById("testBanner");
  if (!el) return;
  const tem = await temDadosTeste();
  if (tem) {
    el.style.display = "inline-flex";
    el.innerHTML = `⚠ Dados de teste — apagar antes do uso real
      <button class="btn ghost sm" style="margin-left:10px" onclick="acaoLimparTeste()">Limpar dados de teste</button>`;
  } else {
    el.style.display = "none";
  }
}

async function acaoLimparTeste() {
  if (!confirm("Isto vai APAGAR toda a massa de teste (pacientes, notas, movimentações fictícias). A configuração do RT/estabelecimento é preservada.\n\nConfirmar?")) return;
  try {
    const msg = await limparDadosTeste();
    alert(msg || "Dados de teste removidos.");
    window.location.reload();
  } catch (e) {
    alert("Erro ao limpar: " + (e.message || e));
  }
}

function wireChrome() {
  const sidebarEl = document.getElementById("sidebar");
  const backdropEl = document.getElementById("backdrop");
  const open = () => { sidebarEl.classList.add("open"); backdropEl.classList.add("open"); };
  const close = () => { sidebarEl.classList.remove("open"); backdropEl.classList.remove("open"); };
  const menuBtn = document.getElementById("menuBtn");
  const closeBtn = document.getElementById("sidebarClose");
  if (menuBtn) menuBtn.addEventListener("click", open);
  if (closeBtn) closeBtn.addEventListener("click", close);
  if (backdropEl) backdropEl.addEventListener("click", close);
  const logout = document.getElementById("btnLogout");
  if (logout) logout.addEventListener("click", sair);
  if (window.matchMedia("(max-width:820px)").matches) open();
}

async function initLayout() {
  // 1) trava de login (redireciona se não houver sessão)
  const logado = await exigirLogin();
  if (!logado) return;

  const page = document.body.dataset.page;
  renderNav(page);
  renderTitle(page);

  // 2) carrega configuração e dados do banco antes de renderizar
  try {
    await carregarConfig();
    await ensureUsuario();
    await carregarDados();
  } catch (e) {
    aplicarRTFooter();
    wireChrome();
    document.getElementById("viewport").innerHTML =
      `<div class="note-box"><b>Não foi possível carregar os dados do banco.</b><br>${e.message || e}
       <br><br>Verifique se <code>assets/config.js</code> tem a URL e a chave corretas, e se o <code>schema.sql</code> foi executado no Supabase.</div>`;
    return;
  }

  aplicarRTFooter();
  await aplicarBanner();

  if (typeof renderPage === "function") {
    document.getElementById("viewport").innerHTML = renderPage();
  }
  if (typeof afterRender === "function") afterRender();

  wireChrome();
}

document.addEventListener("DOMContentLoaded", initLayout);
