/* ============================================================
   paginas/pops.js — Hospital Reviva
   Registro / Checklist de POPs do fluxo (Camada 1).
   CRUD + status editável + campos de controle (código, versão,
   vigência, próxima revisão, responsável) + impressão do
   Registro Mestre de POPs para consulta e fiscalização.
   ============================================================ */

const _POP_STATUS = { pendente: "Pendente", em_elaboracao: "Em elaboração", vigente: "Vigente" };
function _popStatusPill(s) {
  if (s === "vigente") return '<span class="pill">● Vigente</span>';
  if (s === "em_elaboracao") return '<span class="pill" style="background:#FBF3E3;color:#8a6d1f">● Em elaboração</span>';
  return '<span class="pill low">● Pendente</span>';
}
function _popVenc(p) {
  // sinaliza revisão vencida/próxima
  if (!p.proximaRevisao) return "";
  const hoje = new Date().toISOString().slice(0, 10);
  if (p.proximaRevisao < hoje) return ' <span class="tag" style="background:#F7E3E1;color:#B04A3F">revisão vencida</span>';
  const d = Math.round((new Date(p.proximaRevisao) - new Date(hoje)) / 86400000);
  if (d <= 30) return ` <span class="tag" style="background:#FBF3E3;color:#B07A2F">revisar em ${d}d</span>`;
  return "";
}

function _popForm(p) {
  p = p || {};
  const areas = [...new Set(pops.map((x) => x.area).filter(Boolean))];
  const dl = areas.map((a) => `<option value="${a.replace(/"/g, "&quot;")}">`).join("");
  const optStatus = Object.entries(_POP_STATUS)
    .map(([v, t]) => `<option value="${v}"${p.status === v ? " selected" : ""}>${t}</option>`).join("");
  return `
    <div class="ff"><label>Título do POP *</label><input id="poTit" value="${(p.titulo || "").replace(/"/g, "&quot;")}" placeholder="Ex.: Preparo e Etiquetagem da Dose Unitária"></div>
    <div class="ff row2">
      <div><label>Área responsável</label><input id="poArea" list="poAreas" value="${(p.area || "").replace(/"/g, "&quot;")}" placeholder="Farmácia"><datalist id="poAreas">${dl}</datalist></div>
      <div><label>Status</label><select id="poStatus">${optStatus}</select></div>
    </div>
    <div class="ff row2">
      <div><label>Código</label><input id="poCod" value="${(p.codigo || "").replace(/"/g, "&quot;")}" placeholder="POP-FAR-006"></div>
      <div><label>Versão</label><input id="poVer" value="${(p.versao || "").replace(/"/g, "&quot;")}" placeholder="01"></div>
    </div>
    <div class="ff row2">
      <div><label>Data de vigência</label><input id="poVig" type="date" value="${p.dataVigencia || ""}"></div>
      <div><label>Próxima revisão</label><input id="poRev" type="date" value="${p.proximaRevisao || ""}"></div>
    </div>
    <div class="ff"><label>Responsável (elaboração/aprovação)</label><input id="poResp" value="${(p.responsavel || "").replace(/"/g, "&quot;")}" placeholder="Farmacêutico RT"></div>
    <div class="ff"><label>Observação</label><input id="poObs" value="${(p.observacao || "").replace(/"/g, "&quot;")}" placeholder="Ex.: aguardando aprovação da direção"></div>
  `;
}

function abrirFormPop(id) {
  const p = id ? pops.find((x) => x.id === id) : null;
  abrirModal(id ? "Editar POP" : "Novo POP", _popForm(p), async () => {
    const titulo = fv("poTit");
    if (!titulo) throw new Error("Informe o título do POP.");
    const dados = {
      titulo, area: fvOrNull("poArea"), status: fv("poStatus") || "pendente",
      codigo: fvOrNull("poCod"), versao: fvOrNull("poVer"),
      data_vigencia: fvOrNull("poVig"), proxima_revisao: fvOrNull("poRev"),
      responsavel: fvOrNull("poResp"), observacao: fvOrNull("poObs"),
    };
    if (id) {
      const { error } = await window.SB.from("pops").update(dados).eq("id", id);
      if (error) throw error;
    } else {
      const ordem = (pops.reduce((m, x) => Math.max(m, x.ordem || 0), 0)) + 1;
      const { error } = await window.SB.from("pops").insert({ ...dados, ordem, is_dado_teste: false, ...usuarioId() });
      if (error) throw error;
    }
  }, id ? "Salvar" : "Cadastrar POP");
}

