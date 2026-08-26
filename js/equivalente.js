/* SUPER MOLBOX — equivalente-grama e normalidade.

   Este módulo existe por uma razão prática, não por nostalgia.

   A IUPAC passou a recomendar o mol como unidade preferencial em 1971, e os
   livros escolares seguiram. O aplicativo não toma partido nessa disputa: ele
   ensina as duas linguagens, porque as duas são usadas.

   O que ele insiste em deixar visível é um fato técnico, e não uma opinião:
   **o k é definido pela reação**. O mesmo H3PO4 tem três equivalentes conforme
   até onde a titulação vá. Quem domina isso usa a unidade com segurança; quem
   ignora erra o laudo.

   E a unidade está viva onde os alunos vão trabalhar. Laudo clínico de
   eletrólitos vem em mEq/L. Alcalinidade e dureza de água vêm em mg/L de
   CaCO3, e o Standard Methods pede ácido 0,02 N. Análise de solo da Embrapa
   usa cmolc/kg, que é equivalente com outro nome. Laboratório industrial
   prepara solução 0,1 N porque é rápido.

   Então o aplicativo ensina a ler, a converter e a usar — sempre dizendo qual
   reação está por trás do k. Esconder a unidade não protegeria ninguém: no
   primeiro estágio vão pedir para o aluno preparar NaOH 0,1 N, e ele precisa
   saber pesar.
*/

/* ---------------- o fator k ----------------

   E = M / k. Todo o problema do equivalente está em descobrir o k, e o k
   depende da função química e da reação pretendida.
*/

const FUNCOES_EQUIVALENTE = [
  {
    id: "acido", nome: "Ácido",
    comoAcharK: "k é o número de hidrogênios ionizáveis que a reação realmente troca.",
    exemplo: "H2SO4 neutralizado até o sulfato: k = 2.",
    armadilha: "Se a titulação parar no primeiro próton, k = 1 para o mesmo ácido.",
  },
  {
    id: "base", nome: "Base",
    comoAcharK: "k é o número de hidroxilas que a reação neutraliza.",
    exemplo: "Ca(OH)2 totalmente neutralizado: k = 2.",
    armadilha: "Bases que reagem parcialmente têm k menor que o número de OH da fórmula.",
  },
  {
    id: "sal", nome: "Sal",
    comoAcharK: "k é a carga total do cátion (ou do ânion), ou seja, carga vezes quantidade.",
    exemplo: "Al2(SO4)3: dois alumínios de carga 3+, então k = 6.",
    armadilha: "Contar a carga de um íon só, esquecendo quantos existem na fórmula.",
  },
  {
    id: "redox", nome: "Oxirredução",
    comoAcharK: "k é o número de elétrons que cada fórmula ganha ou perde na reação.",
    exemplo: "KMnO4 em meio ácido, indo a Mn2+: são 5 elétrons, então k = 5.",
    armadilha: "O mesmo permanganato em meio neutro vai a MnO2 e usa 3 elétrons: k = 3.",
  },
];

function funcoesDoEquivalente() { return FUNCOES_EQUIVALENTE; }

/* Equivalente-grama e normalidade. Note que `k` entra como dado: o aplicativo
   não adivinha a reação, e é exatamente esse o ponto pedagógico. */
function equivalenteGrama(massaMolar, k) {
  if (!(massaMolar > 0) || !(k > 0)) return null;
  return massaMolar / k;
}

function normalidadeDeMolar(concentracaoMolar, k) {
  if (!(concentracaoMolar >= 0) || !(k > 0)) return null;
  return concentracaoMolar * k;
}

function molarDeNormalidade(normalidade, k) {
  if (!(normalidade >= 0) || !(k > 0)) return null;
  return normalidade / k;
}

/* Massa a pesar para preparar uma solução em normalidade — que é o que se pede
   num laboratório industrial. */
function massaParaNormalidade(normalidade, volumeLitros, massaMolar, k) {
  const E = equivalenteGrama(massaMolar, k);
  if (E === null || !(volumeLitros > 0)) return null;
  return {
    equivalenteGrama: E,
    numeroDeEquivalentes: normalidade * volumeLitros,
    massa: normalidade * volumeLitros * E,
    concentracaoMolar: molarDeNormalidade(normalidade, k),
  };
}

