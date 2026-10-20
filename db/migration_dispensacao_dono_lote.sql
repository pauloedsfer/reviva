-- ============================================================================
-- Hospital Reviva — migration_dispensacao_dono_lote.sql
--
-- Corrige o bloqueio "Saldo insuficiente ... disponível 0" na dispensação,
-- quando o estoque da clínica tem o medicamento.
--
-- O QUE ACONTECIA:
--   O sistema guarda, em dispensacoes, apenas o NÚMERO do lote. Mas o saldo
--   não é por número de lote: é por substância + lote + DONO, porque o mesmo
--   número existe no estoque da clínica e na custódia de um paciente ao mesmo
--   tempo — a família compra na drogaria do mesmo lote industrial que a
--   clínica comprou do distribuidor. Isso não é raro, é o esperado.
--
--   Sem o dono gravado, o sistema inferia: "se o paciente tem esse lote em
--   custódia, a saída é de lá". A inferência olhava se a custódia EXISTE, não
--   se ainda tem saldo. Resultado: esgotada a custódia daquele lote, toda dose
--   seguinte do mesmo número era debitada do saldo vazio, e a dispensação
--   parava com "disponível 0, solicitado 2" — com centenas de comprimidos no
--   estoque da clínica, do mesmo lote, intactos.
--
--   O alocador de lotes já fazia a coisa certa (pula bucket zerado e cai no
--   estoque da clínica). Quem errava era a conferência logo depois: ela
--   redescobria o bucket a partir de (substância, lote, paciente) e voltava
--   para a custódia vazia, barrando a dose que o alocador tinha tirado do
--   lugar certo.
--
-- O QUE ESTA MIGRAÇÃO FAZ:
--   Acrescenta `lote_dono` em dispensacoes. A partir dela, cada dose grava de
--   qual saldo saiu — 'clinica' ou 'custodia' — em vez de o sistema adivinhar
--   depois pelo número do lote.
--
-- POR QUE NÃO PREENCHE O HISTÓRICO:
--   Lançamento antigo fica com lote_dono nulo e segue na inferência antiga, de
--   propósito. Reatribuir saída do passado mudaria saldo já conferido,
--   escriturado e transcrito ao livro físico — e o livro não se rasura. O
--   defeito travava lançamento NOVO; é o novo que precisa da correção.
--
-- Aditiva, idempotente, não altera nenhuma linha existente.
-- Rodar UMA VEZ no SQL Editor. Faça um Exportar backup antes.
-- Depois de rodar, suba os arquivos de código da mesma entrega: sem eles a
-- coluna fica vazia e nada muda.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) A COLUNA
--
-- Aceita nulo porque o histórico inteiro é nulo. O check não barra nulo —
-- em SQL, `null in (...)` é desconhecido, e CHECK só reprova o que é
-- comprovadamente falso —, então as linhas antigas passam sem conversão.
-- ---------------------------------------------------------------------------

alter table dispensacoes add column if not exists lote_dono text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ck_dispensacao_lote_dono') then
    alter table dispensacoes
      add constraint ck_dispensacao_lote_dono
      check (lote_dono is null or lote_dono in ('clinica','custodia'));
  end if;
end $$;

comment on column dispensacoes.lote_dono is
  'De qual saldo a dose saiu: clinica = estoque do estabelecimento; custodia = medicação própria do paciente. Nulo = lançamento anterior ao campo, cujo saldo é inferido pelo par lote+paciente.';


-- ---------------------------------------------------------------------------
-- 2) DIAGNÓSTICO — quantos casos como este existem hoje
--
-- Lista os números de lote que existem AO MESMO TEMPO no estoque da clínica e
-- na custódia de algum paciente. Cada linha aqui é uma dispensação que podia
-- travar do mesmo jeito. Rode antes e depois para ter a dimensão do problema.
-- ---------------------------------------------------------------------------

select s.nome                                           as substancia,
       l.numero_lote,
       sum(case when l.restrito_paciente_id is null
                then l.quantidade_entrada else 0 end)   as entradas_da_clinica,
       count(distinct l.restrito_paciente_id)            as pacientes_com_esse_lote
  from vw_lotes l
  join substancias s on s.id = l.substancia_id
 where coalesce(l.is_dado_teste, false) = false
 group by s.nome, l.numero_lote
having count(distinct l.restrito_paciente_id) > 0
   and sum(case when l.restrito_paciente_id is null then 1 else 0 end) > 0
 order by s.nome, l.numero_lote;


-- ---------------------------------------------------------------------------
-- 3) CONFERÊNCIA
-- ---------------------------------------------------------------------------

-- 3.1 A coluna e a trava existem?
select column_name, data_type, is_nullable
  from information_schema.columns
 where table_name = 'dispensacoes' and column_name = 'lote_dono';

select conname from pg_constraint where conname = 'ck_dispensacao_lote_dono';

-- 3.2 Depois de dispensar com os arquivos novos no ar, as doses recentes têm
--     que aparecer com 'clinica' ou 'custodia'. As antigas seguem nulas.
select coalesce(lote_dono, '— histórico, inferido —') as dono_do_lote,
       count(*) as lancamentos,
       min(data) as mais_antigo,
       max(data) as mais_recente
  from dispensacoes
 where coalesce(is_dado_teste, false) = false
 group by 1
 order by 2 desc;


-- ============================================================================
-- OBSERVAÇÕES PARA O RESPONSÁVEL TÉCNICO
--
-- 1. NÃO ERA ERRO DE CONTAGEM — não lance ajuste de inventário por causa
--    disso. A mensagem sugere ajuste porque é o conselho certo para saldo
--    divergente de verdade; aqui o saldo estava correto nos dois lados, e um
--    ajuste teria criado estoque que não existe na custódia do paciente, com
--    justificativa falsa no Livro.
--
-- 2. AS DOSES ANTERIORES DESSE PACIENTE CONTINUAM COMO ESTÃO. Se alguma dose
--    de QUETIAPINA já foi debitada da custódia dele quando deveria ter saído
--    do estoque da clínica, o saldo da custódia está menor e o da clínica
--    maior do que o físico. Rode a consulta 2 para ver os lotes em colisão e
--    confira o físico desses itens. Havendo diferença real, aí sim é ajuste de
--    inventário, com a justificativa verdadeira: atribuição de saída corrigida.
--
-- 3. O DEFEITO ATINGE QUALQUER PACIENTE com custódia do mesmo lote que a
--    clínica, não só este. A consulta 2 mostra quais são.
-- ============================================================================