// avanço rápido de status direto na tabela
async function _popAvancaStatus(id) {
  const p = pops.find((x) => x.id === id); if (!p) return;
  const prox = p.status === "pendente" ? "em_elaboracao" : p.status === "em_elaboracao" ? "vigente" : "pendente";
  const patch = { status: prox };
  if (prox === "vigente" && !p.dataVigencia) patch.data_vigencia = new Date().toISOString().slice(0, 10);
  const { error } = await window.SB.from("pops").update(patch).eq("id", id);
  if (error) { alert("Erro: " + error.message); return; }
  await recarregarTela();
}

async function removerPop(id) {
  const p = pops.find((x) => x.id === id); if (!p) return;
  if (!confirm(`Remover o POP "${p.titulo}" do registro?`)) return;
  const { error } = await window.SB.from("pops").delete().eq("id", id);
  if (error) { alert("Erro: " + error.message); return; }
  await recarregarTela();
}

function imprimirRegistroPops() {
  const est = window.ESTAB || {}, rt = window.RT || {};
  const rtTxt = rt.nome ? `${rt.nome} — ${rt.conselho}-${rt.uf} ${rt.numero_registro}` : "____________________";
  const linhas = pops.map((p, i) => `<tr>
      <td class="num">${i + 1}</td>
      <td class="mono">${p.codigo || "—"}</td>
      <td>${(p.titulo || "").replace(/</g, "&lt;")}</td>
      <td>${p.area || "—"}</td>
      <td class="c mono">${p.versao || "—"}</td>
      <td class="c">${_POP_STATUS[p.status] || p.status}</td>
      <td class="c mono">${p.dataVigencia ? fmtDate(p.dataVigencia) : "—"}</td>
      <td class="c mono">${p.proximaRevisao ? fmtDate(p.proximaRevisao) : "—"}</td>
    </tr>`).join("");
  const vig = pops.filter((p) => p.status === "vigente").length;
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Registro Mestre de POPs</title>
  <style>@page{size:A4 portrait;margin:14mm 12mm}*{box-sizing:border-box}body{font-family:"Public Sans",Arial,sans-serif;color:#1E2A28;font-size:11px;margin:0}
  .estab{border-bottom:2px solid #2C5F5A;padding-bottom:6px;margin-bottom:8px}.estab .n{font-size:14px;font-weight:700}.estab .s{font-size:10px;color:#4a544f}
  h1{font-size:14px;margin:8px 0 2px}.sub{font-size:10.5px;color:#6a736e;margin-bottom:8px}
  table{width:100%;border-collapse:collapse}th,td{border:1px solid #cfd6cf;padding:4px 6px;font-size:10.5px}
  th{background:#EEF2EC;text-transform:uppercase;font-size:9px}td.c,th.c{text-align:center}td.num,th.num{text-align:center;width:26px}.mono{font-family:"IBM Plex Mono",monospace}
  .foot{margin-top:18px;font-size:10.5px;display:flex;justify-content:space-between;gap:30px}.foot .l{border-top:1px solid #1E2A28;padding-top:5px;text-align:center;flex:1}
  .btn{position:fixed;top:12px;right:12px;background:#2C5F5A;color:#fff;border:none;padding:9px 15px;border-radius:8px;cursor:pointer;font:inherit}@media print{.btn{display:none}}</style></head><body>
  <button class="btn" onclick="window.print()">Imprimir / Salvar PDF</button>
  <div class="estab"><div class="n">${est.razao_social || est.nome_fantasia || "Hospital Reviva"}</div><div class="s">${est.cnpj ? "CNPJ: " + est.cnpj + " · " : ""}${est.endereco || ""}${est.municipio_uf ? " — " + est.municipio_uf : ""}</div></div>
  <h1>Registro Mestre de Procedimentos Operacionais Padrão (POPs)</h1>
  <div class="sub">Emitido em ${new Date().toLocaleDateString("pt-BR")} · ${pops.length} POP(s) · ${vig} vigente(s)</div>
  <table><thead><tr><th class="num">#</th><th>Código</th><th>Título do POP</th><th>Área</th><th class="c">Versão</th><th class="c">Status</th><th class="c">Vigência</th><th class="c">Próx. revisão</th></tr></thead>
  <tbody>${linhas || '<tr><td colspan="8" class="c">Nenhum POP cadastrado.</td></tr>'}</tbody></table>
  <div class="foot"><div class="l">Responsável Técnico<br>${rtTxt}</div><div class="l">Direção / Coordenação<br>____________________</div></div>
  </body></html>`;
  const win = window.open("", "_blank"); if (!win) { alert("Permita pop-ups para imprimir."); return; }
  win.document.open(); win.document.write(html); win.document.close();
}

function renderPage() {
  const vig = pops.filter((p) => p.status === "vigente").length;
  const emEl = pops.filter((p) => p.status === "em_elaboracao").length;
  const pend = pops.filter((p) => p.status === "pendente").length;
  return `
    <div class="note-box"><b>${vig} de ${pops.length} POPs vigentes</b>${emEl ? ` · ${emEl} em elaboração` : ""}${pend ? ` · ${pend} pendente(s)` : ""}. Cada etapa do fluxo precisa de um Procedimento Operacional Padrão assinado, datado e disponível para consulta da equipe e para fiscalização. O sistema organiza o fluxo; o POP documenta por escrito como executá-lo — os dois são exigidos juntos (RDC 63/2011).</div>
    <div class="panel">
      <div class="panel-head">
        <div><div class="panel-title">Registro de POPs do fluxo de dispensação</div><div class="panel-title-sub">Clique no status para avançar (Pendente → Em elaboração → Vigente)</div></div>
        <div class="toolbar">
          <button class="btn ghost sm" onclick="imprimirRegistroPops()">🖶 Registro mestre</button>
          <button class="btn sm" onclick="abrirFormPop()">+ Novo POP</button>
        </div>
      </div>
      <div class="panel-body">
        <table>
          <thead><tr><th>Código</th><th>POP</th><th>Área</th><th>Versão</th><th>Vigência</th><th>Próx. revisão</th><th>Status</th><th></th></tr></thead>
          <tbody>
            ${pops.map((p) => `
              <tr>
                <td class="mono">${p.codigo || "—"}</td>
                <td><b>${p.titulo}</b>${p.observacao ? `<div style="font-size:11px;color:var(--muted)">${p.observacao}</div>` : ""}</td>
                <td style="color:var(--muted)">${p.area || "—"}</td>
                <td class="mono">${p.versao || "—"}</td>
                <td class="mono">${p.dataVigencia ? fmtDate(p.dataVigencia) : "—"}</td>
                <td class="mono">${p.proximaRevisao ? fmtDate(p.proximaRevisao) : "—"}${_popVenc(p)}</td>
                <td><button class="btn ghost sm" style="padding:2px 6px" onclick="_popAvancaStatus('${p.id}')" title="Clique para avançar o status">${_popStatusPill(p.status)}</button></td>
                <td style="text-align:right;white-space:nowrap">
                  <button class="btn ghost sm" onclick="abrirFormPop('${p.id}')">Editar</button>
                  <button class="btn ghost sm" onclick="removerPop('${p.id}')">Remover</button>
                </td>
              </tr>`).join("")}
          </tbody>
        </table>
        <div class="foot-signoff">
          <span>Farmacêutico RT: ${rtLinha()}</span>
          <span>Cada POP deve ser assinado pelo RT e pela coordenação de enfermagem quando envolver dupla checagem</span>
        </div>
      </div>
    </div>
  `;
}
