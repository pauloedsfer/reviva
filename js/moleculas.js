/* MOLBOX — o que existe dentro da fórmula.

   Três coisas moram aqui, e vale explicar por que a primeira é um banco
   curado em vez de um algoritmo.

   ESTRUTURA. Não dá para deduzir a estrutura a partir da fórmula molecular:
   C2H6O é etanol ou éter dimetílico, C4H10 é butano ou isobutano, e essa
   multiplicidade é o próprio conceito de isomeria. Qualquer aplicativo que
   desenhasse "a" estrutura de uma fórmula estaria mentindo. Então o desenho
   só aparece para as substâncias deste banco, onde a estrutura foi conferida
   uma a uma, e some para todas as outras.

   INSATURAÇÃO. O índice de deficiência de hidrogênio é calculável e rigoroso
   para compostos de C, H, N, O, S e halogênios. Ele responde à pergunta certa
   — "esta fórmula tem hidrogênio demais para ser possível?" — sem precisar
   saber quais ligações existem.

   NÚCLEO. Prótons e nêutrons contados a partir do isótopo mais abundante,
   com a ressalva de que a massa padrão é uma média isotópica, não a soma de
   núcleons.
*/

/* Bolinhas proporcionais ao raio do núcleo. A escolha não é estética: o raio
   nuclear cresce com a raiz cúbica do número de massa, e é essa a relação
   desenhada. O tamanho do átomo inteiro é outra história — ele depende da
   eletrosfera e não acompanha a massa. */
function raioNucleo(massa) {
  return 6 + 13 * Math.pow(massa / 238, 1 / 3);
}

const LIGACAO_SIMPLES = 1, LIGACAO_DUPLA = 2, LIGACAO_TRIPLA = 3;

/* Cada entrada traz os átomos com posição num quadro de 200 por 130 e as
   ligações entre eles pelo índice. Conferidas uma a uma. */
const BANCO_ESTRUTURAS = {
  "H2O": { nome: "água", geometria: "angular, cerca de 104,5°",
    atomos: [["O",100,50],["H",62,80],["H",138,80]], ligacoes: [[0,1,1],[0,2,1]] },
  "H2": { nome: "gás hidrogênio", geometria: "linear",
    atomos: [["H",75,65],["H",125,65]], ligacoes: [[0,1,1]] },
  "O2": { nome: "gás oxigênio", geometria: "linear, ligação dupla",
    atomos: [["O",72,65],["O",128,65]], ligacoes: [[0,1,2]] },
  "N2": { nome: "gás nitrogênio", geometria: "linear, ligação tripla",
    atomos: [["N",72,65],["N",128,65]], ligacoes: [[0,1,3]] },
  "HCl": { nome: "cloreto de hidrogênio", geometria: "linear",
    atomos: [["H",72,65],["Cl",128,65]], ligacoes: [[0,1,1]] },
  "CO": { nome: "monóxido de carbono", geometria: "linear, ligação tripla",
    atomos: [["C",72,65],["O",128,65]], ligacoes: [[0,1,3]] },
  "CO2": { nome: "gás carbônico", geometria: "linear, 180°",
    atomos: [["O",40,65],["C",100,65],["O",160,65]], ligacoes: [[1,0,2],[1,2,2]] },
  "SO2": { nome: "dióxido de enxofre", geometria: "angular, cerca de 119°",
    atomos: [["S",100,45],["O",50,90],["O",150,90]], ligacoes: [[0,1,2],[0,2,2]] },
  "NH3": { nome: "amônia", geometria: "piramidal",
    atomos: [["N",100,45],["H",100,15],["H",55,85],["H",145,85]], ligacoes: [[0,1,1],[0,2,1],[0,3,1]] },
  "CH4": { nome: "metano", geometria: "tetraédrica, 109,5°",
    atomos: [["C",100,65],["H",100,20],["H",100,110],["H",50,65],["H",150,65]],
    ligacoes: [[0,1,1],[0,2,1],[0,3,1],[0,4,1]] },
  "H2O2": { nome: "peróxido de hidrogênio", geometria: "cadeia aberta, não plana",
    atomos: [["H",40,35],["O",78,65],["O",122,65],["H",160,95]],
    ligacoes: [[0,1,1],[1,2,1],[2,3,1]] },
  "HCN": { nome: "cianeto de hidrogênio", geometria: "linear",
    atomos: [["H",45,65],["C",100,65],["N",155,65]], ligacoes: [[0,1,1],[1,2,3]] },
  "CH2O": { nome: "metanal", geometria: "trigonal plana",
    atomos: [["C",100,70],["O",100,25],["H",52,100],["H",148,100]],
    ligacoes: [[0,1,2],[0,2,1],[0,3,1]] },
  "C2H4": { nome: "eteno", geometria: "plana, ligação dupla entre carbonos",
    atomos: [["C",78,65],["C",122,65],["H",40,35],["H",40,95],["H",160,35],["H",160,95]],
    ligacoes: [[0,1,2],[0,2,1],[0,3,1],[1,4,1],[1,5,1]] },
  "C2H2": { nome: "etino", geometria: "linear, ligação tripla",
    atomos: [["H",42,65],["C",84,65],["C",126,65],["H",168,65]],
    ligacoes: [[0,1,1],[1,2,3],[2,3,1]] },
  "C2H6": { nome: "etano", geometria: "cadeia aberta saturada",
    atomos: [["C",78,65],["C",122,65],["H",42,32],["H",42,98],["H",78,110],["H",158,32],["H",158,98],["H",122,110]],
    ligacoes: [[0,1,1],[0,2,1],[0,3,1],[0,4,1],[1,5,1],[1,6,1],[1,7,1]] },
  "C2H5OH": { nome: "etanol", geometria: "cadeia aberta com hidroxila",
    atomos: [["C",55,70],["C",105,70],["O",152,70],["H",22,42],["H",22,98],["H",55,112],
             ["H",105,28],["H",105,112],["H",182,42]],
    ligacoes: [[0,1,1],[1,2,1],[2,8,1],[0,3,1],[0,4,1],[0,5,1],[1,6,1],[1,7,1]] },
  "CH3COOH": { nome: "ácido acético", geometria: "cadeia aberta com carboxila",
    atomos: [["C",52,70],["C",105,70],["O",105,25],["O",152,95],["H",188,72],
             ["H",20,42],["H",20,98],["H",52,112]],
    ligacoes: [[0,1,1],[1,2,2],[1,3,1],[3,4,1],[0,5,1],[0,6,1],[0,7,1]] },
};

