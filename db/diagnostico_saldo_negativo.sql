-- ============================================================================
-- Hospital Reviva — diagnostico_saldo_negativo.sql
-- Recalcula o saldo de cada lote a partir de TODAS as fontes de movimento e
-- mostra onde ficou negativo. Só consulta, não altera nada.
--
-- O saldo é derivado, nunca armazenado:
--   entradas  = nota fiscal + doação + inventário inicial + medicação de
--               custódia do paciente + transferência recebida
--   saídas    = dispensações + destinos de custódia (devolução/descarte)
--               + transferências para custódia + ajustes negativos
--   voltas    = devoluções ao estoque + ajustes positivos
-- ============================================================================

with entradas as (
  select i.substancia_id, i.numero_lote, i.validade, sum(i.quantidade) qtd, 'nota fiscal' origem
    from nota_fiscal_itens i group by 1,2,3
  union all
  select d.substancia_id, d.numero_lote, d.validade, sum(d.quantidade), 'doacao'
    from doacao_itens d group by 1,2,3
  union all
  select v.substancia_id, v.numero_lote, v.validade, sum(v.quantidade), 'inventario inicial'
    from inventario_inicial v group by 1,2,3
  union all
  select m.substancia_id, m.numero_lote, m.validade, sum(m.quantidade), 'custodia do paciente'
    from medicacao_propria_itens m group by 1,2,3
  union all
  select t.substancia_id, t.lote_destino, t.validade, sum(t.quantidade), 'transferido ao paciente'
    from transferencias_custodia t group by 1,2,3
),
ent as (select substancia_id, numero_lote, max(validade) validade,
               sum(qtd) entrou, string_agg(distinct origem, ', ') origens
        from entradas group by 1,2),
sai as (select substancia_id, numero_lote, sum(quantidade) saiu
        from dispensacoes group by 1,2),
dev as (select substancia_id, numero_lote, sum(quantidade) devolveu
        from devolucoes group by 1,2),
aju as (select substancia_id, numero_lote, sum(quantidade) ajuste
        from ajustes_estoque group by 1,2),
tsai as (select substancia_id, lote_origem numero_lote, sum(quantidade) transferiu
         from transferencias_custodia group by 1,2)

-- ---------------------------------------------------------------------------
-- 1) LOTES COM SALDO NEGATIVO  (o problema)
-- ---------------------------------------------------------------------------
select s.nome                                   as medicamento,
       s.lista,
       e.numero_lote                            as lote,
       e.validade,
       e.origens                                as origem_da_entrada,
       e.entrou,
       coalesce(x.saiu, 0)                      as dispensado,
       coalesce(d.devolveu, 0)                  as devolvido,
       coalesce(a.ajuste, 0)                    as ajustes,
       coalesce(t.transferiu, 0)                as transferido,
       e.entrou - coalesce(x.saiu,0) + coalesce(d.devolveu,0)
                + coalesce(a.ajuste,0) - coalesce(t.transferiu,0) as saldo
from ent e
join substancias s on s.id = e.substancia_id
left join sai  x on x.substancia_id = e.substancia_id and x.numero_lote = e.numero_lote
left join dev  d on d.substancia_id = e.substancia_id and d.numero_lote = e.numero_lote
left join aju  a on a.substancia_id = e.substancia_id and a.numero_lote = e.numero_lote
left join tsai t on t.substancia_id = e.substancia_id and t.numero_lote = e.numero_lote
where e.entrou - coalesce(x.saiu,0) + coalesce(d.devolveu,0)
                + coalesce(a.ajuste,0) - coalesce(t.transferiu,0) < 0
order by saldo asc;


-- ---------------------------------------------------------------------------
-- 2) SAÍDAS EM LOTE QUE NUNCA TEVE ENTRADA  (erro de digitação de lote)
-- ---------------------------------------------------------------------------
select s.nome as medicamento, x.numero_lote as lote_da_saida,
       sum(x.quantidade) as unidades, count(*) as lancamentos,
       min(x.data) as primeira, max(x.data) as ultima
from dispensacoes x
join substancias s on s.id = x.substancia_id
where not exists (
  select 1 from nota_fiscal_itens i     where i.substancia_id = x.substancia_id and i.numero_lote = x.numero_lote
  union all select 1 from doacao_itens d where d.substancia_id = x.substancia_id and d.numero_lote = x.numero_lote
  union all select 1 from inventario_inicial v where v.substancia_id = x.substancia_id and v.numero_lote = x.numero_lote
  union all select 1 from medicacao_propria_itens m where m.substancia_id = x.substancia_id and m.numero_lote = x.numero_lote
  union all select 1 from transferencias_custodia t where t.substancia_id = x.substancia_id and t.lote_destino = x.numero_lote)
group by 1,2
order by 1,2;


-- ---------------------------------------------------------------------------
-- 3) A PARTIR DE QUE DATA CADA LOTE FICOU NEGATIVO
--    Ajuda a saber se coincide com o período em que os saldos apareciam
--    inflados na tela (antes da correção da paginação).
-- ---------------------------------------------------------------------------
with mov as (
  select substancia_id, numero_lote, data, quantidade  from dispensacoes
    where quantidade is not null
),
ini as (select substancia_id, numero_lote, sum(quantidade) q from (
          select substancia_id, numero_lote, quantidade from nota_fiscal_itens
          union all select substancia_id, numero_lote, quantidade from doacao_itens
          union all select substancia_id, numero_lote, quantidade from inventario_inicial
          union all select substancia_id, numero_lote, quantidade from medicacao_propria_itens
        ) z group by 1,2)
select s.nome as medicamento, m.numero_lote as lote, m.data,
       i.q - sum(m.quantidade) over (partition by m.substancia_id, m.numero_lote
                                     order by m.data
                                     rows between unbounded preceding and current row) as saldo_apos
from mov m
join ini i on i.substancia_id = m.substancia_id and i.numero_lote = m.numero_lote
join substancias s on s.id = m.substancia_id
order by s.nome, m.numero_lote, m.data;
