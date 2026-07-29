-- ============================================================================
-- Hospital Reviva — migration_fornecedores_contatos.sql
-- 1) Acrescenta os campos de contato ao fornecedor (representante, telefone,
--    WhatsApp e e-mail) — antes só havia nome, CNPJ e qualificação.
-- 2) Importa os 32 fornecedores da lista de representantes.
--
-- Todos entram como "em qualificação": ainda não enviaram documentação.
-- Conforme os documentos chegarem, use a tela Cotação → Qualificação para
-- marcar AFE, licença, certidões e a avaliação de desempenho.
--
-- Rodar UMA VEZ no SQL Editor. Não duplica (INSERT com WHERE NOT EXISTS).
-- ============================================================================

alter table fornecedores add column if not exists contato   text;  -- representante
alter table fornecedores add column if not exists telefone  text;
alter table fornecedores add column if not exists whatsapp  text;  -- só dígitos, ex.: 5562999999999
alter table fornecedores add column if not exists email     text;

-- permitir classificar indústria/laboratório além de distribuidora e drogaria
alter table fornecedores drop constraint if exists fornecedores_tipo_check;
alter table fornecedores add  constraint fornecedores_tipo_check
  check (tipo in ('drogaria', 'distribuidora', 'industria'));

-- ---------------------------------------------------------------------------
-- IMPORTAÇÃO DOS REPRESENTANTES
-- ---------------------------------------------------------------------------
insert into fornecedores (nome, contato, telefone, whatsapp, email, tipo, situacao, is_dado_teste)
select v.nome, nullif(v.contato,''), nullif(v.tel,''), nullif(v.zap,''), nullif(v.mail,''),
       v.tipo, 'em_qualificacao', false
from (values
  ('AMR DISTRIBUIDORA',           'JULIA',            '', '5562993155202', 'juliavendas32@gmail.com',                      'distribuidora'),
  ('ASTHAMED',                    'REJANE',           '', '5562995262121', 'asthamedvendas@gmail.com',                     'distribuidora'),
  ('BF DE ANDRADE HOSPITALAR',    'LETICIA',          '', '5562993496456', 'vendas6@bfdeandradehospitalar.com.br',         'distribuidora'),
  ('BRASIL',                      'DOMINGOS',         '', '5562991560709', 'domingosmsouza@hotmail.com',                   'distribuidora'),
  ('BS MIX',                      'ELISE',            '3088-5468', '',      'nlph@hotmail.com',                             'distribuidora'),
  ('CENTRUMED HOSPITALAR',        '',                 '', '',              'comercial@centrumedhospitalar.com',            'distribuidora'),
  ('CIRURGICA AL-STYN',           'SHIRLEY POLONIATO','', '5562986069299', 'vendas01shirleypoloniatto@gmail.com',          'distribuidora'),
  ('CRISTALIA',                   'FERNANDO',         '98121-8343', '',    'fernando.barbosa@cristalia.com.br',            'industria'),
  ('CIENTIFICA HOSPITALAR',       'JUNIOR',           '', '5562993544838', 'vendas10@cientificahospitalar.com.br',         'distribuidora'),
  ('FORT HOSPITALAR',             'WEBER',            '', '5562991281163', 'vendasforthospitalar04@gmail.com',             'distribuidora'),
  ('GTS DISTRIBUIDORA',           'LEONARDO',         '', '5562982741675', 'gtsdistribuidora2@gmail.com',                  'distribuidora'),
  ('HOSPDROGAS',                  'GLACY',            '', '5562999636520', 'glacy.stefany@hospdrogas.com.br',              'distribuidora'),
  ('HOSPFAR',                     'RAFAEL',           '', '5562982095678', 'televendasgyn@hospfar.com.br',                 'distribuidora'),
  ('UNIAO QUIMICA',               'CAILANE MOREIRA',  '', '5562999213862', 'cmmarques@uniaoquimica.com.br',                'industria'),
  ('JLF DISTRIBUIDORA',           'ALBERSON',         '', '5562982741675', 'jlfdistribuidoramed@gmail.com',                'distribuidora'),
  ('MAIS MEDICAL HOSPITALAR',     'CAMILA',           '', '556298532396',  'vendas01@maismedicalhospitalar.com',           'distribuidora'),
  ('MEDCENTRO',                   'CALEB',            '', '5562991513076', 'adrielevieiradeluxe@outlook.com',              'distribuidora'),
  ('MEDMAIS SAUDE HOSPITALAR',    'ROSE',             '', '5562946468910', 'comercial@medmaissaudehospitalar.com.br',      'distribuidora'),
  ('MIGMED',                      'WANESSA',          '', '5562992321486', 'televendas@migmed.com.br',                     'distribuidora'),
  ('MULTIFARMA',                  'CARLOS',           '', '5562991056637', 'vendas9@multifarma.com.br',                    'distribuidora'),
  ('PLAYPHARMA',                  'DIOGO',            '', '5562998012577', 'vendas02@playpharma.com.br',                   'distribuidora'),
  ('PERFIL HOSPITALAR',           'EDUARDO',          '', '5562992157975', 'eduardomartinsvendas@hotmail.com',             'distribuidora'),
  ('RECMED',                      'ANA KAROLINE',     '', '5562992699822', 'hospitalar2@recmed.com.br',                    'distribuidora'),
  ('RM HOSPITALAR',               'FABIO',            '', '5562999474414', 'fclfabio03@hotmail.com',                       'distribuidora'),
  ('SERVIMED',                    'MARCIA',           '', '5562994310706', 'msoares.rep1@gmail.com',                       'distribuidora'),
  ('MEDCENTER COMERCIAL',         'HEMILLIN',         '', '5562996121285', 'hemillin.koyama@medcentercomercial.com.br',    'distribuidora'),
  ('SUPERMEDICA',                 'JULIANA',          '', '5562996747704', 'vendas08@supermedica.com.br',                  'distribuidora'),
  ('WERBRAN',                     'GEIZI',            '', '5546991304849', 'geizi.werbran@gmail.com',                      'distribuidora'),
  ('TOTAL FARMA',                 'LUIZ',             '', '5562996284700', 'hospitalarbeta@gmail.com',                     'distribuidora'),
  ('TOTAL LOGISTICA',             'OSVALDO',          '', '5562992888581', 'osvaldojr72@hotmail.com',                      'distribuidora'),
  ('MAEVE HOSPITALAR',            'PEDRO',            '', '5562994129929', 'repmedicamentosgyn@gmail.com',                 'distribuidora'),
  ('VALE DOS PIRINEUS',           'WELLINGTON',       '', '',              'hospvalemed@gmail.com',                        'distribuidora')
) as v(nome, contato, tel, zap, mail, tipo)
where not exists (select 1 from fornecedores f where upper(f.nome) = v.nome);

