-- ============================================================================
-- Hospital Reviva — dados_estabelecimento.sql
-- Preenche os dados do estabelecimento a partir dos documentos oficiais
-- (Contrato Social, Alvará de Licença Sanitária e Certidão de Regularidade
-- Técnica do CRF-GO). Esses dados alimentam todos os cabeçalhos e rodapés
-- impressos: receituários, folha de prescrição, sinais vitais, Livro de
-- Registro, BMPO, POPs, cotações e pedidos.
--
-- Rodar UMA VEZ no SQL Editor. Tem WHERE. Pode ser repetido.
-- ============================================================================

update estabelecimento set
  razao_social          = 'CLINICA REVIVA LTDA',
  nome_fantasia         = 'CLINICA REVIVA',
  cnpj                  = '65.202.027/0001-02',
  endereco              = 'RUA 1, Nº 865, QD. 00, LT. 16 - SITIOS DE RECREIO AMERICANO DO BRASIL',
  municipio_uf          = 'ANAPOLIS/GO',
  autorizacao_sanitaria = 'ALVARA SANITARIO Nº 20262015 - VALIDO ATE 02/07/2027 - LIBERADO USO DE MEDICAMENTOS DE CONTROLE ESPECIAL DA PORTARIA MS 344/1998',
  licenca_numero        = 'CRT CRF-GO Nº 2439100 - VALIDA ATE 20/09/2026'
where id = (select id from estabelecimento order by created_at limit 1);

-- Se a tabela ainda estiver vazia, cria o registro
insert into estabelecimento (razao_social, nome_fantasia, cnpj, endereco, municipio_uf, autorizacao_sanitaria, licenca_numero)
select 'CLINICA REVIVA LTDA', 'CLINICA REVIVA', '65.202.027/0001-02',
       'RUA 1, Nº 865, QD. 00, LT. 16 - SITIOS DE RECREIO AMERICANO DO BRASIL',
       'ANAPOLIS/GO',
       'ALVARA SANITARIO Nº 20262015 - VALIDO ATE 02/07/2027 - LIBERADO USO DE MEDICAMENTOS DE CONTROLE ESPECIAL DA PORTARIA MS 344/1998',
       'CRT CRF-GO Nº 2439100 - VALIDA ATE 20/09/2026'
where not exists (select 1 from estabelecimento);

-- ============================================================================
-- CONFERÊNCIA
-- ============================================================================
select razao_social, nome_fantasia, cnpj, municipio_uf from estabelecimento;

-- ============================================================================
-- ATENÇÃO — RESPONSÁVEL TÉCNICO
-- A Certidão de Regularidade Técnica do CRF-GO (nº 2439100) registra como
-- DIRETOR TÉCNICO a farmacêutica NAIARA ALVES BASTOS - CRF-GO 15964.
-- O sistema está configurado com outro profissional no cadastro de RT.
--
-- O nome que consta na CRT é o que os fornecedores e a fiscalização vão
-- conferir. Ajuste o cadastro em Configurações → Responsável Técnico para
-- refletir a situação real antes de enviar documentação a terceiros.
-- ============================================================================
