/* MOLBOX — bancada virtual de titulação.

   Aqui o aluno não calcula: ele titula. A bureta e o béquer ficam sempre
   visíveis, cada clique deixa cair uma gota, e a solução muda de cor quando
   passa da faixa de viragem.

   A convenção de bancada que dá sentido ao exercício: **20 gotas = 1 mL**.
   É a razão pela qual titular exige paciência — perto do ponto final, uma
   única gota decide o resultado, e é isso que o aluno precisa sentir na mão
   antes de aceitar que a conta importa.

   O cálculo do pH não é reimplementado aqui: reaproveita `phDaTitulacao` de
   acidobase.js, que resolve o balanço de cargas por bisseção. Duas
   implementações do mesmo pH divergiriam, e a bancada acabaria discordando
   do gráfico da tela ao lado.
*/

const GOTAS_POR_ML = 20;
const ML_POR_GOTA = 1 / GOTAS_POR_ML;
const ML_POR_SEGUNDO_SEGURANDO = 1;   // fluxo contínuo ao segurar o botão

/* Pares prontos, escolhidos entre os que aparecem de fato em aula técnica.
   Cada um traz a equação já balanceada, porque montar a equação não é o que
   se treina aqui — e ver a proporção antes de titular é justamente o que
   liga a bancada à estequiometria. */
const PARES_DE_TITULACAO = [
  {
    id: "hcl-naoh",
    analito: { formula: "HCl", nome: "ácido clorídrico", forte: true, Kas: [], protons: 1 },
    titulante: { formula: "NaOH", nome: "hidróxido de sódio", forte: true },
    equacao: "HCl + NaOH → NaCl + H2O",
    proporcao: 1,
    indicadorSugerido: "Fenolftaleína",
    contexto: "O par mais comum do laboratório: ácido forte com base forte. O salto no ponto de equivalência é enorme, então quase qualquer indicador funciona.",
  },
  {
    id: "ch3cooh-naoh",
    analito: { formula: "CH3COOH", nome: "ácido acético", forte: false, Kas: [1.8e-5], protons: 1 },
    titulante: { formula: "NaOH", nome: "hidróxido de sódio", forte: true },
    equacao: "CH3COOH + NaOH → CH3COONa + H2O",
    proporcao: 1,
    indicadorSugerido: "Fenolftaleína",
    contexto: "Ácido fraco com base forte: a equivalência cai em pH básico, perto de 8,7, porque o acetato formado é uma base. Alaranjado de metila viraria cedo demais e daria erro grosseiro.",
  },
  {
    id: "h3po4-naoh",
    analito: { formula: "H3PO4", nome: "ácido fosfórico", forte: false, Kas: [7.11e-3, 6.32e-8, 4.5e-13], protons: 3 },
    titulante: { formula: "NaOH", nome: "hidróxido de sódio", forte: true },
    equacao: "H3PO4 + 3 NaOH → Na3PO4 + 3 H2O",
    proporcao: 3,
    indicadorSugerido: "Fenolftaleína",
    contexto: "Ácido triprótico: a curva tem mais de um salto. O terceiro próton é fraco demais para dar salto visível em água, então na prática se titula até o segundo.",
  },
  {
    id: "h2so4-naoh",
    analito: { formula: "H2SO4", nome: "ácido sulfúrico", forte: false, Kas: [1.0e3, 1.02e-2], protons: 2 },
    titulante: { formula: "NaOH", nome: "hidróxido de sódio", forte: true },
    equacao: "H2SO4 + 2 NaOH → Na2SO4 + 2 H2O",
    proporcao: 2,
    indicadorSugerido: "Fenolftaleína",
    contexto: "Diprótico: cada mol de ácido consome dois de base. Esquecer a proporção 1:2 é o erro clássico, e faz o resultado sair pela metade.",
  },
  {
    id: "hno3-naoh",
    analito: { formula: "HNO3", nome: "ácido nítrico", forte: true, Kas: [], protons: 1 },
    titulante: { formula: "NaOH", nome: "hidróxido de sódio", forte: true },
    equacao: "HNO3 + NaOH → NaNO3 + H2O",
    proporcao: 1,
    indicadorSugerido: "Azul de bromotimol",
    contexto: "Forte com forte, como o clorídrico. A equivalência fica exatamente em pH 7.",
  },
  {
    id: "hcooh-naoh",
    analito: { formula: "HCOOH", nome: "ácido fórmico", forte: false, Kas: [1.8e-4], protons: 1 },
    titulante: { formula: "NaOH", nome: "hidróxido de sódio", forte: true },
    equacao: "HCOOH + NaOH → HCOONa + H2O",
    proporcao: 1,
    indicadorSugerido: "Fenolftaleína",
    contexto: "Ácido fraco, porém dez vezes mais forte que o acético. O salto é um pouco maior, e a equivalência cai um pouco mais baixa.",
  },
];

