/* ============================================================
   paginas/pacientes.js — Hospital Reviva
   Lógica de renderização exclusiva desta página.
   Depende de assets/dados.js (dados + cálculo) já carregado.
   ============================================================ */

function renderPage(){
  return `
    <div class="panel">
      <div class="panel-head">
        <div><div class="panel-title">Pacientes ativos</div><div class="panel-title-sub">${patients.length} de ${CAPACIDADE_TOTAL} leitos ocupados</div></div>
        <button class="btn sm">+ Novo paciente</button>
      </div>
      <div class="panel-body">
        <table>
          <thead><tr><th>Paciente</th><th>Leito</th><th>Admissão</th><th>Dias internado</th><th>Prescritor</th><th>Custo até agora</th></tr></thead>
          <tbody>
            ${patients.map(p=>{
              const dias = diasInternado(p);
              const custo = custoTotalPaciente(p);
              return `<tr>
                <td><b>${p.nome}</b></td>
                <td class="mono">${p.leito}</td>
                <td class="mono">${fmtDate(p.admissao)}</td>
                <td class="num mono">${dias}</td>
                <td style="color:var(--muted)">${p.prescritor}</td>
                <td class="num mono"><b>${fmtBRL(custo)}</b></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
    <div class="note-box">Nomes exibidos de forma abreviada neste protótipo por padrão de privacidade — no sistema real, o cadastro completo (nome, CPF, prontuário) fica restrito ao acesso da farmácia e da equipe assistencial. Custo = diária de internação (${fmtBRL(DIARIA_INTERNACAO)}/dia, valor ilustrativo) + medicamentos efetivamente dispensados. Detalhamento em <b>Custos &amp; Indicadores</b>.</div>
  `;
}
