-- ============================================================================
-- Hospital Reviva — migration_inventario_materiais.sql
--
-- Organiza no sistema 18 materiais que já estavam fisicamente na farmácia:
-- estoque antigo, comprado pela diretoria antes da consulta ao RT, sem nota
-- fiscal localizável. Valores conforme planilha repassada pela diretoria.
--
-- SUBSTITUI a versão anterior deste lançamento (migration_entrada_materiais_
-- carrinho.sql), que entrava como compra com documento provisório. Aquela rota
-- estava errada para este caso: ela pressupõe uma nota que vai chegar.
--
-- POR QUE AGORA É INVENTÁRIO INICIAL E NÃO COMPRA:
--   inventario_inicial é, no próprio schema, a abertura do estoque físico —
--   material que já está na prateleira entrando no sistema pela primeira vez.
--   É exatamente este caso. Não há nota, não vai haver, e não há fornecedor a
--   identificar: inventar um documento provisório criaria uma pendência
--   permanente no Livro para algo que nunca vai se resolver. O campo observacao
--   registra a procedência, e vw_lotes mostra origem 'inventario'.
--
--   São só materiais — nenhum medicamento, nenhum controlado. A Portaria
--   344/98 não alcança material, então não há escrituração de controlado em
--   jogo aqui. Ver observação 1.
--
-- POR QUE A QUANTIDADE NÃO É A DA PLANILHA:
--   A planilha traz por embalagem ("Qtd 1" = 1 caixa de 100) e o estoque do
--   sistema é em unidade. A coluna qtd abaixo é SEMPRE em unidade, e custo_unit
--   é o Preço Unit. da planilha — o produto dos dois reproduz o Preço Total de
--   cada linha, o que a conferência do item 4 confere.
--
-- Duas execuções não duplicam (todo INSERT tem WHERE NOT EXISTS).
-- Rodar UMA VEZ no SQL Editor. Faça um Exportar backup antes.
--
-- ATENÇÃO: a trava de período fechado cobre inventario_inicial. Se o mês de
-- 2026-10 já estiver fechado em fechamento_mensal, o INSERT do item 1 falha
-- com exceção — reabra o período ou use uma data dentro de período aberto.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1) ENTRADA POR INVENTÁRIO
--
-- SOBRE A COLUNA lote: a planilha não traz lote, só validade. Pré-preenchido
-- com o código do produto de cada linha, que é único e rastreia de volta à
-- planilha. O lote real está impresso na embalagem — como o material está aí na
-- prateleira, vale conferir as caixas e substituir antes de rodar: controle de
-- validade e recolhimento se fazem por lote, e depois de lançado o lote só
-- muda com ajuste.
--
-- O micronebulizador é o único sem validade na planilha: vai null.
-- ---------------------------------------------------------------------------

insert into inventario_inicial
  (substancia_id, numero_lote, validade, quantidade, custo_unit, data, observacao, is_dado_teste)
select s.id, v.lote, v.validade, v.qtd, v.custo,
       '2026-10-12'::date,   -- data da contagem física; ajuste se foi outro dia
       'Estoque físico pré-existente, sem nota fiscal localizada. '
       'Quantidades e valores conforme planilha repassada pela diretoria.',
       false
from (values
  -- nome cadastrado no sistema                  | qtd (un.) | lote      | validade     | custo_unit
  ('ATADURA DE CREPE 15CM 13 FIOS',                     12, '0012442', '2031-05-08'::date, 0.7158),
  ('CLOREXIDINA ALCOOLICA 0,5% 100ML',                   48, '0024005', '2029-06-18'::date, 2.4356),
  ('ABAIXADOR DE LINGUA',                               100, '0022795', '2035-10-31'::date, 0.0527),
  ('EQUIPO MACROGOTAS SIMPLES',                          25, '0020159', '2030-10-31'::date, 0.7680),
  ('MASCARA PFF-2 / N95',                                 3, '0002038', '2029-07-31'::date, 2.5700),
  ('OCULOS DE PROTECAO',                                  3, '0016822', '2030-05-31'::date, 2.9500),
  ('TOUCA DESCARTAVEL',                                 100, '0020978', '2031-04-30'::date, 0.0750),
  ('CATETER PERIFERICO N. 20',                          100, '0019794', '2031-01-31'::date, 0.6586),
  ('CATETER PERIFERICO N. 22',                          100, '0010589', '2030-10-31'::date, 0.7100),
  ('GARROTE',                                            25, '0000321', '2050-12-31'::date, 0.7028),
  ('LANCETA PICADORA',                                  100, '0019764', '2030-11-30'::date, 0.1193),
  ('SERINGA 1ML (INSULINA) C/ AGULHA',                  100, '0000264', '2031-03-31'::date, 0.4919),
  ('CANULA DE GUEDEL N. 4',                               1, '0012523', '2031-01-09'::date, 2.0200),
  ('FILTRO ELETROSTATICO ADULTO',                          1, '0022502', '2029-08-31'::date, 10.2900),
  ('FIO GUIA PARA INTUBACAO',                             1, '0005249', '2030-11-19'::date, 7.8200),
  ('MASCARA DE NEBULIZACAO ADULTO (KIT AEROSOL)',          3, '0010729', null,               6.4100),
  ('UMIDIFICADOR PARA OXIGENIO',                           1, '0018180', '2036-09-30'::date, 10.4800),
  ('AGULHA DESCARTAVEL 40X12',                           100, '0000761', '2031-04-30'::date, 0.1120)
) as v(nome, qtd, lote, validade, custo)
join substancias s on s.nome = v.nome
where not exists (
  select 1 from inventario_inicial ii
   where ii.substancia_id = s.id
     and ii.numero_lote   = v.lote
);


