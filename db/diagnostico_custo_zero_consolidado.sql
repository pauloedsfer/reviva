-- ============================================================================
-- Hospital Reviva — diagnostico_custo_zero_consolidado.sql
--
-- Responde: por que uma linha do "Consolidado de consumo por paciente" mostra
-- quantidade na coluna DO ESTOQUE e R$ 0,00 na coluna de valor.
--
-- POR QUE ISSO IMPORTA:
--   Valor zero ao lado de quantidade do estoque pode ser duas coisas opostas
--   com a mesma aparência no papel:
--     · a clínica NUNCA PAGOU por aquele lote — doação, custódia integrada,
--       custo já lançado na transferência. O zero está certo.
--     · a clínica PAGOU e o custo não chegou ao relatório — nota lançada sem
--       valor unitário, inventário inicial sem custo, lote apagado. Aí o
--       relatório subestima o consumo, e é isso que a direção vai ler.
--   Esta consulta separa um caso do outro, dose por dose.
--
-- QUAL REGRA CADA CONSULTA ESPELHA:
--   As consultas 1 e 2 espelham a regra CORRIGIDA — a dose só é tida como já
--   cobrada quando saiu do saldo que NASCEU da transferência (bucket com
--   origem 'transferido'). É a regra dos arquivos de código desta entrega.
--   A consulta 5 é a única que usa a regra ANTIGA, pelo número do lote, de
--   propósito: ela existe para medir a diferença entre as duas.
--
-- COMO RODAR: uma consulta de cada vez. Cada uma é INDEPENDENTE e começa num
--   "with" próprio — nada de view temporária, nada que dependa da consulta
--   anterior ter rodado na mesma conexão. Por isso o bloco "with" se repete:
--   é para você poder copiar uma consulta sozinha, sem levar o arquivo
--   inteiro para o editor. Se um dia aquele bloco mudar, mude nas três.
--
-- ALCANCE: as consultas 1, 2 e 5 olham as DISPENSAÇÕES, que são a quase
--   totalidade do que o relatório conta. A quantidade do estoque numa linha do
--   relatório pode somar, além das doses, a TRANSFERÊNCIA do estoque para a
--   custódia daquele paciente — ela também é saída do estoque e também tem
--   custo. A consulta 4 lista essas transferências, para a quantidade do papel
--   fechar: doses (consulta 2) + transferências (consulta 4) = "Qtd. do
--   estoque" da linha.
--
-- AS DATAS: todas as consultas trazem o período do relatório que você
--   imprimiu (25/07 a 22/10/2026). Troque nos dois lugares de cada consulta.
--
-- NÃO ALTERA NADA. Só lê. Pode rodar com o sistema em uso.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- A BASE, que se repete nas consultas 1, 2 e 5: cada dose resolvida para o
-- saldo (bucket) de onde saiu, com o custo que o relatório aplica a ela.
--
-- Um bucket NÃO é um número de lote: é substância + lote + DONO. A ordem das
-- origens no `prio` não é estética — para o bucket, o sistema conserva a
-- origem e o custo da PRIMEIRA entrada que o criou, na ordem inventário,
-- compra, doação, transferência, própria. Mudar essa ordem muda o custo
-- atribuído à dose, então ela tem de ser idêntica à de _entradasBrutas()
-- em assets/dados.js. Se um dia aquela ordem mudar lá, muda aqui também.
-- ---------------------------------------------------------------------------


-- ===========================================================================
-- CONSULTA 1 — A RESPOSTA
--
-- Toda linha do consolidado com quantidade do estoque e valor zero, no
-- período, com o motivo de cada uma.
--
-- Para ver o PESO de cada motivo no período inteiro em vez de linha por
-- linha, tire `paciente, substancia,` do select e do group by.
-- ===========================================================================

