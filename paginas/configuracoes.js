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

    // Responsável Técnico (linha ativa)
    const rtData = {
      nome: _val("rtNome"), conselho: _val("rtConselho") || "CRF", uf: _val("rtUf"),
      numero_registro: _val("rtNumero"), autorizacao_mapa: _val("rtMapa"),
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
    <div class="note-box">Estes dados aparecem nos rodapés do sistema e nos relatórios impressos (Livro de Registro e BMPO). Preencha com seus dados reais — eles substituem qualquer identificação que antes ficava fixa no código.</div>

    <style>
      .cfg-grid{ display:grid; grid-template-columns:1fr 1fr; gap:14px 18px; }
      .cfg-field label{ display:block; font-size:12.5px; font-weight:600; margin:0 0 5px; color:var(--ink); }
      .cfg-field input{ width:100%; padding:9px 11px; border:1px solid var(--line); border-radius:8px; font:inherit; font-size:13.5px; background:#fff; }
      .cfg-field input:focus{ outline:none; border-color:var(--primary); box-shadow:0 0 0 3px rgba(44,95,90,.12); }
      .cfg-field.full{ grid-column:1 / -1; }
      @media (max-width:720px){ .cfg-grid{ grid-template-columns:1fr; } }
    </style>

    <div class="panel">
      <div class="panel-head"><div><div class="panel-title">Responsável Técnico</div><div class="panel-title-sub">Identificação usada nas assinaturas e rodapés</div></div></div>
      <div class="panel-body">
        <div class="cfg-grid">
          ${_campo("rtNome", "Nome completo", rt.nome, "Seu nome")}
          ${_campo("rtAssinatura", "Identificação / cargo (linha de assinatura)", rt.identificacao_assinatura, "Farmacêutico(a) Responsável Técnico")}
          ${_campo("rtConselho", "Conselho", rt.conselho || "CRF", "CRF")}
          ${_campo("rtUf", "UF", rt.uf, "GO")}
          ${_campo("rtNumero", "Número de registro", rt.numero_registro, "9303")}
          ${_campo("rtMapa", "Autorização MAPA (opcional)", rt.autorizacao_mapa, "")}
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
  `;
}
