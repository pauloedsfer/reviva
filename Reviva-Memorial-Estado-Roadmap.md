# Hospital Reviva — Memorial, Estado e Roadmap do Sistema
**Documento vivo · última atualização: 21/07/2026**

Este é o documento de referência único do sistema. Ele cumpre três papéis:
1. **Memorial de atualizações** — o que já foi construído, em ordem (seção 2).
2. **Estado do sistema** — checklist para conferir o que está no ar, banco e telas (seção 3).
3. **Evoluções futuras** — o que vem nas próximas fases, priorizado (seção 4).

A cada nova versão entregue, este documento é atualizado junto. Ele substitui o antigo `CHECKLIST-estado-do-sistema.md` (incorporado aqui na seção 3).

---

## 1. Arquitetura em uma frase

Frontend estático (HTML/JS, sem build) hospedado na Vercel + backend Supabase/Postgres. Login único (Supabase Auth). O **razão é derivado** — saldos e Livro são calculados a partir dos eventos atômicos, nunca digitados à mão. RT e estabelecimento são **dados editáveis** (Configurações), nunca fixos no código. Migrações são **aditivas** e ficam na pasta `db/`.

---

## 2. Memorial de atualizações

### Versão atual — 21/07/2026
Mudanças mais recentes, da mais nova para a mais antiga:

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
            then 'OK' else 'FALTA — migration_qtd_dose.sql' end;
```

Regras de ouro: migrações são **seguras de repetir** (`if not exists`); **nunca** rodar `schema.sql`, `seed_teste.sql` ou `reset_para_comecar.sql` com dados reais. Ordem numa instalação limpa: schema → ajustes → prescritor_externo → cotacao → alta → qtd_dose.

### 3.2 Telas (Vercel) — o sinal visível de cada recurso
- [ ] **Pacientes**: abas Internados / Arquivo; "Dar alta"; Extrato de Alta com/sem valores.
- [ ] **Prescrições**: lista por paciente (cartões); filtro por paciente; editar/suspender/adicionar; campo Qtd/horário.
- [ ] **Dispensação**: seletor de data; "★ custódia do paciente" no lote; Qtd/horário aplicada.
- [ ] **Mapa**: botões "por paciente" e "por dia"; toggle sem-prescrição; fichas em branco.
- [ ] **Medicação do Paciente**: situação (custódia / aguardando / devolvido / integrado); devolver à família / integrar ao estoque.
- [ ] **Ajuste de Estoque**: "Folha de contagem" com 3 filtros (substância, vencimento, zerados).
- [ ] **Cotação**: abas Itens / Lançar preços / Comparativo & Pedidos.
- [ ] **Livro de Registro**: filtros (paciente, período, tipo, substância, lista, lote); colunas Lote e Validade; saldo real.
- [ ] **POPs do Fluxo**: *(ver seção 4 — em reestruturação)*.

Se algo faltar: rode só a migração indicada (3.1) e/ou suba o `reviva-app.zip` mais recente; Ctrl+F5; F12 → Console em caso de erro.

---

## 4. Evoluções futuras / possibilidades de expansão

Priorizado por valor regulatório e esforço. **P1 = próximo**, **P2 = médio prazo**, **P3 = quando fizer sentido**.

### Fase POPs — em decisão (P1)
Reestruturar a área de POPs, hoje um checklist estático e somente-leitura (tópicos cadastrados como dado de teste, botão sem ação).
- **Camada 1 (esforço baixo):** registro/checklist funcional — adicionar/editar/remover, status (pendente → em elaboração → vigente), campos de controle (código, versão, vigência, próxima revisão, responsável), tópicos **permanentes** (não mais dado de teste) e **impressão do registro mestre**.
- **Camada 2 (esforço médio):** gerador de documento — corpo estruturado (objetivo, campo de aplicação, responsabilidades, materiais, procedimento passo a passo, registros, referências, histórico de revisões, assinaturas) e **impressão do POP formatado**. Redação dos POPs do fluxo pode ser rascunhada a partir do funcionamento real do sistema.
- POPs do fluxo a contemplar: admissão/cadastro; conferência de NF; doações; **custódia + destino na alta**; preparo/etiquetagem da dose unitária; **dupla checagem/administração**; devolução/reintegração de SOS; carrinho de emergência/lacre; **escrituração e balanço**; **ajuste/contagem de inventário**; **cotação/compras**; backup/continuidade.

### Escrituração e Livro (P1–P2)
- **Fechar/travar semana** da escrituração (integridade após impressão e assinatura) — evita edição retroativa de período já oficializado.
- **Resumo consolidado** no rodapé do Livro filtrado (ex.: total de entradas/saídas por substância no período).
- **Transferência custódia → estoque** como lançamento explícito no Livro (hoje a integração muda a natureza do lote sem gerar movimento de saldo).
- Impressão do Livro em **paisagem** se as 9 colunas ficarem apertadas em retrato.

### Compras e fornecedores (P2)
- **Previsão de compra por consumo** (quando houver histórico de dispensação): uso/dia, dias de cobertura, sugestão de compra — reaproveitando a lógica da planilha de 2019.
- **Cadastro bilateral de fornecedores** e disparo de e-mail de cotação.

### Inventário (P2)
- Folha de contagem **por local de armazenamento** (prateleira/geladeira) para contagem em pontos diferentes da farmácia.

### Plataforma (P3)
- **Multiusuário com perfis** (farmácia, enfermagem, direção) sobre a base de `usuarios` já existente.
- **Backup e continuidade** documentados (export periódico, restauração).
- **Relatórios gerenciais** (consumo por período, curva ABC, perdas por ajuste).

---

## 5. Convenções de manutenção
- Toda entrega vem como `reviva-app.zip`; a pasta `db/` traz todas as migrações + este documento.
- Cada release: atualizar a seção 2 (memorial) e, se entrar recurso novo, a seção 3.2 e a seção 4.
- Validação de cada mudança em Postgres local + conferência de sintaxe antes da entrega. O que não é testável no ambiente (cliques na interface) é sinalizado para conferência no primeiro uso real.
