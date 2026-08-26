/* MOLBOX — do cálculo para a bancada.

   A conta de quanto pesar é a parte fácil. O que separa o exercício do
   trabalho real é o resto: a pureza do rótulo, a vidraria compatível com a
   precisão pretendida, a ordem das operações e as substâncias que não podem
   ser preparadas por pesagem direta porque mudam de massa enquanto estão na
   balança.
*/

const BALOES = [10, 25, 50, 100, 200, 250, 500, 1000, 2000];
const PIPETAS_VOLUMETRICAS = [1, 2, 5, 10, 15, 20, 25, 50, 100];
const PROVETAS = [10, 25, 50, 100, 250, 500, 1000];

/* Reagentes que exigem cuidado especial no preparo. As observações abaixo são
   o tipo de coisa que só aparece depois de errar uma vez na bancada. */
const CUIDADOS = {
  "NaOH": {
    padronizar: true,
    notas: [
      "O hidróxido de sódio é higroscópico e absorve gás carbônico do ar: a massa muda enquanto ele está no vidro de relógio, e parte dele já virou carbonato.",
      "Por isso a solução de NaOH nunca é padrão primário. Prepare com a massa aproximada e padronize contra biftalato de potássio.",
      "A dissolução libera calor. Espere a solução voltar à temperatura ambiente antes de completar o volume, senão o menisco desce depois.",
    ],
  },
  "KOH": { padronizar: true, notas: ["Higroscópico e carbonatável como o NaOH. Prepare aproximado e padronize."] },
  "HCl": {
    liquido: true, padronizar: true,
    concentradoPercent: 37, concentradoDensidade: 1.19,
    notas: [
      "O ácido clorídrico comercial é uma solução de gás em água, e o rótulo traz porcentagem em massa e densidade, não mol/L.",
      "Sempre o ácido sobre a água, nunca o contrário.",
      "A concentração do frasco varia com a idade e com quantas vezes ele foi aberto: padronize contra carbonato de sódio.",
    ],
  },
  "H2SO4": {
    liquido: true,
    concentradoPercent: 98, concentradoDensidade: 1.84,
    notas: [
      "A diluição do ácido sulfúrico libera muito calor. Sempre o ácido sobre a água, em fio fino e com agitação; o inverso projeta ácido fervente.",
      "Nunca dilua ácido sulfúrico dentro de balão volumétrico: o calor dilata o vidro e desregula a aferição. Dilua em béquer, espere esfriar e só então transfira.",
    ],
  },
  "HNO3": { liquido: true, concentradoPercent: 65, concentradoDensidade: 1.39, notas: ["Sempre o ácido sobre a água. Trabalhe na capela: libera vapores nitrosos."] },
  "CH3COOH": { liquido: true, concentradoPercent: 99.5, concentradoDensidade: 1.05, notas: ["O ácido acético glacial solidifica abaixo de 16 °C. Se o frasco estiver sólido, aqueça em banho-maria antes de pipetar."] },
  "Na2CO3": { padraoPrimario: true, notas: ["Padrão primário, desde que seco em estufa a 270 °C por uma hora e resfriado em dessecador."] },
  "AgNO3": { padronizar: true, notas: ["Fotossensível: guarde em frasco âmbar. A solução escurece com a luz."] },
  "KMnO4": { padronizar: true, notas: ["Oxida a matéria orgânica presente na própria água. Prepare, deixe repousar, filtre em lã de vidro e só então padronize contra oxalato de sódio."] },
  "Na2S2O3": { padronizar: true, notas: ["Instável em meio ácido e sensível a bactérias. Padronize no dia do uso."] },
  "KHC8H4O4": { padraoPrimario: true, notas: ["Biftalato de potássio: padrão primário para bases. Seque a 110 °C por duas horas."] },
};

function escolherBalao(volumeMililitros) {
  const exato = BALOES.find((v) => Math.abs(v - volumeMililitros) < 1e-9);
  if (exato) return { volume: exato, exato: true };
  const acima = BALOES.find((v) => v > volumeMililitros);
  return { volume: acima || null, exato: false };
}