with ent as (
  select i.substancia_id, i.numero_lote, null::uuid as dono, 1 as prio,
         'inventario_inicial'::text as origem, coalesce(i.custo_unit,0) as custo_unit,
         i.quantidade, false as integrado, i.data
    from inventario_inicial i
   where not coalesce(i.is_dado_teste,false)
  union all
  select it.substancia_id, it.numero_lote, null::uuid, 2,
         'compra', coalesce(it.custo_unit,0), it.quantidade, false, nf.data_emissao
    from nota_fiscal_itens it
    join notas_fiscais nf on nf.id = it.nota_fiscal_id
   where not coalesce(it.is_dado_teste,false)
  union all
  select di.substancia_id, di.numero_lote, null::uuid, 3,
         'doacao', 0, di.quantidade, false, d.data
    from doacao_itens di
    join doacoes d on d.id = di.doacao_id
   where not coalesce(di.is_dado_teste,false)
  union all
  select t.substancia_id, t.lote_destino, t.paciente_id, 4,
         'transferido', coalesce(t.custo_unit,0), t.quantidade, false, t.data
    from transferencias_custodia t
   where not coalesce(t.is_dado_teste,false)
  union all
  -- Custódia INTEGRADA ao estoque deixa de ter dono: o lote passa a ser do
  -- estabelecimento. É por isso que a quantidade dela sai na coluna do
  -- estoque, e não na de medicação própria — e com custo zero, porque quem
  -- pagou foi a família.
  select mi.substancia_id, mi.numero_lote,
         case when exists (select 1 from custodia_destinos cd
                            where cd.medicacao_propria_item_id = mi.id
                              and cd.tipo = 'integracao_estoque')
              then null::uuid else mp.paciente_id end,
         5, 'proprio', 0, mi.quantidade,
         exists (select 1 from custodia_destinos cd
                  where cd.medicacao_propria_item_id = mi.id
                    and cd.tipo = 'integracao_estoque'),
         mp.data
    from medicacao_propria_itens mi
    join medicacao_propria mp on mp.id = mi.medicacao_propria_id
   where not coalesce(mi.is_dado_teste,false)
),
bucket as (
  select substancia_id, numero_lote, dono,
         sum(quantidade)                                as qtd_entradas,
         (array_agg(origem     order by prio, data))[1] as origem,
         (array_agg(custo_unit order by prio, data))[1] as custo_unit,
         (array_agg(integrado  order by prio, data))[1] as integrado
    from ent
   group by 1,2,3
),
-- Custo médio da substância: só COMPRAS, como no sistema. É o que vale quando
-- a dose não encontra bucket nenhum (lançamento antigo, lote renomeado).
custo_medio as (
  select substancia_id,
         case when sum(qtd_entradas) > 0
              then sum(qtd_entradas * custo_unit) / sum(qtd_entradas) else 0 end as custo_medio
    from bucket where origem = 'compra' group by 1
),
-- Lotes que NASCERAM de transferência. A dose que sai deles não é cobrada de
-- novo: o custo foi lançado na data da transferência. A chave é substância +
-- lote, nunca o número sozinho.
transferidos as (
  select substancia_id, lote_destino, paciente_id as dono,
         max(coalesce(custo_unit,0))             as custo_transf,
         bool_or(paciente_origem_id is not null) as veio_de_custodia
    from transferencias_custodia
   where not coalesce(is_dado_teste,false)
   group by substancia_id, lote_destino, paciente_id
),
-- Precedência igual à de _chaveDaSaida(): o dono gravado manda; sem ele,
-- custódia do paciente SE ELA EXISTIR, senão estoque da clínica.
dose as (
  select d.id, d.data, d.substancia_id, d.numero_lote, d.quantidade,
         d.paciente_id, d.referencia, d.lote_dono,
         case when d.lote_dono = 'clinica'      then null::uuid
              when bc.substancia_id is not null  then d.paciente_id
              else null::uuid end as dono_resolvido
    from dispensacoes d
    left join bucket bc on bc.substancia_id = d.substancia_id
                       and bc.numero_lote   = d.numero_lote
                       and bc.dono          = d.paciente_id
   where not coalesce(d.is_dado_teste,false)
),
linha as (
  select s.nome as substancia,
         coalesce(p.nome_completo, 'SEM PACIENTE — carrinho, setor, perdas') as paciente,
         dd.quantidade,
         coalesce(b.origem = 'proprio' and not b.integrado, false) as eh_propria,
       /* Sem round() aqui: com preço de gota — clonazepam a R$ 0,0072 — uma
          dose de 1 unidade arredondaria para R$ 0,00 e a linha seria dada
          como "sem custo", o contrário do que a consulta procura. O
          relatório também soma os produtos inteiros e formata no fim. */
       (case when coalesce(b.origem = 'transferido', false)
                or coalesce(b.origem = 'proprio' and not b.integrado, false)
             then 0
             else dd.quantidade * coalesce(b.custo_unit, cm.custo_medio, 0)
        end) as valor,
       /* A ordem segue a ordem em que o sistema aplica a regra de custo.
          Dose que saiu de bucket com origem 'transferido' já foi cobrada na
          data da transferência — é a pergunta "de qual SALDO a dose saiu",
          que substituiu a pergunta errada "este NÚMERO de lote já foi
          destino de transferência?". */
       case
         when coalesce(b.origem = 'proprio' and not b.integrado, false)
           then 'A — medicação própria: vale zero por natureza, sai na coluna própria (correto)'
         when b.origem = 'transferido' and coalesce(tr.veio_de_custodia,false)
                                      and coalesce(tr.custo_transf,0) = 0
           then 'E — lote veio da CUSTÓDIA de outro paciente: quem pagou foi a família dele (correto)'
         when b.origem = 'transferido' and coalesce(tr.custo_transf, b.custo_unit, 0) = 0
           then 'D — transferência do estoque da clínica LANÇADA COM CUSTO ZERO (verificar)'
         when b.origem = 'transferido'
           then 'B — custo já lançado na data da transferência (correto, não se cobra duas vezes)'
         when b.origem = 'proprio' and b.integrado
           then 'C — custódia INTEGRADA ao estoque: a família pagou, a clínica não (correto)'
         when b.origem is null and coalesce(cm.custo_medio,0) = 0
           then 'H — sem lote correspondente e sem compra registrada: custo médio zero'
         when b.origem is null
           then 'I — sem lote correspondente: valorizada pelo custo médio da substância'
         when b.origem = 'doacao'
           then 'F — doação: entra no estoque sem custo de aquisição (correto)'
         when b.origem = 'inventario_inicial' and b.custo_unit = 0
           then 'G — INVENTÁRIO INICIAL lançado sem custo_unit (CORRIGÍVEL)'
         when b.origem = 'compra' and b.custo_unit = 0
           then 'G — NOTA FISCAL lançada com custo_unit zero (CORRIGÍVEL)'
         else 'Z — custo normal'
       end as motivo
  from dose dd
  join substancias s on s.id = dd.substancia_id
  left join pacientes p on p.id = dd.paciente_id
  left join bucket b on b.substancia_id = dd.substancia_id
                    and b.numero_lote   = dd.numero_lote
                    and b.dono is not distinct from dd.dono_resolvido
  left join custo_medio cm on cm.substancia_id = dd.substancia_id
  /* O join com as transferências é só para ENRIQUECER o motivo (veio de
     custódia? a transferência tinha custo?). Quem decide se a dose já foi
     cobrada é a origem do bucket, não este join — por isso ele casa pela
     identidade do bucket, dono incluído, e não pelo número do lote. */
  left join transferidos tr on tr.substancia_id = dd.substancia_id
                           and tr.lote_destino  = dd.numero_lote
                           and tr.dono is not distinct from dd.dono_resolvido
   where dd.data between date '2026-07-25' and date '2026-10-22'
)
select paciente, substancia, motivo,
       sum(quantidade) as unidades_do_estoque,
       count(*)        as lancamentos
  from linha
 where not eh_propria
 group by paciente, substancia, motivo
