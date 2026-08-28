/* ============================================================
   perfil.js — Hospital Reviva
   Modo somente leitura para o setor administrativo.

   IMPORTANTE — o que este arquivo é e o que NÃO é:
   ele é CONFORTO, não segurança. Esconde botões e avisa antes
   de o usuário tentar algo que o banco vai recusar. A proteção
   de verdade está nas políticas de RLS (db/migration_perfil_leitura.sql):
   mesmo que alguém apague este script pelo console, o banco
   continua recusando qualquer escrita de quem não é RT.

   Carregar DEPOIS de supabase.js e ANTES de layout.js.
   ============================================================ */

window.PERFIL = null;          // "rt" | "leitura" | null (não cadastrado)

async function carregarPerfil() {
  try {
    const s = await getSession();
    if (!s) { window.PERFIL = null; return null; }
    const { data, error } = await window.SB
      .from("perfis_acesso").select("perfil").eq("usuario_id", s.user.id).maybeSingle();
    if (error) throw error;
    // sem cadastro = sem escrita. O padrão é o acesso mais restrito.
    window.PERFIL = data && data.perfil ? data.perfil : "leitura";
  } catch (e) {
    window.PERFIL = "leitura";
  }
  return window.PERFIL;
}

function podeEditar() { return window.PERFIL === "rt"; }

/* ------------------------------------------------------------
   Trava na camada de dados.
   Envolve o cliente Supabase para que qualquer insert/update/
   delete/upsert em modo leitura pare aqui, com uma mensagem em
   português, em vez de chegar ao banco e voltar como
   "violates row-level security policy".
   ------------------------------------------------------------ */
function aplicarTravaLeitura() {
  if (podeEditar() || window.__travaLeitura) return;
  window.__travaLeitura = true;

  const MSG = "Este login é somente leitura. Consulta e impressão de relatórios " +
              "estão liberadas; lançamentos são exclusivos do farmacêutico responsável.";

  // `usuarios` fica de fora: o app grava a própria linha do usuário a
  // cada login (ensureUsuario), para registrar quem lançou o quê. Sem
  // esta exceção, todo login de leitura abriria um alerta a cada tela.
  // A RLS permite exatamente isso — a própria linha e nada mais.
  const LIVRES = ["usuarios"];

  const from = window.SB.from.bind(window.SB);
  window.SB.from = function (tabela) {
    const q = from(tabela);
    if (LIVRES.indexOf(tabela) !== -1) return q;
    ["insert", "update", "delete", "upsert"].forEach((m) => {
      q[m] = function () { alert(MSG); throw new Error(MSG); };
    });
    return q;
  };

  const rpc = window.SB.rpc.bind(window.SB);
  const RPC_LEITURA = [];   // nenhuma rpc de escrita liberada
  window.SB.rpc = function (nome, args) {
    if (RPC_LEITURA.indexOf(nome) === -1) { alert(MSG); throw new Error(MSG); }
    return rpc(nome, args);
  };
}

/* ------------------------------------------------------------
   Camada visual: faixa de identificação e sumiço dos controles
   de escrita. Roda depois que a tela é montada.
   ------------------------------------------------------------ */
const PAGINAS_SO_ESCRITA = ["ajustes", "configuracoes"];