function escolherMedidorDeLiquido(volumeMililitros) {
  if (volumeMililitros < 0.1) {
    return { tipo: "micropipeta", capacidade: null,
      nota: "Volume abaixo de 0,1 mL. Micropipeta, e ainda assim com erro relativo alto. Prefira preparar uma solução intermediária." };
  }
  if (volumeMililitros < 1) {
    return { tipo: "micropipeta", capacidade: 1,
      nota: "Micropipeta de 100 a 1000 µL." };
  }
  const volumetrica = PIPETAS_VOLUMETRICAS.find((v) => Math.abs(v - volumeMililitros) < 0.02);
  if (volumetrica) {
    return { tipo: "pipeta volumétrica", capacidade: volumetrica,
      nota: `Pipeta volumétrica de ${volumetrica} mL: é a de menor incerteza para este volume.` };
  }
  const graduada = PIPETAS_VOLUMETRICAS.find((v) => v >= volumeMililitros);
  if (graduada && graduada <= 25) {
    return { tipo: "pipeta graduada ou bureta", capacidade: graduada,
      nota: `Não há pipeta volumétrica desse volume. Use pipeta graduada de ${graduada} mL, ou bureta se precisar de exatidão.` };
  }
  const proveta = PROVETAS.find((v) => v >= volumeMililitros);
  return { tipo: "proveta", capacidade: proveta || null,
    nota: "Volume grande: proveta resolve, mas ela é a vidraria menos exata. Se a exatidão importa, meça por diferença de massa." };
}

function avaliarBalanca(massaGramas) {
  if (massaGramas < 0.01) {
    return { classe: "inviável", precisao: null,
      aviso: `Pesar ${formatarNumero(massaGramas, 3)} g com exatidão razoável é inviável até em balança analítica: o erro relativo passa de 1%. Prepare uma solução mais concentrada e dilua.` };
  }
  if (massaGramas < 1) {
    return { classe: "analítica", precisao: "0,1 mg",
      aviso: "Massa pequena: balança analítica, e com a porta fechada. Uma corrente de ar já muda o último dígito." };
  }
  if (massaGramas < 20) {
    return { classe: "analítica", precisao: "0,1 mg", aviso: null };
  }
  return { classe: "semianalítica", precisao: "10 mg",
    aviso: "Massa confortável. Balança semianalítica já basta, a menos que a solução seja padrão." };
}

