/* ============================================================
   paginas/estoque.js — Hospital Reviva
   Substâncias + lotes/validade. Cadastro/edição de substância.
   ============================================================ */

const LISTAS_344 = ["—","A1","A2","A3","B1","B2","C1","C2","C3","C4","C5"];

function _formSubstancia(s) {
  s = s || {};
  const opts = LISTAS_344.map((l) => `<option value="${l}"${l === (s.lista || "—") ? " selected" : ""}>${l === "—" ? "— não controlado" : "Lista " + l}</option>`).join("");
  return `
    <div class="ff"><label>Nome (como aparece no estoque) *</label><input id="sNome" value="${(s.nome || "").replace(/"/g, "&quot;")}" placeholder="Diazepam 10mg comp."></div>
    <div class="ff row2">
      <div><label>Princípio ativo</label><input id="sPa" value="${s.principio_ativo || ""}" placeholder="Diazepam"></div>
      <div><label>Concentração</label><input id="sConc" value="${s.concentracao || ""}" placeholder="10mg"></div>
    </div>
    <div class="ff row3">
      <div><label>Forma</label><input id="sForma" value="${s.forma || ""}" placeholder="comprimido"></div>
      <div><label>Lista (Portaria 344/98) *</label><select id="sLista">${opts}</select></div>
      <div><label>Unidade *</label><input id="sUnid" value="${s.unidade || "comp."}">
        <div class="dica">A menor unidade movimentada: comp., ampola, <b>gota</b>.</div></div>
    </div>
    <div class="ff"><label>Nome comercial <span class="opc">— marcas conhecidas, separadas por vírgula</span></label>
      <input id="sMarca" value="${(s.nomeComercial || "").replace(/"/g, "&quot;")}" placeholder="Ex.: Neozine®, Levozine®">
      <div class="dica">Aparece ao lado do princípio ativo no mapa, na dispensação e nos kits, para a enfermagem reconhecer a caixa — sem precisar cadastrar a marca como outra substância.</div></div>
    <div class="ff row2">
      <div><label>Unidade de compra <span class="opc">— opcional</span></label>
        <input id="sUnidCompra" value="${(s.unidadeCompra || "").replace(/"/g, "&quot;")}" placeholder="Ex.: frasco">
        <div class="dica">Como o item é comprado e contado.</div></div>
      <div><label>Equivale a quantas unidades</label>
        <input id="sFator" type="number" min="1" step="1" value="${s.fatorUnidade || ""}" placeholder="400">
        <div class="dica">Gotas: 20 por mL — frasco de 20 mL = <b>400</b>; 10 mL = 200; 30 mL = 600.</div></div>
    </div>
    <div class="ff row2">
      <div><label>Categoria</label>
        <select id="sCat">${CATEGORIAS_ORDEM.map((c) => `<option value="${c}"${(s.categoria || "NAO CLASSIFICADO") === c ? " selected" : ""}>${catRotulo(c)}</option>`).join("")}</select></div>
      <div><label>Origem do cadastro</label>
        <select id="sPadr">
          <option value="1"${s.padronizado !== false ? " selected" : ""}>Padronização (a clínica compra)</option>
          <option value="0"${s.padronizado === false ? " selected" : ""}>Medicação de paciente (não entra em cotação)</option>
        </select></div>
    </div>
  `;
}

function abrirFormSubstancia(id) {
  const s = id ? substances.find((x) => x.id === id) : null;
  abrirModal(id ? "Editar substância" : "Nova substância", _formSubstancia(s), async () => {
    const nome = fv("sNome");
    if (!nome) throw new Error("Informe o nome da substância.");
    const dados = {
      nome, principio_ativo: fvOrNull("sPa"), concentracao: fvOrNull("sConc"),
      forma: fvOrNull("sForma"), lista: fv("sLista") || "—", unidade: fv("sUnid") || "comp.",
      nome_comercial: fvOrNull("sMarca"),
      unidade_compra: fvOrNull("sUnidCompra"),
      fator_unidade: fv("sFator") ? fvNum("sFator") : null,
      categoria: fv("sCat") || "NAO CLASSIFICADO", padronizado: fv("sPadr") !== "0",
    };
    if (id) {
      const { error } = await window.SB.from("substancias").update(dados).eq("id", id);
      if (error) throw error;
    } else {
      const { error } = await window.SB.from("substancias").insert(dados);
      if (error) throw error;
    }
  }, id ? "Salvar alterações" : "Cadastrar substância");
}

