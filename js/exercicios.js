/* MOLBOX — gerador de exercícios.

   Duas ideias sustentam este arquivo.

   1. Os exercícios são paramétricos, não um banco fixo. Cada chamada sorteia
      substância e valores, então o aluno nunca decora a resposta: ele precisa
      refazer o caminho.

   2. Cada exercício carrega, junto da resposta certa, a lista dos valores que
      resultam dos erros típicos daquele tipo de conta. Quando a resposta do
      aluno bate com um desses valores, o aplicativo não diz "errado" — diz
      qual passo foi trocado. Essa lista é o coração pedagógico do MOLBOX.
*/

const SUBSTANCIAS = [
  { f: "H2O",        nome: "água",                     gas: false },
  { f: "NaOH",       nome: "hidróxido de sódio",       gas: false },
  { f: "NaCl",       nome: "cloreto de sódio",         gas: false },
  { f: "H2SO4",      nome: "ácido sulfúrico",          gas: false },
  { f: "CaCO3",      nome: "carbonato de cálcio",      gas: false },
  { f: "Ca(OH)2",    nome: "hidróxido de cálcio",      gas: false },
  { f: "NaHCO3",     nome: "bicarbonato de sódio",     gas: false },
  { f: "KMnO4",      nome: "permanganato de potássio", gas: false },
  { f: "C6H12O6",    nome: "glicose",                  gas: false },
  { f: "C12H22O11",  nome: "sacarose",                 gas: false },
  { f: "C2H5OH",     nome: "etanol",                   gas: false },
  { f: "CH3COOH",    nome: "ácido acético",            gas: false },
  { f: "AgNO3",      nome: "nitrato de prata",         gas: false },
  { f: "KNO3",       nome: "nitrato de potássio",      gas: false },
  { f: "Al2(SO4)3",  nome: "sulfato de alumínio",      gas: false },
  { f: "Fe2O3",      nome: "óxido de ferro III",       gas: false },
  { f: "CuSO4·5H2O", nome: "sulfato de cobre penta-hidratado", gas: false },
  { f: "MgSO4",      nome: "sulfato de magnésio",      gas: false },
  { f: "KCl",        nome: "cloreto de potássio",      gas: false },
  { f: "Na2CO3",     nome: "carbonato de sódio",       gas: false },
  { f: "H2O2",       nome: "peróxido de hidrogênio",   gas: false },
  { f: "O2",         nome: "gás oxigênio",             gas: true  },
  { f: "N2",         nome: "gás nitrogênio",           gas: true  },
  { f: "H2",         nome: "gás hidrogênio",           gas: true  },
  { f: "CO2",        nome: "gás carbônico",            gas: true  },
  { f: "CH4",        nome: "metano",                   gas: true  },
  { f: "NH3",        nome: "amônia",                   gas: true  },
  { f: "CO",         nome: "monóxido de carbono",      gas: true  },
  { f: "SO2",        nome: "dióxido de enxofre",       gas: true  },
];

const COM_PARENTESES = ["Ca(OH)2", "Al2(SO4)3", "Mg(NO3)2", "Ca3(PO4)2", "Fe(OH)3", "(NH4)2SO4", "Ba(NO3)2", "Al(OH)3"];

const VALORES_BONITOS = [0.5, 1.0, 2.0, 2.5, 4.0, 5.0, 8.0, 10.0, 20.0, 25.0, 40.0, 50.0, 100.0];
const VALORES_MOL     = [0.10, 0.20, 0.25, 0.50, 0.75, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0];

const DEGRAUS = [
  { n: 0, nome: "A ideia",  resumo: "o que é o mol, para que serve e de onde vem o número" },
  { n: 1, nome: "Átomo",    resumo: "massa atômica, símbolo e contagem de átomos numa fórmula" },
  { n: 2, nome: "Contagem", resumo: "a constante de Avogadro e o salto entre contar e medir" },
  { n: 3, nome: "Mol",      resumo: "a ponte completa: massa, mol, entidades e volume" },
  { n: 4, nome: "Reação",   resumo: "coeficientes, proporção entre substâncias e reagente limitante" },
];

/* As reações dos exercícios vêm de `especies.js`, que é a mesma fonte do
   montador e do treino de balanceamento. Havia duas listas com o mesmo
   propósito; a que ficava aqui não recebia as reações novas, e o aluno via no
   montador uma reação que o treino nunca cobrava. Uma lista só resolve isso,
   pelo mesmo motivo que existe um banco só de perguntas do degrau 0.

   Elas ficam sem coeficientes: o próprio balanceador os calcula na hora, então
   não há número decorado no código que possa divergir do que o app ensina. */
function reacoesDoTreino() {
  return receitasDeAula().map((r) => textoDaMontagem(r.reagentes, r.produtos));
}

function sortearReacao(minimoReagentes) {
  for (let tentativa = 0; tentativa < 30; tentativa++) {
    const bruta = sortear(reacoesDoTreino());
    try {
      const b = balancear(bruta);
      if (minimoReagentes && b.reagentes.length < minimoReagentes) continue;
      return b;
    } catch (e) { /* passa para a próxima */ }
  }
  return balancear("H2 + O2 -> H2O");
}

const ACERTOS_PARA_LIBERAR = 5;

function sortear(lista) { return lista[Math.floor(Math.random() * lista.length)]; }

/* A equação sem coeficiente algum, para o enunciado de balanceamento. */
function escreverEsqueleto(b) {
  const lado = (l) => l.map(e => e.vista).join(" + ");
  return `<span class="eq-linha">${lado(b.reagentes)} → ${lado(b.produtos)}</span>`;
}

/* A equação balanceada, em linha, para citar dentro de um enunciado. */
function escreverEquacaoTextoCurto(b) {
  const lado = (l) => l.map(e => (e.coeficiente === 1 ? "" : e.coeficiente + " ") + e.vista).join(" + ");
  return `<span class="eq-linha">${lado(b.reagentes)} → ${lado(b.produtos)}</span>`;
}

function sortearSubstancia(apenasGas) {
  const universo = apenasGas ? SUBSTANCIAS.filter(s => s.gas) : SUBSTANCIAS;
  return sortear(universo);
}

function comFormula(s) {
  const a = analisar(s.f);
  return { ...s, analise: a, M: a.massaMolar, vista: formatarFormula(a.normalizada) };
}

