/* ============================================================
   paginas/balanco.js — Hospital Reviva
   Lógica de renderização exclusiva desta página.
   Depende de assets/dados.js (dados + cálculo) já carregado.
   ============================================================ */

function renderPage(){
  return `
    <div class="panel">
      <div class="panel-head">
        <div><div class="panel-title">Balanço Mensal de Psicotrópicos e Entorpecentes</div><div class="panel-title-sub">Referência: julho / 2026 — gerado a partir do Livro de Registro</div></div>
        <button class="btn ghost sm">Exportar BMPO</button>
      </div>
      <div class="panel-body">
        <table>
          <thead><tr><th>Substância</th><th>Lista</th><th>Estoque inicial</th><th>Entradas</th><th>Saídas</th><th>Saldo final</th></tr></thead>
          <tbody>
            ${substances.filter(s=>s.lista!=='—').map(s=>{
              const entradas = movements.filter(m=>m.subId===s.id && (m.tipo==='entrada'||m.tipo==='devolucao') && m.origem!=='proprio').reduce((a,m)=>a+m.qtd,0);
              const saidas = movements.filter(m=>m.subId===s.id && m.tipo==='saida').reduce((a,m)=>a+m.qtd,0);
              return `<tr>
                <td><b>${s.nome}</b></td>
                <td><span class="tag ${listaTagClass(s.lista)}">Lista ${s.lista}</span></td>
                <td class="num mono">0</td>
                <td class="num mono">+${entradas}</td>
                <td class="num mono">−${saidas}</td>
                <td class="num mono"><b>${entradas - saidas}</b></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
        <div class="foot-signoff">
          <span>Pronto para assinatura digital e envio à Vigilância Sanitária</span>
          <span>Farmacêutico RT: Paulo Edson Fernandes — CRF-GO 9303</span>
        </div>
      </div>
    </div>
  `;
}
