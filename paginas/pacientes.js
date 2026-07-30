/* ============================================================
   paginas/pacientes.js — Hospital Reviva
   Internados + cadastro/edição, ALTA (assistente), Arquivo de
   pacientes e Extrato de Alta (com ou sem valores).
   ============================================================ */

let _pacView = "ativos"; // ativos | arquivo
function mudarPacView(v) { _pacView = v; document.getElementById("viewport").innerHTML = renderPage(); }

function _formPaciente(p) {
  p = p || {};
  const presc = prescritores.map((x) => `<option value="${x.id}"${x.id === p.prescritorId ? " selected" : ""}>${x.nome} (${x.conselho}-${x.uf} ${x.numero})</option>`).join("");
  return `
    <div class="ff"><label>Nome completo *</label><input id="pNome" value="${(p.nome || "").replace(/"/g, "&quot;")}"></div>
    <div class="ff row2">
      <div><label>CPF</label><input id="pCpf" value="${p.cpf || ""}" placeholder="000.000.000-00"></div>
      <div><label>Nascimento</label><input id="pNasc" type="date" value="${p.dataNascimento || ""}"></div>
    </div>
    <div class="ff row2">
      <div><label>Prontuário</label><input id="pPront" value="${p.prontuario || ""}"></div>
      <div><label>Leito</label><input id="pLeito" value="${p.leito || ""}" placeholder="Q-01"></div>
    </div>
    <div class="ff"><label>Endereço</label><input id="pEnd" value="${(p.endereco || "").replace(/"/g, "&quot;")}"></div>
    <div class="ff row2">
      <div><label>Telefone</label><input id="pTel" value="${p.telefone || ""}"></div>
      <div><label>Admissão *</label><input id="pAdm" type="date" value="${p.admissao || new Date().toISOString().slice(0,10)}"></div>
    </div>
    <div class="ff"><label>Prescritor responsável</label><select id="pPresc"><option value="">— selecione —</option>${presc}</select></div>
  `;
}

function abrirFormPaciente(id) {
  const p = id ? patients.find((x) => x.id === id) : null;
  abrirModal(id ? "Editar paciente" : "Novo paciente", _formPaciente(p), async () => {
    const nome = fv("pNome"); const adm = fv("pAdm");
    if (!nome) throw new Error("Informe o nome completo.");
    if (!adm) throw new Error("Informe a data de admissão.");
    const dados = {
      nome_completo: nome, cpf: fvOrNull("pCpf"), data_nascimento: fvOrNull("pNasc"),
      prontuario: fvOrNull("pPront"), leito: fvOrNull("pLeito"), endereco: fvOrNull("pEnd"),
      telefone: fvOrNull("pTel"), data_admissao: adm, prescritor_id: fvOrNull("pPresc"),
    };
    if (id) {
      const { error } = await window.SB.from("pacientes").update(dados).eq("id", id);
      if (error) throw error;
    } else {
      const { error } = await window.SB.from("pacientes").insert({ ...dados, ...usuarioId() });
      if (error) throw error;
    }
  }, id ? "Salvar alterações" : "Cadastrar paciente");
}

/* ---------------- ALTA ---------------- */
function _custodiaDoPaciente(pacId) {
  const linhas = [];
  patientMeds.filter((pm) => pm.paciente === pacId).forEach((pm) => {
    pm.itens.forEach((it) => {
      const saldoAtual = saldoLote(it.lote);
      if (saldoAtual > 0 && !itemIntegrado(it.id)) linhas.push({ pm, it, saldo: saldoAtual });
    });
  });
  return linhas;
}

