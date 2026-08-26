/* MOLBOX — balanceamento de equações químicas.

   O método é álgebra linear, não tentativa e erro. Cada elemento vira uma
   equação: a quantidade de átomos que entra tem de ser a que sai. Isso monta
   um sistema homogêneo cujo espaço nulo tem, para uma reação bem posta,
   exatamente uma dimensão — e o vetor que o gera, escalado para os menores
   inteiros positivos, é o conjunto de coeficientes.

   Toda a conta é feita em frações de inteiros grandes (BigInt). Ponto
   flutuante erraria: 1/3 + 1/3 + 1/3 não dá exatamente 1 em binário, e um
   resíduo de 10⁻¹⁶ no lugar errado transforma um pivô nulo em pivô válido e
   estraga o resultado inteiro.
*/

/* ---------------- frações exatas ---------------- */

function mdcGrande(a, b) {
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;
  while (b) { const t = a % b; a = b; b = t; }
  return a;
}

function frac(n, d = 1n) {
  n = BigInt(n); d = BigInt(d);
  if (d === 0n) throw new Error("divisão por zero no balanceamento");
  if (d < 0n) { n = -n; d = -d; }
  const g = mdcGrande(n, d) || 1n;
  return { n: n / g, d: d / g };
}

const fZero = frac(0n);
const fSoma  = (a, b) => frac(a.n * b.d + b.n * a.d, a.d * b.d);
const fSub   = (a, b) => frac(a.n * b.d - b.n * a.d, a.d * b.d);
const fMult  = (a, b) => frac(a.n * b.n, a.d * b.d);
const fDiv   = (a, b) => frac(a.n * b.d, a.d * b.n);
const fZeroQ = (a) => a.n === 0n;

/* ---------------- leitura da equação ---------------- */

const SETAS = ["<=>", "<->", "-->", "->", "=>", "→", "⇌", "⇋", "="];

class ErroDeEquacao extends Error {}

function separarLados(texto) {
  const bruto = String(texto).trim();
  if (!bruto) throw new ErroDeEquacao("Escreva uma equação para balancear.");

  let seta = null;
  for (const s of SETAS) {
    if (bruto.includes(s)) { seta = s; break; }
  }
  if (!seta) {
    throw new ErroDeEquacao("Não encontrei a seta da reação. Separe reagentes e produtos com -> (ou =).");
  }

  const partes = bruto.split(seta);
  if (partes.length !== 2) {
    throw new ErroDeEquacao("A equação tem mais de uma seta. Escreva uma reação por vez.");
  }
  return { esquerda: partes[0], direita: partes[1] };
}

/* O sinal "+" faz dois papéis numa equação iônica: separa substâncias e marca
   a carga de um cátion. Em "Ag+ + Cl- → AgCl" os dois aparecem lado a lado.
   A posição resolve: um "+" precedido de espaço é separador; um "+" colado na
   substância anterior e seguido de espaço ou do fim é carga; colado dos dois
   lados, é separador, como em "H2+O2". */
function dividirTermos(lado) {
  const termos = [];
  let atual = "";
  for (let i = 0; i < lado.length; i++) {
    const ch = lado[i];
    if (ch !== "+") { atual += ch; continue; }

    const anterior = lado[i - 1];
    const seguinte = lado[i + 1];
    const precedidoDeEspaco = anterior === undefined || /\s/.test(anterior);
    const seguidoDeEspacoOuFim = seguinte === undefined || /\s/.test(seguinte);

    if (!precedidoDeEspaco && seguidoDeEspacoOuFim) { atual += ch; continue; }

    termos.push(atual);
    atual = "";
  }
  termos.push(atual);
  return termos.map(t => t.trim()).filter(t => t !== "");
}

