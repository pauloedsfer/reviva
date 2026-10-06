-- ============================================================================
-- Hospital Reviva — migration_prescricao_versao.sql
--
-- VERSIONAMENTO DA PRESCRIÇÃO
--
-- O problema que esta migração resolve:
--   Hoje `ativo = false` tira a prescrição do sistema inteiro, inclusive dos
--   dias em que ela ESTAVA vigente. Suspender uma medicação hoje apaga ela do
--   mapa da semana passada, como se nunca tivesse sido prescrita. E editar
--   grava por cima: dose, via e horário antigos deixam de existir.
--   O efeito prático é que reimprimir o mapa de um dia passado produz um
--   documento DIFERENTE do que foi rubricado pela enfermagem naquele dia —
--   e é esse mapa rubricado que sustenta a baixa no sistema e, por tabela, a
--   escrituração.
--
-- A correção tem três colunas:
--   data_suspensao  — a partir de QUANDO a prescrição deixou de valer. É o
--                     primeiro dia em que ela NÃO vale mais. Antes dessa data
--                     ela continua vigente, e o mapa daquele período volta a
--                     sair correto.
--   substituida_por — quando a edição gera uma nova versão, liga a antiga à
--                     nova. É o que permite ler a história de uma medicação
--                     ("era 1 comp. 8h e 22h, virou 2 comp. só às 22h").
--   motivo_suspensao— texto livre: ordem médica, alta, troca de esquema.
--
-- `ativo` continua existindo e continua sendo gravado, para nada que já
-- funciona parar de funcionar. A diferença é que, daqui para a frente, a
-- vigência num DIA passa a considerar a data.
--
-- Prescrições suspensas ANTES desta migração ficam com data_suspensao nula.
-- A regra de vigência trata esse caso como está hoje — some de tudo —, de
-- propósito: não há como adivinhar a data em que foram suspensas, e fazê-las
-- reaparecer em mapas antigos seria inventar história.
--
-- Idempotente: pode rodar mais de uma vez.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Colunas novas
-- ---------------------------------------------------------------------------
alter table prescricoes add column if not exists data_suspensao   date;
alter table prescricoes add column if not exists substituida_por  uuid references prescricoes(id);
alter table prescricoes add column if not exists motivo_suspensao text;

comment on column prescricoes.data_suspensao is
  'Primeiro dia em que a prescrição NÃO vale mais. Nula = nunca suspensa. Aceita data retroativa (alteração médica fora do expediente da farmácia).';
comment on column prescricoes.substituida_por is
  'Prescrição que substituiu esta numa edição. Liga as versões de uma mesma medicação.';
comment on column prescricoes.motivo_suspensao is
  'Por que foi suspensa: ordem médica, troca de esquema, alta.';

-- ---------------------------------------------------------------------------
-- 2) Índice para a tela de suspensas
--    Ela filtra por paciente e ordena por data de suspensão.
-- ---------------------------------------------------------------------------
create index if not exists ix_prescricoes_suspensas
  on prescricoes (paciente_id, data_suspensao desc)
  where data_suspensao is not null;

-- ---------------------------------------------------------------------------
-- 3) CONFERÊNCIA
-- ---------------------------------------------------------------------------

-- 3.1 As três colunas existem?
select
  count(*) filter (where column_name = 'data_suspensao')   as tem_data_suspensao,
  count(*) filter (where column_name = 'substituida_por')  as tem_substituida_por,
  count(*) filter (where column_name = 'motivo_suspensao') as tem_motivo,
  case when count(*) = 3 then 'OK — as 3 colunas foram criadas'
       else 'FALTOU alguma coluna — rodar de novo' end as situacao
from information_schema.columns
where table_schema = 'public' and table_name = 'prescricoes'
  and column_name in ('data_suspensao', 'substituida_por', 'motivo_suspensao');

-- 3.2 Quadro das prescrições hoje.
--     "suspensas sem data" são as anteriores a esta migração: continuam
--     invisíveis no histórico, como antes. O número tende a parar de crescer.
select
  count(*)                                                            as total,
  count(*) filter (where ativo is true)                               as ativas,
  count(*) filter (where ativo is false and data_suspensao is null)   as suspensas_sem_data_antigas,
  count(*) filter (where data_suspensao is not null)                  as suspensas_com_data,
  count(*) filter (where substituida_por is not null)                 as versionadas
from prescricoes
where coalesce(is_dado_teste, false) = false;
