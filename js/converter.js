/* MOLBOX — a ponte do mol.
   Converte entre massa, quantidade de matéria, número de partículas e volume
   de gás, e registra o caminho percorrido para que o cancelamento de unidades
   apareça na tela. O caminho é o produto; o número é só a consequência. */

const CONSTANTES = {
  AVOGADRO: 6.02214076e23,   // mol⁻¹, valor exato desde a redefinição do SI em 2019
};

const VOLUMES_MOLARES = [
  { id: "cntp",  rotulo: "CNTP — 0 °C e 1 atm",        valor: 22.4,  detalhe: "convenção mais usada no ensino médio brasileiro" },
  { id: "stp",   rotulo: "STP IUPAC — 0 °C e 100 kPa", valor: 22.71, detalhe: "padrão atual da IUPAC" },
  { id: "campo", rotulo: "Ambiente — 25 °C e 1 atm",   valor: 24.45, detalhe: "condição real de bancada" },
];

const GRANDEZAS = {
  massa:      { rotulo: "Massa",                 unidade: "g",         curta: "g" },
  mol:        { rotulo: "Quantidade de matéria", unidade: "mol",       curta: "mol" },
  particulas: { rotulo: "Número de entidades",   unidade: "entidades", curta: "ent." },
  volume:     { rotulo: "Volume de gás",         unidade: "L",         curta: "L" },
};

/* Acessores das tabelas constantes deste módulo. Ver a nota em mol.js: um
   `const` declarado dentro de um eval não escapa para o escopo global, e as
   baterias de teste carregam os módulos assim. */
function constantesFisicas() { return CONSTANTES; }
function volumesMolares() { return VOLUMES_MOLARES; }
function grandezasDoMol() { return GRANDEZAS; }

/* ---------- apresentação de números ---------- */

const SOBRE = { "0":"⁰","1":"¹","2":"²","3":"³","4":"⁴","5":"⁵","6":"⁶","7":"⁷","8":"⁸","9":"⁹","-":"⁻" };

function expoenteBonito(n) {
  return String(n).split("").map(c => SOBRE[c] || c).join("");
}

function separarMilhar(inteiro) {
  return inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
}

/* Formata com o número de algarismos significativos pedido, em notação
   brasileira, escapando para notação científica quando o valor sai da escala
   que uma pessoa consegue ler de relance. */
function formatarNumero(x, significativos = 4) {
  if (!isFinite(x)) return "—";
  if (x === 0) return "0";

  // Arredonda primeiro. Isso importa: 9,999 com 2 algarismos vira 10, e o
  // expoente muda de 0 para 1 no caminho. Calcular as casas decimais antes do
  // arredondamento produziria "10,0", que declara três algarismos.
  let expoente = Math.floor(Math.log10(Math.abs(x)));
  const fator = Math.pow(10, significativos - 1 - expoente);
  const valor = Math.round(x * fator) / fator;
  expoente = Math.floor(Math.log10(Math.abs(valor)));

  if (expoente >= 6 || expoente <= -4) {
    const mantissa = valor / Math.pow(10, expoente);
    const m = mantissa.toFixed(Math.max(0, significativos - 1)).replace(".", ",");
    return `${m}×10${expoenteBonito(expoente)}`;
  }

  // os zeros à direita permanecem: em química eles não são enfeite,
  // são a declaração de quantos algarismos a medida garante
  const casas = Math.max(0, significativos - 1 - expoente);
  const s = valor.toFixed(Math.min(casas, 10));
  const [inteiro, decimal] = s.split(".");
  return separarMilhar(inteiro) + (decimal ? "," + decimal : "");
}

const SUB_PARA_NORMAL = { "⁰":"0","¹":"1","²":"2","³":"3","⁴":"4","⁵":"5","⁶":"6","⁷":"7","⁸":"8","⁹":"9","⁻":"-","⁺":"+" };

/* Ninguém escreve "6,02e23" à mão. As pessoas escrevem 6,02×10²³, 6,02x10^23,
   6,02 . 10^23 ou 10^23 sozinho. Todas essas formas viram a notação que o
   JavaScript entende, antes de qualquer tentativa de leitura. */
function normalizarPotencia(texto) {
  let s = String(texto).trim();

  // expoentes escritos em sobrescrito: 10²³ vira 10^23
  s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]+/g, (m) =>
    "^" + [...m].map((c) => SUB_PARA_NORMAL[c]).join(""));
  s = s.replace(/\^\s*\^/g, "^");

  // multiplicação por dez elevado a algo, em qualquer grafia usual
  s = s.replace(/(?:×|x|X|\*|·|\.)?\s*10\s*\^\s*([+-]?\d+)/g, "e$1");

  // "10^23" no começo, sem mantissa, significa 1×10²³
  if (/^e[+-]?\d+$/.test(s)) s = "1" + s;

  return s.replace(/\s+/g, "");
}

