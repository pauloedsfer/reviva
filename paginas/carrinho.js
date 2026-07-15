/* ============================================================
   paginas/carrinho.js — Hospital Reviva
   Lógica de renderização exclusiva desta página.
   Depende de assets/dados.js (dados + cálculo) já carregado.
   ============================================================ */

function renderPage(){
  const c = emergencyCart;
  const intacto = c.status === 'intacto';
  return `
    <div class="cart-status ${c.status}">
      <div class="cart-seal">${intacto ? '🔒' : '⚠️'}</div>
      <div style="flex:1">
        <div class="cart-status-title">${intacto ? 'Lacre íntegro' : 'Lacre rompido — conferência pendente'}</div>
        <div class="cart-status-sub">Lacre atual: <span class="mono">${c.lacreAtual}</span> · Última conferência: ${fmtDate(c.ultimaConferencia)} por ${c.responsavelConferencia}</div>
      </div>
      <button class="btn ${intacto?'':'sm'}" style="${intacto?'':'background:var(--warn)'}" onclick="alert('Ação de demonstração — no sistema real, isso abriria o formulário de conferência e reabastecimento.')">${intacto ? 'Registrar rompimento' : 'Conferir e reabastecer'}</button>
    </div>

    <div class="panel">
      <div class="panel-head">
        <div><div class="panel-title">Itens padronizados do carrinho</div><div class="panel-title-sub">Quantidade de referência por item — conferida a cada abertura de lacre</div></div>
      </div>
      <div class="panel-body">
        <table>
          <thead><tr><th>Item</th><th>Qtd. padrão</th><th>Validade</th><th>Status</th></tr></thead>
          <tbody>
            ${c.itens.map(it=>{
              const vs = validadeStatus(it.validade);
              const tag = vs.key==='vencido' ? `<span class="pill low">● ${vs.label}</span>` : vs.key==='critico' ? `<span class="pill warn">● ${vs.label}</span>` : `<span class="pill">● ${vs.label}</span>`;
              return `<tr>
                <td><b>${it.nome}</b></td>
                <td class="num mono">${it.qtdPadrao}</td>
                <td class="mono">${fmtDate(it.validade)}</td>
                <td>${tag}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head">
        <div><div class="panel-title">Histórico de conferências e rompimentos</div></div>
      </div>
      <div class="panel-body">
        <table>
          <thead><tr><th>Data</th><th>Evento</th><th>Responsável</th></tr></thead>
          <tbody>
            ${c.historico.map(h=>`
              <tr>
                <td class="mono">${fmtDate(h.data)}</td>
                <td>${h.evento}</td>
                <td style="color:var(--muted)">${h.responsavel}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
