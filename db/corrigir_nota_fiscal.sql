-- ============================================================================
-- Hospital Reviva — corrigir_nota_fiscal.sql
-- Corrige valores lançados errado numa nota fiscal.
--
-- O CUSTO UNITÁRIO é seguro de corrigir: ele não altera o saldo em estoque
-- nem a escrituração — afeta apenas o custo médio e os relatórios
-- financeiros. Quantidade e número de lote exigem cuidado (ver o final).
--
-- Rode a PARTE 1 para localizar, depois a PARTE 2 para corrigir.
-- ============================================================================


-- ============================================================================
-- PARTE 1 — LOCALIZAR (só consulta)
-- ============================================================================
select
  n.numero                as nf,
  n.data_emissao          as emissao,
  f.nome                  as fornecedor,
  s.nome                  as medicamento,
  i.numero_lote           as lote,
  i.quantidade            as qtd,
  i.custo_unit            as custo_unitario,
  round(i.quantidade * i.custo_unit, 2) as subtotal,
  n.valor_total           as valor_total_da_nota,
  i.id                    as id_do_item,     -- use na Parte 2
  n.id                    as id_da_nota
from nota_fiscal_itens i
join notas_fiscais n on n.id = i.nota_fiscal_id
join substancias s   on s.id = i.substancia_id
left join fornecedores f on f.id = n.fornecedor_id
order by n.data_emissao desc, s.nome;


-- ============================================================================
-- PARTE 2 — CORRIGIR
-- ============================================================================

-- A) Corrigir o CUSTO UNITÁRIO de um item (o caso mais comum)
update nota_fiscal_itens
   set custo_unit = 1.2345                             -- <<< VALOR CORRETO
 where id = '00000000-0000-0000-0000-000000000000';    -- <<< ID DO ITEM

-- B) Corrigir o VALOR TOTAL declarado na nota
-- update notas_fiscais
--    set valor_total = 1234.56                          -- <<< VALOR CORRETO
--  where id = '00000000-0000-0000-0000-000000000000';   -- <<< ID DA NOTA

-- C) Corrigir número ou data da nota
-- update notas_fiscais
--    set numero = '12345', data_emissao = '2026-07-30'
--  where id = '00000000-0000-0000-0000-000000000000';


-- ============================================================================
-- CONFERÊNCIA — repita a Parte 1.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ANTES DE MEXER EM QUANTIDADE OU LOTE
--
-- Quantidade e número de lote afetam o saldo e a rastreabilidade. Confira
-- primeiro se já houve administração daquele lote:
--
--   select count(*) as administracoes, sum(quantidade) as unidades
--   from dispensacoes where numero_lote = 'LOTE-AQUI';
--
--   * Zero  → pode corrigir quantidade e lote à vontade.
--   * Maior que zero → NÃO altere o número do lote (romperia o vínculo das
--     baixas) e nunca reduza a quantidade abaixo do total já administrado.
--
-- A partir desta versão do sistema, a tela de Notas Fiscais tem o botão
-- "Corrigir", que aplica essas travas automaticamente.
-- ----------------------------------------------------------------------------
