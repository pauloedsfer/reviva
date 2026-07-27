-- ============================================================================
-- Hospital Reviva — migration_categorias.sql
-- 1) Acrescenta CATEGORIA à substância (organiza a cotação e os pedidos).
-- 2) Acrescenta o marcador PADRONIZADO, separando o que a clínica compra
--    (padronização aprovada) do que existe apenas porque um paciente trouxe
--    ou a família comprou — esses últimos não entram em cotação.
--
-- Depende de: migration_padronizacao.sql aplicada.
-- Rodar UMA VEZ no SQL Editor. Todos os comandos têm WHERE. Idempotente.
-- ============================================================================

alter table substancias add column if not exists categoria text;
alter table substancias add column if not exists padronizado boolean not null default true;

-- ---------------------------------------------------------------------------
-- CATEGORIAS DA PADRONIZAÇÃO
-- (as "sugestões para avaliação", já aprovadas, foram distribuídas nas
--  categorias clínicas correspondentes)
-- ---------------------------------------------------------------------------

update substancias set categoria = 'PSICOTROPICOS - ORAL SOLIDO'
where categoria is distinct from 'PSICOTROPICOS - ORAL SOLIDO' and nome in (
  'SERTRALINA 25MG COMP.','SERTRALINA 50MG COMP.',
  'ESCITALOPRAM 10MG COMP.','ESCITALOPRAM 20MG COMP.',
  'CARBAMAZEPINA 200MG COMP.','CARBAMAZEPINA 400MG COMP.',
  'QUETIAPINA 25MG COMP.','QUETIAPINA 50MG COMP.','QUETIAPINA 100MG COMP.','QUETIAPINA XR 50MG COMP.',
  'VALPROATO DE SODIO 250MG COMP.','VALPROATO DE SODIO 500MG COMP.',
  'CARBONATO DE LITIO 300MG COMP.','CARBONATO DE LITIO CR 450MG COMP.',
  'ARIPIPRAZOL 10MG COMP.','ARIPIPRAZOL 15MG COMP.',
  'OLANZAPINA 5MG COMP.','OLANZAPINA 10MG COMP.',
  'DIAZEPAM 10MG COMP.','BROMAZEPAM 3MG COMP.','CLONAZEPAM 2MG COMP.','LORAZEPAM 2MG COMP.',
  'CLORPROMAZINA 25MG COMP.','CLORPROMAZINA 50MG COMP.','CLORPROMAZINA 100MG COMP.',
  'TOPIRAMATO 25MG COMP.','TOPIRAMATO 50MG COMP.',
  'BIPERIDENO 2MG COMP.','PROMETAZINA 25MG COMP.'
);

update substancias set categoria = 'PSICOTROPICOS - ORAL LIQUIDO'
where categoria is distinct from 'PSICOTROPICOS - ORAL LIQUIDO' and nome in (
  'RISPERIDONA SOLUCAO ORAL 1MG/ML','LEVOMEPROMAZINA 4% GOTAS',
  'CLONAZEPAM 2,5MG/ML GOTAS','HALOPERIDOL 2MG/ML GOTAS'
);

update substancias set categoria = 'PSICOTROPICOS - INJETAVEL'
where categoria is distinct from 'PSICOTROPICOS - INJETAVEL' and nome in (
  'HALOPERIDOL 5MG/ML INJETAVEL','HALOPERIDOL DECANOATO 70,52MG/ML INJETAVEL',
  'BIPERIDENO LACTATO 5MG/ML INJETAVEL','DIAZEPAM 5MG/ML INJETAVEL',
  'PROMETAZINA 25MG/ML INJETAVEL'
);

update substancias set categoria = 'DEPENDENCIA QUIMICA'
where categoria is distinct from 'DEPENDENCIA QUIMICA' and nome in (
  'NALTREXONA 50MG COMP.','DISSULFIRAM 250MG COMP.',
  'ACAMPROSATO 333MG COMP.','CLONIDINA 0,150MG COMP.'
);

