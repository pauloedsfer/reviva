-- ============================================================
-- MIGRAÇÃO DOS LOTES SUFIXADOS DE CUSTÓDIA
-- Hospital Reviva
--
-- A transferência de custódia gravava um número derivado
-- ("ABC123/L12") em vez do lote do fabricante. Com o saldo
-- calculado por POSIÇÃO (substância + lote + validade + titular),
-- o sufixo deixou de ser necessário — e o livro de registro deve
-- trazer o lote do fabricante, não um derivado interno.
--
-- PRÉ-REQUISITO: subir o código com allPosicoes()/saldoPosicao().
-- Sem ele, o sistema volta a fundir os saldos do mesmo número.
--
-- Execute os blocos na ordem. O bloco 3 é o único que altera.
-- ============================================================


-- ------------------------------------------------------------
-- BLOCO 1 — CÓPIA DE SEGURANÇA
-- ------------------------------------------------------------
create table if not exists transferencias_custodia_bkp_lote as
select * from transferencias_custodia;

create table if not exists dispensacoes_bkp_lote as
select * from dispensacoes;

select (select count(*) from transferencias_custodia_bkp_lote) as transferencias,
       (select count(*) from dispensacoes_bkp_lote)            as dispensacoes;


-- ------------------------------------------------------------
-- BLOCO 2 — PRÉVIA: o que exatamente será renomeado
-- ------------------------------------------------------------
select t.lote_destino as de,
       t.lote_origem  as para,
       s.nome         as substancia,
       p.nome_completo as paciente,
       (select count(*) from dispensacoes  d where d.numero_lote = t.lote_destino) as baixas,
       (select count(*) from devolucoes    v where v.numero_lote = t.lote_destino) as devolucoes,
       (select count(*) from ajustes_estoque a where a.numero_lote = t.lote_destino) as ajustes
from transferencias_custodia t
  join substancias s on s.id = t.substancia_id
  join pacientes   p on p.id = t.paciente_id
where t.lote_destino <> t.lote_origem
order by s.nome;


-- ------------------------------------------------------------
-- BLOCO 3 — RENOMEAÇÃO (altera dados)
-- Roda tudo numa transação: ou aplica inteiro, ou nada.
-- ------------------------------------------------------------
begin;

-- baixas feitas em cima do número fictício
update dispensacoes d
set    numero_lote = t.lote_origem
from   transferencias_custodia t
where  d.numero_lote = t.lote_destino
  and  t.lote_destino <> t.lote_origem;

-- devoluções
update devolucoes v
set    numero_lote = t.lote_origem
from   transferencias_custodia t
where  v.numero_lote = t.lote_destino
  and  t.lote_destino <> t.lote_origem;

-- ajustes de inventário
update ajustes_estoque a
set    numero_lote = t.lote_origem
from   transferencias_custodia t
where  a.numero_lote = t.lote_destino
  and  t.lote_destino <> t.lote_origem;

-- por último, a própria transferência
update transferencias_custodia
set    lote_destino = lote_origem
where  lote_destino <> lote_origem;

commit;


-- ------------------------------------------------------------
-- BLOCO 4 — CONFERÊNCIA
-- ------------------------------------------------------------

-- Deve voltar ZERO: nenhum lote fictício restante.
select count(*) as sufixos_restantes
from transferencias_custodia
where lote_destino <> lote_origem;

-- Nenhuma baixa órfã apontando para número que não existe mais.
select d.numero_lote, count(*) as baixas
from dispensacoes d
where d.numero_lote like '%/%'
group by d.numero_lote;

-- Confira na tela: o saldo total por substância NÃO pode ter mudado.
-- A renomeação move quantidades entre posições, nunca cria nem destrói.
select s.nome as substancia,
       sum(case when t.id is not null then t.quantidade else 0 end) as em_custodia_transferida
from substancias s
  left join transferencias_custodia t on t.substancia_id = s.id
group by s.nome
having sum(case when t.id is not null then t.quantidade else 0 end) > 0
order by s.nome;


-- ------------------------------------------------------------
-- BLOCO 5 — DESCARTE DOS BACKUPS (só após conferir estoque físico)
-- ------------------------------------------------------------
-- drop table transferencias_custodia_bkp_lote;
-- drop table dispensacoes_bkp_lote;
