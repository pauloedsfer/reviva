-- ============================================================================
-- Hospital Reviva — seed_teste.sql
-- MASSA DE TESTE FICTÍCIA (item 4). Tudo com is_dado_teste = true.
-- Rodar DEPOIS de schema.sql. Para limpar: select limpar_dados_teste();
-- ----------------------------------------------------------------------------
-- ATENÇÃO: dados 100% inventados. CPFs têm dígito verificador válido mas são
-- fictícios. NÃO usar em produção — apagar antes do cadastro de pacientes reais.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- CONFIGURAÇÃO (PLACEHOLDER — sobrescrever pela tela de Configurações, item 3)
-- Não é "dado de teste" apagável: é a linha única de config que você edita.
-- ---------------------------------------------------------------------------
insert into estabelecimento (razao_social, nome_fantasia, cnpj, endereco, municipio_uf, autorizacao_sanitaria)
values ('[PREENCHER] Razão Social do Hospital Reviva', 'Hospital Reviva',
        '00.000.000/0000-00', '[PREENCHER endereço]', 'Anápolis/GO',
        '[PREENCHER autorização sanitária]')
on conflict do nothing;

insert into responsavel_tecnico (nome, conselho, uf, numero_registro, identificacao_assinatura, ativo, vigencia_inicio)
values ('[PREENCHER seu nome]', 'CRF', 'GO', '[PREENCHER]',
        'Farmacêutico(a) Responsável Técnico', true, current_date)
on conflict do nothing;

-- ===========================================================================
-- A PARTIR DAQUI: massa fictícia (is_dado_teste = true)
-- ===========================================================================

-- SUBSTÂNCIAS (mesmas classificações já vetadas no protótipo)
insert into substancias (id, nome, principio_ativo, concentracao, forma, lista, unidade, is_dado_teste) values
 ('00000000-0000-4000-8000-000000000101','Diazepam 10mg comp.','Diazepam','10mg','comprimido','B1','comp.',true),
 ('00000000-0000-4000-8000-000000000102','Clonazepam 2mg comp.','Clonazepam','2mg','comprimido','B1','comp.',true),
 ('00000000-0000-4000-8000-000000000103','Haloperidol 5mg comp.','Haloperidol','5mg','comprimido','C1','comp.',true),
 ('00000000-0000-4000-8000-000000000104','Prometazina 25mg comp.','Prometazina','25mg','comprimido','C1','comp.',true),
 ('00000000-0000-4000-8000-000000000105','Naltrexona 50mg comp.','Naltrexona','50mg','comprimido','—','comp.',true),
 ('00000000-0000-4000-8000-000000000106','Dissulfiram 250mg comp.','Dissulfiram','250mg','comprimido','—','comp.',true);

-- PRESCRITORES
insert into prescritores (id, nome, conselho, uf, numero, is_dado_teste) values
 ('00000000-0000-4000-8000-000000000201','Dr. Ricardo Almeida','CRM','GO','11234',true),
 ('00000000-0000-4000-8000-000000000202','Dra. Lívia Cardoso','CRM','GO','9870',true);

-- FORNECEDORES
insert into fornecedores (id, nome, cnpj, tipo, endereco, is_dado_teste) values
 ('00000000-0000-4000-8000-000000000301','Drogaria São João — Anápolis','12.345.678/0001-90','drogaria','Av. Brasil, 1200 — Centro, Anápolis/GO',true),
 ('00000000-0000-4000-8000-000000000302','Farmoquímica Distribuidora Ltda','98.765.432/0001-10','distribuidora','Rod. GO-060, km 3 — Goiânia/GO',true);

