/* ============================================================
   paginas/dashboard.js — Hospital Reviva
   Lógica de renderização exclusiva desta página.
   Depende de assets/dados.js (dados + cálculo) já carregado.
   ============================================================ */

function renderPage(){
  const totalSaidas = movements.filter(m=>m.tipo==='saida' && m.data===HOJE).length;
  const baixos = substances.filter(s=> saldo(s.id) <= 10).length;
  return `
    <div class="note-box"><b>Ambiente de demonstração.</b> Os dados abaixo são fictícios, montados apenas para ilustrar como o sistema organiza pacientes, estoque de controlados e escrituração num único fluxo — sem planilhas soltas.</div>
    <div class="grid cards">
      <div class="card"><div class="card-label">Ocupação</div><div class="card-value">${patients.length}<span style="font-size:16px;color:var(--muted)"> / ${CAPACIDADE_TOTAL}</span></div><div class="card-note">pacientes ativos hoje</div></div>
      <div class="card"><div class="card-label">Substâncias controladas</div><div class="card-value">${substances.filter(s=>s.lista!=='—').length}</div><div class="card-note">cadastradas (Listas B e C1)</div></div>
      <div class="card"><div class="card-label">Doses dispensadas hoje</div><div class="card-value">${totalSaidas}</div><div class="card-note">registradas no livro de movimentação</div></div>
      <div class="card"><div class="card-label ${baixos?'':''}">Alertas de estoque</div><div class="card-value ${baixos?'warn':''}">${baixos}</div><div class="card-note">substância(s) abaixo do mínimo</div></div>
    </div>

    <div class="panel">
      <div class="panel-head">
        <div><div class="panel-title">Últimas movimentações</div><div class="panel-title-sub">Entradas e saídas mais recentes do Livro de Registro</div></div>
        <a class="btn ghost sm" href="escrituracao.html">Ver livro completo</a>
      </div>
      <div class="panel-body">
        <table>
          <thead><tr><th>Data</th><th>Folio</th><th>Tipo</th><th>Substância</th><th>Qtd.</th><th>Referência</th></tr></thead>
          <tbody>
            ${movements.slice().reverse().slice(0,6).map(m=>`
              <tr>
                <td class="mono">${fmtDate(m.data)}</td>
                <td><span class="folio">${m.id}</span></td>
                <td>${movTipoTag(m.tipo)}</td>
                <td>${subById(m.subId).nome}</td>
                <td class="num">${movSign(m.tipo)}${m.qtd}</td>
                <td style="color:var(--muted)">${m.ref}${m.paciente? ' · '+patById(m.paciente).nome : ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
