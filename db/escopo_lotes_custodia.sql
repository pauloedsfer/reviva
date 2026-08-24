-- ============================================================
-- ESCOPO DA MIGRAÇÃO DOS LOTES SUFIXADOS DE CUSTÓDIA
-- Hospital Reviva — apenas CONSULTA. Nada é alterado aqui.
--
-- A transferência de custódia grava um número de lote derivado
-- ("ABC123/L12") em vez do lote do fabricante. Estas consultas
-- mostram quantos registros seriam afetados por uma migração
-- de volta ao lote real.
-- ============================================================


-- 1) Quantas transferências existem e desde quando.
select count(*)  as transferencias,
       min(data) as primeira,
       max(data) as ultima
from transferencias_custodia;


-- 2) Cada transferência, com o lote real e o fictício lado a lado,
--    e quantas baixas foram feitas em cima do número fictício.
select t.data,
       p.nome_completo          as paciente,
       s.nome                   as substancia,
       t.lote_origem            as lote_real,
       t.lote_destino           as lote_ficticio,
       t.quantidade             as transferido,
       (select count(*) from dispensacoes d where d.numero_lote = t.lote_destino) as baixas,
       (select coalesce(sum(d.quantidade), 0) from dispensacoes d where d.numero_lote = t.lote_destino) as unidades_baixadas
from transferencias_custodia t
  join pacientes   p on p.id = t.paciente_id
  join substancias s on s.id = t.substancia_id
order by t.data;


-- 3) Total de linhas que a migração tocaria, por tabela.
select 'transferencias_custodia' as tabela,
       count(*) as linhas
from transferencias_custodia
where lote_destino <> lote_origem

union all
select 'dispensacoes', count(*)
from dispensacoes
where numero_lote in (select lote_destino from transferencias_custodia where lote_destino <> lote_origem)

union all
select 'devolucoes', count(*)
from devolucoes
where numero_lote in (select lote_destino from transferencias_custodia where lote_destino <> lote_origem)

union all
select 'ajustes_estoque', count(*)
from ajustes_estoque
where numero_lote in (select lote_destino from transferencias_custodia where lote_destino <> lote_origem);


-- 4) COLISÕES QUE JÁ EXISTEM HOJE — a causa do bloqueio relatado.
--    Mesmo lote e mesma validade aparecendo para titulares diferentes
--    (pacientes distintos, ou paciente + estoque da clínica).
--    São estes os casos em que o saldo está sendo calculado errado.
with posicoes as (
  -- custódia trazida pela família
  select mpi.numero_lote, mpi.validade, mpi.substancia_id,
         mp.paciente_id::text as titular, 'família' as origem
  from medicacao_propria_itens mpi
    join medicacao_propria mp on mp.id = mpi.medicacao_propria_id

  union all
  -- estoque da clínica: compras
  select nfi.numero_lote, nfi.validade, nfi.substancia_id,
         'CLINICA', 'nota fiscal'
  from nota_fiscal_itens nfi

  union all
  -- estoque da clínica: inventário inicial
  select numero_lote, validade, substancia_id,
         'CLINICA', 'inventário'
  from inventario_inicial
)
select s.nome as substancia,
       p.numero_lote,
       p.validade,
       count(*)                       as posicoes,
       count(distinct p.titular)      as titulares_distintos,
       string_agg(distinct p.origem, ', ') as origens
from posicoes p
  join substancias s on s.id = p.substancia_id
group by s.nome, p.numero_lote, p.validade
having count(*) > 1
order by s.nome, p.numero_lote;
