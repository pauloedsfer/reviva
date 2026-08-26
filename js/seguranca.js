/* MOLBOX — segurança no preparo.

   Este arquivo existe porque a conta de quanto pesar é a parte que não
   machuca ninguém. O que machuca é o que vem antes e depois dela: abrir o
   frasco errado na bancada aberta, despejar água sobre ácido concentrado,
   completar o volume com a solução ainda quente, guardar perclórico perto de
   papel.

   Por isso os avisos aparecem ANTES do roteiro na tela, e não como rodapé.
   Um alerta que o aluno lê depois de já ter pesado não serviu para nada.

   As informações vêm de fichas de segurança (FISPQ) e de manuais de boas
   práticas de laboratório. Nada aqui substitui a FISPQ do lote que está na
   sua prateleira, e o aplicativo diz isso ao aluno.
*/

const NIVEIS = {
  critico:  { rotulo: "RISCO GRAVE",   ordem: 0 },
  alto:     { rotulo: "ATENÇÃO",       ordem: 1 },
  medio:    { rotulo: "CUIDADO",       ordem: 2 },
  info:     { rotulo: "BOA PRÁTICA",   ordem: 3 },
};

/* Perfil de risco por reagente. Cada campo dispara um aviso específico na
   tela, com o motivo — não basta dizer "use capela", é preciso dizer o que
   sai do frasco. */
