-- ============================================================================
-- Hospital Reviva — migration_centros_custo.sql
--
-- Centro de custo para a saída de material: a farmácia passa a saber quanto
-- cada setor consome, que é o que falta hoje para fazer cotação com base em
-- consumo real em vez de chute.
--
-- Dois caminhos de baixa, como combinado:
--   REQUISIÇÃO  — um documento por entrega ao setor (data, setor, quem
--                 recebeu) com vários itens dentro. Serve de comprovante.
--   AVULSA      — uma linha só, para a saída do dia a dia.
--
-- POR QUE NÃO CRIEI TABELA DE ITENS DE REQUISIÇÃO:
--   Os itens da requisição SÃO linhas de `dispensacoes`, carregando
--   requisicao_id. Isso é de propósito. `dispensacoes` já é a tabela de saída
--   do sistema: vw_movimentacoes lê dela, vw_saldo_lote deriva de
--   vw_movimentacoes e vw_saldo_substancia deriva de vw_saldo_lote. Criando
--   tabela de itens separada, eu teria que recriar as três views para o saldo
--   voltar a fechar — e o banco real tem a migration_materiais_carrinho_v2
--   aplicada, que não está na minha cópia do repositório. Um
--   `create or replace view` meu apagaria em silêncio qualquer ramo que ela
--   tenha acrescentado, e o saldo quebraria sem aviso.
--
--   Com este desenho, NENHUMA VIEW É TOCADA. O saldo já sai certo, a saída já
--   aparece no Livro, e a trava de período fechado já vale — tudo porque passa
--   por `dispensacoes`, que já tem isso.
--
-- Aditiva e não-destrutiva. Duas execuções não duplicam.
-- Rodar UMA VEZ no SQL Editor. Faça um Exportar backup antes.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1) CENTROS DE CUSTO
--
-- O código curto existe para caber em relatório e cotação sem quebrar linha.
-- Nome e código são únicos para não nascer "Enfermagem" e "ENFERMAGEM" como
-- dois centros, o que arruinaria a soma de consumo.
-- ---------------------------------------------------------------------------

create table if not exists centros_custo (
  id            uuid primary key default gen_random_uuid(),
  codigo        text not null,
  nome          text not null,
  ativo         boolean not null default true,
  observacao    text,
  is_dado_teste boolean not null default false,
  created_at    timestamptz not null default now()
);

create unique index if not exists ux_centros_custo_codigo on centros_custo (codigo);
create unique index if not exists ux_centros_custo_nome   on centros_custo (nome);

insert into centros_custo (codigo, nome, is_dado_teste)
select v.cod, v.nome, false
from (values
  ('FAR', 'FARMACIA'),
  ('ENF', 'ENFERMAGEM'),
  ('COZ', 'COZINHA'),
  ('HIG', 'HIGIENIZACAO E LIMPEZA'),
  ('LAV', 'LAVANDERIA'),
  ('ADM', 'ADMINISTRACAO E RECEPCAO'),
  ('MAN', 'MANUTENCAO')
) as v(cod, nome)
where not exists (select 1 from centros_custo c where c.codigo = v.cod);


-- ---------------------------------------------------------------------------
-- 2) REQUISIÇÃO — só o cabeçalho
--
-- recebido_por é texto e não FK para usuarios porque quem recebe é gente do
-- setor (a técnica de enfermagem do plantão, a cozinheira), que não tem e não
-- precisa ter login no sistema da farmácia.
-- ---------------------------------------------------------------------------

create table if not exists requisicoes (
  id              uuid primary key default gen_random_uuid(),
  data            date not null,
  centro_custo_id uuid not null references centros_custo(id),
  recebido_por    text,
  observacao      text,
  usuario_id      uuid references usuarios(id),   -- quem atendeu, na farmácia
  is_dado_teste   boolean not null default false,
  created_at      timestamptz not null default now()
);

create index if not exists ix_requisicoes_data   on requisicoes (data);
create index if not exists ix_requisicoes_centro on requisicoes (centro_custo_id);


-- ---------------------------------------------------------------------------
-- 3) DISPENSAÇÕES GANHAM DESTINO
--
-- centro_custo_id = para qual setor saiu (null quando a saída é para paciente).
-- requisicao_id   = a qual requisição pertence (null quando é avulsa).
--
-- on delete set null na requisição: apagar um cabeçalho não pode apagar a
-- baixa de estoque nem deixar a linha apontando para o vazio — a saída
-- aconteceu de verdade e o saldo tem que continuar certo.
-- ---------------------------------------------------------------------------

alter table dispensacoes add column if not exists centro_custo_id uuid references centros_custo(id);
alter table dispensacoes add column if not exists requisicao_id   uuid references requisicoes(id) on delete set null;

create index if not exists ix_dispensacoes_centro     on dispensacoes (centro_custo_id);
create index if not exists ix_dispensacoes_requisicao on dispensacoes (requisicao_id);

