/* MOLBOX — progresso do estudante.

   Guarda tudo no aparelho, em localStorage. Nada sai daqui: não há servidor,
   não há cadastro, não há coleta. O que o aplicativo sabe sobre o aluno fica
   com o aluno.

   O dado mais útil deste módulo não é o XP: é o mapa de dificuldades, que
   conta quais tipos de conta a pessoa erra mais. Serve ao estudante para
   saber onde treinar e ao professor para saber o que revisar no quadro.
*/

const CHAVE_PROGRESSO = "molbox.progresso.v1";

const MEDALHAS = [
  { id: "primeiro",    nome: "Primeira travessia", condicao: (p) => p.totalAcertos >= 1,  descricao: "Acertar o primeiro exercício" },
  { id: "dez",         nome: "Dez de bancada",      condicao: (p) => p.totalAcertos >= 10, descricao: "Acertar dez exercícios" },
  { id: "cinquenta",   nome: "Meio cento",          condicao: (p) => p.totalAcertos >= 50, descricao: "Acertar cinquenta exercícios" },
  { id: "sequencia5",  nome: "Cinco em sequência",  condicao: (p) => p.melhorSequencia >= 5,  descricao: "Cinco acertos seguidos" },
  { id: "sequencia15", nome: "Quinze em sequência", condicao: (p) => p.melhorSequencia >= 15, descricao: "Quinze acertos seguidos" },
  { id: "degrau1",     nome: "Entendeu o pacote",   condicao: (p) => p.desbloqueado >= 1, descricao: "Liberar o degrau do átomo" },
  { id: "degrau2",     nome: "Contador",            condicao: (p) => p.desbloqueado >= 2, descricao: "Liberar o degrau da contagem" },
  { id: "degrau3",     nome: "Atravessou a ponte",  condicao: (p) => p.desbloqueado >= 3, descricao: "Liberar o degrau do mol" },
  { id: "degrau4",     nome: "Química de verdade",  condicao: (p) => p.desbloqueado >= 4, descricao: "Liberar o degrau da reação" },
  { id: "ofensiva3",   nome: "Três dias seguidos",  condicao: (p) => p.melhorOfensiva >= 3, descricao: "Treinar em três dias consecutivos" },
  { id: "ofensiva7",   nome: "Semana inteira",      condicao: (p) => p.melhorOfensiva >= 7, descricao: "Treinar em sete dias consecutivos" },
  { id: "semDica",     nome: "Sem colinha",         condicao: (p) => p.acertosSemDica >= 20, descricao: "Vinte acertos sem abrir a dica" },
];

function progressoVazio() {
  return {
    xp: 0,
    totalAcertos: 0,
    totalTentativas: 0,
    acertosSemDica: 0,
    sequencia: 0,
    melhorSequencia: 0,
    desbloqueado: 0,
    porDegrau: { 0: { acertos: 0, erros: 0 }, 1: { acertos: 0, erros: 0 }, 2: { acertos: 0, erros: 0 }, 3: { acertos: 0, erros: 0 }, 4: { acertos: 0, erros: 0 } },
    porTipo: {},          // { tipo: { acertos, erros } }
    ofensiva: 0,
    melhorOfensiva: 0,
    ultimoDia: null,
    medalhas: [],
    extras: {},          // { treino: { acertos, erros } } — fora da escada
  };
}

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function diasEntre(a, b) {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}

function carregarProgresso() {
  try {
    const bruto = localStorage.getItem(CHAVE_PROGRESSO);
    if (!bruto) return progressoVazio();
    const p = Object.assign(progressoVazio(), JSON.parse(bruto));
    // garante a forma esperada mesmo se o dado guardado for de uma versão anterior
    for (const d of DEGRAUS) if (!p.porDegrau[d.n]) p.porDegrau[d.n] = { acertos: 0, erros: 0 };
    if (!p.porTipo) p.porTipo = {};
    if (!p.extras) p.extras = {};   // progresso salvo antes dos treinos extras
    if (!Array.isArray(p.medalhas)) p.medalhas = [];
    return p;
  } catch (e) {
    return progressoVazio();
  }
}

