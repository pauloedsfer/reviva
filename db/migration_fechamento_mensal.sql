-- ============================================================================
-- Hospital Reviva — migration_fechamento_mensal.sql
-- Fechamento do período após a escrituração/BMPO do mês.
--
-- Depois de fechado, o sistema não aceita lançamentos com data igual ou
-- anterior ao fechamento: o que já foi escriturado e transmitido não pode
-- mudar. Correções passam a ser feitas no mês aberto.
--
-- Rodar UMA VEZ. Aditivo e não-destrutivo.
-- ============================================================================

alter table estabelecimento
  add column if not exists fechamento_ate date;

comment on column estabelecimento.fechamento_ate is
  'Última data com escrituração fechada. Lançamentos até esta data são bloqueados.';

-- ============================================================================
-- CONFERÊNCIA
-- ============================================================================
select razao_social, fechamento_ate from estabelecimento;
