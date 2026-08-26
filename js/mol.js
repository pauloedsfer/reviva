/* MOLBOX — o que é o mol.

   Esta é a primeira tela do aplicativo e a razão de ele existir. O objetivo
   não é ensinar a calcular: é fazer o aluno sentir o tamanho do número antes
   de usá-lo. Quem não sente o tamanho decora a fórmula e esquece na semana
   seguinte.

   Todas as comparações abaixo são calculadas na hora, a partir das constantes
   e das medidas declaradas. Nenhum resultado está escrito à mão no código —
   assim a conta pode ser conferida, e é ela que aparece na tela ao lado do
   resultado. Um número espantoso sem a conta ao lado é fé, não ciência.
*/

/* ---------------- pacotes que a humanidade já usa ---------------- */

const PACOTES = [
  { nome: "par",    quantidade: 2,      usoPara: "sapatos, meias, brincos",
    porque: "porque eles não fazem sentido sozinhos" },
  { nome: "dezena", quantidade: 10,     usoPara: "ovos, bananas",
    porque: "porque temos dez dedos, e a conta fica fácil" },
  { nome: "dúzia",  quantidade: 12,     usoPara: "ovos, pães, rosas",
    porque: "porque doze se divide por 2, 3, 4 e 6 — dá para repartir de muitos jeitos" },
  { nome: "grosa",  quantidade: 144,    usoPara: "parafusos, botões, lápis",
    porque: "é uma dúzia de dúzias, usada por quem compra no atacado" },
  { nome: "resma",  quantidade: 500,    usoPara: "folhas de papel",
    porque: "ninguém vende papel de folha em folha" },
  { nome: "mol",    quantidade: 6.02214076e23, usoPara: "átomos, moléculas, íons, elétrons",
    porque: "porque átomo é pequeno demais e numeroso demais para qualquer outro pacote dar conta", destaque: true },
];

/* ---------------- quão grande é esse pacote ---------------- */

/* Cada comparação declara o que é um exemplar do objeto e como traduzir o
   resultado para algo que caiba na cabeça. */
const COMPARACOES = [
  {
    id: "arroz", nome: "grão de arroz", emoji: "🍚",
    medida: { valor: 0.029, unidade: "cm³ por grão", nota: "um grão mede uns 7 × 2 × 2 mm" },
    calcular(NA) {
      const volumeM3 = (NA * 0.029) / 1e6;
      const areaBrasil = 8.51e12; // m², território brasileiro
      const altura = volumeM3 / areaBrasil;
      return {
        resultado: `uma camada de ${formatarNumero(altura / 1000, 2)} km de arroz cobrindo o Brasil inteiro`,
        conta: `${formatarNumero(NA, 4)} grãos × 0,029 cm³ = ${formatarNumero(volumeM3, 4)} m³, espalhados sobre os ${formatarNumero(areaBrasil, 3)} m² do território`,
        referencia: "Mais alto que qualquer montanha do país. E isso é um mol de grãos — não de átomos.",
      };
    },
  },
  {
    id: "gota", nome: "gota de água", emoji: "💧",
    medida: { valor: 0.05, unidade: "mL por gota", nota: "vinte gotas fazem um mililitro" },
    calcular(NA) {
      const volumeM3 = (NA * 0.05e-3) / 1000;
      const oceanos = 1.335e18; // m³ de toda a água dos oceanos
      return {
        resultado: `${formatarNumero((volumeM3 / oceanos) * 100, 3)}% de toda a água dos oceanos do planeta`,
        conta: `${formatarNumero(NA, 4)} gotas × 0,05 mL = ${formatarNumero(volumeM3, 4)} m³, contra ${formatarNumero(oceanos, 4)} m³ de oceano`,
        referencia: "Guarde este número. Ele volta daqui a pouco, e vai doer.",
      };
    },
  },
  {
    id: "segundo", nome: "segundo", emoji: "⏱️",
    medida: { valor: 1, unidade: "segundo cada", nota: "um por segundo, sem parar nunca" },
    calcular(NA) {
      const anos = NA / 3.156e7;
      const universo = 1.38e10;
      const humanidade = 8.2e9;
      const anosHumanidade = NA / humanidade / 3.156e7;
      return {
        resultado: `${formatarNumero(anos, 4)} anos contando sozinho, um por segundo, sem dormir`,
        conta: `${formatarNumero(NA, 4)} s ÷ ${formatarNumero(3.156e7, 4)} s por ano`,
        referencia: `São ${formatarNumero(anos / universo, 3)} vezes a idade do universo. Se as ${formatarNumero(humanidade, 2)} pessoas vivas hoje contassem juntas, uma por segundo cada, ainda levaria ${formatarNumero(anosHumanidade, 3)} anos — mais tempo do que a espécie humana existe.`,
      };
    },
  },
  {
    id: "papel", nome: "folha de papel", emoji: "📄",
    medida: { valor: 0.1, unidade: "mm de espessura", nota: "papel comum de impressora" },
    calcular(NA) {
      const altura = NA * 0.1e-3;
      const anoLuz = 9.461e15;
      const viaLactea = 1e5;
      return {
        resultado: `uma pilha de ${formatarNumero(altura / anoLuz, 4)} anos-luz de altura`,
        conta: `${formatarNumero(NA, 4)} folhas × 0,1 mm = ${formatarNumero(altura, 4)} m`,
        referencia: `Isso atravessa ${formatarNumero((altura / anoLuz / viaLactea) * 100, 2)}% do diâmetro da Via Láctea. A estrela mais próxima do Sol está a 4,2 anos-luz: a pilha passaria por ela e seguiria adiante.`,
      };
    },
  },
  {
    id: "areia", nome: "grão de areia", emoji: "🏖️",
    medida: { valor: 0.06, unidade: "mm³ por grão", nota: "areia fina de praia" },
    calcular(NA) {
      const volume = (NA * 0.06) / 1e9;
      const aresta = Math.cbrt(volume) / 1000;
      return {
        resultado: `um cubo de areia com ${formatarNumero(aresta, 3)} km de aresta`,
        conta: `${formatarNumero(NA, 4)} grãos × 0,06 mm³ = ${formatarNumero(volume, 4)} m³`,
        referencia: "Um bloco maciço de areia mais alto que a camada onde os aviões voam.",
      };
    },
  },
];