having sum(valor) = 0
 order by paciente, sum(quantidade) desc;


-- ===========================================================================
-- CONSULTA 2 — DOSE POR DOSE, de um paciente e uma substância
--
-- Troque o nome e a substância nas duas últimas linhas. O nome é por
-- semelhança, não precisa ser completo. Use esta quando a consulta 1 apontar
-- um caso e você quiser ver de qual lote cada dose saiu.
--
-- Aqui o valor SAI arredondado, ao contrário da consulta 1: é extrato de
-- conferência, linha a linha, e a soma de controle é a do relatório, não a
-- desta tela.
-- ===========================================================================

with ent as (
  select i.substancia_id, i.numero_lote, null::uuid as dono, 1 as prio,
         'inventario_inicial'::text as origem, coalesce(i.custo_unit,0) as custo_unit,
         i.quantidade, false as integrado, i.data
    from inventario_inicial i
   where not coalesce(i.is_dado_teste,false)
  union all
  select it.substancia_id, it.numero_lote, null::uuid, 2,
         'compra', coalesce(it.custo_unit,0), it.quantidade, false, nf.data_emissao
    from nota_fiscal_itens it
    join notas_fiscais nf on nf.id = it.nota_fiscal_id
   where not coalesce(it.is_dado_teste,false)
  union all
  select di.substancia_id, di.numero_lote, null::uuid, 3,
         'doacao', 0, di.quantidade, false, d.data
    from doacao_itens di
    join doacoes d on d.id = di.doacao_id
   where not coalesce(di.is_dado_teste,false)
  union all
  select t.substancia_id, t.lote_destino, t.paciente_id, 4,
         'transferido', coalesce(t.custo_unit,0), t.quantidade, false, t.data
    from transferencias_custodia t
   where not coalesce(t.is_dado_teste,false)
  union all
  -- Custódia INTEGRADA ao estoque deixa de ter dono: o lote passa a ser do
  -- estabelecimento. É por isso que a quantidade dela sai na coluna do
  -- estoque, e não na de medicação própria — e com custo zero, porque quem
  -- pagou foi a família.
  select mi.substancia_id, mi.numero_lote,
         case when exists (select 1 from custodia_destinos cd
                            where cd.medicacao_propria_item_id = mi.id
                              and cd.tipo = 'integracao_estoque')
              then null::uuid else mp.paciente_id end,
         5, 'proprio', 0, mi.quantidade,
         exists (select 1 from custodia_destinos cd
                  where cd.medicacao_propria_item_id = mi.id
                    and cd.tipo = 'integracao_estoque'),
         mp.data
    from medicacao_propria_itens mi
    join medicacao_propria mp on mp.id = mi.medicacao_propria_id
   where not coalesce(mi.is_dado_teste,false)
),
bucket as (
  select substancia_id, numero_lote, dono,
         sum(quantidade)                                as qtd_entradas,
         (array_agg(origem     order by prio, data))[1] as origem,
         (array_agg(custo_unit order by prio, data))[1] as custo_unit,
         (array_agg(integrado  order by prio, data))[1] as integrado
    from ent
   group by 1,2,3
),
-- Custo médio da substância: só COMPRAS, como no sistema. É o que vale quando
-- a dose não encontra bucket nenhum (lançamento antigo, lote renomeado).
custo_medio as (
  select substancia_id,
         case when sum(qtd_entradas) > 0
              then sum(qtd_entradas * custo_unit) / sum(qtd_entradas) else 0 end as custo_medio
    from bucket where origem = 'compra' group by 1
),
-- Lotes que NASCERAM de transferência. A dose que sai deles não é cobrada de
-- novo: o custo foi lançado na data da transferência. A chave é substância +
-- lote, nunca o número sozinho.
transferidos as (
  select substancia_id, lote_destino, paciente_id as dono,
         max(coalesce(custo_unit,0))             as custo_transf,
         bool_or(paciente_origem_id is not null) as veio_de_custodia
    from transferencias_custodia
   where not coalesce(is_dado_teste,false)
   group by substancia_id, lote_destino, paciente_id
),
-- Precedência igual à de _chaveDaSaida(): o dono gravado manda; sem ele,
-- custódia do paciente SE ELA EXISTIR, senão estoque da clínica.
dose as (
  select d.id, d.data, d.substancia_id, d.numero_lote, d.quantidade,
         d.paciente_id, d.referencia, d.lote_dono,
         case when d.lote_dono = 'clinica'      then null::uuid
              when bc.substancia_id is not null  then d.paciente_id
              else null::uuid end as dono_resolvido
    from dispensacoes d
    left join bucket bc on bc.substancia_id = d.substancia_id
                       and bc.numero_lote   = d.numero_lote
                       and bc.dono          = d.paciente_id
   where not coalesce(d.is_dado_teste,false)
)
select to_char(dd.data,'DD/MM/YYYY')                      as data,
       dd.numero_lote                                     as lote,
       dd.quantidade                                      as qtd,
       coalesce(dd.lote_dono,'— histórico, inferido —')   as dono_gravado,
       case when dd.dono_resolvido is not null then 'custódia do paciente'
            else 'estoque da clínica' end                 as saldo_de_onde_saiu,
       coalesce(b.origem,'(sem lote correspondente)')      as origem_do_lote,
       b.custo_unit                                       as custo_unit_do_lote,
       round(
       /* Sem round() aqui: com preço de gota — clonazepam a R$ 0,0072 — uma
          dose de 1 unidade arredondaria para R$ 0,00 e a linha seria dada
          como "sem custo", o contrário do que a consulta procura. O
          relatório também soma os produtos inteiros e formata no fim. */
       (case when coalesce(b.origem = 'transferido', false)
                or coalesce(b.origem = 'proprio' and not b.integrado, false)
             then 0
             else dd.quantidade * coalesce(b.custo_unit, cm.custo_medio, 0)
        end), 2) as valor_no_relatorio,
       /* A ordem segue a ordem em que o sistema aplica a regra de custo.
          Dose que saiu de bucket com origem 'transferido' já foi cobrada na
          data da transferência — é a pergunta "de qual SALDO a dose saiu",
          que substituiu a pergunta errada "este NÚMERO de lote já foi
          destino de transferência?". */
       case
         when coalesce(b.origem = 'proprio' and not b.integrado, false)
           then 'A — medicação própria: vale zero por natureza, sai na coluna própria (correto)'
         when b.origem = 'transferido' and coalesce(tr.veio_de_custodia,false)
                                      and coalesce(tr.custo_transf,0) = 0
           then 'E — lote veio da CUSTÓDIA de outro paciente: quem pagou foi a família dele (correto)'
         when b.origem = 'transferido' and coalesce(tr.custo_transf, b.custo_unit, 0) = 0
           then 'D — transferência do estoque da clínica LANÇADA COM CUSTO ZERO (verificar)'
         when b.origem = 'transferido'
           then 'B — custo já lançado na data da transferência (correto, não se cobra duas vezes)'
         when b.origem = 'proprio' and b.integrado
           then 'C — custódia INTEGRADA ao estoque: a família pagou, a clínica não (correto)'
         when b.origem is null and coalesce(cm.custo_medio,0) = 0
           then 'H — sem lote correspondente e sem compra registrada: custo médio zero'
         when b.origem is null
           then 'I — sem lote correspondente: valorizada pelo custo médio da substância'
         when b.origem = 'doacao'
           then 'F — doação: entra no estoque sem custo de aquisição (correto)'
         when b.origem = 'inventario_inicial' and b.custo_unit = 0
           then 'G — INVENTÁRIO INICIAL lançado sem custo_unit (CORRIGÍVEL)'
         when b.origem = 'compra' and b.custo_unit = 0
           then 'G — NOTA FISCAL lançada com custo_unit zero (CORRIGÍVEL)'
         else 'Z — custo normal'
       end as motivo
  from dose dd
  join substancias s on s.id = dd.substancia_id
  left join pacientes p on p.id = dd.paciente_id
  left join bucket b on b.substancia_id = dd.substancia_id
                    and b.numero_lote   = dd.numero_lote
                    and b.dono is not distinct from dd.dono_resolvido
  left join custo_medio cm on cm.substancia_id = dd.substancia_id
  /* O join com as transferências é só para ENRIQUECER o motivo (veio de
     custódia? a transferência tinha custo?). Quem decide se a dose já foi
     cobrada é a origem do bucket, não este join — por isso ele casa pela
     identidade do bucket, dono incluído, e não pelo número do lote. */
  left join transferidos tr on tr.substancia_id = dd.substancia_id
                           and tr.lote_destino  = dd.numero_lote
                           and tr.dono is not distinct from dd.dono_resolvido
 where dd.data between date '2026-07-25' and date '2026-10-22'
   and p.nome_completo ilike '%VITOR%'
   and s.nome = 'QUETIAPINA 25MG'
 order by dd.data, dd.numero_lote;