/* Lê número digitado aceitando vírgula, ponto, 6,02e23 e 6,02×10²³ */
function lerNumero(texto) {
  if (texto === null || texto === undefined) return NaN;
  const limpo = normalizarPotencia(texto).replace(",", ".");
  if (limpo === "") return NaN;
  if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(limpo)) return NaN;
  return parseFloat(limpo);
}

/* Conta algarismos significativos do que a pessoa digitou, para que o
   resultado não apareça com mais precisão do que o dado de entrada tinha. */
function contarSignificativos(texto) {
  const limpo = String(texto).trim().replace(",", ".").replace(/[+-]/, "");
  const semExpoente = limpo.split(/[eE]/)[0];
  if (!/\d/.test(semExpoente)) return 4;
  let digitos = semExpoente.replace(".", "");
  digitos = digitos.replace(/^0+/, "");
  if (digitos === "") return 1;
  if (!semExpoente.includes(".")) digitos = digitos.replace(/0+$/, "") || "0";
  const n = digitos.length;
  return Math.min(Math.max(n, 1), 6);
}

/* ---------- conversão ---------- */

/* Cada passo guarda o que entra, o fator aplicado e o que sai, com as
   unidades explícitas dos dois lados da fração. */
function passo(valorEntrada, unidadeEntrada, numero, unidadeNumero, denominador, unidadeDenominador, valorSaida, unidadeSaida, motivo) {
  return { valorEntrada, unidadeEntrada, numero, unidadeNumero, denominador, unidadeDenominador, valorSaida, unidadeSaida, motivo };
}

/* Converte a grandeza informada para mol e devolve o passo correspondente. */
function paraMol(grandeza, valor, massaMolar, volumeMolar) {
  switch (grandeza) {
    case "mol":
      return { mol: valor, passo: null };
    case "massa":
      return {
        mol: valor / massaMolar,
        passo: passo(valor, "g", 1, "mol", massaMolar, "g", valor / massaMolar, "mol",
          "a massa molar diz quantos gramas há em 1 mol; invertida, ela diz quantos mols há em 1 grama")
      };
    case "particulas":
      return {
        mol: valor / CONSTANTES.AVOGADRO,
        passo: passo(valor, "entidades", 1, "mol", CONSTANTES.AVOGADRO, "entidades", valor / CONSTANTES.AVOGADRO, "mol",
          "a constante de Avogadro é o fator de conversão entre contar e medir")
      };
    case "volume":
      return {
        mol: valor / volumeMolar,
        passo: passo(valor, "L", 1, "mol", volumeMolar, "L", valor / volumeMolar, "mol",
          "o volume molar só vale para gases, e só na condição escolhida")
      };
    default:
      throw new Error("grandeza desconhecida: " + grandeza);
  }
}

function deMol(destino, mol, massaMolar, volumeMolar) {
  switch (destino) {
    case "mol":
      return { valor: mol, passo: null };
    case "massa":
      return {
        valor: mol * massaMolar,
        passo: passo(mol, "mol", massaMolar, "g", 1, "mol", mol * massaMolar, "g",
          "cada mol pesa a massa molar")
      };
    case "particulas":
      return {
        valor: mol * CONSTANTES.AVOGADRO,
        passo: passo(mol, "mol", CONSTANTES.AVOGADRO, "entidades", 1, "mol", mol * CONSTANTES.AVOGADRO, "entidades",
          "cada mol contém a constante de Avogadro de entidades")
      };
    case "volume":
      return {
        valor: mol * volumeMolar,
        passo: passo(mol, "mol", volumeMolar, "L", 1, "mol", mol * volumeMolar, "L",
          "cada mol de gás ocupa o volume molar da condição escolhida")
      };
    default:
      throw new Error("grandeza desconhecida: " + destino);
  }
}

/* Converte de uma grandeza para todas as outras, devolvendo os valores e,
   para cada destino, o caminho completo passando pelo mol. */
function converter({ origem, valor, massaMolar, volumeMolar }) {
  if (!isFinite(valor)) throw new Error("Valor inválido.");
  if (!(massaMolar > 0)) throw new Error("Massa molar inválida.");

  const entrada = paraMol(origem, valor, massaMolar, volumeMolar);
  const valores = {};
  const caminhos = {};

  for (const destino of Object.keys(GRANDEZAS)) {
    const saida = deMol(destino, entrada.mol, massaMolar, volumeMolar);
    valores[destino] = saida.valor;
    const passos = [];
    if (entrada.passo) passos.push(entrada.passo);
    if (saida.passo) passos.push(saida.passo);
    caminhos[destino] = passos;
  }

  valores.mol = entrada.mol;
  return { mol: entrada.mol, valores, caminhos };
}
