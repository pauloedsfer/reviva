-- ============================================================================
-- Hospital Reviva — atualizacao_pop_014_temperatura.sql
--
-- Ajusta o POP-FAR-014 ao que existe de fato na farmácia:
--   · UM termo-higrômetro, que mede refrigerador (atual/mín/máx) e ambiente
--     (temperatura e umidade) — por isso um registro só, e não dois;
--   · planilha MENSAL, impressa com todos os dias do mês já preenchidos;
--   · leitura todos os dias, inclusive sábados e domingos, quando não há
--     farmacêutico presente e quem lê é a enfermagem.
--
-- Versão 01 -> 02. Rodar UMA VEZ.
-- ============================================================================

update pops set
  versao = '02',
  data_vigencia = current_date,
  proxima_revisao = current_date + interval '6 months',
  corpo = $j${
  "objetivo": "Assegurar a conservação dos medicamentos termolábeis e dos demais medicamentos sob guarda da farmácia, mantendo a temperatura de refrigeração entre 2 °C e 8 °C e as condições de temperatura e umidade do ambiente, com monitoramento registrado diariamente e conduta definida diante de desvio.",

  "aplicacao": "Aplica-se ao refrigerador de uso exclusivo de medicamentos da farmácia e ao armazenamento em temperatura ambiente. O monitoramento é feito por UM termo-higrômetro digital de máxima e mínima, com sensor interno no refrigerador e leitura de temperatura e umidade do ambiente no próprio mostrador — as duas leituras saem do mesmo aparelho e vão para o mesmo registro. Abrange os medicamentos do estoque da clínica e a medicação de pacientes em custódia que exija refrigeração, como insulinas. Consideram-se termolábeis os medicamentos cuja especificação de temperatura máxima seja igual ou inferior a 8 °C.",

  "responsabilidades": [
    "Farmacêutico Responsável Técnico: definir as faixas aceitáveis conforme a especificação de cada produto, realizar as leituras nos dias em que está presente, conferir e assinar a planilha ao fim do mês, conduzir a avaliação e a decisão em caso de desvio, controlar a verificação do termo-higrômetro e arquivar as planilhas.",
    "Equipe de enfermagem: realizar e registrar a leitura nos dias e horários em que o farmacêutico não estiver presente — inclusive sábados, domingos e manhãs de segunda-feira — e comunicar imediatamente qualquer valor fora da faixa ou falta de energia, valendo-se da retaguarda à distância.",
    "A conduta diante de desvio de temperatura é decisão do farmacêutico Responsável Técnico — nenhum medicamento exposto a desvio é utilizado antes da liberação por ele."
  ],

  "materiais": [
    "Refrigerador de uso exclusivo de medicamentos, não do tipo frost-free nem frigobar",
    "Termo-higrômetro digital de máxima e mínima, com sensor interno no refrigerador e leitura de ambiente, identificado por número",
    "Planilha mensal de Registro de Temperatura e Umidade, impressa pelo sistema já com todos os dias do mês e duas leituras por dia, em tabela única",
    "Caixa térmica limpa e seca com bobinas de gelo reutilizável, para contingência",
    "Especificação de conservação de cada produto (bula ou informação do fabricante)"
  ],

  "procedimento": [
    "USO EXCLUSIVO — O refrigerador destina-se exclusivamente a medicamentos. É proibido guardar alimentos, bebidas ou qualquer material de outra natureza.",
    "POSICIONAMENTO INTERNO — Os medicamentos são acomodados somente nas prateleiras, sem obstruir a circulação de ar e sem contato com as paredes internas. NÃO se armazena medicamento na porta, nas gavetas inferiores nem no congelador. A medicação de custódia refrigerada, como as insulinas, é mantida identificada com o nome do paciente, separada do estoque geral.",
    "ORGANIZAÇÃO — Os itens são organizados por substância e lote, com as validades mais próximas à frente, para consumo na ordem de vencimento (FEFO).",
    "PLANILHA DO MÊS — No início de cada mês, imprimir a planilha em Enfermagem e Documentos > Registro de Temperatura e Umidade, selecionando o mês de referência. A folha sai com todos os dias já impressos, com os fins de semana destacados, e fica no local da leitura durante o mês inteiro. Dia não preenchido fica visível na folha — é assim que a falha aparece.",
    "LEITURA E REGISTRO — Duas leituras por dia, TODOS OS DIAS, no início e no fim do expediente da farmácia. Nos dias em que não há farmacêutico presente, a leitura é feita e registrada pela enfermagem nos mesmos horários. Registram-se: hora, temperatura atual, mínima e máxima do refrigerador, temperatura e umidade do ambiente, a marcação C ou NC e a rubrica de quem leu.",
    "REINÍCIO DA MEMÓRIA — Após cada registro, zera-se a memória de máxima e mínima do termo-higrômetro, para que o próximo intervalo seja medido de forma independente. Sem isso, a máxima registrada à tarde é a mesma da manhã e a planilha deixa de informar qualquer coisa.",
    "FAIXAS ACEITÁVEIS — Refrigeração: 2 °C a 8 °C. Ambiente: 15 °C a 30 °C, com umidade relativa preferencialmente até 70%. Quando a especificação do fabricante de um produto for mais restritiva, prevalece a especificação do fabricante.",
    "DESVIO DE TEMPERATURA — Constatado valor fora da faixa: marcar NC na leitura; descrever no campo de ocorrências da própria planilha o dia, o horário, o valor e a duração estimada da exposição; identificar os medicamentos afetados com a marcação EM AVALIAÇÃO e mantê-los separados, sem uso; comunicar o farmacêutico RT; consultar o fabricante ou o fornecedor sobre a estabilidade do produto nas condições ocorridas; registrar a decisão do RT — liberação para uso ou descarte — com a justificativa. Nenhum item retorna ao uso sem essa liberação.",
    "FALTA DE ENERGIA — Manter a porta do refrigerador fechada, o que preserva a temperatura por período limitado. Persistindo a interrupção, transferir os medicamentos para caixa térmica com bobinas de gelo reutilizável, sem contato direto entre o gelo e as embalagens, e monitorar a temperatura dentro da caixa. Registrar o horário de início, o de retorno e a conduta adotada.",
    "LIMPEZA E DEGELO — Realizados conforme a orientação do fabricante do equipamento, com os medicamentos previamente transferidos para caixa térmica. Registrar data, responsável e tempo de permanência fora do refrigerador.",
    "VERIFICAÇÃO DO TERMO-HIGRÔMETRO — Conferir periodicamente o funcionamento e a coerência das leituras, providenciando calibração ou substituição conforme a orientação do fabricante, e registrar a verificação. Sendo o aparelho único, sua falha interrompe o monitoramento inteiro: havendo suspeita de defeito, comunicar de imediato à direção para substituição.",
    "RECEBIMENTO DE TERMOLÁBEIS — Na entrega, verificar de imediato a condição de transporte e a temperatura, minimizar o tempo de exposição ao ambiente e acondicionar no refrigerador sem demora, registrando qualquer inconformidade na conferência da nota fiscal.",
    "FECHAMENTO DO MÊS — Ao fim do mês, o RT confere a planilha: dias sem registro, marcações NC e ocorrências descritas. Lacunas e desvios sem conduta registrada são tratados como não conformidade, conforme o POP-FAR-001. A planilha é então assinada e arquivada, ficando disponível para consulta da autoridade sanitária.",
    "DESCARTE DE ITEM REPROVADO — Medicamento reprovado por desvio de temperatura é baixado e destinado conforme o POP-FAR-016; sendo substância sob controle especial, segue também o POP-FAR-015."
  ],

  "registros": [
    "Planilha mensal de Registro de Temperatura e Umidade, preenchida diariamente, conferida e assinada pelo RT",
    "Registro de desvio de temperatura, com avaliação e decisão do RT, no campo de ocorrências da planilha",
    "Registro de limpeza e degelo do refrigerador",
    "Registro de verificação do termo-higrômetro"
  ],

  "referencias": [
    "RDC nº 430/2020 — Boas Práticas de Distribuição, Armazenagem e de Transporte de Medicamentos (arts. 77 a 81 — termolábeis, fonte alternativa de energia e plano de contingência)",
    "RDC nº 63/2011 — Boas Práticas de Funcionamento para os Serviços de Saúde",
    "RDC nº 222/2018 — gerenciamento de resíduos, para o descarte de item reprovado",
    "Especificação de conservação do fabricante de cada medicamento (bula)",
    "Portaria SVS/MS nº 344/1998, quando o termolábil for substância sujeita a controle especial",
    "POP-FAR-001, POP-FAR-004, POP-FAR-015 e POP-FAR-016"
  ]
}$j$::jsonb
where codigo = 'POP-FAR-014';

select codigo, titulo, status, versao, data_vigencia, proxima_revisao,
       jsonb_array_length(corpo->'procedimento') as passos
  from pops where codigo = 'POP-FAR-014';