-- ---------------------------------------------------------------------------
-- CONSULTA 3 — A LISTA CURTA DO QUE É CORRIGÍVEL — entradas com custo zero que
--    deveriam ter valor. É aqui que mexer resolve de verdade.
-- ---------------------------------------------------------------------------

select 'nota fiscal' as tipo_de_entrada, nf.numero as documento,
       to_char(nf.data_emissao,'DD/MM/YYYY') as data, s.nome as substancia,
       it.numero_lote, it.quantidade, it.custo_unit
  from nota_fiscal_itens it
  join notas_fiscais nf on nf.id = it.nota_fiscal_id
  join substancias s on s.id = it.substancia_id
 where not coalesce(it.is_dado_teste,false)
   and coalesce(it.custo_unit,0) = 0
union all
select 'inventário inicial', coalesce(i.observacao,'—'),
       to_char(i.data,'DD/MM/YYYY'), s.nome, i.numero_lote, i.quantidade, i.custo_unit
  from inventario_inicial i
  join substancias s on s.id = i.substancia_id
 where not coalesce(i.is_dado_teste,false)
   and coalesce(i.custo_unit,0) = 0
union all
select 'transferência p/ custódia',
       coalesce(t.observacao,'—'),
       to_char(t.data,'DD/MM/YYYY'), s.nome, t.lote_destino, t.quantidade, t.custo_unit
  from transferencias_custodia t
  join substancias s on s.id = t.substancia_id
 where not coalesce(t.is_dado_teste,false)
   and coalesce(t.custo_unit,0) = 0
   and t.paciente_origem_id is null          -- saiu do estoque da clínica: devia ter custo
 order by 1, 4;