/* Um erro previsto: o valor que ele produz e a frase que nomeia o engano. */
function engano(valor, mensagem) { return { valor, mensagem }; }

/* ---------------- geradores por tipo ---------------- */


/* ---------------- degrau 0: a ideia ----------------

   Perguntas conceituais sobre o conteúdo da tela de abertura. São de múltipla
   escolha porque aqui não há conta a fazer: o que se verifica é se a ideia
   ficou de pé. Cada alternativa errada carrega o próprio diagnóstico, do mesmo
   jeito que os erros numéricos dos outros degraus.
*/

const PERGUNTAS_DA_IDEIA = [
  {
    id: "tamanho-do-pacote",
    enunciado: "Uma dúzia é um pacote de 12. Uma resma é um pacote de 500. O <strong>mol</strong> é um pacote de quantas unidades?",
    opcoes: [
      { texto: "6,02×10²³", correta: true },
      { texto: "1 000 000", diagnostico: "Um milhão é grande para nós, mas minúsculo para átomos. Um milhão de moléculas de água seria invisível até no microscópio." },
      { texto: "1000", diagnostico: "Mil é o pacote do quilo, não do mol. O mol precisa ser muito maior porque átomos são muito menores." },
      { texto: "100", diagnostico: "Cem é o pacote da porcentagem. O mol tem vinte e três zeros a mais." },
    ],
    resolucao: "O mol contém 6,02214076×10²³ unidades. É um pacote como a dúzia — só que gigantesco, porque átomos são pequenos e numerosos demais para qualquer pacote menor.",
    dica: "Pense no número que aparece o tempo todo na tela de abertura, com vinte e três zeros.",
  },
  {
    id: "por-que-existe",
    enunciado: "Por que o mol existe?",
    opcoes: [
      { texto: "Porque átomos são pequenos e numerosos demais para contar um a um", correta: true },
      { texto: "Porque os químicos gostam de números grandes", diagnostico: "O tamanho não é gosto: é necessidade. Um pacote menor não conseguiria juntar átomos suficientes para caber numa balança." },
      { texto: "Para deixar as contas de química mais difíceis", diagnostico: "É o contrário. O mol existe justamente para transformar uma contagem impossível numa pesagem simples." },
      { texto: "Para medir o volume dos gases", diagnostico: "O volume molar é uma aplicação do mol, não a razão de ele existir. Ele serve para contar qualquer partícula, gás ou não." },
    ],
    resolucao: "O mol é a resposta a um problema prático: ninguém consegue contar partículas uma a uma, mas todo mundo consegue pesar. O mol traduz uma coisa na outra.",
    dica: "Volte à primeira frase da tela de abertura.",
  },
  {
    id: "volume-de-um-mol",
    enunciado: "Um mol de <strong>gotas</strong> de água encheria cerca de 2% de todos os oceanos. E um mol de <strong>moléculas</strong> de água, quanto ocupa?",
    opcoes: [
      { texto: "Cerca de uma colher de sopa", correta: true },
      { texto: "Uma piscina olímpica", diagnostico: "Longe disso. É esse contraste que revela o tamanho da molécula: a mesma quantidade que encheria parte de um oceano em gotas cabe na sua mão em moléculas." },
      { texto: "Um copo de 200 mL", diagnostico: "Perto, mas ainda grande. Um mol de água são cerca de 18 mL — pouco mais de uma colher de sopa." },
      { texto: "Também 2% dos oceanos", diagnostico: "Não. Se fosse igual, a molécula teria o tamanho de uma gota, e você conseguiria ver moléculas a olho nu." },
    ],
    resolucao: "Um mol de água pesa cerca de 18 g e ocupa cerca de 18 mL. A distância entre 2% dos oceanos e uma colher de sopa é exatamente o tamanho de uma molécula.",
    dica: "Um mol de água pesa 18 g, e a densidade da água é 1 g/mL.",
  },
  {
    id: "tabela-periodica",
    enunciado: "Na tabela periódica, embaixo do carbono está escrito <strong>12,011</strong>. O que esse número significa?",
    opcoes: [
      { texto: "Um átomo pesa 12,011 u e um mol de átomos pesa 12,011 g", correta: true },
      { texto: "Só que um átomo de carbono pesa 12,011 gramas", diagnostico: "Um átomo não pesa gramas — pesa 12,011 u, que é uma unidade minúscula. Só o pacote inteiro, o mol, é que pesa 12,011 gramas." },
      { texto: "Que existem 12,011 tipos de carbono", diagnostico: "Esse número é massa, não contagem. O carbono tem três isótopos naturais, e 12,011 é a média ponderada da massa deles." },
      { texto: "Que o carbono tem 12,011 prótons", diagnostico: "Próton é número inteiro: o carbono tem exatamente 6. O 12,011 é massa, e é fracionário porque é média entre isótopos." },
    ],
    resolucao: "O mesmo número serve duas vezes: em unidades de massa atômica para um átomo, e em gramas para um mol inteiro. O tamanho do mol foi calibrado para que isso acontecesse — é o que torna a tabela periódica um instrumento de bancada.",
    dica: "É o mesmo número dos dois lados da ponte, mudando só a unidade.",
  },
  {
    id: "onde-esta-a-massa",
    enunciado: "Quase toda a massa de um átomo está em qual parte?",
    opcoes: [
      { texto: "No núcleo, nos prótons e nêutrons", correta: true },
      { texto: "Na eletrosfera, nos elétrons", diagnostico: "Os elétrons decidem toda a química, mas quase nada da massa: um próton pesa 1836 vezes o que pesa um elétron. Numa molécula de água, os elétrons são cerca de 0,03% da massa." },
      { texto: "Metade no núcleo, metade na eletrosfera", diagnostico: "A divisão é muito desigual. O núcleo responde por mais de 99,9% da massa." },
      { texto: "No espaço vazio entre o núcleo e os elétrons", diagnostico: "Espaço vazio não tem massa. E o átomo é quase todo espaço vazio — a massa se concentra no núcleo, que é minúsculo em comparação." },
    ],
    resolucao: "Prótons e nêutrons carregam praticamente toda a massa. Por isso a massa da tabela periódica é essencialmente a contagem de núcleons — e por isso ela dá números tão próximos de inteiros.",
    dica: "Compare o peso de um próton com o de um elétron.",
  },
  {
    id: "proporcao-da-reacao",
    enunciado: "Numa reação, o hidrogênio e o oxigênio se combinam na proporção de <strong>2 para 1</strong>. Essa proporção é contada em quê?",
    opcoes: [
      { texto: "Em número de moléculas, ou seja, em mols", correta: true },
      { texto: "Em gramas", diagnostico: "Se fosse em gramas, 2 g de hidrogênio reagiriam com 1 g de oxigênio — e não é isso que acontece. A proporção da equação é sempre de partículas." },
      { texto: "Em litros", diagnostico: "Volume só funciona para gases, e mesmo assim só porque volume de gás é proporcional a mols. A proporção fundamental é de partículas." },
      { texto: "Em qualquer unidade, tanto faz", diagnostico: "Faz muita diferença. Os coeficientes de uma equação contam partículas; usá-los direto sobre massas é o erro mais comum da estequiometria." },
    ],
    resolucao: "Os coeficientes de uma equação sempre contam partículas. A balança pesa gramas. O mol é o tradutor entre as duas linguagens, e é por isso que ele aparece no meio de toda conta de estequiometria.",
    dica: "Moléculas reagem com moléculas. A balança é que fala outra língua.",
  },
  {
    id: "atomos-por-mol",
    enunciado: "Quantos átomos existem em <strong>1 mol</strong> de ferro?",
    opcoes: [
      { texto: "6,02×10²³", correta: true },
      { texto: "55,845", diagnostico: "Esse é o número de gramas que 1 mol de ferro pesa, não a quantidade de átomos. Massa e contagem são coisas diferentes." },
      { texto: "26", diagnostico: "Esse é o número de prótons de um átomo de ferro. O número de átomos num mol é sempre o mesmo, para qualquer elemento." },
      { texto: "Depende do elemento", diagnostico: "Não depende. Um mol são sempre 6,02×10²³ unidades, seja de ferro, de água ou de laranjas — assim como uma dúzia são sempre 12." },
    ],
    resolucao: "Um mol de qualquer coisa contém 6,02×10²³ unidades. O que muda de elemento para elemento é a massa desse pacote, nunca a quantidade.",
    dica: "Uma dúzia de ovos e uma dúzia de melancias têm a mesma quantidade — só o peso muda.",
  },
  {
    id: "tempo-de-contagem",
    enunciado: "Se você contasse átomos um por segundo, sem parar nunca, quanto tempo levaria para contar 1 mol?",
    opcoes: [
      { texto: "Mais de um milhão de vezes a idade do universo", correta: true },
      { texto: "Alguns anos", diagnostico: "Muito menos que a realidade. Em um ano você contaria cerca de 31 milhões — precisaria de 10¹⁶ anos para chegar a um mol." },
      { texto: "Uma vida inteira", diagnostico: "Nem perto. Uma vida de 80 anos daria uns 2,5 bilhões de átomos: uma fração desprezível de um mol." },
      { texto: "Cerca de mil anos", diagnostico: "Ainda muito pouco. Mil anos de contagem ininterrupta dariam 3×10¹⁰ átomos, treze ordens de grandeza abaixo de um mol." },
    ],
    resolucao: "São cerca de 1,9×10¹⁶ anos, aproximadamente 1,4 milhão de vezes a idade do universo. Se as 8,2 bilhões de pessoas vivas hoje contassem juntas, ainda levaria 2,3 milhões de anos.",
    dica: "Um ano tem cerca de 3×10⁷ segundos. Divida o número de Avogadro por isso.",
  },
  {
    id: "dobro-de-mols",
    enunciado: "Um mol de água pesa 18 g. Quanto pesam <strong>2 mols</strong> de água?",
    opcoes: [
      { texto: "36 g", correta: true },
      { texto: "18 g", diagnostico: "A massa de 1 mol é 18 g. Dobrando a quantidade de matéria, dobra a massa." },
      { texto: "9 g", diagnostico: "Você dividiu em vez de multiplicar. Mais mols significam mais massa, nunca menos." },
      { texto: "1,2×10²⁴ g", diagnostico: "Esse é o número de moléculas em 2 mols, não a massa em gramas. Contagem e massa são grandezas diferentes." },
    ],
    resolucao: "A massa é proporcional à quantidade de matéria: 2 mols × 18 g/mol = 36 g. É a mesma lógica de dizer que 2 dúzias de ovos pesam o dobro de 1 dúzia.",
    dica: "Se um pacote pesa 18 g, quanto pesam dois pacotes?",
  },
  {
    id: "massa-fracionaria",
    enunciado: "Por que a massa do cloro na tabela periódica é <strong>35,45</strong> e não um número inteiro?",
    opcoes: [
      { texto: "Porque é a média das massas dos isótopos que existem na natureza", correta: true },
      { texto: "Porque o cloro tem meio nêutron", diagnostico: "Não existe meio nêutron. Cada átomo individual tem um número inteiro de núcleons — o valor fracionário aparece só na média." },
      { texto: "Porque os elétrons acrescentam essa fração", diagnostico: "Os elétrons pesam pouquíssimo: num átomo de cloro eles somam menos de 0,02% da massa, longe de explicar o 0,45." },
      { texto: "Porque foi arredondado errado", diagnostico: "É um valor medido com cuidado. O cloro natural é uma mistura de cerca de 75% de cloro-35 com 25% de cloro-37, e 35,45 é a média ponderada." },
    ],
    resolucao: "Todo átomo de cloro tem 35 ou 37 núcleons, nunca 35,45. Mas o cloro que existe na natureza é uma mistura dos dois, e a tabela traz a média ponderada — que é o que importa quando você pesa uma amostra com incontáveis átomos.",
    dica: "Nenhum átomo individual pesa 35,45. Mas uma amostra com muitos átomos, sim.",
  },
];

