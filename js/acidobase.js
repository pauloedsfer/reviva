/* MOLBOX — ácidos, bases e titulação.

   A escolha central deste arquivo: nada de fórmulas aproximadas. Quase todo
   simulador de titulação usa pH = -log(Ca) para ácido forte, a fórmula da
   raiz para ácido fraco e Henderson-Hasselbalch para tampão. As três erram
   feio nas bordas — e as bordas são justamente onde o aluno tem dúvida.

   Em vez disso, todo ponto sai do balanço de cargas resolvido numericamente:

       [H⁺] + [cátions fortes] = Σ (carga dos ânions) + [OH⁻]

   Essa equação vale sempre: no início, no meio, no ponto de equivalência e
   depois dele. Resolvida por bisseção em escala logarítmica, ela dá o pH
   correto até em HCl 10⁻⁸ mol/L, onde a fórmula ingênua devolve pH 8 para um
   ácido — resultado impossível que aparece em muito material didático.
*/

const KW_25 = 1.0e-14;
const PKW_25 = 14.0;

function pOHde(pH) { return PKW_25 - pH; }
function pKde(K) { return -Math.log10(K); }
function Kde(pK) { return Math.pow(10, -pK); }
function KbDeKa(Ka) { return KW_25 / Ka; }
function KaDeKb(Kb) { return KW_25 / Kb; }

/* Carga negativa média por molécula de ácido, dada a acidez do meio.
   Para um ácido monoprótico devolve α₁, entre 0 e 1. Para um triprótico
   devolve algo entre 0 e 3. É a soma ponderada das espécies desprotonadas. */
function cargaMedia(h, Kas) {
  const n = Kas.length;
  let denominador = 0;
  let numerador = 0;
  let produto = 1;

  for (let i = 0; i <= n; i++) {
    if (i > 0) produto *= Kas[i - 1];
    const termo = Math.pow(h, n - i) * produto;
    denominador += termo;
    numerador += i * termo;
  }
  return denominador === 0 ? 0 : numerador / denominador;
}

/* Resolve o balanço de cargas por bisseção em log[H⁺].

   A função é monótona crescente em h: o primeiro termo cresce, o termo dos
   ânions encolhe (mais ácido, menos desprotonação) e o termo do hidróxido
   encolhe. Monotonicidade garante que a bisseção converge sempre, sem chute
   inicial e sem risco de divergir como o método de Newton. */
function resolverH({ Kas, cAcido, cCation, cAnionForte }) {
  const acido = Kas && Kas.length ? Kas : null;

  const f = (h) => {
    let valor = h + (cCation || 0) - KW_25 / h - (cAnionForte || 0);
    if (acido && cAcido > 0) valor -= cAcido * cargaMedia(h, acido);
    return valor;
  };

  let baixo = 1e-20, alto = 1e2;
  if (f(baixo) > 0) return baixo;
  if (f(alto) < 0) return alto;

  for (let i = 0; i < 200; i++) {
    const meio = Math.sqrt(baixo * alto); // média geométrica: bisseção em log
    if (f(meio) < 0) baixo = meio; else alto = meio;
  }
  return Math.sqrt(baixo * alto);
}

function pHde(h) { return -Math.log10(h); }

/* ---------------- casos avulsos ---------------- */

/* Ácido forte de concentração analítica c. A raiz fechada do balanço
   [H⁺] − Kw/[H⁺] = c já embute a água, e é por isso que 10⁻⁸ mol/L de HCl
   devolve pH 6,98 e não 8. */
function pHAcidoForte(c) {
  const h = (c + Math.sqrt(c * c + 4 * KW_25)) / 2;
  return pHde(h);
}

function pHBaseForte(c, cargaHidroxila = 1) {
  const cOH = c * cargaHidroxila;
  const oh = (cOH + Math.sqrt(cOH * cOH + 4 * KW_25)) / 2;
  return PKW_25 + Math.log10(oh);
}

function pHAcidoFraco(Ka, c) {
  return pHde(resolverH({ Kas: [Ka], cAcido: c, cCation: 0 }));
}

function pHBaseFraca(Kb, c) {
  // trata a base fraca como o par conjugado: o cátion vem da própria base
  const Ka = KaDeKb(Kb);
  return pHde(resolverH({ Kas: [Ka], cAcido: c, cCation: c }));
}

/* Tampão: mistura de ácido e de sua base conjugada.
   Devolve o pH exato e o que Henderson-Hasselbalch teria previsto, para que a
   diferença entre os dois fique visível quando a aproximação falha. */
