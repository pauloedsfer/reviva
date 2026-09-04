# Hospital Reviva — Sistema de Gestão da Farmácia

> Memorial de atualizações, estado do sistema e roadmap. Este é o documento de referência único do projeto.
**Documento vivo · última atualização: 29/08/2026**

Este é o documento de referência único do sistema. Ele cumpre três papéis:
1. **Memorial de atualizações** — o que já foi construído, em ordem (seção 2).
2. **Estado do sistema** — checklist para conferir o que está no ar, banco e telas (seção 3).
3. **Evoluções futuras** — o que vem nas próximas fases, priorizado (seção 4).

A cada nova versão entregue, este documento é atualizado junto. Ele substitui o antigo `CHECKLIST-estado-do-sistema.md` (incorporado aqui na seção 3).

---

## 0. Como trabalhar com este projeto

Ao pedir alterações com apoio de IA, veja `COMO-ECONOMIZAR-TOKENS.md`: uma
conversa por assunto, anexando este README e o arquivo da tela envolvida.
O histórico longo é o que mais consome — não o tamanho do sistema.

---

## 1. Arquitetura em uma frase

Frontend estático (HTML/JS, sem build) hospedado na Vercel + backend Supabase/Postgres. **No Livro de Registro e no BMPO, a identidade do medicamento é princípio ativo + dosagem** — o nome comercial é conveniência clínica e é consolidado na escrituração. Login único (Supabase Auth). O **razão é derivado** — saldos e Livro são calculados a partir dos eventos atômicos, nunca digitados à mão. RT e estabelecimento são **dados editáveis** (Configurações), nunca fixos no código. Migrações são **aditivas** e ficam na pasta `db/`.

---

## 1.1 Instalação e primeiro acesso

### Passo 1 — Conectar ao seu banco

Abra `assets/config.js` e cole os dois valores do seu projeto Supabase:

- No painel do Supabase: **Settings → Data API** (ou **API**).
- Copie **Project URL** → cole em `SUPABASE_URL`.
- Copie **anon public** → cole em `SUPABASE_ANON_KEY`.

A chave `anon` é segura no arquivo: os dados são protegidos pela RLS. **Nunca** use a chave `service_role` aqui.

### Passo 2 — Criar o seu login (usuário único)

No painel do Supabase: **Authentication → Users → Add user** (Create new user). Informe seu **e-mail** e uma **senha**, e marque para confirmar o e-mail automaticamente (Auto Confirm User), para não precisar de e-mail de verificação. Esse será o login que você usa na tela de entrada.

### Passo 3 — Publicar no Vercel

Como antes: arraste a **pasta** deste sistema para o Vercel (deploy estático), ou suba num novo projeto. Não há build — são só arquivos estáticos. O `login.html` e o `index.html` já ficam na raiz.

> Dica: no Supabase, em **Authentication → URL Configuration**, adicione a URL do seu site do Vercel em *Site URL / Redirect URLs* para evitar avisos de origem.

### Passo 4 — Primeiro acesso

1. Abra o site → você cai na tela de **login**. Entre com o e-mail/senha do passo 2.
2. Vá em **Configurações (RT & Estabelecimento)** no menu lateral e preencha seus **dados reais** (nome, CRF/UF, registro, dados do hospital). Salve. A partir daí, todo rodapé e relatório passa a mostrar seus dados — nada fica fixo no código.
3. Navegue pelas telas: os **dados de teste** já aparecem (pacientes, estoque, movimentações). Um **banner amarelo** avisa que são dados de teste.
4. Teste as impressões: **Livro de Registro → "Imprimir para fiscalização"** e **Balanço Mensal → "Imprimir BMPO"**. Abre uma versão limpa em A4, com cabeçalho do hospital e espaço para assinatura/identificação do RT em cada página. Use o botão **Imprimir / Salvar PDF** dessa janela.

### Passo 5 — Antes de usar de verdade

Quando terminar de testar e for cadastrar pacientes reais, clique em **"Limpar dados de teste"** no banner (ou rode `select limpar_dados_teste();` no SQL Editor). Isso apaga toda a massa fictícia e **preserva** a sua configuração de RT/estabelecimento.

> Depois da instalação, confira o estado do banco pela seção 3.1 (bloco SQL de verificação) e rode as migrações que estiverem faltando.

---

## 2. Memorial de atualizações

### Versão atual
_As entradas abaixo acompanham a data no topo deste documento._

- **BMPO passa a incluir a medicação em custódia.** A custódia de paciente era **excluída** do balanço. Como ela é sujeita a controle especial e fica sob guarda da farmácia, precisa ser escriturada e constar do BMPO. O balanço passou a apresentar **três blocos de colunas**: *Estoque do estabelecimento* (o que a clínica adquiriu), *Custódia de pacientes* (medicação de propriedade do paciente, sob guarda em separado) e *Total sob guarda* (a soma, correspondente ao que existe fisicamente na farmácia). A separação é necessária porque a custódia **não integra o patrimônio do estabelecimento** — somá-la ao estoque próprio distorceria o balanço. Substâncias que existem **apenas** em custódia passam a aparecer no relatório, o que antes não acontecia. Custódia deixada na alta e integrada ao estoque migra para a coluna do estabelecimento. O impresso traz nota explicativa das três colunas.

- **Desempenho — saldos pré-calculados.** Cada consulta de saldo percorria **todas** as movimentações; com 130 lotes e milhares de dispensações, eram centenas de milhares de operações por tela. As movimentações passaram a ser percorridas **uma única vez**, acumulando em cada saldo, com cache invalidado a cada gravação. É a causa da lentidão que crescia com o banco.
- **Trava de saldo negativo.** Nenhuma saída pode deixar um lote abaixo de zero. A dispensação e a transferência conferem o saldo **antes de gravar** e recusam com uma mensagem que mostra o disponível, o solicitado e orienta a registrar **ajuste de inventário com justificativa** quando a contagem física diverge.
- **Dose atendida por mais de um lote.** Se restam 1 comprimido no lote antigo e a dose é de 2, o sistema toma **1 de cada lote** — cada parcela vira um lançamento próprio, para o Livro manter a rastreabilidade. Não havendo saldo suficiente em lote nenhum, dispensa o que existe, **zera o lote** e informa o que ficou pendente até chegar medicação, em vez de gerar negativo. A ordem é o lote escolhido, depois a custódia do paciente e por fim o estoque geral por FEFO, e a confirmação detalha a divisão.
- **Fechamento da escrituração (`migration_fechamento_mensal.sql`).** Em Configurações, o RT informa até que data o BMPO foi fechado. Lançamentos com data igual ou anterior passam a ser **recusados**, preservando o que já foi escriturado e transmitido; correções vão para o mês aberto. Há botão para **reabrir** o período enquanto não houver transmissão.
- **Transferência entre pacientes e para a clínica (`migration_transferencia_entre_pacientes.sql`).** A transferência de custódia deixou de ser só clínica → paciente e passou a aceitar **paciente → clínica** (o paciente não vai mais usar e cede) e **paciente → paciente** (repasse acordado). Quando a origem é custódia, o sistema **exige o registro da anuência** do paciente que cede — a medicação é dele, e a concordância é o que justifica o movimento numa inspeção. O seletor identifica o dono de cada lote.

- **Correção — ajuste de inventário aplicado no saldo errado (`migration_ajuste_paciente.sql`).** Com a nova identidade de lote (substância + lote + dono), os **ajustes** passaram a ser atribuídos sempre ao estoque da clínica, porque o registro do ajuste não guardava o paciente. Ajustes feitos sobre lotes de **custódia** sumiam de lá e caíam no saldo da clínica, criando negativos novos — como a trazodona BRM6M033 do paciente. Agora a atribuição segue esta regra: existindo **um único saldo** para aquela substância + lote, é ele; havendo vários, usa-se o **paciente gravado no ajuste** e, na falta dele, o estoque da clínica. O ajuste passou a **registrar o dono do saldo** (novo campo `paciente_id`), de modo que ajustes futuros nunca ficam ambíguos — o seletor de lote já identifica se é da clínica ou de qual paciente é a custódia.

- **Correção crítica — identidade do lote.** O sistema tratava o **número do lote como identificador único**, mas ele não é. O mesmo número aparece em várias entregas ao mesmo paciente (a família traz mais da mesma caixa), na custódia de **pacientes diferentes** (mesmo lote de fábrica) e ao mesmo tempo **na custódia e no estoque da clínica**. O saldo somava o consumo de todos e descontava de **uma única entrada**, produzindo linhas repetidas na folha de contagem e saldos negativos — como o omeprazol 2527282 (duas linhas, −19) e o cetoprofeno GRA00118 (três linhas, −9). A identidade passou a ser a tripla **substância + lote + dono** (paciente na custódia, vazio no estoque da clínica): entradas repetidas dessa mesma tripla **somam num único saldo**, e cada saída é atribuída ao dono correto — custódia do paciente quando ele tem aquele lote, estoque da clínica caso contrário. Ajustes, devoluções, destinos de custódia e transferências seguem a mesma chave. Afeta saldo, folha de contagem, dispensação, Livro, BMPO e previsão. *(Requer apenas subir os arquivos — nenhuma migração.)*