-- ---------------------------------------------------------------------------
-- 2) CARRINHO DE EMERGÊNCIA — cria o carrinho se ainda não existir
--
-- Entra como lacre pendente de propósito: o lacre só existe depois de montado
-- e selado fisicamente, e colocar um número aqui seria registrar um lacre que
-- não foi posto em nada.
-- ---------------------------------------------------------------------------

insert into carrinho_emergencia (lacre_atual, status, ultima_conferencia, is_dado_teste)
select null, 'rompido', current_date, false
where not exists (
  select 1 from carrinho_emergencia where coalesce(is_dado_teste,false) = false
);


-- ---------------------------------------------------------------------------
-- 3) ITENS QUE VÃO PARA O CARRINHO
--
-- Só o que este lote de material tornou possível. A validade é a do lote que
-- entrou, porque a tela do carrinho semaforiza por validade.
--
-- Os quatro itens com qtd_padrao = 1 (Guedel, filtro, fio guia, umidificador)
-- existem em uma unidade só: a quantidade padrão é 1 porque é tudo o que há,
-- não porque 1 seja suficiente. Ver observação 4.
-- ---------------------------------------------------------------------------

insert into carrinho_itens (carrinho_id, nome, qtd_padrao, validade, is_dado_teste)
select c.id, v.nome, v.qtd, v.validade, false
from (values
  -- GAVETA 2 — punção, injeção e antissepsia
  ('GARROTE',                                      2, '2050-12-31'::date),
  ('CATETER PERIFERICO N. 20',                     5, '2031-01-31'::date),
  ('CATETER PERIFERICO N. 22',                     5, '2030-10-31'::date),
  ('SERINGA 1ML (INSULINA) C/ AGULHA',             5, '2031-03-31'::date),
  ('AGULHA DESCARTAVEL 40X12',                    10, '2031-04-30'::date),
  ('CLOREXIDINA ALCOOLICA 0,5% 100ML',             1, '2029-06-18'::date),
  ('ATADURA DE CREPE 15CM 13 FIOS',                2, '2031-05-08'::date),
  -- GAVETA 3 — via aérea e oxigenoterapia
  ('CANULA DE GUEDEL N. 4',                        1, '2031-01-09'::date),
  ('FILTRO ELETROSTATICO ADULTO',                  1, '2029-08-31'::date),
  ('FIO GUIA PARA INTUBACAO',                      1, '2030-11-19'::date),
  ('MASCARA DE NEBULIZACAO ADULTO (KIT AEROSOL)',  2, null),
  ('UMIDIFICADOR PARA OXIGENIO',                   1, '2036-09-30'::date),
  ('ABAIXADOR DE LINGUA',                          5, '2035-10-31'::date),
  -- GAVETA 4 — infusão
  ('EQUIPO MACROGOTAS SIMPLES',                    4, '2030-10-31'::date),
  -- EPI de atendimento
  ('MASCARA PFF-2 / N95',                          2, '2029-07-31'::date),
  ('OCULOS DE PROTECAO',                           1, '2030-05-31'::date),
  ('TOUCA DESCARTAVEL',                            5, '2031-04-30'::date)
) as v(nome, qtd, validade)
cross join (
  select id from carrinho_emergencia
   where coalesce(is_dado_teste,false) = false
   order by created_at limit 1
) c
where not exists (
  select 1 from carrinho_itens ci where ci.carrinho_id = c.id and ci.nome = v.nome
);


-- ---------------------------------------------------------------------------
-- 4) CONFERÊNCIA — rodar depois e ler as quatro consultas
-- ---------------------------------------------------------------------------

-- 4.1 O inventário bate com a planilha? 18 linhas, total R$ 450,62.
select s.nome, ii.quantidade as qtd_un, s.unidade, ii.numero_lote, ii.validade,
       ii.custo_unit, round(ii.quantidade * ii.custo_unit, 2) as total_linha
  from inventario_inicial ii
  join substancias s on s.id = ii.substancia_id
 where ii.data = '2026-10-12'::date
 order by s.nome;

select count(*)                                      as linhas_esperado_18,
       round(sum(ii.quantidade * ii.custo_unit), 2)   as total_esperado_450_62
  from inventario_inicial ii
 where ii.data = '2026-10-12'::date;

