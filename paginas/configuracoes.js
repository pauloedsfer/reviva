/* ============================================================
   paginas/configuracoes.js — Hospital Reviva
   Edição do Responsável Técnico e do estabelecimento (item 3).
   Estes dados alimentam TODOS os rodapés e relatórios — nada de
   RT hardcoded. Salva direto nas tabelas responsavel_tecnico e
   estabelecimento no Supabase.
   ============================================================ */

function _val(id) { const el = document.getElementById(id); return el ? el.value.trim() : ""; }

async function salvarConfig() {
  const btn = document.getElementById("btnSalvar");
  const aviso = document.getElementById("cfgAviso");
  btn.disabled = true; btn.textContent = "Salvando…";
  try {
    // Estabelecimento
    const estData = {
      razao_social: _val("estRazao"), nome_fantasia: _val("estFantasia"), cnpj: _val("estCnpj"),
      endereco: _val("estEndereco"), municipio_uf: _val("estMunicipio"),
      autorizacao_sanitaria: _val("estAutorizacao"), afe_anvisa: _val("estAfe"),
      licenca_numero: _val("estLicenca"),
    };
    if (window.ESTAB && window.ESTAB.id) {
      const { error } = await window.SB.from("estabelecimento").update(estData).eq("id", window.ESTAB.id);
      if (error) throw error;
    } else {
      const { error } = await window.SB.from("estabelecimento").insert(estData);
      if (error) throw error;
    }

    /* Responsável Técnico (linha ativa).
       Sem autorizacao_mapa: autorização do Ministério da Agricultura é exigência
       de farmácia veterinária, não de farmácia hospitalar. O campo existia na
       tela como "(opcional)" e nunca teve uso aqui — pedir um dado que o
       serviço não tem só gera dúvida sobre o que preencher. A coluna continua
       no banco, intocada: derrubá-la não traria ganho e apagaria o que
       estivesse gravado. */
    const rtData = {
      nome: _val("rtNome"), conselho: _val("rtConselho") || "CRF", uf: _val("rtUf"),
      numero_registro: _val("rtNumero"),
      identificacao_assinatura: _val("rtAssinatura"), ativo: true,
    };
    if (!rtData.nome || !rtData.uf || !rtData.numero_registro) {
      throw new Error("Preencha ao menos nome, UF e número de registro do RT.");
    }
    if (window.RT && window.RT.id) {
      const { error } = await window.SB.from("responsavel_tecnico").update(rtData).eq("id", window.RT.id);
      if (error) throw error;
    } else {
      const { error } = await window.SB.from("responsavel_tecnico").insert(rtData);
      if (error) throw error;
    }

    aviso.className = "note-box"; aviso.style.display = "block";
    aviso.innerHTML = "<b>Configuração salva.</b> Recarregando para aplicar em todos os rodapés e relatórios…";
    setTimeout(() => window.location.reload(), 900);
  } catch (e) {
    aviso.className = "note-box"; aviso.style.display = "block";
    aviso.style.borderColor = "#E7C3B9"; aviso.style.background = "#FBEAE6";
    aviso.innerHTML = "<b>Erro ao salvar:</b> " + (e.message || e);
    btn.disabled = false; btn.textContent = "Salvar configuração";
  }
}

function _campo(id, label, valor, ph, full) {
  return `<div class="cfg-field${full ? " full" : ""}">
    <label for="${id}">${label}</label>
    <input id="${id}" type="text" value="${(valor || "").replace(/"/g, "&quot;")}" placeholder="${ph || ""}">
  </div>`;
}

