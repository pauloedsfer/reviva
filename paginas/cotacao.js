/* ============================================================
   paginas/cotacao.js — Hospital Reviva
   Cotação de compras.
   Fase A: montar itens e imprimir a solicitação para os fornecedores.
   Fase B: lançar os preços que voltaram, comparar por preço unitário
           e gerar o pedido por fornecedor (melhor preço por item).
   ============================================================ */

let _cotAberta = null;
let _cotView = "itens";       // itens | precos | comp
let _fornSel = "";            // fornecedor selecionado no lançamento de preços

/* ============================ FASE A ============================ */
function _proxIdentificador() {
  const ano = new Date().getFullYear();
  const n = cotacoes.filter((c) => (c.identificador || "").includes("-" + ano + "-")).length + 1;
  return `COT-${ano}-${String(n).padStart(3, "0")}`;
}

function abrirNovaCotacao() {
  const corpo = `
    <div class="ff row2">
      <div><label>Identificador</label><input id="ctId" value="${_proxIdentificador()}"></div>
      <div><label>Data</label><input id="ctData" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
    </div>
    <div class="ff"><label>Observação</label><input id="ctObs" placeholder="Ex.: primeira compra / padronização inicial"></div>`;
  abrirModal("Nova cotação", corpo, async () => {
    const { data, error } = await window.SB.from("cotacoes")
      .insert({ identificador: fvOrNull("ctId"), data: fv("ctData") || new Date().toISOString().slice(0,10), observacao: fvOrNull("ctObs"), ...usuarioId() })
      .select("id").single();
    if (error) throw error;
    _cotAberta = data.id; _cotView = "itens";
  }, "Criar cotação");
}

function abrirFormItemCotacao() {
  const temSub = substances.length > 0;
  const corpo = `
    <div class="ff"><label>Tipo de item</label>
      <select id="itTipo" onchange="_toggleItemCot()">
        ${temSub ? '<option value="sub">Substância cadastrada</option>' : ''}
        <option value="livre"${temSub ? '' : ' selected'}>Item livre (digitar)</option>
      </select></div>
    <div id="itBlocoSub" style="display:${temSub ? 'block' : 'none'}">
      <div class="ff"><label>Substância <span style="font-weight:400;color:var(--muted)">— itens da padronização</span></label><select id="itSub">${_optSubsPadronizadas()}</select></div></div>
    <div id="itBlocoLivre" style="display:${temSub ? 'none' : 'block'}">
      <div class="ff row2">
        <div><label>Descrição *</label><input id="itDesc" placeholder="Ex.: Sertralina 50 mg comp."></div>
        <div><label>Unidade</label><input id="itUnid" placeholder="comp., amp., frasco…"></div></div></div>
    <div class="ff"><label>Quantidade a cotar *</label><input id="itQtd" type="number" min="0" step="1" placeholder="Ex.: 30"></div>`;
  abrirModal("Adicionar item à cotação", corpo, async () => {
    const tipo = fv("itTipo"); const qtd = fvNum("itQtd");
    if (qtd == null || qtd < 0) throw new Error("Informe a quantidade a cotar.");
    let descricao, unidade, substancia_id = null;
    if (tipo === "sub") {
      const s = substances.find((x) => x.id === fv("itSub"));
      if (!s) throw new Error("Selecione a substância.");
      substancia_id = s.id; descricao = s.nome; unidade = s.unidade;
    } else {
      descricao = fv("itDesc"); unidade = fvOrNull("itUnid");
      if (!descricao) throw new Error("Informe a descrição do item.");
    }
    const ordem = (cotacoes.find((c) => c.id === _cotAberta)?.itens.length) || 0;
    const { error } = await window.SB.from("cotacao_itens").insert({ cotacao_id: _cotAberta, substancia_id, descricao, unidade, quantidade: qtd, ordem });
    if (error) throw error;
  }, "Adicionar item");
}
function _toggleItemCot() {
  document.getElementById("itBlocoSub").style.display = fv("itTipo") === "sub" ? "block" : "none";
  document.getElementById("itBlocoLivre").style.display = fv("itTipo") === "livre" ? "block" : "none";
}
async function adicionarTodasSubstancias() {
  const cot = cotacoes.find((c) => c.id === _cotAberta);
  const jaTem = new Set(cot.itens.map((i) => i.substanciaId).filter(Boolean));
  // só entram itens da padronização — medicação de paciente não é cotada
  const novas = subsPadronizadas().filter((s) => !jaTem.has(s.id))
    .sort((a, b) => (catOrdem(a.categoria) - catOrdem(b.categoria)) || a.nome.localeCompare(b.nome, "pt-BR"));
  if (!novas.length) { alert("Todos os itens da padronização já estão na cotação."); return; }
  if (!confirm(`Adicionar ${novas.length} item(ns) da padronização?\n\nA quantidade vem sugerida (injetáveis 10, líquidos 2, demais 1 caixa) e pode ser ajustada depois.`)) return;
  const base = cot.itens.length;
  const { error } = await window.SB.from("cotacao_itens").insert(novas.map((s, i) => ({ cotacao_id: _cotAberta, substancia_id: s.id, descricao: s.nome, unidade: s.unidade, quantidade: _cotQtdSugerida(s), ordem: base + i })));
  if (error) { alert("Erro: " + error.message); return; }
  await recarregarTela();
}
async function removerItemCotacao(id) {
  if (!confirm("Remover este item da cotação?")) return;
  const { error } = await window.SB.from("cotacao_itens").delete().eq("id", id);
  if (error) { alert("Erro: " + error.message); return; }
  await recarregarTela();
}
function abrirCotacao(id) { _cotAberta = id; _cotView = "itens"; document.getElementById("viewport").innerHTML = renderPage(); }
function voltarLista() { _cotAberta = null; document.getElementById("viewport").innerHTML = renderPage(); }
function mudarView(v) { _cotView = v; document.getElementById("viewport").innerHTML = renderPage(); }

