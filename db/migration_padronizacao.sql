-- ============================================================================
-- Hospital Reviva — migration_padronizacao.sql
-- Cadastra a PADRONIZAÇÃO APROVADA PELA DIRETORIA e cria a primeira cotação.
--
-- CLASSIFICAÇÃO 344/98 conferida item a item (ver observações ao final):
--   B1  = psicotrópicos (benzodiazepínicos) → Notificação de Receita B (azul)
--   C1  = outras substâncias sob controle especial (antidepressivos,
--         anticonvulsivantes, antipsicóticos, antiparkinsonianos)
--         → Receita de Controle Especial branca, 2 vias
--   "—" = não sujeito à Portaria 344/98
--
-- ATENÇÃO — CORREÇÕES EM RELAÇÃO À LISTA ENVIADA:
--   * PROMETAZINA **não é controlada**: é expressamente excetuada das
--     disposições da 344/98 (nota de exceção da Lista C1). Cadastrada como "—".
--   * BROMAZEPAM é B1 (benzodiazepínico) — não estava marcado na lista.
--   * NALOXONA é C1 (confirmado) — estava marcada como (C), correto.
--   * DISSULFIRAM é C1 quando em formulação medicamentosa.
--   * CLONIDINA e ACAMPROSATO: cadastrados como "—". Confirme na consulta à
--     lista vigente da Anvisa antes da primeira compra.
--
-- Duas execuções não duplicam (todo INSERT tem WHERE NOT EXISTS).
-- Rodar UMA VEZ no SQL Editor. Faça um Exportar backup antes.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) SUBSTÂNCIAS DA PADRONIZAÇÃO
-- ---------------------------------------------------------------------------
insert into substancias (nome, principio_ativo, concentracao, forma, lista, unidade, ativo, is_dado_teste)
select v.nome, v.pa, v.conc, v.forma, v.lista, v.un, true, false
from (values
  -- ===== PSICOTRÓPICOS — COMPRIMIDOS =====
  ('SERTRALINA 25MG COMP.','SERTRALINA','25MG','COMPRIMIDO','C1','comp.'),
  ('SERTRALINA 50MG COMP.','SERTRALINA','50MG','COMPRIMIDO','C1','comp.'),
  ('ESCITALOPRAM 10MG COMP.','ESCITALOPRAM','10MG','COMPRIMIDO','C1','comp.'),
  ('ESCITALOPRAM 20MG COMP.','ESCITALOPRAM','20MG','COMPRIMIDO','C1','comp.'),
  ('CARBAMAZEPINA 200MG COMP.','CARBAMAZEPINA','200MG','COMPRIMIDO','C1','comp.'),
  ('CARBAMAZEPINA 400MG COMP.','CARBAMAZEPINA','400MG','COMPRIMIDO','C1','comp.'),
  ('QUETIAPINA 25MG COMP.','QUETIAPINA','25MG','COMPRIMIDO','C1','comp.'),
  ('QUETIAPINA 50MG COMP.','QUETIAPINA','50MG','COMPRIMIDO','C1','comp.'),
  ('QUETIAPINA 100MG COMP.','QUETIAPINA','100MG','COMPRIMIDO','C1','comp.'),
  ('QUETIAPINA XR 50MG COMP.','QUETIAPINA','50MG XR','COMPRIMIDO LIB. PROLONGADA','C1','comp.'),
  ('VALPROATO DE SODIO 250MG COMP.','VALPROATO DE SODIO','250MG','COMPRIMIDO','C1','comp.'),
  ('VALPROATO DE SODIO 500MG COMP.','VALPROATO DE SODIO','500MG','COMPRIMIDO','C1','comp.'),
  ('CARBONATO DE LITIO 300MG COMP.','CARBONATO DE LITIO','300MG','COMPRIMIDO','C1','comp.'),
  ('CARBONATO DE LITIO CR 450MG COMP.','CARBONATO DE LITIO','450MG CR','COMPRIMIDO LIB. CONTROLADA','C1','comp.'),
  ('ARIPIPRAZOL 10MG COMP.','ARIPIPRAZOL','10MG','COMPRIMIDO','C1','comp.'),
  ('ARIPIPRAZOL 15MG COMP.','ARIPIPRAZOL','15MG','COMPRIMIDO','C1','comp.'),
  ('OLANZAPINA 5MG COMP.','OLANZAPINA','5MG','COMPRIMIDO','C1','comp.'),
  ('OLANZAPINA 10MG COMP.','OLANZAPINA','10MG','COMPRIMIDO','C1','comp.'),
  ('DIAZEPAM 10MG COMP.','DIAZEPAM','10MG','COMPRIMIDO','B1','comp.'),
  ('BROMAZEPAM 3MG COMP.','BROMAZEPAM','3MG','COMPRIMIDO','B1','comp.'),
  ('CLONAZEPAM 2MG COMP.','CLONAZEPAM','2MG','COMPRIMIDO','B1','comp.'),
  ('CLORPROMAZINA 25MG COMP.','CLORPROMAZINA','25MG','COMPRIMIDO','C1','comp.'),
  ('CLORPROMAZINA 50MG COMP.','CLORPROMAZINA','50MG','COMPRIMIDO','C1','comp.'),
  ('CLORPROMAZINA 100MG COMP.','CLORPROMAZINA','100MG','COMPRIMIDO','C1','comp.'),
  ('TOPIRAMATO 25MG COMP.','TOPIRAMATO','25MG','COMPRIMIDO','C1','comp.'),
  ('TOPIRAMATO 50MG COMP.','TOPIRAMATO','50MG','COMPRIMIDO','C1','comp.'),
  ('PROMETAZINA 25MG COMP.','PROMETAZINA','25MG','COMPRIMIDO','—','comp.'),
  ('BIPERIDENO 2MG COMP.','BIPERIDENO','2MG','COMPRIMIDO','C1','comp.'),
  ('NALTREXONA 50MG COMP.','NALTREXONA','50MG','COMPRIMIDO','C1','comp.'),
  ('VITAMINA B12 SUBLINGUAL 1000MCG','CIANOCOBALAMINA','1000MCG','COMPRIMIDO SUBLINGUAL','—','comp.'),
  ('VITAMINA B1 (TIAMINA) 300MG COMP.','TIAMINA','300MG','COMPRIMIDO','—','comp.'),

  -- ===== PSICOTRÓPICOS — LÍQUIDOS =====
  ('RISPERIDONA SOLUCAO ORAL 1MG/ML','RISPERIDONA','1MG/ML','SOLUCAO ORAL','C1','frasco'),
  ('LEVOMEPROMAZINA 4% GOTAS','LEVOMEPROMAZINA','40MG/ML (4%)','SOLUCAO ORAL - GOTAS','C1','frasco'),
  ('CLONAZEPAM 2,5MG/ML GOTAS','CLONAZEPAM','2,5MG/ML','SOLUCAO ORAL - GOTAS','B1','frasco'),

  -- ===== INJETÁVEIS =====
  ('HALOPERIDOL 5MG/ML INJETAVEL','HALOPERIDOL','5MG/ML','SOLUCAO INJETAVEL','C1','ampola'),
  ('HALOPERIDOL DECANOATO 70,52MG/ML INJETAVEL','HALOPERIDOL DECANOATO','70,52MG/ML','SOLUCAO INJETAVEL','C1','ampola'),

  -- ===== SINTOMÁTICOS CLÍNICOS (concentração padrão de indústria) =====
  ('PARACETAMOL 500MG COMP.','PARACETAMOL','500MG','COMPRIMIDO','—','comp.'),
  ('DIPIRONA SODICA 500MG COMP.','DIPIRONA SODICA','500MG','COMPRIMIDO','—','comp.'),
  ('IBUPROFENO 600MG COMP.','IBUPROFENO','600MG','COMPRIMIDO','—','comp.'),
  ('CETOPROFENO 100MG COMP.','CETOPROFENO','100MG','COMPRIMIDO','—','comp.'),
  ('DICLOFENACO SODICO 50MG COMP.','DICLOFENACO SODICO','50MG','COMPRIMIDO','—','comp.'),
  ('LORATADINA 10MG COMP.','LORATADINA','10MG','COMPRIMIDO','—','comp.'),
  ('DEXCLORFENIRAMINA 2MG COMP.','DEXCLORFENIRAMINA','2MG','COMPRIMIDO','—','comp.'),
  ('ONDANSETRONA 8MG COMP.','ONDANSETRONA','8MG','COMPRIMIDO','—','comp.'),
  ('METOCLOPRAMIDA 10MG COMP.','METOCLOPRAMIDA','10MG','COMPRIMIDO','—','comp.'),
  ('OMEPRAZOL 20MG CAPS.','OMEPRAZOL','20MG','CAPSULA','—','caps.'),
  ('PANTOPRAZOL 40MG COMP.','PANTOPRAZOL','40MG','COMPRIMIDO','—','comp.'),
  ('BUTILBROMETO DE ESCOPOLAMINA 10MG COMP.','BUTILBROMETO DE ESCOPOLAMINA','10MG','COMPRIMIDO','—','comp.'),
  ('BISACODIL 5MG COMP.','BISACODIL','5MG','COMPRIMIDO','—','comp.'),
  ('LOPERAMIDA 2MG COMP.','LOPERAMIDA','2MG','COMPRIMIDO','—','comp.'),
  ('AMOXICILINA 500MG CAPS.','AMOXICILINA','500MG','CAPSULA','—','caps.'),
  ('AZITROMICINA 500MG COMP.','AZITROMICINA','500MG','COMPRIMIDO','—','comp.'),

  -- ===== ITENS EM FORMA PRÓPRIA =====
  ('LACTULOSE XAROPE 667MG/ML','LACTULOSE','667MG/ML','XAROPE','—','frasco'),
  ('SORO FISIOLOGICO 0,9% 500ML','CLORETO DE SODIO','0,9% 500ML','SOLUCAO INJETAVEL','—','frasco'),
  ('GLICOSE 5% 500ML','GLICOSE','5% 500ML','SOLUCAO INJETAVEL','—','frasco'),
  ('RINGER LACTATO 500ML','RINGER LACTATO','500ML','SOLUCAO INJETAVEL','—','frasco'),
  ('CLORETO DE POTASSIO 19,1% 10ML','CLORETO DE POTASSIO','19,1% 10ML','SOLUCAO INJETAVEL','—','ampola'),
  ('SULFATO DE MAGNESIO 50% 10ML','SULFATO DE MAGNESIO','50% 10ML','SOLUCAO INJETAVEL','—','ampola'),
  ('SALBUTAMOL 5MG/ML SOL. NEBULIZACAO','SALBUTAMOL','5MG/ML','SOLUCAO PARA NEBULIZACAO','—','frasco'),
  ('BROMETO DE IPRATROPIO 0,25MG/ML GOTAS','BROMETO DE IPRATROPIO','0,25MG/ML','SOLUCAO PARA NEBULIZACAO','—','frasco'),
  ('HIDROCORTISONA 100MG INJETAVEL','HIDROCORTISONA','100MG','PO LIOFILIZADO INJETAVEL','—','frasco-ampola'),
  ('HIDROCORTISONA 500MG INJETAVEL','HIDROCORTISONA','500MG','PO LIOFILIZADO INJETAVEL','—','frasco-ampola'),
  ('DEXAMETASONA 4MG/ML 2,5ML INJETAVEL','DEXAMETASONA','4MG/ML','SOLUCAO INJETAVEL','—','ampola'),

  -- ===== URGÊNCIA / EMERGÊNCIA (carrinho) =====
  ('ADRENALINA (EPINEFRINA) 1MG/ML','EPINEFRINA','1MG/ML','SOLUCAO INJETAVEL','—','ampola'),
  ('ATROPINA 0,25MG/ML','SULFATO DE ATROPINA','0,25MG/ML','SOLUCAO INJETAVEL','—','ampola'),
  ('GLICOSE 50% 10ML','GLICOSE','50% 10ML','SOLUCAO INJETAVEL','—','ampola'),
  ('GLUCAGON 1MG INJETAVEL','GLUCAGON','1MG','PO LIOFILIZADO INJETAVEL','—','frasco-ampola'),

  -- ===== SUGESTÕES PARA AVALIAÇÃO =====
  ('NALOXONA 0,4MG/ML INJETAVEL','NALOXONA','0,4MG/ML','SOLUCAO INJETAVEL','C1','ampola'),
  ('PROMETAZINA 25MG/ML INJETAVEL','PROMETAZINA','25MG/ML','SOLUCAO INJETAVEL','—','ampola'),
  ('BIPERIDENO LACTATO 5MG/ML INJETAVEL','BIPERIDENO LACTATO','5MG/ML','SOLUCAO INJETAVEL','C1','ampola'),
  ('DIAZEPAM 5MG/ML INJETAVEL','DIAZEPAM','5MG/ML','SOLUCAO INJETAVEL','B1','ampola'),
  ('HALOPERIDOL 2MG/ML GOTAS','HALOPERIDOL','2MG/ML','SOLUCAO ORAL - GOTAS','C1','frasco'),
  ('CLONIDINA 0,150MG COMP.','CLONIDINA','0,150MG','COMPRIMIDO','—','comp.'),
  ('LORAZEPAM 2MG COMP.','LORAZEPAM','2MG','COMPRIMIDO','B1','comp.'),
  ('TIAMINA 100MG/ML INJETAVEL','TIAMINA','100MG/ML','SOLUCAO INJETAVEL','—','ampola'),
  ('DISSULFIRAM 250MG COMP.','DISSULFIRAM','250MG','COMPRIMIDO','C1','comp.'),
  ('ACAMPROSATO 333MG COMP.','ACAMPROSATO','333MG','COMPRIMIDO','—','comp.')
) as v(nome, pa, conc, forma, lista, un)
where not exists (select 1 from substancias s where s.nome = v.nome);

