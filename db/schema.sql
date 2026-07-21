-- ============================================================================
-- Hospital Reviva — Sistema de Escrituração e Estoque
-- schema.sql  |  Supabase / PostgreSQL
-- ----------------------------------------------------------------------------
-- Modelo (validado com o RT):
--   * RAZÃO DERIVADO (por ora): grava-se apenas os EVENTOS ATÔMICOS
--     (inventário inicial, itens de NF, itens de doação, custódia,
--     dispensações, devoluções). As movimentações e os lotes são VIEWS
--     derivadas desses eventos — nunca saldo digitado à mão.
--     -> Upgrade futuro p/ razão gravado/imutável = materializar vw_movimentacoes.
--   * RT e ESTABELECIMENTO são DADOS (tabelas), nunca hardcode.
--   * Multiusuário previsto desde o início: tabela `usuarios` + coluna
--     `usuario_id` nas tabelas operacionais + RLS ligada. Ativar perfis
--     depois = trocar policy, não schema.
--   * LGPD desde o desenho: RLS em tudo, PII isolada em `pacientes`,
--     carimbo (usuario_id, created_at) como trilha mínima.
--   * `is_dado_teste` marca a massa fictícia p/ limpeza em 1 comando.
-- ============================================================================

-- Executar em projeto novo. Ordem: DROP (idempotente) -> tipos -> tabelas ->
-- views -> RLS -> policies -> função de limpeza.

-- ---------------------------------------------------------------------------
-- 0. Limpeza idempotente (permite re-rodar o script durante o desenvolvimento)
-- ---------------------------------------------------------------------------
drop view   if exists vw_saldo_substancia    cascade;
drop view   if exists vw_lote_origem          cascade;
drop view   if exists vw_saldo_lote          cascade;
drop view   if exists vw_movimentacoes       cascade;
drop view   if exists vw_lotes               cascade;

drop table  if exists carrinho_historico     cascade;
drop table  if exists carrinho_itens         cascade;
drop table  if exists carrinho_emergencia    cascade;
drop table  if exists pops                   cascade;
drop table  if exists devolucoes             cascade;
drop table  if exists dispensacoes           cascade;
drop table  if exists prescricoes            cascade;
drop table  if exists inventario_inicial     cascade;
drop table  if exists medicacao_propria_itens cascade;
drop table  if exists medicacao_propria      cascade;
drop table  if exists doacao_itens           cascade;
drop table  if exists doacoes                cascade;
drop table  if exists nota_fiscal_itens      cascade;
drop table  if exists notas_fiscais          cascade;
drop table  if exists fornecedores           cascade;
drop table  if exists pacientes              cascade;
drop table  if exists prescritores           cascade;
drop table  if exists substancias            cascade;
drop table  if exists usuarios               cascade;
drop table  if exists responsavel_tecnico    cascade;
drop table  if exists estabelecimento        cascade;

drop function if exists limpar_dados_teste() cascade;

-- ---------------------------------------------------------------------------
-- 1. CONFIGURAÇÃO / SISTEMA  (o RT e o estabelecimento como DADO)
-- ---------------------------------------------------------------------------