function salvarProgresso(p) {
  try { localStorage.setItem(CHAVE_PROGRESSO, JSON.stringify(p)); } catch (e) { /* segue sem guardar */ }
}

/* Marca presença do dia e atualiza a ofensiva. Chamar ao abrir o treino. */
function registrarDia(p) {
  const hoje = hojeISO();
  if (p.ultimoDia === hoje) return p;
  if (p.ultimoDia && diasEntre(p.ultimoDia, hoje) === 1) p.ofensiva += 1;
  else p.ofensiva = 1;
  p.ultimoDia = hoje;
  p.melhorOfensiva = Math.max(p.melhorOfensiva, p.ofensiva);
  return p;
}

/* ---------------- rendimento decrescente por degrau ----------------

   Na primeira aula em sala, vários alunos descobriram que dava para acumular
   XP repetindo o degrau 0, que é o mais fácil. É o comportamento esperado de
   qualquer jogador competente: se a regra premia repetição, repetir é jogar
   bem. O erro estava na regra, não no aluno.

   A correção é rendimento decrescente. Os primeiros acertos de um degrau
   valem cheio, porque é ali que se aprende. Depois disso o XP cai até um piso
   simbólico: continuar praticando nunca é punido, mas deixa de ser o caminho
   mais curto para subir de nível. O caminho curto passa a ser o degrau
   seguinte — que é exatamente para onde queremos o aluno.

   Não zeramos o ganho. Zerar transformaria a prática extra em perda de tempo
   declarada, e há aluno que precisa mesmo repetir o degrau 1 vinte vezes.
*/
const ACERTOS_COM_VALOR_CHEIO = 5;   // até aqui, XP integral: é a fase de aprender
const ACERTOS_ATE_O_PISO = 20;       // daqui em diante, só o piso
const PISO_DE_GANHO = 0.2;           // 20% do valor, para nunca chegar a zero

function fatorDeSaturacao(acertosNoDegrau) {
  // `acertosNoDegrau` ainda não inclui o acerto que está sendo registrado
  const jaFeitos = acertosNoDegrau - 1;
  if (jaFeitos < ACERTOS_COM_VALOR_CHEIO) return 1;
  if (jaFeitos >= ACERTOS_ATE_O_PISO) return PISO_DE_GANHO;
  const percorrido = (jaFeitos - ACERTOS_COM_VALOR_CHEIO) / (ACERTOS_ATE_O_PISO - ACERTOS_COM_VALOR_CHEIO);
  return 1 - percorrido * (1 - PISO_DE_GANHO);
}

/* Quanto o aluno ainda ganha por acerto neste degrau, para a interface poder
   avisar antes que ele descubra sozinho e se sinta enganado. */
function rendimentoDoDegrau(p, degrau) {
  const acertos = p.porDegrau[degrau] ? p.porDegrau[degrau].acertos : 0;
  const fator = fatorDeSaturacao(acertos + 1);
  return {
    fator,
    saturado: fator <= PISO_DE_GANHO + 1e-9,
    caindo: fator < 1,
    acertos,
    restamCheios: Math.max(0, ACERTOS_COM_VALOR_CHEIO - acertos),
  };
}

function nivel(xp) {
  // cada nível custa um pouco mais que o anterior
  return Math.floor((-1 + Math.sqrt(1 + xp / 12.5)) / 2) + 1;
}
function xpDoNivel(n) { return Math.round(12.5 * (2 * (n - 1) + 1) * (2 * (n - 1) + 1) - 12.5); }
function xpParaProximoNivel(xp) {
  const n = nivel(xp);
  const base = xpDoNivel(n), topo = xpDoNivel(n + 1);
  return { nivel: n, atual: xp - base, necessario: topo - base };
}

/* Registra o resultado de um exercício e devolve o que mudou, para a interface
   poder comemorar de forma específica. */
