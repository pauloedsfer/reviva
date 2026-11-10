-- ============================================================================
-- Hospital Reviva — migration_insumos_aplicacao.sql
--
-- Insumo consumido por APLICAÇÃO de injetável, lançado na conta do paciente.
-- Hoje a seringa e a agulha saem do estoque sem registro: o paciente leva o
-- haloperidol na conta e não leva o material com que ele foi aplicado, e a
-- farmácia não tem consumo de seringa para cotar.
--
-- DUAS DECISÕES DE DESENHO, PARA NÃO SEREM DESFEITAS SEM QUERER:
--
-- 1. A REGRA É POR GRUPO, NÃO POR ITEM.
--    "SERINGA" é um grupo com 3, 5, 10 e 20 mL dentro; uma delas é o padrão.
--    Na aplicação sai UM item do grupo — o padrão, ou outro que o farmacêutico
--    troque na hora, porque quem decide o calibre é o enfermeiro no momento da
--    aplicação. Sem o grupo, ou a seringa ficava fixa em 5 mL (e o consumo
--    real nunca batia), ou cada tamanho viraria uma regra solta e sairiam
--    quatro seringas por aplicação.
--
-- 2. O INSUMO É FILHO DA DOSE (insumo_de), com ON DELETE CASCADE.
--    Estornar a dose tem que estornar a seringa junto. Se a ligação não
--    existisse, o estorno devolveria o medicamento ao estoque e deixaria a
--    seringa baixada na conta do paciente — erro silencioso, que só apareceria
--    no inventário meses depois.
--
-- O QUE ESTA MIGRAÇÃO NÃO FAZ, DE PROPÓSITO: álcool 70% e algodão não entram
-- aqui. Frasco de 1 L e rolo de 500 g não têm dose por aplicação, e qualquer
-- quantidade por paciente seria inventada. Esses são consumo de setor e saem
-- por centro de custo (migration_centros_custo.sql).
--
-- Aditiva e não-destrutiva. Duas execuções não duplicam.
-- Rodar UMA VEZ no SQL Editor. Faça um Exportar backup antes.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1) REGRAS DE INSUMO POR APLICAÇÃO
--
-- `forma`         — a qual forma farmacêutica a regra geral se aplica.
--                   Hoje só 'injetavel'; o campo existe para a regra não
--                   precisar de outra tabela quando aparecer outra forma.
-- `substancia_id` — quando preenchido, a regra vale só para aquele
--                   medicamento e substitui a regra geral da forma. É o
--                   escape para o decanoato, que pede agulha mais longa.
-- `padrao`        — o item do grupo que já vem selecionado.
-- `ordem`         — como os itens do grupo aparecem no seletor.
-- ---------------------------------------------------------------------------

create table if not exists insumos_aplicacao (
  id            uuid primary key default gen_random_uuid(),
  grupo         text not null,
  insumo_id     uuid not null references substancias(id),
  quantidade    numeric not null default 1 check (quantidade > 0),
  padrao        boolean not null default false,
  forma         text not null default 'injetavel',
  substancia_id uuid references substancias(id) on delete cascade,
  ativo         boolean not null default true,
  ordem         integer not null default 0,
  observacao    text,
  is_dado_teste boolean not null default false,
  created_at    timestamptz not null default now()
);

-- O mesmo insumo não pode entrar duas vezes no mesmo grupo. Dois índices
-- parciais porque substancia_id é nulo na regra geral, e NULL não colide com
-- NULL num índice único comum.
create unique index if not exists ux_insumo_apl_geral
  on insumos_aplicacao (forma, grupo, insumo_id) where substancia_id is null;
create unique index if not exists ux_insumo_apl_sub
  on insumos_aplicacao (substancia_id, grupo, insumo_id) where substancia_id is not null;

-- Um padrão por grupo. Dois padrões fariam a tela escolher o primeiro que
-- viesse do banco, que muda de ordem sem aviso.
create unique index if not exists ux_insumo_apl_padrao_geral
  on insumos_aplicacao (forma, grupo) where padrao and ativo and substancia_id is null;
create unique index if not exists ux_insumo_apl_padrao_sub
  on insumos_aplicacao (substancia_id, grupo) where padrao and ativo and substancia_id is not null;

create index if not exists ix_insumo_apl_grupo on insumos_aplicacao (grupo);


