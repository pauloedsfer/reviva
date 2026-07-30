-- ============================================================================
-- Hospital Reviva — migration_decisao_compra.sql
-- Decisão de compra POR ITEM da cotação.
--
-- Motivo: o menor preço unitário não é sempre a melhor compra. Uma
-- embalagem grande e barata por unidade pode significar comprar muito mais
-- do que se vai consumir, com risco de vencimento na farmácia — pagar mais
-- por unidade numa quantidade pequena pode ser a decisão correta.
--
-- Assim, o menor unitário passa a ser SUGESTÃO, e o RT registra a decisão:
-- de qual fornecedor comprar, quantas caixas, ou não comprar agora.
--
-- Rodar UMA VEZ no SQL Editor. Aditivo e não-destrutivo.
-- ============================================================================

alter table cotacao_itens add column if not exists decisao_fornecedor_id uuid references fornecedores(id);
alter table cotacao_itens add column if not exists decisao_caixas        numeric;
alter table cotacao_itens add column if not exists decisao_obs           text;
alter table cotacao_itens add column if not exists decisao_status        text not null default 'sugestao';

alter table cotacao_itens drop constraint if exists cotacao_itens_decisao_status_check;
alter table cotacao_itens add  constraint cotacao_itens_decisao_status_check
  check (decisao_status in ('sugestao', 'escolhido', 'nao_comprar'));

-- ---------------------------------------------------------------------------
-- Significado de decisao_status:
--   'sugestao'    → ainda não decidido: o pedido usa o menor preço unitário
--   'escolhido'   → o RT definiu fornecedor e quantidade de caixas
--   'nao_comprar' → item excluído do pedido nesta cotação (ex.: comprar em
--                   drogaria, aguardar consumo, quantidade não justifica)
-- ---------------------------------------------------------------------------

-- ============================================================================
-- CONFERÊNCIA
-- ============================================================================
select column_name, data_type
from information_schema.columns
where table_name = 'cotacao_itens' and column_name like 'decisao%'
order by column_name;
