/* ============================================================
   relatorios.js — Hospital Reviva
   Geração da versão IMPRESSA (limpa) do Livro de Registro e do
   BMPO para apresentação à fiscalização. Abre um documento A4
   autossuficiente, com cabeçalho do estabelecimento e rodapé de
   identificação/assinatura do RT repetido em cada página.
   A escrituração oficial permanece no livro físico; isto organiza
   os dados numa versão apresentável.
   ============================================================ */

function _esc(s) { return String(s == null ? "" : s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])); }

function imprimirRelatorio(titulo, subtitulo, corpoHTML) {
  const est = window.ESTAB || {};
  const rt = window.RT || {};
  const rtLinhaTxt = rt.nome ? `${rt.nome} — ${rt.conselho}-${rt.uf} ${rt.numero_registro}` : "Responsável Técnico não configurado";
  const hoje = new Date().toLocaleDateString("pt-BR");

  const cabecalhoEstab = `
    <div class="rl-estab">
      <div class="rl-estab-nome">${_esc(est.razao_social || est.nome_fantasia || "Estabelecimento não configurado")}</div>
      <div class="rl-estab-linha">
        ${est.cnpj ? "CNPJ: " + _esc(est.cnpj) + " · " : ""}${_esc(est.endereco || "")}${est.municipio_uf ? " — " + _esc(est.municipio_uf) : ""}
      </div>
      ${est.autorizacao_sanitaria ? `<div class="rl-estab-linha">Autorização Sanitária: ${_esc(est.autorizacao_sanitaria)}${est.afe_anvisa ? " · AFE: " + _esc(est.afe_anvisa) : ""}</div>` : ""}
    </div>`;

  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${_esc(titulo)}</title>
  <style>
    @page { size: A4 portrait; margin: 16mm 12mm 26mm 12mm; }
    * { box-sizing: border-box; }
    body { font-family: "Public Sans", Arial, sans-serif; color:#1E2A28; font-size:11px; margin:0; }
    .rl-estab { border-bottom:2px solid #2C5F5A; padding-bottom:8px; margin-bottom:6px; }
    .rl-estab-nome { font-size:15px; font-weight:700; }
    .rl-estab-linha { font-size:10.5px; color:#4a544f; margin-top:2px; }
    h1 { font-size:14px; margin:10px 0 2px; }
    .rl-sub { font-size:10.5px; color:#6a736e; margin-bottom:10px; }
    table { width:100%; border-collapse:collapse; margin-top:6px; }
    th, td { border:1px solid #cfd6cf; padding:4px 6px; text-align:left; vertical-align:top; }
    th { background:#EEF2EC; font-size:10px; text-transform:uppercase; letter-spacing:.03em; }
    td.num, th.num { text-align:right; font-variant-numeric:tabular-nums; }
    .mono { font-family:"IBM Plex Mono", monospace; }
    .rl-assinatura { margin-top:40px; page-break-inside:avoid; }
    .rl-assinatura .linha { border-top:1px solid #1E2A28; width:320px; margin-top:34px; padding-top:5px; font-size:10.5px; }
    /* Rodapé ESTÁTICO, uma única vez ao final do documento.
       Era position:fixed para repetir em todas as páginas, mas em impressão
       o navegador reposiciona o elemento fixo e ele acabava sobrepondo o
       conteúdo — no alto das páginas seguintes. Como a assinatura do RT já
       fecha o documento, o rodapé único resolve sem risco de quebra. */
    .rl-footer {
      margin-top:18px; font-size:9px; color:#4a544f;
      border-top:1px solid #cfd6cf; padding-top:4px; display:flex; justify-content:space-between; gap:12px;
      page-break-inside:avoid; break-inside:avoid;
    }
    .rl-footer .assina { white-space:nowrap; }
    @media screen {
      body { background:#f0efe8; }
      .sheet { background:#fff; max-width:800px; margin:20px auto; padding:24px; box-shadow:0 2px 16px rgba(0,0,0,.1); }
      .rl-print-btn { position:fixed; top:16px; right:16px; background:#2C5F5A; color:#fff; border:none;
        padding:10px 16px; border-radius:8px; font-size:13px; cursor:pointer; font-family:inherit; }
    }
    @media print {
      .rl-print-btn { display:none; }
      .sheet { padding:0; }
      /* O rodapé é fixo e se repete em toda página. Em impressão, "fixed" é
         posicionado a partir da ÁREA DE CONTEÚDO — com bottom positivo ele
         cai por cima das últimas linhas da tabela. O deslocamento negativo
         o joga para dentro da margem inferior reservada no @page,
         liberando a área útil inteira para o conteúdo. */
      /* nenhuma linha é partida entre páginas */
      tr, td, th { break-inside:avoid; page-break-inside:avoid; }
      /* o cabeçalho da tabela se repete no alto de cada página */
      thead { display:table-header-group; }
      tfoot { display:table-footer-group; }
      /* título não fica órfão no pé da página */
      h1, h2, h3 { break-after:avoid; page-break-after:avoid; }
    }
  </style></head>
  <body>
    <button class="rl-print-btn" onclick="window.print()">Imprimir / Salvar PDF</button>
    <div class="sheet">
      ${cabecalhoEstab}
      <h1>${_esc(titulo)}</h1>
      <div class="rl-sub">${_esc(subtitulo || "")}</div>
      ${corpoHTML}
      <div class="rl-assinatura">
        <div class="linha">${_esc(rtLinhaTxt)}<br>Farmacêutico(a) Responsável Técnico</div>
      </div>
    </div>
    <div class="rl-footer">
      <span>RT: ${_esc(rtLinhaTxt)}</span>
      <span class="assina">Assinatura: __________________________  ·  Data: ___/___/______  ·  Emitido em ${hoje}</span>
    </div>
  </body></html>`;

  const win = window.open("", "_blank");
  if (!win) { alert("O navegador bloqueou a janela de impressão. Permita pop-ups para este site."); return; }
  win.document.open();
  win.document.write(html);
  win.document.close();
}
