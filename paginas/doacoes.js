/* ============================================================
   paginas/doacoes.js — Hospital Reviva
   Lista de doações + lançamento de nova doação (sem custo).
   ============================================================ */

function abrirFormDoacao() {
  const corpo = `
    <div class="ff row2">
      <div><label>Doador *</label><input id="doDoador" placeholder="Nome do doador"></div>
      <div><label>Data *</label><input id="doData" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
    </div>
    <div class="ff"><label>Documento/Referência</label><input id="doRef" placeholder="Termo de doação, ofício…"></div>
    <div class="item-head">Itens doados</div>
    <div id="doItens"></div>
    <button type="button" class="btn ghost sm add-item" onclick="addItemRow('doItens','doacao')">+ Adicionar item</button>
  `;
  abrirModal("Lançar nova Doação", corpo, async () => {
    const doador = fv("doDoador"); const data = fv("doData");
    if (!doador) throw new Error("Informe o doador.");
    if (!data) throw new Error("Informe a data.");
    const itens = coletarItens("doItens", "doacao");
    const { data: d, error } = await window.SB.from("doacoes")
      .insert({ doador, data, documento_ref: fvOrNull("doRef"), ...usuarioId() })
      .select("id").single();
    if (error) throw error;
    const rows = itens.map((it) => ({ doacao_id: d.id, substancia_id: it.sub, quantidade: it.qtd, numero_lote: it.lote, validade: it.val, valor_estimado: it.extra || 0 }));
    const { error: e2 } = await window.SB.from("doacao_itens").insert(rows);
    if (e2) throw e2;
  }, "Lançar doação");
  addItemRow("doItens", "doacao");
}

function renderPage(){
  const totalEstimado = donations.reduce((a,d)=> a + d.itens.reduce((x,it)=>x+it.qtd*it.valorEstimado,0), 0);
  return `
    <div class="note-box"><b>Custo real ao hospital: R$ 0,00.</b> Itens doados entram em estoque e na escrituração normalmente, mas não compõem o custo de medicamentos — apenas o valor de mercado estimado, para demonstrar a economia.</div>
    <div class="grid cards" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr));margin-bottom:16px">
      <div class="card"><div class="card-label">Doações recebidas</div><div class="card-value">${donations.length}</div><div class="card-note">registro(s) no período</div></div>
      <div class="card"><div class="card-label">Valor de mercado estimado</div><div class="card-value" style="color:var(--accent)">${fmtBRL(totalEstimado)}</div><div class="card-note">economia gerada ao hospital</div></div>
    </div>
    <div style="text-align:right;margin:0 0 16px"><button class="btn sm" onclick="abrirFormDoacao()">+ Lançar nova Doação</button></div>
    ${donations.length ? donations.map(d=>{
      const total = d.itens.reduce((a,it)=>a+it.qtd*it.valorEstimado,0);
      return `
      <div class="panel">
        <div class="panel-head">
          <div><div class="panel-title">${d.doador}</div><div class="panel-title-sub">${fmtDate(d.data)} · ${d.itens.length} item(ns)</div></div>
          <div style="text-align:right"><div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px">Valor estimado</div><div class="mono" style="font-size:17px;font-weight:700;color:var(--accent)">${fmtBRL(total)}</div></div>
        </div>
        <div class="panel-body">
          <table>
            <thead><tr><th>Substância</th><th>Lote</th><th>Validade</th><th>Qtd.</th><th>Valor de mercado/un.</th><th>Subtotal</th></tr></thead>
            <tbody>
              ${d.itens.map(it=>`
                <tr>
                  <td><b>${subById(it.subId).nome}</b></td>
                  <td><span class="folio">${it.lote}</span></td>
                  <td class="mono">${fmtDate(it.validade)}</td>
                  <td class="num mono">${it.qtd}</td>
                  <td class="num mono">${fmtBRL(it.valorEstimado)}</td>
                  <td class="num mono"><b>${fmtBRL(it.qtd*it.valorEstimado)}</b></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;}).join('') : `<div class="note-box" style="text-align:center">Nenhuma doação lançada ainda.</div>`}
  `;
}