function imprimirCotacao(id) {
  const cot = cotacoes.find((c) => c.id === id); if (!cot) return;
  const est = window.ESTAB || {}, rt = window.RT || {};
  const rtTxt = rt.nome ? `${rt.nome} — ${rt.conselho}-${rt.uf} ${rt.numero_registro}` : "";
  // agrupa os itens por categoria (categorias e itens em ordem alfabética)
  const porCat = {};
  cot.itens.forEach((it) => {
    const sub = it.substanciaId ? subById(it.substanciaId) : null;
    const cat = sub ? sub.categoria : "NAO CLASSIFICADO";
    (porCat[cat] = porCat[cat] || []).push({ it, sub });
  });
  let n = 0;
  const linhas = categoriasAlfabeticas().filter((c) => porCat[c] && porCat[c].length).map((c) => {
    const rs = porCat[c].sort((a, b) => (a.it.descricao || "").localeCompare(b.it.descricao || "", "pt-BR"));
    const ctrl = rs.some((r) => r.sub && r.sub.lista && r.sub.lista !== "—");
    return `<tr class="cat"><td colspan="7">${catRotulo(c)} <span class="qt">(${rs.length} ${rs.length === 1 ? "item" : "itens"})</span>${ctrl ? ' <span class="ctrl">contém itens sob controle especial — Portaria 344/98</span>' : ""}</td></tr>` +
      rs.map((r) => {
        n++;
        const tag = r.sub && r.sub.lista && r.sub.lista !== "—" ? ` <span class="lista">${r.sub.lista}</span>` : "";
        return `<tr><td class="num">${n}</td><td>${(r.it.descricao||"").replace(/</g,"&lt;")}${tag}</td><td class="c">${r.it.unidade||""}</td><td class="c mono">${r.it.quantidade||""}</td><td></td><td></td><td></td></tr>`;
      }).join("");
  }).join("");
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Cotação ${cot.identificador||""}</title>
  <style>@page{size:A4 portrait;margin:14mm 12mm}*{box-sizing:border-box}body{font-family:"Public Sans",Arial,sans-serif;color:#1E2A28;font-size:11px;margin:0}
  .estab{border-bottom:2px solid #2C5F5A;padding-bottom:6px;margin-bottom:8px}.estab .n{font-size:14px;font-weight:700}.estab .s{font-size:10px;color:#4a544f}
  tr.cat td{background:#1E2A28;color:#fff;font-size:9px;text-transform:uppercase;letter-spacing:.05em;font-weight:700;padding:3px 6px}
  tr.cat .ctrl{font-weight:400;text-transform:none;letter-spacing:0;color:#F0C674;font-size:8.5px;margin-left:8px}
  tr.cat .qt{font-weight:400;text-transform:none;letter-spacing:0;color:#9FB5B0;font-size:8.5px}
  tr.sub td{background:#F4F6F3;font-weight:700;font-size:10px}
  .lista{background:#E7F0E3;color:#2C5F5A;font-size:8px;font-weight:700;padding:1px 4px;border-radius:3px;margin-left:4px}
  h1{font-size:14px;margin:8px 0 2px}.sub{font-size:10.5px;color:#6a736e;margin-bottom:8px}
  .instr{background:#EEF2EC;border:1px solid #cfd6cf;border-radius:6px;padding:7px 9px;font-size:10.5px;margin-bottom:8px}
  table{width:100%;border-collapse:collapse}th,td{border:1px solid #cfd6cf;padding:4px 6px;font-size:10.5px}
  th{background:#EEF2EC;text-transform:uppercase;font-size:9px}td.c,th.c{text-align:center}td.num,th.num{text-align:center;width:26px}.mono{font-family:"IBM Plex Mono",monospace}.fill{background:#FCFBF6}.foot{margin-top:16px;font-size:10.5px}
  .btn{position:fixed;top:12px;right:12px;background:#2C5F5A;color:#fff;border:none;padding:9px 15px;border-radius:8px;cursor:pointer;font:inherit}@media print{.btn{display:none}}</style></head><body>
  <button class="btn" onclick="window.print()">Imprimir / Salvar PDF</button>
  <div class="estab"><div class="n">${est.razao_social||est.nome_fantasia||"Hospital Reviva"}</div><div class="s">${est.cnpj?"CNPJ: "+est.cnpj+" · ":""}${est.endereco||""}${est.municipio_uf?" — "+est.municipio_uf:""}</div></div>
  <h1>Solicitação de Cotação${cot.identificador?" — "+cot.identificador:""}</h1><div class="sub">Data: ${fmtDate(cot.data)}${cot.observacao?" · "+cot.observacao:""}</div>
  <div class="instr"><b>Prezado fornecedor:</b> favor preencher, por item, a <b>embalagem (unid. por caixa)</b>, o <b>preço por caixa</b> e a <b>validade</b>. Indicar "—" nos indisponíveis.</div>
  <table><thead><tr><th class="num">#</th><th>Descrição</th><th class="c">Unid.</th><th class="c">Qtde.</th><th class="c fill">Unid./caixa</th><th class="c fill">Preço/caixa</th><th class="c fill">Validade</th></tr></thead><tbody>${linhas||'<tr><td colspan="7" class="c">Sem itens.</td></tr>'}</tbody></table>
  <div class="foot">Fornecedor: ____________________  ·  Vendedor: ________________  ·  Data: ___/___/____<br><br>Responsável Técnico (solicitante): ${rtTxt||"____________________"}</div>
  </body></html>`;
  const win = window.open("", "_blank"); if (!win) { alert("Permita pop-ups."); return; }
  win.document.open(); win.document.write(html); win.document.close();
}

/* ============================ FASE B ============================ */
function _precoUnit(p) { return (p && p.disponivel && p.precoCaixa != null && p.unidPorCaixa) ? p.precoCaixa / p.unidPorCaixa : null; }
// opções de substância para a cotação: só padronizadas, agrupadas por categoria
// quantidade inicial sugerida, conforme a apresentação
function _cotQtdSugerida(s) {
  const u = (s.unidade || "").toLowerCase();
  if (u.indexOf("ampola") === 0 || u.indexOf("frasco-ampola") === 0) return 10;
  if (u.indexOf("frasco") === 0) return 2;
  return 1;
}

function _optSubsPadronizadas(sel) {
  const cats = {};
  subsPadronizadas().forEach((s) => { (cats[s.categoria] = cats[s.categoria] || []).push(s); });
  return categoriasAlfabeticas().filter((c) => cats[c] && cats[c].length).map((c) =>
    `<optgroup label="${catRotulo(c)}">` +
    cats[c].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
      .map((s) => `<option value="${s.id}"${s.id === sel ? " selected" : ""}>${s.nome}${s.lista && s.lista !== "—" ? " [" + s.lista + "]" : ""}</option>`).join("") +
    `</optgroup>`).join("");
}

function _fornNome(id) { const f = fornecedores.find((x) => x.id === id); return f ? f.nome : "—"; }

// tag visual de habilitação + desempenho ao lado do nome do fornecedor
function _fornTag(f) {
  if (!f) return "";
  let t = "";
  if (!fornHabilitado(f)) t += ' <span class="tag" style="background:#F7E3E1;color:#B04A3F" title="Documentação incompleta ou vencida">⚠ não habilitado</span>';
  const d = fornDesempenho(f);
  if (d === "bom") t += ' <span class="tag" style="background:#E7F0E3;color:#2C5F5A">🟢 bom</span>';
  else if (d === "regular") t += ' <span class="tag" style="background:#FBF3E3;color:#B07A2F">🟡 regular</span>';
  else if (d === "ruim") t += ' <span class="tag" style="background:#F7E3E1;color:#B04A3F">🔴 atenção</span>';
  return t;
}

function abrirQualificacaoForn(id) {
  const f = fornById(id); if (!f) return;
  const chk = (cid, lab, on) => `<label style="display:flex;align-items:center;gap:8px;font-size:13.5px;margin:4px 0"><input type="checkbox" id="${cid}"${on ? " checked" : ""}> ${lab}</label>`;
  const optAval = (cid, val) => `<select id="${cid}" style="width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:8px;font:inherit">
    <option value=""${!val ? " selected" : ""}>— não avaliado —</option>
    <option value="bom"${val === "bom" ? " selected" : ""}>Bom</option>
    <option value="regular"${val === "regular" ? " selected" : ""}>Regular</option>
    <option value="ruim"${val === "ruim" ? " selected" : ""}>Ruim</option></select>`;
  const optSit = (v) => `<option value="${v}"${f.situacao === v ? " selected" : ""}>`;
  const corpo = `
    <div class="item-head">Contato comercial</div>
    <div class="ff row2">
      <div><label>Representante</label><input id="qRep" value="${(f.contato || "").replace(/"/g, "&quot;")}"></div>
      <div><label>WhatsApp (só números, com DDI)</label><input id="qZap" value="${(f.whatsapp || "").replace(/"/g, "&quot;")}" placeholder="5562999999999"></div>
    </div>
    <div class="ff row2">
      <div><label>Telefone fixo</label><input id="qTel" value="${(f.telefone || "").replace(/"/g, "&quot;")}"></div>
      <div><label>E-mail</label><input id="qMail" class="no-upper" value="${(f.email || "").replace(/"/g, "&quot;")}"></div>
    </div>

    <div class="item-head">Situação</div>
    <div class="ff"><label>Situação cadastral</label>
      <select id="qSit">${optSit("ativo")}Ativo</option>${optSit("em_qualificacao")}Em qualificação</option>${optSit("inativo")}Inativo</option></select></div>

    <div class="item-head">Habilitação — documentos recebidos e vigentes</div>
    ${chk("qAfe", "Autorização de Funcionamento (AFE/ANVISA)", f.docAfe)}
    ${chk("qLic", "Licença / Alvará Sanitário", f.docLicenca)}
    ${chk("qCert", "Certidões de regularidade", f.docCertidoes)}
    ${chk("qTab", "Tabela de preços / condições comerciais", f.docTabela)}
    <div class="ff" style="margin-top:8px"><label>Vencimento do documento mais crítico (ex.: licença)</label><input id="qVal" type="date" value="${f.docValidade || ""}"></div>

    <div class="item-head">Desempenho</div>
    <div class="ff row2"><div><label>Cumprimento do prazo de entrega</label>${optAval("qPrazo", f.avalPrazo)}</div>
      <div><label>Tempo de resposta (cotação/e-mail)</label>${optAval("qResp", f.avalResposta)}</div></div>
    <div class="ff"><label>Atendimento / qualidade</label>${optAval("qAtend", f.avalAtendimento)}</div>
    <div class="ff"><label>Observação</label><input id="qObs" value="${(f.avalObs || "").replace(/"/g, "&quot;")}" placeholder="Ex.: atrasou última entrega; ótimo preço em injetáveis"></div>
  `;
  abrirModal(`Qualificação — ${f.nome}`, corpo, async () => {
    const dados = {
      contato: fvOrNull("qRep"), whatsapp: (fv("qZap") || "").replace(/\D/g, "") || null,
      telefone: fvOrNull("qTel"), email: (fv("qMail") || "").toLowerCase() || null,
      situacao: fv("qSit"),
      doc_afe: document.getElementById("qAfe").checked,
      doc_licenca: document.getElementById("qLic").checked,
      doc_certidoes: document.getElementById("qCert").checked,
      doc_tabela: document.getElementById("qTab").checked,
      doc_validade: fvOrNull("qVal"),
      aval_prazo: fvOrNull("qPrazo"), aval_resposta: fvOrNull("qResp"), aval_atendimento: fvOrNull("qAtend"),
      aval_obs: fvOrNull("qObs"),
      aval_data: (fv("qPrazo") || fv("qResp") || fv("qAtend")) ? new Date().toISOString().slice(0, 10) : null,
    };
    const { error } = await window.SB.from("fornecedores").update(dados).eq("id", id);
    if (error) throw error;
  }, "Salvar qualificação");
}
function _melhor(item) {
  let best = null;
  (item.precos || []).forEach((p) => { const u = _precoUnit(p); if (u != null && (best == null || u < best.unit)) best = { fornecedorId: p.fornecedorId, unit: u, p }; });
  return best;
}
function _fornDaCotacao(cot) {
  const ids = new Set();
  cot.itens.forEach((it) => (it.precos || []).forEach((p) => ids.add(p.fornecedorId)));
  return fornecedores.filter((f) => ids.has(f.id));
}

/* Cadastro e EDIÇÃO do fornecedor.
   O nome pode ser corrigido a qualquer momento — erro de digitação não deve
   ficar permanente, e empresa muda de razão social. Quando já existe
   histórico, o sistema avisa o que será afetado e guarda automaticamente o
   nome anterior nas observações, preservando a rastreabilidade. */
function abrirFormFornecedor(id) {
  const f = id ? fornById(id) : null;
  const v = id ? fornVinculos(id) : { nfs: 0, precos: 0, total: 0 };
  const optTipo = (val) => ["", "drogaria", "distribuidora", "industria"]
    .map((t) => `<option value="${t}"${(f && f.tipo) === t || (!f && !t) ? " selected" : ""}>${t || "—"}</option>`).join("");
  const aviso = v.total ? `
    <div class="note-box" style="background:#FBF3E3;border-color:#e8d9b0">
      <b>Este fornecedor já tem histórico</b>${v.nfs ? ` — ${v.nfs} nota(s) fiscal(is)` : ""}${v.nfs && v.precos ? " e" : ""}${v.precos ? ` ${v.precos} preço(s) cotado(s)` : ""}.
      Alterar o nome muda como ele aparece <b>também nos registros antigos</b> (Livro, notas, pedidos).
      Faça isso apenas para <b>corrigir digitação</b> ou registrar <b>mudança de razão social</b> — o nome anterior fica guardado nas observações.
    </div>` : "";
  abrirModal(id ? "Editar fornecedor" : "Novo fornecedor", `
    ${aviso}
    <div class="ff"><label>Nome / razão social *</label><input id="nfoNome" value="${((f && f.nome) || "").replace(/"/g, "&quot;")}" placeholder="Razão social"></div>
    <div class="ff row2">
      <div><label>CNPJ</label><input id="nfoCnpj" value="${((f && f.cnpj) || "").replace(/"/g, "&quot;")}"></div>
      <div><label>Tipo</label><select id="nfoTipo">${optTipo()}</select></div>
    </div>
    <div class="ff"><label>Endereço</label><input id="nfoEnd" value="${((f && f.endereco) || "").replace(/"/g, "&quot;")}"></div>
    <div class="ff row2">
      <div><label>Representante</label><input id="nfoRep" value="${((f && f.contato) || "").replace(/"/g, "&quot;")}"></div>
      <div><label>WhatsApp (só números)</label><input id="nfoZap" value="${((f && f.whatsapp) || "").replace(/"/g, "&quot;")}" placeholder="5562999999999"></div>
    </div>
    <div class="ff row2">
      <div><label>Telefone fixo</label><input id="nfoTel" value="${((f && f.telefone) || "").replace(/"/g, "&quot;")}"></div>
      <div><label>E-mail</label><input id="nfoMail" class="no-upper" value="${((f && f.email) || "").replace(/"/g, "&quot;")}"></div>
    </div>`, async () => {
    const nome = fv("nfoNome"); if (!nome) throw new Error("Informe o nome.");
    const dados = {
      nome, cnpj: fvOrNull("nfoCnpj"), tipo: fvOrNull("nfoTipo"), endereco: fvOrNull("nfoEnd"),
      contato: fvOrNull("nfoRep"), whatsapp: (fv("nfoZap") || "").replace(/\D/g, "") || null,
      telefone: fvOrNull("nfoTel"), email: (fv("nfoMail") || "").toLowerCase() || null,
    };
    if (id) {
      // registra o nome anterior quando houver histórico e o nome mudar
      if (v.total && f.nome && f.nome !== nome) {
        const marca = `Nome anterior: ${f.nome} (alterado em ${new Date().toLocaleDateString("pt-BR")})`;
        dados.aval_obs = f.avalObs ? `${f.avalObs} · ${marca}` : marca;
      }
      const { error } = await window.SB.from("fornecedores").update(dados).eq("id", id);
      if (error) throw error;
    } else {
      const { error } = await window.SB.from("fornecedores").insert(dados);
      if (error) throw error;
    }
  }, id ? "Salvar alterações" : "Cadastrar fornecedor");
}
// mantém o nome antigo funcionando
function abrirNovoFornecedor() { abrirFormFornecedor(); }

async function salvarPrecosFornecedor() {
  const cot = cotacoes.find((c) => c.id === _cotAberta);
  const forn = _fornSel;
  if (!forn) { alert("Selecione um fornecedor."); return; }
  const rows = [];
  cot.itens.forEach((it) => {
    const upc = document.getElementById("p-upc-" + it.id);
    const pre = document.getElementById("p-pre-" + it.id);
    const val = document.getElementById("p-val-" + it.id);
    const ind = document.getElementById("p-ind-" + it.id);
    if (ind && ind.checked) { rows.push({ cotacao_item_id: it.id, fornecedor_id: forn, disponivel: false }); return; }
    const preco = pre && pre.value !== "" ? Number(pre.value) : null;
    if (preco == null) return; // sem preço e não indisponível -> não cotou este item
    rows.push({ cotacao_item_id: it.id, fornecedor_id: forn, disponivel: true,
      unid_por_caixa: upc && upc.value !== "" ? Number(upc.value) : null,
      preco_caixa: preco, validade: val && val.value ? val.value : null });
  });
  const btn = document.getElementById("btnSalvarPrecos"); if (btn) { btn.disabled = true; btn.textContent = "Salvando…"; }
  try {
    const itemIds = cot.itens.map((i) => i.id);
    // regrava a resposta deste fornecedor nesta cotação (delete + insert)
    const { error: ed } = await window.SB.from("cotacao_precos").delete().eq("fornecedor_id", forn).in("cotacao_item_id", itemIds);
    if (ed) throw ed;
    if (rows.length) { const { error: ei } = await window.SB.from("cotacao_precos").insert(rows); if (ei) throw ei; }
    await recarregarTela();
  } catch (e) { alert("Erro ao salvar: " + (e.message || e)); if (btn) { btn.disabled = false; btn.textContent = "Salvar preços deste fornecedor"; } }
}
function selecionarForn(id) { _fornSel = id; document.getElementById("viewport").innerHTML = renderPage(); }

// Monta os pedidos a partir da DECISÃO de cada item (ou da sugestão, quando
// ainda não decidido). Itens marcados como "não comprar" ficam de fora.
function _pedidos(cot) {
  const map = {};
  cot.itens.forEach((it) => {
    const d = _itemDecisao(it); if (!d || !d.caixas) return;
    (map[d.fornecedorId] = map[d.fornecedorId] || []).push(
      { it, p: d.p, unit: d.unit, caixas: d.caixas, subtotal: d.subtotal, origem: d.origem });
  });
  return map;
}
// itens deixados de fora do pedido por decisão do RT
function _itensNaoComprar(cot) { return cot.itens.filter((it) => it.decisaoStatus === "nao_comprar"); }
function imprimirPedidos(id) {
  const cot = cotacoes.find((c) => c.id === id); if (!cot) return;
  const est = window.ESTAB || {}, rt = window.RT || {};
  const rtTxt = rt.nome ? `${rt.nome} — ${rt.conselho}-${rt.uf} ${rt.numero_registro}` : "";
  const brl = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const map = _pedidos(cot);
  const fids = Object.keys(map);
  if (!fids.length) { alert("Ainda não há preços lançados para gerar pedidos."); return; }
  const paginas = fids.map((fid) => {
    // agrupa as linhas do pedido por categoria da substância
    const porCat = {};
    map[fid].forEach((r) => {
      const sub = r.it.substanciaId ? subById(r.it.substanciaId) : null;
      const cat = sub ? sub.categoria : "NAO CLASSIFICADO";
      (porCat[cat] = porCat[cat] || []).push(r);
    });
    let n = 0;
    const linhas = categoriasAlfabeticas().filter((c) => porCat[c] && porCat[c].length).map((c) => {
      const rs = porCat[c].sort((a, b) => (a.it.descricao || "").localeCompare(b.it.descricao || "", "pt-BR"));
      const sub = rs.reduce((a, r) => a + r.subtotal, 0);
      const ctrl = rs.some((r) => { const x = r.it.substanciaId ? subById(r.it.substanciaId) : null; return x && x.lista && x.lista !== "—"; });
      return `<tr class="cat"><td colspan="8">${catRotulo(c)}${ctrl ? ' <span class="ctrl">contém itens sob controle especial — Portaria 344/98</span>' : ""}</td></tr>` +
        rs.map((r) => {
          n++;
          const x = r.it.substanciaId ? subById(r.it.substanciaId) : null;
          const tag = x && x.lista && x.lista !== "—" ? ` <span class="lista">${x.lista}</span>` : "";
          return `<tr><td class="num">${n}</td><td>${(r.it.descricao||"").replace(/</g,"&lt;")}${tag}</td><td class="c">${r.it.unidade||""}</td><td class="c mono">${r.it.quantidade||0}</td><td class="c mono">${r.p.unidPorCaixa||"—"}</td><td class="c mono">${r.caixas}</td><td class="r mono">${brl(r.p.precoCaixa||0)}</td><td class="r mono">${brl(r.subtotal)}</td></tr>`;
        }).join("") +
        (rs.length > 1 ? `<tr class="sub"><td colspan="7" class="r">Subtotal — ${catRotulo(c)}</td><td class="r mono">${brl(sub)}</td></tr>` : "");
    }).join("");
    const total = map[fid].reduce((a, r) => a + r.subtotal, 0);
    return `<section class="ped"><div class="estab"><div class="n">${est.razao_social||est.nome_fantasia||"Hospital Reviva"}</div><div class="s">${est.cnpj?"CNPJ: "+est.cnpj+" · ":""}${est.municipio_uf||""}</div></div>
      <h1>Pedido de Compra${cot.identificador?" — "+cot.identificador:""}</h1>
      <div class="sub">Fornecedor: <b>${_fornNome(fid)}</b> · Data: ${new Date().toLocaleDateString("pt-BR")}</div>
      <table><thead><tr><th class="num">#</th><th>Descrição</th><th class="c">Unid.</th><th class="c">Qtde.</th><th class="c">Un/cx</th><th class="c">Caixas</th><th class="r">Preço/cx</th><th class="r">Subtotal</th></tr></thead><tbody>${linhas}</tbody>
      <tfoot><tr><td colspan="7" class="r"><b>Total do pedido</b></td><td class="r mono"><b>${brl(total)}</b></td></tr></tfoot></table>
      <div class="foot">Responsável Técnico: ${rtTxt||"____________________"}  ·  Assinatura: __________________________</div></section>`;
  }).join("");
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Pedidos — ${cot.identificador||""}</title>
  <style>@page{size:A4 portrait;margin:14mm 12mm}*{box-sizing:border-box}body{font-family:"Public Sans",Arial,sans-serif;color:#1E2A28;font-size:11px;margin:0}
  .ped{page-break-after:always}.ped:last-child{page-break-after:auto}
  .estab{border-bottom:2px solid #2C5F5A;padding-bottom:6px;margin-bottom:8px}.estab .n{font-size:14px;font-weight:700}.estab .s{font-size:10px;color:#4a544f}
  h1{font-size:14px;margin:8px 0 2px}.sub{font-size:10.5px;color:#6a736e;margin-bottom:8px}
  table{width:100%;border-collapse:collapse}th,td{border:1px solid #cfd6cf;padding:4px 6px;font-size:10.5px}th{background:#EEF2EC;text-transform:uppercase;font-size:9px}
  td.c,th.c{text-align:center}td.r,th.r{text-align:right}td.num,th.num{text-align:center;width:24px}.mono{font-family:"IBM Plex Mono",monospace}.foot{margin-top:14px;font-size:10.5px}
  .btn{position:fixed;top:12px;right:12px;background:#2C5F5A;color:#fff;border:none;padding:9px 15px;border-radius:8px;cursor:pointer;font:inherit}@media print{.btn{display:none}}</style></head><body>
  <button class="btn" onclick="window.print()">Imprimir / Salvar PDF</button>${paginas}</body></html>`;
  const win = window.open("", "_blank"); if (!win) { alert("Permita pop-ups."); return; }
  win.document.open(); win.document.write(html); win.document.close();
}

