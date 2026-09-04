-- ============================================================================
-- Hospital Reviva — trava_periodo_fechado.sql
--
-- A trava de período fechado passa a valer NO BANCO, não só na tela.
-- Validação de tela protege contra o engano do dia a dia, mas não contra
-- uma aba antiga aberta, um script, ou o próprio SQL Editor. Como o
-- fechamento é o que garante que a escrituração transmitida não muda,
-- ele precisa ser aplicado no banco.
--
-- Depende de: migration_fechamento_mensal.sql aplicada.
-- Rodar UMA VEZ.
-- ============================================================================

create or replace function fn_bloqueia_periodo_fechado()
returns trigger language plpgsql as $$
declare
  v_fech date;
  v_data date;
begin
  select fechamento_ate into v_fech from estabelecimento order by created_at limit 1;
  if v_fech is null then return new; end if;

  -- a coluna de data varia conforme a tabela
  v_data := case TG_TABLE_NAME
              when 'notas_fiscais' then new.data_emissao
              else new.data
            end;
  if v_data is null then return new; end if;

  if v_data <= v_fech then
    raise exception
      'Período fechado: a escrituração está fechada até %. Lançamento em % não é permitido. Faça a correção em data do período aberto ou reabra o fechamento.',
      to_char(v_fech, 'DD/MM/YYYY'), to_char(v_data, 'DD/MM/YYYY')
      using errcode = 'P0001';
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Aplica em todas as tabelas cujo lançamento afeta a escrituração
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'dispensacoes', 'devolucoes', 'ajustes_estoque', 'notas_fiscais',
    'doacoes', 'medicacao_propria', 'inventario_inicial',
    'custodia_destinos', 'transferencias_custodia'
  ] loop
    if exists (select 1 from information_schema.tables
               where table_schema = 'public' and table_name = t) then
      execute format('drop trigger if exists tg_periodo_fechado on public.%I', t);
      execute format(
        'create trigger tg_periodo_fechado before insert or update on public.%I
         for each row execute function fn_bloqueia_periodo_fechado()', t);
      raise notice 'trava aplicada em %', t;
    end if;
  end loop;
end $$;

-- ============================================================================
-- CONFERÊNCIA
-- ============================================================================
select c.relname as tabela, t.tgname as gatilho
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
where t.tgname = 'tg_periodo_fechado'
order by c.relname;

-- ----------------------------------------------------------------------------
-- COMO TESTAR (opcional)
--
--   update estabelecimento set fechamento_ate = '2026-08-31';
--   insert into dispensacoes (data, substancia_id, numero_lote, quantidade,
--                             referencia, paciente_id)
--   values ('2026-08-20', <id>, 'X', 1, 'teste', <id>);
--   -- deve falhar com "Período fechado: ..."
--
-- Para reabrir:
--   update estabelecimento set fechamento_ate = null;
-- ----------------------------------------------------------------------------
