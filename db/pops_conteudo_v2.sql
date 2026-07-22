-- ============================================================================
-- Hospital Reviva — pops_conteudo_v2.sql
-- Reescreve os 3 POPs iniciais com enquadramento legal (sem descrever pela
-- ausência de auxiliar; regime de presença em vez de calendário fixo) e
-- adiciona os demais POPs do fluxo, no mesmo padrão.
--
-- PRINCÍPIOS DE REDAÇÃO ADOTADOS:
--  - Descrever por ATRIBUIÇÃO, não por falta: o preparo é atribuição da
--    enfermagem (Lei 7.498/1986; Decreto 94.406/1987), pois a assistência
--    farmacêutica é prestada por RT em carga horária compatível — o que é
--    admitido pela legislação sanitária para serviço deste porte.
--  - Presença do RT como REGIME (presencial periódico + retaguarda à
--    distância), nunca dias fixos, para não engessar durante a transição.
--
-- Depende de: migration_pops.sql e migration_pops_corpo.sql aplicadas.
-- Rodar UMA VEZ no SQL Editor (substitui o conteúdo por título/código).
-- ============================================================================

-- 1) PREPARO E ADMINISTRAÇÃO PELA ENFERMAGEM ---------------------------------
update pops set
  codigo = coalesce(codigo, 'POP-ENF-001'), versao = '02', area = 'Enfermagem',
  corpo = $J${
    "objetivo": "Padronizar o preparo e a administração de medicamentos aos pacientes internados, executados pela equipe de enfermagem nos horários prescritos, com validação e orientação farmacêutica, assegurando o cumprimento da prescrição, a identificação correta do paciente e o registro da administração.",
    "aplicacao": "Aplica-se à equipe de enfermagem, para todos os pacientes com prescrição ativa. O preparo das doses é atribuição da equipe de enfermagem, profissional capacitada para tal (Lei nº 7.498/1986 e Decreto nº 94.406/1987), uma vez que a assistência farmacêutica é prestada por farmacêutico Responsável Técnico em regime de carga horária compatível com o porte do serviço, cabendo à enfermagem o preparo e a administração nos horários prescritos, sob orientação e validação farmacêutica.",
    "responsabilidades": [
      "Enfermagem: preparar e administrar a medicação nos horários prescritos; conferir a identificação do paciente; registrar a administração no mapa de medicação; comunicar intercorrências ao farmacêutico RT.",
      "Farmacêutico Responsável Técnico: validar as prescrições; manter o mapa de medicação disponível e atualizado; capacitar e orientar a equipe; prestar retaguarda à distância; revisar este procedimento.",
      "A assistência farmacêutica é prestada em regime presencial periódico, com retaguarda à distância para orientação da equipe sempre que necessário."
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
      "Preparar a medicação de cada paciente imediatamente antes do horário de administração, conferindo nome do medicamento, dose (quantidade por horário), via e horário contra a prescrição.",
      "Para pacientes com medicação em custódia, utilizar preferencialmente o medicamento trazido pelo próprio paciente, conforme indicado pelo sistema; não utilizar medicação de custódia de um paciente para outro.",
      "Confirmar a identidade do paciente antes de administrar (chamar pelo nome e confirmar).",
      "Administrar a medicação e observar a tomada.",
      "Registrar (rubricar) a administração no mapa, no campo do dia e horário correspondentes; para medicação SOS, anotar o horário em que foi administrada.",
      "Em caso de recusa, não administração, intercorrência ou dúvida sobre a prescrição, registrar no mapa/prontuário e acionar o farmacêutico RT — presencialmente ou pela retaguarda à distância.",
      "Ao final do período, arquivar o mapa preenchido para conferência do RT e escrituração."
    ],
    "registros": [
      "Mapa de medicação rubricado (comprova a administração e embasa a baixa no sistema)",
      "Anotações de intercorrência no prontuário do paciente"
    ],
    "referencias": [
      "RDC nº 63/2011 - Boas Práticas de Funcionamento para os Serviços de Saúde",
      "Lei nº 7.498/1986 e Decreto nº 94.406/1987 - exercício da enfermagem",
      "Prescrição médica vigente de cada paciente"
    ]
  }$J$,
  titulo = 'Preparo e Administração de Medicamentos pela Enfermagem'
where codigo = 'POP-ENF-001'
   or titulo = 'Preparo e Administração de Medicamentos pela Enfermagem'
   or titulo = 'Preparo e Etiquetagem da Dose Unitária';

