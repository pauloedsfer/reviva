-- ============================================================================
-- Hospital Reviva — pops_conteudo_inicial.sql
-- Preenche o CORPO dos três POPs prioritários com conteúdo fiel à realidade
-- atual da clínica (6 pacientes, 4 em uso de medicação; sem auxiliar de
-- farmácia; enfermagem prepara e administra no horário; RT presente em alguns
-- dias com suporte remoto por WhatsApp; custódia conferida pelo RT quando
-- presencial; estoque pequeno conferido presencialmente).
--
-- IMPORTANTE: estes POPs descrevem o processo REAL. Ao mudar a estrutura
-- (ex.: contratação de auxiliar, dose unitária centralizada), revise o POP,
-- incremente a versão e atualize a data de vigência.
--
-- Depende de: migration_pops.sql e migration_pops_corpo.sql já aplicadas.
-- Rodar UMA VEZ no SQL Editor. Atualiza pelos títulos já semeados.
-- ============================================================================

-- 1) PREPARO E ADMINISTRAÇÃO PELA ENFERMAGEM ---------------------------------
update pops set
  codigo = coalesce(codigo, 'POP-ENF-001'),
  versao = coalesce(versao, '01'),
  area = 'Enfermagem',
  corpo = $J${
    "objetivo": "Padronizar o preparo e a administração de medicamentos aos pacientes internados, realizados pela equipe de enfermagem no momento de cada horário de administração, garantindo o cumprimento da prescrição, a identificação correta do paciente e o registro da administração.",
    "aplicacao": "Aplica-se a toda a equipe de enfermagem da clínica, para todos os pacientes com prescrição ativa. Reflete a estrutura atual: não há auxiliar de farmácia; o preparo e a administração são feitos pela enfermagem, não havendo dose unitária centralizada previamente montada pela farmácia.",
    "responsabilidades": [
      "Enfermagem: preparar e administrar a medicação no horário prescrito, conferir a identificação do paciente, registrar a administração no mapa de medicação e comunicar intercorrências.",
      "Farmacêutico Responsável Técnico (RT): validar as prescrições, manter o mapa de medicação disponível e atualizado, orientar a equipe presencialmente e por suporte remoto (WhatsApp), e revisar este procedimento.",
      "O RT está presente em alguns dias da semana e disponível remotamente para dúvidas sobre medicamentos sempre que necessário."
    ],
    "materiais": [
      "Mapa de medicação impresso (gerado pelo sistema, por paciente ou por dia)",
      "Prescrição vigente do paciente",
      "Medicamentos (do estoque da clínica ou da custódia do próprio paciente)",
      "Água, copos descartáveis e materiais de administração conforme a via",
      "Caneta para rubrica da administração no mapa"
    ],
    "procedimento": [
      "Conferir, no mapa de medicação, os medicamentos e horários previstos para o período.",
      "Separar a medicação de cada paciente imediatamente antes do horário de administração, conferindo nome do medicamento, dose (quantidade por horário), via e horário contra a prescrição.",
      "Para pacientes com medicação em custódia, utilizar preferencialmente o medicamento trazido pelo próprio paciente, conforme identificado no sistema; não utilizar medicação de custódia de um paciente para outro.",
      "Confirmar a identidade do paciente antes de administrar (chamar pelo nome e confirmar).",
      "Administrar a medicação e observar a tomada.",
      "Registrar (rubricar) a administração no mapa, no campo do dia e horário correspondentes. Para medicação SOS, anotar o horário em que foi administrada.",
      "Em caso de recusa, não administração, intercorrência ou dúvida sobre a prescrição, registrar no mapa/prontuário e comunicar o RT — presencialmente ou por WhatsApp.",
      "Ao final do período, entregar/arquivar o mapa preenchido para conferência do RT e escrituração."
    ],
    "registros": [
      "Mapa de medicação rubricado (comprova a administração e serve de fonte para a baixa no sistema)",
      "Anotações de intercorrência no prontuário do paciente"
    ],
    "referencias": [
      "RDC 63/2011 - Boas Práticas de Funcionamento para os Serviços de Saúde",
      "Prescrição médica vigente de cada paciente"
    ]
  }$J$
where titulo = 'Preparo e Etiquetagem da Dose Unitária'
   or titulo = 'Preparo e Administração pela Enfermagem';

-- Ajusta o título para refletir a realidade (preparo pela enfermagem, sem dose unitária centralizada)
update pops set titulo = 'Preparo e Administração de Medicamentos pela Enfermagem'
 where titulo = 'Preparo e Etiquetagem da Dose Unitária';

