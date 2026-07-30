-- ============================================================================
-- Hospital Reviva — precos_cotacao_2026_07.sql
-- Lança na cotação COT-2026-001 os preços das duas propostas recebidas em
-- 29/07/2026: DISTRIBUIDORA BRASIL (orçamento 0631018) e CIRURGICA AL-STYN
-- (proposta 51024).
--
-- unid_por_caixa = unidades que o preço cobre · preco_caixa = valor total
-- desse conjunto. O sistema calcula o preço unitário e o comparativo.
--
-- Rodar UMA VEZ no SQL Editor. Não duplica (WHERE NOT EXISTS).
-- Depende de: migration_padronizacao.sql e migration_fornecedores_contatos.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- BRASIL — 43 itens cotados
-- ---------------------------------------------------------------------------
insert into cotacao_precos (cotacao_item_id, fornecedor_id, disponivel, unid_por_caixa, preco_caixa)
select i.id, f.id, true, v.unid, v.preco
from cotacao_itens i
join cotacoes c on c.id = i.cotacao_id and c.identificador = 'COT-2026-001'
cross join (select id from fornecedores where upper(nome) = 'BRASIL' limit 1) f
join (values
  ('AMOXICILINA 500MG CAPS.', 500, 124.8600),
  ('AZITROMICINA 500MG COMP.', 150, 150.2000),
  ('BIPERIDENO LACTATO 5MG/ML INJETAVEL', 25, 79.0200),
  ('DIAZEPAM 5MG/ML INJETAVEL', 100, 71.8900),
  ('HALOPERIDOL 5MG/ML INJETAVEL', 50, 61.3300),
  ('HALOPERIDOL DECANOATO 70,52MG/ML INJETAVEL', 25, 181.2800),
  ('PROMETAZINA 25MG/ML INJETAVEL', 100, 350.8900),
  ('HALOPERIDOL 2MG/ML GOTAS', 1, 2.9900),
  ('RISPERIDONA SOLUCAO ORAL 1MG/ML', 100, 1239.5300),
  ('ARIPIPRAZOL 10MG COMP.', 30, 13.0200),
  ('ARIPIPRAZOL 15MG COMP.', 30, 14.0800),
  ('BIPERIDENO 2MG COMP.', 200, 84.3600),
  ('CARBAMAZEPINA 400MG COMP.', 200, 107.7700),
  ('CARBONATO DE LITIO 300MG COMP.', 600, 163.0800),
  ('CLONAZEPAM 2MG COMP.', 480, 26.8300),
  ('CLORPROMAZINA 100MG COMP.', 100, 31.9200),
  ('DIAZEPAM 10MG COMP.', 30, 1.7600),
  ('ESCITALOPRAM 20MG COMP.', 30, 8.2900),
  ('LORAZEPAM 2MG COMP.', 20, 2.7500),
  ('PROMETAZINA 25MG COMP.', 200, 29.6200),
  ('QUETIAPINA 100MG COMP.', 30, 14.8700),
  ('QUETIAPINA 25MG COMP.', 500, 60.7100),
  ('SERTRALINA 50MG COMP.', 600, 71.3400),
  ('TOPIRAMATO 25MG COMP.', 60, 10.6900),
  ('TOPIRAMATO 50MG COMP.', 60, 15.1300),
  ('BROMETO DE IPRATROPIO 0,25MG/ML GOTAS', 200, 262.8500),
  ('DEXAMETASONA 4MG/ML 2,5ML INJETAVEL', 50, 38.2800),
  ('HIDROCORTISONA 100MG INJETAVEL', 50, 159.8000),
  ('HIDROCORTISONA 500MG INJETAVEL', 50, 219.0500),
  ('DEXCLORFENIRAMINA 2MG COMP.', 20, 1.0000),
  ('DIPIRONA SODICA 500MG COMP.', 500, 69.5100),
  ('IBUPROFENO 600MG COMP.', 500, 73.5200),
  ('LORATADINA 10MG COMP.', 500, 40.6800),
  ('OMEPRAZOL 20MG CAPS.', 56, 4.3800),
  ('ONDANSETRONA 8MG COMP.', 10, 3.9400),
  ('PARACETAMOL 500MG COMP.', 500, 34.4200),
  ('GLICOSE 5% 500ML', 20, 104.3500),
  ('RINGER LACTATO 500ML', 30, 188.4800),
  ('ADRENALINA (EPINEFRINA) 1MG/ML', 100, 90.4900),
  ('ATROPINA 0,25MG/ML', 100, 76.5600),
  ('GLICOSE 50% 10ML', 200, 100.1300),
  ('NALOXONA 0,4MG/ML INJETAVEL', 10, 104.6900),
  ('TIAMINA 100MG/ML INJETAVEL', 100, 866.4300)
) as v(nome, unid, preco) on upper(i.descricao) = v.nome
where not exists (
  select 1 from cotacao_precos p where p.cotacao_item_id = i.id and p.fornecedor_id = f.id);