-- 2) CUSTÓDIA ---------------------------------------------------------------
update pops set
  codigo = coalesce(codigo, 'POP-FAR-004'), versao = '02', area = 'Farmácia',
  corpo = $J${
    "objetivo": "Padronizar o recebimento, a conferência, a guarda e o uso da medicação de propriedade do paciente (trazida por ele ou adquirida pela família após prescrição) sob custódia da clínica, assegurando rastreabilidade e uso exclusivo para o paciente a quem pertence.",
    "aplicacao": "Aplica-se a toda medicação de propriedade do paciente sob guarda da clínica. A conferência e o registro formais são de competência do farmacêutico Responsável Técnico, prestados em regime presencial periódico, com retaguarda à distância à equipe sempre que necessário.",
    "responsabilidades": [
      "Farmacêutico Responsável Técnico: conferir e registrar a medicação de custódia no sistema; definir, na alta, o destino da custódia (devolução à família ou integração ao estoque).",
      "Enfermagem: no recebimento em que o RT não esteja presente, guardar a medicação em local identificado e comunicar o RT para conferência e registro na presença seguinte, mantendo a retaguarda à distância para orientação.",
      "A guarda é feita por paciente, separada do estoque geral; a medicação de custódia é de uso exclusivo do paciente a quem pertence."
    ],
    "materiais": [
      "Sistema de gestão da farmácia (tela Medicação do Paciente)",
      "Prescrição vigente do paciente",
      "Local de guarda identificado por paciente",
      "Termo de Custódia e Termo de Devolução (gerados pelo sistema)"
    ],
    "procedimento": [
      "Ao dar entrada de medicação do paciente/família, verificar correspondência com a prescrição vigente e conferir nome, concentração, forma, lote, validade e quantidade.",
      "Registrar a medicação no sistema (Medicação do Paciente), vinculada ao paciente, com lote e validade; imprimir o Termo de Custódia quando aplicável.",
      "Guardar a medicação em local identificado, separada do estoque geral; uso exclusivo do paciente.",
      "Na administração, utilizar preferencialmente o lote de custódia do próprio paciente (o sistema o indica em primeiro lugar).",
      "Quando o recebimento ocorrer sem a presença do RT, a enfermagem guarda e comunica; a conferência e o registro formais ocorrem na presença do RT, que também presta orientação à distância.",
      "Na alta, o saldo de custódia fica em 'aguardando retirada'; o RT decide, item a item: devolver à família (com Termo de Devolução) ou integrar ao estoque.",
      "Registrar sempre no sistema a movimentação (recebido, consumido, devolvido, integrado), mantendo a rastreabilidade."
    ],
    "registros": [
      "Termo de Custódia assinado",
      "Termo de Devolução (na devolução à família)",
      "Registro no sistema (recebimento, consumo, destino na alta)"
    ],
    "referencias": [
      "RDC nº 63/2011 - Boas Práticas de Funcionamento para os Serviços de Saúde",
      "Portaria SVS/MS nº 344/1998 (quando a medicação for substância sujeita a controle especial)"
    ]
  }$J$
where codigo = 'POP-FAR-004' or titulo = 'Medicação Trazida pelo Paciente (Custódia)';

-- 3) CONFERÊNCIA PRESENCIAL DO ESTOQUE --------------------------------------
update pops set
  codigo = coalesce(codigo, 'POP-FAR-009'), versao = '02', area = 'Farmácia',
  titulo = 'Conferência Presencial do Estoque',
  corpo = $J${
    "objetivo": "Padronizar a conferência física do estoque de medicamentos da clínica, realizada pelo farmacêutico Responsável Técnico, garantindo a correspondência entre o saldo do sistema e a quantidade física, a verificação de validades e o tratamento de divergências.",
    "aplicacao": "Aplica-se ao estoque de medicamentos da clínica (excluída a medicação de custódia dos pacientes). A conferência é conduzida pelo farmacêutico RT em regime presencial periódico, compatível com o porte do serviço.",
    "responsabilidades": [
      "Farmacêutico Responsável Técnico: conduzir a conferência presencial; lançar os ajustes justificados no sistema em caso de divergência; monitorar validades e dar destino a itens vencidos.",
      "Enfermagem: comunicar ao RT qualquer perda, quebra ou anormalidade percebida no estoque entre as conferências, valendo-se da retaguarda à distância."
    ],
    "materiais": [
      "Sistema de gestão da farmácia",
      "Folha de Contagem / Inventário impressa (Substância, Lote, Validade, Saldo no sistema, e colunas em branco para contagem física e diferença)"
    ],
    "procedimento": [
      "Gerar a Folha de Contagem no sistema (aba Ajuste de Estoque), aplicando os filtros desejados (substância, faixa de vencimento, ocultar zerados).",
      "Percorrer o estoque físico e anotar na folha a contagem física de cada lote.",
      "Comparar a contagem física com o saldo do sistema e identificar divergências e itens vencidos ou próximos do vencimento.",
      "Para cada divergência, lançar um Ajuste de Estoque informando a contagem física e a justificativa; o saldo é reconciliado pela movimentação, sem sobrescrever o histórico.",
      "Separar e dar destino adequado a itens vencidos, registrando a perda quando aplicável.",
      "Arquivar a folha de contagem preenchida e assinada como registro da conferência."
    ],
    "registros": [
      "Folha de Contagem preenchida e assinada",
      "Ajustes de Estoque lançados no sistema (com justificativa)"
    ],
    "referencias": [
      "RDC nº 63/2011 - Boas Práticas de Funcionamento para os Serviços de Saúde"
    ]
  }$J$