/* ============================ VIEWS ============================ */
function _subnav() {
  const b = (v, t) => `<button class="btn ${_cotView===v?'':'ghost'} sm" onclick="mudarView('${v}')">${t}</button>`;
  return `<div class="toolbar" style="margin-bottom:14px">
    <button class="btn ghost sm" onclick="voltarLista()">← Voltar</button>
    ${b('itens','Itens')} ${b('precos','Lançar preços')} ${b('comp','Comparativo & Pedidos')}
  </div>`;
}

function _viewItens(cot) {
  return `
    <div class="panel">
      <div class="panel-head">
        <div><div class="panel-title">${cot.identificador||"Cotação"} · itens</div><div class="panel-title-sub">${fmtDate(cot.data)}${cot.observacao?" · "+cot.observacao:""} · ${cot.itens.length} item(ns)</div></div>
        <div class="toolbar">
          ${substances.length ? '<button class="btn ghost sm" onclick="adicionarTodasSubstancias()">+ Todas as substâncias</button>' : ''}
          <button class="btn ghost sm" onclick="abrirFormItemCotacao()">+ Item</button>
          <button class="btn ghost sm" onclick="imprimirRelatorioCotacao('${cot.id}')">🖶 Relatório de justificativa</button>
          <button class="btn ghost sm" onclick="abrirImportarPrecos('${cot.id}')">⬆ Importar preços</button>
          <button class="btn ghost sm" onclick="exportarCotacaoExcel('${cot.id}')">⬇ Exportar Excel</button>
          <button class="btn sm" onclick="imprimirCotacao('${cot.id}')">🖶 Imprimir solicitação</button>
        </div>
      </div>
      <div class="panel-body">
        ${cot.itens.length ? (() => {
          // agrupa por categoria (categorias e itens em ordem alfabética), como no impresso
          const porCat = {};
          cot.itens.forEach((it) => {
            const sub = it.substanciaId ? subById(it.substanciaId) : null;
            (porCat[sub ? sub.categoria : "NAO CLASSIFICADO"] ||= []).push({ it, sub });
          });
          let n = 0;
          const corpo = categoriasAlfabeticas().filter((c) => porCat[c] && porCat[c].length).map((c) => {
            const rs = porCat[c].sort((a, b) => (a.it.descricao || "").localeCompare(b.it.descricao || "", "pt-BR"));
            return `<tr><td colspan="6" style="background:var(--primary-tint);color:var(--primary-dark);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;padding:5px 8px">${catRotulo(c)} <span style="font-weight:400;opacity:.7">(${rs.length})</span></td></tr>` +
              rs.map((r) => { n++; const lt = r.sub && r.sub.lista && r.sub.lista !== "—" ? ` <span class="tag ${listaTagClass(r.sub.lista)}">${r.sub.lista}</span>` : "";
                return `<tr><td class="num mono">${n}</td><td><b>${r.it.descricao}</b>${lt}</td><td class="mono">${r.it.unidade||"—"}</td><td class="num mono">${r.it.quantidade||"—"}</td>
                <td>${r.it.substanciaId?'<span class="tag">cadastrada</span>':'<span class="tag" style="background:var(--accent-tint);color:var(--accent)">livre</span>'}</td>
                <td style="text-align:right"><button class="btn ghost sm" onclick="removerItemCotacao('${r.it.id}')">Remover</button></td></tr>`; }).join("");
          }).join("");
          return `<table><thead><tr><th>#</th><th>Descrição</th><th>Unid.</th><th>Qtde.</th><th>Origem</th><th></th></tr></thead><tbody>${corpo}</tbody></table>`;
        })() : `<div style="color:var(--muted);font-size:13px;padding:8px 0">Cotação sem itens. Use <b>+ Item</b>.</div>`}
      </div>
    </div>`;
}

function _viewPrecos(cot) {
  const optForn = `<option value="">— selecione o fornecedor —</option>` + fornecedores.filter(fornAtivo).map((f)=>`<option value="${f.id}"${f.id===_fornSel?' selected':''}>${f.nome}${fornHabilitado(f)?'':' (não habilitado)'}</option>`).join('');
  const fSel = _fornSel ? fornById(_fornSel) : null;
  const sel = _fornSel;
  const precosDoForn = {};
  if (sel) cot.itens.forEach((it)=>{ const p=(it.precos||[]).find((x)=>x.fornecedorId===sel); if(p) precosDoForn[it.id]=p; });
  return `
    <div class="panel">
      <div class="panel-head">
        <div><div class="panel-title">Lançar preços</div><div class="panel-title-sub">Escolha o fornecedor e registre a resposta da cotação dele</div></div>
        <div class="toolbar">
          <select onchange="selecionarForn(this.value)" style="padding:8px 10px;border:1px solid var(--line);border-radius:8px;font:inherit">${optForn}</select>
          ${_fornSel ? `<button class="btn ghost sm" onclick="abrirQualificacaoForn('${_fornSel}')">Qualificação</button>` : ''}
          <button class="btn ghost sm" onclick="abrirNovoFornecedor()">+ Novo fornecedor</button>
        </div>
      </div>
      <div class="panel-body">
        ${fSel && !fornHabilitado(fSel) ? `<div class="note-box" style="background:#F7E3E1;border-color:#e6b8b1;margin-top:0">⚠ <b>${fSel.nome}</b> está com documentação incompleta ou vencida (${fornDocsPendentes(fSel).join(", ")}). Você pode cotar normalmente; regularize antes de fechar a compra. Ajuste em <b>Qualificação</b>.</div>` : ''}
        ${!fornecedores.length ? `<div class="note-box">Nenhum fornecedor cadastrado. Clique em <b>+ Novo fornecedor</b> para começar.</div>` :
          !sel ? `<div style="color:var(--muted);font-size:13px;padding:8px 0">Selecione um fornecedor acima para lançar os preços dele.</div>` : `
          <table>
            <thead><tr><th>Descrição</th><th>Qtde.</th><th>Unid./caixa</th><th>Preço/caixa (R$)</th><th>Validade</th><th>Indisp.</th></tr></thead>
            <tbody>
              ${cot.itens.map((it)=>{ const p=precosDoForn[it.id]; return `<tr>
                <td><b>${it.descricao}</b> <span style="color:var(--muted)">${it.unidade||''}</span></td>
                <td class="num mono">${it.quantidade||0}</td>
                <td><input id="p-upc-${it.id}" type="number" min="1" step="1" style="width:80px" value="${p&&p.unidPorCaixa!=null?p.unidPorCaixa:''}"></td>
                <td><input id="p-pre-${it.id}" type="number" min="0" step="0.01" style="width:100px" value="${p&&p.precoCaixa!=null?p.precoCaixa:''}"></td>
                <td><input id="p-val-${it.id}" type="date" value="${p&&p.validade?p.validade:''}"></td>
                <td style="text-align:center"><input id="p-ind-${it.id}" type="checkbox" ${p&&p.disponivel===false?'checked':''}></td>
              </tr>`;}).join('')}
            </tbody>
          </table>
          <div style="margin-top:14px;text-align:right"><button class="btn" id="btnSalvarPrecos" onclick="salvarPrecosFornecedor()">Salvar preços deste fornecedor</button></div>
          <div class="note-box" style="margin-top:12px">Deixe em branco os itens que este fornecedor não cotou. Marque <b>Indisp.</b> quando ele informar que não tem o produto. O preço unitário para comparação = preço/caixa ÷ unid./caixa.</div>`}
      </div>
    </div>`;
}

function _viewComp(cot) {
  const forns = _fornDaCotacao(cot);
  const brl = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  if (!forns.length) return `<div class="note-box">Nenhum preço lançado ainda. Vá em <b>Lançar preços</b> e registre a resposta de pelo menos um fornecedor.</div>`;
  const head = `<th>Descrição</th>` + forns.map((f)=>`<th style="text-align:center">${f.nome}${_fornTag(f)}</th>`).join('') + `<th>Decisão</th>`;
  const body = cot.itens.map((it)=>{
    const best=_melhor(it);
    const necessario = Number(it.quantidade) || 0;
    const cells = forns.map((f)=>{
      const p=(it.precos||[]).find((x)=>x.fornecedorId===f.id);
      const u=_precoUnit(p);
      if (p && p.disponivel===false) return `<td style="text-align:center;color:var(--muted)">indisp.</td>`;
      if (u==null) return `<td style="text-align:center;color:var(--muted)">—</td>`;
      const win = best && best.fornecedorId===f.id;
      const escolhido = it.decisaoStatus === "escolhido" && it.decisaoFornecedorId === f.id;
      const caixas = p.unidPorCaixa ? Math.ceil(necessario / p.unidPorCaixa) : 0;
      const unidTotal = caixas * (p.unidPorCaixa || 0);
      const exc = Math.max(0, unidTotal - necessario);
      const excPct = necessario > 0 ? (exc / necessario) * 100 : 0;
      const fundo = escolhido ? "background:#D9EAD1;font-weight:700" : win ? "background:#E7F0E3" : "";
      return `<td style="text-align:center;${fundo}">
        <div class="mono" style="font-size:13px">${brl(u)}</div>
        <div class="mono" style="font-size:10.5px;color:var(--muted)">${p.unidPorCaixa || "—"} un/cx · ${brl(p.precoCaixa || 0)}</div>
        <div class="mono" style="font-size:10.5px;color:${excPct >= 100 ? "#B04A3F" : "var(--muted)"}">${caixas} cx = ${brl(caixas * (p.precoCaixa || 0))}${exc ? " · sobra " + exc : ""}</div>
        ${p.validade ? `<div class="mono" style="font-size:10px;color:var(--muted)">val. ${fmtDate(p.validade)}${_valTag(p.validade)}</div>` : ""}
      </td>`;
    }).join('');
    const d = _itemDecisao(it);
    const dec = `<div style="white-space:nowrap">${_decTag(it)}</div>
      ${d ? `<div style="font-size:11px;color:var(--muted);margin-top:2px">${_esc(_fornNome(d.fornecedorId))} · ${d.caixas} cx · ${brl(d.subtotal)}</div>` : ""}
      ${it.decisaoObs ? `<div style="font-size:10.5px;color:var(--muted);font-style:italic">${_esc(it.decisaoObs)}</div>` : ""}
      <button class="btn ghost sm" style="margin-top:4px" onclick="abrirDecisaoItem('${cot.id}','${it.id}')">Decidir</button>`;
    return `<tr><td><b>${it.descricao}</b><div style="font-size:11px;color:var(--muted)">precisa: ${necessario} ${_esc(it.unidade || "")}</div></td>${cells}<td>${dec}</td></tr>`;
  }).join('');
  const map=_pedidos(cot);
  const fora = _itensNaoComprar(cot);
  const semPreco = cot.itens.filter((it) => !(it.precos || []).some((p) => _precoUnit(p) != null));
  const resumo = Object.keys(map).map((fid)=>{
    const total=map[fid].reduce((a,r)=>a+r.subtotal,0);
    const f = fornById(fid);
    const alerta = f && !fornHabilitado(f) ? ' <span class="tag" style="background:#F7E3E1;color:#B04A3F">⚠ regularizar</span>' : '';
    return `<tr><td><b>${_fornNome(fid)}</b>${_fornTag(f)}${alerta}</td><td class="num mono">${map[fid].length}</td><td class="num mono">${brl(total)}</td></tr>`;
  }).join('');
  const totalGeral = Object.values(map).flat().reduce((a,r)=>a+r.subtotal,0);
  return `
    <div class="panel">
      <div class="panel-head"><div><div class="panel-title">Comparativo e decisão de compra</div><div class="panel-title-sub">Cada célula traz preço unitário, unidades por caixa, preço da caixa e o custo das caixas necessárias — o menor unitário fica destacado como sugestão</div></div></div>
      <div class="panel-body">
        <div class="note-box" style="margin-top:0">O <b>menor preço unitário</b> é um filtro inicial, não a decisão. Repare na linha <b>“cx = valor · sobra”</b>: embalagem grande e barata por unidade pode obrigar a comprar muito mais do que se vai consumir, com risco de vencer na farmácia. Use <b>Decidir</b> em cada item para escolher o fornecedor, a quantidade de caixas, ou marcar que não vale comprar agora.</div>
        <div style="overflow-x:auto"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>
      </div>
    </div>
    <div class="panel">
      <div class="panel-head">
        <div><div class="panel-title">Pedidos por fornecedor</div><div class="panel-title-sub">Monta-se pela decisão de cada item; onde ainda não há decisão, usa-se a sugestão de menor preço unitário</div></div>
        <button class="btn sm" onclick="imprimirPedidos('${cot.id}')">🖶 Imprimir pedidos</button>
      </div>
      <div class="panel-body">
        ${resumo ? `<table><thead><tr><th>Fornecedor</th><th>Itens</th><th>Total</th></tr></thead><tbody>${resumo}</tbody>
          <tfoot><tr><td style="text-align:right"><b>Total geral</b></td><td></td><td class="num mono"><b>${brl(totalGeral)}</b></td></tr></tfoot></table>`
          : `<div style="color:var(--muted);font-size:13px;padding:8px 0">Sem itens com preço válido ainda.</div>`}
        ${fora.length ? `<div class="note-box" style="margin-top:14px;background:#F1F3F1">
          <b>${fora.length} item(ns) fora deste pedido por decisão:</b>
          <div style="font-size:12.5px;margin-top:4px">${fora.map((it) => `${_esc(it.descricao)}${it.decisaoObs ? ` — <i>${_esc(it.decisaoObs)}</i>` : ""}`).join(" · ")}</div></div>` : ""}
        ${semPreco.length ? `<div class="note-box" style="margin-top:10px;background:#FBF3E3;border-color:#e8d9b0">
          <b>${semPreco.length} item(ns) sem preço em nenhuma proposta</b> — cobrar de outro fornecedor.</div>` : ""}
      </div>
    </div>`;
}

function _viewDetalhe(cot) {
  const inner = _cotView === "precos" ? _viewPrecos(cot) : _cotView === "comp" ? _viewComp(cot) : _viewItens(cot);
  return _subnav() + inner;
}

function _viewLista() {
  return `
    <div class="note-box">Monte a cotação com os itens e quantidades a comprar, imprima a solicitação para os fornecedores e, quando os preços voltarem, use <b>Lançar preços</b> — o sistema compara por preço unitário e gera o <b>pedido por fornecedor</b>. (Previsão por consumo entra quando houver histórico.)</div>
    <div class="panel">
      <div class="panel-head">
        <div><div class="panel-title">Cotações</div><div class="panel-title-sub">${cotacoes.length} cotação(ões)</div></div>
        <button class="btn sm" onclick="abrirNovaCotacao()">+ Nova cotação</button>
      </div>
      <div class="panel-body">
        ${cotacoes.length ? `<table><thead><tr><th>Identificador</th><th>Data</th><th>Itens</th><th>Status</th><th></th></tr></thead><tbody>
          ${cotacoes.map(c=>`<tr><td><b>${c.identificador||"—"}</b></td><td class="mono">${fmtDate(c.data)}</td><td class="num mono">${c.itens.length}</td><td><span class="tag">${c.status}</span></td>
          <td style="text-align:right"><button class="btn ghost sm" onclick="abrirCotacao('${c.id}')">Abrir</button> <button class="btn ghost sm" onclick="imprimirCotacao('${c.id}')">Imprimir</button></td></tr>`).join('')}
        </tbody></table>` : `<div style="color:var(--muted);font-size:13px;padding:8px 0">Nenhuma cotação. Crie a primeira com <b>+ Nova cotação</b>.</div>`}
      </div>
    </div>

    ${_painelFornecedores()}`;
}

/* Painel de fornecedores com contato direto — WhatsApp e e-mail clicáveis,
   para conduzir a campanha de cotação sem sair do sistema. */
function _painelFornecedores() {
  if (!fornecedores.length) return "";
  const todos = [...fornecedores].sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR"));
  const nInativos = todos.filter((f) => !fornAtivo(f)).length;
  const ordenados = _fornMostrarInativos ? todos : todos.filter(fornAtivo);
  const semContato = ordenados.filter((f) => !f.whatsapp && !f.telefone).length;
  const linhas = ordenados.map((f) => {
    const zap = f.whatsapp
      ? `<a href="https://wa.me/${f.whatsapp}" target="_blank" rel="noopener" style="color:var(--primary-dark);font-weight:600;text-decoration:none">💬 WhatsApp</a>`
      : (f.telefone ? `<span class="mono">${_esc(f.telefone)}</span>` : `<span style="color:var(--warn)">sem telefone</span>`);
    const mail = f.email
      ? `<a href="mailto:${_esc(f.email)}" style="color:var(--muted);text-decoration:none">${_esc(f.email)}</a>`
      : `<span style="color:var(--warn)">sem e-mail</span>`;
    const inativo = !fornAtivo(f);
    const v = fornVinculos(f.id);
    return `<tr${inativo ? ' style="opacity:.55"' : ""}>
      <td><b>${_esc(f.nome)}</b>${f.tipo === "industria" ? ' <span class="tag">indústria</span>' : ""}${inativo ? ' <span class="tag" style="background:#EEE;color:#6a736e">inativo</span>' : _fornTag(f)}
        ${v.total ? `<div style="font-size:11px;color:var(--muted)">${v.nfs ? v.nfs + " NF" : ""}${v.nfs && v.precos ? " · " : ""}${v.precos ? v.precos + " preço(s)" : ""}</div>` : ""}</td>
      <td>${_esc(f.contato || "—")}</td>
      <td>${zap}</td>
      <td style="font-size:12px">${mail}</td>
      <td style="text-align:right;white-space:nowrap">
        <button class="btn ghost sm" onclick="abrirFormFornecedor('${f.id}')">Editar</button>
        <button class="btn ghost sm" onclick="abrirQualificacaoForn('${f.id}')">Qualificação</button>
        <button class="btn ghost sm" onclick="inativarFornecedor('${f.id}')">${inativo ? "Reativar" : "Inativar"}</button>
        ${v.total ? "" : `<button class="btn ghost sm" onclick="excluirFornecedor('${f.id}')" title="Sem histórico — pode ser excluído">Excluir</button>`}
      </td>
    </tr>`;
  }).join("");
  return `
    <div class="panel">
      <div class="panel-head">
        <div><div class="panel-title">Fornecedores</div><div class="panel-title-sub">${ordenados.length} ${_fornMostrarInativos ? "no total" : "ativo(s)"}${nInativos ? ` · ${nInativos} inativo(s)` : ""}${semContato ? ` · ${semContato} sem telefone` : ""}</div></div>
        <div class="toolbar">
          ${nInativos ? `<button class="btn ghost sm" onclick="_fornToggleInativos()">${_fornMostrarInativos ? "Ocultar inativos" : "Mostrar inativos"}</button>` : ""}
          <button class="btn ghost sm" onclick="abrirNovoFornecedor()">+ Novo fornecedor</button>
        </div>
      </div>
      <div class="panel-body">
        <div class="note-box" style="margin-top:0">Clique em <b>WhatsApp</b> para abrir a conversa direto no aplicativo, ou no e-mail para escrever. Use <b>Qualificação</b> para registrar a documentação recebida. Empresa encerrada ou que não atende mais: <b>Inativar</b> — some das cotações e o histórico fica preservado. <b>Excluir</b> só aparece em fornecedor sem nenhuma compra ou cotação.</div>
        <table>
          <thead><tr><th>Fornecedor</th><th>Representante</th><th>WhatsApp</th><th>E-mail</th><th></th></tr></thead>
          <tbody>${linhas}</tbody>
        </table>
      </div>
    </div>`;
}

function renderPage() {
  const cot = _cotAberta ? cotacoes.find((c) => c.id === _cotAberta) : null;
  return cot ? _viewDetalhe(cot) : _viewLista();
}

/* ============================================================
   EXPORTAR COTAÇÃO PARA EXCEL (.xlsx)
   Planilha para enviar ao fornecedor preencher: itens da cotação
   ordenados por categoria e nome, com as colunas de resposta em
   branco (marca, embalagem, preços, validade, prazo).
   Usa SheetJS (CDN). Sem a biblioteca, cai para CSV.
   ============================================================ */
function exportarCotacaoExcel(cotId) {
  const cot = cotacoes.find((c) => c.id === cotId);
  if (!cot) { alert("Cotação não encontrada."); return; }
  if (!cot.itens.length) { alert("A cotação não tem itens."); return; }
  const est = window.ESTAB || {};

  // itens ordenados por categoria (alfabética) e depois por nome
  const linhas = cot.itens.map((it) => {
    const sub = it.substanciaId ? subById(it.substanciaId) : null;
    return { it, sub, cat: sub ? sub.categoria : "NAO CLASSIFICADO" };
  }).sort((a, b) => {
    const ca = catRotulo(a.cat), cb = catRotulo(b.cat);
    return ca.localeCompare(cb, "pt-BR") || (a.it.descricao || "").localeCompare(b.it.descricao || "", "pt-BR");
  });

  const cab = [
    "#", "Categoria", "Item", "Lista 344/98", "Unidade", "Qtde. solicitada",
    "Marca / Laboratório", "Unid. por caixa", "Preço por caixa (R$)",
    "Preço unitário (R$)", "Validade do produto", "Prazo de entrega", "Observação",
  ];
  const dados = linhas.map((r, i) => [
    i + 1,
    catRotulo(r.cat),
    r.it.descricao || "",
    r.sub && r.sub.lista && r.sub.lista !== "—" ? r.sub.lista : "",
    r.it.unidade || "",
    Number(r.it.quantidade) || 0,
    "", "", "", "", "", "", "",   // colunas a preencher pelo fornecedor
  ]);

  const nomeArq = `cotacao-${(cot.identificador || "reviva").replace(/[^\w-]+/g, "_")}.xlsx`;

  if (typeof XLSX === "undefined") { _cotCSV(cot, cab, dados); return; }

  // ---- cabeçalho institucional acima da tabela ----
  const topo = [
    [est.razao_social || est.nome_fantasia || "HOSPITAL REVIVA"],
    [[est.cnpj ? "CNPJ: " + est.cnpj : "", est.endereco || "", est.municipio_uf || ""].filter(Boolean).join(" · ")],
    [],
    ["SOLICITAÇÃO DE COTAÇÃO"],
    ["Identificador:", cot.identificador || "—", "", "Data:", cot.data ? fmtDate(cot.data) : "", "", "Itens:", dados.length],
    ["Preencher as colunas em branco (marca, embalagem, preços, validade e prazo) e devolver por e-mail."],
    ["Itens com a coluna \"Lista 344/98\" preenchida são medicamentos sob controle especial."],
    [],
  ];

  const aoa = topo.concat([cab]).concat(dados);
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const linCab = topo.length;                 // índice 0-based da linha de cabeçalho

  ws["!cols"] = [
    { wch: 5 }, { wch: 30 }, { wch: 42 }, { wch: 12 }, { wch: 10 }, { wch: 15 },
    { wch: 24 }, { wch: 14 }, { wch: 18 }, { wch: 17 }, { wch: 18 }, { wch: 16 }, { wch: 28 },
  ];
  ws["!freeze"] = { xSplit: 0, ySplit: linCab + 1 };
  ws["!autofilter"] = {
    ref: XLSX.utils.encode_range(
      { r: linCab, c: 0 },
      { r: linCab + dados.length, c: cab.length - 1 }),
  };
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 12 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 12 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 12 } },
    { s: { r: 5, c: 0 }, e: { r: 5, c: 12 } },
    { s: { r: 6, c: 0 }, e: { r: 6, c: 12 } },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Cotação");
  XLSX.writeFile(wb, nomeArq);
}

// alternativa sem a biblioteca: CSV que o Excel abre direto (BOM + ponto-e-vírgula)
function _cotCSV(cot, cab, dados) {
  const esc = (v) => {
    const t = String(v == null ? "" : v);
    return /[";\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
  };
  const txt = "\uFEFF" + [cab].concat(dados).map((l) => l.map(esc).join(";")).join("\r\n");
  const blob = new Blob([txt], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `cotacao-${(cot.identificador || "reviva").replace(/[^\w-]+/g, "_")}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  alert("A biblioteca de Excel não carregou (sem internet?). Baixamos em CSV, que o Excel abre normalmente.");
}

