-- Verifica se o POP-FAR-001 já foi gravado. Não altera nada.
select
  case when count(*) = 0 then 'NÃO existe — rodar pops_conteudo_v4.sql'
       when count(*) filter (where corpo is not null) = 0 then 'existe, mas SEM conteúdo — rodar de novo'
       else 'OK — POP-FAR-001 gravado com conteúdo' end as situacao,
  count(*) as linhas
from pops
where codigo = 'POP-FAR-001';