/* As alternativas são embaralhadas a cada montagem para que a posição da
   correta não vire um padrão a decorar. */
function montarPerguntaDaIdeia(base) {
  const opcoes = base.opcoes.slice();
  for (let i = opcoes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [opcoes[i], opcoes[j]] = [opcoes[j], opcoes[i]];
  }
  const q = {
    id: base.id,
    degrau: 0, tipo: "ideiaDoMol", formato: "escolha", formulas: [],
    enunciado: base.enunciado,
    opcoes, unidade: "", resposta: null, sig: 3, erros: [],
    dica: base.dica,
    resolucao: base.resolucao,
  };
  q.enunciadoTexto = q.enunciado.replace(/<[^>]*>/g, "");
  return q;
}

const GERADORES = {


  /* ----- degrau 0 ----- */

  ideiaDoMol(cfg) {
    return montarPerguntaDaIdeia(sortear(PERGUNTAS_DA_IDEIA));
  },

  /* ----- degrau 1 ----- */

  atomosNaFormula(cfg) {
    const formula = sortear(COM_PARENTESES);
    const a = analisar(formula);
    const alvo = sortear(a.itens.filter(i => i.quantidade > 1)) || a.itens[0];
    const vista = formatarFormula(a.normalizada);

    // erro clássico: ler só o índice de dentro do parêntese e esquecer de
    // multiplicar pelo índice de fora
    const dentro = analisar(formula.replace(/\)(\d+)/, ")"));
    const semMultiplicar = dentro.composicao[alvo.simbolo] || alvo.quantidade;

    return {
      degrau: 1, tipo: "atomosNaFormula", formulas: [formula],
      enunciado: `Quantos átomos de <strong>${alvo.simbolo}</strong> existem em uma unidade de ${vista}?`,
      unidade: "átomos", resposta: alvo.quantidade, sig: 3,
      erros: [
        engano(semMultiplicar, `Você contou só o índice de dentro do parêntese. O número de fora multiplica tudo que está dentro dele — inclusive o ${alvo.simbolo}.`),
        engano(alvo.quantidade + 1, "Quase. Recontagem: multiplique o índice de dentro pelo índice de fora do parêntese."),
      ],
      dica: "O índice que fica depois do parêntese multiplica todos os átomos que estão dentro dele.",
      resolucao: `Em ${vista}, o ${alvo.simbolo} aparece com índice interno e o parêntese multiplica esse valor. Total: <strong>${alvo.quantidade} átomos de ${alvo.simbolo}</strong>.`,
    };
  },

  massaMolarSimples(cfg) {
    const s = comFormula(sortearSubstancia(false));
    const a = s.analise;
    const maior = a.itens[0];

    // erro clássico: somar as massas atômicas ignorando os índices
    const semIndices = a.itens.reduce((soma, i) => soma + i.massaAtomica, 0);

    return {
      degrau: 1, tipo: "massaMolarSimples", formulas: [s.f],
      enunciado: `Qual a massa molar de ${s.vista} (${s.nome})?`,
      unidade: "g/mol", resposta: a.massaMolar, sig: 4,
      erros: [
        engano(semIndices, "Você somou as massas atômicas mas esqueceu os índices. Cada elemento entra multiplicado pela quantidade de átomos dele na fórmula."),
        engano(maior.massaAtomica, `Esse é o valor da massa atômica do ${maior.simbolo} sozinho. A massa molar soma a contribuição de todos os elementos.`),
      ],
      dica: "Multiplique a massa atômica de cada elemento pelo número de átomos dele e some tudo.",
      resolucao: a.itens.map(i => `${i.quantidade} × ${formatarNumero(i.massaAtomica, 5)} (${i.simbolo}) = ${formatarNumero(i.contribuicao, 5)}`).join("<br>") +
                 `<br><strong>Soma = ${formatarNumero(a.massaMolar, 5)} g/mol</strong>`,
    };
  },

  /* ----- degrau 2 ----- */

  molParaParticulas(cfg) {
    const s = comFormula(sortearSubstancia(false));
    const n = sortear(VALORES_MOL);
    const certo = n * CONSTANTES.AVOGADRO;

    return {
      degrau: 2, tipo: "molParaParticulas", formulas: [s.f],
      enunciado: `Quantas moléculas há em <strong>${formatarNumero(n, 3)} mol</strong> de ${s.vista}?`,
      unidade: "moléculas", resposta: certo, sig: 3,
      erros: [
        engano(n / CONSTANTES.AVOGADRO, "Você dividiu quando era para multiplicar. Um mol contém 6,02×10²³ entidades, então mais mols significam mais entidades."),
        engano(CONSTANTES.AVOGADRO, "Esse é o número de entidades em exatamente 1 mol. Aqui a quantidade de matéria é outra."),
        engano(n * CONSTANTES.AVOGADRO * s.analise.totalAtomos, "Esse é o número total de átomos, não de moléculas. A pergunta é sobre moléculas inteiras."),
      ],
      dica: "Cada mol contém 6,02×10²³ entidades. É uma multiplicação direta.",
      resolucao: `${formatarNumero(n, 3)} mol × 6,022×10²³ moléculas/mol = <strong>${formatarNumero(certo, 3)} moléculas</strong>`,
    };
  },

  particulasParaMol(cfg) {
    const s = comFormula(sortearSubstancia(false));
    const fator = sortear([1.2, 1.5, 2.4, 3.0, 4.8, 6.0, 9.0, 1.8]);
    const N = fator * 1e23;
    const certo = N / CONSTANTES.AVOGADRO;

    return {
      degrau: 2, tipo: "particulasParaMol", formulas: [s.f],
      enunciado: `Uma amostra de ${s.vista} contém <strong>${formatarNumero(N, 2)} moléculas</strong>. A quantos mols isso corresponde?`,
      unidade: "mol", resposta: certo, sig: 3,
      erros: [
        engano(N * CONSTANTES.AVOGADRO, "Você multiplicou por Avogadro. Para sair de um número enorme de partículas e chegar a poucos mols, a operação é a divisão."),
        engano(N / s.M, "Você dividiu pela massa molar. Massa molar converte gramas; para converter contagem de partículas, o fator é a constante de Avogadro."),
      ],
      dica: "Divida o número de partículas por 6,02×10²³.",
      resolucao: `${formatarNumero(N, 2)} moléculas ÷ 6,022×10²³ moléculas/mol = <strong>${formatarNumero(certo, 3)} mol</strong>`,
    };
  },

  atomosTotais(cfg) {
    const s = comFormula(sortearSubstancia(false));
    const n = sortear([0.5, 1.0, 2.0, 0.25, 1.5]);
    const total = s.analise.totalAtomos;
    const certo = n * CONSTANTES.AVOGADRO * total;

    return {
      degrau: 2, tipo: "atomosTotais", formulas: [s.f],
      enunciado: `Quantos <strong>átomos no total</strong> existem em ${formatarNumero(n, 3)} mol de ${s.vista}?`,
      unidade: "átomos", resposta: certo, sig: 3,
      erros: [
        engano(n * CONSTANTES.AVOGADRO, `Esse é o número de moléculas, não de átomos. Cada molécula de ${s.vista} tem ${total} átomos dentro dela.`),
        engano(CONSTANTES.AVOGADRO * total, "Você esqueceu de usar a quantidade de matéria informada no enunciado."),
      ],
      dica: `Primeiro ache quantas moléculas há. Depois multiplique pelo número de átomos em cada molécula.`,
      resolucao: `${formatarNumero(n, 3)} mol × 6,022×10²³ moléculas/mol × ${total} átomos/molécula = <strong>${formatarNumero(certo, 3)} átomos</strong>`,
    };
  },

  /* ----- degrau 3 ----- */

  massaParaMol(cfg) {
    const s = comFormula(sortearSubstancia(false));
    const m = sortear(VALORES_BONITOS);
    const certo = m / s.M;

    return {
      degrau: 3, tipo: "massaParaMol", formulas: [s.f],
      enunciado: `Quantos mols há em <strong>${formatarNumero(m, 3)} g</strong> de ${s.vista} (${s.nome})?`,
      unidade: "mol", resposta: certo, sig: 3,
      contexto: `M(${s.f}) = ${formatarNumero(s.M, 5)} g/mol`,
      erros: [
        engano(m * s.M, "Você inverteu a razão molar. Repare nas unidades: g × g/mol dá g²/mol, que não é mol. Para cancelar o grama, a massa molar entra dividindo."),
        engano(m / CONSTANTES.AVOGADRO, "Você usou a constante de Avogadro. Ela converte contagem de partículas; para converter gramas, o fator é a massa molar."),
        engano(m * CONSTANTES.AVOGADRO, "Esse é o número de entidades, não a quantidade de matéria. A pergunta pede mols."),
        engano(m / s.analise.itens[0].massaAtomica, `Você dividiu pela massa atômica do ${s.analise.itens[0].simbolo} em vez da massa molar da substância inteira.`),
      ],
      dica: "Escreva a massa molar como fração e veja qual posição faz o grama cancelar.",
      resolucao: `${formatarNumero(m, 3)} g × (1 mol ⁄ ${formatarNumero(s.M, 5)} g) = <strong>${formatarNumero(certo, 3)} mol</strong><br>O grama de cima cancela com o grama de baixo e sobra mol.`,
    };
  },

  molParaMassa(cfg) {
    const s = comFormula(sortearSubstancia(false));
    const n = sortear(VALORES_MOL);
    const certo = n * s.M;

    return {
      degrau: 3, tipo: "molParaMassa", formulas: [s.f],
      enunciado: `Qual a massa de <strong>${formatarNumero(n, 3)} mol</strong> de ${s.vista} (${s.nome})?`,
      unidade: "g", resposta: certo, sig: 3,
      contexto: `M(${s.f}) = ${formatarNumero(s.M, 5)} g/mol`,
      erros: [
        engano(n / s.M, "Você inverteu a razão. Aqui a massa molar entra multiplicando: cada mol pesa a massa molar."),
        engano(s.M, "Essa é a massa de exatamente 1 mol. O enunciado pede outra quantidade de matéria."),
        engano(n * CONSTANTES.AVOGADRO, "Você achou o número de entidades. A pergunta é sobre massa, em gramas."),
      ],
      dica: "Se 1 mol pesa a massa molar, quanto pesam n mols?",
      resolucao: `${formatarNumero(n, 3)} mol × (${formatarNumero(s.M, 5)} g ⁄ 1 mol) = <strong>${formatarNumero(certo, 3)} g</strong>`,
    };
  },

  massaParaParticulas(cfg) {
    const s = comFormula(sortearSubstancia(false));
    const m = sortear(VALORES_BONITOS);
    const mols = m / s.M;
    const certo = mols * CONSTANTES.AVOGADRO;

    return {
      degrau: 3, tipo: "massaParaParticulas", formulas: [s.f],
      enunciado: `Quantas moléculas há em <strong>${formatarNumero(m, 3)} g</strong> de ${s.vista}?`,
      unidade: "moléculas", resposta: certo, sig: 3,
      contexto: `M(${s.f}) = ${formatarNumero(s.M, 5)} g/mol`,
      erros: [
        engano(m * CONSTANTES.AVOGADRO, "Você pulou a ponte. Não dá para ir de grama direto para partícula: é preciso passar pelo mol primeiro, dividindo pela massa molar."),
        engano(mols, "Você parou no meio do caminho. Isso é a quantidade de matéria em mols; falta multiplicar por Avogadro."),
        engano(m * s.M * CONSTANTES.AVOGADRO, "A massa molar entrou multiplicando quando deveria dividir. Confira o cancelamento das unidades."),
      ],
      dica: "São dois passos: grama para mol pela massa molar, mol para moléculas por Avogadro.",
      resolucao: `${formatarNumero(m, 3)} g × (1 mol ⁄ ${formatarNumero(s.M, 5)} g) = ${formatarNumero(mols, 3)} mol<br>` +
                 `${formatarNumero(mols, 3)} mol × 6,022×10²³ = <strong>${formatarNumero(certo, 3)} moléculas</strong>`,
    };
  },

  volumeParaMol(cfg) {
    const s = comFormula(sortearSubstancia(true));
    const vm = cfg.volumeMolar;
    const n = sortear([0.25, 0.5, 1.0, 2.0, 0.1]);
    const V = n * vm;
    const certo = V / vm;

    return {
      degrau: 3, tipo: "volumeParaMol", formulas: [s.f],
      enunciado: `Nas condições escolhidas, <strong>${formatarNumero(V, 3)} L</strong> de ${s.vista} correspondem a quantos mols?`,
      unidade: "mol", resposta: certo, sig: 3,
      contexto: `Volume molar = ${formatarNumero(vm, 4)} L/mol · M(${s.f}) = ${formatarNumero(s.M, 5)} g/mol`,
      erros: [
        engano(V * vm, "Você multiplicou pelo volume molar. Para descobrir quantos mols cabem num volume, é preciso dividir."),
        engano(V / s.M, "Você usou a massa molar. Ela converte gramas; para converter litros de gás, o fator é o volume molar."),
        engano(V * s.M, "A massa molar não entra aqui, e nem multiplicando. O volume molar é o fator desta conversão."),
      ],
      dica: "O volume molar diz quantos litros um mol de gás ocupa. Você tem litros e quer mols.",
      resolucao: `${formatarNumero(V, 3)} L × (1 mol ⁄ ${formatarNumero(vm, 4)} L) = <strong>${formatarNumero(certo, 3)} mol</strong>`,
    };
  },

  massaParaVolume(cfg) {
    const s = comFormula(sortearSubstancia(true));
    const vm = cfg.volumeMolar;
    const m = sortear([2.0, 4.0, 8.0, 10.0, 16.0, 20.0, 5.0]);
    const mols = m / s.M;
    const certo = mols * vm;

    return {
      degrau: 3, tipo: "massaParaVolume", formulas: [s.f],
      enunciado: `Que volume ocupam <strong>${formatarNumero(m, 3)} g</strong> de ${s.vista} nas condições escolhidas?`,
      unidade: "L", resposta: certo, sig: 3,
      contexto: `Volume molar = ${formatarNumero(vm, 4)} L/mol · M(${s.f}) = ${formatarNumero(s.M, 5)} g/mol`,
      erros: [
        engano(m * vm, "Você pulou a ponte. O volume molar só conversa com mol, nunca direto com grama: primeiro converta a massa em mols."),
        engano(mols, "Você parou no mol. Falta o último passo, multiplicar pelo volume molar."),
        engano(m / vm, "O volume molar entrou dividindo e sem passar pelo mol. Refaça em dois passos e confira as unidades."),
      ],
      dica: "Grama para mol pela massa molar; mol para litro pelo volume molar.",
      resolucao: `${formatarNumero(m, 3)} g ÷ ${formatarNumero(s.M, 5)} g/mol = ${formatarNumero(mols, 3)} mol<br>` +
                 `${formatarNumero(mols, 3)} mol × ${formatarNumero(vm, 4)} L/mol = <strong>${formatarNumero(certo, 3)} L</strong>`,
    };
  },


  /* ----- degrau 4 ----- */

  coeficienteNaEquacao(cfg) {
    const b = sortearReacao();
    const alvo = sortear(b.especies);
    const outro = sortear(b.especies.filter(e => e !== alvo && e.coeficiente !== alvo.coeficiente)) || null;

    const erros = [engano(1, "1 é o coeficiente de quem já está balanceado sozinho. Confira se todos os elementos fecham dos dois lados com esse valor.")];
    if (outro) {
      erros.push(engano(outro.coeficiente, `Esse é o coeficiente de ${outro.formula}, não o de ${alvo.formula}.`));
    }

    return {
      degrau: 4, tipo: "coeficienteNaEquacao", formulas: b.especies.map(e => e.formula),
      enunciado: `Balanceando com os menores números inteiros possíveis, qual o coeficiente de <strong>${alvo.vista}</strong> em<br>${escreverEsqueleto(b)}?`,
      unidade: "", resposta: alvo.coeficiente, sig: 2,
      erros,
      dica: "Conte os átomos de cada elemento dos dois lados e ajuste os coeficientes até que todas as contagens fechem. Comece pelo elemento que aparece em menos substâncias.",
      resolucao: `A equação balanceada é <strong>${b.equacaoTexto}</strong>.<br>` +
        b.conferencia.map(c => `${c.elemento}: ${c.antes} de cada lado`).join(" · "),
    };
  },

  molParaMolReacao(cfg) {
    const b = sortearReacao();
    const de = sortear(b.reagentes);
    const para = sortear(b.produtos);
    const n = sortear([0.2, 0.5, 1.0, 1.5, 2.0, 3.0, 4.0]);
    const certo = n * (para.coeficiente / de.coeficiente);

    return {
      degrau: 4, tipo: "molParaMolReacao", formulas: [de.formula, para.formula],
      enunciado: `Na reação ${escreverEquacaoTextoCurto(b)}, quantos mols de <strong>${para.vista}</strong> se formam a partir de <strong>${formatarNumero(n, 3)} mol</strong> de ${de.vista}?`,
      unidade: "mol", resposta: certo, sig: 3,
      contexto: `Proporção: ${de.coeficiente} ${de.formula} para ${para.coeficiente} ${para.formula}`,
      erros: [
        engano(n * (de.coeficiente / para.coeficiente), "A razão entrou de cabeça para baixo. O coeficiente da substância que você quer fica em cima; o da que você tem, embaixo."),
        engano(n, "Você usou a mesma quantidade dos dois lados. A equação balanceada existe justamente porque essa proporção não é de um para um aqui."),
      ],
      dica: "Multiplique pelos coeficientes na forma de fração, com o da substância pedida no numerador.",
      resolucao: `${formatarNumero(n, 3)} mol de ${de.formula} × (${para.coeficiente} mol ${para.formula} ⁄ ${de.coeficiente} mol ${de.formula}) = <strong>${formatarNumero(certo, 3)} mol</strong>`,
    };
  },

  massaParaMassaReacao(cfg) {
    const b = sortearReacao();
    const de = sortear(b.reagentes);
    const para = sortear(b.produtos);
    const Md = de.analise.massaMolar, Mp = para.analise.massaMolar;
    const m = sortear([5.0, 10.0, 20.0, 25.0, 50.0, 100.0, 8.0, 16.0]);
    const mols = m / Md;
    const molsProduto = mols * (para.coeficiente / de.coeficiente);
    const certo = molsProduto * Mp;

    return {
      degrau: 4, tipo: "massaParaMassaReacao", formulas: [de.formula, para.formula],
      enunciado: `Na reação ${escreverEquacaoTextoCurto(b)}, que massa de <strong>${para.vista}</strong> se forma a partir de <strong>${formatarNumero(m, 3)} g</strong> de ${de.vista}?`,
      unidade: "g", resposta: certo, sig: 3,
      contexto: `M(${de.formula}) = ${formatarNumero(Md, 5)} g/mol · M(${para.formula}) = ${formatarNumero(Mp, 5)} g/mol`,
      erros: [
        engano(m * (para.coeficiente / de.coeficiente), "Você aplicou a proporção direto sobre a massa. Coeficiente é razão de mols, nunca de gramas: converta para mol antes."),
        engano(molsProduto, "Você parou no mol do produto. Falta multiplicar pela massa molar dele para voltar a gramas."),
        engano(mols * (de.coeficiente / para.coeficiente) * Mp, "A razão entre os coeficientes entrou invertida no meio do caminho."),
        engano(mols * Mp, "Você converteu para mol e voltou para grama, mas esqueceu a proporção da reação no meio."),
      ],
      dica: "São três passos: grama para mol pela massa molar do reagente, mol para mol pelos coeficientes, mol para grama pela massa molar do produto.",
      resolucao: `${formatarNumero(m, 3)} g ÷ ${formatarNumero(Md, 5)} = ${formatarNumero(mols, 3)} mol de ${de.formula}<br>` +
        `${formatarNumero(mols, 3)} × (${para.coeficiente}⁄${de.coeficiente}) = ${formatarNumero(molsProduto, 3)} mol de ${para.formula}<br>` +
        `${formatarNumero(molsProduto, 3)} × ${formatarNumero(Mp, 5)} = <strong>${formatarNumero(certo, 3)} g</strong>`,
    };
  },

  produtoComLimitante(cfg) {
    const b = sortearReacao(2);
    const a1 = b.reagentes[0], a2 = b.reagentes[1];
    const produto = sortear(b.produtos);

    // sorteia massas que garantam um limitante claro, nunca proporção exata
    const base = sortear([0.4, 0.6, 1.5, 2.0, 2.5]);
    const mols1 = a1.coeficiente * sortear([1.0, 2.0, 0.5]);
    const mols2 = a2.coeficiente * base;
    const m1 = mols1 * a1.analise.massaMolar;
    const m2 = mols2 * a2.analise.massaMolar;

    const razao1 = mols1 / a1.coeficiente;
    const razao2 = mols2 / a2.coeficiente;
    const extensao = Math.min(razao1, razao2);
    const certo = produto.coeficiente * extensao;
    const pelaOutra = produto.coeficiente * Math.max(razao1, razao2);

    return {
      degrau: 4, tipo: "produtoComLimitante", formulas: [a1.formula, a2.formula, produto.formula],
      enunciado: `Misturam-se <strong>${formatarNumero(m1, 3)} g</strong> de ${a1.vista} com <strong>${formatarNumero(m2, 3)} g</strong> de ${a2.vista} segundo ${escreverEquacaoTextoCurto(b)}. Quantos mols de <strong>${produto.vista}</strong> se formam?`,
      unidade: "mol", resposta: certo, sig: 3,
      contexto: `M(${a1.formula}) = ${formatarNumero(a1.analise.massaMolar, 5)} · M(${a2.formula}) = ${formatarNumero(a2.analise.massaMolar, 5)} g/mol`,
      erros: [
        engano(pelaOutra, "Você usou o reagente em excesso para calcular. Quem manda é o limitante: aquele com a menor razão entre mols disponíveis e coeficiente — não o de menor massa."),
        engano(certo + pelaOutra, "Você somou as duas contas. Só uma delas vale: a do reagente que acaba primeiro."),
        engano(Math.min(mols1, mols2), "Você comparou os mols diretamente, sem dividir pelos coeficientes. O reagente que exige três mols por vez acaba antes de outro que exige um, mesmo tendo mais matéria."),
      ],
      dica: "Converta as duas massas em mols, divida cada uma pelo respectivo coeficiente e compare. A menor razão manda na reação inteira.",
      resolucao: `${a1.formula}: ${formatarNumero(mols1, 3)} mol ÷ ${a1.coeficiente} = ${formatarNumero(razao1, 3)}<br>` +
        `${a2.formula}: ${formatarNumero(mols2, 3)} mol ÷ ${a2.coeficiente} = ${formatarNumero(razao2, 3)}<br>` +
        `Limitante: <strong>${razao1 <= razao2 ? a1.formula : a2.formula}</strong>, com extensão ${formatarNumero(extensao, 3)}.<br>` +
        `${produto.formula}: ${produto.coeficiente} × ${formatarNumero(extensao, 3)} = <strong>${formatarNumero(certo, 3)} mol</strong>`,
    };
  },

  percentualEmMassa(cfg) {
    const s = comFormula(sortearSubstancia(false));
    const a = s.analise;
    const alvo = sortear(a.itens);
    const certo = alvo.percentual;
    const porAtomos = (alvo.quantidade / a.totalAtomos) * 100;

    return {
      degrau: 3, tipo: "percentualEmMassa", formulas: [s.f],
      enunciado: `Qual a porcentagem <strong>em massa</strong> de ${alvo.simbolo} em ${s.vista}?`,
      unidade: "%", resposta: certo, sig: 3,
      contexto: `M(${s.f}) = ${formatarNumero(a.massaMolar, 5)} g/mol`,
      erros: [
        engano(porAtomos, `Você calculou a porcentagem em número de átomos, não em massa. A balança não conta átomos: ela pesa. Multiplique a quantidade pela massa atômica antes de comparar.`),
        engano(alvo.contribuicao, "Esse é o valor em gramas que o elemento contribui. Falta dividir pela massa molar e multiplicar por cem."),
      ],
      dica: "Massa que o elemento contribui, dividida pela massa molar total, vezes cem.",
      resolucao: `${alvo.quantidade} × ${formatarNumero(alvo.massaAtomica, 5)} = ${formatarNumero(alvo.contribuicao, 4)} g de ${alvo.simbolo} em cada mol<br>` +
                 `${formatarNumero(alvo.contribuicao, 4)} ÷ ${formatarNumero(a.massaMolar, 5)} × 100 = <strong>${formatarNumero(certo, 3)}%</strong>`,
    };
  },
};