-- 2) CUSTÓDIA (MEDICAÇÃO TRAZIDA PELO PACIENTE) ------------------------------
update pops set
  codigo = coalesce(codigo, 'POP-FAR-004'),
  versao = coalesce(versao, '01'),
  area = 'Farmácia',
  corpo = $J${
    "objetivo": "Padronizar o recebimento, a conferência, a guarda e o uso da medicação trazida pelo próprio paciente ou adquirida pela família após prescrição (medicação em custódia), assegurando rastreabilidade e uso exclusivo para o paciente a quem pertence.",
    "aplicacao": "Aplica-se a toda medicação de propriedade do paciente sob guarda da clínica. Reflete a realidade atual, em que a maior parte das medicações provém da custódia (trazidas pelos pacientes ou compradas pelos familiares após prescrição).",
    "responsabilidades": [
      "Farmacêutico RT: conferir e registrar a medicação de custódia no sistema quando presencial; definir o destino da custódia na alta (devolução à família ou integração ao estoque).",
      "Enfermagem: receber a medicação quando o RT não estiver presente, guardar em local adequado e comunicar o RT para conferência e registro na próxima presença ou por WhatsApp.",
      "A conferência e o registro formal da custódia são realizados pelo RT quando presencial."
    ],
    "materiais": [
      "Sistema de gestão da farmácia (tela Medicação do Paciente)",
      "Prescrição vigente do paciente",
      "Local de guarda identificado por paciente",
      "Termo de Custódia (gerado pelo sistema)"
    ],
    "procedimento": [
      "Ao dar entrada de medicação trazida pelo paciente/família, verificar se corresponde à prescrição vigente e conferir nome, concentração, forma, lote, validade e quantidade.",
      "Registrar a medicação no sistema (Medicação do Paciente), vinculando-a ao paciente, com lote e validade; imprimir o Termo de Custódia quando aplicável.",
      "Guardar a medicação em local identificado, separada do estoque geral da clínica; a medicação de custódia é de uso exclusivo do paciente a quem pertence.",
      "Na administração, utilizar preferencialmente o lote de custódia do próprio paciente (o sistema já indica esse lote em primeiro lugar).",
      "Se a medicação for recebida em dia sem a presença do RT, a enfermagem guarda e comunica o RT (WhatsApp); a conferência e o registro formais ocorrem na presença do RT.",
      "Na alta do paciente, o saldo de custódia fica em 'aguardando retirada'; o RT decide, item a item: devolver à família (com Termo de Devolução) ou integrar ao estoque da clínica.",
      "Registrar sempre no sistema a movimentação, mantendo a rastreabilidade do que foi recebido, consumido, devolvido ou integrado."
    ],
    "registros": [
      "Termo de Custódia assinado",
      "Termo de Devolução (na devolução à família)",
      "Registro no sistema (recebimento, consumo, destino na alta)"
    ],
    "referencias": [
      "RDC 63/2011 - Boas Práticas de Funcionamento para os Serviços de Saúde",
      "Portaria SVS/MS 344/1998 (quando a medicação for substância controlada)"
    ]
  }$J$
where titulo = 'Medicação Trazida pelo Paciente (Custódia)';

-- 3) CONFERÊNCIA DE ESTOQUE PRESENCIAL ---------------------------------------
update pops set
  codigo = coalesce(codigo, 'POP-FAR-009'),
  versao = coalesce(versao, '01'),
  area = 'Farmácia',
  titulo = 'Conferência Presencial do Estoque',
  corpo = $J${
    "objetivo": "Padronizar a conferência física do estoque de medicamentos da clínica, realizada pelo farmacêutico RT quando presencial, garantindo a correspondência entre o saldo do sistema e a quantidade física, a verificação de validades e a identificação de divergências.",
    "aplicacao": "Aplica-se ao estoque de medicamentos da clínica (excluída a medicação de custódia dos pacientes). Reflete a realidade atual: estoque pequeno, conferido presencialmente pelo RT em suas visitas.",
    "responsabilidades": [
      "Farmacêutico RT: realizar a conferência presencial, lançar os ajustes justificados no sistema quando houver divergência e monitorar validades.",
      "Enfermagem: comunicar ao RT qualquer perda, quebra ou anormalidade percebida no estoque entre as visitas."
    ],
    "materiais": [
      "Sistema de gestão da farmácia",
      "Folha de Contagem / Inventário impressa pelo sistema (Substância, Lote, Validade, Saldo no sistema, colunas em branco para contagem física e diferença)"
    ],
    "procedimento": [
      "Gerar a Folha de Contagem no sistema (aba Ajuste de Estoque), aplicando os filtros desejados (substância, faixa de vencimento, ocultar zerados).",
      "Percorrer o estoque físico e anotar na folha a contagem física de cada lote.",
      "Comparar a contagem física com o saldo do sistema e identificar divergências e itens vencidos ou próximos do vencimento.",
      "Para cada divergência, lançar no sistema um Ajuste de Estoque informando a contagem física e a justificativa; o saldo é reconciliado pela movimentação (o sistema não sobrescreve o histórico).",
      "Separar e dar destino adequado a itens vencidos, registrando a perda quando aplicável.",
      "Arquivar a folha de contagem preenchida e assinada como registro da conferência."
    ],
    "registros": [
      "Folha de Contagem preenchida e assinada",
      "Ajustes de Estoque lançados no sistema (com justificativa)"
    ],
    "referencias": [
      "RDC 63/2011 - Boas Práticas de Funcionamento para os Serviços de Saúde"
    ]
  }$J$
where titulo = 'Conferência Presencial do Estoque'
   or titulo = 'Ajuste e Contagem de Inventário';

-- Fim do conteúdo inicial.