/* ============================================================
   Inativar / reativar / excluir fornecedor
   Regra: fornecedor com histórico (nota fiscal ou preço cotado)
   NÃO pode ser excluído — só inativado. Excluir apagaria a
   rastreabilidade de compras já realizadas, o que a escrituração
   de controlados não admite.
   ============================================================ */
let _fornMostrarInativos = false;
function _fornToggleInativos() {
  _fornMostrarInativos = !_fornMostrarInativos;
  document.getElementById("viewport").innerHTML = renderPage();
}

async function inativarFornecedor(id) {
  const f = fornById(id); if (!f) return;
  const inativo = f.situacao === "inativo";
  const msg = inativo
    ? `Reativar ${f.nome}?\n\nEle volta a aparecer nas cotações.`
    : `Inativar ${f.nome}?\n\nDeixa de aparecer nas cotações e no lançamento de preços.\nO histórico de compras é preservado e pode ser reativado a qualquer momento.`;
  if (!confirm(msg)) return;
  const { error } = await window.SB.from("fornecedores")
    .update({ situacao: inativo ? "ativo" : "inativo" }).eq("id", id);
  if (error) { alert("Erro: " + error.message); return; }
  await recarregarTela();
}

async function excluirFornecedor(id) {
  const f = fornById(id); if (!f) return;
  const v = fornVinculos(id);
  if (v.total > 0) {
    const partes = [];
    if (v.nfs) partes.push(`${v.nfs} nota(s) fiscal(is)`);
    if (v.precos) partes.push(`${v.precos} preço(s) cotado(s)`);
    alert(
      `${f.nome} não pode ser excluído.\n\n` +
      `Há histórico vinculado: ${partes.join(" e ")}.\n\n` +
      `Excluir apagaria a rastreabilidade dessas compras, o que a escrituração ` +
      `de controlados não permite. Use "Inativar" — ele sai das cotações e o ` +
      `histórico é preservado.`);
    return;
  }
  if (!confirm(
    `Excluir definitivamente ${f.nome}?\n\n` +
    `Ele não tem nenhuma compra ou cotação registrada, então pode ser removido ` +
    `sem perda de histórico.\n\nEsta ação não pode ser desfeita.`)) return;
  const { error } = await window.SB.from("fornecedores").delete().eq("id", id);
  if (error) { alert("Erro ao excluir: " + error.message); return; }
  await recarregarTela();
}

