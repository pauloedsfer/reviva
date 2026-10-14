-- ============================================================================
-- Hospital Reviva — migration_remover_bmpo_pop_far_011.sql
--
-- Última menção ao BMPO no banco: POP-FAR-011 (Escrituração de Controlados e
-- Controle Paralelo da Custódia), versão 03, vigente.
--
-- Complementa migration_remover_bmpo_pops.sql, que já rodou. Aquele arquivo
-- limpou as menções que eu conhecia; esta frase não estava entre elas porque
-- ela não é resíduo antigo — foi ACRESCENTADA por
-- pops_notificacao_visa_2026_09.sql, a migração de setembro que respondeu à
-- notificação. Ela nomeia o BMPO justamente para registrar que ele não se
-- aplica à farmácia hospitalar.
--
-- POR QUE A FRASE SAI, E O QUE SE PERDE:
--   Esse é o mesmo caso da nota de impressão da Conferência de Saldos: a
--   intenção era defensiva, mas o efeito é citar num documento vigente um
--   instrumento que o serviço não produz. Num POP que a fiscal folheia, isso
--   levanta a pergunta em vez de encerrá-la.
--
--   Em troca, o POP deixa de registrar o FUNDAMENTO de não produzir o
--   balanço. O texto novo mantém a parte operativa — o quadro é interno, não é
--   emitido, assinado nem transmitido — e descreve para que ele serve. O
--   fundamento jurídico, se você quiser guardá-lo, fica melhor na sua pasta de
--   resposta à notificação, que é documento seu e não peça do sistema. Ver
--   observação 2.
--
-- Aditiva e idempotente: o WHERE casa pelo texto, então rodar duas vezes não
-- muda nada na segunda. Faça um Exportar backup antes.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1) SUBSTITUIÇÃO
--
-- O replace casa a frase inteira, incluindo o rótulo "CONFERÊNCIA MENSAL DE
-- SALDOS —", porque o corpo do POP é uma lista de strings e é a string toda
-- que precisa ficar coerente depois do corte. Recortar só a oração do meio
-- deixaria "não peça de fiscalização: Não é emitido", com dois-pontos seguido
-- de maiúscula.
--
-- A versão sobe para 04 e a vigência passa a ser hoje: POP vigente que muda de
-- texto muda de versão, senão a pasta física e o sistema divergem sem registro.
-- ---------------------------------------------------------------------------

update pops
   set corpo = replace(corpo::text,
         'CONFERÊNCIA MENSAL DE SALDOS — O quadro mensal de saldos do sistema é ferramenta interna de conferência, não peça de fiscalização: conforme orientação da Vigilância Sanitária, o Balanço de Substâncias Psicotrópicas e Entorpecentes (BMPO) aplica-se ao comércio varejista, e não à farmácia hospitalar. Não é emitido, assinado nem transmitido como balanço.',
         'CONFERÊNCIA MENSAL DE SALDOS — O quadro mensal de saldos do sistema é ferramenta interna de conferência da própria farmácia, não peça de fiscalização: não é emitido, assinado nem transmitido. Serve para revelar saldo negativo, divergência entre colunas e erro de unidade antes da transcrição ao livro físico.'
       )::jsonb,
       versao = case when versao ~ '^[0-9]+$'
                     then lpad((versao::int + 1)::text, 2, '0')
                     else versao end,
       data_vigencia = current_date
 where codigo = 'POP-FAR-011'
   and corpo::text like '%(BMPO)%';


-- ---------------------------------------------------------------------------
-- 2) CONFERÊNCIA — rodar CADA UMA SEPARADAMENTE
--
-- O editor do Supabase mostra só o resultado da última consulta quando você
-- roda o arquivo inteiro. Selecione uma por vez e execute com a seleção.
-- ---------------------------------------------------------------------------

-- 2.1 Tem que voltar ZERO.
select count(*) as pops_citando_bmpo
  from pops
 where corpo::text like '%BMPO%';

-- 2.2 O POP-FAR-011 ficou na versão 04, com a vigência de hoje e o texto novo?
select codigo, titulo, versao, data_vigencia, status,
       (corpo::text like '%BMPO%')                              as ainda_cita_bmpo,
       (corpo::text like '%interna de conferência da própria farmácia%') as tem_texto_novo
  from pops
 where codigo = 'POP-FAR-011';

-- 2.3 Varredura final: qualquer POP, em qualquer nível do corpo, e também nos
--     campos de texto fora do corpo. Tem que voltar VAZIA.
select p.codigo, p.titulo, p.versao, 'corpo' as onde, v #>> '{}' as texto
  from pops p,
       lateral jsonb_path_query(p.corpo, '$.**') as v
 where p.corpo::text like '%BMPO%'
   and jsonb_typeof(v) = 'string'
   and v #>> '{}' like '%BMPO%'
union all
select codigo, titulo, versao, 'fora do corpo', coalesce(titulo,'') || ' | ' || coalesce(area,'') || ' | ' || coalesce(observacao,'')
  from pops
 where titulo ilike '%bmpo%' or area ilike '%bmpo%' or coalesce(observacao,'') ilike '%bmpo%'
 order by 1;


-- ============================================================================
-- OBSERVAÇÕES PARA O RESPONSÁVEL TÉCNICO
--
-- 1. REIMPRIMA O POP-FAR-011 E TROQUE A FOLHA NA PASTA.
--    Ele é vigente e subiu para a versão 04 com vigência de hoje. A folha
--    assinada na pasta continua na 03, com a frase antiga — e é o papel que a
--    fiscal folheia. Se houver cópia em outro lugar (mural, pasta da
--    enfermagem), troque também.
--
-- 2. ONDE GUARDAR O FUNDAMENTO, SE QUISER GUARDAR.
--    A frase que saiu dizia por que a clínica não produz o balanço. Esse
--    raciocínio tem valor para você, mas não dentro de um POP vigente: POP
--    descreve o que o serviço FAZ, e a razão de não fazer algo que ninguém
--    exigiu só chama atenção para o assunto. O lugar dele é a sua pasta de
--    resposta à notificação, junto com o item 06 por escrito — lá é
--    argumentação sua, apresentada se e quando for perguntado, não declaração
--    permanente num procedimento.
--
-- 3. COMO ESTA FRASE PASSOU NA PRIMEIRA LIMPEZA.
--    A migração anterior tratou as menções que estavam nos arquivos de
--    conteúdo de POP. Esta não estava lá: entrou pela migração de setembro,
--    que é a que respondeu à notificação. Por isso a consulta de conferência
--    daquele arquivo era genérica — ela não sabia o que procurar, só que algo
--    podia ter sobrado. Foi ela que achou.
-- ============================================================================