function tampao(Ka, cAcido, cBase) {
  const h = resolverH({ Kas: [Ka], cAcido: cAcido + cBase, cCation: cBase });
  const exato = pHde(h);
  const henderson = (cAcido > 0 && cBase > 0) ? pKde(Ka) + Math.log10(cBase / cAcido) : null;

  let alerta = null;
  if (henderson !== null) {
    const desvio = Math.abs(exato - henderson);
    if (desvio > 0.1) {
      alerta = "Henderson-Hasselbalch está errando aqui. Ela supõe que o ácido e a base conjugada mal reagem com a água, o que deixa de valer quando a solução é diluída ou a razão entre os dois é extrema.";
    }
    const razao = cBase / cAcido;
    if (razao > 10 || razao < 0.1) {
      alerta = (alerta ? alerta + " " : "") + "Fora da faixa de razão 1:10 a 10:1 a mistura já quase não tampona.";
    }
  }

  // capacidade tamponante aproximada de Van Slyke
  const c = cAcido + cBase;
  const fracao = (cAcido * cBase) / (c * c);
  const capacidade = 2.303 * c * fracao;

  return { pH: exato, henderson, alerta, capacidade, pKa: pKde(Ka) };
}

/* ---------------- curva de titulação ---------------- */

/* Um ponto da curva. O titulante é sempre a base forte; o analito pode ser
   ácido forte (Kas vazio) ou ácido fraco de um a três prótons. */
function pontoDeTitulacao({ cAnalito, vAnalito, cTitulante, vTitulante, Kas, analitoForte }) {
  const vTotal = vAnalito + vTitulante;
  if (vTotal <= 0) return null;

  const cAcidoDiluido = (cAnalito * vAnalito) / vTotal;
  const cBaseDiluida = (cTitulante * vTitulante) / vTotal;

  if (analitoForte) {
    const d = cAcidoDiluido - cBaseDiluida;
    const h = (d + Math.sqrt(d * d + 4 * KW_25)) / 2;
    return pHde(h);
  }

  const h = resolverH({ Kas, cAcido: cAcidoDiluido, cCation: cBaseDiluida });
  return pHde(h);
}

/* Volume de titulante que zera cada próton, em ordem. */
function volumesDeEquivalencia({ cAnalito, vAnalito, cTitulante, prótons }) {
  const lista = [];
  for (let i = 1; i <= prótons; i++) {
    lista.push((cAnalito * vAnalito * i) / cTitulante);
  }
  return lista;
}

/* Curva no sentido inverso: base no erlenmeyer, ácido forte na bureta.

   O pH sai por espelhamento do mesmo motor, e não de uma segunda rotina: o
   balanço de cargas de uma base fraca titulada com ácido forte é idêntico ao
   de um ácido fraco titulado com base forte, trocando [H+] por [OH-] e Ka por
   Kb. Calculamos o pOH usando os Kb no lugar dos Ka e devolvemos pKw menos o
   resultado. Duas implementações divergiriam em algum caso de borda, e o
   aplicativo acabaria discordando de si mesmo na frente da turma. */
function pontoDeTitulacaoInversa({ cAnalito, vAnalito, cTitulante, vTitulante, Kbs, analitoForte }) {
  const pOH = pontoDeTitulacao({
    cAnalito, vAnalito, cTitulante, vTitulante,
    Kas: Kbs, analitoForte,
  });
  return pOH === null ? null : PKW_25 - pOH;
}

function curvaDeTitulacao(cfg, pontos = 400) {
  if (cfg.inversa) return curvaDeTitulacaoInversa(cfg, pontos);
  const prótons = cfg.analitoForte ? 1 : cfg.Kas.length;
  const equivalencias = volumesDeEquivalencia({ ...cfg, prótons });
  const vFinal = Math.max(equivalencias[equivalencias.length - 1] * 1.6, equivalencias[0] * 2);

  const dados = [];
  for (let i = 0; i <= pontos; i++) {
    const v = (vFinal * i) / pontos;
    const pH = pontoDeTitulacao({ ...cfg, vTitulante: v });
    if (pH !== null && isFinite(pH)) dados.push({ v, pH });
  }

  // adensa a vizinhança de cada equivalência, onde a curva vira quase vertical
  for (const ve of equivalencias) {
    const janela = Math.max(ve * 0.06, 0.05);
    for (let i = 0; i <= 80; i++) {
      const v = ve - janela + (2 * janela * i) / 80;
      if (v < 0) continue;
      const pH = pontoDeTitulacao({ ...cfg, vTitulante: v });
      if (pH !== null && isFinite(pH)) dados.push({ v, pH });
    }
  }
  dados.sort((a, b) => a.v - b.v);

  const pontosDeEquivalencia = equivalencias.map((v, i) => ({
    ordem: i + 1, volume: v, pH: pontoDeTitulacao({ ...cfg, vTitulante: v }),
  }));

  return { dados, equivalencias: pontosDeEquivalencia, vFinal };
}

/* Volume de titulante necessário para chegar a um pH dado. Serve para
   descobrir onde o analista realmente para quando usa um indicador. */