/* ============================================================
   IMPORTAR PREÇOS DE UMA PROPOSTA (colar CSV)
   Formato esperado, uma linha por item:
     ITEM;UNID_POR_CAIXA;PRECO_CAIXA[;INDISPONIVEL]
   O fornecedor é escolhido na tela. Antes de gravar, o sistema
   mostra o que casou e o que não casou — nada é aplicado no escuro.
   ============================================================ */
let _impDados = null;   // { linhas:[...], ok:[...], erro:[...] }

function abrirImportarPrecos(cotId) {
  const cot = cotacoes.find((c) => c.id === cotId);
  if (!cot) return;
  if (!cot.itens.length) { alert("A cotação não tem itens."); return; }
  _impDados = null;
  const optF = `<option value="">— selecione o fornecedor —</option>` +
    fornecedores.filter(fornAtivo).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
      .map((f) => `<option value="${f.id}">${f.nome}</option>`).join("");
  abrirModal("Importar preços de uma proposta", `
    <div class="ff"><label>Fornecedor *</label><select id="impForn">${optF}</select></div>
    <div class="ff"><label>Cole aqui as linhas da proposta <span style="font-weight:400;color:var(--muted)">— ITEM;UNID_POR_CAIXA;PRECO_CAIXA;VALIDADE</span></label>
      <textarea id="impTxt" rows="10" class="no-upper" style="width:100%;padding:9px 11px;border:1px solid var(--line);border-radius:8px;font:inherit;font-family:'IBM Plex Mono',monospace;font-size:12px;resize:vertical" placeholder="QUETIAPINA 25MG COMP.;500;60.71&#10;CLONAZEPAM 2MG COMP.;480;26.83&#10;OLANZAPINA 5MG COMP.;30;27.05"></textarea></div>
    <div style="display:flex;gap:10px;align-items:center;margin-bottom:6px">
      <button type="button" class="btn ghost sm" onclick="_impConferir('${cotId}')">Conferir antes de gravar</button>
      <span style="font-size:12px;color:var(--muted)">Separador: ponto-e-vírgula ou tabulação. A <b>validade</b> é opcional (31/05/2028, 2028-05-31 ou 05/2028) e pode vir junto de <b>INDISPONIVEL</b>.</span>
    </div>
    <div id="impPrev"></div>
  `, async () => {
    const fid = fv("impForn");
    if (!fid) throw new Error("Selecione o fornecedor.");
    if (!_impDados) _impConferir(cotId);
    if (!_impDados || !_impDados.ok.length) throw new Error("Nenhuma linha reconhecida. Use \"Conferir antes de gravar\" para ver o motivo.");
    // remove preços anteriores deste fornecedor nesta cotação e insere os novos
    const ids = _impDados.ok.map((l) => l.itemId);
    for (const itemId of ids) {
      await window.SB.from("cotacao_precos").delete().eq("cotacao_item_id", itemId).eq("fornecedor_id", fid);
    }
    const rows = _impDados.ok.map((l) => ({
      cotacao_item_id: l.itemId, fornecedor_id: fid, disponivel: l.disponivel,
      unid_por_caixa: l.unid, preco_caixa: l.preco, validade: l.validade || null,
    }));
    for (let i = 0; i < rows.length; i += 100) {
      const { error } = await window.SB.from("cotacao_precos").insert(rows.slice(i, i + 100));
      if (error) throw error;
    }
  }, "Gravar preços");
}

