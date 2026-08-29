/* ============================================================
   paginas/roadmap.js — Hospital Reviva
   Lógica de renderização exclusiva desta página.
   Depende de assets/dados.js (dados + cálculo) já carregado.
   ============================================================ */

function renderPage(){
  const phases = [
    {
      n: "1", status: "live", statusLabel: "Neste protótipo",
      title: "Escrituração digital e Dose Unitária",
      desc: "Cadastro de pacientes, substâncias e prescrições; kits de dose unitária gerados por paciente/horário; Livro de Registro e Balanço Mensal calculados automaticamente a partir das movimentações — uso individual, em um único computador ou tablet da farmácia.",
    },
    {
      n: "2", status: "planned", statusLabel: "Planejado",
      title: "Login e controle de acesso por perfil",
      desc: "Cada integrante da equipe (farmácia, enfermagem, administração) passa a ter usuário e senha próprios, com permissões conforme a função. Toda ação — lançamento, checagem, alteração — fica registrada com autor e horário, criando trilha de auditoria.",
    },
    {
      n: "3", status: "planned", statusLabel: "Planejado",
      title: "Dados em rede — acesso simultâneo da equipe",
      desc: "O sistema passa a ficar hospedado em nuvem, acessível de vários dispositivos ao mesmo tempo. A farmácia, a enfermagem e a direção enxergam a mesma informação em tempo real, sem planilhas paralelas ou versões desatualizadas.",
      note: "Tecnicamente, isso muda a arquitetura do sistema: hoje ele roda localmente; para múltiplos usuários simultâneos, passa a depender de um banco de dados em nuvem. É um passo natural, mas com esforço de implementação maior que as fases 1 e 2.",
    },
    {
      n: "4", status: "review", statusLabel: "Em avaliação técnica/jurídica",
      title: "Prescrição médica eletrônica integrada",
      desc: "O médico prescreve diretamente no sistema, alimentando automaticamente o mapa de dose unitária — eliminando a transcrição manual da prescrição para a farmácia.",
      note: "Como funcionalidade interna (prescrição digital dentro do sistema do hospital), é totalmente viável. Para que tenha o mesmo valor legal de uma receita física assinada, o ideal é avaliar com a direção o uso de assinatura eletrônica qualificada (certificado ICP-Brasil) — é um ponto técnico-jurídico a definir junto à instituição, não uma limitação do sistema em si.",
    },
  ];
  return `
    <div class="note-box"><b>Como ler este roadmap.</b> A Fase 1 é o que você já está vendo funcionando neste protótipo. As fases seguintes são direções realistas de evolução, priorizadas conforme a necessidade da equipe — não promessas de prazo fechado, mas o caminho técnico já está mapeado.</div>
    ${phases.map(p=>`
      <div class="phase">
        <div class="phase-num">${p.n}</div>
        <div class="phase-body">
          <div class="phase-head">
            <div class="phase-title">${p.title}</div>
            <span class="phase-status ${p.status}">${p.statusLabel}</span>
          </div>
          <div class="phase-desc">${p.desc}</div>
          ${p.note ? `<div class="phase-note">${p.note}</div>` : ''}
        </div>
      </div>
    `).join('')}
  `;
}
