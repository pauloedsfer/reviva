-- ============================================================================
-- Hospital Reviva — migration_maiusculas.sql   (OPCIONAL)
-- Passa os DADOS JÁ CADASTRADOS para MAIÚSCULAS nos campos de nome/texto.
-- A padronização da digitação nova já é feita pelo sistema; este script é
-- só para uniformizar o que foi cadastrado antes.
--
-- NÃO altera: e-mails, senhas, IDs/UUID, códigos, e a tabela de POPs
-- (documentos em texto livre). Também não mexe em CPF/CNPJ/telefone (só dígitos).
--
-- Cada UPDATE tem WHERE (só toca linhas que realmente mudam), então é
-- idempotente — pode rodar mais de uma vez sem efeito colateral — e não
-- dispara o aviso de "UPDATE sem WHERE" do editor.
--
-- Rodar UMA VEZ no SQL Editor (opcional). Faça um Exportar backup antes.
-- ============================================================================

-- SUBSTÂNCIAS
update substancias set nome = upper(nome) where nome is not null and nome <> upper(nome);
update substancias set principio_ativo = upper(principio_ativo) where principio_ativo is not null and principio_ativo <> upper(principio_ativo);
update substancias set concentracao = upper(concentracao) where concentracao is not null and concentracao <> upper(concentracao);
update substancias set forma = upper(forma) where forma is not null and forma <> upper(forma);

-- PACIENTES
update pacientes set nome_completo = upper(nome_completo) where nome_completo is not null and nome_completo <> upper(nome_completo);
update pacientes set prontuario = upper(prontuario) where prontuario is not null and prontuario <> upper(prontuario);
update pacientes set leito = upper(leito) where leito is not null and leito <> upper(leito);
update pacientes set endereco = upper(endereco) where endereco is not null and endereco <> upper(endereco);

-- PRESCRITORES
update prescritores set nome = upper(nome) where nome is not null and nome <> upper(nome);
update prescritores set numero = upper(numero) where numero is not null and numero <> upper(numero);

-- FORNECEDORES
update fornecedores set nome = upper(nome) where nome is not null and nome <> upper(nome);
update fornecedores set endereco = upper(endereco) where endereco is not null and endereco <> upper(endereco);

-- ESTABELECIMENTO
update estabelecimento set razao_social = upper(razao_social) where razao_social is not null and razao_social <> upper(razao_social);
update estabelecimento set nome_fantasia = upper(nome_fantasia) where nome_fantasia is not null and nome_fantasia <> upper(nome_fantasia);
update estabelecimento set endereco = upper(endereco) where endereco is not null and endereco <> upper(endereco);
update estabelecimento set autorizacao_sanitaria = upper(autorizacao_sanitaria) where autorizacao_sanitaria is not null and autorizacao_sanitaria <> upper(autorizacao_sanitaria);
update estabelecimento set afe_anvisa = upper(afe_anvisa) where afe_anvisa is not null and afe_anvisa <> upper(afe_anvisa);
update estabelecimento set licenca_numero = upper(licenca_numero) where licenca_numero is not null and licenca_numero <> upper(licenca_numero);

-- RESPONSÁVEL TÉCNICO
update responsavel_tecnico set nome = upper(nome) where nome is not null and nome <> upper(nome);
update responsavel_tecnico set numero_registro = upper(numero_registro) where numero_registro is not null and numero_registro <> upper(numero_registro);
update responsavel_tecnico set autorizacao_mapa = upper(autorizacao_mapa) where autorizacao_mapa is not null and autorizacao_mapa <> upper(autorizacao_mapa);
update responsavel_tecnico set identificacao_assinatura = upper(identificacao_assinatura) where identificacao_assinatura is not null and identificacao_assinatura <> upper(identificacao_assinatura);

-- NOTAS FISCAIS  (obs.: a coluna "canal" NÃO entra — é campo de valor
-- controlado por CHECK, não texto livre)
update notas_fiscais set numero = upper(numero) where numero is not null and numero <> upper(numero);
update notas_fiscais set serie = upper(serie) where serie is not null and serie <> upper(serie);

-- DOAÇÕES
update doacoes set doador = upper(doador) where doador is not null and doador <> upper(doador);
update doacoes set documento_ref = upper(documento_ref) where documento_ref is not null and documento_ref <> upper(documento_ref);

-- AJUSTES DE ESTOQUE
update ajustes_estoque set numero_lote = upper(numero_lote) where numero_lote is not null and numero_lote <> upper(numero_lote);
update ajustes_estoque set justificativa = upper(justificativa) where justificativa is not null and justificativa <> upper(justificativa);

-- INVENTÁRIO INICIAL
update inventario_inicial set numero_lote = upper(numero_lote) where numero_lote is not null and numero_lote <> upper(numero_lote);
update inventario_inicial set observacao = upper(observacao) where observacao is not null and observacao <> upper(observacao);

-- MEDICAÇÃO PRÓPRIA (custódia) e destinos
update medicacao_propria set obs = upper(obs) where obs is not null and obs <> upper(obs);
update custodia_destinos set obs = upper(obs) where obs is not null and obs <> upper(obs);

-- COTAÇÕES
update cotacoes set identificador = upper(identificador) where identificador is not null and identificador <> upper(identificador);
update cotacoes set observacao = upper(observacao) where observacao is not null and observacao <> upper(observacao);
update cotacao_itens set descricao = upper(descricao) where descricao is not null and descricao <> upper(descricao);

-- CARRINHO DE EMERGÊNCIA
update carrinho_emergencia set lacre_atual = upper(lacre_atual) where lacre_atual is not null and lacre_atual <> upper(lacre_atual);
update carrinho_itens set nome = upper(nome) where nome is not null and nome <> upper(nome);

-- Fim. (POPs intencionalmente não incluídos.)