/* ---------------- titulação inversa ----------------

   Ácido na bureta, base no béquer. É o outro metade do laboratório, e a curva
   desce em vez de subir.

   O pH sai por espelhamento, não por uma segunda implementação: o balanço de
   cargas de uma base fraca titulada com ácido forte é o mesmo de um ácido
   fraco titulado com base forte, trocando [H+] por [OH-] e Ka por Kb. Então
   calculamos o pOH com o motor que já existe, usando os Kb como se fossem Ka,
   e devolvemos pKw menos o resultado. Uma segunda rotina de pH acabaria
   discordando da primeira em algum caso de borda.
*/
const PARES_INVERSOS = [
  {
    id: "naoh-hcl", inverso: true,
    analito: { formula: "NaOH", nome: "hidróxido de sódio", forte: true, Kbs: [], protons: 1 },
    titulante: { formula: "HCl", nome: "ácido clorídrico", forte: true },
    equacao: "NaOH + HCl → NaCl + H2O",
    proporcao: 1,
    indicadorSugerido: "Alaranjado de metila",
    contexto: "Base forte no béquer, ácido forte na bureta. A curva desce de pH 13 para pH 1, e a equivalência continua em pH 7 — mas agora o indicador vira de trás para frente.",
  },
  {
    id: "nh3-hcl", inverso: true,
    analito: { formula: "NH3", nome: "amônia", forte: false, Kbs: [1.8e-5], protons: 1 },
    titulante: { formula: "HCl", nome: "ácido clorídrico", forte: true },
    equacao: "NH3 + HCl → NH4Cl",
    proporcao: 1,
    indicadorSugerido: "Vermelho de metila",
    contexto: "Base fraca com ácido forte: a equivalência cai em pH ácido, perto de 5,3, porque o amônio formado é um ácido. Fenolftaleína viraria muito antes e daria erro enorme.",
  },
  {
    id: "na2co3-hcl", inverso: true,
    analito: { formula: "Na2CO3", nome: "carbonato de sódio", forte: false, Kbs: [2.13e-4, 2.25e-8], protons: 2 },
    titulante: { formula: "HCl", nome: "ácido clorídrico", forte: true },
    equacao: "Na2CO3 + 2 HCl → 2 NaCl + H2O + CO2",
    proporcao: 2,
    indicadorSugerido: "Alaranjado de metila",
    contexto: "Base diprótica: tem dois saltos. O primeiro, em fenolftaleína, marca a passagem a bicarbonato; o segundo, em alaranjado de metila, marca a neutralização completa. É a base da análise de alcalinidade.",
  },
];

function paresDeTitulacao() { return PARES_DE_TITULACAO.concat(PARES_INVERSOS); }
function parDeTitulacao(id) { return paresDeTitulacao().filter((p) => p.id === id)[0] || null; }

/* ---------------- estado da bancada ---------------- */

