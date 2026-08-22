-- ============================================================
-- Diagnóstico: o sistema passou do limite de 1000 linhas?
-- Rode no SQL Editor do Supabase. Qualquer tabela com
-- total >= 1000 estava sendo lida pela metade antes da correção.
-- ============================================================
select 'dispensacoes'            as tabela, count(*) from dispensacoes
union all select 'devolucoes',              count(*) from devolucoes
union all select 'prescricoes',             count(*) from prescricoes
union all select 'ajustes_estoque',         count(*) from ajustes_estoque
union all select 'transferencias_custodia', count(*) from transferencias_custodia
union all select 'nota_fiscal_itens',       count(*) from nota_fiscal_itens
order by 2 desc;

-- Dispensações por dia nos últimos 10 dias — confere se as baixas
-- de 21/08 e da manhã de 22/08 estão gravadas no banco.
select data, count(*) as doses
from dispensacoes
where data >= current_date - 10
group by data
order by data;

-- Possíveis duplicidades geradas por relançamento durante a falha:
-- mesma dose, mesmo paciente, mesma data, lançada mais de uma vez.
select data, paciente_id, substancia_id, referencia, count(*) as vezes
from dispensacoes
where data >= current_date - 10
  and referencia like 'Dose %'
group by data, paciente_id, substancia_id, referencia
having count(*) > 1
order by data, vezes desc;
