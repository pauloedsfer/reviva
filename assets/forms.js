/* ============================================================
   forms.js — Hospital Reviva
   Infraestrutura de formulários (modais) usada pelas telas de
   lançamento: pacientes, prescrições, NF, doações, custódia,
   devoluções e carrinho. Sem dependências externas.
   ============================================================ */

/* ---------------- modal ---------------- */
function _garanteModalRoot() {
  if (document.getElementById("modalRoot")) return;
  const root = document.createElement("div");
  root.id = "modalRoot";
  root.innerHTML = `
    <style>
      #modalRoot .mb-backdrop{ position:fixed; inset:0; background:rgba(20,28,26,.55);
        display:none; align-items:flex-start; justify-content:center; z-index:9000; overflow:auto; padding:28px 16px; }
      #modalRoot.open .mb-backdrop{ display:flex; }
      #modalRoot .mb-card{ background:#fff; border-radius:14px; width:100%; max-width:640px;
        box-shadow:0 20px 60px rgba(0,0,0,.25); overflow:hidden; }
      #modalRoot .mb-head{ padding:16px 20px; border-bottom:1px solid var(--line,#DEDACD);
        display:flex; align-items:center; justify-content:space-between; }
      #modalRoot .mb-title{ font-family:"Fraunces",serif; font-weight:600; font-size:17px; }
      #modalRoot .mb-x{ border:none; background:none; font-size:20px; cursor:pointer; color:var(--muted,#8A928F); }
      #modalRoot .mb-body{ padding:18px 20px; }
      #modalRoot .mb-foot{ padding:14px 20px; border-top:1px solid var(--line,#DEDACD);
        display:flex; justify-content:flex-end; gap:10px; align-items:center; }
      #modalRoot .mb-err{ display:none; color:#8B4A3A; background:#FBEAE6; border:1px solid #E7C3B9;
        border-radius:8px; padding:9px 12px; font-size:12.5px; margin-right:auto; }
      #modalRoot .ff{ margin-bottom:13px; }
      #modalRoot .ff.row2{ display:grid; grid-template-columns:1fr 1fr; gap:13px; }
      #modalRoot .ff.row3{ display:grid; grid-template-columns:1fr 1fr 1fr; gap:13px; }
      #modalRoot label{ display:block; font-size:12px; font-weight:600; margin:0 0 5px; }
      #modalRoot input, #modalRoot select, #modalRoot textarea{ width:100%; padding:9px 11px;
        border:1px solid var(--line,#DEDACD); border-radius:8px; font:inherit; font-size:13.5px; background:#fff; }
      #modalRoot input:focus, #modalRoot select:focus, #modalRoot textarea:focus{
        outline:none; border-color:var(--primary,#2C5F5A); box-shadow:0 0 0 3px rgba(44,95,90,.12); }
      #modalRoot .item-row{ display:grid; gap:8px; align-items:end; margin-bottom:8px; }
      #modalRoot .item-head{ font-size:11px; color:var(--muted,#8A928F); text-transform:uppercase; letter-spacing:.04em; margin:6px 0; }
      #modalRoot .item-del{ border:1px solid var(--line,#DEDACD); background:#fff; border-radius:8px; cursor:pointer; padding:9px; color:#8B4A3A; }
      #modalRoot .add-item{ margin-top:4px; }
      @media (max-width:640px){ #modalRoot .ff.row2, #modalRoot .ff.row3{ grid-template-columns:1fr; } }
    </style>
    <div class="mb-backdrop" id="mbBackdrop">
      <div class="mb-card">
        <div class="mb-head"><div class="mb-title" id="mbTitle"></div><button class="mb-x" onclick="fecharModal()">✕</button></div>
        <div class="mb-body" id="mbBody"></div>
        <div class="mb-foot">
          <div class="mb-err" id="mbErr"></div>
          <button class="btn ghost sm" onclick="fecharModal()">Cancelar</button>
          <button class="btn sm" id="mbSalvar">Salvar</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(root);
  root.querySelector("#mbBackdrop").addEventListener("mousedown", (e) => { if (e.target.id === "mbBackdrop") fecharModal(); });
}

function abrirModal(titulo, corpoHTML, onSalvar, textoSalvar) {
  _garanteModalRoot();
  const root = document.getElementById("modalRoot");
  document.getElementById("mbTitle").textContent = titulo;
  document.getElementById("mbBody").innerHTML = corpoHTML;
  document.getElementById("mbErr").style.display = "none";
  const btn = document.getElementById("mbSalvar");
  btn.textContent = textoSalvar || "Salvar";
  btn.disabled = false;
  btn.onclick = async () => {
    btn.disabled = true; btn.textContent = "Salvando…";
    try {
      await onSalvar();
      fecharModal();
      await recarregarTela();
    } catch (e) {
      const err = document.getElementById("mbErr");
      err.textContent = e.message || String(e);
      err.style.display = "block";
      btn.disabled = false; btn.textContent = textoSalvar || "Salvar";
    }
  };
  root.classList.add("open");
}
function fecharModal() {
  const root = document.getElementById("modalRoot");
  if (root) root.classList.remove("open");
}

// Recarrega os dados do banco e re-renderiza a tela atual.
async function recarregarTela() {
  await carregarDados();
  if (typeof renderPage === "function") {
    document.getElementById("viewport").innerHTML = renderPage();
  }
  if (typeof afterRender === "function") afterRender();
}

/* ---------------- leitura de campos ---------------- */
function fv(id) { const el = document.getElementById(id); return el ? el.value.trim() : ""; }
function fvNum(id) { const v = fv(id); return v === "" ? null : Number(v); }
function fvOrNull(id) { const v = fv(id); return v === "" ? null : v; }

/* ---------------- construtores de campo ---------------- */
function _optSubs(sel) {
  return substances.map((s) => `<option value="${s.id}"${s.id === sel ? " selected" : ""}>${s.nome}</option>`).join("");
}
function _optPats(sel) {
  return `<option value="">— selecione —</option>` +
    patients.map((p) => `<option value="${p.id}"${p.id === sel ? " selected" : ""}>${p.nome} · ${p.leito || ""}</option>`).join("");
}
function _optPresc(sel) {
  return `<option value="">— selecione —</option>` +
    prescritores.map((p) => `<option value="${p.id}"${p.id === sel ? " selected" : ""}>${p.nome} (${p.conselho}-${p.uf} ${p.numero})</option>`).join("") +
    `<option value="__novo__">+ Novo prescritor…</option>`;
}
function _optForn(sel) {
  return `<option value="">— selecione —</option>` +
    fornecedores.map((f) => `<option value="${f.id}"${f.id === sel ? " selected" : ""}>${f.nome}${f.tipo ? " (" + f.tipo + ")" : ""}</option>`).join("") +
    `<option value="__novo__">+ Novo fornecedor…</option>`;
}

/* ---------------- linhas de itens (NF, doação, custódia) ---------------- */
// tipo: 'nf' (custo_unit) | 'doacao' (valor_estimado) | 'custodia' (obs)
function addItemRow(containerId, tipo) {
  const cont = document.getElementById(containerId);
  const row = document.createElement("div");
  const cols = tipo === "custodia" ? "1.4fr .7fr 1fr 1fr .5fr" : "1.4fr .7fr 1fr 1fr .8fr .5fr";
  row.className = "item-row";
  row.style.gridTemplateColumns = cols;
  const extra = tipo === "nf"
    ? `<div><input type="number" step="0.0001" min="0" class="i-extra" placeholder="Custo/un."></div>`
    : tipo === "doacao"
    ? `<div><input type="number" step="0.0001" min="0" class="i-extra" placeholder="Valor merc."></div>`
    : "";
  row.innerHTML = `
    <div><select class="i-sub">${_optSubs()}</select></div>
    <div><input type="number" min="1" class="i-qtd" placeholder="Qtd."></div>
    <div><input type="text" class="i-lote" placeholder="Lote"></div>
    <div><input type="date" class="i-val"></div>
    ${extra}
    <button type="button" class="item-del" onclick="this.parentElement.remove()">✕</button>`;
  cont.appendChild(row);
}
function coletarItens(containerId, tipo) {
  const rows = Array.from(document.querySelectorAll(`#${containerId} .item-row`));
  const itens = rows.map((r) => {
    const sub = r.querySelector(".i-sub").value;
    const qtd = Number(r.querySelector(".i-qtd").value);
    const lote = r.querySelector(".i-lote").value.trim();
    const val = r.querySelector(".i-val").value || null;
    const extraEl = r.querySelector(".i-extra");
    const extra = extraEl ? Number(extraEl.value || 0) : null;
    return { sub, qtd, lote, val, extra };
  }).filter((it) => it.sub && it.qtd > 0 && it.lote);
  if (!itens.length) throw new Error("Adicione ao menos um item completo (substância, quantidade e lote).");
  return itens;
}

