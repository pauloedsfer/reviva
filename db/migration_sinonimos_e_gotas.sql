-- ============================================================================
-- Hospital Reviva — migration_sinonimos_e_gotas.sql
--
-- 1) NOME COMERCIAL (sinônimos) — o cadastro passa a ter o nome do princípio
--    ativo como oficial, e as marcas viram sinônimo, exibido no Mapa e na
--    dispensação ao lado do ativo. Assim a enfermagem reconhece a caixa sem
--    que o saldo se divida entre dois cadastros.
--
-- 2) UNIDADE DE COMPRA E FATOR — para líquidos em gotas. A unidade BASE
--    continua sendo a menor movimentada (a gota), porque a dose é em gotas;
--    a unidade de COMPRA é o frasco, com o fator de conversão. Assim a
--    entrada é digitada em frascos e o consumo continua em gotas.
--    Padrão: 400 gotas por frasco (20 mL × 20 gotas/mL), editável por item.
--
-- Rodar UMA VEZ. Aditivo e não-destrutivo.
-- ============================================================================

alter table substancias add column if not exists nome_comercial  text;
alter table substancias add column if not exists unidade_compra  text;
alter table substancias add column if not exists fator_unidade   numeric;

comment on column substancias.nome_comercial is
  'Marcas conhecidas, separadas por vírgula. Exibidas ao lado do princípio ativo.';
comment on column substancias.unidade_compra is
  'Unidade de aquisição/contagem (ex.: frasco). A unidade base continua em "unidade".';
comment on column substancias.fator_unidade is
  'Quantas unidades base cabem em uma unidade de compra (ex.: 400 gotas por frasco).';

-- ---------------------------------------------------------------------------
-- Padrão para os líquidos em gotas já cadastrados
-- 20 gotas = 1 mL · frasco de 20 mL = 400 gotas
-- Confira o volume de cada frasco e ajuste onde for 10 mL (200) ou 30 mL (600).
-- ---------------------------------------------------------------------------
update substancias
   set unidade_compra = 'frasco',
       fator_unidade  = coalesce(fator_unidade, 400)
 where lower(coalesce(unidade,'')) in ('gota','gotas')
    or upper(nome) like '%GOTAS%';

-- ============================================================================
-- CONFERÊNCIA
-- ============================================================================
select nome, unidade as unidade_base, unidade_compra, fator_unidade
from substancias
where unidade_compra is not null
order by nome;