/* NaCl e companhia não formam molécula: são retículos iônicos. Desenhar
   "uma molécula de NaCl" seria ensinar errado, então essas entram com aviso
   em vez de desenho. */
const RETICULOS_IONICOS = {
  "NaCl": "cloreto de sódio", "KCl": "cloreto de potássio", "CaCl2": "cloreto de cálcio",
  "NaOH": "hidróxido de sódio", "KOH": "hidróxido de potássio", "CaCO3": "carbonato de cálcio",
  "NaHCO3": "bicarbonato de sódio", "CuSO4": "sulfato de cobre", "AgNO3": "nitrato de prata",
  "KNO3": "nitrato de potássio", "Na2CO3": "carbonato de sódio", "MgO": "óxido de magnésio",
  "KMnO4": "permanganato de potássio", "CaO": "óxido de cálcio", "MgSO4": "sulfato de magnésio",
};

/* As substâncias cujo desenho foi conferido. Serve à interface, que informa
   ao aluno o tamanho do acervo quando a fórmula pedida não está nele. */
function estruturasConhecidas() { return BANCO_ESTRUTURAS; }
function quantasEstruturas() { return Object.keys(BANCO_ESTRUTURAS).length; }

function chaveEstrutura(analise) {
  return analise.normalizada.replace(/\^.*$/, "");
}

function estruturaDe(analise) {
  const chave = chaveEstrutura(analise);
  if (BANCO_ESTRUTURAS[chave]) return { tipo: "molecular", chave, dados: BANCO_ESTRUTURAS[chave] };
  if (RETICULOS_IONICOS[chave]) return { tipo: "ionico", chave, nome: RETICULOS_IONICOS[chave] };
  return { tipo: "ausente", chave };
}

/* Desenha a estrutura em SVG. Ligações duplas e triplas viram linhas
   paralelas, deslocadas perpendicularmente ao eixo da ligação. */
