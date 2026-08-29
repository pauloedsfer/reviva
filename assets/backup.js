/* ============================================================
   assets/backup.js — Hospital Reviva
   Backup completo: Exportar (baixa JSON com todas as tabelas) e
   Importar/Restaurar (reconstrói os dados num Supabase novo ou
   por cima do atual). O JSON restaura DADOS; o schema vem das
   migrações SQL (rodadas antes, num projeto novo).
   ============================================================ */

// Tabelas em ordem de dependência (pais antes dos filhos).
// A importação insere nesta ordem; a limpeza (restauração por cima)
// apaga na ordem inversa, para respeitar as chaves estrangeiras.
const _BK_TABELAS = [
  // base / independentes
  "usuarios", "responsavel_tecnico", "estabelecimento",
  "substancias", "prescritores", "fornecedores", "pacientes", "pops",
  // movimentos e filhos
  "prescricoes",
  "notas_fiscais", "nota_fiscal_itens",
  "doacoes", "doacao_itens",
  "medicacao_propria", "medicacao_propria_itens",
  "inventario_inicial", "dispensacoes", "devolucoes",
  "ajustes_estoque", "custodia_destinos",
  "cotacoes", "cotacao_itens", "cotacao_precos",
  "carrinho_emergencia", "carrinho_itens", "carrinho_historico",
];

const _BK_ASSINATURA = "reviva-backup";
const _BK_VERSAO = 1;

// ---- helper: baixa um texto como arquivo ----
function _bkDownload(nome, texto) {
  const blob = new Blob([texto], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nome;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

// ---- EXPORTAR ----
async function exportarBackup() {
  const btn = document.getElementById("bkExportBtn");
  if (btn) { btn.disabled = true; btn.textContent = "Exportando…"; }
  try {
    const tabelas = {};
    for (const t of _BK_TABELAS) {
      const { data, error } = await window.SB.from(t).select("*");
      if (error) throw new Error(`Tabela ${t}: ${error.message}`);
      tabelas[t] = data || [];
    }
    const est = window.ESTAB || {};
    const backup = {
      _meta: {
        assinatura: _BK_ASSINATURA,
        versao: _BK_VERSAO,
        geradoEm: new Date().toISOString(),
        estabelecimento: est.razao_social || est.nome_fantasia || "Hospital Reviva",
        totalRegistros: Object.values(tabelas).reduce((n, r) => n + r.length, 0),
        observacao: "Restaura DADOS. O schema (estrutura) vem das migrações SQL do repositório, executadas antes num projeto novo.",
      },
      tabelas,
    };
    const hoje = new Date().toISOString().slice(0, 10);
    _bkDownload(`reviva-backup-${hoje}.json`, JSON.stringify(backup, null, 2));
    _bkAviso(`Backup exportado: ${backup._meta.totalRegistros} registros de ${_BK_TABELAS.length} tabelas. Guarde este arquivo fora do Supabase (Google Drive, pen drive).`, "ok");
  } catch (e) {
    _bkAviso("Erro ao exportar: " + e.message, "erro");
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "⬇ Exportar backup (.json)"; }
  }
}

function _bkAviso(msg, tipo) {
  const el = document.getElementById("bkAviso");
  if (!el) { if (tipo === "erro") alert(msg); return; }
  el.style.display = "block";
  el.style.background = tipo === "erro" ? "#F7E3E1" : tipo === "ok" ? "#E7F0E3" : "";
  el.style.borderColor = tipo === "erro" ? "#e6b8b1" : "";
  el.textContent = msg;
}

// ---- IMPORTAR ----
function abrirImportarBackup() {
  const inp = document.getElementById("bkFile");
  if (inp) inp.click();
}

async function _bkArquivoSelecionado(input) {
  const file = input.files && input.files[0];
  input.value = ""; // permite reselecionar o mesmo arquivo depois
  if (!file) return;
  let dados;
  try {
    dados = JSON.parse(await file.text());
  } catch (e) {
    _bkAviso("Arquivo inválido: não é um JSON legível.", "erro"); return;
  }
  if (!dados || dados._meta?.assinatura !== _BK_ASSINATURA || !dados.tabelas) {
    _bkAviso("Este arquivo não parece um backup do Reviva.", "erro"); return;
  }
  // resumo do conteúdo
  const linhas = _BK_TABELAS
    .map((t) => ({ t, n: (dados.tabelas[t] || []).length }))
    .filter((x) => x.n > 0)
    .map((x) => `${x.t}: ${x.n}`).join(" · ");
  const total = dados._meta.totalRegistros ?? Object.values(dados.tabelas).reduce((n, r) => n + (r?.length || 0), 0);

  // há dados atualmente? (checa algumas tabelas-chave)
  const temDados = (substances?.length || patients?.length || prescriptions?.length || (window.ESTAB && Object.keys(window.ESTAB).length));

  const corpo = `
    <div class="note-box" style="margin-top:0">
      Backup de <b>${_esc(dados._meta.geradoEm ? dados._meta.geradoEm.slice(0, 10) : "?")}</b>
      · ${_esc(String(total))} registros · ${_esc(dados._meta.estabelecimento || "")}
    </div>
    <div style="font-size:12.5px;color:var(--muted);margin-bottom:12px">${_esc(linhas) || "sem registros"}</div>
    ${temDados ? `<div class="note-box" style="background:#F7E3E1;border-color:#e6b8b1">
      <b>Atenção:</b> este projeto já contém dados. A restauração <b>apaga tudo</b> e substitui pelo conteúdo do backup. Esta ação não pode ser desfeita.
      <br><br>Para confirmar, digite <b>RESTAURAR</b> abaixo:
      <input id="bkConfirma" style="width:100%;margin-top:8px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;font:inherit" placeholder="RESTAURAR">
    </div>` : `<div class="note-box">O projeto está vazio — os dados serão apenas inseridos, sem apagar nada.</div>`}
  `;
  abrirModal("Restaurar backup", corpo, async () => {
    if (temDados) {
      const c = document.getElementById("bkConfirma");
      if (!c || c.value.trim().toUpperCase() !== "RESTAURAR")
        throw new Error("Digite RESTAURAR para confirmar a substituição dos dados.");
    }
    await _bkImportar(dados, !!temDados);
  }, "Restaurar agora");
}

async function _bkImportar(dados, limparAntes) {
  // 1) limpar (na ordem inversa das dependências), se houver dados
  if (limparAntes) {
    for (const t of [..._BK_TABELAS].reverse()) {
      const { error } = await window.SB.from(t).delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw new Error(`Limpeza de ${t}: ${error.message}`);
    }
  }
  // 2) inserir (na ordem das dependências), em lotes
  let inseridos = 0;
  for (const t of _BK_TABELAS) {
    const rows = dados.tabelas[t] || [];
    if (!rows.length) continue;
    for (let i = 0; i < rows.length; i += 200) {
      const lote = rows.slice(i, i + 200);
      const { error } = await window.SB.from(t).insert(lote);
      if (error) throw new Error(`Inserção em ${t}: ${error.message}`);
      inseridos += lote.length;
    }
  }
  _bkAviso(`Restauração concluída: ${inseridos} registros. Recarregue a página para ver os dados.`, "ok");
  setTimeout(() => location.reload(), 1500);
}
