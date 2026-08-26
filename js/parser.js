/* MOLBOX — analisador de fórmulas químicas.
   Reconhece: elementos, índices, parênteses e colchetes aninhados,
   hidratos (CuSO4·5H2O), coeficiente à frente e carga do íon.

   A gramática implementada:
     formula   := coef? segmento ( separador coef? segmento )*
     segmento  := grupo+ carga?
     grupo     := ( elemento | '(' segmento ')' | '[' segmento ']' ) indice?
     elemento  := MAIÚSCULA minúscula*
     indice    := dígitos
   Separadores de hidrato aceitos: · . * ·
*/

const SUBSCRITOS = { "₀":"0","₁":"1","₂":"2","₃":"3","₄":"4","₅":"5","₆":"6","₇":"7","₈":"8","₉":"9" };
const SOBRESCRITOS = { "⁰":"0","¹":"1","²":"2","³":"3","⁴":"4","⁵":"5","⁶":"6","⁷":"7","⁸":"8","⁹":"9","⁺":"+","⁻":"-" };
const SEPARADORES = "·.*•";

class ErroDeFormula extends Error {
  constructor(mensagem, posicao) {
    super(mensagem);
    this.posicao = posicao;
  }
}

function normalizar(entrada) {
  let s = String(entrada).trim();
  let saida = "";
  for (const ch of s) {
    if (SUBSCRITOS[ch]) saida += SUBSCRITOS[ch];
    else if (SOBRESCRITOS[ch]) saida += "^" + SOBRESCRITOS[ch];
    else if (ch === "{" ) saida += "(";
    else if (ch === "}" ) saida += ")";
    else if (ch === " " || ch === "\u00A0") continue;
    else saida += ch;
  }
  return saida.replace(/\^\^/g, "^");
}

/* "Fe2+" e "NH4+" têm a mesma forma e sentidos opostos: no primeiro o 2 é a
   carga, no segundo o 4 é índice e a carga vale +1. Três casos resolvem
   praticamente tudo que se escreve à mão:

     Fe2+   um símbolo só seguido de dígitos  → o dígito é a carga
     SO42-  índice de duas casas antes do sinal → implausível como índice,
            então o último dígito é a carga (SO4 com carga 2-)
     NH4+   um dígito só num poliatômico → é índice, e a carga vale 1

   Quem escrever o circunflexo escapa de toda essa adivinhação. */
function resolverCargaImplicita(texto) {
  if (texto.includes("^")) return texto;
  const m = texto.match(/^(.*?)(\d+)([+-])$/);
  if (!m) return texto;
  const [, corpo, digitos, sinal] = m;

  if (/^[A-Z][a-z]?$/.test(corpo)) return `${corpo}^${digitos}${sinal}`;
  if (digitos.length >= 2) return `${corpo}${digitos.slice(0, -1)}^${digitos.slice(-1)}${sinal}`;
  return `${corpo}${digitos}^${sinal}`;
}