/* Converte número em pt-BR ou internacional:
   "60.71" → 60.71 · "26,83" → 26.83 · "1.239,53" → 1239.53 · "1,239.53" → 1239.53 */
function _impNum(txt) {
  let t = String(txt == null ? "" : txt).replace(/[^\d.,-]/g, "").trim();
  if (!t) return NaN;
  const temP = t.includes("."), temV = t.includes(",");
  if (temP && temV) {
    // o último separador que aparece é o decimal
    t = t.lastIndexOf(",") > t.lastIndexOf(".")
      ? t.replace(/\./g, "").replace(",", ".")
      : t.replace(/,/g, "");
  } else if (temV) {
    // vírgula única: decimal se houver 1 ou 2 casas depois; senão é milhar
    const d = t.split(",");
    t = (d.length === 2 && d[1].length <= 2) ? t.replace(",", ".") : t.replace(/,/g, "");
  }
  const n = parseFloat(t);
  return isNaN(n) ? NaN : n;
}

/* Reconhece a validade em vários formatos: 31/05/2028 · 2028-05-31 · 05/2028
   (mês/ano assume o último dia do mês, como é praxe em validade de lote). */
function _impData(txt) {
  const t = String(txt || "");
  let m = t.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${String(m[2]).padStart(2,"0")}-${String(m[3]).padStart(2,"0")}`;
  m = t.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${String(m[2]).padStart(2,"0")}-${String(m[1]).padStart(2,"0")}`;
  m = t.match(/(?:^|\s)(\d{1,2})\/(\d{4})(?:\s|$)/);
  if (m) { const ult = new Date(Number(m[2]), Number(m[1]), 0).getDate();
           return `${m[2]}-${String(m[1]).padStart(2,"0")}-${ult}`; }
  return null;
}

function _impConferir(cotId) {
  const cot = cotacoes.find((c) => c.id === cotId);
  const txt = (document.getElementById("impTxt") || {}).value || "";
  const idx = {};
  cot.itens.forEach((it) => { idx[(it.descricao || "").trim().toUpperCase()] = it.id; });

  const ok = [], erro = [];
  txt.split(/\r?\n/).forEach((linha, n) => {
    const l = linha.trim();
    if (!l) return;
    if (/^ITEM\s*[;,\t]/i.test(l)) return;                       // cabeçalho
    // separador: ponto-e-vírgula ou tabulação. Vírgula só quando não houver
    // nenhum dos dois (senão quebraria o decimal "26,83").
    const sep = /[;\t]/.test(l) ? /[;\t]/ : /,/;
    const partes = l.split(sep).map((x) => x.trim());
    const nome = (partes[0] || "").toUpperCase();
    const unid = _impNum(partes[1]);
    const preco = _impNum(partes[2]);
    // campos 4+ em qualquer ordem: data de validade e/ou marcação de indisponível
    const resto = partes.slice(3).join(" ");
    const indisp = /INDISPON|SEM ESTOQUE|\bN\/?A\b/i.test(resto);
    const validade = _impData(resto);
    if (!nome) { erro.push({ n: n + 1, l, m: "linha sem nome de item" }); return; }
    if (!idx[nome]) { erro.push({ n: n + 1, l, m: "item não existe nesta cotação (nome precisa ser idêntico)" }); return; }
    if (!(unid > 0)) { erro.push({ n: n + 1, l, m: "unidades por caixa inválida" }); return; }
    if (!(preco >= 0)) { erro.push({ n: n + 1, l, m: "preço inválido" }); return; }
    ok.push({ itemId: idx[nome], nome, unid, preco, disponivel: !indisp, validade });
  });
  _impDados = { ok, erro };

  const naoCotados = cot.itens.filter((it) => !ok.some((o) => o.itemId === it.id));
  const el = document.getElementById("impPrev");
  if (!el) return;
  el.innerHTML = `
    <div class="note-box" style="margin:10px 0 0;background:${erro.length ? "#FBF3E3" : "#E7F0E3"};border-color:${erro.length ? "#e8d9b0" : "#c9dcc2"}">
      <b>${ok.length}</b> linha(s) reconhecida(s)${erro.length ? ` · <b style="color:#B04A3F">${erro.length} com problema</b>` : ""} · ${naoCotados.length} item(ns) da cotação sem preço nesta proposta.
    </div>
    ${ok.length ? `<div style="max-height:180px;overflow:auto;margin-top:8px;border:1px solid var(--line);border-radius:8px">
      <table style="font-size:12px"><thead><tr><th>Item</th><th class="num">Unid./cx</th><th class="num">Preço cx</th><th class="num">Unitário</th><th>Validade</th></tr></thead>
      <tbody>${ok.map((o) => `<tr><td>${_esc(o.nome)}${o.disponivel ? "" : ' <span class="tag" style="background:#F1F3F1;color:#6a736e">indisp.</span>'}</td><td class="num mono">${o.unid}</td><td class="num mono">${brl(o.preco)}</td><td class="num mono">${brl(o.preco / o.unid)}</td><td class="mono">${o.validade ? fmtDate(o.validade) : "—"}</td></tr>`).join("")}</tbody></table></div>` : ""}
    ${erro.length ? `<div style="margin-top:8px;font-size:12px">
      <b style="color:#B04A3F">Linhas não aplicadas:</b>
      <ul style="margin:4px 0 0 18px;padding:0">${erro.slice(0, 12).map((e) => `<li>linha ${e.n}: ${_esc(e.m)} — <span class="mono">${_esc(e.l.slice(0, 60))}</span></li>`).join("")}</ul>
      ${erro.length > 12 ? `<div style="color:var(--muted)">…e mais ${erro.length - 12}.</div>` : ""}</div>` : ""}`;
}

/* ============================================================
   DECISÃO DE COMPRA POR ITEM
   O menor preço unitário é apenas a sugestão inicial. Aqui o RT
   vê todas as ofertas do item lado a lado — preço unitário,
   unidades por caixa e preço da caixa — com o EXCESSO que cada
   embalagem geraria frente à quantidade necessária, e decide:
   de quem comprar, quantas caixas, ou não comprar agora.
   ============================================================ */