-- Dados do estabelecimento — cabeçalho dos relatórios impressos.
create table estabelecimento (
  id                    uuid primary key default gen_random_uuid(),
  razao_social          text not null,
  nome_fantasia         text,
  cnpj                  text,
  endereco              text,
  municipio_uf          text,
  autorizacao_sanitaria text,          -- alvará / licença sanitária
  afe_anvisa            text,          -- se aplicável
  licenca_numero        text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Responsável Técnico — DADO editável pela tela de configurações (item 3).
-- Várias linhas ao longo do tempo: a `ativo` alimenta rodapés/assinaturas
-- atuais; as antigas mantêm o RT correto de relatórios de meses passados.
create table responsavel_tecnico (
  id                     uuid primary key default gen_random_uuid(),
  nome                   text not null,
  conselho               text not null default 'CRF',   -- ex.: CRF
  uf                     text not null,                 -- ex.: GO
  numero_registro        text not null,                 -- ex.: 9303
  autorizacao_mapa       text,                          -- se aplicável ao serviço
  identificacao_assinatura text,                        -- linha p/ carimbo/assinatura
  ativo                  boolean not null default true,
  vigencia_inicio        date,
  vigencia_fim           date,
  created_at             timestamptz not null default now()
);
-- Garante no máximo UM RT ativo por vez.
create unique index uq_rt_ativo on responsavel_tecnico (ativo) where ativo;

-- Usuários — HOJE só existe uma linha (o RT). É o gancho do multiusuário:
-- `id` deve casar com o auth.uid() do Supabase Auth do respectivo login.
create table usuarios (
  id         uuid primary key,                          -- = auth.users.id
  nome       text not null,
  email      text unique,
  perfil     text not null default 'farmacia'
             check (perfil in ('farmacia','enfermagem','administracao')),
  ativo      boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2. CADASTROS
-- ---------------------------------------------------------------------------

create table substancias (
  id             uuid primary key default gen_random_uuid(),
  nome           text not null,
  principio_ativo text,
  concentracao   text,
  forma          text,
  lista          text not null default '—',   -- Portaria 344/98: A1,A2,A3,B1,B2,C1... ou '—'
  unidade        text not null default 'comp.',
  ativo          boolean not null default true,
  is_dado_teste  boolean not null default false,
  created_at     timestamptz not null default now()
);

create table prescritores (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  conselho      text not null default 'CRM',
  uf            text not null,
  numero        text not null,
  is_dado_teste boolean not null default false,
  created_at    timestamptz not null default now()
);

-- PII sensível concentrada aqui (LGPD).
create table pacientes (
  id             uuid primary key default gen_random_uuid(),
  nome_completo  text not null,
  cpf            text,
  data_nascimento date,
  prontuario     text,
  leito          text,
  endereco       text,
  telefone       text,
  data_admissao  date,
  data_alta      date,
  prescritor_id  uuid references prescritores(id),
  ativo          boolean not null default true,
  usuario_id     uuid references usuarios(id),   -- quem cadastrou (multiusuário)
  is_dado_teste  boolean not null default false,
  created_at     timestamptz not null default now()
);

create table fornecedores (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  cnpj          text,
  tipo          text check (tipo in ('drogaria','distribuidora')),
  endereco      text,
  is_dado_teste boolean not null default false,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3. DOCUMENTOS DE ENTRADA (agrupadores — cada item gera um lote/entrada)
-- ---------------------------------------------------------------------------

create table notas_fiscais (
  id            uuid primary key default gen_random_uuid(),
  numero        text not null,
  serie         text,
  data_emissao  date not null,
  fornecedor_id uuid references fornecedores(id),
  canal         text check (canal in ('drogaria','distribuidora')),
  valor_total   numeric(12,2),
  usuario_id    uuid references usuarios(id),
  is_dado_teste boolean not null default false,
  created_at    timestamptz not null default now()
);

create table nota_fiscal_itens (
  id             uuid primary key default gen_random_uuid(),
  nota_fiscal_id uuid not null references notas_fiscais(id) on delete cascade,
  substancia_id  uuid not null references substancias(id),
  quantidade     integer not null check (quantidade > 0),
  numero_lote    text not null,
  validade       date,
  custo_unit     numeric(12,4) not null default 0,
  is_dado_teste  boolean not null default false,
  created_at     timestamptz not null default now()
);

create table doacoes (
  id            uuid primary key default gen_random_uuid(),
  data          date not null,
  doador        text not null,
  documento_ref text,
  usuario_id    uuid references usuarios(id),
  is_dado_teste boolean not null default false,
  created_at    timestamptz not null default now()
);

create table doacao_itens (
  id             uuid primary key default gen_random_uuid(),
  doacao_id      uuid not null references doacoes(id) on delete cascade,
  substancia_id  uuid not null references substancias(id),
  quantidade     integer not null check (quantidade > 0),
  numero_lote    text not null,
  validade       date,
  valor_estimado numeric(12,4) not null default 0,
  is_dado_teste  boolean not null default false,
  created_at     timestamptz not null default now()
);

-- Custódia — medicação trazida pelo paciente/família. Restrita a ele, sem custo.
create table medicacao_propria (
  id            uuid primary key default gen_random_uuid(),
  data          date not null,
  paciente_id   uuid not null references pacientes(id),
  obs           text,
  usuario_id    uuid references usuarios(id),
  is_dado_teste boolean not null default false,
  created_at    timestamptz not null default now()
);

create table medicacao_propria_itens (
  id                   uuid primary key default gen_random_uuid(),
  medicacao_propria_id uuid not null references medicacao_propria(id) on delete cascade,
  substancia_id        uuid not null references substancias(id),
  quantidade           integer not null check (quantidade > 0),
  numero_lote          text not null,
  validade             date,
  obs                  text,
  is_dado_teste        boolean not null default false,
  created_at           timestamptz not null default now()
);

-- Inventário inicial (decisão 2) — abertura do estoque físico no go-live.
-- Entra como "entrada / inventário" na vw_movimentacoes.
create table inventario_inicial (
  id            uuid primary key default gen_random_uuid(),
  substancia_id uuid not null references substancias(id),
  numero_lote   text not null,
  validade      date,
  quantidade    integer not null check (quantidade >= 0),
  custo_unit    numeric(12,4) not null default 0,
  data          date not null,
  observacao    text,
  usuario_id    uuid references usuarios(id),
  is_dado_teste boolean not null default false,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 4. PRESCRIÇÕES E SAÍDAS
-- ---------------------------------------------------------------------------

create table prescricoes (
  id            uuid primary key default gen_random_uuid(),
  paciente_id   uuid not null references pacientes(id),
  substancia_id uuid not null references substancias(id),
  prescritor_id uuid references prescritores(id),
  dose          text,
  via           text,
  horarios      jsonb not null default '[]'::jsonb,   -- ex.: ["08h","22h"] ou ["SOS"]
  ativo         boolean not null default true,
  data_inicio   date,
  data_fim      date,
  usuario_id    uuid references usuarios(id),
  is_dado_teste boolean not null default false,
  created_at    timestamptz not null default now()
);

create table dispensacoes (
  id            uuid primary key default gen_random_uuid(),
  data          date not null,
  substancia_id uuid not null references substancias(id),
  numero_lote   text not null,
  quantidade    integer not null check (quantidade > 0),
  referencia    text,                                  -- ex.: "Dose 22h"
  paciente_id   uuid references pacientes(id),
  prescricao_id uuid references prescricoes(id),
  usuario_id    uuid references usuarios(id),
  is_dado_teste boolean not null default false,
  created_at    timestamptz not null default now()
);

create table devolucoes (
  id            uuid primary key default gen_random_uuid(),
  data          date not null,
  substancia_id uuid not null references substancias(id),
  numero_lote   text not null,
  quantidade    integer not null check (quantidade > 0),
  motivo        text,
  paciente_id   uuid references pacientes(id),
  usuario_id    uuid references usuarios(id),
  is_dado_teste boolean not null default false,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 5. OPERACIONAL — carrinho de emergência e POPs
-- ---------------------------------------------------------------------------

create table carrinho_emergencia (
  id                  uuid primary key default gen_random_uuid(),
  lacre_atual         text,
  status              text default 'intacto',
  ultima_conferencia  date,
  responsavel_id      uuid references usuarios(id),
  is_dado_teste       boolean not null default false,
  created_at          timestamptz not null default now()
);

create table carrinho_itens (
  id          uuid primary key default gen_random_uuid(),
  carrinho_id uuid not null references carrinho_emergencia(id) on delete cascade,
  nome        text not null,
  qtd_padrao  integer not null default 0,
  validade    date,
  is_dado_teste boolean not null default false
);

create table carrinho_historico (
  id             uuid primary key default gen_random_uuid(),
  carrinho_id    uuid not null references carrinho_emergencia(id) on delete cascade,
  data           date not null,
  evento         text not null,
  responsavel_id uuid references usuarios(id),
  is_dado_teste  boolean not null default false,
  created_at     timestamptz not null default now()
);

create table pops (
  id            uuid primary key default gen_random_uuid(),
  area          text,
  titulo        text not null,
  status        text not null default 'pendente'
                check (status in ('pendente','em_elaboracao','vigente')),
  arquivo_url   text,
  is_dado_teste boolean not null default false,
  created_at    timestamptz not null default now()
);

-- ===========================================================================
-- 6. VIEWS DERIVADAS  (decisão 1 — razão derivado dos eventos atômicos)
-- ===========================================================================

-- security_invoker: a view respeita a RLS das tabelas-base do usuário logado.

-- 6.1 LOTES — união de todas as origens de entrada de estoque.
create view vw_lotes
with (security_invoker = on) as
  select i.substancia_id, i.numero_lote, i.validade,
         i.quantidade                             as quantidade_entrada,
         i.custo_unit,
         0::numeric                               as valor_estimado,
         'inventario'::text                       as origem,
         null::uuid                               as restrito_paciente_id,
         'Inventário inicial'::text               as fonte,
         i.data                                   as data,
         i.is_dado_teste
    from inventario_inicial i
  union all
  select it.substancia_id, it.numero_lote, it.validade,
         it.quantidade, it.custo_unit, 0::numeric,
         'compra',
         null::uuid,
         'NF ' || nf.numero || ' — ' || coalesce(f.nome,'') ,
         nf.data_emissao,
         it.is_dado_teste
    from nota_fiscal_itens it
    join notas_fiscais nf on nf.id = it.nota_fiscal_id
    left join fornecedores f on f.id = nf.fornecedor_id
  union all
  select di.substancia_id, di.numero_lote, di.validade,
         di.quantidade, 0::numeric, di.valor_estimado,
         'doacao',
         null::uuid,
         'Doação — ' || d.doador,
         d.data,
         di.is_dado_teste
    from doacao_itens di
    join doacoes d on d.id = di.doacao_id
  union all
  select mi.substancia_id, mi.numero_lote, mi.validade,
         mi.quantidade, 0::numeric, 0::numeric,
         'proprio',
         mp.paciente_id,
         'Medicação própria — custódia',
         mp.data,
         mi.is_dado_teste
    from medicacao_propria_itens mi
    join medicacao_propria mp on mp.id = mi.medicacao_propria_id;

-- 6.2 MOVIMENTAÇÕES — o "Livro de Registro" derivado. Folio = ordem cronológica.
create view vw_movimentacoes
with (security_invoker = on) as
  with mov as (
    -- ENTRADAS (todas as origens de lote)
    select l.data          as data_movimento,
           'entrada'::text  as tipo,
           l.substancia_id,
           l.numero_lote,
           l.quantidade_entrada as quantidade,
           l.restrito_paciente_id as paciente_id,
           l.fonte          as referencia,
           l.custo_unit,
           l.origem,
           l.is_dado_teste,
           l.data           as ord
      from vw_lotes l
    union all
    -- SAÍDAS (dispensações)
    select d.data, 'saida', d.substancia_id, d.numero_lote, d.quantidade,
           d.paciente_id, coalesce(d.referencia,'Dispensação'),
           coalesce((select custo_unit from vw_lotes v
                      where v.numero_lote = d.numero_lote limit 1),0),
           null, d.is_dado_teste, d.data
      from dispensacoes d
    union all
    -- DEVOLUÇÕES (reintegração ao estoque)
    select r.data, 'devolucao', r.substancia_id, r.numero_lote, r.quantidade,
           r.paciente_id, 'Devolução — ' || coalesce(r.motivo,''),
           coalesce((select custo_unit from vw_lotes v
                      where v.numero_lote = r.numero_lote limit 1),0),
           null, r.is_dado_teste, r.data
      from devolucoes r
  )
  select
    'M' || lpad((row_number() over (order by data_movimento, tipo))::text, 4, '0') as folio,
    data_movimento, tipo, substancia_id, numero_lote, quantidade,
    paciente_id, referencia, custo_unit, origem, is_dado_teste
  from mov;

-- 6.3 SALDO POR LOTE (agrupa por lote + substância)
create view vw_saldo_lote
with (security_invoker = on) as
  select substancia_id, numero_lote,
         sum(case when tipo = 'saida' then -quantidade else quantidade end) as saldo
    from vw_movimentacoes
   group by substancia_id, numero_lote;

-- Origem de cada lote (p/ separar custódia do estoque geral).
create view vw_lote_origem
with (security_invoker = on) as
  select distinct substancia_id, numero_lote, origem, restrito_paciente_id
    from vw_lotes;

-- 6.4 SALDO POR SUBSTÂNCIA — soma o saldo dos lotes NÃO-custódia.
-- Exclui o lote 'proprio' por inteiro (entrada E saída), como no protótipo:
-- a medicação de custódia é restrita ao paciente e não integra o estoque geral.
create view vw_saldo_substancia
with (security_invoker = on) as
  select sl.substancia_id, sum(sl.saldo) as saldo
    from vw_saldo_lote sl
    join vw_lote_origem lo
      on lo.numero_lote = sl.numero_lote
     and lo.substancia_id = sl.substancia_id
   where lo.origem is distinct from 'proprio'
   group by sl.substancia_id;

-- ===========================================================================
-- 7. RLS  (LGPD + gancho de multiusuário)
--    Fase atual: qualquer usuário AUTENTICADO acessa tudo (login único).
--    Fase multiperfil: trocar as policies por regras baseadas em usuarios.perfil.
-- ===========================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'estabelecimento','responsavel_tecnico','usuarios','substancias',
    'prescritores','pacientes','fornecedores','notas_fiscais',
    'nota_fiscal_itens','doacoes','doacao_itens','medicacao_propria',
    'medicacao_propria_itens','inventario_inicial','prescricoes',
    'dispensacoes','devolucoes','carrinho_emergencia','carrinho_itens',
    'carrinho_historico','pops'
  ]
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists p_auth_all on %I;', t);
    -- Login único por ora: autenticado pode ler e escrever.
    execute format($f$
      create policy p_auth_all on %I
        for all to authenticated
        using (true) with check (true);
    $f$, t);
  end loop;
end $$;

-- ===========================================================================
-- 8. FUNÇÃO DE LIMPEZA DA MASSA DE TESTE (item 4)
--    Apaga tudo marcado is_dado_teste, na ordem segura de FKs.
-- ===========================================================================
create function limpar_dados_teste()
returns text
language plpgsql
security definer
as $$
declare total int := 0; n int;
begin
  delete from carrinho_historico       where is_dado_teste; get diagnostics n = row_count; total := total + n;
  delete from carrinho_itens           where is_dado_teste; get diagnostics n = row_count; total := total + n;
  delete from carrinho_emergencia      where is_dado_teste; get diagnostics n = row_count; total := total + n;
  delete from devolucoes               where is_dado_teste; get diagnostics n = row_count; total := total + n;
  delete from dispensacoes             where is_dado_teste; get diagnostics n = row_count; total := total + n;
  delete from prescricoes              where is_dado_teste; get diagnostics n = row_count; total := total + n;
  delete from inventario_inicial       where is_dado_teste; get diagnostics n = row_count; total := total + n;
  delete from medicacao_propria_itens  where is_dado_teste; get diagnostics n = row_count; total := total + n;
  delete from medicacao_propria        where is_dado_teste; get diagnostics n = row_count; total := total + n;
  delete from doacao_itens             where is_dado_teste; get diagnostics n = row_count; total := total + n;
  delete from doacoes                  where is_dado_teste; get diagnostics n = row_count; total := total + n;
  delete from nota_fiscal_itens        where is_dado_teste; get diagnostics n = row_count; total := total + n;
  delete from notas_fiscais            where is_dado_teste; get diagnostics n = row_count; total := total + n;
  delete from pacientes                where is_dado_teste; get diagnostics n = row_count; total := total + n;
  delete from fornecedores             where is_dado_teste; get diagnostics n = row_count; total := total + n;
  delete from prescritores             where is_dado_teste; get diagnostics n = row_count; total := total + n;
  delete from substancias              where is_dado_teste; get diagnostics n = row_count; total := total + n;
  delete from pops                     where is_dado_teste; get diagnostics n = row_count; total := total + n;
  return total || ' registros de teste removidos.';
end $$;

-- Consulta de apoio: existe massa de teste? (a UI usa p/ exibir o banner)
--   select count(*) > 0 as tem_teste from (
--     select 1 from pacientes where is_dado_teste
--     union all select 1 from substancias where is_dado_teste
--     union all select 1 from notas_fiscais where is_dado_teste limit 1
--   ) x;

-- Fim do schema.