function volumeParaPH(cfg, pHAlvo, vMaximo) {
  let baixo = 0, alto = vMaximo;
  const pH0 = pontoDeTitulacao({ ...cfg, vTitulante: 0 });
  if (pHAlvo <= pH0) return 0;

  const pHFinal = pontoDeTitulacao({ ...cfg, vTitulante: alto });
  if (pHAlvo >= pHFinal) return null;

  for (let i = 0; i < 120; i++) {
    const meio = (baixo + alto) / 2;
    if (pontoDeTitulacao({ ...cfg, vTitulante: meio }) < pHAlvo) baixo = meio;
    else alto = meio;
  }
  return (baixo + alto) / 2;
}

/* ---------------- indicadores ---------------- */

/* Cores reais dos indicadores, para que o gráfico mostre o que o aluno vai
   ver no béquer em vez de uma faixa cinza abstrata. São aproximações visuais
   da cor da solução diluída, não valores colorimétricos. O incolor recebe um
   cinza muito claro, porque uma faixa transparente sumiria no fundo. */
const CORES_DE_INDICADOR = {
  incolor:   "#F2F4F7",
  amarelo:   "#F5C518",
  vermelho:  "#D93025",
  azul:      "#1A73C8",
  rosa:      "#E0559B",
  laranja:   "#EE7A21",
  verde:     "#2E9E4F",
};

function corDeIndicador(nome) { return CORES_DE_INDICADOR[nome] || "#C7CDD6"; }

const INDICADORES = [
  { nome: "Alaranjado de metila",   inicio: 3.1,  fim: 4.4,  corAcida: "vermelho",  corBasica: "amarelo" },
  { nome: "Verde de bromocresol",   inicio: 3.8,  fim: 5.4,  corAcida: "amarelo",   corBasica: "azul" },
  { nome: "Vermelho de metila",     inicio: 4.4,  fim: 6.2,  corAcida: "vermelho",  corBasica: "amarelo" },
  { nome: "Tornassol",              inicio: 5.0,  fim: 8.0,  corAcida: "vermelho",  corBasica: "azul" },
  { nome: "Azul de bromotimol",     inicio: 6.0,  fim: 7.6,  corAcida: "amarelo",   corBasica: "azul" },
  { nome: "Vermelho de fenol",      inicio: 6.8,  fim: 8.4,  corAcida: "amarelo",   corBasica: "vermelho" },
  { nome: "Fenolftaleína",          inicio: 8.0,  fim: 10.0, corAcida: "incolor",   corBasica: "rosa" },
  { nome: "Timolftaleína",          inicio: 9.3,  fim: 10.5, corAcida: "incolor",   corBasica: "azul" },
  { nome: "Amarelo de alizarina",   inicio: 10.1, fim: 12.0, corAcida: "amarelo",   corBasica: "vermelho" },
];

/* O analista para quando enxerga a virada, o que acontece perto do fim da
   faixa do indicador — não no meio dela. Para titulação com base como
   titulante, a cor muda subindo o pH, então o ponto final fica no fim da
   faixa. */
function pHDeViragem(indicador) { return indicador.fim; }

/* Erro de titulação: a diferença entre onde o analista para e onde deveria. */
function erroDeTitulacao(cfg, indicador, equivalencia) {
  const vMaximo = equivalencia.volume * 3;
  const vFinal = volumeParaPH(cfg, pHDeViragem(indicador), vMaximo);

  if (vFinal === null) {
    return {
      indicador, adequado: false, vFinal: null, erro: null,
      motivo: "A curva nunca alcança a faixa deste indicador: ele não vira nesta titulação.",
    };
  }

  const erro = ((vFinal - equivalencia.volume) / equivalencia.volume) * 100;
  const absoluto = Math.abs(erro);

  let julgamento;
  if (absoluto <= 0.1) julgamento = "Excelente. O erro fica dentro da própria incerteza da bureta.";
  else if (absoluto <= 0.5) julgamento = "Aceitável para trabalho de rotina.";
  else if (absoluto <= 2) julgamento = "Erro perceptível. Serve para estimativa, não para análise quantitativa.";
  else julgamento = "Erro grande demais. Este indicador não serve para esta titulação.";

  return { indicador, adequado: absoluto <= 0.5, vFinal, erro, julgamento };
}

function melhorIndicador(cfg, equivalencia) {
  const avaliados = INDICADORES
    .map((ind) => erroDeTitulacao(cfg, ind, equivalencia))
    .filter((r) => r.erro !== null);
  avaliados.sort((a, b) => Math.abs(a.erro) - Math.abs(b.erro));
  return avaliados;
}

/* ---------------- acervo de ácidos e bases ---------------- */

