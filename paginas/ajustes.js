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

/* ===================== FOLHA DE CONTAGEM / INVENTÁRIO ===================== */
function abrirFolhaContagem() {
  const optsSub = `<option value="">Todas as substâncias</option>` +
    substances.slice().sort((a, b) => a.nome.localeCompare(b.nome))
      .map((s) => `<option value="${s.id}">${s.nome}</option>`).join("");
  const corpo = `
    <div class="ff"><label>Substância</label><select id="fcSub">${optsSub}</select></div>
    <div class="ff"><label>Faixa de vencimento</label>
      <select id="fcVenc" onchange="_fcToggleIntervalo()">
        <option value="todas">Todas</option>
        <option value="vencidas">Somente vencidas</option>
        <option value="30">A vencer em até 30 dias</option>
        <option value="60">A vencer em até 60 dias</option>
        <option value="90">A vencer em até 90 dias</option>
        <option value="intervalo">Intervalo de datas…</option>
      </select>
    </div>
    <div class="ff row2" id="fcIntervalo" style="display:none">
      <div><label>Vence de</label><input id="fcDe" type="date"></div>
      <div><label>até</label><input id="fcAte" type="date"></div>
    </div>
    <div class="ff"><label>Medicações zeradas</label>
      <select id="fcZerados">
        <option value="ocultar" selected>Não imprimir lotes com saldo 0</option>
        <option value="incluir">Incluir lotes zerados</option>
      </select>
    </div>
    <div class="note-box" style="margin:0">Gera uma folha A4 com Substância · Lote · Validade · Saldo no sistema e colunas em branco para a <b>contagem física</b> e a <b>diferença</b>. Depois, lance os ajustes onde divergir.</div>
  `;
  abrirModal("Folha de contagem / inventário", corpo, async () => {
    imprimirFolhaContagem(fv("fcSub"), fv("fcVenc"), fv("fcZerados") === "ocultar", fv("fcDe"), fv("fcAte"));
  }, "Gerar folha");
}
function _fcToggleIntervalo() {
  const v = document.getElementById("fcVenc").value;
  document.getElementById("fcIntervalo").style.display = v === "intervalo" ? "grid" : "none";
}