const PERFIS_DE_RISCO = {
  "H2SO4": {
    nome: "ácido sulfúrico",
    capela: "Libera névoa ácida ao ser manipulado concentrado, e a névoa não avisa: ela não tem cheiro forte como o do clorídrico.",
    exotermico: "severo",
    calor: "A diluição do sulfúrico é das mais exotérmicas que existem. Uma diluição de 1:10 pode passar de 70 °C, e a solução chega a ferver localmente no ponto onde o ácido cai.",
    banhoDeGelo: true,
    contracaoVolume: "O sulfúrico e a água ocupam, juntos, menos volume que separados. Somando 50 mL de ácido a 50 mL de água você não obtém 100 mL.",
    ordemObrigatoria: "ácido sobre água",
    incompatibilidades: ["matéria orgânica (carboniza violentamente)", "cloratos e percloratos", "permanganatos", "metais em pó"],
    epi: ["óculos de ampla visão, não os de haste", "luvas de nitrila", "avental de mangas compridas"],
  },
  "HNO3": {
    nome: "ácido nítrico",
    capela: "Libera vapores nitrosos, de cor castanho-avermelhada. Eles causam edema pulmonar com efeito retardado: a pessoa se sente bem no momento e piora horas depois.",
    exotermico: "moderado",
    banhoDeGelo: true,
    ordemObrigatoria: "ácido sobre água",
    oxidanteForte: true,
    incompatibilidades: ["álcoois e acetona (reação violenta)", "matéria orgânica em geral", "ácido clorídrico (a mistura forma água régia)", "metais"],
    epi: ["óculos de ampla visão", "luvas de nitrila", "avental"],
    armazenamento: "Frasco plástico envelhece com nítrico concentrado e fica quebradiço. Confira a validade do frasco, não só a do reagente.",
  },
  "HCl": {
    nome: "ácido clorídrico",
    capela: "O frasco concentrado libera gás clorídrico continuamente, e ele forma névoa branca visível ao abrir. Irrita vias aéreas já em baixa concentração.",
    exotermico: "moderado",
    banhoDeGelo: false,
    ordemObrigatoria: "ácido sobre água",
    incompatibilidades: ["hipoclorito de sódio, ou seja, água sanitária (libera gás cloro)", "permanganato de potássio (libera gás cloro)", "bases concentradas"],
    epi: ["óculos de ampla visão", "luvas de nitrila", "avental"],
  },
  "HClO4": {
    nome: "ácido perclórico",
    capela: "Exige capela dedicada, de aço inoxidável e com sistema de lavagem. Numa capela comum, os sais de perclorato se acumulam nos dutos e podem detonar por atrito anos depois.",
    exotermico: "moderado",
    banhoDeGelo: true,
    ordemObrigatoria: "ácido sobre água",
    oxidanteForte: true,
    explosivo: "Com o mínimo vestígio de matéria orgânica, o perclórico concentrado pode explodir. Papel, luva de látex, resíduo de solvente na vidraria: qualquer um serve de combustível.",
    proibido: "Não prepare solução de ácido perclórico sem treinamento específico e sem capela dedicada. Este não é um reagente de aula prática comum.",
    incompatibilidades: ["qualquer matéria orgânica", "agentes redutores", "metais", "álcoois"],
    epi: ["óculos de ampla visão e protetor facial", "luvas de nitrila", "avental resistente a produtos químicos"],
  },
  "HF": {
    nome: "ácido fluorídrico",
    capela: "Exige capela específica para fluorídrico. O vapor é absorvido pela pele e pelas mucosas sem dor imediata.",
    vidrariaProibida: "Ataca o vidro: dissolve a sílica. Toda a vidraria tem de ser substituída por politetrafluoretileno ou polipropileno — inclusive o balão volumétrico.",
    primeirosSocorros: "Tenha gel de gluconato de cálcio a 2,5% ao alcance da mão ANTES de abrir o frasco, e saiba onde fica o pronto-socorro mais próximo.",
    efeitoRetardado: "A queimadura pode não doer no momento e só aparecer até 24 horas depois. O íon fluoreto continua penetrando e sequestra o cálcio do organismo, o que causa hipocalcemia e arritmia. Procure atendimento médico mesmo sem lesão visível.",
    proibido: "Ácido fluorídrico não é reagente de aula prática. Prepare apenas em laboratório com protocolo próprio, antídoto disponível e alguém treinado por perto.",
    incompatibilidades: ["vidro e cerâmica", "metais (libera hidrogênio)", "bases fortes"],
    epi: ["luvas de neopreno ou butila, nunca látex", "protetor facial completo", "avental impermeável"],
  },
  "NaOH": {
    nome: "hidróxido de sódio",
    exotermico: "severo",
    calor: "A dissolução libera bastante calor: 100 g em 1 L de água elevam a temperatura em várias dezenas de graus.",
    banhoDeGelo: true,
    aerossolCaustico: "As lentilhas são higroscópicas e geram poeira cáustica ao serem manipuladas. Um grão no olho causa lesão profunda, porque a base saponifica o tecido e continua penetrando.",
    incompatibilidades: ["ácidos concentrados (neutralização violenta)", "alumínio, zinco e estanho (liberam hidrogênio)"],
    epi: ["óculos de ampla visão", "luvas de nitrila", "avental"],
  },
  "KOH": {
    nome: "hidróxido de potássio",
    exotermico: "severo",
    calor: "Dissolução fortemente exotérmica, como a do hidróxido de sódio.",
    banhoDeGelo: true,
    aerossolCaustico: "Higroscópico e cáustico. Manipule rápido e feche o frasco.",
    incompatibilidades: ["ácidos concentrados", "alumínio e zinco"],
    epi: ["óculos de ampla visão", "luvas de nitrila", "avental"],
  },
  "NH3": {
    nome: "amônia",
    capela: "O hidróxido de amônio libera gás amônia, que é lacrimogêneo e irritante respiratório forte.",
    pressuriza: "O frasco pressuriza com o calor. Abra com o frasco frio, apontando a boca para longe do rosto e de outras pessoas.",
    incompatibilidades: ["hipoclorito (forma cloraminas tóxicas)", "ácidos", "halogênios"],
    epi: ["óculos de ampla visão", "luvas de nitrila", "avental"],
  },
  "CH3COOH": {
    nome: "ácido acético glacial",
    capela: "Vapor irritante e de odor penetrante.",
    inflamavel: "O ácido acético glacial é inflamável. Mantenha longe de chama e de placa aquecedora.",
    solidifica: "Solidifica abaixo de 16 °C. Se o frasco estiver sólido, aqueça em banho-maria morno — nunca com chama direta.",
    incompatibilidades: ["ácido nítrico", "peróxidos", "permanganatos", "ácido crômico"],
    epi: ["óculos de ampla visão", "luvas de nitrila", "avental"],
  },
  "H2O2": {
    nome: "peróxido de hidrogênio",
    oxidanteForte: true,
    pressuriza: "Decompõe-se liberando oxigênio, o que pressuriza o frasco. Guarde em frasco com respiro e ao abrigo da luz.",
    incompatibilidades: ["matéria orgânica", "metais e sais metálicos (catalisam a decomposição)", "redutores"],
    epi: ["óculos de ampla visão", "luvas de nitrila"],
  },
  "KMnO4": {
    nome: "permanganato de potássio",
    oxidanteForte: true,
    explosivo: "Com glicerina, álcool ou açúcar, o permanganato sólido pode entrar em ignição espontânea. Não pese sobre papel comum e não guarde perto de solventes.",
    incompatibilidades: ["glicerina e álcoois", "ácido clorídrico (libera cloro)", "matéria orgânica", "enxofre"],
    epi: ["óculos", "luvas de nitrila"],
    armazenamento: "Mancha permanentemente pele, roupa e bancada.",
  },
  "AgNO3": {
    nome: "nitrato de prata",
    oxidanteForte: true,
    incompatibilidades: ["matéria orgânica", "amônia (pode formar composto detonante em repouso)"],
    epi: ["óculos", "luvas de nitrila"],
    armazenamento: "Fotossensível: frasco âmbar. Mancha a pele de preto após algumas horas, e a mancha só sai com a renovação da pele.",
  },
  "Br2": {
    nome: "bromo",
    capela: "Vapor denso, visível e altamente corrosivo para as vias aéreas.",
    proibido: "Bromo líquido não é reagente de aula prática comum. Manipule só com protocolo próprio.",
    epi: ["protetor facial", "luvas de neopreno", "avental impermeável"],
  },
};

