-- ============================================================================
-- Hospital Reviva — pop_far_007_separacao.sql
--
-- Cria o POP-FAR-007 — Separação da Dose Unitária e Corte de Cartelas.
--
-- POR QUE ESTE POP NÃO EXISTIA: o antigo "Preparo e Etiquetagem da Dose
-- Unitária" foi reescrito, no pops_conteudo_v2.sql, como POP-ENF-001 —
-- "Preparo e Administração de Medicamentos pela Enfermagem". De lá para cá a
-- separação passou a ser feita pela farmácia, e a enfermagem ficou só com a
-- administração. Ficou um vazio: a atividade que hoje mais gera pergunta de
-- fiscalização — cortar cartela em unidades — não estava descrita em lugar
-- nenhum.
--
-- O QUE ESTE POP AFIRMA, E O QUE ELE NÃO AFIRMA:
--   AFIRMA que a farmácia corta cartelas SEM romper a embalagem primária,
--   caso em que a validade permanece a do fabricante (RDC 67/2007, Anexo VI,
--   item 3.9 "a"), e descreve como a identificação é preservada.
--   NÃO AFIRMA serviço de fracionamento com rompimento de embalagem,
--   subdivisão de forma farmacêutica (partir comprimido) ou transformação —
--   atividades que exigiriam sala própria, livro de fracionamento e rotulagem
--   por unidade, e que a clínica não realiza.
-- Leia o procedimento antes de rodar: ele descreve a rotina como ela é hoje.
-- Se algum passo não corresponder à prática, ajuste o texto antes — POP que
-- descreve o que não se faz é pior do que POP nenhum.
--
-- Idempotente: pode rodar mais de uma vez. O INSERT só grava se o código
-- ainda não existir; o UPDATE atinge somente a linha desse código.
-- Depende de: migration_pops.sql e migration_pops_corpo.sql aplicadas.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0) Conferência PRÉVIA — veja se o código POP-FAR-007 já está em uso por
--    outro procedimento antes de seguir. Se retornar alguma linha com título
--    diferente, pare e escolha outro código.
-- ---------------------------------------------------------------------------
select codigo, titulo, versao, status
from pops
where codigo = 'POP-FAR-007';

-- ---------------------------------------------------------------------------
-- 1) Cria o POP apenas se ainda não existir
-- ---------------------------------------------------------------------------
insert into pops (area, titulo, status, ordem, is_dado_teste, codigo, versao)
select 'Farmácia', 'Separação da Dose Unitária e Corte de Cartelas', 'vigente', 7, false, 'POP-FAR-007', '01'
where not exists (select 1 from pops where codigo = 'POP-FAR-007');

