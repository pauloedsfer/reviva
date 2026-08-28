-- ============================================================
-- PERFIL DE ACESSO SOMENTE LEITURA
-- Hospital Reviva
--
-- Objetivo: dar ao setor administrativo um login que ENXERGA
-- tudo e IMPRIME qualquer relatório, mas não consegue alterar
-- nada — nem pela tela, nem por chamada direta à API.
--
-- A regra fica no BANCO, não no navegador. Esconder botão no
-- JavaScript não é proteção: qualquer pessoa com o login e o
-- console do navegador contornaria em segundos. Aqui o banco
-- recusa a escrita mesmo que o pedido chegue por fora do app.
--
-- Hoje todas as tabelas têm uma única política:
--     p_auth_all ... for all to authenticated using (true)
-- ou seja, QUALQUER usuário logado altera tudo. Este script
-- substitui isso por leitura para todos e escrita só para o RT.
-- ============================================================


-- ------------------------------------------------------------
-- 1. TABELA DE PERFIS
-- Fica separada de `usuarios` de propósito: `usuarios` recebe
-- upsert do próprio app a cada login, e o perfil NÃO pode ser
-- gravável pelo app. Sem política de escrita aqui, ninguém
-- muda o próprio perfil pela aplicação — só você, pelo SQL
-- Editor do Supabase.
-- ------------------------------------------------------------
create table if not exists perfis_acesso (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  perfil     text not null check (perfil in ('rt', 'leitura')),
  nome       text,
  criado_em  timestamptz not null default now()
);

alter table perfis_acesso enable row level security;

-- todos os logados podem LER a tabela de perfis (o app precisa
-- saber em que modo entrar). Nenhuma política de escrita: o app
-- não grava aqui, em nenhuma hipótese.
-- A política de leitura desta tabela usa is_rt(), criada no bloco 2.
-- Por isso ela é definida logo depois das funções, no bloco 2c —
-- criar aqui daria "function is_rt() does not exist".


-- ------------------------------------------------------------
-- 2. FUNÇÃO is_rt()
-- security definer para ler perfis_acesso sem depender de RLS,
-- e search_path fixo para não ser desviada por outro schema.
-- Quem não tem perfil cadastrado NÃO é RT — o padrão é o
-- acesso mais restrito, nunca o mais permissivo.
-- ------------------------------------------------------------
create or replace function is_rt() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(
    (select perfil = 'rt' from perfis_acesso where usuario_id = auth.uid()),
    false
  );
$$;

revoke all on function is_rt() from public;
grant execute on function is_rt() to authenticated;


-- ------------------------------------------------------------
-- 2b. FUNÇÃO tem_acesso()
-- Estar logado NÃO basta para ler.
--
-- A chave `anon` fica visível em assets/config.js — é público por
-- natureza. Se o projeto estiver com auto-cadastro ligado (padrão
-- do Supabase), qualquer pessoa cria a própria conta pelo console
-- do navegador. Se a leitura dependesse só de estar autenticado,
-- essa conta leria prontuário e escrituração inteiros.
--
-- Com esta função, ler exige estar em perfis_acesso — e só você
-- coloca alguém ali, pelo SQL Editor. Uma conta criada por fora
-- entra e não enxerga nada.
-- ------------------------------------------------------------
create or replace function tem_acesso() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from perfis_acesso where usuario_id = auth.uid());
$$;

revoke all on function tem_acesso() from public;
grant execute on function tem_acesso() to authenticated;


-- ------------------------------------------------------------
-- 2c. POLÍTICA DA TABELA DE PERFIS
-- Só agora, com is_rt() já existindo. Cada um enxerga o próprio
-- perfil; o RT enxerga todos. Sem política de escrita: o perfil
-- não é alterável pela aplicação, apenas por você no SQL Editor.
--
-- Não há recursão infinita aqui: is_rt() é SECURITY DEFINER e roda
-- como dona da tabela, que é isenta de RLS.
-- ------------------------------------------------------------
drop policy if exists p_perfis_read on perfis_acesso;
create policy p_perfis_read on perfis_acesso
  for select to authenticated using (usuario_id = auth.uid() or is_rt());


-- ------------------------------------------------------------
-- 3. CADASTRE OS PERFIS  <<< EDITE ESTA PARTE >>>
--
-- Primeiro crie os logins em Authentication > Users no painel
-- do Supabase. Depois rode os inserts abaixo com os e-mails.
--
-- ATENÇÃO: rode o seu próprio perfil de RT ANTES do bloco 4.
-- Se aplicar as políticas sem ter perfil 'rt', você perde a
-- escrita e vai precisar voltar aqui pelo SQL Editor.
-- ------------------------------------------------------------
insert into perfis_acesso (usuario_id, perfil, nome)
select id, 'rt', 'Paulo Edson Fernandes — RT'
from auth.users
where email = 'COLOQUE_SEU_EMAIL_AQUI'
on conflict (usuario_id) do update set perfil = 'rt';