- **Nome comercial como sinônimo (`migration_sinonimos_e_gotas.sql`).** A substância ganhou o campo **nome comercial**, exibido ao lado do princípio ativo no **mapa, na dispensação, no checklist de separação, nas prescrições e na folha de contagem** — `NALTREXONA 50MG COMP. (Uninaltrex®)`. Assim a enfermagem reconhece a caixa sem que o mesmo medicamento seja cadastrado duas vezes, o que dividia o saldo e quebrava o agrupamento do Livro.
- **Unidade de compra para líquidos em gotas.** A substância ganhou **unidade de compra** (frasco) e **fator de conversão** (400 gotas = frasco de 20 mL, a 20 gotas/mL), editável por item para frascos de 10 ou 30 mL. A **unidade base continua sendo a gota**, que é a movimentada na dose; a entrada em nota, doação e custódia passa a ser digitada em **frascos**, convertida automaticamente, com a conversão exibida enquanto se digita. Saldos aparecem nas duas unidades (`1.150 gotas · 2 frascos e 350 gotas`), inclusive na folha de contagem, que é como a conferência física acontece.
- **Unificação de cadastros duplicados (`unificar_substancias_duplicadas.sql`).** Script que remaneja todo o histórico do cadastro duplicado para o do princípio ativo, transforma a marca em sinônimo e inativa o duplicado sem apagá-lo. Acompanha `varredura_substancias_duplicadas.sql`, que localiza duplicidades por princípio + concentração e por **lote usado em cadastros diferentes**.
- **Folha de contagem: negativos sempre visíveis.** O filtro “ocultar lotes zerados” usava `saldo > 0` e escondia também os negativos. Passou a ocultar **apenas o zero exato**, e a folha traz um aviso no topo com a contagem de lotes negativos.

- **Folha de contagem separada por custódia.** A folha de inventário passou a sair em seções: primeiro o **ESTOQUE DA CLÍNICA** e depois **CUSTÓDIA — <paciente>**, uma seção por paciente, com a contagem de lotes e o aviso de que se conta em separado e **não se soma ao estoque da clínica** (ficam em local diferente). A numeração reinicia a cada seção. Lotes com **saldo negativo** passaram a ser destacados em vermelho com a marca **NEGATIVO** — antes apareciam como qualquer outro. Acompanha `diagnostico_saldo_negativo.sql` para apurar a origem.

- **Folha Semanal agrupada por lista da Portaria 344/98.** As substâncias passaram a sair **na ordem das listas** — A1, A2, A3, B1, B2, C1 a C5, D1, D2 — e, dentro de cada uma, em ordem alfabética; as sem controle especial vão para o fim. A cada mudança de lista entra um **cabeçalho** identificando a lista, **o livro correspondente** (Entorpecentes, Psicotrópicos ou Controle Especial) e quantas substâncias daquela lista há na folha, de modo que a transcrição seja feita um livro de cada vez sem procurar itens espalhados. A lista final de substâncias sem movimentação segue o mesmo agrupamento. A regra já contempla **A1 e A2**, ainda sem itens padronizados.

- **Correção crítica — dados truncados pelo limite de 1.000 linhas do Supabase.** Nenhuma consulta paginava, e o Supabase devolve **no máximo 1.000 linhas por requisição, sem avisar**. Com a operação em curso, a tabela `dispensacoes` passou desse volume e as datas **mais recentes deixaram de ser carregadas**: doses já baixadas voltavam a aparecer como pendentes, o quadro “Dispensados” saía vazio e — mais grave — **o saldo dos lotes ficava alto demais**, porque o consumo não era contado (lotes em uso apareciam como “fechado”). Todas as leituras passaram a ser **paginadas em blocos de 1.000 até esgotar** a tabela. Afeta saldo, escrituração, Livro, BMPO e previsão. *(Requer apenas subir o arquivo — nenhuma migração.)*
- **Correção — data do sistema em UTC.** `HOJE` era calculado com `toISOString()`, que devolve **UTC**: em Goiás (UTC−3), das 21h em diante o sistema já considerava o dia seguinte, abrindo a dispensação no dia errado e marcando lançamentos do próprio dia como “retroativos”. Passou a usar a **data local**.

- **Separação antecipada, para dias futuros.** A separação passou a ter **período próprio**, independente da data de dispensação. O modal traz **“A partir de”** (padrão: amanhã) e **quantos dias** (1, 2, 3 — fim de semana —, 4 ou 7), atendendo a rotina real: hoje se separa o dia seguinte e, nas sextas, sábado, domingo e segunda, porque a farmácia fecha. Checklist e etiquetas são gerados **para cada dia do período**, cada um com seu cabeçalho, quebra de página entre os dias e o lote sugerido recalculado. A **dispensação continua restrita a hoje ou retroativo** — separar não baixa estoque, a baixa segue sendo feita no dia da administração —, e o seletor de data agora explica isso ao passar o mouse.
- **Etiquetas: horário em negrito.** O horário passou a sair em **negrito e corpo maior**, no mesmo destaque do dia da semana, e cada etiqueta carrega a **data do próprio dia** a que o kit pertence.

- **Checklist de separação: vários pacientes por folha e lote sugerido.** O checklist saía **uma folha por paciente**, gastando muito papel — agora os pacientes fluem na mesma folha, cada bloco apenas evitando ser partido, com cabeçalho e rodapé únicos no documento e layout compactado. A coluna *Lote separado* (em branco) virou **Lote sugerido**, já preenchida com o **próximo lote a ser liberado** daquele medicamento para aquele paciente — custódia dele primeiro (terminando o lote aberto), depois o estoque geral por FEFO —, com a validade abaixo e *“sem saldo”* quando não há lote disponível. É o mesmo critério da dispensação, então o que a farmácia separa coincide com o que o sistema vai baixar.
- **Etiquetas de kit: quebra corrigida e dia da semana.** As etiquetas tinham **altura fixa de 46 mm em 3 colunas**, e horários com muitas medicações estouravam o quadro, cortando o texto. Passaram a **2 colunas com altura automática**, crescendo conforme o conteúdo. Ao lado do horário aparece agora o **DIA DA SEMANA em maiúsculas e negrito**, e o rodapé traz o aviso de que o kit é exclusivo daquele dia, não deve ser aberto em outro e precisa voltar à farmácia se não usado. A marcação de custódia foi retirada das etiquetas (permanece no checklist, que é o documento da farmácia).

- **Folha Semanal: saída sem paciente passa a ter motivo.** Saídas por **ajuste de inventário** deixavam o campo Paciente em branco. Agora esse campo recebe o motivo da saída — **“Ajuste de inventário”** e, quando aplicável, *Perda / avaria*, *Descarte*, *Devolução à família* ou *Vencimento* —, em itálico para distinguir de nome de paciente. Essas saídas são agrupadas por motivo e lote, e aparecem **depois** dos pacientes na ordenação. O campo nunca mais sai em branco, o que a transcrição para o livro físico exige.

- **Folha de Registro Semanal reformulada.** Removido o campo *“Transcrito no livro em ___ Rubrica ___”*. As **saídas** deixaram de ser uma linha consolidada (“FULANO e outros”) e passaram a detalhar **Período · Paciente · Lote · Validade · Qtd.**, com uma linha por paciente e lote e o total ao final — preservando a rastreabilidade por lote que o Livro exige. Substâncias **sem entradas e sem saídas no período** saíram dos blocos individuais e passaram a uma **lista única ao final**, mostrando o saldo por **lote e validade**, com marcação ★ para lotes de custódia do paciente.
- **Correção — rodapé quebrado a partir da 2ª página (todos os relatórios).** O rodapé usava `position:fixed` para se repetir em cada página, mas na impressão o navegador o reposicionava e ele aparecia cortado sobre o conteúdo. Passou a ser **estático, uma única vez ao final do documento**, logo abaixo da assinatura do RT.

- **Custódia: terminar o lote aberto antes de abrir outro.** A escolha automática do lote passou a ter **regra própria para a medicação em custódia**, diferente do estoque geral. No estoque da clínica continua valendo FEFO — começar pelo que vence antes evita perda para o serviço. Na custódia, o medicamento é do paciente e já foi pago: abrir uma caixa nova enquanto restam poucos comprimidos na anterior gera sobra fracionada, atrapalha a separação e tende a vencer nas mãos dele. Agora a ordem é **lote já em uso primeiro** (o de administração mais recente, quando há vários) e, entre os fechados, aí sim o que vence primeiro. O seletor identifica cada lote como **EM USO** ou **fechado**, e quando o lote sugerido vence depois de outro fechado do mesmo paciente, aparece o aviso *“lote X vence antes (DD/MM/AAAA)”* — a escolha continua sendo do RT, que pode trocar manualmente. Terminado o lote aberto, o sistema passa sozinho ao seguinte.

