-- ============================================================================
-- Hospital Reviva — migration_qtd_dose.sql
-- Quantidade explícita POR HORÁRIO na prescrição (ex.: 2 comprimidos por dose).
-- Antes, a dispensação deduzia a quantidade do texto da dose ("2 comp." -> 2),
-- o que era frágil. Agora há um campo próprio, padrão 1.
-- Rodar UMA VEZ no SQL Editor do Supabase. Aditivo e não-destrutivo.
-- ============================================================================

alter table prescricoes
  add column if not exists qtd_por_horario numeric not null default 1
  check (qtd_por_horario > 0);

-- Prescrições existentes ficam com 1 por horário (ajuste manual onde for mais).
-- Fim da migração.
