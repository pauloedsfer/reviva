-- ============================================================================
-- Hospital Reviva — migration_remover_bmpo_pops.sql
--
-- Remove as menções ao BMPO do texto dos POPs JÁ GRAVADOS no banco.
--
-- POR QUE PRECISA DE MIGRAÇÃO, E NÃO SÓ DE EDIÇÃO DE ARQUIVO:
--   O corpo do POP vive na tabela `pops`, em jsonb. Limpar os arquivos .sql de
--   conteúdo (pops_conteudo_v*.sql) não muda uma linha do que está gravado —
--   aqueles arquivos já rodaram. O POP que a Vigilância lê é o que está no
--   banco e sai na impressão, e é esse que esta migração corrige.
--
-- O QUE JÁ FOI FEITO ANTES:
--   pops_notificacao_visa_2026_09.sql, de setembro, já substituiu duas
--   passagens com BMPO (POP-FAR-005 e POP-FAR-SEP-01). Os dois replace estão
--   repetidos aqui de propósito: se aquele arquivo não rodou neste banco, ou
--   se o POP foi regravado depois por uma versão de conteúdo mais nova, o
--   texto antigo voltou. replace() em string ausente não faz nada, então
--   repetir é seguro e cobre os dois casos.
--
--   Os arquivos de migração antigos NÃO foram editados. Rescrever migração já
--   aplicada é reescrever histórico, e no caso do arquivo de setembro seria
--   pior: o texto com BMPO é o ORIGEM do replace dele. Tirar a palavra de lá
--   quebraria o próprio arquivo que faz a limpeza.
--
-- Aditiva, idempotente, sem apagar nada. Faça um Exportar backup antes.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1) A menção que sobrou: lista de materiais de apoio do POP
--
-- Vinha de pops_conteudo_v2.sql e não estava entre os replace de setembro. O
-- WHERE casa pelo conteúdo, não pelo código do POP, para pegar em qualquer POP
-- que tenha herdado a mesma lista.
-- ---------------------------------------------------------------------------

update pops
   set corpo = replace(corpo::text,
         'Sistema de gestão da farmácia (Livro de Registro, Balanço/BMPO)',
         'Sistema de gestão da farmácia (Livro de Registro, Conferência de Saldos)')::jsonb,
       versao = case when versao ~ '^[0-9]+$'
                     then lpad((versao::int + 1)::text, 2, '0')
                     else versao end,
       data_vigencia = current_date
 where corpo::text like '%Livro de Registro, Balanço/BMPO%';


-- ---------------------------------------------------------------------------
-- 2) Rede de segurança: os dois replace de setembro, de novo
--
-- Sem mexer em versao aqui — se o texto já estava corrigido, nada acontece, e
-- bumpar versão de POP que não mudou só sujaria o histórico.
-- ---------------------------------------------------------------------------

update pops
   set corpo = replace(corpo::text,
         'Na integração, registrar no sistema — o item passa a compor o estoque geral e a escrituração (BMPO), quando controlado.',
         'Na integração, registrar no sistema — o item deixa de ser do paciente, passa a compor o estoque da clínica e, sendo controlado, entra na escrituração a partir da data da integração. Antes disso permanecia apenas no controle paralelo.')::jsonb
 where corpo::text like '%a escrituração (BMPO), quando controlado.%';

update pops
   set corpo = replace(corpo::text,
         'Livro de Registro Específico e BMPO, gerados a partir das dispensações',
         'Livro de Registro Específico e Controle Paralelo da custódia, alimentados pelas dispensações')::jsonb
 where corpo::text like '%Livro de Registro Específico e BMPO, gerados%';


-- ---------------------------------------------------------------------------
-- 3) CONFERÊNCIA — a consulta que importa
--
-- Tem que voltar VAZIA. Se voltar alguma linha, é POP que menciona o BMPO num
-- texto que eu não conhecia — provavelmente editado pela tela de POPs depois
-- das migrações. O trecho vem recortado para você ver o contexto e decidir a
-- redação; me manda o resultado que eu preparo o replace.
-- ---------------------------------------------------------------------------

select p.codigo,
       p.titulo,
       p.versao,
       p.status,
       substring(p.corpo::text
                 from greatest(1, position('BMPO' in p.corpo::text) - 120)
                 for 260) as trecho_com_bmpo
  from pops p
 where p.corpo::text like '%BMPO%'
 order by p.codigo;

-- Quantos POPs ainda citam, no total (esperado: 0).
select count(*) as pops_citando_bmpo
  from pops
 where corpo::text like '%BMPO%';

-- Confere também título e área, que não passam pelo corpo.
select codigo, titulo, area
  from pops
 where titulo ilike '%bmpo%' or area ilike '%bmpo%';


-- ============================================================================
-- OBSERVAÇÕES PARA O RESPONSÁVEL TÉCNICO
--
-- 1. REIMPRIMA OS POPS QUE MUDARAM.
--    A versão do POP alterado no item 1 subiu e a data de vigência passou a
--    ser hoje. POP impresso e assinado em pasta continua com o texto antigo,
--    e é o papel que a fiscal folheia. Troque as folhas dos que mudaram.
--
-- 2. A TELA, O CÓDIGO E OS DOCUMENTOS JÁ ESTÃO LIMPOS.
--    Esta migração cobre só o texto gravado no banco. As telas, os comentários
--    de código, os nomes de função e os arquivos de documentação do projeto
--    foram limpos na mesma entrega — incluindo a nota de impressão da
--    Conferência de Saldos, que antes citava o BMPO justamente para dizer que
--    ele não se aplica. Dizer isso num documento que vai à fiscalização
--    levanta a pergunta em vez de encerrá-la; agora o quadro só se apresenta
--    pelo que é: conferência interna da farmácia.
--
-- 3. O QUE NÃO FOI MEXIDO, E POR QUE.
--    Os arquivos de migração antigos em db/ continuam com o texto original.
--    São o histórico do que já rodou, e um deles precisa da palavra para
--    funcionar. Se preferir, posso renomeá-los numa próxima — mas isso não
--    altera nada no banco nem no que é impresso.
-- ============================================================================
