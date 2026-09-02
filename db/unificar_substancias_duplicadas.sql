-- ============================================================================
-- Hospital Reviva — unificar_substancias_duplicadas.sql
--
-- Unifica os cadastros duplicados apurados na varredura, mantendo sempre o
-- NOME DO PRINCÍPIO ATIVO como cadastro oficial e o nome comercial como
-- sinônimo. Todo o histórico (dispensações, custódia, prescrições, notas,
-- ajustes, devoluções) é remanejado para o cadastro que fica — nada é
-- apagado, e o saldo deixa de ficar dividido entre dois registros.
--
-- Depende de: migration_sinonimos_e_gotas.sql aplicada.
-- Rodar UMA VEZ. Execute PARTE A, confira, depois PARTE B.
-- ============================================================================


-- ============================================================================
-- PARTE A — CONFERÊNCIA ANTES DE UNIFICAR (só consulta)
-- Mostra o que será movido em cada par.
-- ============================================================================
with pares(manter_id, remover_id, rotulo) as (values
  ('d3a7a229-3592-4910-b906-c651a58e865e'::uuid, '565f3167-c5fa-47e0-8b0d-53f472a20245'::uuid, 'NALTREXONA  ←  Uninaltrex®'),
  ('5fd1798f-a52c-4ecd-9483-096756242197'::uuid, 'f6dbe222-53b1-4116-9214-87ea23c2f6b3'::uuid, 'VALPROATO DE SODIO 500MG  ←  Depakene®'),
  ('0a19e4a9-29f9-44df-a05f-e8433e9a4598'::uuid, 'c5de7a7c-18f9-46c6-9759-22379bb16c4e'::uuid, 'LEVOMEPROMAZINA 4% GOTAS  ←  Neozine®')
)
select p.rotulo,
       (select nome from substancias where id = p.manter_id)  as fica,
       (select nome from substancias where id = p.remover_id) as vira_sinonimo,
       (select count(*) from dispensacoes d            where d.substancia_id = p.remover_id) as dispensacoes_a_mover,
       (select count(*) from medicacao_propria_itens m where m.substancia_id = p.remover_id) as custodia_a_mover,
       (select count(*) from prescricoes r            where r.substancia_id = p.remover_id) as prescricoes_a_mover,
       (select count(*) from nota_fiscal_itens i      where i.substancia_id = p.remover_id) as itens_nf_a_mover
from pares p;


-- ============================================================================
-- PARTE B — UNIFICAÇÃO
-- ============================================================================
do $$
declare
  p record;
  pares_cur cursor for
    select * from (values
      ('d3a7a229-3592-4910-b906-c651a58e865e'::uuid, '565f3167-c5fa-47e0-8b0d-53f472a20245'::uuid, 'UNINALTREX®'),
      ('5fd1798f-a52c-4ecd-9483-096756242197'::uuid, 'f6dbe222-53b1-4116-9214-87ea23c2f6b3'::uuid, 'DEPAKENE®'),
      ('0a19e4a9-29f9-44df-a05f-e8433e9a4598'::uuid, 'c5de7a7c-18f9-46c6-9759-22379bb16c4e'::uuid, 'NEOZINE®')
    ) as t(manter, remover, marca);
begin
  for p in pares_cur loop
    -- histórico e vínculos passam para o cadastro que fica
    update dispensacoes            set substancia_id = p.manter where substancia_id = p.remover;
    update medicacao_propria_itens set substancia_id = p.manter where substancia_id = p.remover;
    update prescricoes             set substancia_id = p.manter where substancia_id = p.remover;
    update nota_fiscal_itens       set substancia_id = p.manter where substancia_id = p.remover;
    update doacao_itens            set substancia_id = p.manter where substancia_id = p.remover;
    update inventario_inicial      set substancia_id = p.manter where substancia_id = p.remover;
    update devolucoes              set substancia_id = p.manter where substancia_id = p.remover;
    update ajustes_estoque         set substancia_id = p.manter where substancia_id = p.remover;
    update carrinho_itens          set substancia_id = p.manter where substancia_id = p.remover;
    update cotacao_itens           set substancia_id = p.manter where substancia_id = p.remover;

    -- a marca vira sinônimo do cadastro que fica
    update substancias
       set nome_comercial = trim(both ', ' from
             coalesce(nome_comercial || ', ', '') || p.marca)
     where id = p.manter
       and coalesce(nome_comercial, '') not like '%' || p.marca || '%';

    -- o cadastro duplicado é inativado (não apagado: preserva rastreabilidade)
    update substancias
       set ativo = false,
           nome  = nome || ' [UNIFICADO]'
     where id = p.remover;
  end loop;
