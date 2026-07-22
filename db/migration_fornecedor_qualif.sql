-- ============================================================================
-- Hospital Reviva — migration_fornecedor_qualif.sql
-- Qualificação leve de fornecedores: habilitação documental + avaliação de
-- desempenho (Bom / Regular / Ruim). Tudo em campos simples no próprio
-- fornecedor — um retrato que o RT atualiza quando quiser.
-- Rodar UMA VEZ no SQL Editor do Supabase. Aditivo e não-destrutivo.
-- ============================================================================

-- Habilitação (documentação recebida e vigente) — checks
alter table fornecedores add column if not exists doc_afe        boolean not null default false;
alter table fornecedores add column if not exists doc_licenca    boolean not null default false;
alter table fornecedores add column if not exists doc_certidoes  boolean not null default false;
alter table fornecedores add column if not exists doc_tabela     boolean not null default false;
alter table fornecedores add column if not exists doc_validade   date;   -- vencimento do doc mais crítico (ex.: licença)

-- Desempenho (Bom / Regular / Ruim) — nulo = não avaliado
alter table fornecedores add column if not exists aval_prazo       text check (aval_prazo       in ('bom','regular','ruim'));
alter table fornecedores add column if not exists aval_resposta    text check (aval_resposta    in ('bom','regular','ruim'));
alter table fornecedores add column if not exists aval_atendimento text check (aval_atendimento in ('bom','regular','ruim'));
alter table fornecedores add column if not exists aval_data        date;
alter table fornecedores add column if not exists aval_obs         text;

-- Situação cadastral
alter table fornecedores add column if not exists situacao text not null default 'ativo'
  check (situacao in ('ativo','em_qualificacao','inativo'));

-- Fim da migração.
