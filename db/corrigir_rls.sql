-- ============================================================================
-- Hospital Reviva — corrigir_rls.sql
-- Corrige o erro "new row violates row-level security policy".
--
-- CAUSA: a tabela está com RLS (Row Level Security) ativado mas SEM a política
-- que autoriza o usuário autenticado a gravar. Sem política, o Postgres bloqueia
-- toda inserção — mesmo com login válido.
--
-- Este script tem duas partes:
--   PARTE 1 — DIAGNÓSTICO (só consulta, não altera nada)
--   PARTE 2 — CORREÇÃO (recria a política em todas as tabelas)
--
-- Rode a PARTE 1 primeiro para ver o estado. Depois a PARTE 2.
-- Seguro de repetir.
-- ============================================================================


-- ============================================================================
-- PARTE 1 — DIAGNÓSTICO  (rode sozinha primeiro)
-- Lista cada tabela, se o RLS está ativo e quantas políticas existem.
-- As tabelas com PROBLEMA aparecem no topo: RLS ativo e ZERO políticas.
-- ============================================================================
select
  c.relname                                as tabela,
  c.relrowsecurity                         as rls_ativo,
  count(p.polname)                         as politicas,
  coalesce(string_agg(p.polname, ', '), '—') as nomes_das_politicas,
  case
    when c.relrowsecurity and count(p.polname) = 0
      then '*** BLOQUEADA — RLS ativo sem política ***'
    when not c.relrowsecurity
      then 'RLS desativado (grava, mas sem proteção)'
    else 'OK'
  end                                      as situacao
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policy p on p.polrelid = c.oid
where n.nspname = 'public' and c.relkind = 'r'
group by c.relname, c.relrowsecurity
order by (c.relrowsecurity and count(p.polname) = 0) desc, c.relname;


-- ============================================================================
-- PARTE 2 — CORREÇÃO
-- Ativa o RLS e recria a política padrão do sistema (p_auth_all) em TODAS as
-- tabelas do schema public — inclusive as criadas por migrações posteriores
-- (ajustes_estoque, cotacoes, cotacao_itens, cotacao_precos, custodia_destinos),
-- que podem ter ficado sem política.
--
-- A política mantém a regra já usada pelo sistema: usuário autenticado pode
-- ler e gravar. Quem não está autenticado não acessa nada.
-- ============================================================================
do $$
declare t record;
begin
  for t in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
  loop
    execute format('alter table public.%I enable row level security', t.relname);
    execute format('drop policy if exists p_auth_all on public.%I', t.relname);
    execute format(
      'create policy p_auth_all on public.%I for all to authenticated using (true) with check (true)',
      t.relname);
  end loop;
end $$;


-- ============================================================================
-- CONFERÊNCIA — rode depois da PARTE 2. Toda linha deve mostrar "OK".
-- ============================================================================
select
  c.relname as tabela,
  c.relrowsecurity as rls_ativo,
  count(p.polname) as politicas,
  case when c.relrowsecurity and count(p.polname) > 0 then 'OK' else 'VERIFICAR' end as situacao
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policy p on p.polrelid = c.oid
where n.nspname = 'public' and c.relkind = 'r'
group by c.relname, c.relrowsecurity
order by c.relname;