function imprimirFolhaContagem(subId, faixaVenc, ocultarZerados, de, ate) {
  const est = window.ESTAB || {}, rt = window.RT || {};
  const rtTxt = rt.nome ? `${rt.nome} — ${rt.conselho}-${rt.uf} ${rt.numero_registro}` : "____________________";

  // um registro por lote, com saldo e status de validade
  let linhas = allLotes().map((l) => ({ subId: l.subId, lote: l.lote, validade: l.validade, saldo: saldoLote(l.lote) }));

  if (subId) linhas = linhas.filter((x) => x.subId === subId);
  if (ocultarZerados) linhas = linhas.filter((x) => x.saldo > 0);

  // faixa de vencimento
  linhas = linhas.filter((x) => {
    if (faixaVenc === "todas") return true;
    const st = validadeStatus(x.validade); // { key, dias }
    if (faixaVenc === "vencidas") return st.dias < 0;
    if (faixaVenc === "intervalo") {
      if (!x.validade) return false;
      if (de && x.validade < de) return false;
      if (ate && x.validade > ate) return false;
      return true;
    }
    const lim = parseInt(faixaVenc, 10); // 30/60/90
    return st.dias >= 0 && st.dias <= lim;
  });

  linhas.sort((a, b) => subById(a.subId).nome.localeCompare(subById(b.subId).nome) || (a.validade < b.validade ? -1 : 1));

  if (!linhas.length) { alert("Nenhum lote atende aos filtros escolhidos."); return; }

  const corpo = linhas.map((x, i) => {
    const st = validadeStatus(x.validade);
    const cls = st.dias < 0 ? "venc" : st.dias <= 90 ? "crit" : "";
    const marca = st.dias < 0 ? "VENCIDO" : st.dias <= 90 ? `${st.dias}d` : "";
    return `<tr class="${cls}">
      <td class="num">${i + 1}</td>
      <td>${subById(x.subId).nome}</td>
      <td class="mono">${x.lote}</td>
      <td class="c mono">${fmtDate(x.validade)}${marca ? ` <span class="mk">${marca}</span>` : ""}</td>
      <td class="c mono">${x.saldo}</td>
      <td class="fis"></td>
      <td class="fis"></td>
    </tr>`;
  }).join("");

  const filtroTxt = [];
  if (subId) filtroTxt.push("Substância: " + subById(subId).nome);
  filtroTxt.push("Vencimento: " + (
    faixaVenc === "todas" ? "todas" :
    faixaVenc === "vencidas" ? "somente vencidas" :
    faixaVenc === "intervalo" ? `${de ? fmtDate(de) : "…"} a ${ate ? fmtDate(ate) : "…"}` :
    `a vencer em até ${faixaVenc} dias`));
  filtroTxt.push(ocultarZerados ? "sem lotes zerados" : "incluindo zerados");

  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Folha de Contagem — Inventário</title>
  <style>@page{size:A4 portrait;margin:14mm 12mm}*{box-sizing:border-box}body{font-family:"Public Sans",Arial,sans-serif;color:#1E2A28;font-size:11px;margin:0}
  .estab{border-bottom:2px solid #2C5F5A;padding-bottom:6px;margin-bottom:8px}.estab .n{font-size:14px;font-weight:700}.estab .s{font-size:10px;color:#4a544f}
  h1{font-size:14px;margin:8px 0 2px}.sub{font-size:10.5px;color:#6a736e;margin-bottom:4px}
  .filtros{font-size:10px;color:#4a544f;margin-bottom:8px}
  table{width:100%;border-collapse:collapse}th,td{border:1px solid #cfd6cf;padding:4px 6px;font-size:10.5px}
  th{background:#EEF2EC;text-transform:uppercase;font-size:9px}td.c,th.c{text-align:center}td.num,th.num{text-align:center;width:26px}
  .mono{font-family:"IBM Plex Mono",monospace}td.fis{background:#FCFBF6;min-width:70px}th.fis{background:#EEF2EC}
  tr.crit td{background:#FBF3E3}tr.venc td{background:#F7E3E1}.mk{font-size:8px;background:#2C5F5A;color:#fff;padding:1px 3px;border-radius:3px;vertical-align:middle}
  tr.venc .mk{background:#B04A3F}tr.crit .mk{background:#B07A2F}
  .foot{margin-top:18px;font-size:10.5px;display:flex;justify-content:space-between;gap:30px}
  .foot .l{border-top:1px solid #1E2A28;padding-top:5px;text-align:center;flex:1}
  .btn{position:fixed;top:12px;right:12px;background:#2C5F5A;color:#fff;border:none;padding:9px 15px;border-radius:8px;cursor:pointer;font:inherit}@media print{.btn{display:none}}</style></head><body>
  <button class="btn" onclick="window.print()">Imprimir / Salvar PDF</button>
  <div class="estab"><div class="n">${est.razao_social || est.nome_fantasia || "Hospital Reviva"}</div><div class="s">${est.cnpj ? "CNPJ: " + est.cnpj + " · " : ""}${est.endereco || ""}${est.municipio_uf ? " — " + est.municipio_uf : ""}</div></div>
  <h1>Folha de Contagem de Estoque — Inventário</h1>
  <div class="sub">Data da contagem: ____ / ____ / ______ &nbsp;·&nbsp; Conferente: ________________________ &nbsp;·&nbsp; ${linhas.length} lote(s)</div>
  <div class="filtros">Filtros — ${filtroTxt.join(" · ")}</div>
  <table><thead><tr><th class="num">#</th><th>Substância</th><th>Lote</th><th class="c">Validade</th><th class="c">Saldo sistema</th><th class="c fis">Contagem física</th><th class="c fis">Diferença</th></tr></thead>
  <tbody>${corpo}</tbody></table>
  <div class="foot"><div class="l">Conferente (assinatura)</div><div class="l">${rtTxt}<br>Farmacêutico(a) Responsável Técnico</div></div>
  </body></html>`;
  const win = window.open("", "_blank"); if (!win) { alert("Permita pop-ups para imprimir a folha."); return; }
  win.document.open(); win.document.write(html); win.document.close();
}

function renderPage() {
  const hist = ajustes.slice().sort((a, b) => (a.data < b.data ? 1 : -1));
  return `
    <div class="note-box"><b>Conferência de estoque.</b> Conte fisicamente um lote e informe a quantidade real. Se divergir do sistema, o ajuste é registrado como movimentação — com justificativa — e o saldo se reconcilia automaticamente. A escrituração continua sem digitação manual de saldo.</div>

    <div class="panel">
      <div class="panel-head">
        <div><div class="panel-title">Ajustes de inventário</div><div class="panel-title-sub">${hist.length} ajuste(s) registrado(s)</div></div>
        <div class="toolbar">
          <button class="btn ghost sm" onclick="abrirFolhaContagem()">🖶 Folha de contagem</button>
          <button class="btn sm" onclick="abrirFormAjuste()">+ Novo ajuste / conferência</button>
        </div>
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