-- ---------------------------------------------------------------------------
-- 2) CORREÇÃO: prometazina não é substância controlada (exceção expressa)
--    Só altera se estiver cadastrada em alguma lista de controle.
-- ---------------------------------------------------------------------------
update substancias set lista = '—'
where principio_ativo = 'PROMETAZINA' and coalesce(lista,'') not in ('—','');

-- ---------------------------------------------------------------------------
-- 3) PRIMEIRA COTAÇÃO — com todos os itens da padronização
--    Quantidades conforme aprovado: comprimidos 1 caixa/30 comp.;
--    líquidos 2 unidades; injetáveis 10 ampolas; sintomáticos 1 caixa.
-- ---------------------------------------------------------------------------
insert into cotacoes (identificador, data, status, observacao, is_dado_teste)
select 'COT-2026-001', current_date, 'aberta',
       'PRIMEIRA COTACAO - PADRONIZACAO APROVADA PELA DIRETORIA', false
where not exists (select 1 from cotacoes c where c.identificador = 'COT-2026-001');

insert into cotacao_itens (cotacao_id, substancia_id, descricao, unidade, quantidade, ordem, is_dado_teste)
select c.id, s.id, s.nome,
       case
         when s.unidade in ('ampola','frasco-ampola') then 'AMPOLA'
         when s.unidade = 'frasco' then 'FRASCO'
         else 'CAIXA'
       end,
       case
         -- injetáveis: 10 ampolas cada
         when s.unidade in ('ampola','frasco-ampola') then 10
         -- líquidos: 2 unidades cada
         when s.unidade = 'frasco' then 2
         -- comprimidos: 1 caixa
         else 1
       end,
       row_number() over (order by s.nome),
       false