-- PACIENTES (nome completo, CPF válido fictício, endereço, prontuário, admissão)
insert into pacientes (id, nome_completo, cpf, data_nascimento, prontuario, leito, endereco, telefone, data_admissao, prescritor_id, is_dado_teste) values
 ('00000000-0000-4000-8000-000000000401','João Antônio da Silva','382.915.047-41','1988-03-12','PRT-2026-0001','Q-01','Rua das Acácias, 45 — Jundiaí, Anápolis/GO','(62) 98111-0001','2026-05-28','00000000-0000-4000-8000-000000000201',true),
 ('00000000-0000-4000-8000-000000000402','Marcos Túlio de Oliveira','715.803.926-95','1975-11-30','PRT-2026-0002','Q-02','Av. Universitária, 980 — Maracanã, Anápolis/GO','(62) 98111-0002','2026-06-04','00000000-0000-4000-8000-000000000201',true),
 ('00000000-0000-4000-8000-000000000403','Carla Fernanda Lima','209.468.175-02','1992-07-08','PRT-2026-0003','Q-03','Rua 7 de Setembro, 120 — Centro, Anápolis/GO','(62) 98111-0003','2026-06-18','00000000-0000-4000-8000-000000000202',true),
 ('00000000-0000-4000-8000-000000000404','Vitor Rangel Pereira','634.027.819-13','1983-01-22','PRT-2026-0004','Q-04','Rua dos Ipês, 300 — Vila Jaiara, Anápolis/GO','(62) 98111-0004','2026-07-05','00000000-0000-4000-8000-000000000202',true),
 ('00000000-0000-4000-8000-000000000405','André Sampaio Costa','508.731.264-08','1979-09-15','PRT-2026-0005','Q-05','Rua Eng. Portela, 77 — Anápolis City, Anápolis/GO','(62) 98111-0005','2026-06-25','00000000-0000-4000-8000-000000000202',true),
 ('00000000-0000-4000-8000-000000000406','Renata Borges Antunes','471.592.038-79','1995-04-03','PRT-2026-0006','Q-06','Rua João Pinheiro, 210 — São Carlos, Anápolis/GO','(62) 98111-0006','2026-07-08','00000000-0000-4000-8000-000000000202',true);

-- PRESCRIÇÕES ATIVAS
insert into prescricoes (paciente_id, substancia_id, prescritor_id, dose, via, horarios, data_inicio, is_dado_teste) values
 ('00000000-0000-4000-8000-000000000401','00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000201','1 comp.','VO','["08h","22h"]','2026-05-28',true),
 ('00000000-0000-4000-8000-000000000402','00000000-0000-4000-8000-000000000102','00000000-0000-4000-8000-000000000201','1 comp.','VO','["22h"]','2026-06-04',true),
 ('00000000-0000-4000-8000-000000000403','00000000-0000-4000-8000-000000000103','00000000-0000-4000-8000-000000000202','1 comp.','VO','["08h"]','2026-06-18',true),
 ('00000000-0000-4000-8000-000000000403','00000000-0000-4000-8000-000000000104','00000000-0000-4000-8000-000000000202','1 comp.','VO','["SOS"]','2026-06-18',true),
 ('00000000-0000-4000-8000-000000000405','00000000-0000-4000-8000-000000000106','00000000-0000-4000-8000-000000000202','1 comp.','VO','["08h"]','2026-06-25',true),
 ('00000000-0000-4000-8000-000000000404','00000000-0000-4000-8000-000000000105','00000000-0000-4000-8000-000000000201','1 comp.','VO','["08h"]','2026-07-05',true),
 ('00000000-0000-4000-8000-000000000406','00000000-0000-4000-8000-000000000105','00000000-0000-4000-8000-000000000202','1 comp.','VO','["08h"]','2026-07-08',true);

-- INVENTÁRIO INICIAL (decisão 2) — abertura em 01/06/2026
insert into inventario_inicial (substancia_id, numero_lote, validade, quantidade, custo_unit, data, observacao, is_dado_teste) values
 ('00000000-0000-4000-8000-000000000101','DZP-INI','2028-01-31',40,0.38,'2026-06-01','Inventário de abertura',true),
 ('00000000-0000-4000-8000-000000000102','CLZ-INI','2027-11-30',30,0.52,'2026-06-01','Inventário de abertura',true),
 ('00000000-0000-4000-8000-000000000103','HAL-INI','2027-09-30',20,1.15,'2026-06-01','Inventário de abertura',true),
 ('00000000-0000-4000-8000-000000000104','PRO-INI','2027-08-31',25,0.90,'2026-06-01','Inventário de abertura',true),
 ('00000000-0000-4000-8000-000000000105','NTX-INI','2027-06-30',10,4.20,'2026-06-01','Inventário de abertura',true),
 ('00000000-0000-4000-8000-000000000106','DSF-INI','2027-05-31',10,2.75,'2026-06-01','Inventário de abertura',true);

-- NOTAS FISCAIS + itens
insert into notas_fiscais (id, numero, serie, data_emissao, fornecedor_id, canal, valor_total, is_dado_teste) values
 ('00000000-0000-4000-8000-000000000501','4482','1','2026-06-05','00000000-0000-4000-8000-000000000301','drogaria',null,true),
 ('00000000-0000-4000-8000-000000000502','5104','1','2026-07-02','00000000-0000-4000-8000-000000000302','distribuidora',null,true);