function renderPage() {
  const rt = window.RT || {};
  const est = window.ESTAB || {};
  return `
    <div class="note-box">Estes dados aparecem nos rodapés do sistema e nos relatórios impressos (Livro de Registro). Preencha com seus dados reais — eles substituem qualquer identificação que antes ficava fixa no código.</div>

    <style>
      .cfg-grid{ display:grid; grid-template-columns:1fr 1fr; gap:14px 18px; }
      .cfg-field label{ display:block; font-size:12.5px; font-weight:600; margin:0 0 5px; color:var(--ink); }
      .cfg-field input{ width:100%; padding:9px 11px; border:1px solid var(--line); border-radius:8px; font:inherit; font-size:13.5px; background:#fff; }
      .cfg-field input:focus{ outline:none; border-color:var(--primary); box-shadow:0 0 0 3px rgba(44,95,90,.12); }
      .cfg-field.full{ grid-column:1 / -1; }
      @media (max-width:720px){ .cfg-grid{ grid-template-columns:1fr; } }
    </style>

    ${(() => {
      const f = (window.ESTAB || {}).fechamento_ate;
      return `<div class="panel">
        <div class="panel-head"><div>
          <div class="panel-title">Fechamento da escrituração</div>
          <div class="panel-title-sub">Trava lançamentos no período já escriturado e transmitido</div></div></div>
        <div class="panel-body">
          <div class="note-box" style="margin-top:0">Depois de concluir a conferência de saldos do mês, trave o período: lançamentos com data até o fechamento deixam de ser aceitos, preservando o que já foi escriturado. Correções passam a ser feitas no mês aberto.</div>
          <div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap">
            <div><label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px">Fechado até</label>
              <input id="cfgFech" type="date" value="${f || ""}" style="padding:8px 10px;border:1px solid var(--line);border-radius:8px;font:inherit"></div>
            <button class="btn sm" onclick="salvarFechamento()">Salvar fechamento</button>
            ${f ? `<button class="btn ghost sm" onclick="salvarFechamento(true)">Reabrir período</button>` : ""}
          </div>
          ${f ? `<div class="note-box" style="margin-bottom:0;background:#FBF3E3;border-color:#e8d9b0">Período fechado até <b>${fmtDate(f)}</b>. Lançamentos até essa data estão bloqueados.</div>` : ""}
        </div>
      </div>`;
    })()}
    <div class="panel">
      <div class="panel-head"><div>
        <div class="panel-title">Segurança — bloqueio por inatividade</div>
        <div class="panel-title-sub">Encerra a sessão sozinho quando o sistema fica aberto sem uso</div></div></div>
      <div class="panel-body">
        <div class="note-box" style="margin-top:0">Tela aberta e destravada numa sala de passagem é acesso de quem passar por ali — dispensação, ajuste de estoque e prontuário no seu login. Um minuto antes de encerrar aparece um aviso com contagem regressiva, e basta um clique para continuar.</div>
        <div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap">
          <div><label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px">Encerrar após</label>
            <select id="cfgInat" onchange="definirInatividadeMin(this.value); _cfgAvisoInat()" style="padding:8px 10px;border:1px solid var(--line);border-radius:8px;font:inherit">
              ${[5, 10, 15, 30, 60].map((m) => `<option value="${m}"${inatividadeMin() === m ? " selected" : ""}>${m} minutos sem uso</option>`).join("")}
              <option value="0"${inatividadeMin() === 0 ? " selected" : ""}>Desligado (não recomendado)</option>
            </select></div>
          <div class="note-box" style="margin:0;flex:1;min-width:220px">Este ajuste vale <b>só neste aparelho e navegador</b>. O computador da farmácia pede um tempo menor que o seu celular.</div>
        </div>
        <div id="cfgInatOk" style="display:none;font-size:13px;color:var(--primary);margin-top:8px">Ajuste salvo neste aparelho.</div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head"><div><div class="panel-title">Responsável Técnico</div><div class="panel-title-sub">Identificação usada nas assinaturas e rodapés</div></div></div>
      <div class="panel-body">
        <div class="cfg-grid">
          ${_campo("rtNome", "Nome completo", rt.nome, "Seu nome")}
          ${_campo("rtAssinatura", "Identificação / cargo (linha de assinatura)", rt.identificacao_assinatura, "Farmacêutico(a) Responsável Técnico")}
          ${_campo("rtConselho", "Conselho", rt.conselho || "CRF", "CRF")}
          ${_campo("rtUf", "UF", rt.uf, "GO")}
          ${_campo("rtNumero", "Número de registro", rt.numero_registro, "9303")}
        </div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head"><div><div class="panel-title">Estabelecimento</div><div class="panel-title-sub">Cabeçalho dos relatórios enviados/apresentados à fiscalização</div></div></div>
      <div class="panel-body">
        <div class="cfg-grid">
          ${_campo("estRazao", "Razão social", est.razao_social, "")}
          ${_campo("estFantasia", "Nome fantasia", est.nome_fantasia, "Hospital Reviva")}
          ${_campo("estCnpj", "CNPJ", est.cnpj, "00.000.000/0000-00")}
          ${_campo("estMunicipio", "Município / UF", est.municipio_uf, "Anápolis/GO")}
          ${_campo("estEndereco", "Endereço", est.endereco, "", true)}
          ${_campo("estAutorizacao", "Autorização Sanitária", est.autorizacao_sanitaria, "")}
          ${_campo("estAfe", "AFE ANVISA (se houver)", est.afe_anvisa, "")}
          ${_campo("estLicenca", "Nº de licença", est.licenca_numero, "")}
        </div>
        <div style="margin-top:20px; display:flex; align-items:center; gap:16px;">
          <button class="btn" id="btnSalvar" onclick="salvarConfig()">Salvar configuração</button>
          <div class="note-box" id="cfgAviso" style="display:none; margin:0; flex:1;"></div>
        </div>
      </div>
    </div>

    ${_painelInsumosAplicacao()}

    <div class="panel">
      <div class="panel-head"><div><div class="panel-title">Backup e Segurança</div><div class="panel-title-sub">Cópia de segurança de todos os dados, guardada fora do Supabase</div></div></div>
      <div class="panel-body">
        <div class="note-box" style="margin-top:0">Exporte um backup com frequência (ex.: toda semana) e guarde o arquivo no Google Drive ou num pen drive. Se o Supabase ficar indisponível ou o projeto for perdido, você recria a estrutura com as migrações SQL e restaura os dados por este arquivo. Lembre-se: o registro <b>oficial</b> da escrituração continua sendo o Livro e os mapas <b>impressos e assinados</b>.</div>
        <div style="display:flex; flex-wrap:wrap; gap:12px; align-items:center; margin-top:6px">
          <button class="btn" id="bkExportBtn" onclick="exportarBackup()">⬇ Exportar backup (.json)</button>
          <button class="btn ghost" onclick="abrirImportarBackup()">⬆ Restaurar de um arquivo…</button>
          <input type="file" id="bkFile" accept="application/json,.json" style="display:none" onchange="_bkArquivoSelecionado(this)">
        </div>
        <div class="note-box" id="bkAviso" style="display:none; margin-top:14px"></div>
      </div>
    </div>
  `;
}


