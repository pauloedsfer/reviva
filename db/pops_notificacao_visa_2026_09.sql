-- ============================================================================
-- Hospital Reviva — pops_notificacao_visa_2026_09.sql
--
-- Atende aos itens 03 e 06 da notificação da Vigilância Sanitária:
--   03 — medicação adquirida pelo paciente em drogaria não entra na
--        escrituração da unidade; apenas controle paralelo;
--   06 — o BMPO não se aplica à farmácia hospitalar.
--
-- Itens 01, 02, 04, 05 e 07 não são tratados aqui.
--
-- Rodar UMA VEZ. Faça backup antes: substitui o corpo do POP-FAR-011 e altera
-- trechos de outros quatro POPs.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) POP-FAR-011 — reescrito
--    Sai o balanço mensal como obrigação e entra a transcrição ao livro
--    físico; a custódia sai da escrituração e vira controle paralelo.
-- ---------------------------------------------------------------------------
update pops set
  titulo = 'Escrituração de Controlados e Controle Paralelo da Custódia',
  versao = '03',
  data_vigencia = current_date,
  proxima_revisao = current_date + interval '6 months',
  corpo = $j${
  "objetivo": "Padronizar a escrituração das movimentações de substâncias sujeitas a controle especial pertencentes ao estabelecimento, sua transcrição ao Livro de Registro Específico físico, e o controle paralelo da medicação de propriedade dos pacientes, que não integra a escrituração da unidade.",

  "aplicacao": "Aplica-se às substâncias sujeitas a controle especial adquiridas pela clínica. A medicação adquirida pelo paciente ou pela família em drogaria NÃO entra na escrituração da unidade: foi dispensada pelo farmacêutico do estabelecimento que a vendeu, e a clínica mantém apenas controle paralelo da guarda, do consumo e do destino. Enquanto o sistema informatizado não for aprovado pela autoridade sanitária, a escrituração oficial é a do livro físico, sendo o sistema a fonte de onde os lançamentos são transcritos.",

  "responsabilidades": [
    "Farmacêutico Responsável Técnico: lançar as movimentações no sistema tempestivamente, transcrevê-las ao livro físico no prazo, conferir saldos, assinar e guardar o livro e os documentos de suporte.",
    "Farmacêutico Responsável Técnico: manter o controle paralelo da custódia atualizado e à disposição da fiscalização, sem misturá-lo à escrituração.",
    "Equipe de enfermagem: registrar fielmente as administrações no mapa e devolver o que não for administrado — é o que sustenta a conferência dos lançamentos."
  ],

  "materiais": [
    "Livro de Registro Específico físico, para escrituração oficial",
    "Sistema de gestão da farmácia — Folha de Registro Semanal, para transcrição, e Conferência Mensal de Saldos, para uso interno",
    "Controle Paralelo — Medicação de Pacientes, impresso pelo sistema",
    "Mapas de medicação rubricados, notas fiscais, termos de custódia e de devolução"
  ],

  "procedimento": [
    "O QUE É ESCRITURADO — Entram na escrituração as substâncias sob controle especial ADQUIRIDAS PELA CLÍNICA: entradas por nota fiscal, doação e inventário; saídas por dispensação, perda, descarte e ajuste de inventário. Entra também a custódia integrada ao estoque na alta, a partir da data da integração.",
    "O QUE NÃO É ESCRITURADO — Não entra na escrituração a medicação de propriedade do paciente adquirida em drogaria, ainda que sob controle especial: a dispensação foi feita pelo farmacêutico da drogaria. A clínica registra a guarda, o consumo e o destino em controle paralelo.",
    "LANÇAMENTO NO SISTEMA — Registrar toda movimentação no sistema no mesmo dia em que ocorre. É do sistema que sai a folha para transcrição, e lançamento atrasado atrasa a escrituração.",
    "TRANSCRIÇÃO AO LIVRO FÍSICO — Transcrever as movimentações ao Livro de Registro Específico dentro do prazo determinado pela autoridade sanitária, contado do fato. Imprimir a Folha de Registro Semanal, transcrever na ordem e anotar na folha o número da folha do livro em que cada bloco foi lançado.",
    "CONFERÊNCIA DOS SALDOS — Antes de transcrever, conferir a Conferência Mensal de Saldos do sistema. Saldo negativo, divergência entre colunas ou unidade incoerente são erro de lançamento e se corrigem ANTES da transcrição — livro físico não se rasura.",
    "CONFERÊNCIA CONTRA O MAPA — Conferir o mapa rubricado contra as dispensações lançadas. O que não foi administrado tem de ter voltado por devolução; o que foi administrado sem kit (SOS, admissão em fim de semana) é lançado com a data real.",
    "CONTROLE PARALELO DA CUSTÓDIA — Manter no sistema o registro de cada recebimento, consumo e destino da medicação dos pacientes, e imprimir o Controle Paralelo — Medicação de Pacientes para a pasta da farmácia. O documento declara, no próprio cabeçalho, que não é escrituração.",
    "CONFERÊNCIA MENSAL DE SALDOS — O quadro mensal de saldos do sistema é ferramenta interna de conferência, não peça de fiscalização: conforme orientação da Vigilância Sanitária, o Balanço de Substâncias Psicotrópicas e Entorpecentes (BMPO) aplica-se ao comércio varejista, e não à farmácia hospitalar. Não é emitido, assinado nem transmitido como balanço.",
    "GUARDA — Livro físico, mapas, notas fiscais e termos são arquivados em local de acesso restrito, organizados por período, conforme o POP-FAR-015.",
    "CORREÇÕES — Divergência se corrige por lançamento rastreável — ajuste de inventário com justificativa —, nunca por alteração do histórico. Correção que alcance período já transcrito é lançada no período aberto, com a justificativa remetendo ao fato original."
  ],

  "registros": [
    "Livro de Registro Específico físico, escriturado e assinado",
    "Folha de Registro Semanal, com a indicação da folha do livro em que foi transcrita",
    "Controle Paralelo — Medicação de Pacientes",
    "Mapas de medicação arquivados",
    "Ajustes de inventário com justificativa"
  ],

  "referencias": [
    "Portaria SVS/MS nº 344/1998 e Portaria SVS/MS nº 6/1999",
    "RDC nº 63/2011 — Boas Práticas de Funcionamento para os Serviços de Saúde",
    "Notificação da Vigilância Sanitária Municipal, setembro de 2026 — itens 01, 03, 04 e 06",
    "POP-FAR-004, POP-FAR-005, POP-FAR-009 e POP-FAR-015"
  ]
}$j$::jsonb
where codigo = 'POP-FAR-011';