insert into nota_fiscal_itens (nota_fiscal_id, substancia_id, quantidade, numero_lote, validade, custo_unit, is_dado_teste) values
 ('00000000-0000-4000-8000-000000000501','00000000-0000-4000-8000-000000000101',60,'DZP-2606','2028-01-31',0.38,true),
 ('00000000-0000-4000-8000-000000000501','00000000-0000-4000-8000-000000000102',60,'CLZ-2606','2027-11-30',0.52,true),
 ('00000000-0000-4000-8000-000000000501','00000000-0000-4000-8000-000000000103',40,'HAL-2606','2027-09-30',1.15,true),
 ('00000000-0000-4000-8000-000000000501','00000000-0000-4000-8000-000000000104',30,'PRO-2606','2027-08-31',0.90,true),
 ('00000000-0000-4000-8000-000000000501','00000000-0000-4000-8000-000000000105',30,'NTX-2606','2027-06-30',4.20,true),
 ('00000000-0000-4000-8000-000000000501','00000000-0000-4000-8000-000000000106',30,'DSF-2606','2027-05-31',2.75,true),
 ('00000000-0000-4000-8000-000000000502','00000000-0000-4000-8000-000000000101',60,'DZP-2701','2027-08-15',0.40,true),
 ('00000000-0000-4000-8000-000000000502','00000000-0000-4000-8000-000000000103',20,'HAL-2701','2026-09-30',1.20,true);

-- DOAÇÃO
insert into doacoes (id, data, doador, is_dado_teste) values
 ('00000000-0000-4000-8000-000000000601','2026-06-20','Farmácia Solidária Anápolis',true);
insert into doacao_itens (doacao_id, substancia_id, quantidade, numero_lote, validade, valor_estimado, is_dado_teste) values
 ('00000000-0000-4000-8000-000000000601','00000000-0000-4000-8000-000000000105',15,'NTX-DOA1','2027-02-28',4.50,true),
 ('00000000-0000-4000-8000-000000000601','00000000-0000-4000-8000-000000000106',20,'DSF-DOA1','2027-01-31',2.80,true);

-- MEDICAÇÃO PRÓPRIA / CUSTÓDIA (restrita ao P04)
insert into medicacao_propria (id, data, paciente_id, obs, is_dado_teste) values
 ('00000000-0000-4000-8000-000000000701','2026-07-05','00000000-0000-4000-8000-000000000404','Trazido pela família na admissão, embalagem original lacrada',true);
insert into medicacao_propria_itens (medicacao_propria_id, substancia_id, quantidade, numero_lote, validade, is_dado_teste) values
 ('00000000-0000-4000-8000-000000000701','00000000-0000-4000-8000-000000000105',14,'NTX-P04','2027-04-30',true);

-- DISPENSAÇÕES (junho + julho)
insert into dispensacoes (data, substancia_id, numero_lote, quantidade, referencia, paciente_id, is_dado_teste) values
 ('2026-06-06','00000000-0000-4000-8000-000000000101','DZP-INI',1,'Dose 22h','00000000-0000-4000-8000-000000000401',true),
 ('2026-06-08','00000000-0000-4000-8000-000000000102','CLZ-INI',1,'Dose 22h','00000000-0000-4000-8000-000000000402',true),
 ('2026-06-20','00000000-0000-4000-8000-000000000101','DZP-2606',1,'Dose 22h','00000000-0000-4000-8000-000000000401',true),
 ('2026-06-22','00000000-0000-4000-8000-000000000103','HAL-2606',1,'Dose 08h','00000000-0000-4000-8000-000000000403',true),
 ('2026-06-25','00000000-0000-4000-8000-000000000104','PRO-2606',1,'Dose 08h','00000000-0000-4000-8000-000000000403',true),
 ('2026-06-28','00000000-0000-4000-8000-000000000106','DSF-INI',1,'Dose 08h','00000000-0000-4000-8000-000000000405',true),
 ('2026-06-30','00000000-0000-4000-8000-000000000102','CLZ-2606',1,'Dose 22h','00000000-0000-4000-8000-000000000402',true),
 ('2026-07-03','00000000-0000-4000-8000-000000000101','DZP-2606',1,'Dose 22h','00000000-0000-4000-8000-000000000401',true),
 ('2026-07-05','00000000-0000-4000-8000-000000000103','HAL-2606',1,'Dose 08h','00000000-0000-4000-8000-000000000403',true),
 ('2026-07-06','00000000-0000-4000-8000-000000000105','NTX-2606',1,'Dose 08h','00000000-0000-4000-8000-000000000406',true),
 ('2026-07-08','00000000-0000-4000-8000-000000000101','DZP-2701',1,'Dose 22h','00000000-0000-4000-8000-000000000401',true),
 ('2026-07-09','00000000-0000-4000-8000-000000000102','CLZ-2606',1,'Dose 22h','00000000-0000-4000-8000-000000000402',true),
 ('2026-07-10','00000000-0000-4000-8000-000000000104','PRO-2606',2,'Dose 08h + SOS','00000000-0000-4000-8000-000000000403',true),
 ('2026-07-11','00000000-0000-4000-8000-000000000106','DSF-2606',1,'Dose 08h','00000000-0000-4000-8000-000000000405',true),
 ('2026-07-12','00000000-0000-4000-8000-000000000103','HAL-2701',1,'Dose 08h','00000000-0000-4000-8000-000000000403',true),
 ('2026-07-13','00000000-0000-4000-8000-000000000101','DZP-2606',1,'Dose 08h','00000000-0000-4000-8000-000000000401',true),
 ('2026-07-14','00000000-0000-4000-8000-000000000105','NTX-P04',1,'Dose 08h (medicação própria)','00000000-0000-4000-8000-000000000404',true),
 ('2026-07-14','00000000-0000-4000-8000-000000000106','DSF-2606',1,'Dose 08h','00000000-0000-4000-8000-000000000405',true);