/* ---------------- o k depende da reação ----------------

   O caso que mostra isso com números: a mesma substância, a mesma solução,
   três normalidades diferentes — todas corretas, cada uma para a sua reação.
*/
function armadilhaDoFosforico(concentracaoMolar, massaMolar) {
  const etapas = [
    { k: 1, ate: "só o primeiro próton (viragem em pH ~4,7)", produto: "H2PO4-" },
    { k: 2, ate: "dois prótons (viragem em pH ~9,7)", produto: "HPO42-" },
    { k: 3, ate: "os três prótons (não há salto visível em água)", produto: "PO43-" },
  ];
  return etapas.map((e) => ({
    ...e,
    equivalenteGrama: equivalenteGrama(massaMolar, e.k),
    normalidade: normalidadeDeMolar(concentracaoMolar, e.k),
  }));
}

/* ---------------- eletrólitos em mEq/L ----------------

   O laudo clínico fala esta língua, e o farmacêutico precisa converter para
   calcular reposição. Aqui k é simplesmente o módulo da carga do íon.
*/
const ELETROLITOS = [
  { formula: "Na+",   nome: "sódio",     carga: 1, massaMolar: 22.990, referencia: "135 a 145 mEq/L no plasma" },
  { formula: "K+",    nome: "potássio",  carga: 1, massaMolar: 39.098, referencia: "3,5 a 5,0 mEq/L no plasma" },
  { formula: "Cl-",   nome: "cloreto",   carga: 1, massaMolar: 35.45,  referencia: "98 a 107 mEq/L no plasma" },
  { formula: "Ca2+",  nome: "cálcio",    carga: 2, massaMolar: 40.078, referencia: "4,5 a 5,5 mEq/L no plasma" },
  { formula: "Mg2+",  nome: "magnésio",  carga: 2, massaMolar: 24.305, referencia: "1,5 a 2,5 mEq/L no plasma" },
  { formula: "HCO3-", nome: "bicarbonato", carga: 1, massaMolar: 61.016, referencia: "22 a 26 mEq/L no plasma" },
];

function eletrolitosConhecidos() { return ELETROLITOS; }

/* mEq/L ↔ mg/L ↔ mmol/L para um íon de carga conhecida. */
function converterEletrolito(io, { mEqPorL, mgPorL, mmolPorL }) {
  const E = io.massaMolar / io.carga;      // massa de um miliequivalente, em mg
  let meq = null;
  if (isFinite(mEqPorL)) meq = mEqPorL;
  else if (isFinite(mgPorL)) meq = mgPorL / E;
  else if (isFinite(mmolPorL)) meq = mmolPorL * io.carga;
  if (meq === null || !isFinite(meq)) return null;

  return {
    mEqPorL: meq,
    mgPorL: meq * E,
    mmolPorL: meq / io.carga,
    equivalenteEmMg: E,
  };
}

/* ---------------- alcalinidade e dureza como CaCO3 ----------------

   O resultado sai em mg/L de CaCO3 mesmo quando não há carbonato de cálcio
   nenhum na amostra. É uma convenção: expressa-se tudo numa substância de
   referência para que resultados de laboratórios diferentes se comparem.

   O CaCO3 tem massa molar 100,09 e k = 2 (o carbonato recebe dois prótons),
   então um equivalente pesa 50,04 mg. É de onde vem o famoso fator 50 000 das
   planilhas de tratamento de água.
*/
const MASSA_MOLAR_CACO3 = 100.087;
const K_CACO3 = 2;

function equivalenteDoCaCO3() { return MASSA_MOLAR_CACO3 / K_CACO3; }   // 50,04 mg/mEq

/* Alcalinidade a partir da titulação com ácido padronizado, no formato em que
   o Standard Methods pede. */
function alcalinidadeComoCaCO3({ volumeAcidoML, normalidadeAcido, volumeAmostraML }) {
  if (!(volumeAcidoML >= 0) || !(normalidadeAcido > 0) || !(volumeAmostraML > 0)) return null;
  const mEq = volumeAcidoML * normalidadeAcido;           // mL × eq/L = mEq
  const mEqPorL = (mEq / volumeAmostraML) * 1000;
  return {
    mEqPorL,
    mgPorLCaCO3: mEqPorL * equivalenteDoCaCO3(),
    fator: equivalenteDoCaCO3() * 1000,                   // o "50 044" das planilhas
  };
}

/* Dureza a partir da titulação com EDTA, que reage 1:1 com Ca2+ e Mg2+ — ou
   seja, aqui a conta é molar, e a conversão para CaCO3 é só de expressão. */