// o que efetivamente vale para o pedido: a decisão do RT ou, na falta, a sugestão
function _itemDecisao(it) {
  if (it.decisaoStatus === "nao_comprar") return null;
  if (it.decisaoStatus === "escolhido" && it.decisaoFornecedorId) {
    const p = (it.precos || []).find((x) => x.fornecedorId === it.decisaoFornecedorId);
    if (p) {
      const caixas = it.decisaoCaixas != null ? it.decisaoCaixas
                   : (p.unidPorCaixa ? Math.ceil((Number(it.quantidade) || 0) / p.unidPorCaixa) : 0);
      return { fornecedorId: p.fornecedorId, p, unit: _precoUnit(p), caixas,
               subtotal: caixas * (p.precoCaixa || 0), origem: "escolhido" };
    }
  }
  const b = _melhor(it);
  if (!b) return null;
  const caixas = b.p.unidPorCaixa ? Math.ceil((Number(it.quantidade) || 0) / b.p.unidPorCaixa) : 0;
  return { fornecedorId: b.fornecedorId, p: b.p, unit: b.unit, caixas,
           subtotal: caixas * (b.p.precoCaixa || 0), origem: "sugestao" };
}

/* Meses até a validade — usado para alertar quando uma embalagem grande
   tem prazo curto, o pior cenário para excesso de compra. */
function _mesesAte(iso) {
  if (!iso) return null;
  const hoje = new Date(HOJE + "T12:00:00"), v = new Date(iso + "T12:00:00");
  return (v - hoje) / (1000 * 60 * 60 * 24 * 30.44);
}
function _valTag(iso) {
  const m = _mesesAte(iso);
  if (m == null) return "";
  if (m <= 0) return ' <span class="tag" style="background:#F7E3E1;color:#B04A3F">vencido</span>';
  if (m <= 6) return ` <span class="tag" style="background:#F7E3E1;color:#B04A3F">${Math.round(m)} meses</span>`;
  if (m <= 12) return ` <span class="tag" style="background:#FBF3E3;color:#B07A2F">${Math.round(m)} meses</span>`;
  return "";
}

function _decTag(it) {
  if (it.decisaoStatus === "nao_comprar")
    return '<span class="tag" style="background:#F1F3F1;color:#6a736e">não comprar</span>';
  if (it.decisaoStatus === "escolhido")
    return '<span class="tag" style="background:#E7F0E3;color:#2C5F5A">decidido</span>';
  return '<span class="tag" style="background:#FBF3E3;color:#B07A2F">sugestão</span>';
}

function abrirDecisaoItem(cotId, itemId) {
  const cot = cotacoes.find((c) => c.id === cotId); if (!cot) return;
  const it = (cot.itens || []).find((x) => x.id === itemId); if (!it) return;
  const necessario = Number(it.quantidade) || 0;
  const sub = it.substanciaId ? subById(it.substanciaId) : null;

  // ofertas ordenadas por preço unitário
  const ofertas = (it.precos || []).map((p) => {
    const unit = _precoUnit(p);
    const caixasMin = p.unidPorCaixa ? Math.ceil(necessario / p.unidPorCaixa) : 0;
    const unidTotal = caixasMin * (p.unidPorCaixa || 0);
    return { p, f: fornById(p.fornecedorId), unit, caixasMin, unidTotal,
             excesso: Math.max(0, unidTotal - necessario),
             total: caixasMin * (p.precoCaixa || 0) };
  }).sort((a, b) => (a.unit == null ? 1 : b.unit == null ? -1 : a.unit - b.unit));

  if (!ofertas.length) { alert("Este item não tem preço lançado por nenhum fornecedor."); return; }

  const melhorUnit = ofertas.find((o) => o.unit != null);
  const melhorTotal = [...ofertas].filter((o) => o.total > 0).sort((a, b) => a.total - b.total)[0];

  const linhas = ofertas.map((o, i) => {
    const sel = it.decisaoStatus === "escolhido" && it.decisaoFornecedorId === o.p.fornecedorId;
    const excPct = necessario > 0 ? (o.excesso / necessario) * 100 : 0;
    const alerta = o.excesso > 0 && excPct >= 100;
    return `<tr style="background:${sel ? "#E7F0E3" : alerta ? "#FDF6F5" : "transparent"}">
      <td style="text-align:center"><input type="radio" name="decForn" value="${o.p.fornecedorId}"${sel ? " checked" : ""}
        onchange="_decSelecionar('${o.p.fornecedorId}', ${o.caixasMin})"${o.unit == null ? " disabled" : ""}></td>
      <td><b>${_esc(o.f ? o.f.nome : "—")}</b>${o.p.disponivel === false ? ' <span class="tag" style="background:#F1F3F1;color:#6a736e">indisponível</span>' : ""}
        ${o === melhorUnit ? ' <span class="tag" style="background:#E7F0E3;color:#2C5F5A">menor unitário</span>' : ""}
        ${melhorTotal && o === melhorTotal && o !== melhorUnit ? ' <span class="tag" style="background:#EEF2EC;color:#2C5F5A">menor total</span>' : ""}</td>
      <td class="num mono">${o.unit != null ? brl(o.unit) : "—"}</td>
      <td class="num mono">${o.p.unidPorCaixa || "—"}</td>
      <td class="num mono">${o.p.precoCaixa != null ? brl(o.p.precoCaixa) : "—"}</td>
      <td class="num mono">${o.caixasMin || "—"}</td>
      <td class="num mono">${o.unidTotal || "—"}</td>
      <td class="num mono" style="color:${alerta ? "#B04A3F" : "inherit"}">${o.excesso ? o.excesso + (excPct >= 100 ? ` (+${Math.round(excPct)}%)` : "") : "—"}</td>
      <td class="num mono"><b>${o.total ? brl(o.total) : "—"}</b></td>
      <td class="mono" style="text-align:center;font-size:11.5px">${o.p.validade ? fmtDate(o.p.validade) + _valTag(o.p.validade) : "—"}</td>
    </tr>`;
  }).join("");

  const corpo = `
    <div class="note-box" style="margin-top:0">
      <b>${_esc(it.descricao)}</b>${sub && sub.lista && sub.lista !== "—" ? ` <span class="tag ${listaTagClass(sub.lista)}">${sub.lista}</span>` : ""}
      · necessidade registrada: <b>${necessario} ${_esc(it.unidade || "")}</b>
      <div style="margin-top:6px;font-size:12.5px">O menor preço unitário é apenas um filtro. Verifique o <b>excesso</b>: embalagem grande e barata por unidade pode obrigar a comprar muito mais do que se vai consumir, com risco de vencimento.</div>
      ${(() => {
        const risco = ofertas.filter((o) => o.excesso > necessario && _mesesAte(o.p.validade) != null && _mesesAte(o.p.validade) <= 12);
        return risco.length ? `<div style="margin-top:8px;padding:7px 9px;background:#F7E3E1;border-radius:7px;font-size:12.5px">
          <b>Atenção:</b> ${risco.map((o) => `${_esc(o.f ? o.f.nome : "")} — sobra ${o.excesso} com validade em ${fmtDate(o.p.validade)}`).join(" · ")}. Embalagem grande com prazo curto é o pior cenário: provavelmente vence antes do consumo.</div>` : "";
      })()}
    </div>
    <div style="overflow:auto;border:1px solid var(--line);border-radius:8px;margin-bottom:14px">
      <table style="font-size:12.5px">
        <thead><tr>
          <th style="width:34px"></th><th>Fornecedor</th>
          <th class="num">Unitário</th><th class="num">Unid./cx</th><th class="num">Preço cx</th>
          <th class="num">Caixas</th><th class="num">Total unid.</th><th class="num">Excesso</th><th class="num">Custo</th><th>Validade</th>
        </tr></thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>
    <div class="ff row2">
      <div><label>Necessidade (unidades)${necessario ? "" : ' <span style="color:#B04A3F;font-weight:400">— está zerada, informe</span>'}</label>
        <input id="decNec" type="number" min="0" step="1" value="${necessario}">
        <div style="font-size:11px;color:var(--muted);margin-top:3px">Quanto se pretende comprar deste item. Usada para calcular caixas e sobra.</div></div>
      <div><label>Caixas a comprar</label><input id="decCaixas" type="number" min="0" step="1"
        value="${it.decisaoCaixas != null ? it.decisaoCaixas : ((melhorUnit && melhorUnit.caixasMin) || 1)}"></div>
      <div><label>Situação</label>
        <select id="decStatus">
          <option value="escolhido"${it.decisaoStatus === "escolhido" ? " selected" : ""}>Comprar do fornecedor marcado</option>
          <option value="nao_comprar"${it.decisaoStatus === "nao_comprar" ? " selected" : ""}>Não comprar agora (fora do pedido)</option>
          <option value="sugestao"${it.decisaoStatus === "sugestao" ? " selected" : ""}>Deixar na sugestão automática (menor unitário)</option>
        </select></div>
    </div>
    <div class="ff"><label>Observação da decisão</label><input id="decObs" value="${(it.decisaoObs || "").replace(/"/g, "&quot;")}" placeholder="Ex.: caixa de 100 vence antes do consumo — comprar 2 unidades em drogaria"></div>
  `;
  abrirModal("Decisão de compra do item", corpo, async () => {
    const status = fv("decStatus");
    const caixas = fvNum("decCaixas");
    const dados = { decisao_status: status, decisao_obs: fvOrNull("decObs") };
    const nec = fvNum("decNec");
    if (nec >= 0 && nec !== necessario) dados.quantidade = nec;
    if (status === "escolhido") {
      const fid = _decFornSel || it.decisaoFornecedorId;
      if (!fid) throw new Error("Marque o fornecedor escolhido na tabela.");
      if (!(caixas > 0)) throw new Error("Informe quantas caixas comprar.");
      dados.decisao_fornecedor_id = fid;
      dados.decisao_caixas = caixas;
    } else {
      dados.decisao_fornecedor_id = null;
      dados.decisao_caixas = null;
    }
    const { error } = await window.SB.from("cotacao_itens").update(dados).eq("id", itemId);
    if (error) throw error;
  }, "Salvar decisão");
  _decFornSel = it.decisaoFornecedorId || null;
}

let _decFornSel = null;
function _decSelecionar(fid, caixasSugeridas) {
  _decFornSel = fid;
  const c = document.getElementById("decCaixas");
  if (c && (!c.value || Number(c.value) === 0)) c.value = caixasSugeridas || 1;
  const st = document.getElementById("decStatus");
  if (st) st.value = "escolhido";
}

/* ============================================================
   RELATÓRIO DE COTAÇÃO — justificativa de compra para a direção
   Mostra todas as propostas recebidas item a item, a escolha do
   RT com a razão, e compara dois cenários: comprar tudo pelo
   menor preço unitário (escolha automática) x a decisão técnica.
   ============================================================ */
