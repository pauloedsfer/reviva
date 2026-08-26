/* MOLBOX — calculadora de bancada.

   Avalia a expressão digitada sem usar eval: um analisador léxico monta a
   lista de símbolos, o algoritmo do pátio de manobras converte para notação
   polonesa reversa e uma pilha calcula o resultado. Usar eval aqui abriria a
   porta para executar qualquer coisa que caísse no campo de texto.

   Entende as constantes que aparecem o tempo todo em estequiometria:
     NA   constante de Avogadro
     VM   volume molar nas condições escolhidas (definido pela interface)
*/

const CONSTANTES_CALC = {
  NA: CONSTANTES.AVOGADRO,
  N: CONSTANTES.AVOGADRO,
  VM: 22.4,
};

class ErroDeCalculo extends Error {}

function tokenizar(entrada) {
  const texto = normalizarPotencia(entrada).replace(/,/g, ".");
  const tokens = [];
  let i = 0;

  while (i < texto.length) {
    const ch = texto[i];

    if (/\s/.test(ch)) { i++; continue; }

    if (/[0-9.]/.test(ch)) {
      let n = "";
      while (i < texto.length && /[0-9.]/.test(texto[i])) n += texto[i++];
      // expoente colado ao número, vindo de 6.02e23
      if (i < texto.length && /[eE]/.test(texto[i]) && /[0-9+-]/.test(texto[i + 1] || "")) {
        n += texto[i++];
        if (/[+-]/.test(texto[i])) n += texto[i++];
        while (i < texto.length && /[0-9]/.test(texto[i])) n += texto[i++];
      }
      const valor = parseFloat(n);
      if (!isFinite(valor)) throw new ErroDeCalculo(`Não consegui ler o número "${n}".`);
      tokens.push({ tipo: "numero", valor });
      continue;
    }

    if (/[A-Za-z]/.test(ch)) {
      let nome = "";
      while (i < texto.length && /[A-Za-z]/.test(texto[i])) nome += texto[i++];
      const chave = nome.toUpperCase();
      if (!(chave in CONSTANTES_CALC)) {
        throw new ErroDeCalculo(`Não conheço "${nome}". As constantes disponíveis são NA e VM.`);
      }
      tokens.push({ tipo: "numero", valor: CONSTANTES_CALC[chave] });
      continue;
    }

    if ("+-*/^×÷·".includes(ch)) {
      const normalizado = ch === "×" ? "*" : ch === "÷" ? "/" : ch === "·" ? "*" : ch;
      tokens.push({ tipo: "operador", valor: normalizado });
      i++;
      continue;
    }

    if (ch === "(" || ch === ")") { tokens.push({ tipo: "parentese", valor: ch }); i++; continue; }

    throw new ErroDeCalculo(`O caractere "${ch}" não pertence a uma conta.`);
  }

  return tokens;
}

/* O menos unário fica entre a multiplicação e a potência, como na convenção
   matemática: liga mais forte que "*" para que 2*-3 dê -6, e mais fraco que
   "^" para que -2^2 dê -4, que é o valor correto de menos dois ao quadrado. */
const PRECEDENCIA = { "+": 1, "-": 1, "*": 2, "/": 2, neg: 2.5, "^": 3 };
const DIREITA = { "^": true, neg: true };

function paraRPN(tokens) {
  const saida = [];
  const pilha = [];
  let anterior = null;

  for (const t of tokens) {
    if (t.tipo === "numero") {
      if (anterior && anterior.tipo === "numero") {
        throw new ErroDeCalculo("Faltou uma operação entre dois números.");
      }
      saida.push(t); anterior = t; continue;
    }

    if (t.tipo === "operador") {
      const unario = (t.valor === "-" || t.valor === "+") &&
        (anterior === null || anterior.tipo === "operador" || anterior.tipo === "unario" ||
         (anterior.tipo === "parentese" && anterior.valor === "("));

      const atual = unario
        ? { tipo: "unario", valor: t.valor === "-" ? "neg" : "mais" }
        : t;
      const chaveAtual = atual.tipo === "unario" ? "neg" : atual.valor;

      while (pilha.length) {
        const topo = pilha[pilha.length - 1];
        if (topo.tipo !== "operador" && topo.tipo !== "unario") break;
        const chaveTopo = topo.tipo === "unario" ? "neg" : topo.valor;
        const maior = PRECEDENCIA[chaveTopo] > PRECEDENCIA[chaveAtual];
        const igualEsquerda = PRECEDENCIA[chaveTopo] === PRECEDENCIA[chaveAtual] && !DIREITA[chaveAtual];
        if (maior || igualEsquerda) saida.push(pilha.pop());
        else break;
      }
      pilha.push(atual);
      anterior = atual;
      continue;
    }

    if (t.valor === "(") { pilha.push(t); anterior = t; continue; }

    let achouAbertura = false;
    while (pilha.length) {
      const topo = pilha.pop();
      if (topo.tipo === "parentese" && topo.valor === "(") { achouAbertura = true; break; }
      saida.push(topo);
    }
    if (!achouAbertura) throw new ErroDeCalculo("Há um parêntese fechado sem o de abertura.");
    anterior = t;
  }

  while (pilha.length) {
    const topo = pilha.pop();
    if (topo.tipo === "parentese") throw new ErroDeCalculo("Falta fechar um parêntese.");
    saida.push(topo);
  }
  return saida;
}

function avaliarRPN(rpn) {
  const pilha = [];
  for (const t of rpn) {
    if (t.tipo === "numero") { pilha.push(t.valor); continue; }

    if (t.tipo === "unario") {
      const x = pilha.pop();
      if (x === undefined) throw new ErroDeCalculo("Falta o número depois do sinal.");
      pilha.push(t.valor === "neg" ? -x : x);
      continue;
    }

    const b = pilha.pop();
    const a = pilha.pop();
    if (a === undefined || b === undefined) throw new ErroDeCalculo("A conta está incompleta.");
    let r;
    switch (t.valor) {
      case "+": r = a + b; break;
      case "-": r = a - b; break;
      case "*": r = a * b; break;
      case "/":
        if (b === 0) throw new ErroDeCalculo("Divisão por zero.");
        r = a / b; break;
      case "^": r = Math.pow(a, b); break;
      default: throw new ErroDeCalculo("Operação desconhecida.");
    }
    if (!isFinite(r)) throw new ErroDeCalculo("O resultado saiu da faixa que dá para representar.");
    pilha.push(r);
  }
  if (pilha.length !== 1) throw new ErroDeCalculo("Sobrou número sem operação. Confira a conta.");
  return pilha[0];
}

function calcular(expressao) {
  const bruto = String(expressao).trim();
  if (!bruto) return null;
  const tokens = tokenizar(bruto);
  if (!tokens.length) return null;
  return avaliarRPN(paraRPN(tokens));
}
