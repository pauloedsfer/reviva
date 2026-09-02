-- ============================================================================
-- Hospital Reviva — varredura_substancias_duplicadas.sql
-- Localiza cadastros diferentes que representam o MESMO medicamento.
--
-- Objetivo: não é apagar nomes comerciais — é identificar o que deve ser
-- unificado num único cadastro, com o nome comercial passando a SINÔNIMO.
-- Enquanto houver dois cadastros, o saldo se divide entre eles e o Livro
-- (que agrupa por princípio ativo + dosagem) fica inconsistente.
--
-- Só consulta, não altera nada.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1) MESMO PRINCÍPIO ATIVO + MESMA CONCENTRAÇÃO em cadastros diferentes
--    É a duplicidade clássica: genérico e marca cadastrados separadamente.
-- ---------------------------------------------------------------------------
select upper(trim(s.principio_ativo))            as principio_ativo,
       upper(trim(coalesce(s.concentracao, ''))) as concentracao,
       count(*)                                  as cadastros,
       string_agg(s.nome || '  [' || coalesce(s.lista,'—') || ']', '  ·  '
                  order by s.nome)                as nomes_cadastrados,
       string_agg(s.id::text, ', ')               as ids
from substancias s
group by 1, 2
having count(*) > 1
order by 1, 2;


-- ---------------------------------------------------------------------------
-- 2) MESMO NÚMERO DE LOTE usado por substâncias diferentes
--    Sinal forte de duplicidade: o mesmo frasco/cartela foi lançado em dois
--    cadastros, e as saídas se dividiram entre eles.
-- ---------------------------------------------------------------------------
with lotes as (
  select substancia_id, numero_lote from nota_fiscal_itens
  union select substancia_id, numero_lote from doacao_itens
  union select substancia_id, numero_lote from inventario_inicial
  union select substancia_id, numero_lote from medicacao_propria_itens
)
select l.numero_lote                              as lote,
       count(distinct l.substancia_id)            as substancias_diferentes,
       string_agg(distinct s.nome, '  ·  ')       as cadastros_envolvidos,
       string_agg(distinct upper(trim(s.principio_ativo)), ' / ') as principios
from lotes l
join substancias s on s.id = l.substancia_id
group by l.numero_lote
having count(distinct l.substancia_id) > 1
order by 2 desc, 1;


-- ---------------------------------------------------------------------------
-- 3) CADASTROS COM NOME COMERCIAL (marca ®) — candidatos a virar sinônimo
--    Lista cada marca com o cadastro genérico correspondente, quando existir.
-- ---------------------------------------------------------------------------
select m.nome                       as nome_comercial,
       m.principio_ativo,
       m.concentracao,
       coalesce(g.nome, '— sem cadastro genérico —') as cadastro_generico,
       (select count(*) from dispensacoes d where d.substancia_id = m.id) as saidas_na_marca,
       (select count(*) from dispensacoes d where d.substancia_id = g.id) as saidas_no_generico
from substancias m
left join substancias g
       on g.id <> m.id
      and upper(trim(g.principio_ativo)) = upper(trim(m.principio_ativo))
      and upper(trim(coalesce(g.concentracao,''))) = upper(trim(coalesce(m.concentracao,'')))
      and g.nome !~ '®'
where m.nome ~ '®'
order by m.principio_ativo, m.nome;


-- ---------------------------------------------------------------------------
-- 4) VOLUME ENVOLVIDO em cada cadastro duplicado
--    Ajuda a decidir qual manter: normalmente o que tem mais histórico.
-- ---------------------------------------------------------------------------
select s.nome, s.principio_ativo, s.concentracao, s.unidade, s.lista,
       (select count(*) from dispensacoes d       where d.substancia_id = s.id) as dispensacoes,
       (select count(*) from nota_fiscal_itens i  where i.substancia_id = s.id) as itens_nf,
       (select count(*) from medicacao_propria_itens m where m.substancia_id = s.id) as itens_custodia,
       (select count(*) from prescricoes p        where p.substancia_id = s.id and p.ativo) as prescricoes_ativas
from substancias s
where upper(trim(s.principio_ativo)) in (
  select upper(trim(principio_ativo)) from substancias
  group by upper(trim(principio_ativo)), upper(trim(coalesce(concentracao,'')))
  having count(*) > 1)
order by s.principio_ativo, s.concentracao, s.nome;
