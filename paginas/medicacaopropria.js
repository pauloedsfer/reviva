/* ============================================================
   paginas/medicacaopropria.js — Hospital Reviva
   Custódia (medicação trazida pelo paciente): registro +
   Termo de Recebimento de Medicação em Custódia (imprimível).
   ============================================================ */

/* -------- registro de custódia -------- */
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
    <div class="note-box" style="margin:10px 0 0">A custódia é <b>restrita ao paciente</b> e não entra no estoque geral. Depois de registrar, use <b>Termo de Custódia</b> para imprimir o comprovante.</div>
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
}

/* -------- Termo de Recebimento de Medicação em Custódia -------- */
// Pacientes que têm alguma custódia registrada.
function _pacientesComCustodia() {
  const ids = new Set(patientMeds.map((pm) => pm.paciente));
  return patients.filter((p) => ids.has(p.id));
}

function abrirTermoCustodia() {
  const elegiveis = _pacientesComCustodia();
  if (!elegiveis.length) {
    abrirModal("Termo de Custódia", `<div class="note-box">Nenhum paciente tem medicação em custódia registrada ainda. Registre a medicação do paciente primeiro.</div>`, async () => {}, "Fechar");
    return;
  }
  const opts = elegiveis.map((p) => `<option value="${p.id}">${p.nome} · ${p.leito || ""}</option>`).join("");
  abrirModal("Imprimir Termo de Custódia", `
    <div class="ff"><label>Paciente *</label><select id="tcPac">${opts}</select></div>
    <div class="note-box" style="margin:0">O termo reúne os dados do paciente e todas as medicações em custódia dele, com espaço para assinatura do paciente/responsável e do RT.</div>
  `, async () => {
    const pac = fv("tcPac");
    if (!pac) throw new Error("Selecione o paciente.");
    imprimirTermoCustodia(pac);
  }, "Gerar termo");
}