-- ---------------------------------------------------------------------------
-- 2) POP-FAR-004 — custódia deixa de ser escriturada
-- ---------------------------------------------------------------------------
update pops set corpo = replace(corpo::text,
  'Sua entrada, consumo e destino são escriturados como os demais controlados, em coluna própria no balanço.',
  'Sua entrada, consumo e destino NÃO são escriturados: a medicação foi dispensada pelo farmacêutico da drogaria que a vendeu. A clínica mantém controle paralelo, impresso na tela de Escrituração, e os Termos de Custódia e de Devolução como prova da guarda.')::jsonb,
  versao = '04', data_vigencia = current_date
 where codigo = 'POP-FAR-004';

update pops set corpo = replace(corpo::text,
  'o ajuste em lote de custódia é lançado com o paciente informado, para sair na coluna certa do balanço',
  'o ajuste em lote de custódia é lançado com o paciente informado, para sair no controle paralelo e não na escrituração do estabelecimento')::jsonb
 where codigo = 'POP-FAR-004';

-- ---------------------------------------------------------------------------
-- 3) POP-FAR-005 — integração ao estoque é o momento em que passa a escriturar
-- ---------------------------------------------------------------------------
update pops set corpo = replace(corpo::text,
  'Na integração, registrar no sistema — o item passa a compor o estoque geral e a escrituração (BMPO), quando controlado.',
  'Na integração, registrar no sistema — o item deixa de ser do paciente, passa a compor o estoque da clínica e, sendo controlado, entra na escrituração a partir da data da integração. Antes disso permanecia apenas no controle paralelo.')::jsonb,
  versao = '02', data_vigencia = current_date
 where codigo = 'POP-FAR-005';

-- ---------------------------------------------------------------------------
-- 4) POP-FAR-SEP-01 — o que a dispensação alimenta
-- ---------------------------------------------------------------------------
update pops set corpo = replace(corpo::text,
  'Dispensações lançadas no sistema (compõem a escrituração dos controlados)',
  'Dispensações lançadas no sistema — as do estoque da clínica compõem a escrituração; as de custódia, o controle paralelo')::jsonb,
  versao = '03', data_vigencia = current_date
 where codigo = 'POP-FAR-SEP-01';

update pops set corpo = replace(corpo::text,
  'Livro de Registro Específico e BMPO, gerados a partir das dispensações',
  'Livro de Registro Específico e Controle Paralelo da custódia, alimentados pelas dispensações')::jsonb
 where codigo = 'POP-FAR-SEP-01';

-- ---------------------------------------------------------------------------
-- 5) POP-FAR-009 — conferência física continua alcançando a custódia
--    Contar a custódia segue obrigatório: é guarda de bem de terceiro.
-- ---------------------------------------------------------------------------
update pops set corpo = replace(corpo::text,
  'As duas contagens são distintas e não se misturam: o balanço de controlados apresenta estoque do estabelecimento e custódia de pacientes em colunas separadas, e uma contagem lançada na coluna errada abre saldo negativo de um lado e sobra do outro.',
  'As duas contagens são distintas e não se misturam: o estoque da clínica compõe a escrituração, e a custódia, o controle paralelo. Contagem lançada no lado errado abre saldo negativo de um lado e sobra do outro, e leva à escrituração medicação que não pertence ao estabelecimento.')::jsonb,
  versao = '04', data_vigencia = current_date
 where codigo = 'POP-FAR-009';

update pops set corpo = replace(corpo::text,
  'é isso que faz o ajuste sair na coluna de custódia do balanço, e não na do estabelecimento',
  'é isso que mantém o ajuste no controle paralelo, e não na escrituração do estabelecimento')::jsonb
 where codigo = 'POP-FAR-009';

update pops set corpo = replace(corpo::text,
  'Portaria SVS/MS nº 344/1998 (balanço de controlados)',
  'Portaria SVS/MS nº 344/1998 (escrituração de controlados)')::jsonb
 where codigo = 'POP-FAR-009';

-- ---------------------------------------------------------------------------
-- 6) CONFERÊNCIA — nenhum POP vigente pode continuar citando o BMPO
--    como obrigação nem a custódia como escriturada.
-- ---------------------------------------------------------------------------
select codigo, titulo, versao, status,
       corpo::text like '%BMPO%'             as cita_bmpo,
       corpo::text like '%controle paralelo%' as cita_controle_paralelo
  from pops
 where not is_dado_teste and corpo is not null
   and (corpo::text like '%BMPO%' or corpo::text like '%controle paralelo%')
 order by codigo;
