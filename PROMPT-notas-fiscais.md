# Prompt para lançar notas fiscais — Hospital Reviva

Use quando chegar uma nota fiscal (DANFE). **Abra uma conversa nova** e anexe:

1. **A DANFE** — foto, PDF ou XML. Fotos de todas as páginas, legíveis.
2. **O Pedido de Compra do sistema** — na cotação, botão de imprimir pedidos,
   salvo em PDF. Ele cumpre dois papéis: traz os **nomes oficiais** dos itens
   (dispensando a lista à parte) e permite **conferir o que foi entregue
   contra o que foi pedido**.

Se por algum motivo não houver pedido no sistema (compra avulsa, drogaria),
anexe no lugar dele a planilha da cotação (**Cotação → ⬇ Exportar Excel**),
cuja coluna “Item” traz os nomes oficiais.

Depois cole o prompt abaixo.

---

## Modelo e esforço recomendados

| Situação | Modelo | Raciocínio estendido |
|---|---|---|
| DANFE em foto (o caso normal) | **Claude Opus 5** | **Ligado** |
| XML da NF-e ou PDF nativo | Claude Sonnet 5 | Ligado |
| Foto ruim, torta ou com reflexo | **Claude Opus 5** | **Ligado** |

**Por quê:** a leitura de lote e validade em foto é o ponto frágil — um dígito
errado no lote quebra a rastreabilidade e um erro na validade pode fazer um
medicamento vencido parecer válido. Some-se a isso a conversão de caixa para
unidade, que exige entender a descrição do produto (“CPR C/500” = 500
comprimidos por caixa). Não use modelo econômico.

---

## O PROMPT (copie daqui para baixo)

```
Você vai me ajudar a lançar uma nota fiscal de medicamentos no sistema da
farmácia do Hospital Reviva. Sou o farmacêutico responsável técnico.

ANEXOS
- DANFE da nota fiscal (todas as páginas).
- Pedido de Compra emitido pelo meu sistema (nomes oficiais dos itens e o
  que foi solicitado). Se eu anexar uma planilha de cotação no lugar, use a
  coluna "Item" como fonte dos nomes e pule a seção de conferência do pedido.

REGRA CENTRAL
Os nomes dos itens devem sair EXATAMENTE como estão na minha lista. Nunca
invente, abrevie ou reescreva. Produto da nota que não corresponder a nenhum
item da minha lista NÃO entra no bloco — vai para as divergências.

CORRESPONDÊNCIA
Só corresponda quando princípio ativo E concentração forem equivalentes.
- Nome comercial vale pelo princípio ativo (Cinetol = biperideno,
  Bilyt = carbonato de lítio, Unihaloper = haloperidol, Narcan = naloxona,
  Pamergan = prometazina, Zilepam = clonazepam, Clorpromaz = clorpromazina).
- Concentrações equivalentes: "10MG/2ML" = "5MG/ML"; "50MG/2ML" = "25MG/ML".
- NÃO correspondem: forma diferente (comprimido x injetável x gotas),
  liberação diferente (CR, XR) quando meu item é convencional, concentração
  diferente. Nesses casos, mande para as divergências e explique.

CONVERSÃO DE CAIXA PARA UNIDADE (o ponto mais importante)
A nota traz caixas; meu estoque trabalha em unidades (comprimidos, ampolas,
frascos). Para cada item extraia:
- CAIXAS = a coluna QUANT. da nota.
- UNID_POR_CAIXA = quantas unidades vêm na caixa, lido da descrição do
  produto ("CPR C/500" = 500, "INJ C/50" = 50, "C/25 C1" = 25, "20ML" de um
  frasco isolado = 1 frasco).
- VALOR_TOTAL_ITEM = a coluna VALOR TOTAL daquele item.
Não calcule o custo unitário: o sistema faz isso.

LOTE E VALIDADE
Copie o lote exatamente como impresso, respeitando letras e números. Se algum
caractere estiver ilegível na foto, NÃO adivinhe: escreva o lote como
conseguir ler e liste o item nas divergências pedindo conferência.

O QUE ENTREGAR

1) BLOCO PARA IMPORTAR — dentro de um bloco de código, sem texto em volta.
   Primeira linha, dados da nota:

   NF;NUMERO;SERIE;DD/MM/AAAA;NOME DO FORNECEDOR;VALOR TOTAL DA NOTA

   Depois, uma linha por item:

   ITEM;NOME EXATO DO ITEM;CAIXAS;UNID_POR_CAIXA;LOTE;VALIDADE;VALOR_TOTAL_ITEM

   Use ponto como separador decimal e datas em DD/MM/AAAA.

2) DIVERGÊNCIAS — produtos da nota que não entraram, com o motivo, e itens
   cujo lote ou validade ficaram duvidosos na leitura.

3) CONFERÊNCIA DA ENTREGA (pedido x nota) — compare item a item o Pedido de
   Compra com a nota fiscal e organize em três listas:
   - ENTREGUE CONFORME: itens do pedido que vieram na quantidade e no preço
     pedidos.
   - DIVERGENTE: itens que vieram em quantidade diferente, preço diferente do
     pedido, ou em apresentação/embalagem diferente da cotada. Diga o que foi
     pedido e o que veio.
   - NÃO ENTREGUE: itens do pedido que não constam da nota, com o valor de
     cada um e o total que deixou de vir.
   Feche com a aritmética: total do pedido, total da nota e a diferença,
   verificando se a diferença equivale exatamente aos itens não entregues.
   Se não fechar, aponte — sobra ou falta indica erro de leitura ou cobrança
   indevida.
   Liste também itens que vieram na nota mas NÃO constavam do pedido.

4) CONFERÊNCIA DE LEITURA — soma dos valores dos itens que você extraiu e o
   total impresso na nota. Informe quantos produtos a nota tem e quantos
   entraram no bloco.

5) ALERTAS — itens com validade curta (12 meses ou menos) e itens sujeitos a
   controle especial identificados na nota (marcados com *** ou C1/B1).
   Sinalize especialmente se algum item **não entregue** for controlado, pois
   pode indicar exigência documental pendente com o fornecedor, e não falta
   de estoque.
```

---

## Depois de receber a resposta

1. Leia a **conferência da entrega**: é o que diz se o fornecedor cumpriu o
   pedido. Itens não entregues voltam para a próxima cotação ou são cobrados
   do representante.
2. Confira a **aritmética** (total do pedido − total da nota = itens não
   entregues) e leia as **divergências de leitura**.
3. Copie o **bloco para importar**.
4. No sistema: **Notas Fiscais → ⬆ Importar da DANFE** → cole → **Conferir
   antes de gravar** → revise a prévia → **Gravar nota fiscal**.

A prévia mostra, item a item, quantas unidades entrarão em estoque, o lote, a
validade (em vermelho se vencida) e o custo unitário calculado. Compara também
a soma dos itens com o total declarado da nota.

## O que revisar com atenção

O erro que passa despercebido não é o preço — é **lote e validade**, porque
alimentam a rastreabilidade e o controle de vencimento. Confira esses dois
campos contra a nota antes de gravar, principalmente nos itens sob controle
especial. Confira também as **unidades por caixa**: se estiver errada, o
estoque entra com quantidade errada e o custo unitário sai distorcido.