/* Reagentes cuja dissolução ou diluição esquenta o bastante para justificar
   banho de gelo em volumes de bancada. */
const MUITO_EXOTERMICOS = ["H2SO4", "NaOH", "KOH", "HClO4", "HNO3"];

/* Perigos que valem para qualquer preparo, e que ninguém deveria precisar
   descobrir errando. */
const REGRAS_GERAIS = [
  { nivel: "info", titulo: "Antes de abrir qualquer frasco",
    texto: "Localize o chuveiro de emergência e o lava-olhos, e confirme que funcionam. Avise alguém que você vai trabalhar. Nunca prepare solução sozinho no laboratório fora do horário." },
  { nivel: "info", titulo: "Equipamento de proteção mínimo",
    texto: "Óculos de segurança, jaleco de mangas compridas, calça comprida e sapato fechado. Luvas conforme o reagente. Cabelo preso. Nada de pipetar com a boca, nem para água." },
  { nivel: "info", titulo: "Rotule antes de encher",
    texto: "Escreva o rótulo antes de a solução existir: substância, concentração, data, seu nome. Frasco sem rótulo vira resíduo perigoso, porque ninguém mais sabe o que há dentro." },
];

/* ---------------- avaliação ---------------- */

function aviso(nivel, titulo, texto) { return { nivel, titulo, texto }; }

/* Recebe o resultado do preparo e devolve a lista de avisos, do mais grave
   para o menos grave. */