-- 4.2 Algum nome da planilha não encontrou cadastro? Tem que voltar VAZIO.
--     Join por texto falha em silêncio: sem esta consulta um item não entraria
--     sem ninguém notar.
select v.nome as nao_encontrado_no_cadastro
  from (values
  ('ATADURA DE CREPE 15CM 13 FIOS'),('CLOREXIDINA ALCOOLICA 0,5% 100ML'),
  ('ABAIXADOR DE LINGUA'),('EQUIPO MACROGOTAS SIMPLES'),('MASCARA PFF-2 / N95'),
  ('OCULOS DE PROTECAO'),('TOUCA DESCARTAVEL'),('CATETER PERIFERICO N. 20'),
  ('CATETER PERIFERICO N. 22'),('GARROTE'),('LANCETA PICADORA'),
  ('SERINGA 1ML (INSULINA) C/ AGULHA'),('CANULA DE GUEDEL N. 4'),
  ('FILTRO ELETROSTATICO ADULTO'),('FIO GUIA PARA INTUBACAO'),
  ('MASCARA DE NEBULIZACAO ADULTO (KIT AEROSOL)'),('UMIDIFICADOR PARA OXIGENIO'),
  ('AGULHA DESCARTAVEL 40X12')
) as v(nome)
 where not exists (select 1 from substancias s where s.nome = v.nome);

-- 4.3 O saldo subiu, e a origem ficou como inventário?
select s.nome, s.unidade, l.origem, l.fonte, sum(l.quantidade_entrada) as entradas
  from vw_lotes l
  join substancias s on s.id = l.substancia_id
 where coalesce(l.is_dado_teste,false) = false
   and l.numero_lote in ('0012442','0024005','0022795','0020159','0002038',
                         '0016822','0020978','0019794','0010589','0000321',
                         '0019764','0000264','0012523','0022502','0005249',
                         '0010729','0018180','0000761')
 group by s.nome, s.unidade, l.origem, l.fonte
 order by s.nome;

-- 4.4 O carrinho ficou com 17 itens, e nenhum com saldo menor que a quantidade
--     padrão (item no carrinho que o estoque não cobre não vai poder ser
--     reposto depois de usado).
select ci.nome, ci.qtd_padrao, ci.validade,
       coalesce((select sum(sl.saldo) from vw_saldo_lote sl
                  join substancias s2 on s2.id = sl.substancia_id
                 where s2.nome = ci.nome), 0) as saldo_atual
  from carrinho_itens ci
 where coalesce(ci.is_dado_teste,false) = false
 order by ci.nome;


-- ============================================================================
-- OBSERVAÇÕES PARA O RESPONSÁVEL TÉCNICO
--
-- 1. SÓ MATERIAL — ISSO SIMPLIFICA O PROBLEMA DA NOTA.
--    A Portaria 344/98 e o Livro de Registro Específico alcançam medicamento
--    sujeito a controle especial, não material. Com 18 correlatos e nenhum
--    medicamento, a falta da nota não cria pendência de escrituração de
--    controlado — cria uma lacuna de rastreabilidade de origem, que o campo
--    observacao deste lançamento registra. O item 05 da notificação continua
--    valendo para a próxima compra de medicamento, não para este inventário.
--
-- 2. A PROCEDÊNCIA FICA REGISTRADA, NÃO MAQUIADA.
--    Guarde a planilha da diretoria junto ao POP de inventário: ela é o
--    documento de suporte deste lançamento. Se a fiscal perguntar da origem
--    destes lotes, a resposta é "estoque pré-existente inventariado em
--    12/10/2026, planilha anexa, sem nota localizada" — que é verdade e é
--    defensável. Diferente de uma nota provisória que nunca chega.
--
-- 3. A VÁLVULA REGULADORA DE OXIGÊNIO CONTINUA FALTANDO.
--    Há umidificador, micronebulizador e cateter de óculos — mas sem a válvula
--    (R$ 222,32) nada disso oferta oxigênio. A gaveta verde do carrinho segue
--    travada nesse item.
--
-- 4. TEM LANCETA, NÃO TEM FITA DE GLICEMIA.
--    100 lancetas e nenhuma fita (R$ 18,93 por 50). Dá para furar o dedo e não
--    dá para medir a glicemia. Com hipoglicemia de abstinência alcoólica nesse
--    perfil, é medição perdida.
--
-- 5. QUATRO ITENS DE VIA AÉREA EM UNIDADE ÚNICA.
--    Guedel n. 4, filtro eletrostático, fio guia e umidificador: 1 de cada,
--    todos no carrinho, farmácia com zero de reserva. E o Guedel só na
--    numeração 4.
--
-- 6. 3 MÁSCARAS PFF-2 PARA 35 LEITOS.
--    É o EPI de tuberculose, o risco respiratório real desse perfil. Duas no
--    carrinho, uma na farmácia.
--
-- 7. A TELA DO CARRINHO NÃO TEM GAVETA. carrinho_itens guarda nome, quantidade
--    padrão e validade, e a tela ordena alfabeticamente. Os comentários do
--    item 3 marcam a gaveta de cada um, mas o sistema não mostra.
-- ============================================================================
