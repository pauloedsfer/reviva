/* ============================================================
   paginas/pacientes.js — Hospital Reviva
   Lista + cadastro/edição de pacientes.
   ============================================================ */

function _formPaciente(p) {
  p = p || {};
  const presc = prescritores.map((x) => `<option value="${x.id}"${x.id === p.prescritorId ? " selected" : ""}>${x.nome} (${x.conselho}-${x.uf} ${x.numero})</option>`).join("");
  return `
    <div class="ff"><label>Nome completo *</label><input id="pNome" value="${(p.nome || "").replace(/"/g, "&quot;")}"></div>
    <div class="ff row2">
      <div><label>CPF</label><input id="pCpf" value="${p.cpf || ""}" placeholder="000.000.000-00"></div>
      <div><label>Nascimento</label><input id="pNasc" type="date" value="${p.dataNascimento || ""}"></div>
    </div>
    <div class="ff row2">
      <div><label>Prontuário</label><input id="pPront" value="${p.prontuario || ""}"></div>
      <div><label>Leito</label><input id="pLeito" value="${p.leito || ""}" placeholder="Q-01"></div>
    </div>
    <div class="ff"><label>Endereço</label><input id="pEnd" value="${(p.endereco || "").replace(/"/g, "&quot;")}"></div>
    <div class="ff row2">
      <div><label>Telefone</label><input id="pTel" value="${p.telefone || ""}"></div>
      <div><label>Admissão *</label><input id="pAdm" type="date" value="${p.admissao || new Date().toISOString().slice(0,10)}"></div>
    </div>
    <div class="ff"><label>Prescritor responsável</label><select id="pPresc"><option value="">— selecione —</option>${presc}</select></div>
  `;
}

function abrirFormPaciente(id) {
  const p = id ? patients.find((x) => x.id === id) : null;
  abrirModal(id ? "Editar paciente" : "Novo paciente", _formPaciente(p), async () => {
    const nome = fv("pNome"); const adm = fv("pAdm");
    if (!nome) throw new Error("Informe o nome completo.");
    if (!adm) throw new Error("Informe a data de admissão.");
    const dados = {
      nome_completo: nome, cpf: fvOrNull("pCpf"), data_nascimento: fvOrNull("pNasc"),
      prontuario: fvOrNull("pPront"), leito: fvOrNull("pLeito"), endereco: fvOrNull("pEnd"),
      telefone: fvOrNull("pTel"), data_admissao: adm, prescritor_id: fvOrNull("pPresc"),
    };
    if (id) {
      const { error } = await window.SB.from("pacientes").update(dados).eq("id", id);
      if (error) throw error;
    } else {
      const { error } = await window.SB.from("pacientes").insert({ ...dados, ...usuarioId() });
      if (error) throw error;
    }
  }, id ? "Salvar alterações" : "Cadastrar paciente");
}

function renderPage() {
  return `
    <div class="panel">
      <div class="panel-head">
        <div><div class="panel-title">Pacientes ativos</div><div class="panel-title-sub">${patients.length} de ${CAPACIDADE_TOTAL} leitos ocupados</div></div>
        <button class="btn sm" onclick="abrirFormPaciente()">+ Novo paciente</button>
      </div>
      <div class="panel-body">
        <table>
          <thead><tr><th>Paciente</th><th>Leito</th><th>Admissão</th><th>Dias internado</th><th>Prescritor</th><th>Custo até agora</th><th></th></tr></thead>
          <tbody>
            ${patients.map(p=>{
              const dias = diasInternado(p);
              const custo = custoTotalPaciente(p);
              return `<tr>
                <td><b>${p.nome}</b></td>
                <td class="mono">${p.leito || "—"}</td>
                <td class="mono">${fmtDate(p.admissao)}</td>
                <td class="num mono">${dias}</td>
                <td style="color:var(--muted)">${p.prescritor || "—"}</td>
                <td class="num mono"><b>${fmtBRL(custo)}</b></td>
                <td><button class="btn ghost sm" onclick="abrirFormPaciente('${p.id}')">Editar</button></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
    <div class="note-box">Custo = diária de internação (${fmtBRL(DIARIA_INTERNACAO)}/dia, valor ilustrativo) + medicamentos efetivamente dispensados. Detalhamento em <b>Custos &amp; Indicadores</b>.</div>
  `;
}