function marcarModoLeitura() {
  if (podeEditar()) return;
  document.body.classList.add("modo-leitura");

  if (!document.getElementById("cssModoLeitura")) {
    const st = document.createElement("style");
    st.id = "cssModoLeitura";
    st.textContent = `
      .modo-leitura .btn-primary,
      .modo-leitura button[type="submit"],
      .modo-leitura .btn-danger,
      .modo-leitura [data-escrita] { display: none !important; }
      .modo-leitura input:not([type="search"]):not([data-filtro]),
      .modo-leitura select:not([data-filtro]),
      .modo-leitura textarea { pointer-events: none; background: #f4f6f4; color: #6a736e; }
      .faixa-leitura {
        background: #EAF2F0; border: 1px solid #C7DAD6; color: #204b46;
        border-radius: 10px; padding: 10px 14px; margin-bottom: 16px;
        font-size: 13.5px; line-height: 1.5;
      }
      @media print { .faixa-leitura { display: none; } }
    `;
    document.head.appendChild(st);
  }

  const alvo = document.querySelector("main") || document.body;
  if (alvo && !document.querySelector(".faixa-leitura")) {
    const d = document.createElement("div");
    d.className = "faixa-leitura";
    d.innerHTML = "<b>Acesso de consulta.</b> Você pode navegar, conferir e imprimir " +
                  "qualquer relatório. Lançamentos e alterações são exclusivos do " +
                  "farmacêutico responsável técnico.";
    alvo.insertBefore(d, alvo.firstChild);
  }

  // some com os itens de menu que só servem para lançar
  PAGINAS_SO_ESCRITA.forEach((id) => {
    const a = document.querySelector(`.nav-item[href="${id}.html"]`);
    if (a) a.style.display = "none";
  });
}

/* ============================================================
   Troca de senha pelo próprio usuário.
   Evita depender de e-mail: o Supabase só envia link de
   recuperação se houver SMTP configurado, e o SMTP padrão é
   limitado demais para uso real. Aqui a pessoa já está logada,
   então basta `updateUser` — não precisa de e-mail nenhum.
   ============================================================ */
function abrirTrocaSenha() {
  if (document.getElementById("boxSenha")) return;
  const d = document.createElement("div");
  d.id = "boxSenha";
  d.style.cssText = "position:fixed;inset:0;background:rgba(20,28,26,.55);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px";
  d.innerHTML = `
    <div style="background:#fff;border-radius:14px;max-width:420px;width:100%;padding:26px 28px;box-shadow:0 18px 50px rgba(0,0,0,.3);font-family:'Public Sans',Arial,sans-serif">
      <div style="font-size:17px;font-weight:700;color:#1E2A28;margin-bottom:6px">Alterar minha senha</div>
      <div style="font-size:13px;color:#6a736e;line-height:1.5;margin-bottom:16px">
        Mínimo de 8 caracteres. Use uma senha que você não utilize em outro serviço.
      </div>
      <input id="s1" type="password" autocomplete="new-password" placeholder="Nova senha"
             style="width:100%;padding:10px 12px;border:1px solid #cfd6cf;border-radius:9px;font:inherit;margin-bottom:10px">
      <input id="s2" type="password" autocomplete="new-password" placeholder="Repita a nova senha"
             style="width:100%;padding:10px 12px;border:1px solid #cfd6cf;border-radius:9px;font:inherit">
      <div id="sMsg" style="font-size:13px;margin-top:10px;min-height:18px"></div>
      <div style="display:flex;gap:10px;margin-top:14px">
        <button id="sOk" style="background:#2C5F5A;color:#fff;border:none;padding:10px 16px;border-radius:9px;cursor:pointer;font:inherit;font-weight:600">Salvar</button>
        <button id="sNao" style="background:transparent;color:#6a736e;border:1px solid #cfd6cf;padding:10px 16px;border-radius:9px;cursor:pointer;font:inherit">Cancelar</button>
      </div>
    </div>`;
  document.body.appendChild(d);

  const msg = (t, cor) => { const m = document.getElementById("sMsg"); m.textContent = t; m.style.color = cor || "#b03030"; };
  document.getElementById("sNao").onclick = () => d.remove();
  document.getElementById("sOk").onclick = async () => {
    const a = document.getElementById("s1").value, b = document.getElementById("s2").value;
    if (a.length < 8) return msg("A senha precisa ter ao menos 8 caracteres.");
    if (a !== b) return msg("As duas senhas não conferem.");
    msg("Salvando...", "#6a736e");
    // updateUser vale para qualquer perfil: alterar a PRÓPRIA senha
    // não é escrita no banco de dados da farmácia, e por isso passa
    // pela trava de leitura sem problema.
    const { error } = await window.SB.auth.updateUser({ password: a });
    if (error) return msg(error.message || "Não foi possível alterar.");
    msg("Senha alterada.", "#2C5F5A");
    setTimeout(() => d.remove(), 1200);
  };
}