-- ---------------------------------------------------------------------------
-- CONFERÊNCIA
-- ---------------------------------------------------------------------------
select count(*) as fornecedores_cadastrados,
       count(*) filter (where whatsapp is not null) as com_whatsapp,
       count(*) filter (where email is not null)    as com_email,
       count(*) filter (where contato is not null)  as com_representante
from fornecedores;

-- Pendências de contato (preencher conforme obtiver os dados)
select nome, coalesce(contato,'— sem representante —') as representante,
       coalesce(whatsapp, coalesce(telefone,'— sem telefone —')) as contato_telefonico,
       coalesce(email,'— sem e-mail —') as email
from fornecedores
where whatsapp is null or contato is null or email is null
order by nome;

-- ============================================================================
-- CORREÇÕES E PENDÊNCIAS APLICADAS NA IMPORTAÇÃO (conferir com o RT)
--
--  * GTS e JLF ficaram com o MESMO número (5562982741675) na lista de origem.
--    Um dos dois está errado — confirmar antes de abordar.
--  * BS MIX: telefone 3088-5468 sem DDD (não é WhatsApp). Faltam DDD e celular.
--  * CRISTALIA: celular 98121-8343 sem DDD. Provavelmente (62).
--  * CENTRUMED HOSPITALAR: sem representante e sem telefone — só e-mail.
--  * VALE DOS PIRINEUS: sem telefone — só e-mail.
--  * MAIS MEDICAL: número 556298532396 tem 12 dígitos (falta 1). Verificar.
--  * MEDMAIS SAUDE: número 55629464-6891 estava incompleto; gravado como
--    5562946468910 apenas como referência — CONFIRMAR antes de usar.
--  * MIGMED: havia dois e-mails; gravado o institucional (televendas@migmed).
--    O pessoal da representante era wanessa-lorena@hotmail.com.
--  * Nomes corrigidos: "Cientifica Hospitalr" → CIENTIFICA HOSPITALAR,
--    "Total Faram" → TOTAL FARMA, "Vale dos Pirieneus" → VALE DOS PIRINEUS,
--    "Ashtamed" → ASTHAMED (conforme o e-mail).
--  * CRISTALIA e UNIAO QUIMICA classificadas como "industria" (laboratório),
--    e não distribuidora.
-- ============================================================================
