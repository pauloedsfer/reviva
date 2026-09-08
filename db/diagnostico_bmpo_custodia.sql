-- ============================================================================
-- Hospital Reviva — diagnostico_bmpo_custodia.sql
-- Por que o BMPO abre ESTOQUE INICIAL NEGATIVO na coluna do estabelecimento.
--
-- Só consulta. Não altera nada, não precisa de migração.
--
-- O saldo do BMPO é derivado por DONO do saldo, não só por lote:
--   dono = paciente  -> custódia (medicação do paciente, sob guarda)
--   dono = nulo      -> estoque do estabelecimento
-- O mesmo número de lote pode existir nos dois lugares, então a identidade
-- é sempre substância + lote + dono. Um lançamento atribuído ao dono errado
-- abre negativo de um lado e deixa sobra do outro, com o TOTAL SOB GUARDA
-- correto — que é exatamente o desenho dos negativos do balanço.
--
-- As quatro consultas abaixo rodam independentes. Rode na ordem.
-- ============================================================================

-- Itens de custódia integrados ao estoque na alta: deixam de ser do paciente.
create temp view _integrados as
  select distinct medicacao_propria_item_id as item_id
    from custodia_destinos where tipo = 'integracao_estoque';

-- Entradas de cada saldo (substância + lote + dono).
create temp view _buckets as
  with entradas as (
    select i.substancia_id, i.numero_lote, null::uuid as dono, sum(i.quantidade)::numeric qtd
      from nota_fiscal_itens i group by 1,2,3
    union all
    select d.substancia_id, d.numero_lote, null::uuid, sum(d.quantidade)::numeric
      from doacao_itens d group by 1,2,3
    union all
    select v.substancia_id, v.numero_lote, null::uuid, sum(v.quantidade)::numeric
      from inventario_inicial v group by 1,2,3
    union all
    select mi.substancia_id, mi.numero_lote,
           case when g.item_id is null then mp.paciente_id else null end,
           sum(mi.quantidade)::numeric
      from medicacao_propria_itens mi
      join medicacao_propria mp on mp.id = mi.medicacao_propria_id
      left join _integrados g on g.item_id = mi.id
     group by 1,2,3
    union all
    select t.substancia_id, t.lote_destino, t.paciente_id, sum(t.quantidade)::numeric
      from transferencias_custodia t group by 1,2,3
  )
  select substancia_id, numero_lote, dono, sum(qtd) as entrou
    from entradas group by 1,2,3;

-- ---------------------------------------------------------------------------
-- 1) AJUSTES QUE O BMPO ESTAVA JOGANDO NA COLUNA ERRADA
--    Ajuste feito sobre um lote que só existe como custódia de paciente.
--    O saldo do lote já era descontado certo; o balanço é que classificava
--    a movimentação como saída do estabelecimento.
-- ---------------------------------------------------------------------------
select a.data,
       s.nome                as medicamento,
       s.lista,
       a.numero_lote         as lote,
       a.quantidade          as delta,
       p.nome                as dono_gravado_no_ajuste,
       pb.nome               as dono_do_saldo,
       a.justificativa
  from ajustes_estoque a
  join substancias s on s.id = a.substancia_id
  left join pacientes p on p.id = a.paciente_id
  left join lateral (
    -- dono resolvido: o gravado, quando existe saldo dele; senão, o único
    -- saldo daquele lote; havendo mais de um, o estoque da clínica.
    select b.dono
      from _buckets b
     where b.substancia_id = a.substancia_id
       and b.numero_lote  = a.numero_lote
     order by (b.dono is not distinct from a.paciente_id) desc nulls last,
              (b.dono is null) desc
     limit 1
  ) r on true
  left join pacientes pb on pb.id = r.dono
 where r.dono is not null            -- saldo é de custódia
 order by a.data, s.nome;