-- ---------------------------------------------------------------------------
-- CONSULTA 4 — AS TRANSFERÊNCIAS DO PERÍODO — a outra parcela da "Qtd. do estoque".
--
-- A transferência para a custódia é saída do estoque e é COBRADA na data em
-- que acontece; as doses que saem depois daquele lote não são cobradas de
-- novo. Se uma linha do relatório mostra mais unidades do que a soma das doses
-- da consulta 2, a diferença está aqui.
-- ---------------------------------------------------------------------------

select to_char(t.data,'DD/MM/YYYY')              as data,
       coalesce(pd.nome_completo,'(voltou para o estoque da clínica)') as destino,
       coalesce(po.nome_completo,'estoque da clínica')                 as origem,
       s.nome                                    as substancia,
       t.lote_origem, t.lote_destino, t.quantidade,
       t.custo_unit,
       round(t.quantidade * coalesce(t.custo_unit,0), 2) as valor_lancado
  from transferencias_custodia t
  join substancias s on s.id = t.substancia_id
  left join pacientes pd on pd.id = t.paciente_id
  left join pacientes po on po.id = t.paciente_origem_id
 where not coalesce(t.is_dado_teste,false)
   and t.data between date '2026-07-25' and date '2026-10-22'
 order by t.data, s.nome;