function registrarResposta(p, exercicio, acertou, usouDica) {
  const d = exercicio.degrau;
  p.totalTentativas += 1;
  if (!p.porTipo[exercicio.tipo]) p.porTipo[exercicio.tipo] = { acertos: 0, erros: 0 };

  let ganho = 0;
  const antes = { desbloqueado: p.desbloqueado, medalhas: p.medalhas.slice() };

  if (acertou) {
    p.totalAcertos += 1;
    p.porDegrau[d].acertos += 1;
    p.porTipo[exercicio.tipo].acertos += 1;
    p.sequencia += 1;
    p.melhorSequencia = Math.max(p.melhorSequencia, p.sequencia);
    if (!usouDica) p.acertosSemDica += 1;

    ganho = Math.round(
      (10 + (usouDica ? 0 : 5) + Math.min(10, Math.floor(p.sequencia / 3) * 2))
      * fatorDeSaturacao(p.porDegrau[d].acertos)
    );
    p.xp += ganho;
  } else {
    p.porDegrau[d].erros += 1;
    p.porTipo[exercicio.tipo].erros += 1;
    p.sequencia = 0;
  }

  // libera o próximo degrau quando o atual acumula acertos suficientes
  const ultimoDegrau = DEGRAUS[DEGRAUS.length - 1].n;
  while (p.desbloqueado < ultimoDegrau && p.porDegrau[p.desbloqueado].acertos >= ACERTOS_PARA_LIBERAR) {
    p.desbloqueado += 1;
  }

  const novas = [];
  for (const m of MEDALHAS) {
    if (!p.medalhas.includes(m.id) && m.condicao(p)) {
      p.medalhas.push(m.id);
      novas.push(m);
    }
  }

  salvarProgresso(p);
  return {
    ganho,
    subiuDegrau: p.desbloqueado > antes.desbloqueado ? p.desbloqueado : null,
    medalhasNovas: novas,
  };
}

/* Os tipos com maior taxa de erro, para o mapa de dificuldades. */
/* Treinos extras dão XP e não mexem na escada.

   Por que não reaproveitar `registrarResposta`: ela grava em `porDegrau`, e
   `porDegrau` é o que libera degrau. Um aluno que treinasse balanceamento
   destravaria o degrau da reação sem nunca ter feito estequiometria, e a
   escada deixaria de significar o que promete. O treino extra é paralelo por
   decisão, não por descuido.

   O que ele compartilha com a escada: XP, sequência, ofensiva e medalhas — é o
   mesmo aluno se esforçando. O que ele não compartilha: desbloqueio. */
function registrarTreinoExtra(p, treino, acertou, usouDica) {
  if (!p.extras) p.extras = {};
  if (!p.extras[treino]) p.extras[treino] = { acertos: 0, erros: 0 };
  p.totalTentativas += 1;

  let ganho = 0;
  const antes = p.medalhas.slice();

  if (acertou) {
    p.totalAcertos += 1;
    p.extras[treino].acertos += 1;
    p.sequencia += 1;
    p.melhorSequencia = Math.max(p.melhorSequencia, p.sequencia);
    if (!usouDica) p.acertosSemDica += 1;

    /* Mesma saturação da escada, contada dentro do próprio treino: repetir
       cem balanceamentos fáceis não pode valer o mesmo que os cinco
       primeiros. */
    ganho = Math.round(
      (10 + (usouDica ? 0 : 5) + Math.min(10, Math.floor(p.sequencia / 3) * 2))
      * fatorDeSaturacao(p.extras[treino].acertos)
    );
    p.xp += ganho;
  } else {
    p.extras[treino].erros += 1;
    p.sequencia = 0;
  }

  const novas = [];
  for (const m of MEDALHAS) {
    if (!p.medalhas.includes(m.id) && m.condicao(p)) {
      p.medalhas.push(m.id);
      novas.push(m);
    }
  }

  salvarProgresso(p);
  return { ganho, medalhasNovas: novas, subiuDegrau: null };
}

/* Quanto o aluno ainda ganha por acerto neste treino extra. */
function rendimentoDoTreino(p, treino) {
  const acertos = p.extras && p.extras[treino] ? p.extras[treino].acertos : 0;
  const fator = fatorDeSaturacao(acertos + 1);
  return {
    fator, acertos,
    saturado: fator <= PISO_DE_GANHO + 1e-9,
    caindo: fator < 1,
    restamCheios: Math.max(0, ACERTOS_COM_VALOR_CHEIO - acertos),
  };
}

