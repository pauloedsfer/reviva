# Prompt para análise de cotações — Hospital Reviva

Use este arquivo toda vez que chegar uma proposta de fornecedor. **Abra uma
conversa nova** (evita que análises anteriores contaminem a nova) e anexe:

1. **A proposta do fornecedor** (PDF, imagem, planilha ou texto colado).
2. **A planilha da cotação exportada do sistema** — na tela Cotação, botão
   **⬇ Exportar Excel**. Isso é essencial: os nomes dos itens precisam vir do
   sistema, não da memória da IA, senão a importação não casa.

Depois cole o prompt abaixo.

---

## Modelo e esforço recomendados

| Situação | Modelo | Raciocínio estendido |
|---|---|---|
| Proposta normal (até ~80 itens) | **Claude Opus 5** | **Ligado** |
| Proposta curta e simples (até ~15 itens, texto limpo) | Claude Sonnet 5 | Ligado |
| Proposta em foto ruim, manuscrita ou com muitas divergências | **Claude Opus 5** | **Ligado** |

**Por que Opus com raciocínio estendido:** o trabalho difícil não é copiar
números, é decidir se *"HALOPERIDOL DECANOATO 50MG 3X1ML"* corresponde ao seu
item *"HALOPERIDOL DECANOATO 70,52MG/ML"* — e não corresponde. Esse tipo de
julgamento farmacêutico erra com modelo mais leve, e um erro aqui entra no
estoque e na escrituração. Não use modelo econômico para esta tarefa.

---

## O PROMPT (copie daqui para baixo)

```
Você vai me ajudar a lançar uma proposta de fornecedor na cotação da farmácia
do Hospital Reviva (clínica de dependência química, Anápolis/GO). Sou o
farmacêutico responsável técnico.

ANEXOS
- Proposta do fornecedor.
- Planilha da cotação exportada do meu sistema (coluna "Item" = nomes oficiais).

REGRA CENTRAL
A coluna "Item" da minha planilha é a ÚNICA fonte dos nomes. Nunca invente,
abrevie ou reescreva um nome de item. Se um produto da proposta não
corresponder exatamente a nenhum item da minha planilha, ele NÃO entra no
arquivo de importação — vai para a lista de divergências.

COMO FAZER A CORRESPONDÊNCIA
Só considere correspondência quando princípio ativo E concentração forem
equivalentes. Atenção aos casos abaixo:
- Concentrações escritas de formas diferentes são equivalentes:
  "10MG/2ML" = "5MG/ML"; "50MG/2ML" = "25MG/ML"; "4%" = "40MG/ML".
- Nome comercial vale pelo princípio ativo: Tegretard = carbamazepina,
  Bilyt = carbonato de lítio, Zilepam = clonazepam, Buscopan/Hioscina simples
  = butilbrometo de escopolamina, Depakene/Epilenil = ácido valproico
  (valproato de sódio), Narcan = naloxona, Uninaltrex = naltrexona.
- NÃO são equivalentes (mande para divergências):
  concentração diferente (decanoato 50mg/ml vs 70,52mg/ml);
  forma farmacêutica diferente (spray vs solução para nebulização;
  comprimido vs injetável); sal diferente quando eu especifiquei o sal
  (ex.: cianocobalamina vs mecobalamina — aponte e pergunte).
- Se houver DUAS opções da proposta para o mesmo item meu, escolha a de menor
  preço unitário e registre a outra nas observações.

COMO CALCULAR
Para cada item correspondido, produza:
- UNID_POR_CAIXA = quantas unidades (comprimidos, ampolas, frascos) o preço
  cobre. Vem do "C/500", "C/30", "x1ML C/100" da descrição, ou da quantidade
  quando o preço é por unidade.
- PRECO_CAIXA = o valor TOTAL correspondente a essas unidades.
Confira sempre: PRECO_CAIXA ÷ UNID_POR_CAIXA deve bater com o preço unitário
impresso na proposta. Se não bater, não invente — relate na divergência.

O QUE ENTREGAR (nesta ordem)

1) BLOCO PARA IMPORTAR — dentro de um bloco de código, uma linha por item,
   exatamente neste formato, sem cabeçalho e sem texto em volta:

   NOME EXATO DO ITEM;UNID_POR_CAIXA;PRECO_CAIXA

   Use ponto como separador decimal. Itens cotados como indisponíveis:
   acrescente ";INDISPONIVEL" no fim da linha.

2) DIVERGÊNCIAS QUE PRECISAM DA MINHA DECISÃO — lista curta, cada uma com o
   produto da proposta, o item meu mais parecido e por que não casou.

3) PRODUTOS DA PROPOSTA QUE NÃO PEDI — o que o fornecedor ofereceu além da
   minha lista (pode me interessar).

4) ITENS MEUS SEM PREÇO NESTA PROPOSTA — para eu cobrar de outro fornecedor.

5) RESUMO COMERCIAL — validade da proposta, condição de pagamento, prazo de
   entrega, faturamento mínimo e frete, se constarem.

6) CONFERÊNCIA — quantos itens da proposta você leu, quantos casaram e a soma
   dos preços, para eu comparar com o total impresso na proposta.

Não escreva SQL. Não altere meus nomes de item. Se ficar em dúvida sobre uma
correspondência, prefira colocá-la nas divergências a arriscar o lançamento.
```

---

## Depois de receber a resposta

1. Confira a seção **6 (conferência)** contra o total impresso na proposta.
2. Leia as **divergências** — é aí que está o seu trabalho de RT.
3. Copie o **bloco para importar**.
4. No sistema: **Cotação → ⬆ Importar preços** → escolha o fornecedor → cole →
   **Conferir antes de gravar** → confira a prévia → **Gravar preços**.
5. Vá em **Comparativo & Pedidos** para ver o vencedor de cada item.

A importação mostra o que casou e o que não casou **antes** de gravar, e
substitui apenas os preços daquele fornecedor naquela cotação — pode reimportar
quantas vezes quiser sem duplicar.

## Se a IA errar

O risco real não é o preço digitado errado (a prévia mostra o unitário, e valor
fora da curva salta aos olhos) — é uma **correspondência errada de produto**,
que entra silenciosamente. Por isso o prompt manda a IA jogar toda dúvida para
as divergências. Ao revisar, dê atenção especial a: injetáveis com
concentração por mL, formas de liberação prolongada (XR, CR), sais diferentes
do mesmo princípio e apresentações em gotas.