- **Transferência do estoque para a custódia do paciente (`migration_transferencia_custodia.sql`).** Botão **⇄ Transferir do estoque** em Medicação do Paciente: escolhe-se o paciente, o lote do estoque e a quantidade, e o sistema cria um **lote de uso exclusivo** dele. Atende o cenário de separar uma cartela inteira enquanto a dispensação não é unitarizada. O razão continua derivado — a transferência gera **saída do lote de origem** e **entrada no lote do paciente**, ambas visíveis no Livro de Registro, sem perda de rastreabilidade. O **custo acompanha a transferência** (diferente da custódia trazida pela família, que é custo zero) e é atribuído ao paciente **no momento da transferência**; as doses administradas depois desse lote **não são cobradas outra vez**, evitando dupla contagem. O lote sai do estoque geral e da seleção FEFO, ficando visível apenas para o paciente. Ao dar alta com saldo, ele entra no fluxo já existente de destino da custódia (POP-FAR-005).
- **Correção — saldo do estoque geral incluía custódia.** `saldo`, `lotesDisponiveis` e `lotesCustodiaDoPaciente` filtravam por origem (`proprio`) em vez de pela restrição ao paciente, o que deixaria os lotes transferidos contando como estoque disponível. Passaram a usar o critério correto — **todo lote restrito a paciente fica fora do estoque da clínica** —, o que também torna o comportamento consistente para qualquer nova origem de custódia.

- **Correção — pacientes com alta contavam como ocupação.** O painel exibia `patients.length`, que inclui **todo o cadastro**, e por isso pacientes já com alta continuavam ocupando leito na contagem. Criado o critério único `pacInternado` / `pacientesInternados`, aplicado nos cinco pontos que listavam pacientes sem filtrar: **painel** (agora “leitos ocupados”, com nota de quantos estão no histórico com alta), **configuração do mapa**, **seletor de pacientes dos formulários** (ordenado por leito; paciente com alta só aparece se já estiver selecionado, marcado com “(alta)”, para não quebrar a edição de registros antigos) e **financeiro**. O paciente com alta permanece no cadastro para histórico e escrituração — apenas deixa de ocupar leito e de aparecer nas listas operacionais.

- **Correção — Mapa de Medicação parou de imprimir.** A mudança que introduziu a data limite da prescrição passou a filtrar as medicações do mapa por `prescVigenteEm(pr, dISO)`, mas `dISO` **não existia no escopo** de `_tabelaPaciente` — a variável indefinida quebrava a geração e **nenhum dos dois mapas** (por dia e por paciente) era impresso. A data do dia impresso passou a ser recebida por parâmetro: o mapa por dia usa o dia da folha e o mapa por paciente usa o dia de cada bloco. Com isso a data limite é respeitada **dia a dia** — um antimicrobiano que termina em 11/08 aparece no bloco do dia 11 e some a partir do dia 12, na mesma folha.

- **Correção — rodapé sobrepondo o conteúdo na impressão.** Em relatórios longos, a última linha da tabela de cada página era **coberta pelo rodapé**. Causa: o rodapé é fixo e se repete em todas as páginas, mas em impressão `position:fixed` é posicionado a partir da **área de conteúdo**, não do papel — com `bottom:6mm` ele caía dentro da área útil. Corrigido com deslocamento negativo, que o coloca dentro da margem inferior já reservada no `@page`, liberando a área útil inteira. Aproveitou-se para impedir que **linhas sejam partidas entre páginas**, garantir que o **cabeçalho da tabela se repita** no alto de cada página e evitar **títulos órfãos** no pé. Vale para todos os relatórios do sistema, não só o de previsão.

- **Previsão: escolha do que imprimir.** A impressão ganhou um seletor de conteúdo — **os dois quadros**, **somente cobertura do estoque da clínica** ou **somente medicação por paciente (custódia e reposição)**. Ao imprimir só o quadro por paciente, o documento muda de identidade: sai com o título **“Medicação por Paciente — Custódia e Reposição”** e subtítulo próprio (quantos itens e quantos estão sem estoque na clínica), sem qualquer referência à situação de compra do estoque — é o documento que interessa à equipe e à família, e não à direção. A faixa de cobertura, que só se aplica ao quadro do estoque, é ocultada nessa opção.

- **Data limite na prescrição — suspensão automática.** A prescrição passou a aceitar uma **data limite opcional**, para tratamentos com duração definida (antimicrobianos, corticoides em esquema curto). Passada a data, a prescrição **sai sozinha do mapa, da dispensação e da previsão de cobertura**, sem depender de alguém lembrar de suspender. O campo está na criação (valendo para as medicações do lote) e na edição individual; em branco significa uso contínuo. A vigência passou a ser calculada por um critério único (`prescVigenteEm`) aplicado a todos os módulos, o que preserva a **baixa retroativa**: numa data anterior ao término, a prescrição volta a aparecer normalmente. Na lista, cada prescrição com prazo mostra **quantos dias restam** (âmbar), **último dia** (vermelho) ou **encerrada em DD/MM**, e a tela geral traz um resumo das encerradas por prazo. A coluna já existia no banco e não era usada — **não exigiu migração**.

- **Importação de nota fiscal por colagem (`⬆ Importar da DANFE`).** Na tela de Notas Fiscais, cola-se o bloco extraído da DANFE e o sistema monta a nota inteira. O formato traz a nota numa linha (`NF;número;série;data;fornecedor;valor total`) e cada item em outra (`ITEM;nome;caixas;unid_por_caixa;lote;validade;valor total do item`). O ponto central é a **conversão de caixa para unidade**: a nota vende caixas, o estoque trabalha em unidades — o sistema calcula a quantidade (caixas × unidades) e o **custo unitário** (valor ÷ unidades). O **Conferir antes de gravar** mostra item a item quantas unidades entrarão, lote, validade (**em vermelho se vencida**), custo unitário calculado e a lista de controle, além de **comparar a soma dos itens com o total declarado** da nota e apontar a diferença. O fornecedor é identificado pelo nome ou escolhido na tela.
- **Prompt padrão para extrair notas fiscais (`PROMPT-notas-fiscais.md`).** Roteiro reutilizável para ler a DANFE com apoio de IA: anexar a nota (foto, PDF ou XML) e a lista de itens cadastrados, com regras de correspondência por princípio ativo e concentração, instruções de conversão caixa→unidade, cuidado explícito com **lote e validade** (não adivinhar caracteres ilegíveis) e saída já no formato da importação. Inclui recomendação de modelo e esforço.

- **Baixa de SOS com quantidade digitada e observação.** No SOS a prescrição não prevê quantas crises ocorrerão, então a quantidade deixou de ser fixa: a linha traz um **campo editável** (“digite o total usado”) e um **campo de observação** para justificar o uso. A justificativa é gravada na referência do lançamento, aparecendo no histórico do dia e no **Livro de Registro** — o que dá rastreabilidade ao uso de controlado em intercorrência. O SOS passou a poder ser **lançado mais de uma vez no mesmo dia** (o paciente pode ter mais de uma crise): a linha permanece disponível após cada baixa e exibe **quantas vezes e quanto já foi lançado** na data. A confirmação lista as quantidades de SOS antes de gravar, e o histórico do dia — que antes só mostrava doses programadas — passou a incluir os SOS, destacados com etiqueta.

- **Impressão personalizada de prescrições.** Novo botão **🖶 Imprimir prescrições** (na tela de Prescrições e em cada paciente) que abre um seletor onde o RT marca **exatamente quais medicações entram** em cada prescrição — controladas e não controladas **no mesmo documento**, como o médico assina e a farmácia dispensa, em vez da separação automática por lista que o receituário antigo fazia. Permite escolher o **modelo** (Controle Especial em 2 vias ou receituário simples em 1 via), deixar o **prescritor em branco para o médico preencher e assinar** ou já sair com nome e CRM do prescritor do paciente, e selecionar quais **dados do paciente** constam — **CPF**, endereço e telefone —, o que facilita a compra na farmácia e a retenção da receita. Gera **vários pacientes de uma só vez**, uma prescrição por paciente. Itens de lista **A ou B** vêm sinalizados no seletor com o aviso de que exigem Notificação de Receita própria.