-- ===========================================================================
-- CONSULTA 5 — QUANTO O RELATÓRIO DEIXOU DE CONTAR
--
-- Lista as doses que saíram do ESTOQUE DA CLÍNICA, de um lote que a casa
-- comprou, mas que o relatório zerou porque o NÚMERO daquele lote também foi
-- usado como lote de destino de uma transferência (as de agosto/2026 foram
-- gravadas com destino igual à origem). São essas que passam a ser cobradas
-- com a correção.
--
-- Esta é a ÚNICA consulta do arquivo que usa a regra antiga (pelo número do
-- lote): é o que permite medir a diferença. Rode ANTES de subir os arquivos
-- novos; depois deles o relatório já traz esses valores e ela vira histórico.
-- ===========================================================================

with ent as (
  select i.substancia_id, i.numero_lote, null::uuid as dono, 1 as prio,
         'inventario_inicial'::text as origem, coalesce(i.custo_unit,0) as custo_unit,
         i.quantidade, false as integrado, i.data
    from inventario_inicial i
   where not coalesce(i.is_dado_teste,false)
  union all
  select it.substancia_id, it.numero_lote, null::uuid, 2,
         'compra', coalesce(it.custo_unit,0), it.quantidade, false, nf.data_emissao
    from nota_fiscal_itens it
    join notas_fiscais nf on nf.id = it.nota_fiscal_id
   where not coalesce(it.is_dado_teste,false)
  union all
  select di.substancia_id, di.numero_lote, null::uuid, 3,
         'doacao', 0, di.quantidade, false, d.data
    from doacao_itens di
    join doacoes d on d.id = di.doacao_id
   where not coalesce(di.is_dado_teste,false)
  union all
  select t.substancia_id, t.lote_destino, t.paciente_id, 4,
         'transferido', coalesce(t.custo_unit,0), t.quantidade, false, t.data
    from transferencias_custodia t
   where not coalesce(t.is_dado_teste,false)
  union all
  -- Custódia INTEGRADA ao estoque deixa de ter dono: o lote passa a ser do
  -- estabelecimento. É por isso que a quantidade dela sai na coluna do
  -- estoque, e não na de medicação própria — e com custo zero, porque quem
  -- pagou foi a família.
  select mi.substancia_id, mi.numero_lote,
         case when exists (select 1 from custodia_destinos cd
                            where cd.medicacao_propria_item_id = mi.id
                              and cd.tipo = 'integracao_estoque')
              then null::uuid else mp.paciente_id end,
         5, 'proprio', 0, mi.quantidade,
         exists (select 1 from custodia_destinos cd
                  where cd.medicacao_propria_item_id = mi.id
                    and cd.tipo = 'integracao_estoque'),
         mp.data
    from medicacao_propria_itens mi
    join medicacao_propria mp on mp.id = mi.medicacao_propria_id
   where not coalesce(mi.is_dado_teste,false)
),
bucket as (
  select substancia_id, numero_lote, dono,
         sum(quantidade)                                as qtd_entradas,
         (array_agg(origem     order by prio, data))[1] as origem,
         (array_agg(custo_unit order by prio, data))[1] as custo_unit,
         (array_agg(integrado  order by prio, data))[1] as integrado
    from ent
   group by 1,2,3
),
-- Custo médio da substância: só COMPRAS, como no sistema. É o que vale quando
-- a dose não encontra bucket nenhum (lançamento antigo, lote renomeado).
custo_medio as (
  select substancia_id,
         case when sum(qtd_entradas) > 0
              then sum(qtd_entradas * custo_unit) / sum(qtd_entradas) else 0 end as custo_medio
    from bucket where origem = 'compra' group by 1
),
-- Lotes que NASCERAM de transferência. A dose que sai deles não é cobrada de
-- novo: o custo foi lançado na data da transferência. A chave é substância +
-- lote, nunca o número sozinho.
transferidos as (
  select substancia_id, lote_destino,
         max(coalesce(custo_unit,0))             as custo_transf,
         bool_or(paciente_origem_id is not null) as veio_de_custodia
    from transferencias_custodia
   where not coalesce(is_dado_teste,false)
   group by substancia_id, lote_destino
),
-- Precedência igual à de _chaveDaSaida(): o dono gravado manda; sem ele,
-- custódia do paciente SE ELA EXISTIR, senão estoque da clínica.
dose as (
  select d.id, d.data, d.substancia_id, d.numero_lote, d.quantidade,
         d.paciente_id, d.referencia, d.lote_dono,
         case when d.lote_dono = 'clinica'      then null::uuid
              when bc.substancia_id is not null  then d.paciente_id
              else null::uuid end as dono_resolvido
    from dispensacoes d
    left join bucket bc on bc.substancia_id = d.substancia_id
                       and bc.numero_lote   = d.numero_lote
                       and bc.dono          = d.paciente_id
   where not coalesce(d.is_dado_teste,false)
),
afetadas as (
  select s.nome                       as substancia,
         p.nome_completo              as paciente,
         dd.numero_lote,
         dd.quantidade,
         b.custo_unit,
         /* SEM round() aqui de propósito. Arredondar dose a dose e só depois
            somar afasta o resultado do que o relatório mostra, que soma os
            produtos inteiros e formata uma vez no fim. Com preço de gota —
            clonazepam a R$ 0,0072 — o estrago é grande: 20 gotas valem
            R$ 0,144 e arredondam para R$ 0,14, perdendo R$ 0,004 em cada
            lançamento. O arredondamento fica no select final. */
         dd.quantidade * b.custo_unit as valor_que_faltava
    from dose dd
    join substancias s on s.id = dd.substancia_id
    join pacientes p on p.id = dd.paciente_id
    join bucket b on b.substancia_id = dd.substancia_id
                 and b.numero_lote   = dd.numero_lote
                 and b.dono is not distinct from dd.dono_resolvido
    join transferidos tr on tr.substancia_id = dd.substancia_id
                        and tr.lote_destino  = dd.numero_lote
   where dd.data between date '2026-07-25' and date '2026-10-22'
     and b.origem <> 'transferido'      -- a dose NÃO saiu do saldo criado pela transferência
     and coalesce(b.custo_unit,0) > 0   -- e o lote tinha custo: era para ter sido cobrada
)
-- O rollup traz os subtotais junto: linha sem lote é o total do paciente
-- naquela substância, linha sem substância é o total do paciente, e a última
-- é o total geral. É esse número que a direção vai ver mudar no relatório.
select coalesce(paciente, '>>> TOTAL GERAL')                  as paciente,
       coalesce(substancia, case when paciente is null then '' else '— total do paciente —' end) as substancia,
       coalesce(numero_lote, '')                              as numero_lote,
       sum(quantidade)                                        as unidades,
       round(sum(valor_que_faltava), 2)                       as valor_que_faltava
  from afetadas
 group by rollup (paciente, substancia, numero_lote)
 /* grouping() devolve 1 na coluna que o rollup somou: é o que empurra cada
    subtotal para depois das suas linhas, e o total geral para o fim. Ordenar
    pelos nomes direto não serviria — o rótulo do total ordenaria junto com os
    pacientes, pela letra. */
 order by grouping(paciente), paciente,
          grouping(substancia), substancia,
          grouping(numero_lote), numero_lote;