function desenharEstrutura(dados) {
  const partes = [];

  for (const [a, b, ordem] of dados.ligacoes) {
    const [, x1, y1] = dados.atomos[a];
    const [, x2, y2] = dados.atomos[b];
    const dx = x2 - x1, dy = y2 - y1;
    const comprimento = Math.hypot(dx, dy) || 1;
    const px = (-dy / comprimento), py = (dx / comprimento);
    const espaco = 3.2;

    const deslocamentos = ordem === 1 ? [0] : ordem === 2 ? [-espaco, espaco] : [-espaco * 1.9, 0, espaco * 1.9];
    for (const d of deslocamentos) {
      partes.push(`<line x1="${(x1 + px * d).toFixed(1)}" y1="${(y1 + py * d).toFixed(1)}" ` +
                  `x2="${(x2 + px * d).toFixed(1)}" y2="${(y2 + py * d).toFixed(1)}" ` +
                  `stroke="currentColor" stroke-width="1.8" stroke-linecap="round" opacity="0.55"/>`);
    }
  }

  for (const [simbolo, x, y] of dados.atomos) {
    const e = POR_SIMBOLO[simbolo];
    const r = raioNucleo(e.massa);
    partes.push(
      `<circle cx="${x}" cy="${y}" r="${r.toFixed(1)}" class="atomo a-${simbolo}"/>` +
      `<text x="${x}" y="${y}" class="rotulo-atomo" text-anchor="middle" dominant-baseline="central" ` +
      `font-size="${Math.max(9, r * 0.95).toFixed(1)}">${simbolo}</text>`
    );
  }

  return `<svg viewBox="0 0 200 130" role="img" aria-label="Estrutura de ${dados.nome}">` +
         `<title>Estrutura de ${dados.nome}</title>${partes.join("")}</svg>`;
}

/* ---------------- índice de deficiência de hidrogênio ---------------- */

const HALOGENIOS = ["F", "Cl", "Br", "I"];
const ACEITOS_IDH = ["C", "H", "N", "O", "S", "F", "Cl", "Br", "I"];

function indiceInsaturacao(analise) {
  const c = analise.composicao;
  for (const s in c) if (!ACEITOS_IDH.includes(s)) return null;
  const C = c.C || 0;
  if (C === 0) return null;

  const H = c.H || 0;
  const N = c.N || 0;
  const X = HALOGENIOS.reduce((soma, s) => soma + (c[s] || 0), 0);
  const idh = (2 * C + 2 + N - H - X) / 2;

  if (idh < 0) {
    const maximo = 2 * C + 2 + N - X;
    return {
      idh, situacao: "impossivel",
      titulo: "Esta fórmula não pode existir",
      mensagem: `Com ${C} carbono${C === 1 ? "" : "s"}${N ? ` e ${N} nitrogênio${N === 1 ? "" : "s"}` : ""}, ` +
        `o máximo de hidrogênios é ${maximo}. A fórmula traz ${H}${X ? ` mais ${X} halogênio${X === 1 ? "" : "s"}` : ""}, ` +
        `o que exigiria ligações a mais do que o carbono consegue fazer.`,
    };
  }

  if (!Number.isInteger(idh)) {
    return {
      idh, situacao: "impossivel",
      titulo: "Esta fórmula não fecha",
      mensagem: "O índice deu fracionário, o que significa número ímpar de elétrons de valência. " +
        "Para uma molécula neutra e estável isso não acontece: falta ou sobra um hidrogênio.",
    };
  }

  let leitura;
  if (idh === 0) leitura = "Saturada e sem anéis: só ligações simples numa cadeia aberta.";
  else if (idh === 1) leitura = "Uma insaturação: uma ligação dupla ou um anel, nunca as duas coisas.";
  else if (idh >= 4 && C >= 6) leitura = `${idh} insaturações. Com ${C} carbonos, quatro delas costumam ser um anel aromático — três duplas mais o próprio ciclo.`;
  else leitura = `${idh} insaturações, distribuídas entre ligações duplas, triplas (que valem duas) e anéis.`;

  return { idh, situacao: "ok", titulo: `Índice de insaturação: ${idh}`, mensagem: leitura };
}

/* ---------------- núcleo e eletrosfera ---------------- */

function contarNucleo(analise) {
  const itens = [];
  let protons = 0, neutrons = 0, somaNucleons = 0;

  for (const item of analise.itens) {
    const e = POR_SIMBOLO[item.simbolo];
    const p = e.z * item.quantidade;
    const n = e.neutrons * item.quantidade;
    protons += p;
    neutrons += n;
    somaNucleons += e.isotopo * item.quantidade;
    itens.push({
      simbolo: item.simbolo, nome: item.nome, quantidade: item.quantidade,
      z: e.z, neutrons: e.neutrons, isotopo: e.isotopo,
      protonsTotal: p, neutronsTotal: n, incerta: e.incerta,
    });
  }

  // numa espécie carregada, elétrons não empatam com prótons
  const eletrons = protons - analise.carga;
  const massaEletrons = eletrons * MASSA_ELETRON;
  const fracaoEletrons = (massaEletrons / analise.massaMolar) * 100;
  const diferenca = analise.massaMolar - somaNucleons;

  return {
    itens, protons, neutrons, eletrons,
    nucleons: protons + neutrons,
    somaNucleons, massaEletrons, fracaoEletrons, diferenca,
  };
}