- **Medicamento sem estoque na clínica passa a aparecer no quadro por paciente.** Quando um item prescrito **não tem saldo no estoque da clínica** e o paciente **também não possui custódia**, ele agora entra no quadro *Medicação por paciente — custódia e reposição*, marcado em vermelho como **“sem estoque na clínica — solicitar prescrição e aquisição pela família”**. É a informação que faltava para agir: enquanto a compra não chega, o caminho prático é o médico prescrever e a família adquirir. Os faltantes aparecem **no topo da lista** (ação imediata), o cartão de resumo passa a contá-los e itens que a clínica cobre continuam fora — só entra o que realmente está descoberto. Prescrições **SOS** sem estoque também entram, sinalizadas.
- **Lista imprimível para médico e família.** Novo botão **🖶 Lista para médico/família** gera a relação, **por paciente**, dos medicamentos prescritos em falta, com o **uso por dia**, a **quantidade sugerida para 30 dias** e campos para marcar *Prescrito* e *Adquirido*. Traz o texto de solicitação ao médico assistente e à família, a orientação de entregar na embalagem original com lote e validade legíveis, e a nota de que itens sob controle especial exigem receita própria (Portaria 344/1998).

- **Correção — filtro de faixa da Previsão gerava sempre o mesmo relatório.** O filtro funcionava, mas o desenho o anulava: itens **sem consumo previsto** (em estoque, sem prescrição ativa) não pertenciam a nenhuma faixa e eram removidos por uma caixa de seleção desmarcada por padrão. Como a maioria dos itens está nessa condição enquanto as prescrições não são todas cadastradas, **“Todos os itens” e “Adequado” produziam saída idêntica** e as demais faixas só emitiam alerta. Agora **“sem consumo previsto” é uma faixa própria**, “Todos os itens” significa realmente todos, e há a faixa **“itens com consumo previsto”** (pré-selecionada). Cada opção mostra **a contagem exata do que será impresso** e fica **indisponível quando não há itens**; o relatório traz um **banner do recorte aplicado** (“X de Y itens”) e, quando a faixa está vazia, o aviso mostra a distribuição atual por situação em vez de uma mensagem genérica.

- **Separação da farmácia — checklist e etiquetas de kit.** Novo botão na Dispensação (**🖶 Separação da farmácia**) que gera o material para montar os kits do dia. O **checklist** é uma folha por paciente, com os horários do dia em blocos, cada medicamento com **quantidade**, coluna de conferência (✓) e campo para anotar o **lote separado**, mais assinaturas de quem separou e de quem conferiu. As **etiquetas de kit** identificam cada pacote — um por paciente e por horário — e passaram a trazer a **quantidade em destaque**, que faltava e é o dado essencial para separar. Dose fracionada mostra o que administrar e o que retirar do estoque (½ administrar · separar 1); medicação de custódia vem marcada com ★. Pode-se escolher um paciente ou todos, quais horários incluir e se o SOS entra.
- **Previsão de Cobertura — impressão por faixa.** A impressão passou por um seletor: **todos os itens**, **apenas crítico** (a lista do que comprar agora), **crítico + atenção**, **apenas atenção** ou **apenas adequado**, cada opção mostrando a contagem. Dá para **omitir o quadro de custódia** (que é reposta pela família, não pela clínica) e os itens **sem consumo previsto**. O relatório traz a faixa escolhida no subtítulo e o **total de unidades a adquirir** para a cobertura configurada.

- **Dispensação reorganizada por horário.** A tela de Dose Unitária deixou de listar as pendências por paciente e passou a **agrupá-las por horário** — que é como a dispensação acontece na prática: às 9h separam-se as doses das 9h, de todos os pacientes. Cada horário vira um cabeçalho com a contagem de doses, o período a que pertence e um botão **marcar todas** só daquele horário; dentro do grupo os pacientes vêm ordenados por leito. Acima da tabela há uma **barra de filtros**: *Todos*, os **períodos** (Manhã/Tarde/Noite) e cada **horário** individualmente, todos com a contagem de doses pendentes. Quando a data é hoje, o período correspondente ao relógio aparece **destacado como sugestão**.
- **SOS fora da rotina de dispensação.** Doses **SOS** deixaram de aparecer misturadas às pendências (são lançadas retroativamente, depois que a enfermagem administra). Ficam ocultas por padrão, com um aviso informando quantas existem e o botão **Ver apenas SOS** para lançá-las quando for o caso.

- **Correção e exclusão de nota fiscal.** A tela de Notas Fiscais ganhou os botões **Corrigir** e **Excluir**, que não existiam. A correção permite ajustar **número, data, fornecedor e valor total** da nota e, em cada item, **quantidade, lote, validade e custo unitário**. O **custo unitário é sempre editável** — não altera saldo nem escrituração, só o custo médio e o financeiro. **Lote e quantidade têm proteção**: quando já houve administração daquele lote, o número do lote fica bloqueado (romperia o vínculo das baixas) e a quantidade não pode ficar abaixo do já administrado; o modal informa quantas unidades foram usadas. A **exclusão só é permitida em nota sem nenhuma administração**. Para correção imediata pelo banco, há também `corrigir_nota_fiscal.sql`.

- **Relatório de Cotação e Justificativa de Compra.** Novo impresso na cotação (botão **🖶 Relatório de justificativa**), destinado à prestação de contas à direção. Abre com a **comparação de dois cenários** — (A) comprar tudo pelo menor preço unitário e (B) a decisão técnica adotada — mostrando valor, unidades adquiridas e excesso de cada um, mais a diferença e quantas unidades de excesso foram evitadas. Traz os **cinco critérios** que fundamentam a escolha (preço unitário como filtro, adequação da embalagem à necessidade, prazo de validade, regularidade do fornecedor e exigências da Portaria 344/98), o **quadro de situação dos itens**, a **distribuição do pedido por fornecedor** e, item a item, **todas as propostas recebidas** com preço unitário, unidades por caixa, preço da caixa, caixas, total de unidades, excesso, validade e custo — com a escolha marcada (★) e a **justificativa escrita pelo RT** logo abaixo. Itens excluídos da compra e itens sem proposta aparecem sinalizados. Fecha com assinatura do Farmacêutico RT e campo de ciência e autorização da direção.

- **Validade do lote na cotação.** A importação de preços passou a reconhecer a **validade** ofertada (formatos `31/05/2028`, `2028-05-31` e `05/2028`, este último assumindo o último dia do mês), gravando-a no preço — a coluna já existia na tabela e não era usada. A validade aparece na prévia da importação, em cada célula do comparativo e na tabela do modal de decisão, com etiqueta de alerta quando faltam **12 meses ou menos** (âmbar) ou **6 meses ou menos** (vermelho). O modal de decisão passou a exibir um **aviso destacado** quando uma oferta combina **sobra grande com prazo curto** — o pior cenário de compra. O prompt de análise de cotações foi atualizado para extrair a validade e para incluir uma seção própria de **risco de vencimento**.

- **Correção — botão “Decidir” não abria.** A função da decisão de compra chamava o formatador de moeda `brl()`, que existia apenas como variável **local** dentro de outras funções da página — o clique gerava erro e o modal não abria. `brl()` passou a ser um utilitário global.
- **Correção — itens entrando na cotação com quantidade 0.** O “adicionar todos os itens da padronização” inseria **quantidade 0**, o que zerava caixas, custo e sobra e tornava a decisão impossível ("precisa: 0 comp."). Agora a quantidade vem **sugerida pela apresentação** (injetáveis 10, líquidos 2, demais 1 caixa) e o modal de decisão ganhou o campo **Necessidade**, destacado em vermelho quando está zerada, permitindo corrigir sem sair da tela. O modal também nunca abre com 0 caixas.
- **Documentação — data única.** O documento tinha **duas datas** para manter (topo e cabeçalho do memorial), e a do memorial ficava defasada. Agora há **uma só data**, no topo, e o cabeçalho do memorial apenas a referencia.
Mudanças mais recentes, da mais nova para a mais antiga:

- **Decisão de compra por item (`migration_decisao_compra.sql`).** O menor preço unitário deixou de ser o vencedor automático e passou a ser **sugestão**: embalagem grande e barata por unidade pode obrigar a comprar muito mais do que se vai consumir, com risco de vencimento. Cada célula do comparativo mostra agora **preço unitário, unidades por caixa, preço da caixa, caixas necessárias, custo total e a sobra** — com destaque em vermelho quando o excesso passa de 100% da necessidade. O botão **Decidir** abre a comparação completa do item (todas as ofertas lado a lado, com excesso e custo) e permite escolher o **fornecedor**, a **quantidade de caixas**, ou marcar **não comprar agora** (ex.: adquirir em drogaria), com observação registrada. Os **pedidos passam a ser montados pela decisão**, caindo na sugestão automática só onde ainda não há decisão; itens excluídos aparecem listados à parte, junto dos que ficaram sem preço em nenhuma proposta.

- **Etiquetas de identificação do paciente.** Na aba **Pacientes**, botão **🏷 Etiquetas** (no cabeçalho e em cada linha) imprime etiquetas com nome da clínica, **nome do paciente, prontuário, leito, nascimento com idade e data de internação** — a mesma etiqueta serve para prontuário, caixa de medicação em custódia e demais identificações. Dois formatos de grade A4: **grande 99 × 34 mm (16 por folha)** e **média 67 × 25 mm (30 por folha)**, com quantidade por paciente configurável e opção de imprimir para **todos os internados**. Há um marcador opcional **USO EXCLUSIVO DESTE PACIENTE**, para a caixa de custódia — reforço de segurança alinhado ao POP-FAR-004, que veda usar custódia de um paciente em outro. *(Front-only.)*