/* ============================================================
   INSUMO CONSUMIDO POR APLICAÇÃO

   A regra é por GRUPO (SERINGA, AGULHA): um item do grupo sai por aplicação
   de injetável, na conta do paciente. O padrão é o que vem marcado na hora
   da dispensação; os outros ficam no seletor porque o calibre é escolha do
   enfermeiro no momento da aplicação.

   Grupo sem padrão não lança nada — é como se deixa a AGULHA cadastrada e
   desligada até escolher o calibre, sem precisar apagar os itens.

   Álcool 70% e algodão NÃO entram aqui, de propósito: frasco de 1 L e rolo
   de 500 g não têm dose por aplicação, e qualquer quantidade por paciente
   seria inventada. Esses saem por centro de custo, na requisição do setor.
   ============================================================ */
function _insGrupos() {
  const g = {};
  insumosAplicacao.forEach((i) => { (g[i.grupo] = g[i.grupo] || []).push(i); });
  Object.keys(g).forEach((k) => g[k].sort((a, b) => a.ordem - b.ordem ||
    (subById(a.insumoId).nome || "").localeCompare(subById(b.insumoId).nome || "", "pt-BR")));
  return g;
}

function _painelInsumosAplicacao() {
  const grupos = _insGrupos();
  const nomes = Object.keys(grupos).sort(ordenaGrupoInsumo);
  const corpo = !nomes.length
    ? `<div class="note-box" style="margin:0;background:#FBF3E3;border-color:#e8d9b0">
        <b>Nenhuma regra cadastrada.</b> Se você ainda não rodou a migração <span class="mono">db/migration_insumos_aplicacao.sql</span> no Supabase, rode-a primeiro — ela cria a tabela e já traz as seringas cadastradas. Depois use <b>+ Adicionar item</b>.</div>`
    : nomes.map((nome) => {
        const itens = grupos[nome];
        const semPadrao = !itens.some((i) => i.padrao && i.ativo);
        return `<div style="border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
            <div><b>${_esc(nome)}</b> <span style="color:var(--muted);font-size:12px">· ${itens.length} item(ns)</span></div>
            ${semPadrao ? `<span class="tag" style="background:#FBF3E3;color:#B07A2F">sem padrão — não lança</span>` : ""}
          </div>
          <table style="margin-top:8px">
            <thead><tr><th>Item</th><th>Qtd.</th><th>Saldo</th><th>Vale para</th><th></th></tr></thead>
            <tbody>${itens.map((i) => {
              const s = subById(i.insumoId);
              const em = saldo(i.insumoId);
              return `<tr${i.ativo ? "" : ' style="opacity:.5"'}>
                <td><b>${_esc(s.nome)}</b>${i.padrao ? ` <span class="tag" style="background:var(--primary-tint);color:var(--primary-dark)">PADRÃO</span>` : ""}${i.ativo ? "" : ` <span class="tag" style="background:#F1F3F1;color:#6a736e">inativo</span>`}</td>
                <td class="num mono">${fmtDose(i.qtd)}</td>
                <td class="num mono"${em <= 0 ? ' style="color:#B04A3F"' : ""}>${fmtDose(em)}</td>
                <td style="color:var(--muted)">${i.subId ? _esc(subById(i.subId).nome) : "todo injetável"}</td>
                <td style="text-align:right;white-space:nowrap">
                  ${i.padrao ? "" : `<button class="btn ghost sm" onclick="definirInsumoPadrao('${i.id}')">Tornar padrão</button>`}
                  <button class="btn ghost sm" onclick="abrirFormInsumo('${i.id}')">Editar</button>
                  <button class="btn ghost sm" onclick="excluirInsumo('${i.id}')">Excluir</button>
                </td></tr>`;
            }).join("")}</tbody>
          </table>
        </div>`;
      }).join("");

  return `<div class="panel">
    <div class="panel-head">
      <div><div class="panel-title">Insumo por aplicação de injetável</div>
        <div class="panel-title-sub">Seringa e agulha lançadas na conta do paciente a cada aplicação</div></div>
      <div class="toolbar"><button class="btn sm" onclick="abrirFormInsumo()">+ Adicionar item</button></div>
    </div>
    <div class="panel-body">
      <div class="note-box" style="margin-top:0">Sai <b>um item de cada grupo por aplicação</b>, não um por medicamento: Haldol e Fenergan aplicados juntos consomem uma seringa só. Na dispensação o padrão já vem marcado e pode ser trocado, porque quem escolhe o calibre é o enfermeiro na hora.
        <div style="margin-top:6px">Álcool 70% e algodão ficam de fora: frasco de 1 L e rolo de 500 g não têm dose por aplicação, e lançar um número inventado na conta de um paciente é pior do que não lançar. Esses saem por <b>centro de custo</b>, na requisição da enfermagem.</div></div>
      ${corpo}
    </div>
  </div>`;
}