-- DEVOLUÇÕES (reintegração ao estoque)
insert into devolucoes (data, substancia_id, numero_lote, quantidade, motivo, paciente_id, is_dado_teste) values
 ('2026-06-26','00000000-0000-4000-8000-000000000103','HAL-2606',1,'Dose recusada pelo paciente','00000000-0000-4000-8000-000000000403',true),
 ('2026-07-10','00000000-0000-4000-8000-000000000104','PRO-2606',1,'SOS não administrado — paciente já estava calmo','00000000-0000-4000-8000-000000000403',true);

-- CARRINHO DE EMERGÊNCIA
insert into carrinho_emergencia (id, lacre_atual, status, ultima_conferencia, is_dado_teste) values
 ('00000000-0000-4000-8000-000000000901','LAC-004821','intacto','2026-07-10',true);
insert into carrinho_itens (carrinho_id, nome, qtd_padrao, validade, is_dado_teste) values
 ('00000000-0000-4000-8000-000000000901','Adrenalina 1mg/mL amp.',5,'2027-04-30',true),
 ('00000000-0000-4000-8000-000000000901','Atropina 0,25mg/mL amp.',5,'2027-02-28',true),
 ('00000000-0000-4000-8000-000000000901','Diazepam 10mg/2mL amp.',3,'2027-06-30',true),
 ('00000000-0000-4000-8000-000000000901','Flumazenil 0,1mg/mL amp.',3,'2026-11-30',true),
 ('00000000-0000-4000-8000-000000000901','Naloxona 0,4mg/mL amp.',5,'2027-01-31',true),
 ('00000000-0000-4000-8000-000000000901','Soro Glicosado 50% 10mL amp.',5,'2027-08-31',true);

-- POPs
insert into pops (area, titulo, status, is_dado_teste) values
 ('Farmácia','Admissão e Cadastro do Paciente','pendente',true),
 ('Farmácia','Recebimento e Conferência de Notas Fiscais','pendente',true),
 ('Farmácia','Recebimento de Doações','pendente',true),
 ('Farmácia','Medicação Trazida pelo Paciente (Custódia)','pendente',true),
 ('Farmácia','Preparo e Etiquetagem da Dose Unitária','pendente',true),
 ('Enfermagem','Dupla Checagem e Administração de Medicamentos','pendente',true),
 ('Farmácia','Devolução e Reintegração de Medicação SOS ao Estoque','pendente',true),
 ('Farmácia + Enfermagem','Controle do Carrinho de Emergência e Lacre','pendente',true),
 ('Farmácia','Escrituração e Balanço Mensal de Controlados','pendente',true),
 ('Farmácia','Backup e Continuidade do Sistema','pendente',true);

-- ---------------------------------------------------------------------------
-- CONFERÊNCIA RÁPIDA (rode após o seed p/ validar os saldos derivados)
--   select s.nome, v.saldo from vw_saldo_substancia v
--     join substancias s on s.id = v.substancia_id order by s.nome;
--   select folio, data_movimento, tipo, numero_lote, quantidade
--     from vw_movimentacoes order by folio;
-- ---------------------------------------------------------------------------