function abrirAltaPaciente(id) {
  const p = patients.find((x) => x.id === id); if (!p) return;
  const cust = _custodiaDoPaciente(id);
  const presAtivas = prescriptions.filter((pr) => pr.paciente === id).length;
  const custHtml = cust.length
    ? `<table style="width:100%"><thead><tr><th>Medicação</th><th>Lote</th><th>Saldo</th></tr></thead><tbody>
        ${cust.map((c) => `<tr><td>${subById(c.it.subId).nome}</td><td><span class="folio">${c.it.lote}</span></td><td class="num mono">${c.saldo}</td></tr>`).join("")}
      </tbody></table>
      <div class="note-box" style="margin-top:10px">Estas medicações ficarão <b>aguardando retirada</b>. Depois da alta, na tela <b>Medicação do Paciente</b>, você decide item a item: <b>devolver à família</b> (com Termo de Devolução) ou <b>integrar ao estoque</b>.</div>`
    : `<div class="note-box">Este paciente não tem medicação em custódia com saldo.</div>`;
  const corpo = `
    <div class="ff"><label>Data da alta *</label><input id="altaData" type="date" value="${new Date().toISOString().slice(0,10)}" max="${new Date().toISOString().slice(0,10)}"></div>
    <div class="item-head">O que acontece na alta</div>
    <div style="font-size:13px;color:var(--muted);margin-bottom:10px">
      • ${presAtivas} prescrição(ões) serão encerradas (deixam de aparecer no mapa e na dispensação após a data da alta).<br>
      • O leito <b>${p.leito || "—"}</b> é liberado.<br>
      • O histórico completo fica preservado no <b>Arquivo</b>, com o Extrato de Alta imprimível.
    </div>
    <div class="item-head">Medicação em custódia</div>
    ${custHtml}
  `;
  abrirModal(`Dar alta — ${p.nome}`, corpo, async () => {
    const data = fv("altaData");
    if (!data) throw new Error("Informe a data da alta.");
    if (p.admissao && data < p.admissao) throw new Error("A alta não pode ser anterior à admissão.");
    const { error: e1 } = await window.SB.from("pacientes").update({ ativo: false, data_alta: data }).eq("id", id);
    if (e1) throw e1;
    const { error: e2 } = await window.SB.from("prescricoes").update({ ativo: false }).eq("paciente_id", id);
    if (e2) throw e2;
  }, "Confirmar alta");
}

/* ---------------- EXTRATO DE ALTA ---------------- */
function abrirExtratoAlta(id) {
  const p = patients.find((x) => x.id === id); if (!p) return;
  abrirModal("Extrato de Alta", `
    <div class="ff"><label>Versão</label>
      <select id="exVersao">
        <option value="valores">Com valores (diretoria)</option>
        <option value="semvalores">Sem valores (família)</option>
      </select>
    </div>`, async () => {
    imprimirExtratoAlta(id, fv("exVersao") === "valores");
  }, "Gerar extrato");
}

