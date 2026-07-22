-- ============================================================================
-- Hospital Reviva — pops_conteudo_v3.sql
-- Redige os POPs restantes do fluxo, no mesmo padrão dos anteriores
-- (descrição por atribuição e base legal; regime presencial periódico do RT
-- com retaguarda à distância; sem citar ausência de recursos ou dias fixos).
--
-- Depende de: migration_pops.sql, migration_pops_corpo.sql e
-- pops_conteudo_v2.sql já aplicados.
-- Rodar UMA VEZ no SQL Editor. Atualiza pelos títulos já semeados.
-- ============================================================================

-- 8) ADMISSÃO E CADASTRO DO PACIENTE ----------------------------------------
update pops set codigo = coalesce(codigo,'POP-FAR-006'), versao='01', area='Farmácia',
  corpo = $J${
    "objetivo": "Padronizar o cadastro do paciente admitido e a organização de suas informações assistenciais no sistema, assegurando identificação correta, vínculo do prescritor e base para prescrição, dispensação e custódia.",
    "aplicacao": "Aplica-se a todo paciente admitido na clínica. O cadastro é realizado no sistema no momento da admissão, sendo as informações farmacoterapêuticas conferidas pelo farmacêutico Responsável Técnico em regime presencial periódico, com retaguarda à distância à equipe sempre que necessário.",
    "responsabilidades": [
      "Enfermagem / recepção: registrar a admissão e os dados de identificação do paciente no sistema, e comunicar ao RT a existência de medicação trazida pelo paciente.",
      "Farmacêutico Responsável Técnico: conferir a prescrição e o histórico farmacoterapêutico, vincular o prescritor responsável e orientar a equipe.",
      "Médico prescritor: emitir a prescrição do paciente admitido."
    ],
    "materiais": [
      "Sistema de gestão da farmácia (tela Pacientes)",
      "Documento de identificação do paciente",
      "Prescrição do médico responsável"
    ],
    "procedimento": [
      "Registrar o paciente no sistema com nome completo, data de nascimento, prontuário, leito e data de admissão.",
      "Vincular o prescritor responsável ao paciente.",
      "Verificar se o paciente trouxe medicação própria e, em caso positivo, acionar o procedimento de Custódia.",
      "Conferir a prescrição vigente e cadastrá-la, definindo dose, quantidade por horário, via e horários.",
      "Confirmar que o paciente passa a constar no mapa de medicação a partir da data de admissão.",
      "Manter os dados atualizados durante a internação (troca de leito, novas prescrições, alta)."
    ],
    "registros": ["Cadastro do paciente no sistema", "Prescrição registrada", "Termo de Custódia, quando houver medicação própria"],
    "referencias": ["RDC nº 63/2011 - Boas Práticas de Funcionamento para os Serviços de Saúde"]
  }$J$
where codigo='POP-FAR-006' or titulo='Admissão e Cadastro do Paciente';

-- 9) CONFERÊNCIA DA ADMINISTRAÇÃO (antiga "dupla checagem") ------------------
-- Foco na conferência/registro, sem prometer dupla checagem por dois
-- profissionais que a estrutura atual não comporta.
update pops set codigo = coalesce(codigo,'POP-ENF-002'), versao='01', area='Enfermagem',
  titulo = 'Conferência e Registro da Administração de Medicamentos',
  corpo = $J${
    "objetivo": "Padronizar a conferência dos itens de segurança na administração de medicamentos e o registro fidedigno de cada administração no mapa, reduzindo risco de erro e assegurando rastreabilidade.",
    "aplicacao": "Aplica-se à equipe de enfermagem na administração de medicamentos. Complementa o POP de Preparo e Administração, detalhando a conferência de segurança e o registro. A validação farmacoterapêutica é do farmacêutico RT, em regime presencial periódico com retaguarda à distância.",
    "responsabilidades": [
      "Enfermagem: conferir os itens de segurança antes de administrar e registrar a administração no mapa; sinalizar dúvidas ao RT.",
      "Farmacêutico Responsável Técnico: validar prescrições, orientar a conferência e revisar os registros na escrituração."
    ],
    "materiais": ["Mapa de medicação", "Prescrição vigente", "Caneta para rubrica"],
    "procedimento": [
      "Antes de administrar, conferir os itens de segurança: paciente certo, medicamento certo, dose certa, via certa, horário certo e registro certo.",
      "Confirmar a identidade do paciente pelo nome antes da administração.",
      "Conferir a quantidade por horário indicada na prescrição/mapa (ex.: mais de um comprimido por dose, quando prescrito).",
      "Administrar e, na sequência, rubricar o mapa no campo do dia e horário; para SOS, anotar o horário administrado.",
      "Diante de qualquer divergência entre prescrição, mapa e medicação disponível, não administrar e acionar o RT (presencial ou à distância).",
      "Registrar recusas, adiamentos e intercorrências no mapa/prontuário."
    ],
    "registros": ["Mapa de medicação rubricado", "Anotações de intercorrência no prontuário"],
    "referencias": ["RDC nº 63/2011", "Lei nº 7.498/1986 e Decreto nº 94.406/1987 - exercício da enfermagem"]
  }$J$