-- ============================================================================
-- OBSERVAÇÕES PARA O RESPONSÁVEL TÉCNICO
--
-- 1. MOTIVOS QUE ESTÃO CERTOS e não devem ser "corrigidos":
--      A  medicação própria — é do paciente, o hospital guardou e administrou.
--      B  dose de lote transferido — o custo já foi lançado na transferência.
--         Cobrar de novo contaria o mesmo comprimido duas vezes.
--      C  custódia integrada ao estoque — quem pagou foi a família.
--      F  doação — entrou sem custo de aquisição, por natureza.
--    Nesses casos o relatório está correto; o que faltava era DIZER isso no
--    papel. A coluna "Dessas, sem custo" e a legenda com as letras passaram a
--    dizer, para a direção não ler zero como remédio dado de graça pela casa.
--
-- 2. MOTIVOS CORRIGÍVEIS:
--      G  nota ou inventário lançado sem valor unitário → corrija o custo_unit
--         da entrada (consulta 4 lista quais). O relatório recalcula sozinho:
--         valor é derivado, não gravado.
--      D  transferência que saiu do estoque da clínica com custo zero → o lote
--         de origem provavelmente tinha custo e a transferência não o copiou.
--      H  dose sem lote correspondente e sem compra registrada → o lote foi
--         renomeado ou apagado depois da dispensação. Não há o que corrigir
--         no custo; vale conferir se o saldo daquele item fecha.
--
-- 3. NÃO LANCE AJUSTE DE INVENTÁRIO por causa de custo. Custo e saldo são
--    coisas separadas: a quantidade está certa nos dois casos. Ajuste mexe em
--    saldo e vai para o Livro com justificativa — usar ajuste para corrigir
--    preço cria movimentação falsa numa escrituração que não se rasura.
-- ============================================================================
