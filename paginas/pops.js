/* ============================================================
   paginas/pops.js — Hospital Reviva
   Lógica de renderização exclusiva desta página.
   Depende de assets/dados.js (dados + cálculo) já carregado.
   ============================================================ */

function renderPage(){
  const feitos = pops.filter(p=>p.status==='ok').length;
  return `
    <div class="note-box"><b>${feitos} de ${pops.length} POPs formalizados.</b> Cada etapa do fluxo de dispensação precisa de um Procedimento Operacional Padrão assinado, datado e disponível para consulta da equipe e para fiscalização. O sistema organiza o fluxo; o POP documenta por escrito como a equipe deve executá-lo — os dois são exigidos juntos pela RDC 63/2011.</div>
    <div class="panel">
      <div class="panel-head">
        <div><div class="panel-title">Checklist de POPs do fluxo de dispensação</div></div>
        <button class="btn sm">+ Novo POP</button>
      </div>
      <div class="panel-body">
        <table>
          <thead><tr><th>Área</th><th>POP</th><th>Status</th></tr></thead>
          <tbody>
            ${pops.map(p=>`
              <tr>
                <td style="color:var(--muted)">${p.area}</td>
                <td><b>${p.titulo}</b></td>
                <td>${p.status==='ok' ? '<span class="pill">● Formalizado</span>' : '<span class="pill low">● Pendente</span>'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="foot-signoff">
          <span>Farmacêutico RT: ${rtLinha()}</span>
          <span>Cada POP deve ser assinado pelo RT e pela coordenação de enfermagem quando envolver dupla checagem</span>
        </div>
      </div>
    </div>
  `;
}
