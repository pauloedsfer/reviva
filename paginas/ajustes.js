/* ============================================================
   paginas/ajustes.js — Hospital Reviva
   Ajuste de estoque / inventário: quando a contagem física diverge
   do sistema, registra um lançamento de ajuste (com justificativa
   obrigatória) que reconcilia o saldo. Nada é digitado à mão —
   o saldo continua derivado das movimentações.
   ============================================================ */

// Opções de lote existentes, com substância e saldo atual no sistema.
function _optLotesAjuste() {
  const lotes = allLotes().slice().sort((a, b) => (a.validade < b.validade ? -1 : 1));
  return `<option value="">— selecione o lote —</option>` +
    lotes.map((l) => `<option value="${l.lote}">${l.lote} · ${subById(l.subId).nome} (sistema: ${saldoLote(l.lote)})</option>`).join("");
}

function _recalcAjuste() {
  const lote = fv("ajLote");
  const el = document.getElementById("ajDiff");
  if (!el) return;
  if (!lote) { el.innerHTML = ""; return; }
  const sis = saldoLote(lote);
  const fisEl = document.getElementById("ajFisico");
  const fis = fisEl && fisEl.value !== "" ? Number(fisEl.value) : null;
  if (fis === null) { el.innerHTML = `Saldo no sistema: <b>${sis}</b>`; return; }
  const d = fis - sis;
  const cor = d === 0 ? "var(--success)" : d < 0 ? "var(--warn)" : "var(--accent)";
  el.innerHTML = `Saldo no sistema: <b>${sis}</b> · Contagem física: <b>${fis}</b> · Diferença: <b style="color:${cor}">${d > 0 ? "+" : ""}${d}</b>${d === 0 ? " — confere, nada a ajustar" : (d < 0 ? " (falta)" : " (sobra)")}`;
}

function abrirFormAjuste() {
  const corpo = `
    <div class="ff row2">
      <div><label>Data da conferência *</label><input id="ajData" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
      <div><label>Lote conferido *</label><select id="ajLote" onchange="_recalcAjuste()">${_optLotesAjuste()}</select></div>
    </div>
    <div class="ff"><label>Contagem física (quantidade real contada) *</label><input id="ajFisico" type="number" min="0" oninput="_recalcAjuste()" placeholder="Ex.: 55"></div>
    <div class="note-box" id="ajDiff" style="margin:2px 0 12px"></div>
    <div class="ff"><label>Justificativa da divergência *</label><textarea id="ajJust" rows="3" placeholder="Ex.: 2 comprimidos não localizados na contagem mensal; perda por quebra; erro de lançamento anterior…"></textarea></div>
    <div class="note-box" style="margin:0">O ajuste entra no Livro de Registro como movimentação, com esta justificativa. Não altera saldo manualmente — reconcilia via lançamento.</div>
  `;
  abrirModal("Novo ajuste / conferência de lote", corpo, async () => {
    const lote = fv("ajLote"); const data = fv("ajData"); const just = fv("ajJust");
    const fis = fvNum("ajFisico");
    if (!data) throw new Error("Informe a data.");
    if (!lote) throw new Error("Selecione o lote conferido.");
    if (fis === null || fis < 0) throw new Error("Informe a contagem física.");
    const l = allLotes().find((x) => x.lote === lote);
    if (!l) throw new Error("Lote inválido.");
    const sis = saldoLote(lote);
    const delta = fis - sis;
    if (delta === 0) throw new Error("A contagem confere com o sistema — não há ajuste a registrar.");
    if (!just) throw new Error("A justificativa é obrigatória.");
    const { error } = await window.SB.from("ajustes_estoque").insert({
      data, substancia_id: l.subId, numero_lote: lote, saldo_sistema: sis,
      contagem_fisica: fis, quantidade: delta, justificativa: just, ...usuarioId(),
    });
    if (error) throw error;
  }, "Registrar ajuste");
}

function renderPage() {
  const hist = ajustes.slice().sort((a, b) => (a.data < b.data ? 1 : -1));
  return `
    <div class="note-box"><b>Conferência de estoque.</b> Conte fisicamente um lote e informe a quantidade real. Se divergir do sistema, o ajuste é registrado como movimentação — com justificativa — e o saldo se reconcilia automaticamente. A escrituração continua sem digitação manual de saldo.</div>

    <div class="panel">
      <div class="panel-head">
        <div><div class="panel-title">Ajustes de inventário</div><div class="panel-title-sub">${hist.length} ajuste(s) registrado(s)</div></div>
        <button class="btn sm" onclick="abrirFormAjuste()">+ Novo ajuste / conferência</button>
      </div>
      <div class="panel-body">
        ${hist.length ? `<table>
          <thead><tr><th>Data</th><th>Substância</th><th>Lote</th><th>Sistema</th><th>Contagem</th><th>Ajuste</th><th>Justificativa</th></tr></thead>
          <tbody>
            ${hist.map((a) => {
              const cor = a.delta < 0 ? "var(--warn)" : "var(--accent)";
              return `<tr>
                <td class="mono">${fmtDate(a.data)}</td>
                <td><b>${subById(a.subId).nome}</b></td>
                <td><span class="folio">${a.lote}</span></td>
                <td class="num mono">${a.saldoSistema}</td>
                <td class="num mono">${a.contagemFisica}</td>
                <td class="num mono"><b style="color:${cor}">${a.delta > 0 ? "+" : ""}${a.delta}</b></td>
                <td style="color:var(--muted)">${a.justificativa}</td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>` : `<div style="color:var(--muted);font-size:13px;padding:8px 0">Nenhum ajuste registrado. Use <b>+ Novo ajuste / conferência</b> quando a contagem física divergir do sistema.</div>`}
      </div>
    </div>
  `;
}
