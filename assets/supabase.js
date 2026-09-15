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

/* ============================================================
   Bloqueio por inatividade
   Farmácia com controlado não pode ficar com a tela aberta e
   destravada quando ninguém está na bancada: quem passar pela sala
   dispensa, ajusta estoque ou vê prontuário no seu login.
   Aqui a sessão é encerrada depois de um tempo sem uso, com aviso
   e contagem regressiva antes.

   O tempo vem de window.INATIVIDADE_MIN (config.js) e pode ser
   ajustado por aparelho na tela de Configurações — o computador da
   farmácia, que fica numa sala de passagem, costuma pedir um tempo
   menor que o celular do RT. 0 desliga o bloqueio.
   ============================================================ */

const INATIVIDADE_PADRAO = 15;      // minutos
const INATIVIDADE_AVISO  = 60;      // segundos de contagem antes de sair
const _INAT_CHAVE = "reviva.inatividadeMin";
const _INAT_ULTIMO = "reviva.ultimaAtividade";

function inatividadeMin() {
  const local = parseInt(localStorage.getItem(_INAT_CHAVE), 10);
  if (!isNaN(local) && local >= 0) return local;
  const cfg = parseInt(window.INATIVIDADE_MIN, 10);
  return isNaN(cfg) ? INATIVIDADE_PADRAO : cfg;
}
function definirInatividadeMin(min) {
  localStorage.setItem(_INAT_CHAVE, String(parseInt(min, 10) || 0));
  if (window.__inat && window.__inat.reiniciar) window.__inat.reiniciar();
}

function iniciarBloqueioInatividade() {
  if (window.__inat) return;
  let tAviso = null, tSair = null, tick = null, avisando = false;

  const limpar = () => { clearTimeout(tAviso); clearTimeout(tSair); clearInterval(tick); };

  const sairPorInatividade = async () => {
    limpar();
    /* marca o motivo para a tela de login explicar o que houve —
       sem isso o usuário acha que o sistema caiu */
    try { sessionStorage.setItem("reviva.saidaInatividade", "1"); } catch (e) {}
    await sair();
  };

  const fecharAviso = () => {
    const d = document.getElementById("inatAviso");
    if (d) d.remove();
    avisando = false;
  };

  const avisar = () => {
    if (avisando) return;
    avisando = true;
    let resta = INATIVIDADE_AVISO;
    const d = document.createElement("div");
    d.id = "inatAviso";
    d.style.cssText = "position:fixed;inset:0;background:rgba(20,28,26,.6);display:flex;align-items:center;justify-content:center;z-index:10000;padding:20px";
    d.innerHTML = `
      <div style="background:#fff;border-radius:14px;max-width:420px;width:100%;padding:26px 28px;box-shadow:0 18px 50px rgba(0,0,0,.3);font-family:'Public Sans',Arial,sans-serif">
        <div style="font-size:17px;font-weight:700;color:#1E2A28;margin-bottom:8px">Ainda está aí?</div>
        <div style="font-size:14px;color:#4a544f;line-height:1.55">
          Por segurança, o sistema vai encerrar a sessão em
          <b id="inatSeg" style="font-variant-numeric:tabular-nums">${resta}</b> segundos por falta de uso.
          <div style="margin-top:8px;font-size:12.5px;color:#B04A3F">O que estiver preenchido e não gravado será perdido.</div>
        </div>
        <div style="display:flex;gap:10px;margin-top:20px;flex-wrap:wrap">
          <button id="inatFicar" style="background:#2C5F5A;color:#fff;border:none;padding:10px 16px;border-radius:9px;cursor:pointer;font:inherit;font-weight:600">Continuar conectado</button>
          <button id="inatSair" style="background:transparent;color:#6a736e;border:1px solid #cfd6cf;padding:10px 16px;border-radius:9px;cursor:pointer;font:inherit">Sair agora</button>
        </div>
      </div>`;
    document.body.appendChild(d);
    document.getElementById("inatFicar").onclick = () => { fecharAviso(); reiniciar(); };
    document.getElementById("inatSair").onclick = () => { fecharAviso(); sairPorInatividade(); };
    tick = setInterval(() => {
      resta -= 1;
      const el = document.getElementById("inatSeg");
      if (el) el.textContent = String(Math.max(resta, 0));
    }, 1000);
    tSair = setTimeout(sairPorInatividade, INATIVIDADE_AVISO * 1000);
  };

  const reiniciar = () => {
    limpar();
    fecharAviso();
    try { localStorage.setItem(_INAT_ULTIMO, String(Date.now())); } catch (e) {}
    const min = inatividadeMin();
    if (!min) return;                       // 0 = desligado
    tAviso = setTimeout(avisar, Math.max(min * 60000 - INATIVIDADE_AVISO * 1000, 5000));
  };

  /* Aba em segundo plano tem os timers estrangulados pelo navegador, e
     computador suspenso não conta tempo nenhum. Por isso, ao voltar para a
     aba, o tempo decorrido é conferido pelo relógio — é o caso do "esqueci
     aberto e fui embora". */
  const conferirAoVoltar = () => {
    const min = inatividadeMin();
    if (!min || document.hidden) return;
    const ult = parseInt(localStorage.getItem(_INAT_ULTIMO), 10) || Date.now();
    if (Date.now() - ult >= min * 60000) { sairPorInatividade(); return; }
    reiniciar();
  };

  ["mousedown", "keydown", "touchstart", "scroll", "wheel"].forEach((ev) =>
    document.addEventListener(ev, () => { if (!avisando) reiniciar(); }, { passive: true, capture: true }));
  document.addEventListener("visibilitychange", conferirAoVoltar);
  window.addEventListener("focus", conferirAoVoltar);

  window.__inat = { reiniciar, sairPorInatividade };
  reiniciar();
}
