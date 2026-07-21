# Hospital Reviva — Sistema conectado ao banco

O sistema lê e grava no seu banco Supabase, tem **login**, **cadastro do RT como dado**, **lançamentos pelas telas**, **dispensação com baixa de estoque**, **ajuste de inventário** e **impressão do Livro de Registro e do BMPO** para fiscalização.

## ⚠ Antes de usar o Ajuste de Estoque: rodar a migração (uma vez)

O recurso de **Ajuste de Estoque / Inventário** depende de uma tabela nova. Rode o arquivo **`migration_ajustes.sql`** uma única vez no **SQL Editor** do Supabase (New query → cola → Run). É aditivo e seguro: não apaga nada, só cria a tabela `ajustes_estoque` e estende as views. Se você abrir a tela de Ajustes antes de rodar, o resto do sistema continua funcionando normalmente — só os ajustes não aparecem. Siga os passos abaixo uma única vez.


## ⚠ Prescrições externas: rodar a migração (uma vez)

Para marcar prescritores como **interno/externo** (prescrições que o paciente traz de médicos de fora), rode **`migration_prescritor_externo.sql`** uma vez no SQL Editor. Aditivo e seguro. Depois disso, ao criar um prescritor pelo botão "+ Novo prescritor", você escolhe o **vínculo**, e prescrições de médicos externos aparecem com a tag EXTERNO.


## ⚠ Cotação de compras: rodar a migração (uma vez)

Para o módulo de **Cotação** (menu Suprimentos), rode **`migration_cotacao.sql`** uma vez no SQL Editor. Aditivo e seguro. Você cria uma cotação, adiciona itens (de substâncias cadastradas ou digitados livres) e **imprime a solicitação** no formato para o fornecedor preencher. Quando os preços voltarem, use a aba **Lançar preços** (por fornecedor: unid./caixa, preço/caixa, validade, indisponível) e a aba **Comparativo & Pedidos**: o sistema compara por **preço unitário**, destaca o vencedor de cada item e gera **pedidos por fornecedor** imprimíveis (caixas arredondadas para cima, totais por pedido).


## ⚠ Alta de paciente: rodar a migração (uma vez)

Para o fluxo de **alta** (custódia aguardando retirada, devolução à família com Termo, integração ao estoque, arquivo e Extrato de Alta), rode **`migration_alta.sql`** uma vez no SQL Editor. Aditivo e seguro.

Como funciona: na tela **Pacientes**, o botão **Dar alta** encerra as prescrições, grava a data, libera o leito e move o paciente para a aba **Arquivo (altas)** — nada é apagado. A custódia com saldo fica **aguardando retirada**; depois, na tela **Medicação do Paciente**, você decide item a item: **Devolver à família** (imprime o Termo de Devolução) ou **Integrar ao estoque** (passa a contar no estoque geral e no BMPO). Na dispensação, o lote padrão é o de **custódia do próprio paciente** (★); custódia de outros pacientes nunca aparece; estoque geral é escolha manual. O **Extrato de Alta** sai em duas versões: com valores (diretoria) ou sem valores (família), reimprimível a qualquer momento no Arquivo.

## 1. Conectar ao seu banco

Abra `assets/config.js` e cole os dois valores do seu projeto Supabase:

- No painel do Supabase: **Settings → Data API** (ou **API**).
- Copie **Project URL** → cole em `SUPABASE_URL`.
- Copie **anon public** → cole em `SUPABASE_ANON_KEY`.

A chave `anon` é segura no arquivo: os dados são protegidos pela RLS. **Nunca** use a chave `service_role` aqui.

## 2. Criar o seu login (usuário único)

No painel do Supabase: **Authentication → Users → Add user** (Create new user). Informe seu **e-mail** e uma **senha**, e marque para confirmar o e-mail automaticamente (Auto Confirm User), para não precisar de e-mail de verificação. Esse será o login que você usa na tela de entrada.

## 3. Publicar no Vercel

Como antes: arraste a **pasta** deste sistema para o Vercel (deploy estático), ou suba num novo projeto. Não há build — são só arquivos estáticos. O `login.html` e o `index.html` já ficam na raiz.

> Dica: no Supabase, em **Authentication → URL Configuration**, adicione a URL do seu site do Vercel em *Site URL / Redirect URLs* para evitar avisos de origem.

## 4. Primeiro acesso