-- administrativo (repita a linha para cada pessoa)
-- insert into perfis_acesso (usuario_id, perfil, nome)
-- select id, 'leitura', 'Administrativo'
-- from auth.users
-- where email = 'administrativo@hospitalreviva.com.br'
-- on conflict (usuario_id) do update set perfil = 'leitura';

-- confira antes de seguir: você PRECISA aparecer como 'rt'
select u.email, p.perfil, p.nome
from perfis_acesso p join auth.users u on u.id = p.usuario_id
order by p.perfil, u.email;


-- ------------------------------------------------------------
-- 4. TROCA DAS POLÍTICAS EM TODAS AS TABELAS
-- Leitura para qualquer logado; escrita só para o RT.
-- ------------------------------------------------------------
do $$
declare t record;
begin
  for t in
    select c.relname
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
      and c.relname not in ('perfis_acesso')
  loop
    execute format('alter table public.%I enable row level security', t.relname);

    -- remove a política antiga que dava tudo a todos
    execute format('drop policy if exists p_auth_all on public.%I', t.relname);

    execute format('drop policy if exists p_read on public.%I', t.relname);
    execute format('drop policy if exists p_ins  on public.%I', t.relname);
    execute format('drop policy if exists p_upd  on public.%I', t.relname);
    execute format('drop policy if exists p_del  on public.%I', t.relname);

    execute format(
      'create policy p_read on public.%I for select to authenticated using (tem_acesso())', t.relname);
    execute format(
      'create policy p_ins on public.%I for insert to authenticated with check (is_rt())', t.relname);
    execute format(
      'create policy p_upd on public.%I for update to authenticated using (is_rt()) with check (is_rt())', t.relname);
    execute format(
      'create policy p_del on public.%I for delete to authenticated using (is_rt())', t.relname);
  end loop;
end $$;


-- ------------------------------------------------------------
-- 5. EXCEÇÃO: a tabela `usuarios`
-- O app faz upsert da própria linha a cada login (para registrar
-- quem lançou o quê). Sem isso, o login de leitura acusaria erro.
-- Cada um só mexe na PRÓPRIA linha — e o perfil não mora aqui.
-- ------------------------------------------------------------
drop policy if exists p_ins on usuarios;
drop policy if exists p_upd on usuarios;

create policy p_ins on usuarios
  for insert to authenticated with check (id = auth.uid() or is_rt());
create policy p_upd on usuarios
  for update to authenticated using (id = auth.uid() or is_rt())
                                with check (id = auth.uid() or is_rt());


-- ------------------------------------------------------------
-- 6. FUNÇÃO DE LIMPEZA DE TESTE — bloquear para leitura
-- É SECURITY DEFINER e apaga dados: precisa de guarda própria,
-- porque roda com privilégios elevados e ignora a RLS.
-- ------------------------------------------------------------
-- Descobre a assinatura real da função (ela pode ter argumentos) para
-- não quebrar com "function does not exist".
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as assinatura
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'limpar_dados_teste'
  loop
    execute format('revoke all on function %s from public', f.assinatura);
    execute format('grant execute on function %s to authenticated', f.assinatura);
    raise notice 'Função encontrada: %  — falta adicionar a guarda is_rt() no corpo dela.', f.assinatura;
  end loop;
end $$;
-- Adicione como PRIMEIRA linha do corpo de limpar_dados_teste():
--     if not is_rt() then raise exception 'Sem permissão'; end if;


-- ------------------------------------------------------------
-- 7. CONFERÊNCIA
-- ------------------------------------------------------------
select c.relname as tabela,
       count(*) filter (where p.polcmd = 'r') as pol_select,
       count(*) filter (where p.polcmd = 'a') as pol_insert,
       count(*) filter (where p.polcmd = 'w') as pol_update,
       count(*) filter (where p.polcmd = 'd') as pol_delete,
       bool_or(p.polname = 'p_auth_all')      as ainda_tem_politica_antiga
from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  left join pg_policy p on p.polrelid = c.oid
where n.nspname = 'public' and c.relkind = 'r'
group by c.relname
order by ainda_tem_politica_antiga desc nulls last, c.relname;

-- TESTE REAL (o único que vale): entre com o login do
-- administrativo, abra o console do navegador (F12) e rode:
--     await SB.from('pacientes').insert({nome_completo:'teste'})
-- Deve retornar erro de row-level security. Se gravar, PARE:
-- alguma tabela ficou sem política.