function imprimirTermoCustodia(pacienteId) {
  const p = patById(pacienteId);
  const est = window.ESTAB || {};
  const rt = window.RT || {};
  const rtLinhaTxt = rt.nome ? `${rt.nome} — ${rt.conselho}-${rt.uf} ${rt.numero_registro}` : "Responsável Técnico não configurado";
  const local = est.municipio_uf || "";
  const hoje = new Date().toLocaleDateString("pt-BR");

  // itens de custódia do paciente (com data de recebimento)
  const linhas = [];
  patientMeds.filter((pm) => pm.paciente === pacienteId).forEach((pm) => {
    pm.itens.forEach((it) => linhas.push({
      sub: subById(it.subId).nome, qtd: it.qtd, lote: it.lote, validade: it.validade, data: pm.data,
    }));
  });

  const linhasHtml = linhas.map((l) => `<tr>
      <td>${_esc(l.sub)}</td>
      <td class="num">${l.qtd}</td>
      <td class="mono">${_esc(l.lote || "—")}</td>
      <td class="mono">${l.validade ? fmtDate(l.validade) : "—"}</td>
      <td class="mono">${fmtDate(l.data)}</td>
    </tr>`).join("");

  const dado = (rot, val) => `<div class="d"><span class="dl">${rot}</span><span class="dv">${_esc(val || "—")}</span></div>`;

  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Termo de Custódia — ${_esc(p.nome)}</title>
  <style>
    @page{ size:A4 portrait; margin:16mm 14mm; }
    *{ box-sizing:border-box; } body{ font-family:"Public Sans",Arial,sans-serif; color:#1E2A28; font-size:12px; margin:0; line-height:1.5; }
    .estab{ border-bottom:2px solid #2C5F5A; padding-bottom:8px; margin-bottom:12px; }
    .estab .nome{ font-size:15px; font-weight:700; }
    .estab .sub{ font-size:10.5px; color:#4a544f; }
    h1{ font-size:15px; text-align:center; margin:14px 0 4px; }
    .ref{ text-align:center; font-size:10.5px; color:#6a736e; margin-bottom:14px; }
    .bloco{ border:1px solid #cfd6cf; border-radius:8px; padding:10px 12px; margin-bottom:12px; }
    .bloco h2{ font-size:11px; text-transform:uppercase; letter-spacing:.04em; color:#2C5F5A; margin:0 0 8px; }
    .grid{ display:grid; grid-template-columns:1fr 1fr; gap:4px 20px; }
    .d{ font-size:11.5px; } .dl{ color:#6a736e; } .dv{ font-weight:600; margin-left:5px; }
    table{ width:100%; border-collapse:collapse; margin-top:4px; }
    th,td{ border:1px solid #cfd6cf; padding:5px 7px; text-align:left; font-size:11px; }
    th{ background:#EEF2EC; text-transform:uppercase; font-size:10px; letter-spacing:.03em; }
    td.num,th.num{ text-align:right; }
    .mono{ font-family:"IBM Plex Mono",monospace; }
    .decl{ font-size:11.5px; text-align:justify; margin:14px 0; }
    .assin{ display:grid; grid-template-columns:1fr 1fr; gap:40px; margin-top:46px; }
    .linha{ border-top:1px solid #1E2A28; padding-top:5px; font-size:10.5px; text-align:center; }
    .localdata{ margin-top:26px; font-size:11.5px; }
    .btnp{ position:fixed; top:14px; right:14px; background:#2C5F5A; color:#fff; border:none; padding:9px 15px; border-radius:8px; cursor:pointer; font:inherit; }
    @media print{ .btnp{ display:none; } }
  </style></head><body>
    <button class="btnp" onclick="window.print()">Imprimir / Salvar PDF</button>

    <div class="estab">
      <div class="nome">${_esc(est.razao_social || est.nome_fantasia || "Estabelecimento não configurado")}</div>
      <div class="sub">${est.cnpj ? "CNPJ: " + _esc(est.cnpj) + " · " : ""}${_esc(est.endereco || "")}${est.municipio_uf ? " — " + _esc(est.municipio_uf) : ""}</div>
    </div>

    <h1>Termo de Recebimento de Medicação em Custódia</h1>
    <div class="ref">Documento de guarda de medicação de propriedade do paciente</div>

    <div class="bloco">
      <h2>Identificação do paciente</h2>
      <div class="grid">
        ${dado("Nome:", p.nome)}
        ${dado("Prontuário:", p.prontuario)}
        ${dado("CPF:", p.cpf)}
        ${dado("Leito:", p.leito)}
        ${dado("Nascimento:", p.dataNascimento ? fmtDate(p.dataNascimento) : "")}
        ${dado("Admissão:", p.admissao ? fmtDate(p.admissao) : "")}
        ${dado("Endereço:", p.endereco)}
      </div>
    </div>

    <div class="bloco">
      <h2>Medicações recebidas em custódia</h2>
      <table>
        <thead><tr><th>Medicamento</th><th class="num">Qtd. recebida</th><th>Lote</th><th>Validade</th><th>Data receb.</th></tr></thead>
        <tbody>${linhasHtml || '<tr><td colspan="5" style="text-align:center;color:#6a736e">Sem itens</td></tr>'}</tbody>
      </table>
    </div>

    <div class="decl">
      Declaro, para os devidos fins, que o estabelecimento acima recebeu em <b>custódia</b> a(s) medicação(ões)
      relacionada(s), de propriedade do(a) paciente identificado(a), trazida(s) por ele(a) ou seu responsável.
      A medicação permanece sob guarda da farmácia, será administrada conforme prescrição médica e registrada na
      escrituração, e o saldo não utilizado será devolvido ao(à) paciente/responsável na alta. A conferência das
      quantidades foi realizada na presença do(a) paciente ou responsável.
    </div>

    <div class="localdata">${local ? _esc(local) + ", " : ""}${hoje}.</div>

    <div class="assin">
      <div class="linha">Paciente ou responsável</div>
      <div class="linha">${_esc(rtLinhaTxt)}<br>Farmacêutico(a) Responsável Técnico</div>
    </div>
  </body></html>`;

  const win = window.open("", "_blank");
  if (!win) { alert("Permita pop-ups para imprimir o termo."); return; }
  win.document.open(); win.document.write(html); win.document.close();
}

function renderPage(){
  return `
    <div class="note-box"><b>Custódia, não é doação.</b> Medicação trazida pelo paciente/família continua sendo dele — o hospital apenas guarda e administra. Sem custo, fora do estoque geral, devolvida (se sobrar) na alta.</div>
    <div class="panel">
      <div class="panel-head">
        <div><div class="panel-title">Medicações em custódia</div><div class="panel-title-sub">${patientMeds.reduce((a,pm)=>a+pm.itens.length,0)} item(ns) registrado(s)</div></div>
        <div class="toolbar">
          <button class="btn ghost sm" onclick="abrirTermoCustodia()">🖶 Termo de Custódia</button>
          <button class="btn sm" onclick="abrirFormCustodia()">+ Registrar medicação do paciente</button>
        </div>
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
