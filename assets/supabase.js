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