where codigo = 'POP-FAR-009' or titulo = 'Conferência Presencial do Estoque' or titulo = 'Ajuste e Contagem de Inventário';

-- 4) RECEBIMENTO E CONFERÊNCIA DE NOTAS FISCAIS ------------------------------
update pops set codigo = coalesce(codigo,'POP-FAR-002'), versao='01', area='Farmácia',
  corpo = $J${
    "objetivo": "Padronizar o recebimento e a conferência de medicamentos adquiridos, assegurando a correspondência entre nota fiscal, pedido e produto físico, o registro da entrada no sistema e a rastreabilidade por lote e validade.",
    "aplicacao": "Aplica-se a toda entrada de medicamentos por compra. A conferência de entrada é realizada pelo farmacêutico RT em regime presencial periódico; quando a entrega ocorrer em sua ausência, a enfermagem realiza a guarda provisória e o RT conclui a conferência e o registro na presença seguinte.",
    "responsabilidades": [
      "Farmacêutico Responsável Técnico: conferir a nota fiscal contra o produto e o pedido; registrar a entrada no sistema com lote e validade; recusar itens não conformes.",
      "Enfermagem: em entrega na ausência do RT, receber, guardar adequadamente e comunicar o RT."
    ],
    "materiais": ["Nota fiscal", "Pedido de compra correspondente", "Sistema de gestão da farmácia (tela Notas Fiscais)"],
    "procedimento": [
      "Conferir os dados da nota fiscal (fornecedor, itens, quantidades) contra o pedido.",
      "Conferir fisicamente cada item: medicamento, apresentação, quantidade, lote, validade e integridade da embalagem.",
      "Recusar e registrar itens divergentes, avariados ou com validade insuficiente.",
      "Registrar a entrada no sistema (Notas Fiscais), informando lote, validade e custo — o que alimenta o estoque e a rastreabilidade.",
      "Armazenar os medicamentos em condições adequadas, respeitando a ordem de validade (FEFO).",
      "Arquivar a nota fiscal conforme a rotina administrativa."
    ],
    "registros": ["Nota fiscal arquivada", "Registro de entrada no sistema (lote/validade/custo)"],
    "referencias": ["RDC nº 63/2011", "Portaria SVS/MS nº 344/1998 (itens sujeitos a controle especial)"]
  }$J$
where codigo='POP-FAR-002' or titulo='Recebimento e Conferência de Notas Fiscais';

-- 5) RECEBIMENTO DE DOAÇÕES --------------------------------------------------
update pops set codigo = coalesce(codigo,'POP-FAR-003'), versao='01', area='Farmácia',
  corpo = $J${
    "objetivo": "Padronizar o recebimento de medicamentos por doação, assegurando avaliação de conformidade, registro e rastreabilidade.",
    "aplicacao": "Aplica-se a medicamentos recebidos por doação. A avaliação e o registro são de competência do farmacêutico RT.",
    "responsabilidades": [
      "Farmacêutico Responsável Técnico: avaliar a conformidade da doação (validade, integridade, procedência), registrar a entrada e destinar adequadamente o que não for aproveitável.",
      "Enfermagem: encaminhar ao RT as doações recebidas em sua ausência, com guarda provisória adequada."
    ],
    "materiais": ["Sistema de gestão da farmácia (tela Doações)"],
    "procedimento": [
      "Avaliar cada item doado: medicamento, apresentação, lote, validade e integridade da embalagem.",
      "Recusar itens vencidos, avariados, sem identificação ou de procedência duvidosa.",
      "Registrar a doação no sistema, com lote e validade, identificando o doador quando informado.",
      "Armazenar respeitando a ordem de validade (FEFO) e dar destino adequado ao que for recusado."
    ],
    "registros": ["Registro da doação no sistema"],
    "referencias": ["RDC nº 63/2011"]
  }$J$
