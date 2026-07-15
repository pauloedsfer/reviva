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
      <div><label>Unidade *</label><input id="sUnid" value="${s.unidade || "comp."}"></div>
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
            ${substances.map(s=>{
              const bal = saldo(s.id);
              const cm = custoMedio(s.id);
              const low = bal <= 10;
              return `<tr>
                <td><b>${s.nome}</b></td>
                <td>${s.lista==='—' ? '<span style="color:var(--muted)">não controlado</span>' : `<span class="tag ${listaTagClass(s.lista)}">Lista ${s.lista}</span>`}</td>
                <td class="num mono">${bal} ${s.unidade}</td>
                <td class="num mono">${fmtBRL(cm)}</td>
                <td class="num mono"><b>${fmtBRL(bal*cm)}</b></td>
                <td>${low ? '<span class="pill low">● abaixo do mínimo</span>' : '<span class="pill">● regular</span>'}</td>
                <td><button class="btn ghost sm" onclick="abrirFormSubstancia('${s.id}')">Editar</button></td>
              </tr>`;
            }).join('')}
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
              const bal = saldoLote(l.lote);
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
