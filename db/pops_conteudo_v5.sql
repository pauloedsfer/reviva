-- ============================================================================
-- Hospital Reviva — pops_conteudo_v5.sql
-- Acrescenta o POP-FAR-014 — Controle de Temperatura e Armazenamento
-- Refrigerado (cadeia de frio), escrito para a estrutura real da farmácia:
-- geladeira exclusiva de medicamentos com termo-higrômetro que mede
-- temperatura interna (do equipamento) e externa (ambiente), com registro
-- em planilha própria.
--
-- Depende de: migration_pops.sql e migration_pops_corpo.sql aplicadas.
-- Rodar UMA VEZ no SQL Editor. Pode ser repetido sem duplicar.
-- ============================================================================

insert into pops (area, titulo, status, ordem, is_dado_teste, codigo, versao)
select 'Farmácia', 'Controle de Temperatura e Armazenamento Refrigerado', 'pendente', 14, false, 'POP-FAR-014', '01'
where not exists (select 1 from pops where codigo = 'POP-FAR-014');

update pops set
  area = 'Farmácia',
  titulo = 'Controle de Temperatura e Armazenamento Refrigerado',
  versao = coalesce(versao, '01'),
  corpo = $J${
    "objetivo": "Assegurar a conservação dos medicamentos termolábeis e dos demais medicamentos sob guarda da farmácia, mantendo a temperatura de refrigeração entre 2 °C e 8 °C e as condições de temperatura e umidade do ambiente, com monitoramento registrado e conduta definida diante de desvio.",
    "aplicacao": "Aplica-se ao refrigerador de uso exclusivo de medicamentos da farmácia, equipado com termo-higrômetro de máxima e mínima que mede a temperatura interna do equipamento e a temperatura e umidade do ambiente, e ao armazenamento em temperatura ambiente. Abrange os medicamentos do estoque da clínica e a medicação de pacientes em custódia que exija refrigeração, como insulinas. Consideram-se termolábeis os medicamentos cuja especificação de temperatura máxima seja igual ou inferior a 8 °C.",
    "responsabilidades": [
      "Farmacêutico Responsável Técnico: definir as faixas aceitáveis conforme a especificação de cada produto, conferir os registros, conduzir a avaliação e a decisão em caso de desvio de temperatura, controlar a verificação do termo-higrômetro e arquivar as planilhas.",
      "Equipe de enfermagem: realizar e registrar a leitura nos horários definidos quando o farmacêutico não estiver presente, e comunicar imediatamente qualquer valor fora da faixa ou falta de energia, valendo-se da retaguarda à distância.",
      "A conduta diante de desvio de temperatura é decisão do farmacêutico Responsável Técnico — nenhum medicamento exposto a desvio é utilizado antes da liberação por ele."
    ],
    "materiais": [
      "Refrigerador de uso exclusivo de medicamentos, não do tipo frost-free nem frigobar",
      "Termo-higrômetro digital de máxima e mínima, com sensor interno e leitura de ambiente",
      "Planilha de Registro de Temperatura e Umidade (impressa pelo sistema)",
      "Caixa térmica limpa e seca com bobinas de gelo reutilizável, para contingência",
      "Especificação de conservação de cada produto (bula ou informação do fabricante)"
    ],
    "procedimento": [
      "USO EXCLUSIVO — O refrigerador destina-se exclusivamente a medicamentos. É proibido guardar alimentos, bebidas ou qualquer material de outra natureza.",
      "POSICIONAMENTO INTERNO — Os medicamentos são acomodados somente nas prateleiras, sem obstruir a circulação de ar e sem contato com as paredes internas. NÃO se armazena medicamento na porta, nas gavetas inferiores nem no congelador. A medicação de custódia refrigerada é mantida identificada com o nome do paciente, separada do estoque geral.",
      "ORGANIZAÇÃO — Os itens são organizados por substância e lote, com as validades mais próximas à frente, para consumo na ordem de vencimento (FEFO).",
      "LEITURA E REGISTRO — Duas vezes ao dia, no início e no fim do período de funcionamento da farmácia, registram-se na planilha: temperatura atual, mínima e máxima do refrigerador, temperatura e umidade do ambiente, horário e rubrica de quem leu.",
      "REINÍCIO DA MEMÓRIA — Após cada registro, zera-se a memória de máxima e mínima do termo-higrômetro, para que o próximo intervalo seja medido de forma independente.",
      "FAIXAS ACEITÁVEIS — Refrigeração: 2 °C a 8 °C. Ambiente: 15 °C a 30 °C, com umidade relativa preferencialmente até 70%. Quando a especificação do fabricante de um produto for mais restritiva, prevalece a especificação do fabricante.",
      "DESVIO DE TEMPERATURA — Constatado valor fora da faixa: registrar na planilha o valor, o horário e a duração estimada da exposição; identificar os medicamentos afetados com a marcação EM AVALIAÇÃO e mantê-los separados, sem uso; comunicar o farmacêutico RT; consultar o fabricante ou o fornecedor sobre a estabilidade do produto nas condições ocorridas; registrar a decisão do RT — liberação para uso ou descarte — com a justificativa. Nenhum item retorna ao uso sem essa liberação.",
      "FALTA DE ENERGIA — Manter a porta do refrigerador fechada, o que preserva a temperatura por período limitado. Persistindo a interrupção, transferir os medicamentos para caixa térmica com bobinas de gelo reutilizável, sem contato direto entre o gelo e as embalagens, e monitorar a temperatura dentro da caixa. Registrar o horário de início, o de retorno e a conduta adotada.",
      "LIMPEZA E DEGELO — Realizados conforme a orientação do fabricante do equipamento, com os medicamentos previamente transferidos para caixa térmica. Registrar data, responsável e tempo de permanência fora do refrigerador.",
      "VERIFICAÇÃO DO TERMO-HIGRÔMETRO — Conferir periodicamente o funcionamento e a coerência das leituras, providenciando calibração ou substituição conforme a orientação do fabricante, e registrar a verificação.",
      "RECEBIMENTO DE TERMOLÁBEIS — Na entrega, verificar de imediato a condição de transporte e a temperatura, minimizar o tempo de exposição ao ambiente e acondicionar no refrigerador sem demora, registrando qualquer inconformidade na conferência da nota fiscal.",
      "ARQUIVAMENTO — As planilhas mensais preenchidas são conferidas, assinadas pelo RT e arquivadas, ficando disponíveis para consulta da autoridade sanitária."
    ],
    "registros": [
      "Planilha mensal de Registro de Temperatura e Umidade, rubricada e assinada",
      "Registro de desvio de temperatura, com avaliação e decisão do RT",
      "Registro de limpeza e degelo do refrigerador",
      "Registro de verificação do termo-higrômetro"
    ],
    "referencias": [
      "RDC nº 430/2020 - Boas Práticas de Distribuição, Armazenagem e de Transporte de Medicamentos (arts. 77 a 81 - termolábeis, fonte alternativa de energia e plano de contingência)",
      "RDC nº 63/2011 - Boas Práticas de Funcionamento para os Serviços de Saúde",
      "RDC nº 306/2004 - gerenciamento de resíduos, para o descarte de item reprovado",
      "Especificação de conservação do fabricante de cada medicamento (bula)",
      "Portaria SVS/MS nº 344/1998, quando o termolábil for substância sujeita a controle especial"
    ]
  }$J$
where codigo = 'POP-FAR-014';

-- ============================================================================
-- CONFERÊNCIA
-- ============================================================================
select codigo, titulo, versao,
       case when corpo is null then 'SEM CONTEUDO' else 'OK' end as situacao
from pops where codigo = 'POP-FAR-014';

-- ----------------------------------------------------------------------------
-- OBSERVAÇÕES PARA O RT
--
-- 1. O art. 79 da RDC 430/2020 prevê FONTE ALTERNATIVA DE ENERGIA para os
--    equipamentos de armazenagem de termolábeis. Se a clínica ainda não tem
--    gerador ou nobreak para a geladeira, o POP descreve a contingência por
--    caixa térmica — que é a conduta real — e o tema deve constar do seu
--    plano de melhorias junto à direção.
--
-- 2. Confirme se o refrigerador NÃO é frost-free nem frigobar: esses modelos
--    não são adequados para medicamentos, e é um dos primeiros itens que a
--    fiscalização verifica.
--
-- 3. A folha de registro está no sistema em Documentos e Registros →
--    Registro de Temperatura e Umidade.
-- ----------------------------------------------------------------------------