where codigo='POP-FAR-003' or titulo='Recebimento de Doações';

-- 6) DESTINO DA CUSTÓDIA NA ALTA --------------------------------------------
update pops set codigo = coalesce(codigo,'POP-FAR-005'), versao='01', area='Farmácia',
  corpo = $J${
    "objetivo": "Padronizar o tratamento do saldo de medicação em custódia por ocasião da alta do paciente, garantindo destino formal e rastreável a cada item.",
    "aplicacao": "Aplica-se ao saldo de custódia de pacientes em alta. A decisão de destino é de competência do farmacêutico RT.",
    "responsabilidades": [
      "Farmacêutico Responsável Técnico: decidir, item a item, entre devolução à família e integração ao estoque; formalizar a devolução com termo assinado.",
      "Enfermagem: comunicar a alta e o desejo da família quanto à retirada da medicação."
    ],
    "materiais": ["Sistema de gestão da farmácia (Medicação do Paciente / Arquivo)", "Termo de Devolução (gerado pelo sistema)"],
    "procedimento": [
      "Na alta, verificar no sistema o saldo de custódia do paciente, que fica em 'aguardando retirada'.",
      "Para cada item, decidir o destino: devolução à família ou integração ao estoque da clínica.",
      "Na devolução, registrar quantidade e responsável pelo recebimento e imprimir o Termo de Devolução para assinatura.",
      "Na integração, registrar no sistema — o item passa a compor o estoque geral e a escrituração (BMPO), quando controlado.",
      "Manter no Extrato de Alta o registro do que foi recebido, consumido, devolvido ou integrado."
    ],
    "registros": ["Termo de Devolução assinado", "Extrato de Alta", "Registro de integração no sistema"],
    "referencias": ["RDC nº 63/2011", "Portaria SVS/MS nº 344/1998 (itens controlados)"]
  }$J$
where codigo='POP-FAR-005' or titulo='Destino da Custódia na Alta (Devolução / Integração)';

-- 7) ESCRITURAÇÃO E BALANÇO DE CONTROLADOS ----------------------------------
update pops set codigo = coalesce(codigo,'POP-FAR-011'), versao='01', area='Farmácia',
  corpo = $J${
    "objetivo": "Padronizar a escrituração das movimentações de substâncias sujeitas a controle especial e o balanço periódico, assegurando fidelidade entre o registrado e o praticado e a prontidão para fiscalização.",
    "aplicacao": "Aplica-se às substâncias sujeitas a controle especial em movimentação na clínica. A escrituração e o balanço são de competência do farmacêutico Responsável Técnico.",
    "responsabilidades": [
      "Farmacêutico Responsável Técnico: manter a escrituração das entradas e saídas, conferir os saldos, emitir e assinar o Livro de Registro e o balanço, e guardar os documentos.",
      "Enfermagem: registrar fielmente as administrações no mapa, que embasam as saídas escrituradas."
    ],
    "materiais": ["Sistema de gestão da farmácia (Livro de Registro, Balanço/BMPO)", "Mapas de medicação rubricados", "Notas fiscais e termos de custódia/devolução"],
    "procedimento": [
      "Registrar no sistema, tempestivamente, todas as entradas (compra, doação, custódia integrada) e saídas (administração, perda por ajuste, devolução).",
      "Realizar as baixas de administração a partir dos mapas rubricados pela enfermagem, conferindo data e quantidade.",
      "Periodicamente, conferir os saldos do sistema e imprimir o Livro de Registro (com filtros por período/substância/lista quando necessário).",
      "Emitir o balanço periódico das substâncias controladas e conferir os saldos apurados.",
      "Assinar e arquivar o Livro e o balanço; o documento impresso e assinado é o registro oficial do período.",
      "Corrigir divergências apenas por lançamentos rastreáveis (ajuste justificado), sem sobrescrever o histórico."
    ],
    "registros": ["Livro de Registro impresso e assinado", "Balanço periódico de controlados", "Mapas de medicação arquivados"],
    "referencias": ["Portaria SVS/MS nº 344/1998 e Portaria nº 6/1999", "RDC nº 63/2011"]
  }$J$
where codigo='POP-FAR-011' or titulo='Escrituração e Balanço Mensal de Controlados';

-- Fim do conteúdo v2.