function imprimirRelatorioCotacao(cotId) {
  const cot = cotacoes.find((c) => c.id === cotId);
  if (!cot) return;
  if (!cot.itens.length) { alert("A cotação não tem itens."); return; }

  // fornecedores que apresentaram proposta
  const fids = [...new Set(cot.itens.flatMap((it) => (it.precos || []).map((p) => p.fornecedorId)))];
  const forns = fids.map(fornById).filter(Boolean).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  // cenário A (menor unitário) x cenário B (decisão do RT)
  let totA = 0, totB = 0, unidA = 0, unidB = 0, excA = 0, excB = 0;
  let nDecid = 0, nFora = 0, nSug = 0;
  const linhas = [];

  cot.itens.slice().sort((a, b) => {
    const ca = a.substanciaId ? catRotulo(subById(a.substanciaId).categoria) : "";
    const cb = b.substanciaId ? catRotulo(subById(b.substanciaId).categoria) : "";
    return ca.localeCompare(cb, "pt-BR") || (a.descricao || "").localeCompare(b.descricao || "", "pt-BR");
  }).forEach((it) => {
    const nec = Number(it.quantidade) || 0;
    const sub = it.substanciaId ? subById(it.substanciaId) : null;
    const ofertas = (it.precos || []).map((p) => {
      const unit = _precoUnit(p);
      const cx = p.unidPorCaixa ? Math.ceil(nec / p.unidPorCaixa) : 0;
      const un = cx * (p.unidPorCaixa || 0);
      return { p, f: fornById(p.fornecedorId), unit, cx, un,
               exc: Math.max(0, un - nec), total: cx * (p.precoCaixa || 0) };
    }).sort((a, b) => (a.unit == null ? 1 : b.unit == null ? -1 : a.unit - b.unit));

    const auto = ofertas.find((o) => o.unit != null && o.p.disponivel !== false);
    const d = _itemDecisao(it);
    if (it.decisaoStatus === "escolhido") nDecid++;
    else if (it.decisaoStatus === "nao_comprar") nFora++;
    else if (d) nSug++;

    if (auto) { totA += auto.total; unidA += auto.un; excA += auto.exc; }
    if (d) {
      const un = d.caixas * (d.p.unidPorCaixa || 0);
      totB += d.subtotal; unidB += un; excB += Math.max(0, un - nec);
    }
    linhas.push({ it, nec, sub, ofertas, auto, d });
  });

  const economia = totA - totB;

  // ---- corpo do relatório ----
  const bloco = (L) => {
    const rows = L.ofertas.map((o) => {
      const escolhido = L.d && L.d.p === o.p;
      const menorU = o === L.ofertas.find((x) => x.unit != null);
      return `<tr class="${escolhido ? "esc" : ""}">
        <td>${_esc(o.f ? o.f.nome : "—")}${o.p.disponivel === false ? " <i>(indisponível)</i>" : ""}</td>
        <td class="c mono">${o.unit != null ? brl(o.unit) : "—"}</td>
        <td class="c mono">${o.p.unidPorCaixa || "—"}</td>
        <td class="c mono">${o.p.precoCaixa != null ? brl(o.p.precoCaixa) : "—"}</td>
        <td class="c mono">${o.cx || "—"}</td>
        <td class="c mono">${o.un || "—"}</td>
        <td class="c mono">${o.exc || "—"}</td>
        <td class="c mono">${o.p.validade ? fmtDate(o.p.validade) : "—"}</td>
        <td class="c mono"><b>${o.total ? brl(o.total) : "—"}</b></td>
        <td class="c">${escolhido ? "★" : (menorU ? "menor unit." : "")}</td>
      </tr>`;
    }).join("");
    const dec = L.it.decisaoStatus === "nao_comprar"
      ? `<div class="just nao"><b>Não adquirir nesta cotação.</b>${L.it.decisaoObs ? " " + _esc(L.it.decisaoObs) : ""}</div>`
      : L.d
        ? `<div class="just"><b>Escolhido: ${_esc(_fornNome(L.d.fornecedorId))}</b> — ${L.d.caixas} caixa(s), ${brl(L.d.subtotal)}${L.d.origem === "sugestao" ? " <i>(menor preço unitário, sem ressalva)</i>" : ""}.${L.it.decisaoObs ? " " + _esc(L.it.decisaoObs) : ""}</div>`
        : `<div class="just nao"><b>Sem proposta válida</b> — cotar com outros fornecedores.</div>`;
    return `<section class="item">
      <div class="it-h"><span class="it-n">${_esc(L.it.descricao)}</span>
        ${L.sub && L.sub.lista && L.sub.lista !== "—" ? `<span class="lista">Lista ${_esc(L.sub.lista)}</span>` : ""}
        <span class="it-q">necessidade: ${L.nec} ${_esc(L.it.unidade || "")}</span></div>
      <table class="of"><thead><tr><th>Fornecedor</th><th class="c">Unitário</th><th class="c">Un./cx</th><th class="c">Preço cx</th><th class="c">Cx</th><th class="c">Total un.</th><th class="c">Excesso</th><th class="c">Validade</th><th class="c">Custo</th><th class="c"></th></tr></thead>
      <tbody>${rows || '<tr><td colspan="10" class="c">Nenhuma proposta recebida para este item.</td></tr>'}</tbody></table>
      ${dec}
    </section>`;
  };

  // resumo por fornecedor
  const map = _pedidos(cot);
  const porForn = Object.keys(map).map((fid) => {
    const t = map[fid].reduce((a, r) => a + r.subtotal, 0);
    return `<tr><td>${_esc(_fornNome(fid))}</td><td class="c mono">${map[fid].length}</td><td class="c mono">${brl(t)}</td></tr>`;
  }).join("");

  const corpo = `
    <style>
      .cx{border:1px solid #cfd6cf;border-radius:6px;padding:10px 12px;margin-bottom:12px}
      .cx h2{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#2C5F5A;margin:0 0 6px}
      .cen{display:flex;gap:10px;flex-wrap:wrap}
      .cen>div{flex:1;min-width:150px;border:1px solid #cfd6cf;border-radius:6px;padding:8px 10px}
      .cen .v{font-size:16px;font-weight:700}.cen .r{font-size:9px;color:#6a736e;text-transform:uppercase}
      .cen .ok{color:#2C5F5A}.cen .al{color:#B04A3F}
      .item{border:1px solid #cfd6cf;border-radius:6px;padding:8px 10px;margin-bottom:9px;break-inside:avoid;page-break-inside:avoid}
      .it-h{display:flex;align-items:baseline;gap:8px;border-bottom:1px solid #1E2A28;padding-bottom:3px;margin-bottom:5px;flex-wrap:wrap}
      .it-n{font-size:12px;font-weight:700}.it-q{font-size:9.5px;color:#6a736e;margin-left:auto}
      .lista{background:#E7F0E3;color:#2C5F5A;font-size:8px;font-weight:700;padding:1px 5px;border-radius:3px}
      table.of{width:100%;border-collapse:collapse}
      table.of th,table.of td{border:1px solid #dfe5df;padding:3px 5px;font-size:9.5px}
      table.of th{background:#EEF2EC;font-size:8px;text-transform:uppercase}
      table.of td.c,table.of th.c{text-align:center}
      table.of tr.esc td{background:#E7F0E3;font-weight:600}
      .just{margin-top:5px;font-size:10px;background:#F4F6F3;border-left:3px solid #2C5F5A;padding:4px 8px}
      .just.nao{border-left-color:#8a938d;color:#4a544f}
      table.res{width:100%;border-collapse:collapse}
      table.res th,table.res td{border:1px solid #cfd6cf;padding:4px 6px;font-size:10.5px}
      table.res th{background:#EEF2EC;font-size:8.5px;text-transform:uppercase}
      table.res td.c,table.res th.c{text-align:center}
      .met{font-size:10px;line-height:1.5;color:#3a443f}
      .met li{margin:3px 0}
      .assin{display:flex;justify-content:space-between;gap:30px;margin-top:26px}
      .assin .l{border-top:1px solid #1E2A28;padding-top:5px;text-align:center;flex:1;font-size:10px}
    </style>

    <div class="cx"><h2>Comparação de cenários</h2>
      <div class="cen">
        <div><div class="r">A) Menor preço unitário</div><div class="v">${brl(totA)}</div>
          <div class="r">${unidA} unid. · excesso ${excA}</div></div>
        <div><div class="r">B) Decisão técnica (adotada)</div><div class="v ok">${brl(totB)}</div>
          <div class="r">${unidB} unid. · excesso ${excB}</div></div>
        <div><div class="r">Diferença</div><div class="v ${economia >= 0 ? "ok" : "al"}">${economia >= 0 ? "−" : "+"} ${brl(Math.abs(economia))}</div>
          <div class="r">${excA - excB >= 0 ? (excA - excB) + " unid. de excesso evitadas" : "—"}</div></div>
      </div>
      <div class="met" style="margin-top:8px">
        O cenário A representa a escolha automática pelo menor preço por unidade. O cenário B é a decisão técnica do farmacêutico responsável, que considera também o tamanho da embalagem frente à necessidade real, o prazo de validade ofertado e a regularidade do fornecedor.
      </div>
    </div>

    <div class="cx"><h2>Critérios adotados na escolha</h2>
      <ol class="met" style="margin:0 0 0 16px;padding:0">
        <li><b>Menor preço unitário como filtro inicial</b>, não como decisão final.</li>
        <li><b>Adequação da embalagem à necessidade.</b> Embalagem grande com preço unitário baixo pode obrigar à aquisição de quantidade muito superior ao consumo previsto — o menor custo por unidade transforma-se em desembolso maior e em risco de perda por vencimento.</li>
        <li><b>Prazo de validade ofertado.</b> Lotes com validade curta associados a quantidade excedente foram recusados.</li>
        <li><b>Regularidade do fornecedor.</b> Só se adquire de fornecedor com documentação sanitária em ordem, conforme o procedimento de qualificação.</li>
        <li><b>Itens sujeitos a controle especial</b> (Portaria SVS/MS 344/1998) exigem fornecedor autorizado e são identificados nesta relação.</li>
      </ol>
    </div>

    <div class="cx"><h2>Situação dos itens</h2>
      <table class="res"><tr>
        <th class="c">Total de itens</th><th class="c">Decididos pelo RT</th><th class="c">Pela sugestão automática</th><th class="c">Excluídos da compra</th><th class="c">Sem proposta</th></tr>
        <tr><td class="c mono">${cot.itens.length}</td><td class="c mono">${nDecid}</td><td class="c mono">${nSug}</td><td class="c mono">${nFora}</td>
        <td class="c mono">${cot.itens.filter((it) => !(it.precos || []).some((p) => _precoUnit(p) != null)).length}</td></tr></table>
    </div>

    ${porForn ? `<div class="cx"><h2>Distribuição do pedido por fornecedor</h2>
      <table class="res"><thead><tr><th>Fornecedor</th><th class="c">Itens</th><th class="c">Valor</th></tr></thead>
      <tbody>${porForn}<tr><td><b>TOTAL</b></td><td class="c mono"><b>${Object.values(map).flat().length}</b></td><td class="c mono"><b>${brl(totB)}</b></td></tr></tbody></table></div>` : ""}

    <div class="cx"><h2>Propostas recebidas</h2>
      <div class="met">${forns.length} fornecedor(es): ${_esc(forns.map((f) => f.nome).join(" · "))}. A seguir, item a item, todas as propostas e a escolha adotada (★).</div>
    </div>

    ${linhas.map(bloco).join("")}

    <div class="assin">
      <div class="l">${rtLinha()}<br><span style="color:#6a736e">Farmacêutico Responsável Técnico</span></div>
      <div class="l">____________________<br><span style="color:#6a736e">Direção — ciência e autorização</span></div>
    </div>`;

  imprimirRelatorio("Relatório de Cotação e Justificativa de Compra",
    `Cotação ${_esc(cot.identificador || "")} · ${cot.data ? fmtDate(cot.data) : ""} · ${cot.itens.length} itens · ${forns.length} proposta(s)`,
    corpo);
}
