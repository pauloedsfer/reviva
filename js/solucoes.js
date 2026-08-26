/* MOLBOX — concentração de soluções.

   Todas as unidades saem de uma base comum: um litro de solução. Nele há
   massa de solução = 1000 · densidade, massa de soluto = C · M, e massa de
   solvente = a diferença entre as duas. Todo o resto é razão entre esses três
   números.

   A densidade não é enfeite. Sem ela não existe conversão entre unidades de
   massa e de volume, e o hábito de supor densidade 1,00 é a origem de metade
   dos erros de rótulo: ácido clorídrico concentrado tem densidade 1,19, e
   quem supõe 1,00 erra o preparo em 19%.
*/

const UNIDADES_CONCENTRACAO = {
  molar:      { rotulo: "Concentração em mol/L", unidade: "mol/L",  curta: "mol/L" },
  massica:    { rotulo: "Concentração comum",    unidade: "g/L",    curta: "g/L" },
  percentMM:  { rotulo: "Título em massa",       unidade: "% m/m",  curta: "% m/m" },
  percentMV:  { rotulo: "Massa por volume",      unidade: "% m/v",  curta: "% m/v" },
  ppm:        { rotulo: "Partes por milhão",     unidade: "mg/L",   curta: "ppm" },
  molalidade: { rotulo: "Molalidade",            unidade: "mol/kg", curta: "mol/kg" },
  titulo:     { rotulo: "Título",                unidade: "",       curta: "τ" },
};

/* Converte qualquer unidade para mol/L, que é a moeda interna. */
function paraMolar(valor, unidade, massaMolar, densidade) {
  const d = densidade > 0 ? densidade : 1;
  switch (unidade) {
    case "molar":      return valor;
    case "massica":    return valor / massaMolar;
    case "percentMV":  return (valor * 10) / massaMolar;
    case "percentMM":  return (valor / 100) * d * 1000 / massaMolar;
    case "titulo":     return valor * d * 1000 / massaMolar;
    case "ppm":        return valor / 1000 / massaMolar;
    case "molalidade": {
      // m = n / kg de solvente; num litro: n = m · kg_solvente e
      // massa_solução = 1000d = n·M + 1000·kg_solvente
      const kgSolvente = (1000 * d) / (1000 + valor * massaMolar);
      return valor * kgSolvente;
    }
    default: throw new Error("unidade desconhecida: " + unidade);
  }
}

/* A partir de mol/L, devolve o mesmo valor em todas as unidades. */
function todasAsConcentracoes(molar, massaMolar, densidade) {
  const d = densidade > 0 ? densidade : 1;
  const massaSolutoPorLitro = molar * massaMolar;      // g
  const massaSolucaoPorLitro = 1000 * d;               // g
  const massaSolventePorLitro = massaSolucaoPorLitro - massaSolutoPorLitro;

  const impossivel = massaSolventePorLitro <= 0;

  return {
    molar,
    massica: massaSolutoPorLitro,
    percentMV: massaSolutoPorLitro / 10,
    percentMM: (massaSolutoPorLitro / massaSolucaoPorLitro) * 100,
    titulo: massaSolutoPorLitro / massaSolucaoPorLitro,
    ppm: massaSolutoPorLitro * 1000,
    molalidade: impossivel ? NaN : molar / (massaSolventePorLitro / 1000),
    massaSolutoPorLitro, massaSolucaoPorLitro, massaSolventePorLitro,
    impossivel,
  };
}

/* Fração molar do soluto, que precisa da massa molar do solvente. */
function fracaoMolar(molar, massaMolar, densidade, massaMolarSolvente = 18.015) {
  const t = todasAsConcentracoes(molar, massaMolar, densidade);
  if (t.impossivel) return NaN;
  const nSolvente = t.massaSolventePorLitro / massaMolarSolvente;
  return molar / (molar + nSolvente);
}

/* Concentração em volume, só faz sentido para soluto líquido. Precisa da
   densidade do soluto puro, e vem com uma ressalva séria: volumes de líquidos
   não são aditivos. Misturar 50 mL de etanol com 50 mL de água dá cerca de
   96 mL, não 100. */
function percentualVV(volumeSoluto, volumeSolucao) {
  if (!(volumeSolucao > 0)) return null;
  return {
    valor: (volumeSoluto / volumeSolucao) * 100,
    ressalva: "Volumes de líquidos não são aditivos: 50 mL de etanol com 50 mL de água resultam em cerca de 96 mL. Por isso o %v/v se refere ao volume final da solução, medido, e não à soma dos volumes misturados.",
  };
}

/* ---------------- diluição ---------------- */

/* C₁V₁ = C₂V₂ resolvido para o campo que ficou em branco. A identidade vale
   porque diluir não muda a quantidade de matéria do soluto — só espalha a
   mesma quantidade num volume maior. */
function diluicao({ c1, v1, c2, v2 }) {
  const conhecidos = [c1, v1, c2, v2].filter((x) => isFinite(x) && x > 0).length;
  if (conhecidos < 3) {
    return { situacao: "incompleto", mensagem: "Informe três dos quatro valores para achar o quarto." };
  }

  const r = { c1, v1, c2, v2 };
  if (!isFinite(c1) || c1 <= 0) r.c1 = (c2 * v2) / v1;
  else if (!isFinite(v1) || v1 <= 0) r.v1 = (c2 * v2) / c1;
  else if (!isFinite(c2) || c2 <= 0) r.c2 = (c1 * v1) / v2;
  else r.v2 = (c1 * v1) / c2;

  const fator = r.c1 / r.c2;
  const aguaAdicionada = r.v2 - r.v1;

  const avisos = [];
  if (aguaAdicionada < 0) {
    avisos.push("O volume final ficou menor que o inicial: isso é concentrar, não diluir, e não se faz adicionando solvente.");
  }
  if (fator > 1000) {
    avisos.push(`Diluir ${formatarNumero(fator, 3)} vezes de uma só vez exige medir um volume minúsculo com precisão impossível. Faça em etapas, por exemplo duas diluições de 1:100.`);
  }
  if (isFinite(r.v1) && r.v1 < 0.5 && r.v1 > 0) {
    avisos.push("O volume a pipetar é menor que 0,5 mL. Use micropipeta ou parta de uma solução intermediária mais diluída.");
  }

  return {
    situacao: "ok", ...r, fator, aguaAdicionada, avisos,
    quantidadeDeMateria: r.c1 * (r.v1 / 1000),
  };
}

/* ---------------- mistura de soluções ---------------- */

/* Duas soluções do mesmo soluto. A quantidade de matéria total é a soma das
   partes; o volume final é a soma dos volumes, com a mesma ressalva de
   aditividade que vale para qualquer líquido. */
function misturar(partes) {
  const validas = partes.filter((p) => isFinite(p.c) && isFinite(p.v) && p.v > 0);
  if (validas.length < 2) {
    return { situacao: "incompleto", mensagem: "Informe concentração e volume de pelo menos duas soluções." };
  }

  let mols = 0, volume = 0;
  for (const p of validas) {
    mols += p.c * (p.v / 1000);
    volume += p.v;
  }
  const cFinal = mols / (volume / 1000);

  return {
    situacao: "ok", partes: validas, mols, volume, cFinal,
    ressalva: "O volume final é a soma dos volumes, o que só vale aproximadamente: volumes de líquidos não são estritamente aditivos. Para trabalho exato, complete em balão volumétrico.",
  };
}
