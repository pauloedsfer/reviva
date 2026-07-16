-- ============================================================================
-- Hospital Reviva — migration_ajustes.sql
-- AJUSTE DE ESTOQUE / INVENTÁRIO
-- ----------------------------------------------------------------------------
-- Rodar UMA VEZ no SQL Editor do Supabase, DEPOIS do schema.sql já existente.
-- É ADITIVA e não-destrutiva: cria a tabela `ajustes_estoque`, estende as
-- views (create or replace) e atualiza a função de limpeza de teste.
-- Não apaga nada. Pode rodar com dados reais já cadastrados.
--
-- Conceito: quando a contagem física diverge do sistema, NÃO se corrige o
-- saldo à mão. Lança-se um ajuste (com justificativa obrigatória) que entra
-- como movimentação no razão e reconcilia a diferença — visível no Livro.
-- ============================================================================

-- 1. Tabela de ajustes -------------------------------------------------------
create table if not exists ajustes_estoque (
  id              uuid primary key default gen_random_uuid(),
  data            date not null,
  substancia_id   uuid not null references substancias(id),
  numero_lote     text not null,
  saldo_sistema   integer not null,          -- saldo do lote no momento do ajuste (histórico)
  contagem_fisica integer not null,          -- o que foi contado fisicamente
  quantidade      integer not null,          -- delta assinado = contagem_fisica - saldo_sistema
  justificativa   text not null,             -- OBRIGATÓRIA (fiscalização)
  usuario_id      uuid references usuarios(id),
  is_dado_teste   boolean not null default false,
  created_at      timestamptz not null default now()
);

-- 2. Estende vw_movimentacoes com os ajustes ---------------------------------
create or replace view vw_movimentacoes
with (security_invoker = on) as
  with mov as (
    select l.data as data_movimento, 'entrada'::text as tipo, l.substancia_id, l.numero_lote,
           l.quantidade_entrada as quantidade, l.restrito_paciente_id as paciente_id,
           l.fonte as referencia, l.custo_unit, l.origem, l.is_dado_teste, l.data as ord
      from vw_lotes l
    union all
    select d.data, 'saida', d.substancia_id, d.numero_lote, d.quantidade,
           d.paciente_id, coalesce(d.referencia,'Dispensação'),
           coalesce((select custo_unit from vw_lotes v where v.numero_lote = d.numero_lote limit 1),0),
           null, d.is_dado_teste, d.data
      from dispensacoes d
    union all
    select r.data, 'devolucao', r.substancia_id, r.numero_lote, r.quantidade,
           r.paciente_id, 'Devolução — ' || coalesce(r.motivo,''),
           coalesce((select custo_unit from vw_lotes v where v.numero_lote = r.numero_lote limit 1),0),
           null, r.is_dado_teste, r.data
      from devolucoes r
    union all
    -- AJUSTES DE INVENTÁRIO (positivo = sobra encontrada; negativo = falta)
    select a.data,
           case when a.quantidade >= 0 then 'ajuste_entrada' else 'ajuste_saida' end,
           a.substancia_id, a.numero_lote, abs(a.quantidade),
           null::uuid, 'Ajuste de inventário — ' || a.justificativa,
           0::numeric, null::text, a.is_dado_teste, a.data
      from ajustes_estoque a
  )
  select
    'M' || lpad((row_number() over (order by data_movimento, tipo))::text, 4, '0') as folio,
    data_movimento, tipo, substancia_id, numero_lote, quantidade,
    paciente_id, referencia, custo_unit, origem, is_dado_teste
  from mov;

-- 3. Saldo por lote passa a considerar o ajuste ------------------------------
create or replace view vw_saldo_lote
with (security_invoker = on) as
  select substancia_id, numero_lote,
         sum(case when tipo in ('saida','ajuste_saida') then -quantidade else quantidade end) as saldo
    from vw_movimentacoes
   group by substancia_id, numero_lote;

-- 4. RLS na nova tabela ------------------------------------------------------
alter table ajustes_estoque enable row level security;
drop policy if exists p_auth_all on ajustes_estoque;
create policy p_auth_all on ajustes_estoque
  for all to authenticated using (true) with check (true);

-- 5. Limpeza de teste passa a incluir ajustes --------------------------------
create or replace function limpar_dados_teste()
returns text language plpgsql security definer as $$
declare total int := 0; n int;
begin
  delete from ajustes_estoque         where is_dado_teste; get diagnostics n = row_count; total := total + n;
  delete from carrinho_historico      where is_dado_teste; get diagnostics n = row_count; total := total + n;
  delete from carrinho_itens          where is_dado_teste; get diagnostics n = row_count; total := total + n;
  delete from carrinho_emergencia     where is_dado_teste; get diagnostics n = row_count; total := total + n;
  delete from devolucoes              where is_dado_teste; get diagnostics n = row_count; total := total + n;
  delete from dispensacoes            where is_dado_teste; get diagnostics n = row_count; total := total + n;
  delete from prescricoes             where is_dado_teste; get diagnostics n = row_count; total := total + n;
  delete from inventario_inicial      where is_dado_teste; get diagnostics n = row_count; total := total + n;
  delete from medicacao_propria_itens where is_dado_teste; get diagnostics n = row_count; total := total + n;
  delete from medicacao_propria       where is_dado_teste; get diagnostics n = row_count; total := total + n;
  delete from doacao_itens            where is_dado_teste; get diagnostics n = row_count; total := total + n;
  delete from doacoes                 where is_dado_teste; get diagnostics n = row_count; total := total + n;
  delete from nota_fiscal_itens       where is_dado_teste; get diagnostics n = row_count; total := total + n;
  delete from notas_fiscais           where is_dado_teste; get diagnostics n = row_count; total := total + n;
  delete from pacientes               where is_dado_teste; get diagnostics n = row_count; total := total + n;
  delete from fornecedores            where is_dado_teste; get diagnostics n = row_count; total := total + n;
  delete from prescritores            where is_dado_teste; get diagnostics n = row_count; total := total + n;
  delete from substancias             where is_dado_teste; get diagnostics n = row_count; total := total + n;
  delete from pops                    where is_dado_teste; get diagnostics n = row_count; total := total + n;
  return total || ' registros de teste removidos.';
end $$;

-- Fim da migração.