/* ---------------- exportação do progresso ----------------

   Por que existe: o aplicativo guarda tudo em localStorage, por aparelho, e o
   professor não tem como saber se a turma usou nem onde ela erra. Sem isso não
   há evidência de aprendizagem — só impressão.

   Três decisões que não são técnicas:

   1. Nunca sai nome. Sai um código que o próprio aluno inventa, o mesmo da
      atividade diagnóstica. É o que liga uma coisa à outra sem identificar
      ninguém.
   2. O texto é legível, não embaralhado. O aluno (e o responsável) precisa
      poder ler exatamente o que está mandando antes de mandar. Codificar
      esconderia o conteúdo de quem tem direito de vê-lo.
   3. Nada é enviado pelo aplicativo. Ele gera o texto; quem envia é o aluno,
      pelo meio que quiser. Assim a promessa da tela de Progresso continua
      verdadeira. */

const MARCA_EXPORTACAO = "MOLBOX1";

function exportarProgresso(p, codigo) {
  const cod = String(codigo || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  if (cod.length < 4) return null;

  const campos = [
    MARCA_EXPORTACAO,
    "cod=" + cod,
    "xp=" + p.xp,
    "ac=" + p.totalAcertos,
    "te=" + p.totalTentativas,
    "sd=" + p.acertosSemDica,
    "ms=" + p.melhorSequencia,
    "dg=" + p.desbloqueado,
    "mo=" + p.melhorOfensiva,
    "of=" + p.ofensiva,
    "ult=" + (p.ultimoDia || "-"),
  ];

  const bal = p.extras && p.extras.balanceamento ? p.extras.balanceamento : null;
  if (bal) campos.push("bal=" + bal.acertos + "/" + (bal.acertos + bal.erros));

  const degraus = Object.keys(p.porDegrau).sort()
    .map((d) => d + ":" + p.porDegrau[d].acertos + "/" + (p.porDegrau[d].acertos + p.porDegrau[d].erros))
    .filter((t) => !/:0\/0$/.test(t));
  if (degraus.length) campos.push("deg=" + degraus.join(","));

  const tipos = Object.keys(p.porTipo).sort()
    .map((t) => t + ":" + p.porTipo[t].acertos + "/" + (p.porTipo[t].acertos + p.porTipo[t].erros));
  if (tipos.length) campos.push("tip=" + tipos.join(","));

  return campos.join(";");
}

/* O caminho de volta, usado pelo painel do professor. Devolve null para linha
   que não seja uma exportação — o professor vai colar um monte de texto de
   conversa junto, e linha estranha tem de ser ignorada em silêncio. */
function lerExportacao(linha) {
  const texto = String(linha || "").trim();
  if (texto.indexOf(MARCA_EXPORTACAO) !== 0) return null;
  const dados = { tipos: {}, degraus: {} };
  for (const parte of texto.split(";").slice(1)) {
    const i = parte.indexOf("=");
    if (i < 0) continue;
    const chave = parte.slice(0, i);
    const valor = parte.slice(i + 1);
    if (chave === "cod") dados.codigo = valor;
    else if (chave === "tip" || chave === "deg") {
      const destino = chave === "tip" ? dados.tipos : dados.degraus;
      for (const par of valor.split(",")) {
        const [nome, fracao] = par.split(":");
        if (!fracao) continue;
        const [a, t] = fracao.split("/").map(Number);
        destino[nome] = { acertos: a || 0, total: t || 0 };
      }
    } else if (chave === "bal") {
      const [a, t] = valor.split("/").map(Number);
      dados.balanceamento = { acertos: a || 0, total: t || 0 };
    } else if (chave === "ult") dados.ult = valor;   // data, não número
    else dados[chave] = Number(valor);
  }
  return dados.codigo ? dados : null;
}

function pontosFracos(p, minimo = 2) {
  const lista = [];
  for (const tipo in p.porTipo) {
    const t = p.porTipo[tipo];
    const total = t.acertos + t.erros;
    if (total < minimo) continue;
    lista.push({ tipo, total, erros: t.erros, taxa: t.erros / total });
  }
  return lista.sort((a, b) => b.taxa - a.taxa || b.total - a.total);
}

function zerarProgresso() {
  try { localStorage.removeItem(CHAVE_PROGRESSO); } catch (e) { /* nada a fazer */ }
  return progressoVazio();
}
