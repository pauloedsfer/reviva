# Hospital Reviva — Sistema conectado ao banco (Parte 2)

O sistema agora lê e grava no seu banco Supabase, tem **login**, **cadastro do RT como dado** (tela de Configurações) e **impressão do Livro de Registro e do BMPO** para fiscalização. Siga os passos abaixo uma única vez.

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

- **Pacientes** — cadastrar e editar (nome, CPF, prontuário, leito, endereço, admissão, prescritor).
- **Prescrições** — nova/editar, com **data da prescrição** e **médico prescritor** (dá para criar um prescritor novo na hora). Horários separados por vírgula; use SOS.
- **Dose Unitária** — **Imprimir etiquetas do dia** gera uma etiqueta por **horário** de cada paciente (ex.: João → uma 08h e uma 22h). E **Registrar devolução** reintegra ao lote de origem.
- **Medicação do Paciente** — registrar custódia (cabeçalho + itens), restrita ao paciente.
- **Carrinho de Emergência** — registrar rompimento e reposição do lacre (atualiza status e grava no histórico).
- **Notas Fiscais** e **Doações** — lançar com múltiplos itens; cada item vira um lote rastreável.

Quem registrou cada lançamento fica gravado (coluna de usuário) — é a mesma costura que habilita o multiperfil depois.

## O que fica para a próxima fase (não incluído, por combinação)

- **Login multiperfil** (farmácia/enfermagem/administração) e acesso simultâneo em rede. A estrutura já está pronta (coluna de usuário nas tabelas + RLS ligada); ativar é configuração de política, não retrabalho.
- **Prescrição eletrônica** (Fase 4 do roadmap).
- Edição/estorno de NF, doação e dispensação já lançadas (hoje o razão é derivado; correções entram como novos lançamentos).