function abrirFormInsumo(id) {
  const i = id ? insumosAplicacao.find((x) => x.id === id) : null;
  const mats = subsMateriais().sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  if (!mats.length) { alert("Nenhum material cadastrado.\n\nCadastre a seringa e a agulha em Estoque, com tipo \"material\", antes de criar a regra."); return; }
  const grupos = [...new Set([...Object.keys(_insGrupos()), "SERINGA", "AGULHA"])].sort(ordenaGrupoInsumo);
  abrirModal(id ? "Editar item de insumo" : "Novo item de insumo", `
    <div class="ff row2">
      <div><label>Grupo *</label>
        <select id="insGrupo">${grupos.map((g) => `<option value="${_esc(g)}"${i && i.grupo === g ? " selected" : ""}>${_esc(g)}</option>`).join("")}
          <option value="__novo__">+ Novo grupo…</option></select>
        <div class="dica">Um item de cada grupo sai por aplicação.</div></div>
      <div><label>Quantidade por aplicação *</label>
        <input id="insQtd" type="number" min="0.25" step="0.25" value="${i ? i.qtd : 1}"></div>
    </div>
    <div class="ff" id="insGrupoNovoBloco" style="display:none"><label>Nome do novo grupo</label>
      <input id="insGrupoNovo" placeholder="Ex.: EQUIPO" style="text-transform:uppercase"></div>
    <div class="ff"><label>Material *</label>
      <select id="insMat">${mats.map((m) => `<option value="${m.id}"${i && i.insumoId === m.id ? " selected" : ""}>${_esc(m.nome)} · saldo ${fmtDose(saldo(m.id))}</option>`).join("")}</select></div>
    <div class="ff"><label>Vale para</label>
      <select id="insSub">
        <option value="">Todo injetável (regra geral)</option>
        ${subsMedicamentos().filter((s) => ehInjetavel(s)).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
          .map((s) => `<option value="${s.id}"${i && i.subId === s.id ? " selected" : ""}>Somente ${_esc(s.nome)}</option>`).join("")}
      </select>
      <div class="dica">A regra de um medicamento <b>substitui</b> a regra geral daquele grupo — é o escape para o decanoato, que pede agulha mais longa.</div></div>
    <div class="ff row2">
      <div><label>Padrão do grupo</label>
        <select id="insPadrao">
          <option value="1"${i && i.padrao ? " selected" : ""}>Sim — já vem marcado na dispensação</option>
          <option value="0"${i && i.padrao ? "" : " selected"}>Não — fica como opção no seletor</option>
        </select></div>
      <div><label>Situação</label>
        <select id="insAtivo">
          <option value="1"${!i || i.ativo ? " selected" : ""}>Ativo</option>
          <option value="0"${i && !i.ativo ? " selected" : ""}>Inativo</option>
        </select></div>
    </div>
    <div class="ff"><label>Ordem no seletor</label>
      <input id="insOrdem" type="number" step="1" value="${i ? i.ordem : 0}">
      <div class="dica">As seringas vêm ordenadas pelo calibre (3, 5, 10, 20), para o seletor sair na ordem que você procura.</div></div>`,
    async () => {
      let grupo = fv("insGrupo");
      if (grupo === "__novo__") grupo = fv("insGrupoNovo").toUpperCase();
      if (!grupo) throw new Error("Informe o grupo.");
      const dados = {
        grupo, insumo_id: fv("insMat"), quantidade: Math.max(0.25, fvNum("insQtd") || 1),
        padrao: fv("insPadrao") === "1", ativo: fv("insAtivo") === "1",
        substancia_id: fvOrNull("insSub"), forma: "injetavel",
        ordem: fvNum("insOrdem") || 0,
      };
      if (!dados.insumo_id) throw new Error("Escolha o material.");
      /* Um padrão por grupo: o banco tem índice único para isso e recusaria o
         segundo. Em vez de devolver erro de constraint, o anterior é
         rebaixado aqui — é o que o usuário quer dizer ao marcar outro. */
      if (dados.padrao) await _insLimpaPadrao(grupo, dados.substancia_id, id);
      if (id) {
        const { error } = await window.SB.from("insumos_aplicacao").update(dados).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await window.SB.from("insumos_aplicacao").insert(dados);
        if (error) throw error;
      }
    }, id ? "Salvar alterações" : "Adicionar item");
  const sel = document.getElementById("insGrupo");
  if (sel) sel.onchange = () => {
    document.getElementById("insGrupoNovoBloco").style.display = sel.value === "__novo__" ? "" : "none";
  };
}

