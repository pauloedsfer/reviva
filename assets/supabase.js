/* ============================================================
   supabase.js — Hospital Reviva
   Cria o cliente Supabase e expõe utilidades de autenticação
   (login único), logout, guarda de rota e limpeza da massa de teste.
   Carregado DEPOIS do CDN do supabase-js e de config.js.
   ============================================================ */

// O CDN UMD do supabase-js expõe o global `supabase` com createClient.
(function () {
  if (!window.supabase || !window.supabase.createClient) {
    console.error("supabase-js não carregou. Verifique a tag do CDN.");
    return;
  }
  const url = window.SUPABASE_URL, key = window.SUPABASE_ANON_KEY;
  if (!url || url.indexOf("COLE_AQUI") === 0) {
    console.warn("Supabase não configurado — edite assets/config.js.");
  }
  window.SB = window.supabase.createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
})();

// Sessão atual (ou null).
async function getSession() {
  const { data } = await window.SB.auth.getSession();
  return data ? data.session : null;
}

// Guarda de rota: se não houver sessão, manda para o login e retorna false.
async function exigirLogin() {
  const s = await getSession();
  if (!s) { window.location.href = "login.html"; return false; }
  return true;
}

// Logout: encerra a sessão e volta ao login.
async function sair() {
  try { await window.SB.auth.signOut(); } catch (e) {}
  window.location.href = "login.html";
}

// Garante uma linha em `usuarios` para o login atual (costura de multiusuário/auditoria).
// Assim os lançamentos podem gravar quem registrou. Best-effort: se falhar, segue sem.
async function ensureUsuario() {
  try {
    const s = await getSession();
    if (!s) { window.USUARIO_ID = null; return null; }
    const u = s.user;
    const { error } = await window.SB.from("usuarios")
      .upsert({ id: u.id, email: u.email, nome: u.email || "Responsável" }, { onConflict: "id" });
    if (error) throw error;
    window.USUARIO_ID = u.id;
  } catch (e) { window.USUARIO_ID = null; }
  return window.USUARIO_ID;
}

// Devolve {usuario_id} para espalhar nos inserts (ou {} se indisponível).
function usuarioId() { return window.USUARIO_ID ? { usuario_id: window.USUARIO_ID } : {}; }

// Existe massa de teste no banco? (usado para exibir o banner)
async function temDadosTeste() {
  try {
    const { count } = await window.SB
      .from("pacientes").select("id", { count: "exact", head: true })
      .eq("is_dado_teste", true);
    return (count || 0) > 0;
  } catch (e) { return false; }
}

// Apaga TODA a massa de teste (chama a função do banco). Preserva a config.
async function limparDadosTeste() {
  const { data, error } = await window.SB.rpc("limpar_dados_teste");
  if (error) throw error;
  return data;
}

/* ============================================================
   Sessão expirada — detecção e aviso claro
   A queda de sessão era silenciosa: a tela continuava aberta e o
   erro só aparecia ao gravar, com a mensagem técnica de RLS
   ("violates row-level security policy"). Aqui a sessão é
   verificada periodicamente e ao voltar para a aba, e qualquer
   erro de gravação por falta de sessão vira um aviso legível.
   ============================================================ */

// o erro veio de sessão perdida? (RLS/JWT/permissão)
function erroDeSessao(e) {
  const m = (e && (e.message || e.msg || String(e)) || "").toLowerCase();
  return /row-level security|row level security|jwt|not authenticated|permission denied|invalid.*token|expired/.test(m);
}

let _avisoSessaoAberto = false;
function avisarSessaoExpirada(msgExtra) {
  if (_avisoSessaoAberto) return;
  _avisoSessaoAberto = true;
  const d = document.createElement("div");
  d.id = "sessaoExpirada";
  d.style.cssText = "position:fixed;inset:0;background:rgba(20,28,26,.55);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px";
  d.innerHTML = `
    <div style="background:#fff;border-radius:14px;max-width:440px;width:100%;padding:26px 28px;box-shadow:0 18px 50px rgba(0,0,0,.3);font-family:'Public Sans',Arial,sans-serif">
      <div style="font-size:17px;font-weight:700;color:#1E2A28;margin-bottom:8px">Sua sessão expirou</div>
      <div style="font-size:14px;color:#4a544f;line-height:1.55">
        A conexão com o sistema caiu e o login precisa ser refeito.
        <b>Nada foi gravado</b> — o que você preencheu continua na tela.
        ${msgExtra ? `<div style="margin-top:8px;font-size:12.5px;color:#6a736e">${msgExtra}</div>` : ""}
        <div style="margin-top:10px;font-size:12.5px;color:#6a736e">Dica: abra o login em outra aba, entre novamente e volte para cá — o que estiver preenchido será mantido.</div>
      </div>
      <div style="display:flex;gap:10px;margin-top:20px;flex-wrap:wrap">
        <button id="sxLogin" style="background:#2C5F5A;color:#fff;border:none;padding:10px 16px;border-radius:9px;cursor:pointer;font:inherit;font-weight:600">Entrar novamente</button>
        <button id="sxNova" style="background:transparent;color:#2C5F5A;border:1px solid #cfd6cf;padding:10px 16px;border-radius:9px;cursor:pointer;font:inherit">Abrir login em outra aba</button>
        <button id="sxFechar" style="background:transparent;color:#6a736e;border:none;padding:10px 8px;cursor:pointer;font:inherit">Continuar vendo a tela</button>
      </div>
    </div>`;
  document.body.appendChild(d);
  document.getElementById("sxLogin").onclick = () => { location.href = "login.html"; };
  document.getElementById("sxNova").onclick = () => { window.open("login.html", "_blank"); };
  document.getElementById("sxFechar").onclick = () => { d.remove(); _avisoSessaoAberto = false; };
}

// verifica a sessão; se caiu, avisa
async function checarSessao(silencioso) {
  try {
    const s = await getSession();
    if (!s) { avisarSessaoExpirada(silencioso ? "" : ""); return false; }
    return true;
  } catch (e) { return true; } // falha de rede: não incomoda o usuário
}

// monitora: a cada 2 min e ao voltar para a aba
function iniciarMonitorSessao() {
  if (window.__monitorSessao) return;
  window.__monitorSessao = true;
  setInterval(() => checarSessao(true), 120000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) checarSessao(true); });
  if (window.SB && window.SB.auth && window.SB.auth.onAuthStateChange) {
    window.SB.auth.onAuthStateChange((evt) => {
      if (evt === "SIGNED_OUT" || evt === "TOKEN_REFRESHED_FAILED") avisarSessaoExpirada("");
      if (evt === "SIGNED_IN") { const d = document.getElementById("sessaoExpirada"); if (d) { d.remove(); _avisoSessaoAberto = false; } }
    });
  }
}
