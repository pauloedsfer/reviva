/* ============================================================
   paginas/carrinho.js — Hospital Reviva
   Carrinho de emergência: registrar rompimento e reposição do lacre.
   ============================================================ */

function abrirFormLacre() {
  const c = emergencyCart;
  const rompido = c.status !== "intacto" && c.status !== "—";
  const titulo = rompido ? "Conferir e reabastecer o carrinho" : "Registrar rompimento do lacre";
  const corpo = `
    <div class="ff row2">
      <div><label>Data *</label><input id="laData" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
      <div><label>Novo lacre ${rompido ? "*" : "(se reabastecido)"}</label><input id="laLacre" placeholder="LAC-000000"></div>
    </div>
    <div class="ff"><label>O que aconteceu *</label><textarea id="laEvento" rows="3" placeholder="Ex.: lacre rompido em atendimento de emergência; carrinho reabastecido e relacrado."></textarea></div>
    <div class="note-box" style="margin:6px 0 0">Informe um <b>novo lacre</b> para registrar a reposição (status volta a íntegro). Sem novo lacre, o carrinho fica marcado como <b>rompido</b>.</div>
  `;
  abrirModal(titulo, corpo, async () => {
    const data = fv("laData"); const evento = fv("laEvento"); const novoLacre = fvOrNull("laLacre");
    if (!data) throw new Error("Informe a data.");
    if (!evento) throw new Error("Descreva o que aconteceu.");
    const resp = window.USUARIO_ID ? { responsavel_id: window.USUARIO_ID } : {};
    let carrinhoId = c.id;
    if (!carrinhoId) {
      const { data: novo, error } = await window.SB.from("carrinho_emergencia")
        .insert({ lacre_atual: novoLacre, status: novoLacre ? "intacto" : "rompido", ultima_conferencia: data, ...resp })
        .select("id").single();
      if (error) throw error; carrinhoId = novo.id;
    } else {
      const upd = novoLacre ? { lacre_atual: novoLacre, status: "intacto", ultima_conferencia: data } : { status: "rompido" };
      const { error } = await window.SB.from("carrinho_emergencia").update(upd).eq("id", carrinhoId);
      if (error) throw error;
    }
    const { error: e2 } = await window.SB.from("carrinho_historico").insert({ carrinho_id: carrinhoId, data, evento, ...resp });
    if (e2) throw e2;
  }, "Registrar");
}

function renderPage(){
  const c = emergencyCart;
  const intacto = c.status === 'intacto';
  return `
    <div class="cart-status ${c.status}">
      <div class="cart-seal">${intacto ? '🔒' : '⚠️'}</div>
      <div style="flex:1">
        <div class="cart-status-title">${intacto ? 'Lacre íntegro' : (c.status==='—' ? 'Carrinho não configurado' : 'Lacre rompido — conferência pendente')}</div>
        <div class="cart-status-sub">Lacre atual: <span class="mono">${c.lacreAtual}</span> · Última conferência: ${fmtDate(c.ultimaConferencia)} por ${c.responsavelConferencia}</div>
      </div>
      <button class="btn ${intacto?'':'sm'}" style="${intacto?'':'background:var(--warn)'}" onclick="abrirFormLacre()">${intacto ? 'Registrar rompimento' : 'Conferir e reabastecer'}</button>
    </div>

    <div class="panel">
      <div class="panel-head">
        <div><div class="panel-title">Itens padronizados do carrinho</div><div class="panel-title-sub">Quantidade de referência por item — conferida a cada abertura de lacre</div></div>
      </div>
      <div class="panel-body">
        ${c.itens.length ? `<table>
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
        </table>` : `<div style="color:var(--muted);font-size:13px;padding:8px 0">Nenhum item padronizado cadastrado.</div>`}
      </div>
    </div>

    <div class="panel">
      <div class="panel-head"><div><div class="panel-title">Histórico de conferências e rompimentos</div></div></div>
      <div class="panel-body">
        ${c.historico.length ? `<table>
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
        </table>` : `<div style="color:var(--muted);font-size:13px;padding:8px 0">Sem registros ainda.</div>`}
      </div>
    </div>
  `;
}
