/* ============================================================
   paginas/medicacaopropria.js — Hospital Reviva
   Custódia (medicação trazida pelo paciente): registro.
   ============================================================ */

function abrirFormCustodia() {
  const corpo = `
    <div class="ff row2">
      <div><label>Paciente *</label><select id="cuPac">${_optPats()}</select></div>
      <div><label>Data *</label><input id="cuData" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
    </div>
    <div class="ff"><label>Observação</label><input id="cuObs" placeholder="Ex.: trazido pela família, embalagem original lacrada"></div>
    <div class="item-head">Itens em custódia</div>
    <div id="cuItens"></div>
    <button type="button" class="btn ghost sm add-item" onclick="addItemRow('cuItens','custodia')">+ Adicionar item</button>
    <div class="note-box" style="margin:10px 0 0">A custódia é <b>restrita ao paciente</b> e não entra no estoque geral.</div>
  `;
  abrirModal("Registrar medicação do paciente", corpo, async () => {
    const pac = fv("cuPac"); const data = fv("cuData");
    if (!pac) throw new Error("Selecione o paciente.");
    if (!data) throw new Error("Informe a data.");
    const itens = coletarItens("cuItens", "custodia");
    const { data: m, error } = await window.SB.from("medicacao_propria")
      .insert({ paciente_id: pac, data, obs: fvOrNull("cuObs"), ...usuarioId() })
      .select("id").single();
    if (error) throw error;
    const rows = itens.map((it) => ({ medicacao_propria_id: m.id, substancia_id: it.sub, quantidade: it.qtd, numero_lote: it.lote, validade: it.val }));
    const { error: e2 } = await window.SB.from("medicacao_propria_itens").insert(rows);
    if (e2) throw e2;
  }, "Registrar custódia");
  addItemRow("cuItens", "custodia");
}

function renderPage(){
  return `
    <div class="note-box"><b>Custódia, não é doação.</b> Medicação trazida pelo paciente/família continua sendo dele — o hospital apenas guarda e administra. Sem custo, fora do estoque geral, devolvida (se sobrar) na alta.</div>
    <div class="panel">
      <div class="panel-head">
        <div><div class="panel-title">Medicações em custódia</div><div class="panel-title-sub">${patientMeds.reduce((a,pm)=>a+pm.itens.length,0)} item(ns) registrado(s)</div></div>
        <button class="btn sm" onclick="abrirFormCustodia()">+ Registrar medicação do paciente</button>
      </div>
      <div class="panel-body">
        ${patientMeds.length ? `<table>
          <thead><tr><th>Paciente</th><th>Substância</th><th>Lote</th><th>Validade</th><th>Recebido</th><th>Saldo em custódia</th><th>Origem</th></tr></thead>
          <tbody>
            ${patientMeds.flatMap(pm => pm.itens.map(it=>{
              const bal = saldoLote(it.lote);
              return `<tr>
                <td><b>${patById(pm.paciente).nome}</b> <span style="color:var(--muted)">· ${patById(pm.paciente).leito}</span></td>
                <td>${subById(it.subId).nome}</td>
                <td><span class="folio">${it.lote}</span></td>
                <td class="mono">${fmtDate(it.validade)}</td>
                <td class="num mono">${it.qtd}</td>
                <td class="num mono"><b>${bal}</b></td>
                <td><span class="tag tag-proprio">PRÓPRIA DO PACIENTE</span></td>
              </tr>`;
            })).join('')}
          </tbody>
        </table>` : `<div style="color:var(--muted);font-size:13px;padding:8px 0">Nenhuma medicação em custódia registrada.</div>`}
      </div>
    </div>
  `;
}