update substancias set categoria = 'SINTOMATICOS CLINICOS'
where categoria is distinct from 'SINTOMATICOS CLINICOS' and nome in (
  'PARACETAMOL 500MG COMP.','DIPIRONA SODICA 500MG COMP.','IBUPROFENO 600MG COMP.',
  'CETOPROFENO 100MG COMP.','DICLOFENACO SODICO 50MG COMP.','LORATADINA 10MG COMP.',
  'DEXCLORFENIRAMINA 2MG COMP.','ONDANSETRONA 8MG COMP.','METOCLOPRAMIDA 10MG COMP.',
  'OMEPRAZOL 20MG CAPS.','PANTOPRAZOL 40MG COMP.','BUTILBROMETO DE ESCOPOLAMINA 10MG COMP.',
  'BISACODIL 5MG COMP.','LOPERAMIDA 2MG COMP.','LACTULOSE XAROPE 667MG/ML'
);

update substancias set categoria = 'ANTIMICROBIANOS'
where categoria is distinct from 'ANTIMICROBIANOS' and nome in (
  'AMOXICILINA 500MG CAPS.','AZITROMICINA 500MG COMP.'
);

update substancias set categoria = 'VITAMINAS E SUPLEMENTOS'
where categoria is distinct from 'VITAMINAS E SUPLEMENTOS' and nome in (
  'VITAMINA B12 SUBLINGUAL 1000MCG','VITAMINA B1 (TIAMINA) 300MG COMP.',
  'TIAMINA 100MG/ML INJETAVEL'
);

update substancias set categoria = 'SOLUCOES PARENTERAIS E ELETROLITOS'
where categoria is distinct from 'SOLUCOES PARENTERAIS E ELETROLITOS' and nome in (
  'SORO FISIOLOGICO 0,9% 500ML','GLICOSE 5% 500ML','RINGER LACTATO 500ML',
  'CLORETO DE POTASSIO 19,1% 10ML','SULFATO DE MAGNESIO 50% 10ML'
);

update substancias set categoria = 'RESPIRATORIOS E CORTICOIDES'
where categoria is distinct from 'RESPIRATORIOS E CORTICOIDES' and nome in (
  'SALBUTAMOL 5MG/ML SOL. NEBULIZACAO','BROMETO DE IPRATROPIO 0,25MG/ML GOTAS',
  'HIDROCORTISONA 100MG INJETAVEL','HIDROCORTISONA 500MG INJETAVEL',
  'DEXAMETASONA 4MG/ML 2,5ML INJETAVEL'
);

update substancias set categoria = 'URGENCIA E EMERGENCIA'
where categoria is distinct from 'URGENCIA E EMERGENCIA' and nome in (
  'ADRENALINA (EPINEFRINA) 1MG/ML','ATROPINA 0,25MG/ML','GLICOSE 50% 10ML',
  'GLUCAGON 1MG INJETAVEL','NALOXONA 0,4MG/ML INJETAVEL'
);

-- Qualquer substância sem categoria (ex.: cadastrada antes desta migração)
update substancias set categoria = 'NAO CLASSIFICADO'
where categoria is null;

-- ---------------------------------------------------------------------------
-- PADRONIZAÇÃO x MEDICAÇÃO DE PACIENTE
-- Os 77 itens acima são a padronização aprovada (padronizado = true, padrão).
-- Substâncias que existirem apenas para registrar custódia de paciente devem
-- ser marcadas com padronizado = false — pela tela de Estoque/Substâncias ou
-- pelo comando abaixo (descomente e ajuste os nomes conforme o caso).
-- ---------------------------------------------------------------------------
-- update substancias set padronizado = false
-- where nome in ('NOME EXATO DA SUBSTANCIA TRAZIDA PELO PACIENTE');

-- ============================================================================
-- Categorias criadas (ordem usada na impressão da cotação):
--   1. PSICOTROPICOS - ORAL SOLIDO
--   2. PSICOTROPICOS - ORAL LIQUIDO
--   3. PSICOTROPICOS - INJETAVEL
--   4. DEPENDENCIA QUIMICA
--   5. SINTOMATICOS CLINICOS
--   6. ANTIMICROBIANOS
--   7. VITAMINAS E SUPLEMENTOS
--   8. SOLUCOES PARENTERAIS E ELETROLITOS
--   9. RESPIRATORIOS E CORTICOIDES
--  10. URGENCIA E EMERGENCIA
--  11. NAO CLASSIFICADO (fallback)
-- ============================================================================