-- Toda saída tem que ter destino: paciente OU centro de custo. Saída sem
-- nenhum dos dois é consumo invisível, que é exatamente o que impede a cotação
-- de fechar hoje.
--
-- NOT VALID de propósito: vale para lançamento novo e não vai conferir as
-- linhas antigas, que são todas de paciente. Se quiser validar o histórico
-- depois: alter table dispensacoes validate constraint ck_dispensacao_destino;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ck_dispensacao_destino') then
    alter table dispensacoes
      add constraint ck_dispensacao_destino
      check (paciente_id is not null or centro_custo_id is not null) not valid;
  end if;
end $$;


-- ---------------------------------------------------------------------------
-- 4) RLS — mesmo padrão do schema (autenticado lê e escreve)
--
-- Tabela nova sem RLS no Supabase fica exposta pela API. Então as duas novas
-- entram no mesmo regime das outras, não fora dele.
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['centros_custo','requisicoes'] loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists p_auth_all on %I;', t);
    execute format($f$
      create policy p_auth_all on %I
        for all to authenticated
        using (true) with check (true);
    $f$, t);
  end loop;
end $$;


-- ---------------------------------------------------------------------------
-- 5) TRAVA DE PERÍODO FECHADO na requisição
--
-- `dispensacoes` já está travada. A requisição também precisa estar, senão dá
-- para criar cabeçalho em mês fechado. A função usa new.data, e requisicoes
-- tem coluna `data` — funciona sem alteração nela.
--
-- Só aplica se a trava já existir no banco (trava_periodo_fechado.sql).
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_proc where proname = 'fn_bloqueia_periodo_fechado') then
    drop trigger if exists tg_periodo_fechado on requisicoes;
    create trigger tg_periodo_fechado before insert or update on requisicoes
      for each row execute function fn_bloqueia_periodo_fechado();
    raise notice 'trava de periodo aplicada em requisicoes';
  else
    raise notice 'fn_bloqueia_periodo_fechado nao existe — rode trava_periodo_fechado.sql depois';
  end if;
end $$;


-- ---------------------------------------------------------------------------
-- 6) CONSUMO POR CENTRO DE CUSTO — a view que alimenta a cotação
--
-- Uma linha por setor + item + mês, com quantidade e valor. O custo vem do
-- lote de onde a saída foi dada (casando substância E lote, não só lote), para
-- o valor não mudar quando o mesmo número de lote existir em dois itens.
-- ---------------------------------------------------------------------------

create or replace view vw_consumo_centro_custo
with (security_invoker = on) as
  select cc.id                                 as centro_custo_id,
         cc.codigo                             as centro_codigo,
         cc.nome                               as centro_custo,
         s.id                                  as substancia_id,
         s.nome                                as substancia,
         s.unidade,
         date_trunc('month', d.data)::date      as mes,
         sum(d.quantidade)                      as quantidade,
         round(sum(d.quantidade * coalesce(
           (select l.custo_unit from vw_lotes l
             where l.substancia_id = d.substancia_id
               and l.numero_lote   = d.numero_lote
             limit 1), 0)), 2)                  as valor
    from dispensacoes d
    join centros_custo cc on cc.id = d.centro_custo_id
    join substancias   s  on s.id  = d.substancia_id
   where coalesce(d.is_dado_teste, false) = false
   group by cc.id, cc.codigo, cc.nome, s.id, s.nome, s.unidade,
            date_trunc('month', d.data);


-- ---------------------------------------------------------------------------
-- 7) REQUISIÇÕES COM TOTAIS — para a tela e para o comprovante
-- ---------------------------------------------------------------------------

create or replace view vw_requisicoes
with (security_invoker = on) as
  select r.id, r.data, r.centro_custo_id, cc.codigo as centro_codigo,
         cc.nome as centro_custo, r.recebido_por, r.observacao, r.usuario_id,
         count(d.id)                as itens,
         coalesce(sum(d.quantidade), 0) as unidades,
         round(coalesce(sum(d.quantidade * coalesce(
           (select l.custo_unit from vw_lotes l
             where l.substancia_id = d.substancia_id
               and l.numero_lote   = d.numero_lote
             limit 1), 0)), 0), 2)   as valor,
         r.is_dado_teste
    from requisicoes r
    join centros_custo cc on cc.id = r.centro_custo_id
    left join dispensacoes d on d.requisicao_id = r.id
   group by r.id, r.data, r.centro_custo_id, cc.codigo, cc.nome,
            r.recebido_por, r.observacao, r.usuario_id, r.is_dado_teste;


-- ---------------------------------------------------------------------------
-- 8) CONFERÊNCIA
-- ---------------------------------------------------------------------------

-- 8.1 Os 7 centros de custo entraram?
select codigo, nome, ativo from centros_custo order by codigo;