function durezaComoCaCO3({ volumeEdtaML, molaridadeEdta, volumeAmostraML }) {
  if (!(volumeEdtaML >= 0) || !(molaridadeEdta > 0) || !(volumeAmostraML > 0)) return null;
  const mmol = volumeEdtaML * molaridadeEdta;             // mL × mol/L = mmol
  const mmolPorL = (mmol / volumeAmostraML) * 1000;
  return {
    mmolPorL,
    mgPorLCaCO3: mmolPorL * MASSA_MOLAR_CACO3,
    classificacao: classificarDureza(mmolPorL * MASSA_MOLAR_CACO3),
  };
}

function classificarDureza(mgPorL) {
  if (mgPorL < 60) return "mole";
  if (mgPorL < 120) return "moderadamente dura";
  if (mgPorL < 180) return "dura";
  return "muito dura";
}

/* ---------------- o atalho N1V1 = N2V2 ----------------

   Ele funciona porque a normalidade já embute a estequiometria: um
   equivalente sempre reage com um equivalente, por construção. É essa
   comodidade que manteve a unidade viva no laboratório industrial.

   E ele falha quando o k assumido não é o k da reação que de fato ocorreu.
   O atalho é rápido porque não pergunta nada: quem o usa precisa ter a reação
   clara antes de aplicá-lo.
*/
function atalhoNormalidade({ n1, v1, n2, v2 }) {
  const dados = { n1, v1, n2, v2 };
  const faltando = Object.keys(dados).filter((k) => !isFinite(dados[k]) || dados[k] <= 0);
  if (faltando.length !== 1) return null;

  const alvo = faltando[0];
  const valor =
    alvo === "n1" ? (n2 * v2) / v1 :
    alvo === "v1" ? (n2 * v2) / n1 :
    alvo === "n2" ? (n1 * v1) / v2 :
                    (n1 * v1) / n2;
  return { alvo, valor };
}

/* Mesma titulação resolvida pelos dois caminhos, para o aluno ver que dão o
   mesmo número — e que o caminho molar é o que mostra de onde vem a proporção. */
function compararCaminhos({ cTitulante, vTitulante, vAmostra, kTitulante, kAmostra }) {
  const nTitulante = normalidadeDeMolar(cTitulante, kTitulante);
  const nAmostra = (nTitulante * vTitulante) / vAmostra;
  const cAmostraPorNormalidade = molarDeNormalidade(nAmostra, kAmostra);

  // caminho molar: mols de titulante, proporção da reação, mols de amostra
  const molsTitulante = cTitulante * (vTitulante / 1000);
  const proporcao = kTitulante / kAmostra;
  const molsAmostra = molsTitulante * proporcao;
  const cAmostraPorMol = molsAmostra / (vAmostra / 1000);

  return {
    normalidadeTitulante: nTitulante,
    normalidadeAmostra: nAmostra,
    porNormalidade: cAmostraPorNormalidade,
    porMol: cAmostraPorMol,
    proporcao,
    diferenca: Math.abs(cAmostraPorNormalidade - cAmostraPorMol),
  };
}

/* ---------------- onde a unidade continua viva ---------------- */

const ONDE_SE_USA = [
  { emoji: "💊", area: "Farmácia e clínica",
    texto: "Laudo de eletrólitos vem em mEq/L, e cálculo de reposição também. Sódio, potássio, cálcio e bicarbonato são lidos assim todos os dias." },
  { emoji: "💧", area: "Tratamento de água",
    texto: "Alcalinidade, acidez e dureza são expressas em mg/L de CaCO3, e os métodos padronizados pedem ácido 0,02 N. Toda a planilha de estação usa esta linguagem." },
  { emoji: "🌱", area: "Análise de solo",
    texto: "A capacidade de troca de cátions e a soma de bases saem em cmolc/kg — equivalente com outro nome, porque o que interessa ali é carga trocada, não número de partículas." },
  { emoji: "🏭", area: "Laboratório industrial",
    texto: "Soluções padronizadas em normalidade ainda são a norma em muitas rotinas, porque dispensam recalcular a estequiometria a cada análise." },
  { emoji: "⚡", area: "Eletroquímica",
    texto: "As leis de Faraday são naturalmente escritas em equivalentes: um mol de elétrons deposita um equivalente de qualquer metal." },
];

function ondeSeUsaEquivalente() { return ONDE_SE_USA; }
