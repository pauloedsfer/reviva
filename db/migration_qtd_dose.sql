-- ============================================================================
-- Hospital Reviva — migration_qtd_dose.sql
-- Quantidade explícita POR HORÁRIO na prescrição (ex.: 2 comprimidos por dose).
-- Rodar UMA VEZ no SQL Editor do Supabase. Aditivo e não-destrutivo.
-- ============================================================================
alter table prescricoes
  add column if not exists qtd_por_horario numeric not null default 1
  check (qtd_por_horario > 0);