const TIPOS_POR_DEGRAU = {
  0: ["ideiaDoMol"],
  1: ["atomosNaFormula", "massaMolarSimples"],
  2: ["molParaParticulas", "particulasParaMol", "atomosTotais"],
  3: ["massaParaMol", "molParaMassa", "massaParaParticulas", "volumeParaMol", "massaParaVolume", "percentualEmMassa"],
  4: ["coeficienteNaEquacao", "molParaMolReacao", "massaParaMassaReacao", "produtoComLimitante"],
};

const NOME_TIPO = {
  ideiaDoMol: "A ideia do mol",
  atomosNaFormula: "Contagem de átomos na fórmula",
  massaMolarSimples: "Cálculo de massa molar",
  molParaParticulas: "Mol para entidades",
  particulasParaMol: "Entidades para mol",
  atomosTotais: "Átomos totais numa amostra",
  massaParaMol: "Massa para mol",
  molParaMassa: "Mol para massa",
  massaParaParticulas: "Massa para entidades",
  volumeParaMol: "Volume de gás para mol",
  massaParaVolume: "Massa para volume de gás",
  percentualEmMassa: "Porcentagem em massa",
  coeficienteNaEquacao: "Coeficiente do balanceamento",
  molParaMolReacao: "Proporção em mols entre substâncias",
  massaParaMassaReacao: "Massa de reagente para massa de produto",
  produtoComLimitante: "Produto formado com reagente limitante",
};