function analisar(entradaBruta) {
  const texto = resolverCargaImplicita(normalizar(entradaBruta));
  if (!texto) throw new ErroDeFormula("Escreva uma fórmula para começar.", 0);

  let i = 0;
  const composicao = Object.create(null);
  let carga = 0;

  const olhar = () => texto[i];
  const fim = () => i >= texto.length;

  function lerInteiro() {
    let n = "";
    while (!fim() && texto[i] >= "0" && texto[i] <= "9") n += texto[i++];
    return n === "" ? null : parseInt(n, 10);
  }

  function acumular(destino, simbolo, quantidade) {
    destino[simbolo] = (destino[simbolo] || 0) + quantidade;
  }

  function fundir(destino, origem, fator) {
    for (const s in origem) acumular(destino, s, origem[s] * fator);
  }

  /* Lê uma sequência de grupos até o fim do texto ou até um fechamento. */
  function lerSegmento(dentroDeParenteses) {
    const local = Object.create(null);
    let leuAlgo = false;

    while (!fim()) {
      const ch = olhar();

      if (ch === ")" || ch === "]") {
        if (!dentroDeParenteses) {
          throw new ErroDeFormula(`Fechamento "${ch}" sem abertura correspondente.`, i);
        }
        break;
      }
      if (SEPARADORES.includes(ch) || ch === "^" || ch === "+" || ch === "-") break;

      if (ch === "(" || ch === "[") {
        const fechaEsperado = ch === "(" ? ")" : "]";
        const posAbertura = i;
        i++;
        const interno = lerSegmento(true);
        if (fim() || olhar() !== fechaEsperado) {
          throw new ErroDeFormula(`Falta fechar "${ch}" aberto aqui.`, posAbertura);
        }
        i++;
        const indice = lerInteiro();
        if (indice === 0) throw new ErroDeFormula("Índice zero não faz sentido numa fórmula.", i - 1);
        if (Object.keys(interno).length === 0) {
          throw new ErroDeFormula("Grupo vazio entre parênteses.", posAbertura);
        }
        fundir(local, interno, indice === null ? 1 : indice);
        leuAlgo = true;
        continue;
      }

      if (ch >= "A" && ch <= "Z") {
        let simbolo = texto[i++];
        while (!fim() && olhar() >= "a" && olhar() <= "z") simbolo += texto[i++];
        if (!POR_SIMBOLO[simbolo]) {
          // tenta separar um símbolo válido de duas letras em dois de uma
          const primeira = simbolo[0];
          if (simbolo.length === 2 && POR_SIMBOLO[primeira]) {
            throw new ErroDeFormula(
              `Não existe o elemento "${simbolo}". Você quis dizer "${primeira}" seguido de outra coisa? Lembre que a segunda letra de um símbolo é sempre minúscula.`,
              i - simbolo.length
            );
          }
          throw new ErroDeFormula(`Não existe o elemento "${simbolo}".`, i - simbolo.length);
        }
        const indice = lerInteiro();
        if (indice === 0) throw new ErroDeFormula("Índice zero não faz sentido numa fórmula.", i - 1);
        acumular(local, simbolo, indice === null ? 1 : indice);
        leuAlgo = true;
        continue;
      }

      if (ch >= "a" && ch <= "z") {
        throw new ErroDeFormula(
          `Símbolo de elemento começa com letra maiúscula. Troque "${ch}" por "${ch.toUpperCase()}".`, i
        );
      }
      if (ch >= "0" && ch <= "9") {
        throw new ErroDeFormula("Índice sem elemento à frente dele.", i);
      }
      throw new ErroDeFormula(`O caractere "${ch}" não pertence a uma fórmula.`, i);
    }

    if (!leuAlgo && !dentroDeParenteses) {
      throw new ErroDeFormula("Não encontrei nenhum elemento aqui.", i);
    }
    return local;
  }

  function lerCarga() {
    if (fim()) return;
    // aceita SO4^2-, SO4 2-, Cl-, Na+, Ca2+ e também a ordem invertida Cl-1
    if (olhar() === "^") i++;
    else if (olhar() !== "+" && olhar() !== "-") return;

    const numeroAntes = lerInteiro();
    if (fim() || (olhar() !== "+" && olhar() !== "-")) {
      throw new ErroDeFormula("A carga precisa terminar com + ou -. Exemplo: SO4^2-", i);
    }
    const sinal = texto[i++] === "+" ? 1 : -1;
    const numeroDepois = lerInteiro();
    const modulo = numeroAntes !== null ? numeroAntes : (numeroDepois !== null ? numeroDepois : 1);
    carga += sinal * modulo;
  }

  // coeficiente global opcional
  let coeficiente = lerInteiro();
  if (coeficiente === 0) throw new ErroDeFormula("Coeficiente zero não descreve nenhuma substância.", 0);
  if (coeficiente === null) coeficiente = 1;

  let primeiro = lerSegmento(false);
  lerCarga();
  fundir(composicao, primeiro, coeficiente);

  const hidratos = [];
  while (!fim() && SEPARADORES.includes(olhar())) {
    i++;
    if (fim()) throw new ErroDeFormula("A fórmula termina num ponto de hidratação sem nada depois dele.", i);
    let n = lerInteiro();
    if (n === 0) throw new ErroDeFormula("Coeficiente zero no hidrato.", i - 1);
    if (n === null) n = 1;
    const parte = lerSegmento(false);
    lerCarga();
    fundir(composicao, parte, n * coeficiente);
    hidratos.push({ coeficiente: n, composicao: parte });
  }

  if (!fim()) throw new ErroDeFormula(`Sobrou "${texto.slice(i)}" no fim da fórmula.`, i);

  return montarResultado(entradaBruta, texto, composicao, carga, coeficiente, hidratos);
}

function montarResultado(original, normalizada, composicao, carga, coeficiente, hidratos) {
  const itens = [];
  let massaMolar = 0;
  let totalAtomos = 0;
  let temIncerta = false;

  for (const simbolo in composicao) {
    const e = POR_SIMBOLO[simbolo];
    const quantidade = composicao[simbolo];
    const contribuicao = e.massa * quantidade;
    massaMolar += contribuicao;
    totalAtomos += quantidade;
    if (e.incerta) temIncerta = true;
    itens.push({
      simbolo, nome: e.nome, z: e.z, massaAtomica: e.massa,
      quantidade, contribuicao, incerta: e.incerta
    });
  }

  itens.sort((a, b) => b.contribuicao - a.contribuicao);
  for (const item of itens) item.percentual = (item.contribuicao / massaMolar) * 100;

  return {
    original, normalizada, composicao, itens,
    massaMolar, totalAtomos, carga, coeficiente, hidratos,
    massaIncerta: temIncerta
  };
}

/* Escreve a fórmula com índices em subscrito, para exibição. */
function formatarFormula(texto) {
  const digitosSub = "₀₁₂₃₄₅₆₇₈₉";
  let saida = "";
  let i = 0;
  let s = String(texto);
  if (!s.includes("^")) s = s.replace(/(\d*)([+-])\s*$/, (m, d, sg) => "^" + (d || "") + sg);
  while (i < s.length) {
    const ch = s[i];
    if (ch >= "0" && ch <= "9") {
      // dígito no início da fórmula ou logo após separador é coeficiente: mantém tamanho normal
      const anterior = saida.replace(/<[^>]*>/g, "").slice(-1);
      const ehCoeficiente = anterior === "" || SEPARADORES.includes(anterior);
      let numero = "";
      while (i < s.length && s[i] >= "0" && s[i] <= "9") numero += s[i++];
      saida += ehCoeficiente ? numero : [...numero].map(d => digitosSub[+d]).join("");
      continue;
    }
    if (ch === "^") {
      i++;
      let carga = "";
      while (i < s.length && /[0-9+\-]/.test(s[i])) carga += s[i++];
      saida += `<sup>${carga}</sup>`;
      continue;
    }
    saida += ch;
    i++;
  }
  return saida;
}