- **POP-FAR-014 — Controle de Temperatura e Armazenamento Refrigerado (cadeia de frio).** Escrito para a estrutura real: geladeira exclusiva de medicamentos com termo-higrômetro de máxima e mínima medindo o interior do equipamento e o ambiente. Cobre uso exclusivo do refrigerador, posicionamento interno (nada na porta, gavetas ou congelador), organização por lote e validade, leitura e registro **duas vezes ao dia** com reinício da memória de máx./mín., faixas aceitáveis (**2 a 8 °C** refrigerado · 15 a 30 °C ambiente), conduta em **desvio de temperatura** (isolar como EM AVALIAÇÃO, consultar o fabricante, decisão registrada do RT), **falta de energia** com contingência em caixa térmica, limpeza e degelo, verificação do termo-higrômetro e recebimento de termolábeis. Custódia refrigerada fica identificada por paciente. Referências: RDC 430/2020 (arts. 77 a 81), RDC 63/2011, RDC 306/2004. Total: **15 POPs**. *(Rodar `pops_conteudo_v5.sql`.)*
- **Folha de Registro de Temperatura e Umidade.** Novo impresso em Documentos e Registros: colunas de refrigerador (**atual, mínima e máxima**) e ambiente (**temperatura e umidade**), coluna Conforme, rubrica por leitura, campos de mês/ano, equipamento e nº do termo-higrômetro, bloco para **ocorrências e desvios** e assinatura de conferência do RT. As faixas aceitáveis e a instrução de zerar a memória vêm impressas na própria folha. O catálogo de documentos passou a ser **agrupado por área** (Farmácia / Enfermagem).

- **Correção — cobertura de custódia com mais de uma prescrição do mesmo medicamento.** O quadro de custódia iterava **por prescrição**, então um paciente com duas prescrições da mesma substância (doses diferentes ao longo do dia, ex.: insulina 25 UI de manhã e 15 UI à noite) gerava **duas linhas**, cada uma dividindo o saldo inteiro do lote pelo seu próprio consumo — e superestimando muito a cobertura (72 e 121 dias, quando o correto era 45). Passou a agrupar por **paciente + substância**, somando o consumo diário das prescrições e dividindo o saldo uma única vez. Quando há mais de uma prescrição, a linha mostra o detalhe da soma.

- **Correção de item de custódia.** A tela Medicação do Paciente ganhou o botão **Corrigir**: permite ajustar **validade**, **quantidade recebida** e **observação** de um item de custódia. O **número do lote só é editável enquanto não houver administração vinculada** — depois disso fica bloqueado, porque o lote é a chave que liga as baixas ao item e trocá-lo romperia a rastreabilidade; o modal informa quantas administrações existem. A quantidade não pode ser reduzida abaixo do que já foi administrado. Para correção imediata via banco, há também `corrigir_validade_custodia.sql`.

- **Importação de preços por colagem (`⬆ Importar preços`).** Na cotação, escolhe-se o fornecedor e cola-se a lista no formato `ITEM;UNID_POR_CAIXA;PRECO_CAIXA`. O botão **Conferir antes de gravar** mostra a prévia — linhas reconhecidas com preço unitário calculado, linhas rejeitadas com o motivo, e quantos itens ficaram sem preço — de modo que **nada é aplicado no escuro**. Aceita ponto-e-vírgula ou tabulação como separador e números em formato pt-BR ou internacional (`60.71`, `26,83`, `1.239,53`). Reimportar substitui apenas os preços daquele fornecedor naquela cotação, sem duplicar.
- **Prompt padrão para análise de cotações (`PROMPT-cotacoes.md`).** Roteiro reutilizável para processar cada proposta recebida com apoio de IA: anexar a proposta + a planilha exportada do sistema (que fornece os nomes oficiais dos itens), regras de correspondência por princípio ativo e concentração, casos que **não** devem ser correspondidos, e saída já no formato da importação. Inclui recomendação de modelo e esforço.

- **Previsão de Cobertura e Compras (reescrita).** A tela de previsão passou a calcular pelas **prescrições ativas** — consumo conhecido — em vez do histórico de dispensação, que numa unidade nova é curto e subestima o consumo. Para cada medicamento (agrupado por **princípio ativo + dosagem**) mostra pacientes em uso, **consumo/dia**, estoque, **dias de cobertura** e **quanto comprar** para a cobertura desejada, com sinalização **🟢 adequado · 🟡 programar compra · 🔴 comprar agora · ⚪ sem consumo previsto** e ordenação do mais urgente. Quatro cartões no topo resumem a situação. Limiares configuráveis (crítico, atenção e dias de cobertura). A dose fracionada é contada pelo **consumo real** (meio comprimido baixa unidade inteira), pacientes com alta são ignorados e prescrições **SOS** ficam de fora do consumo diário, apenas sinalizadas.
- **Custódia com cobertura separada.** Quadro próprio mostrando, por paciente, quantos dias a **medicação dele** ainda dura, com validade do lote — quando acaba, a reposição é da família, não da clínica. Pacientes com custódia da substância são automaticamente excluídos do consumo do estoque geral, evitando dupla contagem. Ambos os quadros são imprimíveis.

- **Edição de fornecedor.** O fornecedor cadastrado passou a ser editável (nome/razão social, CNPJ, tipo, endereço, representante, WhatsApp, telefone e e-mail) pelo botão **Editar** no painel. Quando há histórico, o formulário avisa quantas notas fiscais e preços serão afetados e explica que a alteração muda também os registros antigos; se o nome mudar, o **nome anterior é gravado automaticamente nas observações**, com a data — corrigir digitação deixa de ser impossível sem perder rastreabilidade.
- **Documentação unificada no `README.md`.** O memorial/roadmap virou `README.md` (exibido automaticamente pelo GitHub) e incorporou as instruções de instalação e primeiro acesso que estavam no `LEIA-ME.md`, agora removido.

- **Inativar, reativar e excluir fornecedor.** O painel de Fornecedores ganhou os botões **Inativar/Reativar** e, quando cabível, **Excluir**. Fornecedor inativo **some das cotações e do lançamento de preços**, mas mantém todo o histórico, e pode ser reativado a qualquer momento; por padrão a lista mostra só os ativos, com botão para exibir os inativos. A **exclusão só é oferecida a fornecedor sem nenhuma nota fiscal e sem nenhum preço cotado** — havendo histórico, o sistema explica que apagar comprometeria a rastreabilidade das compras e orienta a inativar. Cada linha mostra os vínculos existentes (nº de NFs e de preços). *(Front-only.)*

- **Fornecedores com contato e importação da carteira (`migration_fornecedores_contatos.sql`).** O fornecedor ganhou os campos **representante, telefone, WhatsApp e e-mail** (antes só havia nome, CNPJ e qualificação), e o tipo passou a aceitar **indústria** além de distribuidora e drogaria. Importados os **32 fornecedores** da carteira de representantes, todos como *em qualificação*. Na tela de Cotação há agora o painel **Fornecedores**, em ordem alfabética, com **link direto de WhatsApp** (wa.me) e e-mail clicável, marcação de quem está sem telefone e acesso à Qualificação. Os contatos também são editáveis pelo modal de qualificação. *(Requer a migração.)*

- **Sinais Vitais para todos os pacientes de uma vez.** O seletor ganhou a opção **★ TODOS os pacientes internados**, que gera uma folha para cada um (em ordem alfabética, com o cabeçalho preenchido e quebra de página entre elas). Combinada com o número de folhas, permite imprimir o bloco inteiro da unidade de uma só vez. Pacientes com alta ficam de fora automaticamente.
- **Exportar cotação para Excel (.xlsx).** Botão **⬇ Exportar Excel** na cotação, gerando a planilha para enviar ao fornecedor: cabeçalho da clínica, identificador e data, itens ordenados por categoria e nome, coluna **Lista 344/98** marcando os controlados, e sete **colunas em branco para o fornecedor preencher** (marca/laboratório, unid. por caixa, preço por caixa, preço unitário, validade, prazo de entrega, observação). Sai com autofiltro, painel congelado e larguras ajustadas. Usa SheetJS via CDN, com queda automática para CSV caso a biblioteca não carregue.