async function _insLimpaPadrao(grupo, subId, exceto) {
  const alvos = insumosAplicacao.filter((x) => x.grupo === grupo && x.padrao &&
    (x.subId || null) === (subId || null) && x.id !== exceto);
  for (const a of alvos) {
    const { error } = await window.SB.from("insumos_aplicacao").update({ padrao: false }).eq("id", a.id);
    if (error) throw error;
  }
}

async function definirInsumoPadrao(id) {
  const i = insumosAplicacao.find((x) => x.id === id); if (!i) return;
  try {
    await _insLimpaPadrao(i.grupo, i.subId, id);
    const { error } = await window.SB.from("insumos_aplicacao").update({ padrao: true, ativo: true }).eq("id", id);
    if (error) throw error;
    await recarregarTela();
  } catch (e) { alert("Erro: " + (e.message || e)); }
}

async function excluirInsumo(id) {
  const i = insumosAplicacao.find((x) => x.id === id); if (!i) return;
  /* Excluir a regra não mexe nas saídas já lançadas: elas são linhas de
     dispensacoes e continuam na conta do paciente, como têm de continuar. */
  if (!confirm(`Tirar ${subById(i.insumoId).nome} do grupo ${i.grupo}?\n\n` +
    `As seringas já lançadas continuam nas contas dos pacientes — isto só muda o que será lançado daqui para frente.`)) return;
  const { error } = await window.SB.from("insumos_aplicacao").delete().eq("id", id);
  if (error) { alert("Erro ao excluir: " + error.message); return; }
  await recarregarTela();
}

/* Fechamento da escrituração: trava o período já transmitido. */
async function salvarFechamento(reabrir) {
  const v = reabrir ? null : (fv("cfgFech") || null);
  if (!reabrir && !v) { alert("Informe a data até a qual a escrituração está fechada."); return; }
  if (reabrir && !confirm("Reabrir o período?\n\nLançamentos retroativos voltam a ser aceitos. Faça isso apenas se a escrituração do período ainda não foi encerrada.")) return;
  const est = window.ESTAB || {};
  if (!est.id) { alert("Configure os dados do estabelecimento antes."); return; }
  const { error } = await window.SB.from("estabelecimento").update({ fechamento_ate: v }).eq("id", est.id);
  if (error) { alert("Erro: " + error.message); return; }
  window.ESTAB.fechamento_ate = v;
  await recarregarTela();
}

function _cfgAvisoInat() {
  const el = document.getElementById("cfgInatOk");
  if (!el) return;
  el.style.display = "block";
  setTimeout(() => { el.style.display = "none"; }, 2500);
}