function imprimirExtratoAlta(pacId, comValores) {
  const p = patById(pacId);
  const est = window.ESTAB || {}, rt = window.RT || {};
  const rtTxt = rt.nome ? `${rt.nome} — ${rt.conselho}-${rt.uf} ${rt.numero_registro}` : "____________________";
  const brl = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const fim = p.dataAlta || HOJE;

  // dispensações do estoque do hospital
  const disp = movements.filter((m) => m.tipo === "saida" && m.paciente === pacId && m.ref && m.ref.indexOf("Dose ") === 0);
  const porSub = {};
  disp.forEach((m) => {
    const k = m.subId;
    (porSub[k] = porSub[k] || { qtd: 0, custo: 0, proprio: 0 });
    const l = allLotes().find((x) => x.lote === m.lote);
    const ehProprio = l && l.origem === "proprio" && !l.integrado;
    porSub[k].qtd += m.qtd;
    if (ehProprio) porSub[k].proprio += m.qtd; else porSub[k].custo += m.qtd * (m.custoUnit || 0);
  });
  const linhasDisp = Object.keys(porSub).map((sid) => {
    const r = porSub[sid];
    return `<tr><td>${subById(sid).nome}</td><td class="c mono">${r.qtd}</td><td class="c mono">${r.proprio}</td>${comValores ? `<td class="r mono">${brl(r.custo)}</td>` : ""}</tr>`;
  }).join("");
  const custoTotal = Object.values(porSub).reduce((a, r) => a + r.custo, 0);

  // custódia: recebida, consumida, destino
  const custLinhas = [];
  patientMeds.filter((pm) => pm.paciente === pacId).forEach((pm) => pm.itens.forEach((it) => {
    const dest = destinosDoItem(it.id);
    const devolvido = dest.filter((d) => d.tipo === "devolucao_familia").reduce((a, d) => a + d.qtd, 0);
    const integrado = itemIntegrado(it.id) ? "integrado ao estoque" : "";
    const saldoAtual = saldoLote(it.lote);
    const status = integrado || (saldoAtual > 0 ? "aguardando retirada" : (devolvido ? "devolvido à família" : "consumido"));
    custLinhas.push(`<tr><td>${subById(it.subId).nome}</td><td class="c mono">${it.qtd}</td><td class="c mono">${devolvido || "—"}</td><td class="c mono">${saldoAtual}</td><td>${status}</td></tr>`);
  }));

  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Extrato de Alta — ${p.nome}</title>
  <style>@page{size:A4 portrait;margin:16mm 14mm}*{box-sizing:border-box}body{font-family:"Public Sans",Arial,sans-serif;color:#1E2A28;font-size:12px;margin:0;line-height:1.5}
  .estab{border-bottom:2px solid #2C5F5A;padding-bottom:8px;margin-bottom:12px}.estab .n{font-size:15px;font-weight:700}.estab .s{font-size:10.5px;color:#4a544f}
  h1{font-size:15px;text-align:center;margin:12px 0 2px}.ref{text-align:center;font-size:10.5px;color:#6a736e;margin-bottom:12px}
  .bloco{border:1px solid #cfd6cf;border-radius:8px;padding:10px 12px;margin-bottom:12px}
  .bloco h2{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#2C5F5A;margin:0 0 8px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 20px}.d{font-size:11.5px}.dl{color:#6a736e}.dv{font-weight:600;margin-left:5px}
  table{width:100%;border-collapse:collapse;margin-top:4px}th,td{border:1px solid #cfd6cf;padding:5px 7px;text-align:left;font-size:11px}
  th{background:#EEF2EC;text-transform:uppercase;font-size:10px}td.c,th.c{text-align:center}td.r,th.r{text-align:right}.mono{font-family:"IBM Plex Mono",monospace}
  .tot{margin-top:8px;text-align:right;font-size:12px}
  .assin{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:44px}.linha{border-top:1px solid #1E2A28;padding-top:5px;font-size:10.5px;text-align:center}
  .btnp{position:fixed;top:14px;right:14px;background:#2C5F5A;color:#fff;border:none;padding:9px 15px;border-radius:8px;cursor:pointer;font:inherit}@media print{.btnp{display:none}}
  </style></head><body>
  <button class="btnp" onclick="window.print()">Imprimir / Salvar PDF</button>
  <div class="estab"><div class="n">${est.razao_social || est.nome_fantasia || "Hospital Reviva"}</div>
    <div class="s">${est.cnpj ? "CNPJ: " + est.cnpj + " · " : ""}${est.endereco || ""}${est.municipio_uf ? " — " + est.municipio_uf : ""}</div></div>
  <h1>Extrato de Alta — Farmácia</h1>
  <div class="ref">${comValores ? "Versão com valores (uso interno / diretoria)" : "Versão sem valores (paciente / família)"}</div>

  <div class="bloco"><h2>Paciente</h2><div class="grid">
    <div class="d"><span class="dl">Nome:</span><span class="dv">${p.nome}</span></div>
    <div class="d"><span class="dl">Prontuário:</span><span class="dv">${p.prontuario || "—"}</span></div>
    <div class="d"><span class="dl">Admissão:</span><span class="dv">${fmtDate(p.admissao)}</span></div>
    <div class="d"><span class="dl">Alta:</span><span class="dv">${p.dataAlta ? fmtDate(p.dataAlta) : "—"}</span></div>
    <div class="d"><span class="dl">Período:</span><span class="dv">${diasInternado(p)} dia(s)</span></div>
    <div class="d"><span class="dl">Leito:</span><span class="dv">${p.leito || "—"}</span></div>
  </div></div>

  <div class="bloco"><h2>Medicamentos administrados (doses dispensadas)</h2>
    <table><thead><tr><th>Medicamento</th><th class="c">Doses</th><th class="c">Da custódia própria</th>${comValores ? '<th class="r">Custo (estoque hospital)</th>' : ""}</tr></thead>
    <tbody>${linhasDisp || `<tr><td colspan="${comValores ? 4 : 3}" style="text-align:center;color:#6a736e">Nenhuma dispensação registrada</td></tr>`}</tbody></table>
    ${comValores ? `<div class="tot"><b>Custo total (estoque do hospital): ${brl(custoTotal)}</b></div>` : ""}
  </div>

  <div class="bloco"><h2>Medicação em custódia (trazida pelo paciente)</h2>
    <table><thead><tr><th>Medicamento</th><th class="c">Recebido</th><th class="c">Devolvido à família</th><th class="c">Saldo atual</th><th>Situação</th></tr></thead>
    <tbody>${custLinhas.join("") || '<tr><td colspan="5" style="text-align:center;color:#6a736e">Sem medicação em custódia</td></tr>'}</tbody></table>
  </div>

  <div class="assin">
    <div class="linha">Paciente ou responsável</div>
    <div class="linha">${rtTxt}<br>Farmacêutico(a) Responsável Técnico</div>
  </div>
  </body></html>`;
  const win = window.open("", "_blank"); if (!win) { alert("Permita pop-ups."); return; }
  win.document.open(); win.document.write(html); win.document.close();
}

/* ---------------- RENDER ---------------- */
function _tabAtivos() {
  const ativos = patients.filter((p) => p.ativo !== false);
  return `
    <div class="panel">
      <div class="panel-head">
        <div><div class="panel-title">Pacientes internados</div><div class="panel-title-sub">${ativos.length} de ${typeof CAPACIDADE_TOTAL !== "undefined" ? CAPACIDADE_TOTAL : 35} leitos ocupados</div></div>
        <div class="toolbar">
          <button class="btn ghost sm" onclick="abrirEtiquetasPaciente()">🏷 Etiquetas</button>
          <button class="btn sm" onclick="abrirFormPaciente()">+ Novo paciente</button>
        </div>
      </div>
      <div class="panel-body">
        ${ativos.length ? `<table>
          <thead><tr><th>Paciente</th><th>Leito</th><th>Admissão</th><th>Dias</th><th>Prescritor</th><th>Medicamentos (custo)</th><th></th></tr></thead>
          <tbody>
            ${ativos.map(p=>`<tr>
                <td><b>${p.nome}</b></td>
                <td class="mono">${p.leito || "—"}</td>
                <td class="mono">${fmtDate(p.admissao)}</td>
                <td class="num mono">${diasInternado(p)}</td>
                <td style="color:var(--muted)">${p.prescritor || "—"}</td>
                <td class="num mono"><b>${fmtBRL(custoMedicamentosPaciente(p.id))}</b></td>
                <td style="text-align:right">
                  <button class="btn ghost sm" onclick="abrirEtiquetasPaciente('${p.id}')" title="Etiquetas de identificação">🏷</button>
                  <button class="btn ghost sm" onclick="abrirFormPaciente('${p.id}')">Editar</button>
                  <button class="btn ghost sm" onclick="abrirAltaPaciente('${p.id}')">Dar alta</button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>` : `<div style="color:var(--muted);font-size:13px;padding:8px 0">Nenhum paciente internado.</div>`}
      </div>
    </div>
    <div class="note-box">O valor é apenas o <b>custo de medicamentos</b> dispensados do estoque do hospital. Medicação em custódia não gera custo. Na alta, a custódia fica <b>aguardando retirada</b> — decisão na tela Medicação do Paciente.</div>`;
}

function _tabArquivo() {
  const arq = patients.filter((p) => p.ativo === false).sort((a, b) => ((a.dataAlta || "") < (b.dataAlta || "") ? 1 : -1));
  return `
    <div class="panel">
      <div class="panel-head">
        <div><div class="panel-title">Arquivo de pacientes</div><div class="panel-title-sub">${arq.length} paciente(s) com alta — histórico completo preservado</div></div>
      </div>
      <div class="panel-body">
        ${arq.length ? `<table>
          <thead><tr><th>Paciente</th><th>Admissão</th><th>Alta</th><th>Período</th><th>Custódia pendente</th><th></th></tr></thead>
          <tbody>
            ${arq.map(p=>{
              const pend = _custodiaDoPaciente(p.id).length;
              return `<tr>
                <td><b>${p.nome}</b> <span style="color:var(--muted)">· ${p.prontuario || ""}</span></td>
                <td class="mono">${fmtDate(p.admissao)}</td>
                <td class="mono">${p.dataAlta ? fmtDate(p.dataAlta) : "—"}</td>
                <td class="num mono">${diasInternado(p)} dia(s)</td>
                <td>${pend ? `<span class="pill warn">● ${pend} item(ns) aguardando retirada</span>` : '<span class="pill">● resolvida</span>'}</td>
                <td style="text-align:right"><button class="btn ghost sm" onclick="abrirExtratoAlta('${p.id}')">🖶 Extrato de Alta</button></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>` : `<div style="color:var(--muted);font-size:13px;padding:8px 0">Nenhum paciente arquivado ainda.</div>`}
      </div>
    </div>
    <div class="note-box">Nada é apagado: dispensações, custódia e prescrições ficam no histórico. O <b>Extrato de Alta</b> pode ser reimpresso a qualquer momento, em versão <b>com valores</b> (diretoria) ou <b>sem valores</b> (família).</div>`;
}

function renderPage() {
  const tab = (v, t) => `<button class="btn ${_pacView===v?'':'ghost'} sm" onclick="mudarPacView('${v}')">${t}</button>`;
  return `
    <div class="toolbar" style="margin-bottom:14px">${tab('ativos','Internados')} ${tab('arquivo','Arquivo (altas)')}</div>
    ${_pacView === 'arquivo' ? _tabArquivo() : _tabAtivos()}
  `;
}

/* ============================================================
   ETIQUETAS DE IDENTIFICAÇÃO DO PACIENTE
   Etiqueta única, usada para prontuário, caixa de medicação em
   custódia e qualquer outra identificação. Sai em folha A4 numa
   grade compatível com etiquetas adesivas comuns.
   ============================================================ */
let _etqCfg = { pac: "", qtd: 8, formato: "grande", custodia: false };

function abrirEtiquetasPaciente(pacId) {
  const ativos = patients.filter((p) => p.ativo !== false)
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  if (!ativos.length) { alert("Nenhum paciente internado."); return; }
  _etqCfg.pac = pacId || _etqCfg.pac || ativos[0].id;
  const opt = `<option value="__todos__"${_etqCfg.pac === "__todos__" ? " selected" : ""}>★ TODOS os internados (${ativos.length})</option>` +
    ativos.map((p) => `<option value="${p.id}"${p.id === _etqCfg.pac ? " selected" : ""}>${p.nome}${p.leito ? " · leito " + p.leito : ""}</option>`).join("");
  abrirModal("Imprimir etiquetas de identificação", `
    <div class="ff"><label>Paciente</label><select id="etqPac">${opt}</select></div>
    <div class="ff row2">
      <div><label>Formato</label>
        <select id="etqFmt">
          <option value="grande"${_etqCfg.formato === "grande" ? " selected" : ""}>Grande — 99 × 34 mm (16 por folha)</option>
          <option value="media"${_etqCfg.formato === "media" ? " selected" : ""}>Média — 67 × 25 mm (30 por folha)</option>
        </select></div>
      <div><label>Etiquetas por paciente</label><input id="etqQtd" type="number" min="1" max="60" value="${_etqCfg.qtd}"></div>
    </div>
    <div class="ff"><label style="display:flex;align-items:center;gap:8px;font-weight:400">
      <input type="checkbox" id="etqCust"${_etqCfg.custodia ? " checked" : ""}> Incluir aviso <b>USO EXCLUSIVO DESTE PACIENTE</b> (para caixa de custódia)</label></div>
    <div class="note-box" style="margin:0">A etiqueta traz nome, prontuário, leito, nascimento/idade e data de internação, com o nome da clínica. Serve para prontuário, caixa de custódia e demais identificações. Imprima em folha adesiva A4 ou em papel comum para recortar.</div>
  `, async () => {
    _etqCfg.pac = fv("etqPac");
    _etqCfg.formato = fv("etqFmt");
    _etqCfg.qtd = Math.max(1, Math.min(60, parseInt(fv("etqQtd"), 10) || 1));
    _etqCfg.custodia = document.getElementById("etqCust").checked;
    setTimeout(imprimirEtiquetasPaciente, 60);
  }, "Gerar etiquetas");
}

function imprimirEtiquetasPaciente() {
  const est = window.ESTAB || {};
  const alvos = _etqCfg.pac === "__todos__"
    ? patients.filter((p) => p.ativo !== false).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
    : [patById(_etqCfg.pac)].filter(Boolean);
  if (!alvos.length) { alert("Selecione um paciente."); return; }

  const idade = (d) => {
    if (!d) return "";
    const t = new Date(), n = new Date(d);
    let a = t.getFullYear() - n.getFullYear();
    const m = t.getMonth() - n.getMonth();
    if (m < 0 || (m === 0 && t.getDate() < n.getDate())) a--;
    return a >= 0 && a < 130 ? a + " anos" : "";
  };

  const gr = _etqCfg.formato === "grande";
  const etiqueta = (p) => {
    const nasc = p.dataNascimento ? fmtDate(p.dataNascimento) : "";
    const id = idade(p.dataNascimento);
    return `<div class="etq">
      <div class="clin">${_esc(est.nome_fantasia || est.razao_social || "Clínica Reviva")}</div>
      <div class="nome">${_esc(p.nome)}</div>
      <div class="dados">
        <span><b>Prontuário:</b> ${_esc(p.prontuario || "____")}</span>
        <span><b>Leito:</b> ${_esc(p.leito || "____")}</span>
      </div>
      <div class="dados">
        ${nasc || id ? `<span><b>Nasc.:</b> ${nasc}${id ? " (" + id + ")" : ""}</span>` : ""}
        ${p.admissao ? `<span><b>Internação:</b> ${fmtDate(p.admissao)}</span>` : ""}
      </div>
      ${_etqCfg.custodia ? `<div class="aviso">USO EXCLUSIVO DESTE PACIENTE</div>` : ""}
    </div>`;
  };

  let etiquetas = "";
  alvos.forEach((p) => { for (let i = 0; i < _etqCfg.qtd; i++) etiquetas += etiqueta(p); });

  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Etiquetas de identificação</title>
  <style>
  @page{size:A4 portrait;margin:${gr ? "13mm 5mm" : "13mm 6mm"}}
  *{box-sizing:border-box}
  body{font-family:"Public Sans",Arial,sans-serif;color:#1E2A28;margin:0}
  .grade{display:grid;grid-template-columns:repeat(${gr ? 2 : 3}, 1fr);gap:0}
  .etq{width:100%;height:${gr ? "33.9mm" : "25.4mm"};padding:${gr ? "2mm 3mm" : "1.4mm 2mm"};
       border:1px dashed #c8cfc8;overflow:hidden;display:flex;flex-direction:column;justify-content:center;
       page-break-inside:avoid}
  .clin{font-size:${gr ? "7pt" : "5.5pt"};text-transform:uppercase;letter-spacing:.04em;color:#4a544f}
  .nome{font-size:${gr ? "11pt" : "8pt"};font-weight:700;line-height:1.1;margin:${gr ? "1mm 0 .8mm" : ".6mm 0 .4mm"};
        white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .dados{display:flex;gap:${gr ? "4mm" : "2.5mm"};font-size:${gr ? "7.5pt" : "5.5pt"};line-height:1.35;flex-wrap:nowrap;overflow:hidden}
  .dados b{font-weight:600}
  .aviso{margin-top:${gr ? "1mm" : ".5mm"};font-size:${gr ? "6.5pt" : "5pt"};font-weight:700;
         letter-spacing:.03em;color:#B04A3F;border:1px solid #B04A3F;border-radius:1mm;
         padding:${gr ? ".6mm 1.5mm" : ".3mm 1mm"};display:inline-block;align-self:flex-start}
  .btn{position:fixed;top:12px;right:12px;background:#2C5F5A;color:#fff;border:none;padding:9px 15px;
       border-radius:8px;cursor:pointer;font:inherit;font-size:13px;z-index:9}
  @media print{.btn{display:none} .etq{border-color:transparent}}
  </style></head><body>
  <button class="btn" onclick="window.print()">Imprimir / Salvar PDF</button>
  <div class="grade">${etiquetas}</div>
  </body></html>`;
  const win = window.open("", "_blank");
  if (!win) { alert("Permita pop-ups para imprimir as etiquetas."); return; }
  win.document.open(); win.document.write(html); win.document.close();
}
