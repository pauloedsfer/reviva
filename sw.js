/* SUPER MOLBOX — service worker.

   O aplicativo precisa de duas coisas que puxam para lados opostos: abrir sem
   internet no laboratório, e não deixar o aluno preso numa versão velha quando
   há internet. A versão anterior era "cache primeiro" para tudo, e o segundo
   objetivo perdia sempre — era preciso recarregar muitas vezes para ver uma
   correção. A estratégia agora é mista:

   - **Código do aplicativo** (HTML, CSS, JS, manifesto): rede primeiro, com
     tempo limite curto. Com internet, o aluno recebe sempre a versão nova; sem
     internet, ou se a rede demorar, cai no cache e o app abre igual.
   - **Recursos pesados e estáveis** (fontes, ícones, marca): cache primeiro.
     Eles mudam junto com a versão, e o `install` já traz a cópia nova.

   O tempo limite existe porque rede ruim é pior que rede ausente: sem ele, uma
   conexão de escola lenta deixaria a tela branca esperando.
*/

const VERSAO = "molbox-v0.20.0";

const ARQUIVOS = [
  "./", "./index.html", "./app.css", "./tokens.css", "./fontes.css",
  "./manifest.webmanifest",
  "./js/elementos.js", "./js/parser.js", "./js/converter.js",
  "./js/balanceador.js", "./js/estequiometria.js",
  "./js/moleculas.js", "./js/especies.js", "./js/calculadora.js",
  "./js/solucoes.js", "./js/preparo.js", "./js/seguranca.js",
  "./js/acidobase.js", "./js/bancada.js", "./js/equivalente.js", "./js/mol.js",
  "./js/sobre.js", "./js/exercicios.js", "./js/progresso.js", "./js/app.js",
  "./marca/molbox-principal.svg", "./marca/molbox-negativo.svg",
  "./icones/favicon.svg", "./icones/icone-180.png", "./icones/icone-192.png", "./icones/icone-512.png",
  "./fontes/exo-2-latin-600-italic.woff2",
  "./fontes/exo-2-latin-500-italic.woff2",
  "./fontes/inter-latin-400-normal.woff2",
  "./fontes/inter-latin-500-normal.woff2",
  "./fontes/ibm-plex-mono-latin-400-normal.woff2",
  "./fontes/ibm-plex-mono-latin-500-normal.woff2"
];

const LIMITE_DE_REDE = 3500;   // ms; acima disso, serve o cache e segue a vida

/* O que é código do aplicativo e, portanto, precisa vir da rede primeiro. */
function ehCodigo(url) {
  return /\.(html|css|js|webmanifest)$/.test(url.pathname) ||
         url.pathname.endsWith("/") ||
         url.pathname === "";
}

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches.open(VERSAO)
      // cache: "reload" impede que o próprio navegador entregue cópias velhas
      // dos arquivos na hora de montar o cache novo
      .then((cache) => cache.addAll(ARQUIVOS.map((a) => new Request(a, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== VERSAO).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

/* A página pode pedir que o service worker novo assuma agora, quando o aluno
   toca em "atualizar" na faixa de aviso. */
self.addEventListener("message", (evento) => {
  if (evento.data === "assumir-agora") self.skipWaiting();
});

function guardar(requisicao, resposta) {
  if (resposta && resposta.status === 200 && resposta.type === "basic") {
    const copia = resposta.clone();
    caches.open(VERSAO).then((cache) => cache.put(requisicao, copia));
  }
  return resposta;
}

function redePrimeiro(requisicao) {
  return new Promise((resolver) => {
    let respondido = false;
    const entregarDoCache = () => {
      if (respondido) return;
      respondido = true;
      caches.match(requisicao)
        .then((guardado) => resolver(guardado || caches.match("./index.html")));
    };

    const relogio = setTimeout(entregarDoCache, LIMITE_DE_REDE);

    fetch(requisicao)
      .then((resposta) => {
        clearTimeout(relogio);
        if (respondido) { guardar(requisicao, resposta); return; }
        respondido = true;
        resolver(guardar(requisicao, resposta));
      })
      .catch(() => { clearTimeout(relogio); entregarDoCache(); });
  });
}

function cachePrimeiro(requisicao) {
  return caches.match(requisicao).then((guardado) => {
    if (guardado) return guardado;
    return fetch(requisicao)
      .then((resposta) => guardar(requisicao, resposta))
      .catch(() => caches.match("./index.html"));
  });
}

self.addEventListener("fetch", (evento) => {
  if (evento.request.method !== "GET") return;

  const url = new URL(evento.request.url);
  if (url.origin !== self.location.origin) return;   // vídeo do YouTube passa direto

  evento.respondWith(
    evento.request.mode === "navigate" || ehCodigo(url)
      ? redePrimeiro(evento.request)
      : cachePrimeiro(evento.request)
  );
});