- **Sessão expirada com aviso claro.** A queda de sessão era silenciosa e só aparecia ao gravar, com a mensagem técnica de RLS. Agora a sessão é verificada a cada 2 minutos e ao voltar para a aba, e qualquer falha de gravação por sessão perdida vira um aviso legível ("Sua sessão expirou… nada foi gravado"), com botões para reentrar na mesma aba ou em outra. O **formulário permanece preenchido**, bastando salvar de novo após o login.
- **Substâncias em ordem alfabética por categoria.** Todos os seletores de substância (prescrição, ajuste, NF, doação, custódia…) passaram a ser agrupados por categoria em ordem alfabética, com os itens ordenados por nome, marcando a lista de controle e a origem (med. de paciente). O **menu Substâncias/Estoque** também foi agrupado por categoria, com contagem de itens, nº de controlados e valor em estoque por categoria. Os **lotes no ajuste** ficaram agrupados por substância.
- **Ajuste de vários lotes com a mesma justificativa.** Novo formulário "Ajuste de vários lotes": adiciona-se quantas linhas forem necessárias (lote + contagem física), com a diferença calculada ao vivo e um resumo do que será lançado. Cada divergência gera seu próprio lançamento no Livro (rastreável por lote), todos com a **mesma data e justificativa**; lotes que conferem não geram lançamento.
- **Folha de Sinais Vitais: coluna PA alargada.** A coluna de pressão arterial passou a 13% da largura (contra 8,5% das numéricas), acomodando o padrão manuscrito 120 X 80, e ganhou a unidade no cabeçalho (PA em mmHg).

- **Nova seção Enfermagem — Documentos e Registros (`enfermagem.html`).** Área para as folhas próprias da enfermagem, **somente impressão** (não grava dados, não criou tabelas). Primeiro documento: **Sinais Vitais**, com logotipo e cabeçalho da clínica, bloco de identificação do paciente (nome, idade, sexo, prontuário, leito, data de internação) e as colunas Data · Hora · PA · FC (bpm) · SpO₂ (%) · Temperatura (°C) · HGT · Assinatura da Enfermagem. Pode sair **com o cabeçalho do paciente preenchido** ou **em branco** para preenchimento manual, com número de linhas e de folhas configurável. A estrutura é um catálogo (`_ENF_DOCS`), pronta para receber os próximos impressos da enfermagem. *(Front-only.)*

- **Mapa ordenado por período de administração.** As linhas de cada paciente passaram a sair na ordem definida pelo RT: **JEJUM no topo**, depois manhã · manhã/tarde · manhã/noite · manhã/tarde/noite · tarde · tarde/noite · noite, e **SOS por último**. A regra geral aplicada é: período em que começa → período em que termina → número de períodos, o que acomoda também as combinações não listadas (ex.: manhã/noite, que é o padrão atual da clínica às 09:00 e 21:00).
- **Horários padronizados clicáveis.** A prescrição ganhou chips de horário (JEJUM · 06:00 · 09:00 · 12:00 · 15:00 · 18:00 · 21:00 · 00:00 · SOS) que alternam com um clique e se ordenam sozinhos; o campo de texto continua disponível para horários fora do padrão. Isso garante grafia uniforme, de que depende a ordenação do mapa. **JEJUM** ocupa a coluna da manhã e sobe ao topo; **SOS** não ocupa coluna e desce ao final.

- **Meia dose (fração) com descarte do restante.** A prescrição passou a aceitar **quantidade fracionada por horário** (0,25 / 0,5 / 0,75). O sistema distingue **dose administrada** de **quantidade consumida do estoque**: em formas sólidas (comprimido, cápsula, drágea), partir a unidade descarta o restante, então administra-se a fração e o **estoque baixa a unidade inteira** (½ comp. em 2 horários = 2 comprimidos/dia). Em formas líquidas não há descarte e o consumo é igual ao administrado. O mapa e as telas mostram a fração como **½ / ¼ / ¾** (ex.: "½ comp./dose"), e a tela de dispensação indica quanto está sendo baixado e descartado. Sem migração — o banco já aceitava valores fracionados. *(Front-only.)*

- **Cotação impressa por categoria em ordem alfabética.** A **Solicitação de Cotação** (documento enviado ao fornecedor) passou a sair agrupada por categoria, com **categorias e itens em ordem alfabética**, contagem de itens por categoria, tag da lista (B1/C1) em cada controlado e aviso de "contém itens sob controle especial" nas categorias aplicáveis — mantendo as colunas em branco para o fornecedor preencher embalagem, preço e validade. A mesma ordenação alfabética foi aplicada ao **Pedido de Compra**, ao seletor de itens e à **lista de itens na tela**. *(Front-only.)*

- **Categorias de medicamento e separação padronização x paciente (`migration_categorias.sql`).** Cada substância ganhou **categoria** (10 categorias clínicas, das psicotrópicas às de urgência) e o marcador **padronizado**. A cotação passou a trabalhar só com itens da **padronização** — medicação cadastrada por causa de custódia de paciente não entra em cotação nem no "adicionar todos". O **Pedido de Compra impresso** agora sai **agrupado por categoria**, com subtotal por categoria, tag da lista (B1/C1) em cada item e aviso de "contém itens sob controle especial" nas categorias que têm controlados. No cadastro de substância há os campos Categoria e Origem (padronização / medicação de paciente), e a lista de estoque marca com tag as medicações de paciente.

- **Padronização aprovada cadastrada (`migration_padronizacao.sql`).** 77 substâncias da padronização aprovada pela diretoria, com a **classificação da Portaria 344/98 conferida item a item**: 6 em **B1** (benzodiazepínicos → Notificação B azul), 33 em **C1** (antidepressivos, anticonvulsivantes, antipsicóticos, antiparkinsonianos → Receita de Controle Especial 2 vias) e 38 não controladas. A migração também cria a **primeira cotação (COT-2026-001)** já com os 77 itens e as quantidades aprovadas (comprimidos 1 caixa, líquidos 2 frascos, injetáveis 10 ampolas). Correções apuradas na conferência: **prometazina não é controlada** (exceção expressa da 344/98) e **bromazepam é B1**. *(Idempotente.)*

- **Folha de Registro Semanal (para transcrição ao livro físico).** Nova impressão na tela de Escrituração: escolhe-se a semana (segunda a domingo, com navegação ◀ ▶) e o sistema gera uma folha com um bloco por medicamento contendo **saldo anterior**, **entradas discriminadas por lote** (data, lote, validade, origem/documento), **saídas consolidadas do período** (total + nome de um paciente seguido de "e outros" quando houver mais de um) e **saldo final**, além de campo "Transcrito no livro em ___ / Rubrica". Por padrão traz só os controlados, com opção de incluir os demais.
- **Identidade do medicamento no Livro e no BMPO: PRINCÍPIO ATIVO + DOSAGEM.** Nomes comerciais distintos com mesmo princípio e dosagem passam a ser **um único item** na escrituração — o nome comercial serve à administração pela enfermagem e à prescrição médica. Novo agrupamento (`gruposSubstancias`) aplicado à Folha Semanal e ao **BMPO**, que antes emitia uma linha por nome comercial e agora emite **uma linha por princípio+dosagem**, listando os nomes comerciais como referência.

- **Padronização de entrada em MAIÚSCULAS.** A digitação de texto passa a ser normalizada para maiúsculo automaticamente em todos os cadastros, **exceto POPs** (texto livre) e **exceto** e-mail, senha, números, datas e seletores (que guardam os IDs). Preserva a posição do cursor e permite exceção pontual via classe `no-upper`. Para os dados já cadastrados, há o script opcional **`migration_maiusculas.sql`** (idempotente, não toca e-mails/IDs/POPs nem campos de valor controlado como o canal da NF). *(Front em layout.js + SQL opcional.)*

- **Backup Exportar/Importar (Configurações → Backup e Segurança).** Botão **Exportar backup** baixa um JSON com **todas as 26 tabelas** (com data, assinatura e total de registros) para guardar fora do Supabase (Drive/pen drive). Botão **Restaurar de um arquivo** reconstrói os dados — em projeto vazio apenas insere; em projeto com dados, exige digitar RESTAURAR e substitui tudo. Ordem de tabelas respeita as chaves estrangeiras (limpeza reversa, inserção direta). Restaura **dados**; o schema vem das migrações. Validado em ciclo completo (export → restaurar por cima → restaurar em vazio) com contagens idênticas. *(Front-only, assets/backup.js.)*