/* Gera um exercício do degrau pedido, evitando repetir o tipo anterior. */
function gerarExercicio(degrau, cfg, tipoAnterior) {
  let tipos = TIPOS_POR_DEGRAU[degrau] || TIPOS_POR_DEGRAU[1];
  if (tipos.length > 1 && tipoAnterior) {
    const outros = tipos.filter(t => t !== tipoAnterior);
    if (outros.length) tipos = outros;
  }
  const tipo = sortear(tipos);
  const q = GERADORES[tipo](cfg || { volumeMolar: 22.4 });
  if (q.formato === "escolha") {
    q.enunciadoTexto = q.enunciado.replace(/<[^>]*>/g, "");
    return q;
  }
  q.enunciadoTexto = q.enunciado.replace(/<[^>]*>/g, "");

  // Alguns sorteios fazem um erro previsto cair exatamente sobre a resposta
  // certa — é o caso de 1 mol, em que multiplicar e não multiplicar por
  // Avogadro dão o mesmo número, ou de fórmulas em que todos os índices são 1.
  // Nesses casos o valor deixa de diagnosticar coisa alguma e sai da lista.
  const limpos = [];
  for (const e of q.erros) {
    if (!isFinite(e.valor)) continue;
    if (proximo(e.valor, q.resposta)) continue;
    if (limpos.some(j => proximo(j.valor, e.valor))) continue;
    limpos.push(e);
  }
  q.erros = limpos;

  return q;
}

