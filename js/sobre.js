/* SUPER MOLBOX — a página Sobre.

   O conteúdo fica aqui, separado da interface, para que possa ser editado sem
   mexer em lógica nenhuma. Se algum dado mudar — o canal, a instituição, um
   novo colaborador —, basta alterar as constantes abaixo.
*/

const AUTOR = {
  nome: "Prof. Paulo Fernandes",
  titulo: "Químico Industrial, Farmacêutico e Docente de Química",
  canal: {
    url: "https://www.youtube.com/@pauloedsfer",
    rotulo: "Canal no YouTube",
    aviso: false,
  },
  /* A pedido do autor, esta apresentação não nomeia empregadores nem
     instituições. Ela fala do percurso, não do crachá. */
  apresentacao: [
    "Químico Industrial e Farmacêutico de formação, professor por escolha. São mais de quinze " +
    "anos transitando entre a farmácia hospitalar, a manipulação, o processo industrial e a " +
    "sala de aula — quatro lugares que costumam ser tratados como mundos separados e que, na " +
    "prática, resolvem o mesmo problema com a mesma conta.",

    "Mestre em Ciências Aplicadas a Produtos para a Saúde, com especializações em Docência " +
    "Universitária e em Gestão Hospitalar. No ensino, aposta em metodologia ativa, vivência de " +
    "laboratório e orientação de projeto: a teoria vale quando o aluno consegue usá-la num " +
    "problema que existe fora da prova.",

    "Essa dupla vida aparece em cada tela deste aplicativo. As contas aqui são as contas da " +
    "bancada, os exemplos saem de rótulo e de laudo, e os avisos de segurança são os que se " +
    "aprende trabalhando — não os que se lê num manual.",

    "O propósito é o mesmo dos dois lados do balcão: fazer o estudante entender o mol de " +
    "verdade, e não decorar uma fórmula que ele esquece na semana seguinte.",
  ],
};

const PORQUE_EXISTE = [
  {
    titulo: "O problema",
    texto: "O mol é a porta de entrada da Química, e é onde a maioria dos estudantes trava. " +
      "Não porque a conta seja difícil — ela é uma multiplicação —, mas porque ninguém " +
      "consegue sentir o tamanho de 6,02×10²³. Sem essa intuição, o aluno decora o " +
      "procedimento e esquece assim que a prova acaba.",
  },
  {
    titulo: "A aposta",
    texto: "Que dá para fazer o número caber na cabeça antes de usá-lo. Por isso o aplicativo " +
      "começa pela analogia da dúzia e por comparações calculadas na hora, e só depois " +
      "chega à fórmula. Entender primeiro, calcular depois.",
  },
  {
    titulo: "O que ele não é",
    texto: "Não é uma lista de exercícios digitalizada nem um substituto do laboratório. " +
      "É um guia de bolso que continua útil depois da formatura — para conferir uma massa " +
      "molar às pressas, lembrar a ordem de adição de um ácido ou simular uma titulação " +
      "antes de fazer a de verdade.",
  },
  {
    titulo: "Por que é gratuito e funciona sem internet",
    texto: "Porque a rede da escola cai, o laboratório costuma ser um ponto cego de sinal e " +
      "nem todo aluno tem dados móveis sobrando. Nada aqui exige cadastro, e o progresso " +
      "fica guardado no próprio aparelho — não há servidor, não há coleta de dados.",
  },
];

const COLABORACAO = [
  {
    quem: "Professores de Química",
    texto: "Revisaram o conteúdo, apontaram onde a linguagem estava técnica demais e ajudaram " +
      "a decidir a sequência dos assuntos.",
  },
  {
    quem: "Professores de Informática",
    texto: "Contribuíram com as decisões de arquitetura que mantêm o aplicativo leve, offline " +
      "e sem dependências externas.",
  },
  {
    quem: "Os alunos",
    texto: "Foram eles que testaram em sala e trouxeram o que nenhuma revisão de escritório " +
      "encontraria: que dava para acumular pontos repetindo o degrau mais fácil, que o " +
      "desbloqueio de um degrau novo passava despercebido, e que o teclado do celular " +
      "fechava a cada dígito digitado. Cada um desses relatos virou correção. " +
      "Este aplicativo é, em boa parte, obra deles.",
  },
];

function dadosDoAutor() { return AUTOR; }
function motivosDoAplicativo() { return PORQUE_EXISTE; }
function colaboradores() { return COLABORACAO; }