const ACIDOS = [
  { formula: "HCl",      nome: "ácido clorídrico",  forte: true,  Kas: [] },
  { formula: "HNO3",     nome: "ácido nítrico",     forte: true,  Kas: [] },
  { formula: "HClO4",    nome: "ácido perclórico",  forte: true,  Kas: [] },
  { formula: "H2SO4",    nome: "ácido sulfúrico",   forte: false, Kas: [1.0e3, 1.02e-2],
    observacao: "O primeiro próton é forte; o segundo, não. Por isso ele aparece aqui como diprótico com Ka₁ enorme." },
  { formula: "CH3COOH",  nome: "ácido acético",     forte: false, Kas: [1.8e-5] },
  { formula: "HCOOH",    nome: "ácido fórmico",     forte: false, Kas: [1.8e-4] },
  { formula: "HF",       nome: "ácido fluorídrico", forte: false, Kas: [6.8e-4] },
  { formula: "HCN",      nome: "ácido cianídrico",  forte: false, Kas: [6.2e-10] },
  { formula: "HClO",     nome: "ácido hipocloroso", forte: false, Kas: [3.0e-8] },
  { formula: "C6H5COOH", nome: "ácido benzoico",    forte: false, Kas: [6.3e-5] },
  { formula: "H3BO3",    nome: "ácido bórico",      forte: false, Kas: [5.8e-10] },
  { formula: "H2CO3",    nome: "ácido carbônico",   forte: false, Kas: [4.3e-7, 4.8e-11] },
  { formula: "H2C2O4",   nome: "ácido oxálico",     forte: false, Kas: [5.9e-2, 6.4e-5] },
  { formula: "H3PO4",    nome: "ácido fosfórico",   forte: false, Kas: [7.5e-3, 6.2e-8, 4.2e-13] },
  { formula: "C6H8O7",   nome: "ácido cítrico",     forte: false, Kas: [7.4e-4, 1.7e-5, 4.0e-7] },
];

const BASES = [
  { formula: "NaOH",    nome: "hidróxido de sódio",     forte: true,  hidroxilas: 1 },
  { formula: "KOH",     nome: "hidróxido de potássio",  forte: true,  hidroxilas: 1 },
  { formula: "Ca(OH)2", nome: "hidróxido de cálcio",    forte: true,  hidroxilas: 2 },
  { formula: "NH3",     nome: "amônia",                 forte: false, Kb: 1.8e-5 },
  { formula: "CH3NH2",  nome: "metilamina",             forte: false, Kb: 4.4e-4 },
  { formula: "C5H5N",   nome: "piridina",               forte: false, Kb: 1.7e-9 },
  { formula: "N2H4",    nome: "hidrazina",              forte: false, Kb: 1.3e-6 },
];

function indicadoresConhecidos() { return INDICADORES; }
function coresDeIndicador() { return CORES_DE_INDICADOR; }

function curvaDeTitulacaoInversa(cfg, pontos = 400) {
  /* Base forte com mais de uma hidroxila não tem etapas: o Ca(OH)2 já está
     todo dissociado, então 0,05 mol/L dele são 0,10 mol/L de OH-, e existe um
     único ponto de equivalência. Tratá-lo como diprótico produziria dois
     saltos que não existem e um pH inicial errado. Por isso a concentração é
     escalada e a titulação vira monobásica. */
  const forte = cfg.analitoForte;
  const hidroxilas = forte ? (cfg.hidroxilas || 1) : cfg.Kbs.length;
  const base = forte
    ? { ...cfg, cAnalito: cfg.cAnalito * hidroxilas }
    : cfg;
  const etapas = forte ? 1 : hidroxilas;
  const equivalencias = volumesDeEquivalencia({ ...base, prótons: etapas });
  const vFinal = Math.max(equivalencias[equivalencias.length - 1] * 1.6, equivalencias[0] * 2);

  const dados = [];
  const avaliar = (v) => {
    const pH = pontoDeTitulacaoInversa({ ...base, vTitulante: v });
    if (pH !== null && isFinite(pH)) dados.push({ v, pH });
  };
  for (let i = 0; i <= pontos; i++) avaliar((vFinal * i) / pontos);
  for (const ve of equivalencias) {
    const janela = Math.max(ve * 0.06, 0.05);
    for (let i = 0; i <= 80; i++) {
      const v = ve - janela + (2 * janela * i) / 80;
      if (v >= 0) avaliar(v);
    }
  }
  dados.sort((a, b) => a.v - b.v);
  return { dados, equivalencias, vFinal, inversa: true };
}

/* Bases que servem de analito na curva inversa. As fortes usam o número de
   hidroxilas; as fracas, o Kb. Poliácidos e polibases entram como lista. */
function basesDeTitulacao() {
  return BASES.map((b) => ({
    ...b,
    Kbs: b.forte ? [] : [b.Kb],
    hidroxilas: b.hidroxilas || 1,
  }));
}