/* ---------------- correção ---------------- */

const TOLERANCIA = 0.015; // 1,5%: acomoda arredondamento honesto sem perdoar erro de método

function proximo(a, b) {
  if (!isFinite(a) || !isFinite(b)) return false;
  if (b === 0) return Math.abs(a) < 1e-12;
  return Math.abs(a - b) / Math.abs(b) <= TOLERANCIA;
}

/* Devolve o veredito e, quando possível, o nome do engano cometido. */
function corrigir(exercicio, respostaBruta) {
  if (exercicio.formato === "escolha") {
    const indice = Number(respostaBruta);
    const escolhida = exercicio.opcoes[indice];
    if (!escolhida) {
      return { situacao: "invalido", mensagem: "Escolha uma das alternativas." };
    }
    if (escolhida.correta) {
      return { situacao: "certo", mensagem: "Isso mesmo." };
    }
    return {
      situacao: "diagnosticado", erroReconhecido: true,
      mensagem: escolhida.diagnostico || "Não é essa. Releia o enunciado com calma.",
    };
  }

  const valor = lerNumero(respostaBruta);

  if (!isFinite(valor)) {
    return { situacao: "invalido", mensagem: "Não consegui ler esse número. Use vírgula ou ponto para decimal, e a forma 6,02e23 para potências de dez." };
  }

  if (proximo(valor, exercicio.resposta)) {
    return { situacao: "certo", mensagem: "Isso. O caminho estava certo do começo ao fim." };
  }

  for (const e of exercicio.erros) {
    if (proximo(valor, e.valor)) {
      return { situacao: "diagnosticado", mensagem: e.mensagem, erroReconhecido: true };
    }
  }

  // fator de dez costuma ser troca de unidade ou escorregão na potência
  const razao = valor / exercicio.resposta;
  for (const p of [1000, 100, 10, 0.1, 0.01, 0.001]) {
    if (proximo(razao, p)) {
      return {
        situacao: "diagnosticado",
        mensagem: `O caminho parece certo, mas o resultado está ${p >= 10 ? p + " vezes maior" : "dividido por " + Math.round(1 / p)} que o esperado. Confira a potência de dez ou a vírgula.`,
        erroReconhecido: true,
      };
    }
  }

  return { situacao: "errado", mensagem: "Não é esse valor. Refaça escrevendo as unidades ao lado de cada número: elas dizem onde a conta saiu do trilho." };
}

