-- ============================================================================
-- Hospital Reviva — corrigir_validade_custodia.sql
-- Corrige a data de validade digitada errada num item de medicação de
-- custódia. A validade é apenas um atributo do lote: alterá-la NÃO afeta
-- saldo, movimentação, escrituração nem o histórico de administrações.
--
-- Use a PARTE 1 para localizar o item, depois a PARTE 2 para corrigir.
-- ============================================================================


-- ============================================================================
-- PARTE 1 — LOCALIZAR (só consulta, não altera nada)
-- Lista a medicação de custódia com a validade atual.
-- ============================================================================
select
  p.nome_completo                as paciente,
  s.nome                         as medicamento,
  i.numero_lote                  as lote,
  i.validade                     as validade_atual,
  i.quantidade                   as qtd_recebida,
  mp.data                        as data_recebimento,
  i.id                           as id_do_item      -- use este id na Parte 2
from medicacao_propria_itens i
join medicacao_propria mp on mp.id = i.medicacao_propria_id
join pacientes p           on p.id  = mp.paciente_id
join substancias s         on s.id  = i.substancia_id
order by p.nome_completo, s.nome;


-- ============================================================================
-- PARTE 2 — CORRIGIR
-- Escolha UMA das duas formas abaixo, substitua os valores e execute.
-- ============================================================================

-- FORMA A — pelo id do item (mais segura: atinge exatamente uma linha).
-- Copie o "id_do_item" da Parte 1 e a data correta no formato AAAA-MM-DD.
update medicacao_propria_itens
   set validade = '2027-12-31'                       -- <<< DATA CORRETA
 where id = '00000000-0000-0000-0000-000000000000';  -- <<< ID DO ITEM


-- FORMA B — pelo número do lote (use se o lote for único no sistema).
-- update medicacao_propria_itens
--    set validade = '2027-12-31'          -- <<< DATA CORRETA
--  where numero_lote = 'LOTE-AQUI';       -- <<< NÚMERO DO LOTE


-- ============================================================================
-- CONFERÊNCIA — repita a Parte 1 e verifique a linha corrigida.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- OBSERVAÇÕES
--
-- 1. Corrigir VALIDADE é sempre seguro: não entra em nenhum cálculo de saldo
--    nem na escrituração. Só afeta os avisos de vencimento e a folha de
--    contagem.
--
-- 2. Corrigir NÚMERO DO LOTE é diferente. O lote é a chave que liga as
--    administrações ao item; se já houve dispensação, trocar o número rompe
--    o vínculo e o saldo daquele lote fica errado. Antes de mexer, confira:
--
--    select count(*) as administracoes, sum(quantidade) as unidades
--    from dispensacoes where numero_lote = 'LOTE-AQUI';
--
--    Se retornar zero, o lote pode ser corrigido. Se retornar mais que zero,
--    NÃO altere o número: registre a correção na observação do item.
--
-- 3. A partir desta versão do sistema existe o botão "Corrigir" na tela
--    Medicação do Paciente, que faz isso pela interface e já bloqueia a
--    troca do número do lote quando há administrações vinculadas.
-- ----------------------------------------------------------------------------