function novaBancada(cfg) {
  const b = {
    parId: cfg.parId,
    indicador: cfg.indicador,
    cAnalito: cfg.cAnalito,
    vAnalito: cfg.vAnalito,
    cTitulante: cfg.cTitulante,
    volumeBureta: cfg.volumeBureta || 50,
    gotas: 0,
    historico: [],
    viradaVistaEm: null,   // volume em que a cor mudou, se já mudou
    faseInicial: null,     // preenchido logo abaixo, na primeira leitura
  };
  b.faseInicial = lerBancada(b).fase;
  return b;
}

/* ---------------- leitura instantânea ---------------- */

/* Devolve tudo que a tela precisa desenhar depois de cada gota. O pH sai de
   `phDaTitulacao`, o mesmo do gráfico da outra tela. */
function lerBancada(b) {
  const par = parDeTitulacao(b.parId);
  const ind = indicadoresConhecidos().filter((i) => i.nome === b.indicador)[0]
    || indicadoresConhecidos().filter((i) => i.nome === par.indicadorSugerido)[0]
    || indicadoresConhecidos()[0];

  const volumeAdicionado = b.gotas * ML_POR_GOTA;

  const pH = phDaBancada(par, b, volumeAdicionado);

  const vEquivalencia = (b.cAnalito * b.vAnalito * par.proporcao) / b.cTitulante;

  // qual cor o béquer mostra agora — o rótulo "ácida" e "básica" se refere ao
  // lado do indicador, não ao sentido da titulação

  let fase, corAtual;
  if (pH < ind.inicio) { fase = "acida"; corAtual = ind.corAcida; }
  else if (pH > ind.fim) { fase = "basica"; corAtual = ind.corBasica; }
  else { fase = "viragem"; corAtual = "mistura"; }

  const excedeu = volumeAdicionado > b.volumeBureta + 1e-9;

  return {
    par, indicador: ind,
    volumeAdicionado, gotas: b.gotas,
    pH, fase, corAtual,
    corAcida: ind.corAcida, corBasica: ind.corBasica,
    vEquivalencia,
    restaNaBureta: Math.max(0, b.volumeBureta - volumeAdicionado),
    buretaVazia: excedeu,
    volumeNoBequer: b.vAnalito + volumeAdicionado,
    proporcao: par.proporcao,
    equacao: par.equacao,
  };
}

/* ---------------- adicionar titulante ---------------- */

/* `quantidade` em gotas. Devolve o que mudou, para a tela poder reagir ao
   momento exato da virada em vez de ficar comparando estados. */
/* Espelhamento descrito acima. Para o sentido direto, chama o motor de
   sempre; para o inverso, calcula o pOH e devolve o complemento. */
function phDaBancada(par, b, volumeAdicionado) {
  if (!par.inverso) {
    return pontoDeTitulacao({
      cAnalito: b.cAnalito, vAnalito: b.vAnalito,
      cTitulante: b.cTitulante, vTitulante: volumeAdicionado,
      Kas: par.analito.Kas, analitoForte: par.analito.forte,
    });
  }
  const pOH = pontoDeTitulacao({
    cAnalito: b.cAnalito, vAnalito: b.vAnalito,
    cTitulante: b.cTitulante, vTitulante: volumeAdicionado,
    Kas: par.analito.Kbs, analitoForte: par.analito.forte,
  });
  return pOH === null ? null : PKW_25 - pOH;
}

function pingar(b, gotas) {
  const antes = lerBancada(b);
  const cabem = Math.max(0, Math.round((b.volumeBureta - antes.volumeAdicionado) * GOTAS_POR_ML));
  const efetivas = Math.min(gotas, cabem);
  b.gotas += efetivas;

  const depois = lerBancada(b);
  // na titulação inversa a curva desce, então a virada não é "sair do ácido":
  // é sair da fase em que a titulação começou
  const virou = antes.fase === b.faseInicial && depois.fase !== b.faseInicial;
  if (virou && b.viradaVistaEm === null) b.viradaVistaEm = depois.volumeAdicionado;

  b.historico.push({ volume: depois.volumeAdicionado, pH: depois.pH });
  if (b.historico.length > 400) b.historico.shift();

  return {
    leitura: depois,
    gotasAdicionadas: efetivas,
    recusadas: gotas - efetivas,
    virou,
    mudouDeFase: antes.fase !== depois.fase,
    faseAnterior: antes.fase,
    saltoDepH: depois.pH - antes.pH,
  };
}