from cotacoes c
cross join substancias s
where c.identificador = 'COT-2026-001'
  and coalesce(s.is_dado_teste,false) = false
  and coalesce(s.ativo,true) = true
  and not exists (select 1 from cotacao_itens i where i.cotacao_id = c.id and i.substancia_id = s.id);

-- ============================================================================
-- OBSERVAÇÕES PARA O RESPONSÁVEL TÉCNICO
--
-- 1. PROMETAZINA — a Anvisa excetua expressamente a prometazina das
--    disposições da Portaria 344/98. Ela NÃO exige receita de controle
--    especial nem entra no Livro/BMPO. Cadastrada como "—" (oral e injetável).
--
-- 2. AMOXICILINA e AZITROMICINA — não pertencem à 344/98, mas são
--    ANTIMICROBIANOS, sujeitos à RDC 20/2011 (receita em 2 vias, com
--    retenção própria, arquivada separadamente dos controlados).
--
-- 3. QUETIAPINA XR 50MG e CARBONATO DE LÍTIO CR 450MG foram cadastrados com
--    dosagem distinta ("50MG XR", "450MG CR") para não se misturarem em
--    estoque com as versões de liberação imediata. Como o Livro e o BMPO
--    agrupam por princípio ativo + dosagem, se preferir consolidá-los com as
--    formas convencionais basta igualar o campo de concentração.
--
-- 4. CLORPROMAZINA 50MG — confirme a existência dessa apresentação junto ao
--    fornecedor; o mercado costuma trabalhar com 25MG e 100MG.
--
-- 5. CLONIDINA e ACAMPROSATO — cadastrados como não controlados. Confirme na
--    lista vigente da Anvisa antes da primeira aquisição.
--
-- 6. Verifique com a distribuidora as concentrações de DIPIRONA (500MG ou 1G),
--    IBUPROFENO (400MG ou 600MG) e ONDANSETRONA (4MG ou 8MG) — cadastrei as
--    apresentações mais usuais em ambiente hospitalar.
-- ============================================================================