/* O cálculo completo do preparo a partir de reagente sólido ou líquido. */
function prepararSolucao({ formula, massaMolar, volumeFinalML, concentracaoMolar, pureza, densidadeReagente, percentualReagente }) {
  if (!(volumeFinalML > 0)) return { situacao: "erro", mensagem: "Informe o volume final da solução." };
  if (!(concentracaoMolar > 0)) return { situacao: "erro", mensagem: "Informe a concentração desejada." };
  if (!(massaMolar > 0)) return { situacao: "erro", mensagem: "Massa molar inválida." };

  const cuidado = CUIDADOS[formula] || {};
  const ehLiquido = !!(cuidado.liquido || (densidadeReagente > 0 && percentualReagente > 0));
  const purezaUsada = isFinite(pureza) && pureza > 0 ? pureza : (ehLiquido ? (percentualReagente || cuidado.concentradoPercent || 100) : 100);

  const mols = concentracaoMolar * (volumeFinalML / 1000);
  const massaPura = mols * massaMolar;
  const massaReagente = massaPura / (purezaUsada / 100);

  const passos = [];
  const resultado = {
    situacao: "ok", formula, mols, massaPura, massaReagente, purezaUsada,
    volumeFinalML, concentracaoMolar, ehLiquido,
    balao: escolherBalao(volumeFinalML),
    cuidado,
  };

  if (ehLiquido) {
    const d = densidadeReagente > 0 ? densidadeReagente : cuidado.concentradoDensidade;
    if (!(d > 0)) {
      return { situacao: "erro", mensagem: "Para reagente líquido, informe a densidade do frasco." };
    }
    resultado.densidade = d;
    resultado.volumeReagenteML = massaReagente / d;
    resultado.concentracaoDoFrasco = (d * 1000 * (purezaUsada / 100)) / massaMolar;
    resultado.medidor = escolherMedidorDeLiquido(resultado.volumeReagenteML);
  } else {
    resultado.balanca = avaliarBalanca(massaReagente);
  }

  // ---- roteiro ----
  const balaoTexto = resultado.balao.exato
    ? `balão volumétrico de ${resultado.balao.volume} mL`
    : `balão volumétrico de ${resultado.balao.volume} mL (não existe balão de ${formatarNumero(volumeFinalML, 4)} mL)`;

  if (ehLiquido) {
    passos.push({
      titulo: "Encha o balão parcialmente com água",
      texto: `Coloque cerca de ${Math.round(volumeFinalML * 0.4)} mL de água destilada no ${balaoTexto}. A água vem antes do ácido, sempre.`,
    });
    passos.push({
      titulo: `Meça ${formatarNumero(resultado.volumeReagenteML, 4)} mL do reagente`,
      texto: `${resultado.medidor.nota} O frasco tem ${formatarNumero(purezaUsada, 3)}% em massa e densidade ${formatarNumero(resultado.densidade, 3)} g/mL, o que dá ${formatarNumero(resultado.concentracaoDoFrasco, 4)} mol/L no próprio frasco.`,
    });
    passos.push({
      titulo: "Adicione o ácido sobre a água",
      texto: "Em fio fino, escorrendo pela parede, com agitação. Nunca o contrário: a água sobre o ácido concentrado ferve na superfície e projeta gotas.",
    });
    passos.push({ titulo: "Espere esfriar", texto: "A diluição aquece, e volume aferido a quente encolhe ao esfriar. Só complete o volume com a solução na temperatura ambiente." });
  } else {
    passos.push({
      titulo: `Pese ${formatarNumero(resultado.massaReagente, 5)} g do reagente`,
      texto: purezaUsada < 100
        ? `São ${formatarNumero(resultado.massaPura, 5)} g de ${formula} puro, mas o rótulo diz ${formatarNumero(purezaUsada, 3)}% de pureza. Dividindo um pelo outro chega-se à massa a pesar. Quem esquece a pureza prepara uma solução ${formatarNumero(100 - purezaUsada, 2)}% mais fraca que a pretendida.`
        : `Pese em vidro de relógio ou pesa-filtro, nunca direto no papel.`,
    });
    passos.push({
      titulo: "Dissolva em béquer, não no balão",
      texto: `Use cerca de ${Math.round(volumeFinalML * 0.3)} mL de água destilada. Balão volumétrico é vidraria de aferição, não de dissolução: agitar sólido dentro dele arranha o gargalo e demora.`,
    });
    passos.push({
      titulo: "Transfira quantitativamente",
      texto: `Passe a solução para o ${balaoTexto} com bastão e funil, e lave o béquer três vezes com pequenas porções de água, jogando cada lavagem no balão. O que fica no béquer é soluto que não entra na conta.`,
    });
  }

  passos.push({
    titulo: "Complete até o traço de aferição",
    texto: "Adicione água até faltar pouco, então acerte gota a gota com pipeta Pasteur, com o olho na altura do traço e a parte de baixo do menisco tangenciando a linha.",
  });
  passos.push({
    titulo: "Homogeneíze",
    texto: "Tampe e inverta o balão umas vinte vezes, com giro. Sem isso a solução fica estratificada, e a primeira alíquota sai com concentração diferente da última.",
  });

  if (cuidado.padronizar) {
    passos.push({
      titulo: "Padronize antes de usar",
      texto: "Esta solução não é padrão primário. A concentração calculada é aproximada até ser conferida contra um padrão.",
    });
  }

  resultado.passos = passos;
  resultado.avisos = [];
  if (!resultado.balao.exato) {
    resultado.avisos.push(`Não existe balão volumétrico de ${formatarNumero(volumeFinalML, 4)} mL. Ou ajuste o volume para um valor de balão, ou prepare em proveta e aceite a exatidão menor.`);
  }
  if (resultado.balanca && resultado.balanca.aviso) resultado.avisos.push(resultado.balanca.aviso);
  if (resultado.medidor && resultado.volumeReagenteML < 0.5) resultado.avisos.push(resultado.medidor.nota);
  if (cuidado.notas) resultado.avisos.push(...cuidado.notas);

  return resultado;
}
