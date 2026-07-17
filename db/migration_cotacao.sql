-- ============================================================================
-- Hospital Reviva — migration_cotacao.sql
-- Módulo de COTAÇÃO (Fase A). Cria as tabelas, RLS, e prepara a tabela de
-- preços por fornecedor para a Fase B (comparação/pedido). Aditivo e seguro.
-- Rodar UMA VEZ no SQL Editor do Supabase, depois do schema já existente.
-- ============================================================================

-- 1. Cotação (cabeçalho)
create table if not exists cotacoes (
  id            uuid primary key default gen_random_uuid(),
  identificador text,                       -- ex.: COT-2026-001
  data          date not null default current_date,
  status        text not null default 'aberta' check (status in ('aberta','enviada','finalizada')),
  observacao    text,
  usuario_id    uuid references usuarios(id),
  is_dado_teste boolean not null default false,
  created_at    timestamptz not null default now()
);

-- 2. Itens a cotar (pode referenciar uma substância cadastrada OU ser item livre)
create table if not exists cotacao_itens (
  id            uuid primary key default gen_random_uuid(),
  cotacao_id    uuid not null references cotacoes(id) on delete cascade,
  substancia_id uuid references substancias(id),   -- opcional
  descricao     text not null,                      -- descrição a cotar (snapshot)
  unidade       text,                               -- comp., amp., frasco…
  quantidade    numeric not null default 0,
  ordem         integer default 0,
  is_dado_teste boolean not null default false,
  created_at    timestamptz not null default now()
);

-- 3. Preços por fornecedor (Fase B — preenchido quando as cotações voltam)
create table if not exists cotacao_precos (
  id              uuid primary key default gen_random_uuid(),
  cotacao_item_id uuid not null references cotacao_itens(id) on delete cascade,
  fornecedor_id   uuid not null references fornecedores(id) on delete cascade,
  disponivel      boolean not null default true,
  unid_por_caixa  numeric,
  preco_caixa     numeric(12,2),
  validade        date,
  created_at      timestamptz not null default now()
);

-- 4. RLS
do $$
declare t text;
begin
  foreach t in array array['cotacoes','cotacao_itens','cotacao_precos'] loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists p_auth_all on %I;', t);
    execute format('create policy p_auth_all on %I for all to authenticated using (true) with check (true);', t);
  end loop;
end $$;

-- 5. Limpeza de teste passa a incluir as cotações (função robusta atual + cotação)
create or replace function limpar_dados_teste()
returns text language plpgsql security definer as $$
declare total int := 0; n int;
  sub_t uuid[] := array(select id from substancias where is_dado_teste);
  pac_t uuid[] := array(select id from pacientes  where is_dado_teste);
  pre_t uuid[] := array(select id from prescritores where is_dado_teste);
begin
  delete from cotacao_precos where cotacao_item_id in (select id from cotacao_itens where is_dado_teste or cotacao_id in (select id from cotacoes where is_dado_teste));
  get diagnostics n = row_count; total := total + n;
  delete from cotacao_itens where is_dado_teste or cotacao_id in (select id from cotacoes where is_dado_teste);
  get diagnostics n = row_count; total := total + n;
  delete from cotacoes where is_dado_teste;
  get diagnostics n = row_count; total := total + n;

  delete from ajustes_estoque where is_dado_teste or substancia_id = any(sub_t);
  get diagnostics n = row_count; total := total + n;
  delete from carrinho_historico where is_dado_teste or carrinho_id in (select id from carrinho_emergencia where is_dado_teste);
  get diagnostics n = row_count; total := total + n;
  delete from carrinho_itens where is_dado_teste or carrinho_id in (select id from carrinho_emergencia where is_dado_teste);
  get diagnostics n = row_count; total := total + n;
  delete from carrinho_emergencia where is_dado_teste;
  get diagnostics n = row_count; total := total + n;
  delete from devolucoes where is_dado_teste or paciente_id = any(pac_t) or substancia_id = any(sub_t);
  get diagnostics n = row_count; total := total + n;
  delete from dispensacoes where is_dado_teste or paciente_id = any(pac_t) or substancia_id = any(sub_t) or prescricao_id in (select id from prescricoes where is_dado_teste);
  get diagnostics n = row_count; total := total + n;
  delete from prescricoes where is_dado_teste or paciente_id = any(pac_t) or substancia_id = any(sub_t) or prescritor_id = any(pre_t);
  get diagnostics n = row_count; total := total + n;
  delete from inventario_inicial where is_dado_teste or substancia_id = any(sub_t);
  get diagnostics n = row_count; total := total + n;
  delete from medicacao_propria_itens where is_dado_teste or substancia_id = any(sub_t) or medicacao_propria_id in (select id from medicacao_propria where is_dado_teste or paciente_id = any(pac_t));
  get diagnostics n = row_count; total := total + n;
  delete from medicacao_propria where is_dado_teste or paciente_id = any(pac_t);
  get diagnostics n = row_count; total := total + n;
  delete from doacao_itens where is_dado_teste or substancia_id = any(sub_t) or doacao_id in (select id from doacoes where is_dado_teste);
  get diagnostics n = row_count; total := total + n;
  delete from doacoes where is_dado_teste;
  get diagnostics n = row_count; total := total + n;
  delete from nota_fiscal_itens where is_dado_teste or substancia_id = any(sub_t) or nota_fiscal_id in (select id from notas_fiscais where is_dado_teste);
  get diagnostics n = row_count; total := total + n;
  delete from notas_fiscais where is_dado_teste or fornecedor_id in (select id from fornecedores where is_dado_teste);
  get diagnostics n = row_count; total := total + n;
  update pacientes set prescritor_id = null where prescritor_id = any(pre_t) and not is_dado_teste;
  delete from pacientes    where is_dado_teste; get diagnostics n = row_count; total := total + n;
  delete from fornecedores where is_dado_teste; get diagnostics n = row_count; total := total + n;
  delete from prescritores where is_dado_teste; get diagnostics n = row_count; total := total + n;
  delete from substancias  where is_dado_teste; get diagnostics n = row_count; total := total + n;
  delete from pops         where is_dado_teste; get diagnostics n = row_count; total := total + n;
  return total || ' registros de teste (e dependências) removidos.';
end $$;

-- Fim da migração.