function avaliarSeguranca({ formula, ehLiquido, massaReagente, volumeReagenteML, volumeFinalML, concentracaoMolar, concentracaoDoFrasco }) {
  const perfil = PERFIS_DE_RISCO[formula];
  const avisos = [];

  if (perfil && perfil.proibido) {
    avisos.push(aviso("critico", "Este reagente não é de aula prática", perfil.proibido));
  }

  if (perfil && perfil.explosivo) {
    avisos.push(aviso("critico", "Risco de explosão", perfil.explosivo));
  }

  if (perfil && perfil.vidrariaProibida) {
    avisos.push(aviso("critico", "A vidraria comum não serve", perfil.vidrariaProibida));
  }

  if (perfil && perfil.efeitoRetardado) {
    avisos.push(aviso("critico", "A lesão pode aparecer horas depois", perfil.efeitoRetardado));
  }

  if (perfil && perfil.primeirosSocorros) {
    avisos.push(aviso("critico", "Antídoto ao alcance antes de começar", perfil.primeirosSocorros));
  }

  if (perfil && perfil.capela) {
    avisos.push(aviso("alto", "Trabalhe na capela", perfil.capela + " Ligue a exaustão antes de abrir o frasco e trabalhe com o vidro na altura mínima."));
  }

  if (perfil && perfil.ordemObrigatoria === "ácido sobre água") {
    avisos.push(aviso("alto", "Ácido sobre água, nunca o contrário",
      "Coloque a água primeiro e escorra o ácido pela parede, em fio fino, com agitação. Água sobre ácido concentrado ferve na superfície e projeta gotas de ácido para fora do recipiente, na direção do rosto."));
  }

  const exigeGelo = perfil && (perfil.banhoDeGelo || MUITO_EXOTERMICOS.includes(formula));
  if (exigeGelo) {
    const escala = ehLiquido
      ? (volumeReagenteML > 20 ? "grande" : volumeReagenteML > 5 ? "média" : "pequena")
      : (massaReagente > 20 ? "grande" : massaReagente > 5 ? "média" : "pequena");
    const texto = (perfil.calor ? perfil.calor + " " : "") +
      (escala === "pequena"
        ? "Nesta quantidade o aquecimento é modesto, mas ainda assim trabalhe em béquer de parede grossa e espere esfriar antes de completar o volume."
        : "Prepare o béquer dentro de uma bacia com gelo e água antes de começar, e adicione o reagente em porções, esperando entre uma e outra.");
    avisos.push(aviso(escala === "grande" ? "alto" : "medio", "Reação exotérmica: use banho de gelo", texto));
  }

  if (perfil && perfil.aerossolCaustico) {
    avisos.push(aviso("alto", "Poeira cáustica", perfil.aerossolCaustico));
  }

  if (perfil && perfil.oxidanteForte) {
    avisos.push(aviso("alto", "Oxidante forte",
      "Mantenha longe de papel, algodão, solvente e qualquer material combustível. Não use espátula de madeira nem pese sobre papel comum: use vidro de relógio."));
  }

  if (perfil && perfil.inflamavel) {
    avisos.push(aviso("alto", "Inflamável", perfil.inflamavel));
  }

  if (perfil && perfil.pressuriza) {
    avisos.push(aviso("medio", "O frasco está sob pressão", perfil.pressuriza));
  }

  if (perfil && perfil.contracaoVolume) {
    avisos.push(aviso("medio", "Contração de volume",
      perfil.contracaoVolume + " Por isso o volume final é sempre aferido no balão, depois de esfriar, e nunca calculado somando os volumes que você misturou."));
  }

  // regra geral de contração e dilatação, válida para todo preparo aquecido
  if (exigeGelo) {
    avisos.push(aviso("medio", "Não complete o volume a quente",
      "Líquido quente ocupa mais espaço. Se você acertar o menisco com a solução morna, ao esfriar o nível desce e a concentração fica maior que a pretendida. Espere voltar à temperatura ambiente."));
  }

  if (perfil && perfil.solidifica) {
    avisos.push(aviso("medio", "Pode estar solidificado", perfil.solidifica));
  }

  if (perfil && perfil.incompatibilidades && perfil.incompatibilidades.length) {
    avisos.push(aviso("alto", "Não pode encostar em",
      perfil.incompatibilidades.join("; ") + ". Confira o que já está na bancada e na pia antes de começar."));
  }

  if (perfil && perfil.armazenamento) {
    avisos.push(aviso("info", "Guarda e conservação", perfil.armazenamento));
  }

  // frasco concentrado tem risco próprio, mesmo sem perfil cadastrado
  if (ehLiquido && concentracaoDoFrasco > 8 && !(perfil && perfil.capela)) {
    avisos.push(aviso("medio", "Reagente concentrado",
      `O frasco está a ${formatarNumero(concentracaoDoFrasco, 4)} mol/L. Manipule em área ventilada e transfira com pipetador, nunca vertendo direto do frasco grande.`));
  }

  avisos.sort((a, b) => NIVEIS[a.nivel].ordem - NIVEIS[b.nivel].ordem);

  return {
    formula,
    nome: perfil ? perfil.nome : null,
    avisos,
    epi: (perfil && perfil.epi) || ["óculos de segurança", "luvas de nitrila", "jaleco de mangas compridas"],
    exigeCapela: !!(perfil && perfil.capela),
    exigeBanhoDeGelo: !!exigeGelo,
    temPerfil: !!perfil,
    gerais: REGRAS_GERAIS,
  };
}

function reagentesComPerfilDeRisco() { return PERFIS_DE_RISCO; }
function niveisDeRisco() { return NIVEIS; }