- **POP-FAR-001 — Sistema de Gestão da Qualidade da Farmácia.** POP mestre que rege todos os demais: define elaboração, aprovação, treinamento, disponibilidade, revisão programada e **revisão extraordinária** (mudança de legislação, orientação da Vigilância, mudança de estrutura, não conformidade, sugestão da equipe), controle de versões, tratamento de **não conformidades e ações corretivas**, acompanhamento normativo, **resposta a fiscalizações com plano de ação** e autoavaliação periódica — formalizando a **melhoria contínua**. Total: **14 POPs**. *(Rodar `pops_conteudo_v4.sql`.)*
- **POPs em ordem de código.** A relação passou a ser ordenada por código — todos os **FAR** primeiro, depois os **ENF**, em numeração crescente — na tela e no Registro Mestre.
- **Correção — botão "Sair" invisível.** Na barra lateral escura, o botão usava a fonte na mesma cor do fundo (#1D4744), só aparecendo no hover. Passou a usar texto claro com borda sutil (contraste de 1,0:1 para 8,6:1).

- **Folha de Prescrição Médica (prontuário).** Documento interno da consulta, para arquivo no prontuário (sem vias nem retenção). Traz cabeçalho do estabelecimento, identificação do paciente (nome, prontuário, leito, idade, data de internação), **campo de alergias em destaque**, tabela de medicações (nº, medicamento, dose, via, frequência/observações), bloco de **cuidados/orientações** e assinatura/CRM do médico. Pré-preenchida com **todas as medicações ativas** do paciente (controladas e não) ou **em branco** para preencher à mão. Botões na prescrição do paciente e na tela geral de Prescrições. *(Front-only.)*

- **Correção — prescrição suspensa saindo do mapa.** Medicação suspensa deixou de aparecer no **mapa de medicação**, na **dispensação** e nos **cartões de prescrição** (o histórico é preservado e pode ser consultado). O filtro por `ativo` foi aplicado em mapa.js, dose.js e prescricoes.js.
- **Receituários em branco (sem paciente).** Além do pré-preenchido, agora há botões na **tela geral de Prescrições** para imprimir **Receituário C e comum em branco** (com pautas para o médico preencher à mão), seguindo o layout do modelo usado em clínica (Paciente/Endereço/Prescrição em linhas). Emitente do estabelecimento no cabeçalho.

- **Receituários imprimíveis (na Prescrição do paciente).** Dois botões na prescrição do paciente: **Receituário de Controle Especial (C)** — branca, **2 vias** (1ª Farmácia / 2ª Paciente), com campo de numeração, blocos de retenção (comprador/fornecedor) e itens **lista C1** pré-preenchidos — e **Receituário comum** (via única, itens **não controlados**). Ambos pré-preenchem estabelecimento, prescritor e paciente. Itens **B1/B2 (benzos)** e **A (opioides)** são excluídos dos dois, pois exigem Notificação B/A com numeração da VISA. *(Front-only, sem migração.)*

- **Qualificação de fornecedores.** Cada fornecedor ganhou uma **qualificação leve**: habilitação documental (checks de AFE, Licença, Certidões, Tabela + vencimento) e **avaliação de desempenho** em Bom/Regular/Ruim (prazo de entrega, tempo de resposta, atendimento), além de situação (ativo/em qualificação/inativo). Tags aparecem ao lado do fornecedor na cotação (🟢/🟡/🔴 e ⚠ não habilitado); ao lançar preços de um fornecedor com documentação incompleta/vencida, o sistema **alerta sem bloquear**. *(Requer `migration_fornecedor_qualif.sql`.)*

- **POPs — fluxo completo redigido (13/13).** Redigidos os POPs restantes, no mesmo padrão (atribuição + base legal; regime presencial periódico): **Admissão e Cadastro** (FAR-006), **Conferência e Registro da Administração** (ENF-002, no lugar de "dupla checagem", que a estrutura atual não comporta), **Devolução e Reintegração** (FAR-008), **Carrinho/Maleta de Emergência e Lacre** (FAR-010), **Cotação e Aquisição** (FAR-012) e **Backup e Continuidade** (FAR-013). Agora **os 13 POPs do fluxo têm documento**. *(Rodar `pops_conteudo_v3.sql`.)*

- **POPs — conteúdo v2 (enquadramento legal + mais POPs).** Os POPs foram reescritos para descrever o processo **por atribuição e com base legal**, não pela ausência de recursos: o preparo é **atribuição da enfermagem** (Lei 7.498/1986; Decreto 94.406/1987), com assistência farmacêutica em **regime presencial periódico** e retaguarda à distância — sem citar "falta de auxiliar" nem dias fixos, o que protege a instituição em fiscalização. Além dos 3 iniciais, foram redigidos: **Conferência de NF** (FAR-002), **Doações** (FAR-003), **Destino da Custódia na Alta** (FAR-005) e **Escrituração e Balanço** (FAR-011). Total: **7 POPs com documento**. *(Rodar `pops_conteudo_v2.sql`.)*

- **POPs — Camada 2 (gerador de documento).** Cada POP passou a ter **corpo estruturado** (objetivo, campo de aplicação, responsabilidades, materiais, procedimento passo a passo, registros, referências), editável na tela, e **impressão do documento de POP formatado** com cabeçalho de controle e bloco de assinaturas (elaborado/revisado/aprovado). Três POPs prioritários já vêm redigidos **dentro da realidade atual da clínica** (enfermagem prepara e administra no horário; RT confere custódia e estoque quando presencial, com suporte remoto por WhatsApp): **Preparo e Administração pela Enfermagem** (POP-ENF-001), **Custódia** (POP-FAR-004) e **Conferência Presencial do Estoque** (POP-FAR-009). *(Requer `migration_pops_corpo.sql`; conteúdo inicial em `pops_conteudo_inicial.sql`.)*

- **POPs — Camada 1 (registro funcional).** A área de POPs deixou de ser um checklist estático: agora é um registro com **CRUD**, **status clicável** (Pendente → Em elaboração → Vigente), campos de controle (**código, versão, data de vigência, próxima revisão, responsável, observação**), sinalização de **revisão vencida/próxima** e **impressão do Registro Mestre de POPs**. Os **13 tópicos do fluxo** passaram a ser **permanentes** (não mais dado de teste) e incluem os módulos novos (destino da custódia na alta, ajuste/contagem de inventário, cotação). *(Requer `migration_pops.sql`.)*

- **Livro de Registro — lote e validade.** Cada lançamento passou a exibir o **lote** e a **validade** (na tela e no impresso), e há **filtro por lote** (restrito à substância escolhida quando houver uma).
- **Livro de Registro — filtros.** Filtro por **paciente**, **período (de/até)**, **tipo de movimento** (entradas, saídas, devoluções, ajustes de inventário), **substância** e **lista/classe** (controlados). Os filtros valem para tela e impressão; o subtítulo do impresso descreve o recorte. O **Saldo após permanece o saldo real acumulado** — os filtros só escolhem quais linhas aparecem, nunca recalculam o saldo dentro do recorte.
- **Prescrições agrupadas por paciente.** A tela deixou de ser uma lista plana: agora há **um cartão por paciente**; abre-se a prescrição completa dele e edita-se item a item (editar, suspender, adicionar). **Filtro por paciente** no topo.
- **Quantidade por horário na prescrição.** Campo **Qtd. por horário** (padrão 1) permite dispensar mais de um comprimido por dose. A dispensação usa o número direto; tela e mapa exibem "2×/horário" / "2×/dose". *(Requer `migration_qtd_dose.sql`.)*
- **Folha de contagem / inventário.** Botão na aba Ajuste de Estoque que gera folha A4 com Substância · Lote · Validade · Saldo no sistema + colunas em branco **Contagem física** e **Diferença**. Filtros: **substância**, **faixa de vencimento** (todas / vencidas / 30·60·90 dias / intervalo) e **ocultar zerados**.
- **Mapa por paciente + opções.** Formato "por paciente" repete o bloco do dia (Manhã/Tarde/Noite) empilhado por dia, uma folha por paciente. Opção de **fichas em branco** para novos pacientes e liga/desliga para **ignorar pacientes sem prescrição**.
- **Alta de paciente e destino da custódia.** Botão "Dar alta" (encerra prescrições, libera leito, arquiva). Custódia com saldo fica **aguardando retirada**; depois o RT decide item a item: **devolver à família** (com Termo de Devolução) ou **integrar ao estoque** (passa a contar no BMPO). Aba **Arquivo** com histórico preservado e **Extrato de Alta** em duas versões (com/sem valores). *(Requer `migration_alta.sql`.)*
- **Cotação de compras — Fase B.** Lançar preços por fornecedor (unid./caixa, preço/caixa, validade, indisponível), **comparativo por preço unitário** com o vencedor destacado, e **pedidos por fornecedor** imprimíveis. *(Requer `migration_cotacao.sql`.)*

### Base consolidada (fases anteriores)
- **Núcleo.** Banco (schema + RLS), login, Configurações (RT + estabelecimento).
- **Cadastros e estoque.** Pacientes, Substâncias/Estoque (lote, validade, FEFO), Notas Fiscais, Doações.
- **Prescrição e dispensação.** Prescrição multi-substância; **Dose Unitária** com **seleção de data** (baixa retroativa), preferência pelo **lote de custódia do próprio paciente** (★) e estoque geral como escolha manual; devolução/estorno.
- **Custódia (medicação própria).** Registro + Termo de Custódia; restrita ao paciente que trouxe.
- **Mapa de medicação — por dia.** Uma folha por dia com todos os pacientes; períodos Manhã/Tarde/Noite; linhas e fichas em branco.
- **Inventário/ajustes.** Ajuste justificado (contagem física vs sistema) que reconcilia o saldo via movimentação. *(`migration_ajustes.sql`.)*
- **Carrinho de emergência.** Itens, lacre, conferência.
- **Escrituração / BMPO.** Livro de Registro derivado; balanço mensal; custódia fora do BMPO (salvo quando integrada).
- **Financeiro.** Somente custos de farmácia (sem diária de internação).
- **Prescritor externo.** Vínculo interno/externo com tag. *(`migration_prescritor_externo.sql`.)*
- **Consultoria — Padronização.** Planilha `Padronizacao_Reviva_v1.xlsx` (67 itens por DCB, controlados marcados, sugestões do RT).

---

## 3. Estado do sistema (checklist de conferência)

### 3.1 Banco (Supabase) — bloco SQL de verificação
Cole no **SQL Editor**. Não altera nada; só informa o que está aplicado.

```sql
select 'schema base (tabela pacientes)' as item,
       case when exists (select 1 from information_schema.tables where table_name='pacientes')
            then 'OK' else 'FALTA — rodar schema.sql' end as status
union all
select 'migration_ajustes (ajustes_estoque)',
       case when exists (select 1 from information_schema.tables where table_name='ajustes_estoque')
            then 'OK' else 'FALTA — migration_ajustes.sql' end
union all
select 'migration_prescritor_externo (prescritores.externo)',
       case when exists (select 1 from information_schema.columns
                         where table_name='prescritores' and column_name='externo')
            then 'OK' else 'FALTA — migration_prescritor_externo.sql' end
union all
select 'migration_cotacao (cotacao_precos)',
       case when exists (select 1 from information_schema.tables where table_name='cotacao_precos')
            then 'OK' else 'FALTA — migration_cotacao.sql' end
union all
select 'migration_alta (custodia_destinos)',
       case when exists (select 1 from information_schema.tables where table_name='custodia_destinos')
            then 'OK' else 'FALTA — migration_alta.sql' end
union all
select 'migration_qtd_dose (prescricoes.qtd_por_horario)',
       case when exists (select 1 from information_schema.columns
                         where table_name='prescricoes' and column_name='qtd_por_horario')
            then 'OK' else 'FALTA — migration_qtd_dose.sql' end
union all
select 'migration_pops (pops.codigo / campos de controle)',
       case when exists (select 1 from information_schema.columns
                         where table_name='pops' and column_name='codigo')
            then 'OK' else 'FALTA — migration_pops.sql' end
union all
select 'migration_pops_corpo (pops.corpo)',
       case when exists (select 1 from information_schema.columns
                         where table_name='pops' and column_name='corpo')
            then 'OK' else 'FALTA — migration_pops_corpo.sql' end
union all
select 'migration_fornecedor_qualif (fornecedores.aval_prazo)',
       case when exists (select 1 from information_schema.columns
                         where table_name='fornecedores' and column_name='aval_prazo')
            then 'OK' else 'FALTA — migration_fornecedor_qualif.sql' end;
```

Regras de ouro: migrações são **seguras de repetir** (`if not exists`); **nunca** rodar `schema.sql`, `seed_teste.sql` ou `reset_para_comecar.sql` com dados reais. Ordem numa instalação limpa: schema → ajustes → prescritor_externo → cotacao → alta → qtd_dose → pops → pops_corpo (+ pops_conteudo_inicial).

### 3.2 Telas (Vercel) — o sinal visível de cada recurso
- [ ] **Pacientes**: abas Internados / Arquivo; "Dar alta"; Extrato de Alta com/sem valores.
- [ ] **Prescrições**: lista por paciente (cartões); filtro por paciente; editar/suspender/adicionar; campo Qtd/horário; **impressão de Folha de Prescrição Médica (prontuário), Receituário C (2 vias) e comum**, pré-preenchidos ou **em branco**.
- [ ] **Dispensação**: seletor de data; "★ custódia do paciente" no lote; Qtd/horário aplicada.
- [ ] **Mapa**: botões "por paciente" e "por dia"; toggle sem-prescrição; fichas em branco.
- [ ] **Medicação do Paciente**: situação (custódia / aguardando / devolvido / integrado); devolver à família / integrar ao estoque.
- [ ] **Ajuste de Estoque**: "Folha de contagem" com 3 filtros (substância, vencimento, zerados).
- [ ] **Cotação**: abas Itens / Lançar preços / Comparativo & Pedidos; **Qualificação de fornecedor** (habilitação + desempenho) com tags e alerta; itens **por categoria**, só da padronização; pedido impresso agrupado.
- [ ] **Livro de Registro**: filtros (paciente, período, tipo, substância, lista, lote); colunas Lote e Validade; saldo real. **Folha de Registro Semanal** (por princípio ativo + dosagem) no topo da tela.
- [ ] **Balanço/BMPO**: uma linha por princípio ativo + dosagem, com nomes comerciais como referência.
- [ ] **Enfermagem — Documentos e Registros**: folha de Sinais Vitais imprimível, com paciente ou em branco.
- [ ] **POPs do Fluxo**: registro com CRUD, status clicável, controle (código/versão/vigência/revisão), "Registro mestre", editor de conteúdo e impressão do POP formatado. **14 POPs redigidos**, ordenados por código (FAR antes de ENF).

Se algo faltar: rode só a migração indicada (3.1) e/ou suba o `reviva-app.zip` mais recente; Ctrl+F5; F12 → Console em caso de erro.

---

## 4. Evoluções futuras / possibilidades de expansão

Priorizado por valor regulatório e esforço. **P1 = próximo**, **P2 = médio prazo**, **P3 = quando fizer sentido**.

### Receituários e Notificações (P2)
- ✅ Receituário de Controle Especial (C, 2 vias) e Receituário comum imprimíveis pelo sistema.
- Notificação B (azul) e A (amarela): dependem de numeração da VISA e de modelo Versão 2 da Anvisa; avaliar impressão pelo sistema quando a numeração estiver disponível. Confirmar rito com a VISA-GO.

### Fase POPs (P1) — Camadas 1 e 2 concluídas
Reestruturar a área de POPs, hoje um checklist estático e somente-leitura (tópicos cadastrados como dado de teste, botão sem ação).
- ✅ **Camada 1 (concluída):** registro/checklist funcional — CRUD, status clicável, campos de controle, tópicos permanentes e impressão do registro mestre.
- ✅ **Camada 2 (concluída):** corpo estruturado + impressão do documento formatado. Todos os **13 POPs do fluxo** redigidos com corpo estruturado e impressão formatada. Próximo: revisar em conjunto e coletar assinaturas; incrementar versões conforme a estrutura evoluir.
- **Camada 2 (esforço médio):** gerador de documento — corpo estruturado (objetivo, campo de aplicação, responsabilidades, materiais, procedimento passo a passo, registros, referências, histórico de revisões, assinaturas) e **impressão do POP formatado**. Redação dos POPs do fluxo pode ser rascunhada a partir do funcionamento real do sistema.
- POPs do fluxo a contemplar: admissão/cadastro; conferência de NF; doações; **custódia + destino na alta**; preparo/etiquetagem da dose unitária; **dupla checagem/administração**; devolução/reintegração de SOS; carrinho de emergência/lacre; **escrituração e balanço**; **ajuste/contagem de inventário**; **cotação/compras**; backup/continuidade.

### Escrituração e Livro (P1–P2)
- **Fechar/travar semana** da escrituração (integridade após impressão e assinatura) — evita edição retroativa de período já oficializado.
- **Resumo consolidado** no rodapé do Livro filtrado (ex.: total de entradas/saídas por substância no período).
- **Transferência custódia → estoque** como lançamento explícito no Livro (hoje a integração muda a natureza do lote sem gerar movimento de saldo).
- Impressão do Livro em **paisagem** se as 9 colunas ficarem apertadas em retrato.

### Compras e fornecedores (P2)
- ✅ **Previsão de cobertura e alertas de compra** — concluída (base: prescrições ativas, com custódia em quadro separado).
- ✅ **Qualificação de fornecedores** (habilitação documental + desempenho Bom/Regular/Ruim) — concluída. Pendente: disparo de e-mail de cotação direto do sistema.

### Inventário (P2)
- Folha de contagem **por local de armazenamento** (prateleira/geladeira) para contagem em pontos diferentes da farmácia.

### Plataforma (P3)
- **Multiusuário com perfis** (farmácia, enfermagem, direção) sobre a base de `usuarios` já existente.
- ✅ **Backup Exportar/Importar** no sistema (export periódico + restauração) — concluído. Próximo: PWA com cache de leitura (abrir/imprimir offline) e retaguarda fria (2º projeto Postgres).
- **Relatórios gerenciais** (consumo por período, curva ABC, perdas por ajuste).

---

## 5. Convenções de manutenção
- Toda entrega vem como `reviva-app.zip`; a pasta `db/` traz todas as migrações + este documento.
- Cada release: atualizar a seção 2 (memorial) e, se entrar recurso novo, a seção 3.2 e a seção 4.
- Validação de cada mudança em Postgres local + conferência de sintaxe antes da entrega. O que não é testável no ambiente (cliques na interface) é sinalizado para conferência no primeiro uso real.