end $$;


-- ---------------------------------------------------------------------------
-- LEVOMEPROMAZINA — conversão de unidade
-- O cadastro que fica ("LEVOMEPROMAZINA 4% GOTAS") estava em FRASCO e o
-- removido ("Neozine®") em GOTAS. Como o consumo é lançado em gotas, a base
-- passa a ser a gota; as entradas que foram registradas em frasco precisam
-- ser multiplicadas pelo fator.
-- ---------------------------------------------------------------------------
update substancias
   set unidade        = 'gota',
       unidade_compra = 'frasco',
       fator_unidade  = coalesce(fator_unidade, 400)
 where id = '0a19e4a9-29f9-44df-a05f-e8433e9a4598';

-- CONFIRA antes de rodar: lista as entradas de custódia desta substância.
-- Se alguma estiver com quantidade pequena (1, 2, 3), foi lançada em FRASCOS
-- e precisa ser convertida para gotas.
select m.id, p.nome_completo as paciente, m.numero_lote, m.quantidade, m.validade
from medicacao_propria_itens m
join medicacao_propria mp on mp.id = m.medicacao_propria_id
join pacientes p on p.id = mp.paciente_id
where m.substancia_id = '0a19e4a9-29f9-44df-a05f-e8433e9a4598'
order by m.quantidade;

-- Depois de conferir, converta as que estiverem em frascos (ajuste o WHERE):
-- update medicacao_propria_itens
--    set quantidade = quantidade * 400
--  where substancia_id = '0a19e4a9-29f9-44df-a05f-e8433e9a4598'
--    and quantidade <= 5;          -- <<< só as lançadas em frascos


-- ============================================================================
-- CONFERÊNCIA FINAL
-- ============================================================================
select nome, nome_comercial, unidade, unidade_compra, fator_unidade, ativo
from substancias
where upper(principio_ativo) in ('NALTREXONA','VALPROATO DE SODIO','LEVOMEPROMAZINA')
order by principio_ativo, ativo desc, nome;

-- ----------------------------------------------------------------------------
-- FICA PARA DECISÃO SUA (não incluído acima)
--
-- * AMOXICILINA + CLAVULANATO 875+125 — há DUAS marcas (Novomax® e Sinot
--   Clav®) e nenhum cadastro genérico. Crie "AMOXICILINA + CLAVULANATO
--   875MG + 125MG COMP." e unifique as duas nele, com ambas as marcas em
--   nome_comercial.
--
-- * SULPAN® — o cadastro registra "SULPIRIDA + BROMAZEPAM". Contendo
--   bromazepam, o produto é da LISTA B1 e exige Notificação de Receita
--   azul, não Receita de Controle Especial. Confira a lista cadastrada.
--
-- * DEPAKENE® 250MG está com princípio "ÁCIDO VALPRÓICO" e o 500MG com
--   "VALPROATO DE SODIO". São sais diferentes — confira as embalagens e
--   uniformize, senão o Livro separa o que deveria estar junto.
--
-- * DIVALCON® ER e TORVAL® têm composições próprias (divalproato de sódio
--   e valproato + ácido valpróico). NÃO são duplicatas — apenas renomeie
--   para o princípio ativo e ponha a marca em nome_comercial.
-- ----------------------------------------------------------------------------