/* Uma rodada fechada de perguntas do degrau 0, sem repetir enunciado.
   Serve ao teste rápido do fim da tela de abertura, que precisa de um começo,
   um meio e um fim — diferente do treino, que é infinito. Usa exatamente o
   mesmo banco e a mesma correção, para que não existam duas versões da
   verdade que possam divergir com o tempo. */
function rodadaDaIdeia(quantas = 5) {
  const total = Math.min(quantas, PERGUNTAS_DA_IDEIA.length);
  const indices = PERGUNTAS_DA_IDEIA.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, total).map((i) => montarPerguntaDaIdeia(PERGUNTAS_DA_IDEIA[i]));
}

function quantasPerguntasDaIdeia() { return PERGUNTAS_DA_IDEIA.length; }

/* Devolve uma pergunta específica do degrau 0. A vitória antecipada da tela de
   abertura precisa perguntar exatamente aquilo que o aluno acabou de ler —
   sortear ali seria cruel, porque poderia cair uma pergunta sobre um trecho
   que ainda está lá embaixo. */
function perguntaDaIdeiaPorId(id) {
  const base = PERGUNTAS_DA_IDEIA.filter((p) => p.id === id)[0];
  return base ? montarPerguntaDaIdeia(base) : null;
}

/* Busca o degrau pelo número, não pela posição no vetor. Desde que o degrau 0
   passou a existir, posição e número deixaram de coincidir — e a interface
   chegou a anunciar "Degrau 1 liberado: A ideia", que é justamente o degrau de
   onde o aluno estava saindo. */
function degrauPorNumero(n) {
  return DEGRAUS.filter((d) => d.n === n)[0] || null;
}