-- ---------------------------------------------------------------------------
-- 2) A SAÍDA DO INSUMO É FILHA DA SAÍDA DA DOSE
--
-- Nada de tabela nova para o lançamento: o insumo É uma linha de
-- `dispensacoes`, como a dose. Assim o saldo, o custo, o Livro e a trava de
-- período fechado já valem para ele, sem tocar em nenhuma view — o mesmo
-- motivo pelo qual a requisição de setor também mora em `dispensacoes`.
-- ---------------------------------------------------------------------------

alter table dispensacoes add column if not exists insumo_de uuid
  references dispensacoes(id) on delete cascade;

create index if not exists ix_dispensacoes_insumo_de on dispensacoes (insumo_de);


-- ---------------------------------------------------------------------------
-- 3) RLS — mesmo regime das outras tabelas
--
-- Tabela nova sem RLS no Supabase fica exposta pela API.
-- ---------------------------------------------------------------------------

alter table insumos_aplicacao enable row level security;
drop policy if exists p_auth_all on insumos_aplicacao;
create policy p_auth_all on insumos_aplicacao
  for all to authenticated using (true) with check (true);


-- ---------------------------------------------------------------------------
-- 4) CARGA INICIAL DO GRUPO SERINGA
--
-- Entra toda substância de material cujo nome tenha SERINGA, para os tamanhos
-- aparecerem no seletor sem digitação. O padrão é a de 5 mL, que é a que a
-- enfermagem usa na maioria das aplicações; se o nome não disser 5 mL em
-- nenhum item, nenhum fica como padrão e a tela de Configurações pede a
-- escolha — melhor do que eleger um calibre no escuro.
--
-- Só carrega se o grupo estiver vazio: rodar de novo não desfaz o que você
-- tiver ajustado na tela.
-- ---------------------------------------------------------------------------

insert into insumos_aplicacao (grupo, insumo_id, quantidade, padrao, forma, ordem)
select 'SERINGA', s.id, 1,
       -- 5 mL é padrão. \m e \M prendem o "5ML" entre limites de palavra, para
       -- "15ML" e "25ML" não serem lidos como 5 mL.
       (s.nome ~* '\m5\s*M\.?\s*L\M'),
       'injetavel',
       -- ordena pelo calibre que estiver no nome, para o seletor sair 3, 5, 10, 20
       coalesce((regexp_match(s.nome, '(\d+)\s*M\.?\s*L', 'i'))[1]::int, 999)
  from substancias s
 where s.tipo = 'material'
   and s.nome ~* 'SERINGA'
   and not exists (select 1 from insumos_aplicacao i where i.grupo = 'SERINGA');

-- Agulha fica cadastrada como grupo, mas SEM padrão e SEM itens: os calibres
-- variam com o volume e com o músculo, e eleger um aqui seria chute. Escolha
-- na tela de Configurações; enquanto o grupo não tiver padrão, a aplicação
-- lança só a seringa.


-- ---------------------------------------------------------------------------
-- 5) CONFERÊNCIA
-- ---------------------------------------------------------------------------

-- 5.1 A tabela e a coluna nasceram?
select 'insumos_aplicacao' as objeto,
       (select count(*) from information_schema.tables  where table_name  = 'insumos_aplicacao') as existe
union all
select 'dispensacoes.insumo_de',
       (select count(*) from information_schema.columns
         where table_name = 'dispensacoes' and column_name = 'insumo_de');

-- 5.2 O que entrou no grupo SERINGA, e qual ficou como padrão.
--     Se "padrao" sair tudo false, escolha o padrão na tela de Configurações.
select i.grupo, s.nome as insumo, s.unidade, i.quantidade, i.padrao, i.ordem, i.ativo
  from insumos_aplicacao i
  join substancias s on s.id = i.insumo_id
 order by i.grupo, i.ordem, s.nome;

-- 5.3 Agulhas avulsas, para você escolher o padrão na tela. Fora as seringas
--     que já vêm com agulha, que estão no grupo SERINGA.
select id, nome, unidade
  from substancias
 where tipo = 'material' and nome ~* 'AGULHA' and nome !~* 'SERINGA'
 order by nome;

-- 5.4 Saldo dos insumos do grupo, para saber se dá para começar a lançar hoje.
select s.nome, s.unidade, coalesce(v.saldo, 0) as saldo
  from insumos_aplicacao i
  join substancias s on s.id = i.insumo_id
  left join vw_saldo_substancia v on v.substancia_id = s.id
 where i.ativo
 order by s.nome;