/* ---------------- cadastros de apoio criados na hora ---------------- */
// Se o usuário escolheu "+ Novo prescritor…", cria e devolve o id.
async function resolvePrescritor(selectId) {
  const val = fv(selectId);
  if (val && val !== "__novo__") return val;
  if (val !== "__novo__") return null;
  const nome = fv("npNome");
  if (!nome) throw new Error("Informe o nome do novo prescritor.");
  const novo = { nome, conselho: fv("npConselho") || "CRM", uf: fv("npUf"), numero: fv("npNumero") };
  const { data, error } = await window.SB.from("prescritores").insert(novo).select("id").single();
  if (error) throw error;
  return data.id;
}
async function resolveFornecedor(selectId) {
  const val = fv(selectId);
  if (val && val !== "__novo__") return val;
  if (val !== "__novo__") return null;
  const nome = fv("nfNome");
  if (!nome) throw new Error("Informe o nome do novo fornecedor.");
  const novo = { nome, cnpj: fvOrNull("nfCnpj"), tipo: fvOrNull("nfTipo") };
  const { data, error } = await window.SB.from("fornecedores").insert(novo).select("id").single();
  if (error) throw error;
  return data.id;
}
// blocos de campos revelados quando "+ Novo…" é escolhido
function _blocoNovoPrescritor() {
  return `<div id="blocoNovoPresc" style="display:none;border-top:1px dashed var(--line);margin-top:6px;padding-top:10px">
    <div class="ff"><label>Nome do novo prescritor</label><input id="npNome" placeholder="Dr(a). Nome"></div>
    <div class="ff row3">
      <div><label>Conselho</label><input id="npConselho" value="CRM"></div>
      <div><label>UF</label><input id="npUf" placeholder="GO"></div>
      <div><label>Número</label><input id="npNumero" placeholder="12345"></div>
    </div></div>`;
}
function _blocoNovoFornecedor() {
  return `<div id="blocoNovoForn" style="display:none;border-top:1px dashed var(--line);margin-top:6px;padding-top:10px">
    <div class="ff"><label>Nome do novo fornecedor</label><input id="nfNome" placeholder="Razão social"></div>
    <div class="ff row2">
      <div><label>CNPJ</label><input id="nfCnpj" placeholder="00.000.000/0000-00"></div>
      <div><label>Tipo</label><select id="nfTipo"><option value="">—</option><option value="drogaria">drogaria</option><option value="distribuidora">distribuidora</option></select></div>
    </div></div>`;
}
function _toggleBloco(selectId, blocoId) {
  const sel = document.getElementById(selectId), bloco = document.getElementById(blocoId);
  if (sel && bloco) bloco.style.display = sel.value === "__novo__" ? "block" : "none";
}
