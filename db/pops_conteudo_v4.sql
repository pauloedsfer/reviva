-- ============================================================================
-- Hospital Reviva — pops_conteudo_v4.sql
-- Acrescenta o POP-FAR-001 — Sistema de Gestão da Qualidade da Farmácia.
-- É o POP "mestre": rege a elaboração, revisão e melhoria contínua de todos
-- os demais, e formaliza a resposta a mudanças de legislação, fiscalizações
-- e orientações da Vigilância Sanitária.
--
-- Depende de: migration_pops.sql e migration_pops_corpo.sql aplicadas.
-- Rodar UMA VEZ no SQL Editor. Idempotente (não duplica se já existir).
-- ============================================================================

do $$
begin
  if not exists (select 1 from pops where codigo = 'POP-FAR-001') then
    insert into pops (area, titulo, status, ordem, is_dado_teste, codigo, versao)
    values ('Farmácia', 'Sistema de Gestão da Qualidade da Farmácia', 'pendente', 0, false, 'POP-FAR-001', '01');
  end if;
end $$;

update pops set
  area = 'Farmácia',
  titulo = 'Sistema de Gestão da Qualidade da Farmácia',
  versao = coalesce(versao, '01'),
  corpo = $J${
    "objetivo": "Estabelecer o Sistema de Gestão da Qualidade (SGQ) da farmácia, definindo como os Procedimentos Operacionais Padrão são elaborados, aprovados, treinados, revisados e melhorados de forma contínua, de modo que a documentação acompanhe permanentemente a realidade assistencial do serviço, as alterações da legislação sanitária e as orientações recebidas em fiscalizações.",
    "aplicacao": "Aplica-se a todos os POPs e registros da farmácia e às atividades correlatas executadas pela enfermagem sob orientação farmacêutica. É o procedimento mestre do conjunto documental: os demais POPs subordinam-se às regras de elaboração, revisão e controle aqui definidas. A condução do SGQ é atribuição do farmacêutico Responsável Técnico, em regime presencial periódico com retaguarda à distância à equipe.",
    "responsabilidades": [
      "Farmacêutico Responsável Técnico: manter o Registro Mestre de POPs atualizado; elaborar e revisar os procedimentos; conduzir os treinamentos; registrar não conformidades e ações corretivas; acompanhar as atualizações da legislação sanitária; responder às fiscalizações e implementar as orientações recebidas.",
      "Equipe de enfermagem: cumprir os procedimentos vigentes, participar dos treinamentos e comunicar ao RT qualquer dificuldade, divergência ou situação não prevista nos POPs — a comunicação da prática real é insumo essencial da melhoria contínua.",
      "Direção da instituição: aprovar os procedimentos, prover os recursos necessários à sua execução e tomar ciência dos planos de ação decorrentes de fiscalizações."
    ],
    "materiais": [
      "Registro Mestre de POPs (emitido pelo sistema de gestão da farmácia)",
      "POPs vigentes impressos, assinados e datados",
      "Registros de treinamento da equipe",
      "Registro de não conformidades e ações corretivas",
      "Termos, autos e orientações recebidos de autoridades sanitárias",
      "Legislação sanitária de referência e suas atualizações"
    ],
    "procedimento": [
      "ELABORAÇÃO — Cada procedimento é redigido descrevendo o processo tal como efetivamente executado no serviço, com identificação (código, versão, data de vigência, próxima revisão, responsável) e as seções padronizadas: objetivo, campo de aplicação, responsabilidades, materiais, procedimento, registros e referências.",
      "APROVAÇÃO — O POP é revisado pelo farmacêutico RT e aprovado pela direção; passa a vigorar após impressão, assinatura e datação, sendo então registrado como vigente no Registro Mestre.",
      "TREINAMENTO — Antes de exigir o cumprimento, a equipe envolvida é treinada no conteúdo do procedimento, registrando-se data, participantes e responsável pelo treinamento. Procedimento não treinado não é considerado implantado.",
      "DISPONIBILIDADE — Os POPs vigentes permanecem acessíveis à equipe no local de trabalho e disponíveis para consulta da autoridade sanitária a qualquer tempo.",
      "REVISÃO PROGRAMADA — Cada POP possui data de próxima revisão. O sistema sinaliza as revisões vencidas e as que vencem em até 30 dias, permitindo a revisão tempestiva de todo o conjunto documental.",
      "REVISÃO EXTRAORDINÁRIA — Independentemente do prazo programado, o POP é revisado sempre que ocorrer: (a) alteração da legislação sanitária aplicável; (b) orientação, recomendação ou exigência de autoridade sanitária; (c) mudança na estrutura, no quadro de pessoal ou no fluxo assistencial do serviço; (d) identificação de não conformidade, incidente ou quase-falha relacionada ao processo; (e) sugestão da equipe que aprimore a segurança ou a rastreabilidade.",
      "CONTROLE DE VERSÕES — Toda revisão gera nova versão, com nova data de vigência e nova data de próxima revisão. A versão anterior é arquivada, preservando-se o histórico documental do serviço.",
      "NÃO CONFORMIDADES E AÇÕES CORRETIVAS — Divergências entre o procedimento e a prática, falhas de processo e incidentes são registrados, analisados quanto à causa e tratados por ação corretiva, com verificação posterior da eficácia; quando a causa for o próprio procedimento, este é revisado.",
      "ATUALIZAÇÃO NORMATIVA — O RT acompanha as publicações da Anvisa, da Vigilância Sanitária estadual e municipal e do Conselho Regional de Farmácia, avaliando o impacto sobre os procedimentos vigentes e promovendo as revisões necessárias.",
      "FISCALIZAÇÕES E ORIENTAÇÕES DA VIGILÂNCIA — Recebida qualquer orientação, recomendação, notificação ou exigência de autoridade sanitária, o RT registra a demanda, elabora plano de ação com responsáveis e prazos, implementa as adequações, revisa os POPs afetados e mantém a evidência documental do atendimento. As orientações da Vigilância Sanitária são tratadas como oportunidade de aprimoramento do serviço.",
      "AUTOAVALIAÇÃO PERIÓDICA — O RT realiza, quando presencial, verificação do cumprimento dos procedimentos e da suficiência dos registros (escrituração, mapas, termos, conferências de estoque e do carrinho de emergência), corrigindo os desvios identificados.",
      "MELHORIA CONTÍNUA — Os resultados das revisões, das não conformidades tratadas e das autoavaliações realimentam o conjunto documental, de modo que o SGQ evolua junto com o serviço, mantendo a documentação sempre aderente à realidade e à norma vigente."
    ],
    "registros": [
      "Registro Mestre de POPs (relação, versões, vigências e próximas revisões)",
      "POPs vigentes assinados e datados, com versões anteriores arquivadas",
      "Registros de treinamento da equipe",
      "Registro de não conformidades, ações corretivas e verificação de eficácia",
      "Plano de ação e evidências de atendimento a orientações e fiscalizações sanitárias"
    ],
    "referencias": [
      "RDC nº 63/2011 - Boas Práticas de Funcionamento para os Serviços de Saúde",
      "Portaria SVS/MS nº 344/1998 e Portaria nº 6/1999 - substâncias sujeitas a controle especial",
      "Lei nº 7.498/1986 e Decreto nº 94.406/1987 - exercício da enfermagem",
      "Legislação sanitária estadual e municipal aplicável e orientações da Vigilância Sanitária local"
    ]
  }$J$
where codigo = 'POP-FAR-001';

-- Fim do conteúdo v4.