/* ---------------- o contraste que revela o tamanho do átomo ---------------- */

/* O golpe pedagógico da tela: um mol de gotas encheria parte de um oceano,
   mas um mol de moléculas de água cabe numa colher. A diferença entre os dois
   números é o tamanho de um átomo. */
function contrasteDaAgua(massaMolarAgua) {
  const NA = CONSTANTES.AVOGADRO;
  const volumeGotas = (NA * 0.05e-3) / 1000;         // m³
  const oceanos = 1.335e18;
  const volumeMoleculas = massaMolarAgua;             // g, e ~mL, pois a densidade é 1

  return {
    gotas: {
      valor: (volumeGotas / oceanos) * 100,
      texto: `${formatarNumero((volumeGotas / oceanos) * 100, 3)}% dos oceanos`,
    },
    moleculas: {
      valor: volumeMoleculas,
      texto: `${formatarNumero(volumeMoleculas, 4)} mL`,
    },
    razao: (volumeGotas * 1e6) / volumeMoleculas,
  };
}

/* ---------------- por que justamente 6,02×10²³ ---------------- */

/* O número não foi escolhido por ser redondo — ele não é. Foi escolhido para
   que a massa de um átomo em unidades de massa atômica e a massa de um mol em
   gramas dessem o mesmo valor numérico. É essa coincidência construída que
   transforma a tabela periódica em instrumento de bancada. */
function pontesDoElemento(simbolo) {
  const e = POR_SIMBOLO[simbolo];
  if (!e) return null;
  return {
    simbolo: e.simbolo, nome: e.nome, z: e.z,
    neutrons: e.neutrons, isotopo: e.isotopo,
    massaAtomica: e.massa,
    massaMolar: e.massa,
    particulas: CONSTANTES.AVOGADRO,
  };
}

const ELEMENTOS_VITRINE = ["H", "C", "N", "O", "Na", "Mg", "S", "Cl", "Fe", "Cu", "Zn", "Au"];

/* ---------------- por que as reações precisam disso ---------------- */

/* A reação acontece entre partículas, em proporção de números inteiros. A
   balança pesa gramas. O mol é o tradutor entre as duas linguagens — e sem
   ele não existe controle de processo, dose de medicamento nem laudo. */
function receitaDaAgua(massaDesejadaGramas) {
  const mAgua = analisar("H2O").massaMolar;
  const mH2 = analisar("H2").massaMolar;
  const mO2 = analisar("O2").massaMolar;

  const molAgua = massaDesejadaGramas / mAgua;
  const molH2 = molAgua;            // 2 H2 + O2 -> 2 H2O, proporção 2:2
  const molO2 = molAgua / 2;

  return {
    massaAgua: massaDesejadaGramas,
    molAgua, moleculasAgua: molAgua * CONSTANTES.AVOGADRO,
    molH2, massaH2: molH2 * mH2,
    molO2, massaO2: molO2 * mO2,
    massaMolarAgua: mAgua, massaMolarH2: mH2, massaMolarO2: mO2,
  };
}

/* ---------------- onde isso aparece na profissão ---------------- */

