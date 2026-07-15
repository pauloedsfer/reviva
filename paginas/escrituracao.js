/* ============================================================
   paginas/escrituracao.js — Hospital Reviva
   Lógica de renderização exclusiva desta página.
   Depende de assets/dados.js (dados + cálculo) já carregado.
   ============================================================ */

function renderPage(){
  return `
    <div class="panel">
      <div class="panel-head">
        <div><div class="panel-title">Livro de Registro Específico</div><div class="panel-title-sub">Toda entrada e saída de substâncias controladas, com folio sequencial</div></div>
        <div class="toolbar">
          <select><option>Todas as substâncias</option>${substances.map(s=>`<option>${s.nome}</option>`).join('')}</select>
          <button class="btn ghost sm">Exportar PDF</button>
          <button class="btn sm">+ Novo lançamento</button>
        </div>
      </div>
      <div class="panel-body">
        <table>
          <thead><tr><th>Folio</th><th>Data</th><th>Tipo</th><th>Substância</th><th>Qtd.</th><th>Paciente / Referência</th><th>Saldo após</th></tr></thead>
          <tbody>
            ${(()=>{
              const running = {};
              substances.forEach(s=> running[s.id] = 0);
              return movements.map(m=>{
                running[m.subId] += m.tipo==='saida' ? -m.qtd : m.qtd;
                return `<tr>
                  <td><span class="folio">${m.id}</span></td>
                  <td class="mono">${fmtDate(m.data)}</td>
                  <td>${movTipoTag(m.tipo)}</td>
                  <td>${subById(m.subId).nome}</td>
                  <td class="num mono">${movSign(m.tipo)}${m.qtd}</td>
                  <td style="color:var(--muted)">${m.paciente ? patById(m.paciente).nome+' · ' : ''}${m.ref}</td>
                  <td class="num mono"><b>${running[m.subId]}</b></td>
                </tr>`;
              }).join('');
            })()}
          </tbody>
        </table>
        <div class="foot-signoff">
          <span>Responsável técnico: Paulo Edson Fernandes — CRF-GO 9303</span>
          <span>Escrituração gerada automaticamente a partir das movimentações — sem digitação manual de saldo</span>
        </div>
      </div>
    </div>
  `;
}