where codigo='POP-ENF-002' or titulo='Dupla Checagem e Administração de Medicamentos';

-- 10) DEVOLUÇÃO E REINTEGRAÇÃO DE MEDICAÇÃO AO ESTOQUE -----------------------
update pops set codigo = coalesce(codigo,'POP-FAR-008'), versao='01', area='Farmácia',
  corpo = $J${
    "objetivo": "Padronizar a devolução de medicação não administrada e sua reintegração ao estoque ou à custódia de origem, preservando a rastreabilidade e evitando perdas indevidas.",
    "aplicacao": "Aplica-se a medicamentos preparados/dispensados e não administrados (recusa, suspensão, alta, dose não utilizada). A conferência e o registro da devolução são de competência do farmacêutico RT, em regime presencial periódico.",
    "responsabilidades": [
      "Enfermagem: devolver a medicação não administrada, informando motivo, e comunicar o RT.",
      "Farmacêutico Responsável Técnico: conferir a devolução, registrar o retorno ao estoque ou à custódia de origem e avaliar a possibilidade de reaproveitamento."
    ],
    "materiais": ["Sistema de gestão da farmácia (dispensação / devolução)", "Medicação a ser devolvida com sua identificação"],
    "procedimento": [
      "Ao não administrar uma dose já preparada, separar a medicação e anotar o motivo (recusa, suspensão, alta, ausência).",
      "Registrar a devolução no sistema, vinculando ao paciente e ao lote de origem.",
      "Avaliar a integridade e a validade do item; reintegrar ao estoque geral ou à custódia do paciente conforme a origem, ou registrar perda quando não reaproveitável.",
      "Para medicação de custódia, o retorno é sempre à custódia do próprio paciente.",
      "Conferir, na escrituração, que a devolução foi refletida no saldo."
    ],
    "registros": ["Registro de devolução no sistema", "Registro de perda, quando aplicável"],
    "referencias": ["RDC nº 63/2011", "Portaria SVS/MS nº 344/1998 (itens controlados)"]
  }$J$
where codigo='POP-FAR-008' or titulo='Devolução e Reintegração de Medicação SOS ao Estoque';

-- 11) CARRINHO / MALETA DE EMERGÊNCIA E LACRE -------------------------------
update pops set codigo = coalesce(codigo,'POP-FAR-010'), versao='01', area='Farmácia + Enfermagem',
  titulo = 'Controle do Carrinho/Maleta de Emergência e Lacre',
  corpo = $J${
    "objetivo": "Padronizar a composição, o lacre e a conferência do carrinho/maleta de emergência, assegurando disponibilidade e integridade dos itens para situações de urgência.",
    "aplicacao": "Aplica-se ao carrinho/maleta de emergência da clínica. A conferência da composição e a reposição são acompanhadas pelo farmacêutico RT em regime presencial periódico; a verificação da integridade do lacre é feita pela enfermagem em rotina.",
    "responsabilidades": [
      "Enfermagem: verificar a integridade do lacre em rotina; usar os itens apenas em emergência; comunicar o rompimento do lacre.",
      "Farmacêutico Responsável Técnico: definir e conferir a composição, controlar validades, repor itens e relacrar após uso ou vencimento, registrando a conferência.",
      "Após qualquer abertura, o carrinho é conferido, reposto e relacrado, registrando-se novo número de lacre."
    ],
    "materiais": ["Carrinho/maleta de emergência", "Lista de composição padronizada", "Lacres numerados", "Sistema de gestão (Carrinho de Emergência)"],
    "procedimento": [
      "Manter a composição do carrinho conforme lista padronizada, com quantidades e validades controladas.",
      "Manter o carrinho lacrado quando não estiver em uso; registrar o número do lacre vigente no sistema.",
      "Verificar em rotina a integridade do lacre e a data de validade dos itens visíveis.",
      "Em emergência, romper o lacre e utilizar os itens necessários, anotando o que foi usado.",
      "Após o uso (ou ao vencer itens/lacre), conferir a composição, repor o que faltar, atualizar validades e relacrar, registrando o novo lacre e a conferência no sistema.",
      "Registrar as conferências periódicas com responsável e data."
    ],
    "registros": ["Registro do lacre vigente e das conferências no sistema", "Registro de reposição após uso"],
    "referencias": ["RDC nº 63/2011"]
  }$J$
