-- ============================================================================
-- Hospital Reviva — migration_preparo_na_hora.sql
--
-- Marca as medicações que NÃO podem ser fracionadas na farmácia e precisam
-- ser preparadas pela enfermagem no momento da administração: insulina
-- (dose aspirada após a glicemia), líquidos em gotas, xaropes, suspensões,
-- pomadas, cremes, sprays e soluções para nebulização.
--
-- Consequências no sistema:
--   · não saem nas etiquetas dos kits (economiza papel adesivo);
--   · aparecem no checklist de separação com marcação própria, porque o
--     frasco ainda precisa ser entregue e conferido;
--   · saem na Folha de Preparo na Hora e SOS, para a enfermagem rubricar.
--
-- Rodar UMA VEZ. A regra abaixo é um ponto de partida por forma farmacêutica;
-- a consulta final mostra o resultado para você revisar item a item — dá
-- para ajustar qualquer um na tela de Estoque > editar substância.
-- ============================================================================

alter table substancias add column if not exists preparo_na_hora boolean not null default false;

comment on column substancias.preparo_na_hora is
  'Medicação que a enfermagem prepara no momento da administração; não entra em kit de dose unitária nem gera etiqueta.';

update substancias set preparo_na_hora = true
 where not is_dado_teste
   and (
        upper(nome) like '%INSULINA%'
     or upper(coalesce(forma, '')) like '%GOTAS%'
     or upper(coalesce(forma, '')) like '%XAROPE%'
     or upper(coalesce(forma, '')) like '%SOLUCAO ORAL%'
     or upper(coalesce(forma, '')) like '%SUSPENSAO%'
     or upper(coalesce(forma, '')) like '%POMADA%'
     or upper(coalesce(forma, '')) like '%CREME%'
     or upper(coalesce(forma, '')) like '%SPRAY%'
     or upper(coalesce(forma, '')) like '%NEBULIZACAO%'
     or upper(coalesce(unidade, '')) in ('gota', 'gotas', 'ml', 'grama')
   );

-- ---------------------------------------------------------------------------
-- CONFERÊNCIA — revise esta lista item a item
-- Pomada e creme entraram por serem multidose; se algum for entregue em bisnaga
-- individual por paciente, desmarque. Ampola injetável NÃO entra: a ampola vai
-- no kit e a enfermagem aspira na hora. A exceção é a insulina, que é frasco
-- multidose e depende da glicemia.
-- ---------------------------------------------------------------------------
select nome, forma, unidade, lista, preparo_na_hora
  from substancias
 where not is_dado_teste and ativo and tipo = 'medicamento'
 order by preparo_na_hora desc, nome;

-- ============================================================================
-- AJUSTE DOS POPs AFETADOS
-- O SOS deixou de constar no Mapa de Medicação e passou a ser registrado na
-- Folha de Preparo na Hora e SOS. Três POPs mandavam registrar SOS no mapa.
-- ============================================================================

update pops set corpo = replace(corpo::text,
  'conforme registro da enfermagem no Mapa.',
  'conforme registro da enfermagem na Folha de Preparo na Hora e SOS, impressa por dia junto com a separação e devolvida à farmácia preenchida.')::jsonb,
  versao = '02', data_vigencia = current_date
 where codigo = 'POP-FAR-SEP-01';

update pops set corpo = replace(corpo::text,
  'para medicação SOS, anotar o horário e a quantidade administrada.',
  'a medicação SOS NÃO consta do mapa: é administrada e registrada na Folha de Preparo na Hora e SOS, com hora, motivo e quantidade.')::jsonb,
  versao = '04', data_vigencia = current_date
 where codigo = 'POP-ENF-001';

update pops set corpo = replace(corpo::text,
  'para SOS, anotar horário e quantidade administrada.',
  'a medicação SOS é registrada na Folha de Preparo na Hora e SOS, com hora, motivo e quantidade.')::jsonb,
  versao = '03', data_vigencia = current_date
 where codigo = 'POP-ENF-002';

-- confere se as três substituições pegaram (deve voltar 3 linhas com 'Folha de Preparo')
select codigo, versao,
       corpo::text like '%Folha de Preparo na Hora e SOS%' as referencia_atualizada
  from pops where codigo in ('POP-FAR-SEP-01','POP-ENF-001','POP-ENF-002');
