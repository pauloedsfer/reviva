-- ============================================================================
-- Hospital Reviva — migration_transferencia_custodia.sql
-- Transferência de estoque da clínica para a custódia de um paciente.
--
-- Enquanto não há unitarização das doses no estoque, a farmácia separa uma
-- cartela inteira e a vincula ao paciente: a quantidade sai do estoque geral,
-- passa a ser de uso exclusivo dele e o custo é atribuído ao paciente.
--
-- Modelo: a transferência é um EVENTO. O razão continua derivado —
--   * gera uma SAÍDA do lote de origem (estoque geral)
--   * cria um LOTE DE CUSTÓDIA vinculado ao paciente, com o custo do lote de
--     origem preservado (diferente da custódia trazida pela família, que tem
--     custo zero para a clínica)
--
-- Rodar UMA VEZ no SQL Editor. Aditivo e não-destrutivo.
-- ============================================================================

create table if not exists transferencias_custodia (
  id             uuid primary key default gen_random_uuid(),
  data           date not null default current_date,
  substancia_id  uuid not null references substancias(id),
  paciente_id    uuid not null references pacientes(id),
  lote_origem    text not null,              -- lote do estoque geral
  lote_destino   text not null,              -- lote vinculado ao paciente
  validade       date,
  quantidade     numeric not null check (quantidade > 0),
  custo_unit     numeric not null default 0, -- herdado do lote de origem
  observacao     text,
  usuario_id     uuid,
  is_dado_teste  boolean not null default false,
  created_at     timestamptz not null default now()
);

create index if not exists ix_transf_cust_pac  on transferencias_custodia(paciente_id);
create index if not exists ix_transf_cust_lote on transferencias_custodia(lote_origem);

alter table transferencias_custodia enable row level security;
drop policy if exists p_auth_all on transferencias_custodia;
create policy p_auth_all on transferencias_custodia
  for all to authenticated using (true) with check (true);

-- ============================================================================
-- CONFERÊNCIA
-- ============================================================================
select 'tabela criada' as item,
       case when exists (select 1 from information_schema.tables
                         where table_name = 'transferencias_custodia')
            then 'OK' else 'FALTA' end as situacao
union all
select 'política RLS',
       case when exists (select 1 from pg_policy p
                         join pg_class c on c.oid = p.polrelid
                         where c.relname = 'transferencias_custodia')
            then 'OK' else 'FALTA' end;

-- ----------------------------------------------------------------------------
-- OBSERVAÇÕES
--
-- 1. A quantidade transferida SAI do estoque geral e passa a contar como
--    custódia do paciente — não desaparece da escrituração: aparece no Livro
--    como saída do lote de origem e entrada no lote de custódia.
--
-- 2. O custo acompanha a transferência. Ao contrário da medicação trazida
--    pela família (custo zero), aqui a clínica comprou o medicamento, então
--    o valor é atribuído ao paciente no relatório financeiro.
--
-- 3. Se o paciente receber alta com saldo, esse lote entra no fluxo já
--    existente de destino da custódia (devolver à família ou reintegrar ao
--    estoque), conforme o POP-FAR-005.
-- ----------------------------------------------------------------------------
