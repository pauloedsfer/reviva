# Como gastar menos tokens neste projeto

O que mais pesa **não é o tamanho do sistema** — é o **tamanho da conversa**.
A cada mensagem, todo o histórico anterior é reprocessado. Numa conversa com
40 trocas, a 40ª pergunta custa quase o histórico inteiro, mesmo que o pedido
seja de uma linha.

Ordenado por impacto real:

---

## 1. Uma conversa por assunto (maior ganho de todos)

Feche a conversa quando a funcionalidade estiver pronta e abra outra para a
próxima. Uma conversa nova bem preparada custa uma fração de uma conversa
longa — a diferença é da ordem de **5 a 10 vezes**, não de 10%.

**Quando fechar:** funcionalidade entregue e testada, ou assunto mudou
(ex.: sai de "cotação" e entra em "prescrição").

**Quando manter aberta:** correção do que acabou de ser entregue, porque o
contexto do que foi feito ainda é necessário.

## 2. Abrir a conversa nova do jeito certo

O `README.md` é a memória do projeto. Com ele e o arquivo da tela, começo
com contexto suficiente sem precisar explorar o sistema.

**Anexe:**
- `README.md` (sempre)
- O arquivo da tela envolvida, quando souber qual — `paginas/cotacao.js`,
  `paginas/dose.js`, etc.
- O `.zip` **só** quando a mudança cruzar várias telas ou você não souber onde
  mexe.

**Modelo de abertura:**

```
Projeto Hospital Reviva — sistema da farmácia (README em anexo).
Stack: HTML/JS estático + Supabase, sem build. Sou o farmacêutico RT.

Arquivo envolvido: paginas/XXXX.js (em anexo)

O QUE PRECISO
<descreva o comportamento desejado em 3-6 linhas>

COMO ESTÁ HOJE
<o que o sistema faz agora, ou o erro que aparece>

Entregue o arquivo alterado e o SQL, se precisar de migração.
```

## 3. Juntar pedidos relacionados numa mensagem só

Três ajustes na mesma tela pedidos de uma vez custam bem menos que três
mensagens separadas — o contexto é lido uma vez em vez de três.

Vale juntar quando é **a mesma tela** ou **o mesmo assunto**. Não vale juntar
coisas distantes (uma da cotação, uma do mapa), porque aí preciso carregar
contexto dos dois de qualquer jeito.

## 4. Escolher o modelo pela tarefa

| Tarefa | Modelo |
|---|---|
| Ajuste de texto, rótulo, cor, ordenação simples | **Sonnet** |
| Extrair dados de PDF/DANFE com o prompt pronto | **Sonnet** |
| Regra nova que mexe em saldo, custódia ou escrituração | **Opus** |
| Bug que você não sabe a causa | **Opus** |
| POP, documento regulatório, decisão técnica | **Opus** |

Regra prática: **se um erro entra no estoque ou na escrituração, use Opus.**
Se o pior caso é um rótulo feio, Sonnet resolve.

## 5. Dizer o que já sabe

Cada busca minha no código custa. Se você já sabe, diga:

- "O problema é no botão X da tela Y"
- "A função chama-se `_selLote`"
- "Isso começou depois da mudança de data limite"
- Cole a **mensagem de erro** do F12 quando houver

Uma linha sua economiza várias buscas minhas.

## 6. Dosar a validação

Rodo testes com dados simulados antes de entregar. Isso pegou erros reais
(dupla contagem de custo, saldo de lote, escopo de variável), mas custa.

Você pode dizer na mensagem:

- **"validação completa"** — mexeu em saldo, custo, custódia ou escrituração
- **"validação leve"** — mudança visual, texto, ordenação
- **"sem teste, só entregue"** — quando for trivial e você mesmo vai conferir

Se não disser nada, uso o critério de risco: completo para o que afeta
estoque e escrituração, leve para o resto.

## 7. Não reenviar o que já está no sistema

- Não precisa mandar o `.zip` a cada mensagem dentro da mesma conversa —
  o estado se mantém.
- Fotos de documento: mande **uma vez**, em boa qualidade. Reenviar as mesmas
  imagens custa caro.
- PDFs longos: se só uma parte importa, diga qual.

## 8. Fechar o ciclo de cada entrega

Ao terminar, peça em uma frase: *"atualize o README e feche"*. Assim o
próximo assunto começa numa conversa nova, com a memória em dia — que é o
que faz o passo 1 funcionar.

---

## Rotina sugerida

1. Abrir conversa nova com README + arquivo da tela
2. Descrever o pedido (ou os 2-3 pedidos da mesma tela) de uma vez
3. Indicar o nível de validação
4. Receber, subir o zip, testar na prática
5. Corrigir na mesma conversa, se necessário
6. Pedir a atualização do README e fechar

## O que eu passo a fazer do meu lado

- Ler trechos direcionados em vez de arquivos inteiros
- Testes menores, focados no que mudou
- Não reimprimir código que você já tem
- Respostas mais curtas quando a entrega for direta
