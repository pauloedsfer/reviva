-- ============================================================================
-- Hospital Reviva — diagnostico_prescricoes_duplicadas.sql
--
-- Acha a mesma medicação prescrita MAIS DE UMA VEZ para o mesmo paciente,
-- valendo no mesmo dia. Quando isso acontece, o kit de separação monta duas
-- linhas iguais na etiqueta e a enfermagem administra a SOMA das doses.
--
-- COMO O SISTEMA CHEGAVA NISSO:
--   Alterar uma prescrição cria uma versão nova valendo a partir do dia
--   seguinte e encerra a atual na mesma data. Só que a tela listava apenas o
--   que está vigente HOJE — então a versão nova, que começa amanhã, sumia no
--   próprio dia em que foi criada, enquanto a antiga continuava à vista (a
--   suspensão dela também só começa amanhã). Quem alterasse duas vezes no
--   mesmo dia mexia nas duas vezes na versão ANTIGA, e nasciam duas versões
--   novas com a mesma data de início. No dia seguinte as duas valiam juntas.
--
-- Rode a consulta 1 AGORA: ela olha hoje e amanhã, que é onde o problema
-- aparece. NÃO ALTERA NADA.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1) DUPLICADAS VALENDO HOJE OU AMANHÃ — a lista de ação imediata
--
-- Uma linha por paciente + medicação + dia. "doses_somadas" é o que o kit
-- daquele dia vai pedir; "deveria_ser" é o maior valor entre as versões, que
-- é quase sempre a intenção real (a última alteração).
-- ---------------------------------------------------------------------------

with dias as (
  select current_date as d, 'hoje'::text as quando
  union all
  select current_date + 1, 'amanhã'
),
vigentes as (
  select dd.d, dd.quando, p.id, p.paciente_id, p.substancia_id,
         p.data_inicio, p.qtd_por_horario, p.dose, p.horarios
    from prescricoes p
    cross join dias dd
   where not coalesce(p.is_dado_teste, false)
     -- mesma regra de prescVigenteEm(): início já chegou, fim não passou,
     -- e a suspensão (quando existe) ainda não começou
     and (p.data_inicio is null or p.data_inicio <= dd.d)
     and (p.data_fim     is null or p.data_fim     >= dd.d)
     and (case when p.data_suspensao is not null then dd.d < p.data_suspensao
               else coalesce(p.ativo, true) end)
)
select v.quando,
       to_char(v.d, 'DD/MM/YYYY')                  as dia,
       pa.nome_completo                            as paciente,
       pa.leito,
       s.nome                                      as medicamento,
       count(*)                                    as versoes_valendo,
       sum(v.qtd_por_horario)                      as doses_somadas,
       max(v.qtd_por_horario)                      as deveria_ser,
       string_agg(to_char(v.data_inicio,'DD/MM') || ': ' ||
                  v.qtd_por_horario || '/hor', '  |  '
                  order by v.data_inicio)          as versoes,
       string_agg(v.id::text, '  |  ' order by v.data_inicio) as ids
  from vigentes v
  join pacientes pa  on pa.id = v.paciente_id
  join substancias s on s.id  = v.substancia_id
 group by v.quando, v.d, pa.nome_completo, pa.leito, s.nome
having count(*) > 1
 order by v.d, pa.nome_completo, s.nome;


-- ---------------------------------------------------------------------------
-- 2) O HISTÓRICO DO PROBLEMA — quantos dias já saíram com dose somada
--
-- Varre dia a dia desde a primeira prescrição. Serve para dimensionar: se
-- apareceram dias passados, houve kit montado com dose dobrada, e vale
-- conferir a evolução de enfermagem daqueles dias.
-- ---------------------------------------------------------------------------

with limites as (
  select min(data_inicio) as de, current_date as ate
    from prescricoes where not coalesce(is_dado_teste, false)
),
dias as (
  select generate_series(l.de, l.ate, interval '1 day')::date as d from limites l
),
vigentes as (
  select dd.d, p.paciente_id, p.substancia_id, p.qtd_por_horario
    from prescricoes p
    cross join dias dd
   where not coalesce(p.is_dado_teste, false)
     and (p.data_inicio is null or p.data_inicio <= dd.d)
     and (p.data_fim     is null or p.data_fim     >= dd.d)
     and (case when p.data_suspensao is not null then dd.d < p.data_suspensao
               else coalesce(p.ativo, true) end)
),
dup as (
  select d, paciente_id, substancia_id, count(*) as versoes,
         sum(qtd_por_horario) as somadas, max(qtd_por_horario) as correta
    from vigentes
   group by d, paciente_id, substancia_id
  having count(*) > 1
)
select to_char(d, 'DD/MM/YYYY')      as dia,
       count(*)                       as casos_no_dia,
       sum(somadas - correta)         as unidades_a_mais_por_horario
  from dup
 group by d
 order by d;


-- ---------------------------------------------------------------------------
-- 3) AS VERSÕES DE UM PACIENTE + MEDICAÇÃO — para decidir qual suspender
--
-- Troque os dois filtros. Mostra a linha do tempo completa, inclusive as já
-- encerradas, para você ver qual versão é a que o médico quis.
-- ---------------------------------------------------------------------------

select p.id,
       to_char(p.data_inicio,'DD/MM/YYYY')    as entra_em,
       to_char(p.data_suspensao,'DD/MM/YYYY') as suspensa_em,
       to_char(p.data_fim,'DD/MM/YYYY')       as data_limite,
       p.ativo,
       p.dose,
       p.qtd_por_horario                      as qtd_por_horario,
       array_to_string(
         array(select jsonb_array_elements_text(to_jsonb(p.horarios))), ', ') as horarios,
       p.motivo_suspensao,
       p.substituida_por
  from prescricoes p
  join pacientes pa  on pa.id = p.paciente_id
  join substancias s on s.id  = p.substancia_id
 where not coalesce(p.is_dado_teste, false)
   and pa.nome_completo ilike '%SOBRENOME DO PACIENTE%'
   and s.nome ilike '%NOME DA MEDICACAO%'
 order by p.data_inicio, p.id;


-- ============================================================================
-- COMO CORRIGIR
--
-- Pela tela, não por SQL: abra Prescrições → o paciente, e SUSPENDA a versão
-- que não deveria valer, informando a data em que ela deixou de valer. Isso
-- preserva o histórico e mantém corretos os mapas dos dias anteriores.
--
-- Não apague a linha. Prescrição apagada deixa a dispensação daquele dia sem
-- a ordem médica que a justifica — e é isso que a fiscalização procura.
--
-- Se a consulta 2 mostrar dias passados com dose somada, confira na evolução
-- de enfermagem o que foi realmente administrado naqueles dias. O kit pedia a
-- soma, mas a enfermagem pode ter administrado o certo.
-- ============================================================================