-- ---------------------------------------------------------------------------
-- 2) SALDO RECALCULADO POR DONO — onde ainda fica negativo
--    Aplica a mesma regra do sistema: cada saída pertence à custódia do
--    paciente quando ele tem aquele lote; senão, ao estoque da clínica.
-- ---------------------------------------------------------------------------
with disp as (
  select d.substancia_id, d.numero_lote,
         case when exists (select 1 from _buckets b
                            where b.substancia_id = d.substancia_id
                              and b.numero_lote  = d.numero_lote
                              and b.dono = d.paciente_id)
              then d.paciente_id else null end as dono,
         sum(d.quantidade)::numeric as saiu
    from dispensacoes d group by 1,2,3
),
dev as (
  select r.substancia_id, r.numero_lote,
         case when exists (select 1 from _buckets b
                            where b.substancia_id = r.substancia_id
                              and b.numero_lote  = r.numero_lote
                              and b.dono = r.paciente_id)
              then r.paciente_id else null end as dono,
         sum(r.quantidade)::numeric as devolveu
    from devolucoes r group by 1,2,3
),
aju as (
  select a.substancia_id, a.numero_lote, r.dono,
         sum(a.quantidade)::numeric as ajuste
    from ajustes_estoque a
    left join lateral (
      select b.dono from _buckets b
       where b.substancia_id = a.substancia_id and b.numero_lote = a.numero_lote
       order by (b.dono is not distinct from a.paciente_id) desc nulls last,
                (b.dono is null) desc
       limit 1
    ) r on true
   group by 1,2,3
),
tsai as (
  select t.substancia_id, t.lote_origem as numero_lote, null::uuid as dono,
         sum(t.quantidade)::numeric as transferiu
    from transferencias_custodia t group by 1,2,3
),
dest as (
  select mi.substancia_id, mi.numero_lote,
         case when g.item_id is null then mp.paciente_id else null end as dono,
         sum(cd.quantidade)::numeric as baixa_custodia
    from custodia_destinos cd
    join medicacao_propria_itens mi on mi.id = cd.medicacao_propria_item_id
    join medicacao_propria mp on mp.id = mi.medicacao_propria_id
    left join _integrados g on g.item_id = mi.id
   where cd.tipo <> 'integracao_estoque'
   group by 1,2,3
)
select s.nome                                as medicamento,
       s.lista,
       b.numero_lote                         as lote,
       coalesce(p.nome, 'ESTOQUE DA CLÍNICA') as dono_do_saldo,
       b.entrou,
       coalesce(x.saiu, 0)                   as dispensado,
       coalesce(v.devolveu, 0)               as devolvido,
       coalesce(a.ajuste, 0)                 as ajustes,
       coalesce(t.transferiu, 0)             as transferido,
       coalesce(k.baixa_custodia, 0)         as devolvido_ou_descartado,
       b.entrou - coalesce(x.saiu,0) + coalesce(v.devolveu,0)
                + coalesce(a.ajuste,0) - coalesce(t.transferiu,0)
                - coalesce(k.baixa_custodia,0) as saldo
  from _buckets b
  join substancias s on s.id = b.substancia_id
  left join pacientes p on p.id = b.dono
  left join disp x on x.substancia_id = b.substancia_id and x.numero_lote = b.numero_lote and x.dono is not distinct from b.dono
  left join dev  v on v.substancia_id = b.substancia_id and v.numero_lote = b.numero_lote and v.dono is not distinct from b.dono
  left join aju  a on a.substancia_id = b.substancia_id and a.numero_lote = b.numero_lote and a.dono is not distinct from b.dono
  left join tsai t on t.substancia_id = b.substancia_id and t.numero_lote = b.numero_lote and t.dono is not distinct from b.dono
  left join dest k on k.substancia_id = b.substancia_id and k.numero_lote = b.numero_lote and k.dono is not distinct from b.dono
 where b.entrou - coalesce(x.saiu,0) + coalesce(v.devolveu,0)
                + coalesce(a.ajuste,0) - coalesce(t.transferiu,0)
                - coalesce(k.baixa_custodia,0) < 0
 order by s.nome, b.numero_lote;

-- ---------------------------------------------------------------------------
-- 3) SAÍDAS SEM LASTRO NENHUM — lote que nunca teve entrada com aquele dono
--    Caso típico: a dose saiu fisicamente da custódia do paciente, mas foi
--    lançada no lote do estoque da clínica (ou o lote foi digitado diferente
--    do que veio na entrega). Aqui nenhum ajuste conserta: é correção de
--    lançamento.
-- ---------------------------------------------------------------------------
select s.nome            as medicamento,
       d.numero_lote     as lote,
       p.nome            as paciente_da_dispensacao,
       count(*)          as lancamentos,
       sum(d.quantidade) as quantidade,
       min(d.data)       as primeira,
       max(d.data)       as ultima
  from dispensacoes d
  join substancias s on s.id = d.substancia_id
  left join pacientes p on p.id = d.paciente_id
 where not exists (select 1 from _buckets b
                    where b.substancia_id = d.substancia_id
                      and b.numero_lote  = d.numero_lote)
 group by 1,2,3
 order by 1,2;

-- ---------------------------------------------------------------------------
-- 4) SUBSTÂNCIAS QUE A CLÍNICA NUNCA COMPROU MAS TÊM SAÍDA NA COLUNA DELA
--    É o desenho do balanço: coluna do estabelecimento negativa, custódia
--    positiva, total sob guarda correto.
-- ---------------------------------------------------------------------------
select s.nome as medicamento, s.lista,
       sum(case when b.dono is null then b.entrou else 0 end) as entrou_na_clinica,
       sum(case when b.dono is not null then b.entrou else 0 end) as entrou_em_custodia
  from _buckets b
  join substancias s on s.id = b.substancia_id
 group by 1,2
having sum(case when b.dono is null then b.entrou else 0 end) = 0
 order by 1;

drop view _buckets;
drop view _integrados;
