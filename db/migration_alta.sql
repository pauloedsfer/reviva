-- ============================================================================
-- Hospital Reviva — migration_alta.sql
-- ALTA DE PACIENTE + DESTINO DA CUSTÓDIA.
-- Na alta, as medicações de custódia do paciente ficam "aguardando retirada".
-- O farmacêutico decide depois, item a item e a qualquer momento:
--   devolver à família (com Termo de Devolução) ou integrar ao estoque.
-- Cada decisão é um EVENTO nesta tabela — o status é derivado, nada é editado
-- à mão, e o razão continua íntegro.
-- Rodar UMA VEZ no SQL Editor do Supabase. Aditivo e não-destrutivo.
-- ============================================================================

create table if not exists custodia_destinos (
  id                        uuid primary key default gen_random_uuid(),
  data                      date not null,
  medicacao_propria_item_id uuid not null references medicacao_propria_itens(id) on delete cascade,
  tipo                      text not null check (tipo in ('devolucao_familia','integracao_estoque','descarte')),
  quantidade                integer not null check (quantidade > 0),
  obs                       text,
  usuario_id                uuid references usuarios(id),
  is_dado_teste             boolean not null default false,
  created_at                timestamptz not null default now()
);

alter table custodia_destinos enable row level security;
drop policy if exists p_auth_all on custodia_destinos;
create policy p_auth_all on custodia_destinos
  for all to authenticated using (true) with check (true);

-- Limpeza de teste passa a incluir os destinos de custódia
create or replace function limpar_dados_teste()
returns text language plpgsql security definer as $$
declare total int := 0; n int;
  sub_t uuid[] := array(select id from substancias where is_dado_teste);
  pac_t uuid[] := array(select id from pacientes  where is_dado_teste);
  pre_t uuid[] := array(select id from prescritores where is_dado_teste);
begin
  delete from custodia_destinos where is_dado_teste
     or medicacao_propria_item_id in (
        select mi.id from medicacao_propria_itens mi
          join medicacao_propria m on m.id = mi.medicacao_propria_id
         where mi.is_dado_teste or m.is_dado_teste or m.paciente_id = any(pac_t) or mi.substancia_id = any(sub_t));
  get diagnostics n = row_count; total := total + n;

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

-- ---------------------------------------------------------------------------
-- Views: destinos de custódia entram no razão do banco (consistência com o app)
-- Devolução à família / descarte = saída do lote de custódia.
-- Integração ao estoque não movimenta saldo (muda a natureza do lote no app).
-- ---------------------------------------------------------------------------
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
    select a.data,
           case when a.quantidade >= 0 then 'ajuste_entrada' else 'ajuste_saida' end,
           a.substancia_id, a.numero_lote, abs(a.quantidade),
           null::uuid, 'Ajuste de inventário — ' || a.justificativa,
           0::numeric, null::text, a.is_dado_teste, a.data
      from ajustes_estoque a
    union all
    -- destino de custódia (devolução à família / descarte) = saída do lote próprio
    select cd.data, 'saida', mi.substancia_id, mi.numero_lote, cd.quantidade,
           m.paciente_id,
           case cd.tipo when 'devolucao_familia' then 'Devolução de custódia à família' else 'Descarte de custódia' end
             || coalesce(' — ' || cd.obs, ''),
           0::numeric, 'proprio', cd.is_dado_teste, cd.data
      from custodia_destinos cd
      join medicacao_propria_itens mi on mi.id = cd.medicacao_propria_item_id
      join medicacao_propria m on m.id = mi.medicacao_propria_id
     where cd.tipo in ('devolucao_familia','descarte')
  )
  select
    'M' || lpad((row_number() over (order by data_movimento, tipo))::text, 4, '0') as folio,
    data_movimento, tipo, substancia_id, numero_lote, quantidade,
    paciente_id, referencia, custo_unit, origem, is_dado_teste
  from mov;