const VIDEO = {
  id: "FC1jvXZXAgI",
  titulo: "O mol explicado em aula",
  autor: "Prof. Paulo",
  descricao: "Depois de ler e interagir acima, reforce com o vídeo. A ordem leitura e depois vídeo ajuda a fixar o conceito.",
};

const APLICACOES = [
  { emoji: "💊", area: "Farmácia", texto: "A dose de um medicamento é massa, mas o efeito depende do número de moléculas que chegam ao receptor. Trocar o sal de um princípio ativo muda a massa molar e muda a dose que se pesa." },
  { emoji: "🏭", area: "Indústria química", texto: "Comprar reagente a mais é prejuízo, a menos é lote perdido. O cálculo de carga de um reator é estequiometria pura, e o erro custa dinheiro por tonelada." },
  { emoji: "🧪", area: "Laboratório e análises", texto: "Toda titulação, todo laudo de teor e toda curva de calibração terminam numa conta de mol. Sem ela não existe resultado defensável." },
  { emoji: "💧", area: "Água e meio ambiente", texto: "A dosagem de coagulante e de cloro é calculada em massa, mas a reação acontece em proporção de partículas. Errar a conta é errar o tratamento." },
  { emoji: "🏥", area: "Saúde e segurança", texto: "Limite de exposição vem em ppm, que é razão de partículas. Converter para massa por metro cúbico exige o mol." },
  { emoji: "🍽️", area: "Alimentos", texto: "Controle de aditivos, nutrientes e contaminação: tudo passa por contagem de moléculas e concentração molar." },
  { emoji: "⚙️", area: "Processos industriais", texto: "Rendimento, pureza e reagente limitante decidem o lucro do lote. O mol é a linguagem comum entre o projeto e a balança." },
  { emoji: "🔬", area: "Pesquisa e desenvolvimento", texto: "Novos materiais, fármacos e catalisadores nascem de reações controladas em escala de partículas." },
];

/* Acessores das tabelas acima. Existem porque `const` declarado dentro de um
   eval não escapa para o escopo global, e as baterias de teste avaliam os
   módulos exatamente como o navegador os carrega. */
function pacotesConhecidos() { return PACOTES; }
function comparacoesConhecidas() { return COMPARACOES; }
function elementosDaVitrine() { return ELEMENTOS_VITRINE; }
function aplicacoesProfissionais() { return APLICACOES; }

function videoDaAula() { return VIDEO; }

/* ---------------- os dentes da chave ----------------

   A metáfora da chave só funciona se ela mudar de forma. Aqui ela ganha
   dentes conforme o aluno avança — recompensa visível, sem porta fechada.

   Deliberadamente NÃO existe cadeado sobre a explicação. Travar conteúdo
   puniria justamente quem está com dificuldade: quem trava é quem não
   entendeu, e a resposta do aplicativo seria negar a ele o texto que
   explica. O que se tranca é prática (os degraus do treino), nunca
   explicação.

   Cada dente é uma ação concreta, não rolagem de tela. Rolar não é sinal de
   compreensão, e uma barra que enche sozinha não recompensa nada.
*/
const DENTES_DA_CHAVE = [
  { id: "chegou",   rotulo: "Você pegou a chave",              dica: "Abrir esta tela" },
  { id: "pacote",   rotulo: "Entendeu o pacote de átomos",      dica: "Comparar a dúzia com o mol" },
  { id: "primeira", rotulo: "Acertou a primeira",               dica: "Responder a pergunta da dúzia" },
  { id: "tamanho",  rotulo: "Verificou o tamanho do número",    dica: "Ver um mol de alguma coisa" },
  { id: "degrau",   rotulo: "Fechou o Degrau 0",                dica: "Concluir o teste rápido" },
];

function dentesDaChave() { return DENTES_DA_CHAVE; }

/* Desenha a chave com os dentes já conquistados. O corpo é sempre o mesmo;
   o que muda é quantos dentes existem. */
function svgDaChave(conquistados) {
  const total = DENTES_DA_CHAVE.length;
  const dentes = DENTES_DA_CHAVE.map((d, i) => {
    const tem = conquistados.indexOf(d.id) >= 0;
    const x = 78 + i * 15;
    return `<rect x="${x}" y="30" width="9" height="${8 + (i % 2) * 6}" rx="2" ` +
      `class="${tem ? "dente ativo" : "dente"}" />`;
  }).join("");

  return `<svg viewBox="0 0 160 60" class="chave-svg" role="img" ` +
    `aria-label="Chave com ${conquistados.length} de ${total} dentes">` +
    `<circle cx="30" cy="30" r="18" class="anel" />` +
    `<circle cx="30" cy="30" r="8" class="furo" />` +
    `<rect x="46" y="26" width="106" height="8" rx="4" class="haste" />` +
    dentes +
    `</svg>`;
}