function esvaziarBequer(b) {
  b.gotas = 0;
  b.historico = [];
  b.viradaVistaEm = null;
}

/* ---------------- avaliação do resultado ---------------- */

/* Depois de parar, o aluno declara o volume gasto e o aplicativo confere.
   O julgamento não é "certo ou errado": é o erro relativo, que é como um
   laboratório de verdade avalia. */
function avaliarTitulacao(b) {
  const l = lerBancada(b);
  const parou = l.volumeAdicionado;
  const erroRelativo = ((parou - l.vEquivalencia) / l.vEquivalencia) * 100;

  // concentração que o aluno teria calculado com o volume em que parou
  const cEncontrada = (b.cTitulante * parou) / (b.vAnalito * l.proporcao);

  let veredito, comentario;
  const absErro = Math.abs(erroRelativo);
  if (absErro <= 0.5) {
    veredito = "excelente";
    comentario = "Erro abaixo de 0,5%. É a precisão que se espera de uma titulação bem feita.";
  } else if (absErro <= 2) {
    veredito = "bom";
    comentario = "Erro aceitável para um primeiro treino, mas ainda longe do que um laudo exige. Perto do ponto final, vá de gota em gota.";
  } else if (erroRelativo > 0) {
    veredito = "passou";
    comentario = "Você passou do ponto de equivalência. É o erro mais comum: o analista só enxerga a cor depois que ela já se firmou. A solução é reduzir a vazão bem antes do fim.";
  } else {
    veredito = "faltou";
    comentario = "Você parou antes da equivalência. A cor apareceu localmente, onde a gota caiu, e sumiu com a agitação — isso não é o ponto final. Continue até a cor persistir.";
  }

  return {
    volumeGasto: parou,
    vEquivalencia: l.vEquivalencia,
    erroRelativo,
    cEncontrada,
    cVerdadeira: b.cAnalito,
    veredito, comentario,
    pHFinal: l.pH,
    gotas: b.gotas,
  };
}

function gotasPorML() { return GOTAS_POR_ML; }
function mlPorSegundoSegurando() { return ML_POR_SEGUNDO_SEGURANDO; }

/* ---------------- desenho da bancada ----------------

   A cena é um SVG único: bureta em cima, béquer embaixo, e uma gota entre as
   duas quando ainda há líquido para escoar. Fica no módulo, e não na
   interface, porque a geometria depende dos volumes — é informação, não
   enfeite.
*/

/* Mistura duas cores em hexadecimal, usada na faixa de viragem: ali a
   solução não tem a cor ácida nem a básica, e sim o tom intermediário que o
   analista está tentando enxergar. */
function misturarCores(a, b, peso = 0.5) {
  const ler = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r1, g1, b1] = ler(a), [r2, g2, b2] = ler(b);
  const m = (x, y) => Math.round(x + (y - x) * peso).toString(16).padStart(2, "0");
  return `#${m(r1, r2)}${m(g1, g2)}${m(b1, b2)}`;
}

function corDaSolucao(leitura) {
  const cA = corDeIndicador(leitura.corAcida);
  const cB = corDeIndicador(leitura.corBasica);
  if (leitura.fase === "acida") return cA;
  if (leitura.fase === "basica") return cB;
  // dentro da faixa: posição relativa entre início e fim da viragem
  const ind = leitura.indicador;
  const t = Math.min(1, Math.max(0, (leitura.pH - ind.inicio) / (ind.fim - ind.inicio)));
  return misturarCores(cA, cB, t);
}