function lerTermos(lado, rotulo) {
  const pedacos = dividirTermos(lado);
  if (!pedacos.length) throw new ErroDeEquacao(`Não há nenhuma substância ${rotulo}.`);

  return pedacos.map(p => {
    // um coeficiente já escrito pelo usuário é descartado: quem decide é o método
    const semCoeficiente = p.replace(/^\s*\d+\s*(?=[A-Z(\[])/, "");
    let analise;
    try {
      analise = analisar(semCoeficiente);
    } catch (e) {
      throw new ErroDeEquacao(`Em "${p.trim()}": ${e.message}`);
    }
    return { formula: semCoeficiente.trim(), analise, vista: formatarFormula(analise.normalizada) };
  });
}

/* ---------------- espaço nulo ---------------- */

/* Reduz a matriz à forma escalonada por linhas e devolve as colunas-pivô. */
function escalonar(M, linhas, colunas) {
  const pivos = [];
  let linha = 0;

  for (let col = 0; col < colunas && linha < linhas; col++) {
    let escolhida = -1;
    for (let i = linha; i < linhas; i++) {
      if (!fZeroQ(M[i][col])) { escolhida = i; break; }
    }
    if (escolhida === -1) continue;

    [M[linha], M[escolhida]] = [M[escolhida], M[linha]];

    const p = M[linha][col];
    for (let j = 0; j < colunas; j++) M[linha][j] = fDiv(M[linha][j], p);

    for (let i = 0; i < linhas; i++) {
      if (i === linha || fZeroQ(M[i][col])) continue;
      const fator = M[i][col];
      for (let j = 0; j < colunas; j++) {
        M[i][j] = fSub(M[i][j], fMult(fator, M[linha][j]));
      }
    }
    pivos.push(col);
    linha++;
  }
  return pivos;
}

function mmcGrande(a, b) { return (a / mdcGrande(a, b)) * b; }

/* ---------------- balanceamento ---------------- */

function balancear(texto) {
  const { esquerda, direita } = separarLados(texto);
  const reagentes = lerTermos(esquerda, "antes da seta");
  const produtos = lerTermos(direita, "depois da seta");
  const especies = [...reagentes, ...produtos];

  if (especies.length < 2) {
    throw new ErroDeEquacao("Uma reação precisa de pelo menos duas substâncias.");
  }
  if (especies.length > 12) {
    throw new ErroDeEquacao("São substâncias demais para uma equação só. Divida a reação em etapas.");
  }

  // conjunto de elementos envolvidos, na ordem em que aparecem
  const elementos = [];
  for (const e of especies) {
    for (const s in e.analise.composicao) if (!elementos.includes(s)) elementos.push(s);
  }

  // um elemento que só existe de um lado torna a reação impossível
  for (const el of elementos) {
    const naEsquerda = reagentes.some(e => e.analise.composicao[el]);
    const naDireita = produtos.some(e => e.analise.composicao[el]);
    if (!naEsquerda || !naDireita) {
      throw new ErroDeEquacao(
        `O elemento ${el} aparece só ${naEsquerda ? "entre os reagentes" : "entre os produtos"}. ` +
        `Átomo não some nem surge do nada — falta uma substância na equação.`
      );
    }
  }

  const usaCarga = especies.some(e => e.analise.carga !== 0);
  const nLinhas = elementos.length + (usaCarga ? 1 : 0);
  const nCol = especies.length;

  const M = [];
  for (let i = 0; i < elementos.length; i++) {
    const linha = [];
    for (let j = 0; j < nCol; j++) {
      const q = especies[j].analise.composicao[elementos[i]] || 0;
      linha.push(frac(BigInt(j < reagentes.length ? q : -q)));
    }
    M.push(linha);
  }
  if (usaCarga) {
    const linha = [];
    for (let j = 0; j < nCol; j++) {
      const c = especies[j].analise.carga;
      linha.push(frac(BigInt(j < reagentes.length ? c : -c)));
    }
    M.push(linha);
  }

  const pivos = escalonar(M, nLinhas, nCol);
  const livres = [];
  for (let c = 0; c < nCol; c++) if (!pivos.includes(c)) livres.push(c);

  if (livres.length === 0) {
    throw new ErroDeEquacao("Só a solução trivial existe: essa equação não fecha com nenhum conjunto de coeficientes.");
  }
  if (livres.length > 1) {
    throw new ErroDeEquacao(
      "Esta equação admite mais de um balanceamento independente — normalmente é sinal de que há duas reações misturadas, " +
      "ou de que falta uma substância. Separe em reações distintas."
    );
  }

  // a variável livre vale 1; as demais saem da forma escalonada
  const livre = livres[0];
  const solucao = new Array(nCol).fill(null).map(() => fZero);
  solucao[livre] = frac(1n);
  for (let i = 0; i < pivos.length; i++) {
    solucao[pivos[i]] = fSub(fZero, M[i][livre]);
  }

  // frações para os menores inteiros positivos
  let mmc = 1n;
  for (const f of solucao) mmc = mmcGrande(mmc, f.d);
  let inteiros = solucao.map(f => (f.n * mmc) / f.d);

  let mdc = 0n;
  for (const v of inteiros) mdc = mdcGrande(mdc, v);
  if (mdc > 1n) inteiros = inteiros.map(v => v / mdc);

  if (inteiros.every(v => v < 0n)) inteiros = inteiros.map(v => -v);
  if (inteiros.some(v => v <= 0n)) {
    throw new ErroDeEquacao(
      "O balanceamento exigiria coeficiente zero ou negativo em alguma substância. " +
      "Confira se algum reagente foi escrito do lado dos produtos."
    );
  }

  const coeficientes = inteiros.map(v => Number(v));
  const resultado = {
    reagentes: reagentes.map((e, i) => ({ ...e, coeficiente: coeficientes[i], papel: "reagente" })),
    produtos: produtos.map((e, i) => ({ ...e, coeficiente: coeficientes[reagentes.length + i], papel: "produto" })),
    elementos, usaCarga,
  };
  resultado.especies = [...resultado.reagentes, ...resultado.produtos];
  resultado.conferencia = conferir(resultado);
  resultado.equacaoTexto = escreverEquacao(resultado);
  return resultado;
}

/* Reconta os átomos dos dois lados. Não é enfeite: é a prova de que o
   resultado fecha, e é a tabela que o aluno precisa aprender a montar. */
function conferir(r) {
  const linhas = [];
  for (const el of r.elementos) {
    let antes = 0, depois = 0;
    for (const e of r.reagentes) antes += (e.analise.composicao[el] || 0) * e.coeficiente;
    for (const e of r.produtos) depois += (e.analise.composicao[el] || 0) * e.coeficiente;
    linhas.push({ elemento: el, antes, depois, fecha: antes === depois });
  }
  if (r.usaCarga) {
    let antes = 0, depois = 0;
    for (const e of r.reagentes) antes += e.analise.carga * e.coeficiente;
    for (const e of r.produtos) depois += e.analise.carga * e.coeficiente;
    linhas.push({ elemento: "carga", antes, depois, fecha: antes === depois });
  }
  return linhas;
}

function escreverEquacao(r) {
  const lado = (lista) => lista
    .map(e => (e.coeficiente === 1 ? "" : e.coeficiente + " ") + e.formula)
    .join(" + ");
  return lado(r.reagentes) + " → " + lado(r.produtos);
}

function escreverEquacaoHTML(r) {
  const lado = (lista) => lista
    .map(e => `<span class="termo-eq">${e.coeficiente === 1 ? "" : `<b class="coef">${e.coeficiente}</b>`}${e.vista}</span>`)
    .join(' <span class="op">+</span> ');
  return lado(r.reagentes) + ' <span class="op seta">→</span> ' + lado(r.produtos);
}
