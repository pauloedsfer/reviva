/* MOLBOX — estequiometria a partir da equação balanceada.

   A ideia que organiza tudo é a extensão da reação: um único número que diz
   quantas "vezes" a equação aconteceu. Cada substância entra ou sai na
   proporção do seu coeficiente vezes essa extensão.

   O reagente limitante não é o que tem menos massa nem o que tem menos mols:
   é o que tem a menor razão entre mols disponíveis e coeficiente. Essa
   distinção é a origem de metade dos erros de estequiometria, e é por isso que
   a razão aparece na tela ao lado de cada reagente.
*/

/* Converte a entrada do usuário para mols, considerando a pureza informada.
   `unidade` é "g" ou "mol"; a pureza só faz sentido quando a entrada é massa. */
function entradaParaMols(valor, unidade, massaMolar, purezaPorcento) {
  if (!isFinite(valor)) return null;
  if (unidade === "mol") return valor;
  const pureza = isFinite(purezaPorcento) ? purezaPorcento : 100;
  const massaUtil = valor * (pureza / 100);
  return massaUtil / massaMolar;
}

/* Recebe a equação balanceada e um mapa {índice da espécie: mols disponíveis}
   dos reagentes conhecidos. Devolve a extensão, o limitante e o destino de
   cada substância. */
function calcularEstequiometria(balanceada, molsPorIndice) {
  const reagentes = balanceada.reagentes;
  const produtos = balanceada.produtos;

  const razoes = [];
  for (let i = 0; i < reagentes.length; i++) {
    const mols = molsPorIndice[i];
    if (mols === null || mols === undefined || !isFinite(mols)) continue;
    razoes.push({ indice: i, mols, coeficiente: reagentes[i].coeficiente, razao: mols / reagentes[i].coeficiente });
  }

  if (!razoes.length) {
    return { situacao: "sem-dados", mensagem: "Informe a quantidade de pelo menos um reagente." };
  }

  const menor = razoes.reduce((a, b) => (b.razao < a.razao ? b : a));
  const extensao = menor.razao;

  // empate real dentro da precisão de leitura: proporção estequiométrica exata
  const empatados = razoes.filter(r => Math.abs(r.razao - extensao) / (extensao || 1) < 1e-9);
  const proporcaoExata = empatados.length === razoes.length && razoes.length > 1;

  const linhas = [];

  for (let i = 0; i < reagentes.length; i++) {
    const e = reagentes[i];
    const conhecido = razoes.find(r => r.indice === i);
    const consumido = e.coeficiente * extensao;
    linhas.push({
      papel: "reagente", indice: i, especie: e,
      inicialMols: conhecido ? conhecido.mols : null,
      inicialMassa: conhecido ? conhecido.mols * e.analise.massaMolar : null,
      razao: conhecido ? conhecido.razao : null,
      consumidoMols: consumido,
      consumidoMassa: consumido * e.analise.massaMolar,
      restanteMols: conhecido ? conhecido.mols - consumido : null,
      restanteMassa: conhecido ? (conhecido.mols - consumido) * e.analise.massaMolar : null,
      limitante: conhecido ? conhecido.indice === menor.indice : false,
      emFalta: !conhecido,
    });
  }

  for (let i = 0; i < produtos.length; i++) {
    const e = produtos[i];
    const formado = e.coeficiente * extensao;
    linhas.push({
      papel: "produto", indice: reagentes.length + i, especie: e,
      formadoMols: formado,
      formadoMassa: formado * e.analise.massaMolar,
    });
  }

  return {
    situacao: "ok",
    extensao,
    limitanteIndice: menor.indice,
    limitante: reagentes[menor.indice],
    proporcaoExata,
    razoes,
    linhas,
  };
}

/* Rendimento percentual: o que saiu da bancada dividido pelo que a equação
   prometia. Acima de 100% quase sempre significa produto ainda úmido ou
   impuro, não um milagre. */
function calcularRendimento(massaObtida, massaTeorica) {
  if (!isFinite(massaObtida) || !(massaTeorica > 0)) return null;
  const percentual = (massaObtida / massaTeorica) * 100;
  let observacao = null;
  if (percentual > 100) {
    observacao = "Rendimento acima de 100% não existe na prática. Em geral o produto ainda está úmido, ou veio junto com impureza, ou a pesagem incluiu o papel de filtro.";
  } else if (percentual < 40) {
    observacao = "Rendimento baixo. Vale investigar perdas na transferência, reação incompleta ou produto que ficou na água-mãe.";
  }
  return { percentual, observacao };
}
