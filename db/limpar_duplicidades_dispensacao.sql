-- ============================================================
-- LIMPEZA DAS DUPLICIDADES DE DISPENSAÇÃO
-- Hospital Reviva — incidente do limite de 1000 linhas (20 a 22/08/2026)
--
-- Causa: a leitura da tabela `dispensacoes` era truncada em 1000 linhas.
-- Os lançamentos gravavam no banco mas não voltavam para a tela, então
-- a mesma dose foi relançada várias vezes. Cada relançamento gerou uma
-- linha real e uma baixa real de estoque.
--
-- Regra de negócio: para uma mesma DATA + PACIENTE + SUBSTÂNCIA +
-- REFERÊNCIA "Dose HH", só pode existir UMA linha. O próprio sistema
-- trabalha assim (`_dispensadoNaData` testa existência, não contagem).
-- SOS fica de fora: ali a repetição no mesmo dia é legítima.
--
-- EXECUTE OS BLOCOS NA ORDEM. Leia o resultado de cada um antes do
-- próximo. O bloco 4 é o único que apaga.
-- ============================================================


-- ------------------------------------------------------------
-- BLOCO 1 — CÓPIA DE SEGURANÇA (obrigatório, roda primeiro)
-- Congela a tabela inteira antes de qualquer alteração. Se algo
-- sair errado, dá para restaurar a partir daqui.
-- ------------------------------------------------------------
create table if not exists dispensacoes_bkp_20260822 as
select * from dispensacoes;

select count(*) as linhas_no_backup from dispensacoes_bkp_20260822;


-- ------------------------------------------------------------
-- BLOCO 2 — O PROBLEMA VAI ALÉM DOS 10 DIAS?
-- A consulta anterior olhou só os últimos 10 dias. Aqui o
-- histórico inteiro, para saber onde a truncagem começou.
-- ------------------------------------------------------------
select data,
       count(*)                                as grupos_duplicados,
       sum(vezes)                              as linhas_gravadas,
       sum(vezes - 1)                          as linhas_em_excesso
from (
  select data, paciente_id, substancia_id, referencia, count(*) as vezes
  from dispensacoes
  where referencia like 'Dose %'
  group by data, paciente_id, substancia_id, referencia
  having count(*) > 1
) g
group by data
order by data;


-- ------------------------------------------------------------
-- BLOCO 3 — AS CÓPIAS SÃO IDÊNTICAS?
-- Se quantidade ou lote variarem dentro de um mesmo grupo, a
-- escolha de qual linha manter deixa de ser indiferente.
-- O ESPERADO É ZERO LINHAS AQUI. Se vier algo, PARE e me chame
-- antes de rodar o bloco 4.
-- ------------------------------------------------------------
select data, paciente_id, substancia_id, referencia,
       count(distinct quantidade)  as qtds_diferentes,
       count(distinct numero_lote) as lotes_diferentes,
       string_agg(distinct quantidade::text,  ', ') as quantidades,
       string_agg(distinct numero_lote,       ', ') as lotes
from dispensacoes
where referencia like 'Dose %'
group by data, paciente_id, substancia_id, referencia
having count(*) > 1
   and (count(distinct quantidade) > 1 or count(distinct numero_lote) > 1)
order by data;


-- ------------------------------------------------------------
-- BLOCO 4 — REMOÇÃO (este apaga de verdade)
-- Mantém a PRIMEIRA linha de cada grupo (a mais antiga por
-- created_at) e remove as repetições. A linha preservada é a que
-- corresponde ao lançamento original do farmacêutico.
--
-- Rode primeiro com o SELECT para ver quantas linhas serão
-- apagadas. Confira o número. Só então rode o DELETE.
-- ------------------------------------------------------------

-- 4a) PRÉVIA — quantas linhas o delete vai remover:
with ranqueadas as (
  select id,
         row_number() over (
           partition by data, paciente_id, substancia_id, referencia
           order by created_at, id
         ) as n
  from dispensacoes
  where referencia like 'Dose %'
)
select count(*) as linhas_que_serao_apagadas
from ranqueadas where n > 1;

-- 4b) DELETE — descomente as linhas abaixo e execute:
-- with ranqueadas as (
--   select id,
--          row_number() over (
--            partition by data, paciente_id, substancia_id, referencia
--            order by created_at, id
--          ) as n
--   from dispensacoes
--   where referencia like 'Dose %'
-- )
-- delete from dispensacoes
-- where id in (select id from ranqueadas where n > 1);


-- ------------------------------------------------------------
-- BLOCO 5 — CONFERÊNCIA PÓS-LIMPEZA
-- Deve devolver ZERO linhas.
-- ------------------------------------------------------------
select data, paciente_id, substancia_id, referencia, count(*) as vezes
from dispensacoes
where referencia like 'Dose %'
group by data, paciente_id, substancia_id, referencia
having count(*) > 1;

-- Doses por dia no período do incidente — compare com os Mapas de
-- Medicação preenchidos pela enfermagem.
select data, count(*) as doses
from dispensacoes
where data between '2026-08-15' and current_date
group by data
order by data;


-- ------------------------------------------------------------
-- BLOCO 6 — TRAVA DEFINITIVA (opcional, recomendado)
-- Índice único que impede o banco de aceitar a mesma dose duas
-- vezes. Com ele, um relançamento acidental vira ERRO VISÍVEL na
-- tela em vez de baixa silenciosa em duplicidade.
-- SOS fica fora da trava, como deve ser.
--
-- Só cria se o BLOCO 5 tiver voltado vazio.
-- ------------------------------------------------------------
-- create unique index if not exists ux_dispensacoes_dose_unica
--   on dispensacoes (data, paciente_id, substancia_id, referencia)
--   where referencia like 'Dose %';


-- ------------------------------------------------------------
-- BLOCO 7 — DESCARTE DO BACKUP
-- Só depois de conferir estoque físico e fechar o período.
-- Sugestão: manter por 30 dias.
-- ------------------------------------------------------------
-- drop table dispensacoes_bkp_20260822;