-- 8.2 As colunas novas estão em dispensacoes?
select column_name, data_type, is_nullable
  from information_schema.columns
 where table_name = 'dispensacoes'
   and column_name in ('centro_custo_id','requisicao_id')
 order by column_name;

-- 8.3 A trava de período pegou a requisição? Devem aparecer dispensacoes e
--     requisicoes, entre as outras.
select c.relname as tabela, t.tgname as gatilho
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
 where t.tgname = 'tg_periodo_fechado'
 order by c.relname;

-- 8.4 As views novas respondem? (vazias agora, até a primeira baixa)
select * from vw_consumo_centro_custo limit 5;
select * from vw_requisicoes limit 5;


-- ============================================================================
-- COMO LANÇAR, ATÉ A TELA EXISTIR
--
-- REQUISIÇÃO (cabeçalho + itens). Troque o setor, a data, quem recebeu e os
-- itens. Os itens saem do lote que você escolher — confira o saldo do lote em
-- vw_saldo_lote antes, porque a trava de saldo negativo hoje está na tela, não
-- no banco.
--
-- with r as (
--   insert into requisicoes (data, centro_custo_id, recebido_por, is_dado_teste)
--   select current_date, cc.id, 'MARIA — TEC. ENFERMAGEM PLANTAO DIURNO', false
--     from centros_custo cc where cc.codigo = 'ENF'
--   returning id, data, centro_custo_id
-- )
-- insert into dispensacoes
--   (data, substancia_id, numero_lote, quantidade, referencia,
--    centro_custo_id, requisicao_id, is_dado_teste)
-- select r.data, s.id, v.lote, v.qtd, 'Requisição de setor',
--        r.centro_custo_id, r.id, false
--   from r
--   cross join (values
--     ('CATETER PERIFERICO N. 20', '0019794', 20),
--     ('SERINGA 1ML (INSULINA) C/ AGULHA', '0000264', 30),
--     ('GARROTE', '0000321', 2)
--   ) as v(nome, lote, qtd)
--   join substancias s on s.nome = v.nome;
--
-- SAÍDA AVULSA (uma linha, sem cabeçalho):
--
-- insert into dispensacoes
--   (data, substancia_id, numero_lote, quantidade, referencia,
--    centro_custo_id, is_dado_teste)
-- select current_date, s.id, '0020978', 10, 'Saída avulsa',
--        (select id from centros_custo where codigo = 'HIG'), false
--   from substancias s where s.nome = 'TOUCA DESCARTAVEL';
--
-- ============================================================================
-- OBSERVAÇÕES PARA O RESPONSÁVEL TÉCNICO
--
-- 1. O LIVRO VAI MOSTRAR MATERIAL JUNTO COM MEDICAMENTO.
--    A tela de escrituração lê vw_movimentacoes, que agora inclui as saídas de
--    material, e o filtro de lista ("—", B1, C1) é opcional: por padrão a tela
--    mostra tudo. Material não é escriturável pela 344/98, então para imprimir
--    o Livro filtre por lista antes. Isso é limitação de tela, não do dado — e
--    é um dos ajustes que eu faria junto com a tela de requisição.
--
-- 2. A TRAVA DE SALDO NEGATIVO ESTÁ NA TELA, NÃO NO BANCO.
--    dose.js confere o saldo do lote antes de gravar (validarSaidaLote). Os
--    lançamentos de material por SQL acima não passam por essa conferência:
--    confira vw_saldo_lote antes, ou aceite que um erro de digitação pode
--    deixar saldo negativo até o próximo ajuste. Quando a tela de requisição
--    existir, ela usa a mesma trava.
--
-- 3. A LIMPEZA DE DADOS DE TESTE NÃO CONHECE AS TABELAS NOVAS.
--    fn_limpa_dados_teste apaga por tabela, em ordem de dependência, e não
--    inclui requisicoes nem centros_custo. Como dispensacoes.requisicao_id é
--    on delete set null, nada quebra — só sobram cabeçalhos de teste, se você
--    criar algum. Se quiser, acrescento as duas na função numa próxima.
--
-- 4. CONSUMO DO CARRINHO É CONSUMO DA FARMÁCIA.
--    Quando repor o carrinho depois de um rompimento de lacre, lance a saída
--    no centro FAR com referência "Reposição do carrinho de emergência". Assim
--    o consumo do carrinho fica separado do consumo da enfermagem no dia a
--    dia, e dá para ver quanto o carrinho custa por ano.
--
-- 5. O QUE ISSO DESTRAVA NA COTAÇÃO.
--    Depois de dois ou três meses de baixa lançada, vw_consumo_centro_custo
--    responde "quanto de luva a enfermagem gasta por mês" — que é a conta que
--    falta hoje para dimensionar a compra. Antes disso a view existe mas
--    responde vazio: ela só sabe o que foi lançado.
-- ============================================================================