-- ---------------------------------------------------------------------------
-- CIRURGICA AL-STYN — 65 itens cotados
-- ---------------------------------------------------------------------------
insert into cotacao_precos (cotacao_item_id, fornecedor_id, disponivel, unid_por_caixa, preco_caixa)
select i.id, f.id, true, v.unid, v.preco
from cotacao_itens i
join cotacoes c on c.id = i.cotacao_id and c.identificador = 'COT-2026-001'
cross join (select id from fornecedores where upper(nome) = 'CIRURGICA AL-STYN' limit 1) f
join (values
  ('AMOXICILINA 500MG CAPS.', 21, 12.1800),
  ('AZITROMICINA 500MG COMP.', 500, 610.0000),
  ('BIPERIDENO LACTATO 5MG/ML INJETAVEL', 25, 96.5000),
  ('DIAZEPAM 5MG/ML INJETAVEL', 100, 89.0000),
  ('HALOPERIDOL 5MG/ML INJETAVEL', 50, 86.0000),
  ('PROMETAZINA 25MG/ML INJETAVEL', 50, 222.0000),
  ('CLONAZEPAM 2,5MG/ML GOTAS', 2, 5.7200),
  ('HALOPERIDOL 2MG/ML GOTAS', 2, 8.5400),
  ('RISPERIDONA SOLUCAO ORAL 1MG/ML', 10, 178.8000),
  ('ARIPIPRAZOL 10MG COMP.', 30, 50.0600),
  ('ARIPIPRAZOL 15MG COMP.', 30, 65.1800),
  ('BIPERIDENO 2MG COMP.', 200, 120.8300),
  ('BROMAZEPAM 3MG COMP.', 30, 5.2300),
  ('CARBAMAZEPINA 200MG COMP.', 500, 103.8400),
  ('CARBAMAZEPINA 400MG COMP.', 200, 185.9100),
  ('CARBONATO DE LITIO 300MG COMP.', 600, 233.5900),
  ('CARBONATO DE LITIO CR 450MG COMP.', 30, 77.6500),
  ('CLONAZEPAM 2MG COMP.', 480, 41.2000),
  ('CLORPROMAZINA 100MG COMP.', 100, 46.4700),
  ('CLORPROMAZINA 25MG COMP.', 200, 114.4000),
  ('VALPROATO DE SODIO 250MG COMP.', 50, 24.9000),
  ('DIAZEPAM 10MG COMP.', 1000, 69.4500),
  ('ESCITALOPRAM 10MG COMP.', 30, 7.3000),
  ('ESCITALOPRAM 20MG COMP.', 30, 13.0200),
  ('LORAZEPAM 2MG COMP.', 30, 8.1900),
  ('NALTREXONA 50MG COMP.', 30, 185.1100),
  ('OLANZAPINA 10MG COMP.', 30, 37.1800),
  ('OLANZAPINA 5MG COMP.', 30, 27.0500),
  ('PROMETAZINA 25MG COMP.', 200, 37.8500),
  ('QUETIAPINA 100MG COMP.', 30, 25.8800),
  ('QUETIAPINA 25MG COMP.', 30, 7.6100),
  ('QUETIAPINA XR 50MG COMP.', 30, 312.1000),
  ('SERTRALINA 25MG COMP.', 30, 36.8200),
  ('SERTRALINA 50MG COMP.', 490, 87.6000),
  ('TOPIRAMATO 25MG COMP.', 60, 17.5200),
  ('TOPIRAMATO 50MG COMP.', 60, 31.6900),
  ('VALPROATO DE SODIO 500MG COMP.', 50, 50.8500),
  ('BROMETO DE IPRATROPIO 0,25MG/ML GOTAS', 2, 4.0000),
  ('DEXAMETASONA 4MG/ML 2,5ML INJETAVEL', 50, 64.0000),
  ('HIDROCORTISONA 100MG INJETAVEL', 50, 164.5000),
  ('HIDROCORTISONA 500MG INJETAVEL', 50, 286.5000),
  ('BISACODIL 5MG COMP.', 20, 10.1100),
  ('BUTILBROMETO DE ESCOPOLAMINA 10MG COMP.', 20, 30.6000),
  ('CETOPROFENO 100MG COMP.', 20, 48.8400),
  ('DEXCLORFENIRAMINA 2MG COMP.', 500, 33.0100),
  ('DICLOFENACO SODICO 50MG COMP.', 20, 1.7800),
  ('DIPIRONA SODICA 500MG COMP.', 500, 75.0900),
  ('IBUPROFENO 600MG COMP.', 20, 5.4200),
  ('LACTULOSE XAROPE 667MG/ML', 2, 18.7000),
  ('LOPERAMIDA 2MG COMP.', 12, 3.1500),
  ('LORATADINA 10MG COMP.', 15, 1.8700),
  ('OMEPRAZOL 20MG CAPS.', 56, 6.0000),
  ('PARACETAMOL 500MG COMP.', 200, 17.1600),
  ('CLORETO DE POTASSIO 19,1% 10ML', 200, 120.7600),
  ('GLICOSE 5% 500ML', 20, 151.0000),
  ('RINGER LACTATO 500ML', 24, 205.2300),
  ('SORO FISIOLOGICO 0,9% 500ML', 30, 177.1800),
  ('SULFATO DE MAGNESIO 50% 10ML', 200, 1455.7400),
  ('CLONIDINA 0,150MG COMP.', 30, 12.1900),
  ('ADRENALINA (EPINEFRINA) 1MG/ML', 100, 131.3500),
  ('ATROPINA 0,25MG/ML', 100, 88.8900),
  ('GLICOSE 50% 10ML', 200, 118.0000),
  ('NALOXONA 0,4MG/ML INJETAVEL', 10, 125.8400),
  ('VITAMINA B1 (TIAMINA) 300MG COMP.', 30, 27.2000),
  ('VITAMINA B12 SUBLINGUAL 1000MCG', 30, 166.6100)
) as v(nome, unid, preco) on upper(i.descricao) = v.nome
where not exists (
  select 1 from cotacao_precos p where p.cotacao_item_id = i.id and p.fornecedor_id = f.id);

-- ---------------------------------------------------------------------------
-- CONFERÊNCIA
-- ---------------------------------------------------------------------------
select f.nome as fornecedor, count(*) as itens_cotados,
       round(min(p.preco_caixa / nullif(p.unid_por_caixa,0)), 4) as menor_unitario,
       round(sum(p.preco_caixa), 2) as total_proposta
from cotacao_precos p
join fornecedores f on f.id = p.fornecedor_id
join cotacao_itens i on i.id = p.cotacao_item_id
join cotacoes c on c.id = i.cotacao_id and c.identificador = 'COT-2026-001'
group by f.nome order by f.nome;

-- Itens da padronização que NENHUM dos dois cotou (pedir a outros fornecedores)
select i.descricao as sem_cotacao
from cotacao_itens i
join cotacoes c on c.id = i.cotacao_id and c.identificador = 'COT-2026-001'
where not exists (select 1 from cotacao_precos p where p.cotacao_item_id = i.id)
order by i.descricao;
