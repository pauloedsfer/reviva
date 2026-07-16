-- ============================================================================
-- Hospital Reviva — reset_para_comecar.sql
-- (1) Corrige a limpeza de dados de teste (robusta contra referências cruzadas)
-- (2) RESET opcional: zera TODO o operacional para começar do zero, mantendo a
--     configuração (RT, estabelecimento, usuários).
-- Rodar no SQL Editor do Supabase. Ver PARTE 2 antes de executá-la.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- PARTE 1 — Função de limpeza robusta
-- Apaga o que é de teste E o que aponta para um registro de teste (evita o
-- erro de foreign key quando um lançamento real referencia um paciente/
-- substância/prescritor de teste).
-- ---------------------------------------------------------------------------
create or replace function limpar_dados_teste()
returns text language plpgsql security definer as $$
declare total int := 0; n int;
  sub_t uuid[] := array(select id from substancias where is_dado_teste);
  pac_t uuid[] := array(select id from pacientes  where is_dado_teste);
  pre_t uuid[] := array(select id from prescritores where is_dado_teste);
begin
  delete from ajustes_estoque
    where is_dado_teste or substancia_id = any(sub_t);
  get diagnostics n = row_count; total := total + n;

  delete from carrinho_historico
    where is_dado_teste or carrinho_id in (select id from carrinho_emergencia where is_dado_teste);
  get diagnostics n = row_count; total := total + n;
  delete from carrinho_itens
    where is_dado_teste or carrinho_id in (select id from carrinho_emergencia where is_dado_teste);
  get diagnostics n = row_count; total := total + n;
  delete from carrinho_emergencia where is_dado_teste;
  get diagnostics n = row_count; total := total + n;

  delete from devolucoes
    where is_dado_teste or paciente_id = any(pac_t) or substancia_id = any(sub_t);
  get diagnostics n = row_count; total := total + n;

  delete from dispensacoes
    where is_dado_teste or paciente_id = any(pac_t) or substancia_id = any(sub_t)
       or prescricao_id in (select id from prescricoes where is_dado_teste);
  get diagnostics n = row_count; total := total + n;

  delete from prescricoes
    where is_dado_teste or paciente_id = any(pac_t) or substancia_id = any(sub_t)
       or prescritor_id = any(pre_t);
  get diagnostics n = row_count; total := total + n;

  delete from inventario_inicial
    where is_dado_teste or substancia_id = any(sub_t);
  get diagnostics n = row_count; total := total + n;

  delete from medicacao_propria_itens
    where is_dado_teste or substancia_id = any(sub_t)
       or medicacao_propria_id in (select id from medicacao_propria where is_dado_teste or paciente_id = any(pac_t));
  get diagnostics n = row_count; total := total + n;
  delete from medicacao_propria
    where is_dado_teste or paciente_id = any(pac_t);
  get diagnostics n = row_count; total := total + n;

  delete from doacao_itens
    where is_dado_teste or substancia_id = any(sub_t)
       or doacao_id in (select id from doacoes where is_dado_teste);
  get diagnostics n = row_count; total := total + n;
  delete from doacoes where is_dado_teste;
  get diagnostics n = row_count; total := total + n;

  delete from nota_fiscal_itens
    where is_dado_teste or substancia_id = any(sub_t)
       or nota_fiscal_id in (select id from notas_fiscais where is_dado_teste);
  get diagnostics n = row_count; total := total + n;
  delete from notas_fiscais
    where is_dado_teste or fornecedor_id in (select id from fornecedores where is_dado_teste);
  get diagnostics n = row_count; total := total + n;

  -- pacientes reais que apontam para prescritor de teste: desvincula antes
  update pacientes set prescritor_id = null where prescritor_id = any(pre_t) and not is_dado_teste;

  delete from pacientes    where is_dado_teste; get diagnostics n = row_count; total := total + n;
  delete from fornecedores where is_dado_teste; get diagnostics n = row_count; total := total + n;
  delete from prescritores where is_dado_teste; get diagnostics n = row_count; total := total + n;
  delete from substancias  where is_dado_teste; get diagnostics n = row_count; total := total + n;
  delete from pops         where is_dado_teste; get diagnostics n = row_count; total := total + n;

  return total || ' registros de teste (e dependências) removidos.';
end $$;

-- ---------------------------------------------------------------------------
-- PARTE 2 — RESET TOTAL (opcional, para "começar do zero" no primeiro dia)
-- APAGA TODOS OS DADOS OPERACIONAIS (pacientes, substâncias, prescrições,
-- lançamentos, ajustes…), inclusive os que você tenha criado testando.
-- PRESERVA a configuração: estabelecimento, responsavel_tecnico e usuarios.
--
-- >>> Só execute este bloco se quiser mesmo zerar tudo. Se preferir apagar
--     apenas a massa de teste (mantendo o que criou de real), NÃO rode a
--     PARTE 2 — rode só a PARTE 1 acima e depois: select limpar_dados_teste();
-- ---------------------------------------------------------------------------
truncate table
  ajustes_estoque, dispensacoes, devolucoes, prescricoes, inventario_inicial,
  medicacao_propria_itens, medicacao_propria, doacao_itens, doacoes,
  nota_fiscal_itens, notas_fiscais,
  carrinho_historico, carrinho_itens, carrinho_emergencia,
  pacientes, prescritores, fornecedores, substancias, pops
cascade;