function svgDaBancada(l) {
  const A = 340, L = 260;                     // altura e largura da cena
  const bx = 118, bTopo = 8, bAltura = 150, bLarg = 24;   // bureta
  const fracao = Math.max(0, Math.min(1, l.restaNaBureta / 50));
  const alturaLiquido = bAltura * fracao;
  const yLiquido = bTopo + (bAltura - alturaLiquido);

  const corSol = corDaSolucao(l);

  // béquer: trapézio de 200 a 320 no eixo vertical
  const bqTopo = 214, bqBase = 320, bqEsq = 74, bqDir = 186;
  const capacidade = Math.max(l.volumeNoBequer, 60);
  const nivel = Math.min(0.88, l.volumeNoBequer / (capacidade * 1.35));
  const yNivel = bqBase - (bqBase - bqTopo) * nivel;

  const graduacoes = [];
  for (let i = 0; i <= 5; i++) {
    const y = bTopo + (bAltura * i) / 5;
    graduacoes.push(`<line x1="${bx + bLarg}" y1="${y}" x2="${bx + bLarg + 6}" y2="${y}" class="tracinho"/>`);
    graduacoes.push(`<text x="${bx + bLarg + 9}" y="${y + 3.5}" class="rot-bureta">${i * 10}</text>`);
  }

  const gota = l.restaNaBureta > 0
    ? `<ellipse cx="${bx + bLarg / 2}" cy="196" rx="4.5" ry="6" fill="${corDeIndicador(l.corBasica)}" class="gota-caindo"/>`
    : "";

  return `<svg viewBox="0 0 ${L} ${A}" class="svg-bancada" role="img" ` +
    `aria-label="Bureta com ${l.restaNaBureta.toFixed(1)} mililitros e béquer com solução ${l.fase === "viragem" ? "na viragem" : l.corAtual}">` +

    // bureta
    `<rect x="${bx}" y="${bTopo}" width="${bLarg}" height="${bAltura}" rx="3" class="vidro"/>` +
    `<rect x="${bx}" y="${yLiquido}" width="${bLarg}" height="${alturaLiquido}" rx="3" class="liquido-bureta"/>` +
    graduacoes.join("") +
    // torneira
    `<rect x="${bx + bLarg / 2 - 3}" y="${bTopo + bAltura}" width="6" height="26" class="vidro"/>` +
    `<rect x="${bx + bLarg / 2 - 12}" y="${bTopo + bAltura + 8}" width="24" height="7" rx="3.5" class="torneira"/>` +
    `<path d="M ${bx + bLarg / 2 - 3} ${bTopo + bAltura + 26} L ${bx + bLarg / 2 + 3} ${bTopo + bAltura + 26} ` +
    `L ${bx + bLarg / 2} ${bTopo + bAltura + 36} Z" class="vidro"/>` +
    gota +

    // béquer
    `<path d="M ${bqEsq} ${bqTopo} L ${bqEsq + 8} ${bqBase} L ${bqDir - 8} ${bqBase} L ${bqDir} ${bqTopo}" class="vidro-bequer"/>` +
    `<clipPath id="dentro-bequer"><path d="M ${bqEsq} ${bqTopo} L ${bqEsq + 8} ${bqBase} L ${bqDir - 8} ${bqBase} L ${bqDir} ${bqTopo} Z"/></clipPath>` +
    `<g clip-path="url(#dentro-bequer)">` +
    `<rect x="${bqEsq - 4}" y="${yNivel}" width="${bqDir - bqEsq + 8}" height="${bqBase - yNivel}" fill="${corSol}" class="solucao"/>` +
    `<ellipse cx="${(bqEsq + bqDir) / 2}" cy="${yNivel}" rx="${(bqDir - bqEsq) / 2}" ry="4" fill="${corSol}" class="menisco"/>` +
    `</g>` +
    `<text x="${(bqEsq + bqDir) / 2}" y="${bqBase - 12}" class="rot-bequer" text-anchor="middle">` +
    `${l.volumeNoBequer.toFixed(1)} mL</text>` +
    `</svg>`;
}