function renderPage(){
  const lotes = allLotes().sort((a,b)=> a.validade < b.validade ? -1 : 1);
  return `
    <div class="panel">
      <div class="panel-head">
        <div><div class="panel-title">Substâncias controladas e estoque</div><div class="panel-title-sub">Saldo = soma dos lotes ativos (calculado, não digitado) · custo médio ponderado pelas compras</div></div>
        <button class="btn sm" onclick="abrirFormSubstancia()">+ Nova substância</button>
      </div>
      <div class="panel-body">
        <table>
          <thead><tr><th>Substância</th><th>Lista</th><th>Saldo atual</th><th>Custo médio/un.</th><th>Valor em estoque</th><th>Situação</th><th></th></tr></thead>
          <tbody>
            ${(() => {
              // agrupa por categoria (alfabética) e ordena as substâncias por nome
              const porCat = {};
              substances.forEach((s) => { (porCat[s.categoria || "NAO CLASSIFICADO"] ||= []).push(s); });
              return categoriasAlfabeticas().filter((c) => porCat[c] && porCat[c].length).map((c) => {
                const lista = porCat[c].sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR"));
                const nCtrl = lista.filter((x) => x.lista && x.lista !== "—").length;
                const valor = lista.reduce((t, x) => t + saldo(x.id) * custoMedio(x.id), 0);
                return `<tr><td colspan="7" style="background:var(--primary-tint);color:var(--primary-dark);font-weight:700;font-size:11.5px;text-transform:uppercase;letter-spacing:.04em;padding:6px 8px">
                    ${catRotulo(c)} <span style="font-weight:400;opacity:.75">· ${lista.length} ${lista.length === 1 ? "item" : "itens"}${nCtrl ? " · " + nCtrl + " controlado(s)" : ""} · ${fmtBRL(valor)}</span></td></tr>` +
                  lista.map(s=>{
              const bal = saldo(s.id);
              const cm = custoMedio(s.id);
              const low = bal <= 10;
              return `<tr>
                <td><b>${s.nome}</b>${s.padronizado ? "" : ' <span class="tag" style="background:#FBF3E3;color:#B07A2F" title="Cadastrada para custódia de paciente — não entra em cotação">med. de paciente</span>'}</td>
                <td>${s.lista==='—' ? '<span style="color:var(--muted)">não controlado</span>' : `<span class="tag ${listaTagClass(s.lista)}">Lista ${s.lista}</span>`}</td>
                <td class="num mono">${bal} ${s.unidade}</td>
                <td class="num mono">${fmtBRL(cm)}</td>
                <td class="num mono"><b>${fmtBRL(bal*cm)}</b></td>
                <td>${low ? '<span class="pill low">● abaixo do mínimo</span>' : '<span class="pill">● regular</span>'}</td>
                <td><button class="btn ghost sm" onclick="abrirFormSubstancia('${s.id}')">Editar</button></td>
              </tr>`;
            }).join(''); }).join(''); })()}
          </tbody>
        </table>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head">
        <div><div class="panel-title">Lotes &amp; Validade</div><div class="panel-title-sub">Todo lote recebido, por compra ou doação, com saldo e status de vencimento</div></div>
      </div>
      <div class="panel-body">
        <table>
          <thead><tr><th>Lote</th><th>Substância</th><th>Origem</th><th>Validade</th><th>Status</th><th>Recebido</th><th>Saldo do lote</th></tr></thead>
          <tbody>
            ${lotes.map(l=>{
              const vs = validadeStatus(l.validade);
              const bal = saldoLoteChave(l.chave);
              const statusTag = vs.key==='vencido' ? `<span class="pill low">● ${vs.label}</span>`
                : vs.key==='critico' ? `<span class="pill warn">● ${vs.label}</span>`
                : `<span class="pill">● ${vs.label}</span>`;
              const origemTag = l.origem==='compra' ? '<span class="tag tag-in">COMPRA</span>'
                : l.origem==='doacao' ? '<span class="tag" style="background:var(--accent)">DOAÇÃO</span>'
                : l.origem==='inventario' ? '<span class="tag">INVENTÁRIO</span>'
                : '<span class="tag tag-proprio">PRÓPRIA DO PACIENTE</span>';
              return `<tr>
                <td><span class="folio">${l.lote}</span></td>
                <td>${subById(l.subId).nome}</td>
                <td>${origemTag}</td>
                <td class="mono">${fmtDate(l.validade)}</td>
                <td>${statusTag}</td>
                <td class="num mono">${l.qtd}</td>
                <td class="num mono"><b>${bal}</b></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
        <div class="foot-signoff">
          <span>Lotes "própria do paciente" ficam em custódia — não contam no saldo geral disponível</span>
          <span>${lotes.filter(l=>l.origem==='proprio').length} lote(s) em custódia de paciente</span>
        </div>
      </div>
    </div>
  `;
}
