-- ============================================================================
-- Hospital Reviva — corrigir_trava_periodo_fechado.sql
--
-- CORREÇÃO DE DEFEITO. A trava de período fechado, hoje, não trava: ela
-- QUEBRA. Em vez de permitir ou bloquear, toda tentativa de lançamento gera
--
--     ERROR: record "new" has no field "data_emissao"
--
-- em dispensacoes, devolucoes, ajustes_estoque, doacoes, medicacao_propria,
-- inventario_inicial, custodia_destinos e transferencias_custodia — todas as
-- tabelas travadas, exceto notas_fiscais.
--
-- POR QUE: a função usa uma expressão CASE para escolher a coluna de data —
--
--     v_data := case TG_TABLE_NAME
--                 when 'notas_fiscais' then new.data_emissao
--                 else new.data
--               end;
--
-- O PL/pgSQL compila essa atribuição como UMA consulta SQL só, então resolve
-- new.data_emissao e new.data ao mesmo tempo, independente de qual ramo o CASE
-- vai escolher. Em tabela que não tem a coluna data_emissao — que são todas,
-- menos notas_fiscais — a referência não resolve e a função estoura. O CASE
-- nunca chega a decidir nada.
--
-- POR QUE NINGUÉM VIU AINDA: a função sai antes disso quando
-- estabelecimento.fechamento_ate é null —
--
--     if v_fech is null then return new; end if;
--
-- Enquanto nenhum mês estiver fechado, a trava não executa a parte defeituosa
-- e tudo funciona. O defeito aparece no instante em que você fechar o primeiro
-- mês: a partir dali, NENHUMA dispensação entra, em nenhuma data, nem no
-- período aberto. A farmácia para.
--
-- Hoje, portanto, valem as duas coisas ao mesmo tempo: a trava que foi
-- instalada para o item 07 da notificação não protege nada, e ligá-la
-- derruba o sistema.
--
-- A CORREÇÃO: ler a data por to_jsonb(new), que resolve em tempo de execução e
-- não exige que a coluna exista no tipo. Funciona para qualquer tabela travada,
-- inclusive as que vierem depois, sem precisar listar nome de coluna.
--
-- Aditiva: só substitui a função. Os gatilhos continuam os mesmos.
-- Rodar UMA VEZ no SQL Editor. Faça um Exportar backup antes.
-- ============================================================================

create or replace function fn_bloqueia_periodo_fechado()
returns trigger language plpgsql as $$
declare
  v_fech date;
  v_data date;
  v_json jsonb;
begin
  select fechamento_ate into v_fech from estabelecimento order by created_at limit 1;
  if v_fech is null then return new; end if;

  -- A coluna de data varia conforme a tabela: `data` na maioria,
  -- `data_emissao` em notas_fiscais. Resolver por jsonb em vez de referenciar
  -- new.<coluna> direto é o que evita o erro de compilação em tabela que não
  -- tem a outra coluna — era esse o defeito.
  v_json := to_jsonb(new);
  v_data := coalesce(
              nullif(v_json ->> 'data', ''),
              nullif(v_json ->> 'data_emissao', '')
            )::date;

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
-- CONFERÊNCIA
-- ---------------------------------------------------------------------------

-- 1. Quais tabelas estão travadas (o gatilho não mudou, só a função).
select c.relname as tabela, t.tgname as gatilho
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
 where t.tgname = 'tg_periodo_fechado'
 order by c.relname;

-- 2. Há mês fechado hoje? Se vier null, a trava nunca executou — e o defeito
--    acima nunca apareceu porque a função saía antes dele.
select fechamento_ate from estabelecimento order by created_at limit 1;

-- 3. TESTE EM TRANSAÇÃO QUE NÃO GRAVA NADA.
--    Rode o bloco abaixo inteiro. Ele fecha o período, tenta uma dispensação
--    em data fechada (tem que dar "Período fechado", não "has no field"),
--    e desfaz tudo no rollback. Troque o lote por um que exista aí.
--
-- begin;
--   update estabelecimento set fechamento_ate = current_date;
--   insert into dispensacoes (data, substancia_id, numero_lote, quantidade,
--                             centro_custo_id, is_dado_teste)
--   select current_date, s.id, '0020978', 1,
--          (select id from centros_custo where codigo = 'HIG'), false
--     from substancias s where s.nome = 'TOUCA DESCARTAVEL';
-- rollback;
--
--    Esperado: ERROR com a mensagem "Período fechado: a escrituração está
--    fechada até ...". Se vier "record new has no field data_emissao", a
--    função não foi substituída.


-- ============================================================================
-- OBSERVAÇÕES PARA O RESPONSÁVEL TÉCNICO
--
-- 1. ANTES DE FECHAR O PRIMEIRO MÊS, RODE ESTE ARQUIVO.
--    Essa é a ordem que importa. Se fechar o mês antes de corrigir, a farmácia
--    para de dispensar e a mensagem de erro não vai dizer por quê — ela fala
--    de um campo data_emissao que nada tem a ver com dispensação.
--
-- 2. O ITEM 07 DA NOTIFICAÇÃO DEPENDE DISSO.
--    Rastreabilidade de alterações pressupõe que o período fechado realmente
--    não aceite lançamento. Hoje, com fechamento_ate null, qualquer data é
--    aceita em qualquer tabela — a trava existe no banco e não faz efeito.
--    Vale conferir a consulta 2 acima antes de afirmar à fiscal que o período
--    fechado está protegido.
--
-- 3. COMO ISSO APARECEU.
--    Montei a cadeia de migrações num Postgres 16 limpo para testar a
--    migração de centros de custo, e a trava no primeiro teste deixou passar
--    um lançamento em mês fechado. O motivo era a tabela estabelecimento
--    vazia, que faz a função sair antes por desenho. Ao criar a linha e
--    repetir, apareceu o erro de campo — nas duas tabelas, a nova e a antiga.
--    O defeito é anterior ao meu arquivo e atinge o sistema inteiro.
-- ============================================================================