-- ---------------------------------------------------------------------------
-- 2) Grava o conteúdo
-- ---------------------------------------------------------------------------
update pops set
  area = 'Farmácia',
  titulo = 'Separação da Dose Unitária e Corte de Cartelas',
  status = 'vigente',
  versao = '01',
  data_vigencia = current_date,
  proxima_revisao = current_date + interval '6 months',
  corpo = $J${
    "objetivo": "Padronizar a separação da dose unitária pela farmácia, incluindo o corte de cartelas em unidades, a identificação dos kits e a guarda da sobra, de modo que nenhuma unidade cortada exista sem identificação de medicamento, concentração, lote e validade, e que a rastreabilidade da dose administrada até a nota fiscal de origem seja mantida.",

    "aplicacao": "Aplica-se aos medicamentos sólidos orais em cartela (blíster) dispensados em kit por paciente e por horário. O corte é feito sem rompimento da embalagem primária: a cavidade que contém o comprimido permanece íntegra e lacrada, de modo que o prazo de validade permanece o determinado pelo fabricante, nos termos do Anexo VI da RDC nº 67/2007. A clínica NÃO realiza fracionamento com rompimento de embalagem primária, subdivisão de forma farmacêutica (partir comprimido) nem transformação ou derivação. Medicação que exija preparo a partir de frasco — insulina, gotas, xarope, pomada — não é separada em kit e segue a folha de preparo na hora.",

    "responsabilidades": [
      "Farmacêutico Responsável Técnico: executar a separação; conferir medicamento, concentração, lote e validade antes de cortar; cortar preservando a identificação da sobra; montar e identificar os kits; conferir o checklist ao final; decidir o destino de cartela cuja identificação tenha se perdido.",
      "Equipe de enfermagem: administrar a medicação do kit no horário indicado; não abrir kit de outro dia; devolver fechado à farmácia o kit não administrado; registrar na folha própria toda administração feita fora do kit.",
      "A separação é atividade da farmácia e não é delegada. Na ausência do farmacêutico, não se separa: administra-se o que já está separado e identificado."
    ],

    "materiais": [
      "Sistema de gestão da farmácia — tela Separação da Farmácia: checklist de separação, etiquetas dos kits, etiquetas dos sacos e folha de preparo e registro fora do kit",
      "Tesoura de uso exclusivo da farmácia, higienizada antes e depois do uso",
      "Bancada limpa e livre de outro medicamento durante a separação",
      "Sacos ou envelopes para o kit, saco do dia e sacos de período",
      "Cartelas e frascos identificados, do estoque da clínica ou da custódia do paciente"
    ],

    "procedimento": [
      "PREPARAR A BANCADA — Higienizar a bancada e a tesoura. Manter na bancada apenas o medicamento que está sendo separado no momento, para eliminar risco de troca.",
      "GERAR OS IMPRESSOS — Na tela Separação da Farmácia, escolher o período e emitir o checklist, as etiquetas dos kits e as etiquetas dos sacos. A etiqueta do kit já traz, para cada medicamento, a quantidade, o lote e a validade previstos, e marca com ★ o que sai da custódia do próprio paciente.",
      "CONFERIR ANTES DE CORTAR — Comparar o que está impresso na cartela (nome, concentração, lote e validade) com o que a etiqueta do kit indica. Havendo divergência, não cortar: acertar o lançamento no sistema e reimprimir. Lote esperado que tenha acabado é situação normal quando houve devolução ou ajuste; a etiqueta é previsão, a cartela é o fato.",
      "CORTAR PRESERVANDO A IDENTIFICAÇÃO — Cortar de modo a não destruir a porção impressa com nome, lote e validade da cartela que retorna à gaveta. Quando a impressão estiver entre as cavidades, cortar em tira, e não em célula isolada. Nunca cortar a faixa que contém lote e validade da sobra.",
      "SOBRA SEM IDENTIFICAÇÃO NÃO VOLTA AO ESTOQUE — Se a sobra perder nome, lote ou validade, ela é segregada em local identificado e baixada por ajuste de inventário com a justificativa, conforme o POP-FAR-009. Não se devolve à gaveta unidade que não possa ser identificada.",
      "UNIDADE CORTADA NUNCA FICA SOLTA — A unidade recortada ou está na cartela, ou está dentro do kit fechado e identificado. Não se corta adiantado para deixar em gaveta, pote ou caixinha sem identificação.",
      "MONTAR O KIT — Um kit por paciente e por horário, exclusivo do dia indicado. Aplicar a etiqueta, que identifica paciente, dia, horário, medicamentos, quantidade, lote e validade de cada item.",
      "AGRUPAR — Fechar os kits do mesmo período no saco de período e os sacos de período no saco do dia, com as etiquetas correspondentes. Kit de outro dia não é aberto.",
      "CUSTÓDIA — Medicação de propriedade do paciente é usada apenas para ele, conforme o POP-FAR-004. Na etiqueta ela vem marcada com ★ e com o lote e a validade daquela caixa.",
      "CONFERIR AO FINAL — Percorrer o checklist paciente a paciente, conferindo os kits montados contra o previsto, e assinar. Registrar no checklist qualquer item não separado e o motivo.",
      "DEVOLUÇÃO — Kit não administrado volta fechado à farmácia e é reintegrado ao estoque conforme o POP-FAR-008, com o lote identificado pela própria etiqueta.",
      "FORA DO KIT — Toda administração feita fora do kit — SOS prescrito ou sintomático liberado pela enfermagem — é registrada na folha de Registro de Administração Fora do Kit, com a origem indicada, e lançada no sistema pelo RT."
    ],

    "registros": [
      "Checklist de separação, conferido e assinado",
      "Etiquetas dos kits e dos sacos, que acompanham a medicação até a administração",
      "Dispensação lançada no sistema, com lote e validade por dose — é dela que sai a rastreabilidade até a nota fiscal",
      "Folha de Registro de Administração Fora do Kit, devolvida pela enfermagem ao fim do plantão",
      "Ajuste de inventário das sobras segregadas por perda de identificação"
    ],

    "referencias": [
      "RDC nº 67/2007, Anexo VI — Boas Práticas para Preparação de Dose Unitária e Unitarização de Doses de Medicamento em Serviços de Saúde; item 3.9 a: sem rompimento da embalagem primária, a validade é a do fabricante",
      "RDC nº 63/2011 — Boas Práticas de Funcionamento para os Serviços de Saúde",
      "Portaria SVS/MS nº 344/1998 — substâncias sujeitas a controle especial",
      "POP-FAR-004 (custódia), POP-FAR-008 (devolução), POP-FAR-009 (ajuste de inventário) e POP-ENF-001 (administração pela enfermagem)"
    ]
  }$J$
where codigo = 'POP-FAR-007';

-- ---------------------------------------------------------------------------
-- 3) Conferência final
-- ---------------------------------------------------------------------------
select
  codigo,
  titulo,
  versao,
  status,
  data_vigencia,
  case when corpo is null then 'SEM CONTEÚDO — rodar de novo'
       else 'OK — ' || jsonb_array_length(corpo->'procedimento') || ' passos no procedimento' end as situacao
from pops
where codigo = 'POP-FAR-007';
