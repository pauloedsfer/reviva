# Hospital Reviva — Checklist de Estado do Sistema
**Gerado em 21/07/2026** · confere com o build `reviva-app.zip` desta data

Use este documento para bater o que está **no ar** (Vercel + Supabase) contra o que **deveria existir**. Duas partes: (1) migrações do banco, com SQL de verificação; (2) recursos por tela, com o teste rápido de cada um.

---

## Parte 1 — Migrações do Supabase

Rode este bloco único no **SQL Editor** do Supabase. Ele **não altera nada** — só responde o que está aplicado:

```sql
select 'schema base (tabela pacientes)' as item,
       case when exists (select 1 from information_schema.tables where table_name='pacientes')
            then 'OK' else 'FALTA — rodar schema.sql' end as status
union all
select 'migration_ajustes (tabela ajustes_estoque)',
       case when exists (select 1 from information_schema.tables where table_name='ajustes_estoque')
            then 'OK' else 'FALTA — rodar migration_ajustes.sql' end
union all
select 'migration_prescritor_externo (coluna externo em prescritores)',
       case when exists (select 1 from information_schema.columns
                         where table_name='prescritores' and column_name='externo')
            then 'OK' else 'FALTA — rodar migration_prescritor_externo.sql' end
union all
select 'migration_cotacao (tabelas cotacoes / cotacao_itens / cotacao_precos)',
       case when exists (select 1 from information_schema.tables where table_name='cotacao_precos')
            then 'OK' else 'FALTA — rodar migration_cotacao.sql' end
union all
select 'migration_alta (tabela custodia_destinos + views)',
       case when exists (select 1 from information_schema.tables where table_name='custodia_destinos')
            then 'OK' else 'FALTA — rodar migration_alta.sql' end
union all
select 'migration_qtd_dose (coluna qtd_por_horario em prescricoes)',
       case when exists (select 1 from information_schema.columns
                         where table_name='prescricoes' and column_name='qtd_por_horario')
            then 'OK' else 'FALTA — rodar migration_qtd_dose.sql' end;
```

**Regras de ouro:**
- Todas as migrações estão na pasta `db/` do zip e são **aditivas** — é seguro rodar de novo uma que já foi aplicada (`if not exists` / `create or replace`).
- **Nunca** rode `schema.sql` de novo depois que houver dados reais (ele cria do zero). O mesmo vale para `seed_teste.sql` (dados de teste) e `reset_para_comecar.sql` (limpeza total).
- Ordem correta numa instalação limpa: `schema.sql` → `migration_ajustes` → `migration_prescritor_externo` → `migration_cotacao` → `migration_alta` → `migration_qtd_dose`.

---

## Parte 2 — Recursos por tela (teste rápido no ar)

Abra o site no Vercel e percorra a lista. Cada item tem o sinal visível que comprova que aquela versão está no ar.

### Pacientes
- [ ] **Duas abas**: "Internados" e "Arquivo (altas)".
- [ ] Botão **"Dar alta"** em cada paciente internado (abre resumo com prescrições a encerrar e custódia).
- [ ] No **Arquivo**: pacientes com alta, indicador de custódia pendente e botão **"🖶 Extrato de Alta"** com escolha **com valores / sem valores**.

### Prescrições
- [ ] Lista **agrupada por paciente** (um cartão por paciente, botão "Abrir prescrição") — não uma tabela plana com todas as medicações misturadas.
- [ ] **Filtro por paciente** (dropdown) no topo.
- [ ] No detalhe do paciente: botões **Editar**, **Suspender** e **"+ Adicionar medicação"**.
- [ ] Formulários (novo e edição) têm o campo **"Qtd. por horário"** (Qtd/hor.). Item com mais de 1 mostra o marcador **"2×/horário"**.

### Dispensação (Dose Unitária)
- [ ] **Seletor de data** no topo (permite baixa retroativa de mapas preenchidos).
- [ ] No seletor de lote: **"★ custódia do paciente"** aparece primeiro quando o paciente tem medicação própria; custódia de **outro** paciente nunca aparece.
- [ ] Medicação com Qtd/hor. = 2 vem com **quantidade 2** na dose.

### Mapa de Medicação
- [ ] **Dois botões**: "🖶 Mapa por paciente (prontuário)" e "🖶 Mapa por dia (geral)".
- [ ] Por paciente: **uma folha por paciente**, com o bloco do dia (Manhã/Tarde/Noite) **repetido para cada dia** do período.
- [ ] Campo **"Pacientes sem prescrição"** (Ignorar / Incluir) e **fichas de paciente em branco** no fim.
- [ ] Medicação com Qtd/hor. > 1 sai com **"(2×/dose)"** no nome.

### Medicação do Paciente (custódia)
- [ ] Coluna **"Situação"**: EM CUSTÓDIA / **aguardando retirada** (após alta) / devolvido à família / INTEGRADO AO ESTOQUE.
- [ ] Em itens aguardando: botões **"Devolver à família"** (imprime **Termo de Devolução**) e **"Integrar ao estoque"**.

### Ajuste de Estoque / Inventário
- [ ] Botão **"🖶 Folha de contagem"** ao lado de "+ Novo ajuste".
- [ ] Filtros da folha: **substância**, **faixa de vencimento** (todas / vencidas / 30·60·90 dias / intervalo) e **ocultar lotes zerados**.
- [ ] Impresso com colunas em branco **Contagem física** e **Diferença**; vencidos destacados.

### Suprimentos → Cotação
- [ ] Dentro de uma cotação: **três abas** — Itens / **Lançar preços** / **Comparativo & Pedidos**.
- [ ] Lançar preços: por fornecedor (unid./caixa, preço/caixa, validade, indisponível), com "+ Novo fornecedor" inline.
- [ ] Comparativo: **menor preço unitário destacado em verde**; "🖶 Imprimir pedidos" gera **uma página por fornecedor**.

### Demais telas (base estável)
- [ ] Estoque: lotes com validade e saldo; edição de substância preserva princípio ativo/concentração/forma.
- [ ] Balanço (BMPO) e Livro de Registro abrem e imprimem com o RT e o estabelecimento das **Configurações** (nunca fixos no código).
- [ ] Financeiro: apenas custos de **farmácia** (sem diária de internação).

---

## Se algo estiver FALTANDO

1. **Banco**: rode apenas a migração indicada como FALTA (Parte 1). Seguras de repetir.
2. **Telas**: suba o `reviva-app.zip` mais recente no Vercel (substituindo tudo). O zip desta data contém todos os itens da Parte 2 — auditados um a um antes de gerar este checklist.
3. Divergência persistindo após subir o zip: **Ctrl+F5** (cache) e, se preciso, F12 → Console para me mandar o erro.

*Dica: guarde este arquivo junto do zip. A cada nova versão que eu entregar, atualizo o checklist se novos recursos entrarem.*