1. Abra o site → você cai na tela de **login**. Entre com o e-mail/senha do passo 2.
2. Vá em **Configurações (RT & Estabelecimento)** no menu lateral e preencha seus **dados reais** (nome, CRF/UF, registro, dados do hospital). Salve. A partir daí, todo rodapé e relatório passa a mostrar seus dados — nada fica fixo no código.
3. Navegue pelas telas: os **dados de teste** já aparecem (pacientes, estoque, movimentações). Um **banner amarelo** avisa que são dados de teste.
4. Teste as impressões: **Livro de Registro → "Imprimir para fiscalização"** e **Balanço Mensal → "Imprimir BMPO"**. Abre uma versão limpa em A4, com cabeçalho do hospital e espaço para assinatura/identificação do RT em cada página. Use o botão **Imprimir / Salvar PDF** dessa janela.

## 5. Antes de usar de verdade

Quando terminar de testar e for cadastrar pacientes reais, clique em **"Limpar dados de teste"** no banner (ou rode `select limpar_dados_teste();` no SQL Editor). Isso apaga toda a massa fictícia e **preserva** a sua configuração de RT/estabelecimento.

---

## O que este pacote entrega (Parte 2)

- **Persistência real** no Supabase, com as movimentações como fonte de verdade (derivadas, como você pediu). Validado: os saldos calculados na tela batem exatamente com os do banco.
- **Login único** (Supabase Auth) — o sistema não fica aberto. Botão **Sair** no rodapé do menu.
- **RT como dado**, editável em Configurações; alimenta rodapés e relatórios.
- **Relatórios imprimíveis** (Livro de Registro e BMPO) com cabeçalho do estabelecimento e assinatura do RT, sem o aviso de "documento de conferência" (como você definiu). O BMPO calcula o **estoque inicial** a partir das movimentações anteriores ao mês.
- **Banner + limpeza** de dados de teste.

## Lançamentos disponíveis nesta versão

Agora o sistema é **gravável pelas telas** (não precisa mais do Table Editor do Supabase para o dia a dia):

- **Substâncias** (tela Estoque) — **+ Nova substância** e edição (nome, princípio ativo, concentração, forma, lista da Portaria 344/98, unidade).
- **Ajuste de Estoque / Inventário** — conte um lote fisicamente e informe a quantidade real; se divergir do sistema, registra um **ajuste com justificativa obrigatória** que reconcilia o saldo (aparece no Livro como movimentação). Requer a migração acima.
- **Pacientes** — cadastrar e editar.
- **Prescrições** — nova prescrição com **várias substâncias de uma vez** (cabeçalho com paciente/data/prescritor + várias linhas de medicamento). Edição individual por linha. Dá para criar um prescritor novo na hora.
- **Mapa de Medicação (impressão)** — dois formatos: **por paciente** (uma folha por paciente, dias em colunas para a enfermagem rubricar cada administração e arquivar no prontuário — padrão 5 dias) e **por dia** (uma folha por dia com todos os pacientes, colunas Manhã/Tarde/Noite ou Manhã/Noite). Ambos com linhas em branco para anotações à mão.
- **Dispensação (dose unitária)** — baixa **por data**:
  - **Seletor de dia** (padrão hoje): escolha uma data — inclusive **dias passados** — para dar baixa **retroativa** a partir dos Mapas de Medicação preenchidos. Pendentes, baixa e a data gravada no estoque respeitam o dia escolhido.
  - **A dispensar**: seleciona as doses (lote de saída pré-escolhido por FEFO) e **Confirmar dispensação** → baixa no estoque na data selecionada.
  - **Dispensados na data**: o que saiu, com **Estornar** para desfazer engano.
  - **Registrar devolução** e **Etiquetas do dia**.
- **Medicação do Paciente** (custódia) — lançamento com múltiplos itens + botão **🖶 Termo de Custódia**, que escolhe o paciente e gera um comprovante imprimível (dados do paciente, medicações recebidas, declaração e assinaturas do paciente/responsável e do RT). **Notas Fiscais** e **Doações** — lançamento com múltiplos itens; cada item vira lote rastreável.
- **Carrinho de Emergência** — registrar rompimento/reposição do lacre.

Quem registrou cada lançamento fica gravado (coluna de usuário) — é a mesma costura que habilita o multiperfil depois.

## O que fica para a próxima fase (não incluído, por combinação)

- **Login multiperfil** (farmácia/enfermagem/administração) e acesso simultâneo em rede. A estrutura já está pronta (coluna de usuário nas tabelas + RLS ligada); ativar é configuração de política, não retrabalho.
- **Prescrição eletrônica** (Fase 4 do roadmap).
- Edição/estorno de NF, doação e dispensação já lançadas (hoje o razão é derivado; correções entram como novos lançamentos).