where codigo='POP-FAR-010' or titulo='Controle do Carrinho de Emergência e Lacre';

-- 12) COTAÇÃO E AQUISIÇÃO ---------------------------------------------------
update pops set codigo = coalesce(codigo,'POP-FAR-012'), versao='01', area='Farmácia',
  corpo = $J${
    "objetivo": "Padronizar a cotação e a aquisição de medicamentos, assegurando compra de fornecedores regulares, comparação de preços e rastreabilidade do pedido.",
    "aplicacao": "Aplica-se à aquisição de medicamentos pela clínica. Conduzida pelo farmacêutico Responsável Técnico, com apoio administrativo da instituição.",
    "responsabilidades": [
      "Farmacêutico Responsável Técnico: levantar as necessidades, solicitar cotação a fornecedores regulares, comparar propostas e emitir o pedido.",
      "Administração/direção: autorizar a compra e providenciar o pagamento junto aos fornecedores."
    ],
    "materiais": ["Sistema de gestão da farmácia (Cotação)", "Relação de fornecedores regulares (com regularidade sanitária)"],
    "procedimento": [
      "Levantar os itens e as quantidades a adquirir a partir da padronização e do estoque.",
      "Registrar a cotação no sistema e emitir a solicitação para os fornecedores.",
      "Lançar os preços recebidos por fornecedor (embalagem, preço, validade) e comparar por preço unitário.",
      "Selecionar o melhor preço por item e gerar o pedido por fornecedor.",
      "Verificar a regularidade do fornecedor (autorização/licença) antes de efetivar a compra.",
      "Encaminhar o pedido à administração para autorização e aquisição; ao receber, aplicar o POP de Conferência de Notas Fiscais."
    ],
    "registros": ["Cotação e pedidos registrados no sistema", "Notas fiscais de aquisição"],
    "referencias": ["RDC nº 63/2011", "Portaria SVS/MS nº 344/1998 (aquisição de itens controlados de fornecedor autorizado)"]
  }$J$
where codigo='POP-FAR-012' or titulo='Cotação e Aquisição de Medicamentos';

-- 13) BACKUP E CONTINUIDADE DO SISTEMA --------------------------------------
update pops set codigo = coalesce(codigo,'POP-FAR-013'), versao='01', area='Farmácia',
  corpo = $J${
    "objetivo": "Assegurar a continuidade da operação e a preservação dos registros do sistema de gestão da farmácia diante de indisponibilidade temporária, garantindo que a assistência e a escrituração não sejam interrompidas.",
    "aplicacao": "Aplica-se à operação do sistema de gestão da farmácia (base de dados e aplicação). Contempla a contingência em papel e a preservação dos registros oficiais impressos.",
    "responsabilidades": [
      "Farmacêutico Responsável Técnico: garantir a impressão e a guarda dos registros oficiais (Livro, balanço, mapas), e conferir a integridade dos dados.",
      "Enfermagem: na indisponibilidade do sistema, manter os registros de administração em papel (mapa impresso), para posterior lançamento."
    ],
    "materiais": ["Sistema de gestão (base Supabase/Postgres)", "Mapas e livros impressos", "Local de guarda dos documentos oficiais"],
    "procedimento": [
      "Manter impressos e assinados os registros oficiais de cada período (Livro de Registro, balanço, mapas rubricados) — estes são a via oficial e independem do sistema.",
      "Gerar os mapas de medicação com antecedência (por período), de modo que a administração e o registro em papel continuem mesmo se o sistema ficar indisponível.",
      "Na indisponibilidade do sistema, a enfermagem registra as administrações no mapa impresso; ao retornar, o RT lança os dados retroativamente pela data real.",
      "Conferir periodicamente a integridade dos dados e a correspondência entre os registros impressos e o sistema.",
      "Guardar os documentos oficiais impressos em local seguro, organizados por período, pelo prazo legal de guarda."
    ],
    "registros": ["Documentos oficiais impressos e arquivados", "Mapas de contingência preenchidos"],
    "referencias": ["RDC nº 63/2011", "Portaria SVS/MS nº 344/1998 (guarda da escrituração de controlados)"]
  }$J$
where codigo='POP-FAR-013' or titulo='Backup e Continuidade do Sistema';

-- Fim do conteúdo v3.
