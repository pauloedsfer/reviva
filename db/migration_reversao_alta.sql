-- ============================================================================
-- Hospital Reviva — migration_reversao_alta.sql
--
-- REVERSÃO DE ALTA. Paciente que recebeu alta e voltou — por retorno rápido
-- ou porque a alta foi lançada por engano — precisa voltar a aparecer no mapa,
-- na dispensação e na separação, com suas prescrições.
--
-- Duas coisas precisam existir para isso ser feito sem estragar o histórico:
--
-- 1. SABER QUAIS PRESCRIÇÕES A ALTA ENCERROU. Hoje a alta desativa TODAS as
--    prescrições do paciente de uma vez, inclusive as que o prescritor já
--    tinha suspendido antes. Reativar tudo de volta ressuscitaria prescrição
--    suspensa — erro grave. A coluna `encerrada_por_alta` marca só as que
--    estavam ativas no momento da alta.
--
-- 2. REGISTRAR QUE HOUVE INTERRUPÇÃO. A ficha do paciente tem um só par
--    admissão/alta. Reverter apagando a data da alta faria a internação
--    parecer contínua, o que é falso. A tabela `paciente_eventos` guarda cada
--    alta e cada retorno, preservando a história real sem mexer na admissão
--    original (que é o que mantém os mapas e as dispensações antigas válidos).
--
-- Rodar UMA VEZ. Aditivo e não-destrutivo.
-- ============================================================================

alter table prescricoes add column if not exists encerrada_por_alta boolean not null default false;

comment on column prescricoes.encerrada_por_alta is
  'Marcada quando a alta do paciente desativou esta prescrição. Serve para a reversão da alta reativar apenas o que a alta encerrou, e não o que já estava suspenso.';

create table if not exists paciente_eventos (
  id            uuid primary key default gen_random_uuid(),
  paciente_id   uuid not null references pacientes(id) on delete cascade,
  data          date not null,
  tipo          text not null check (tipo in ('alta','retorno')),
  motivo        text,
  usuario_id    uuid references usuarios(id),
  is_dado_teste boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists ix_paciente_eventos_pac on paciente_eventos(paciente_id, data);

alter table paciente_eventos enable row level security;
drop policy if exists p_auth_all on paciente_eventos;
create policy p_auth_all on paciente_eventos
  for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Registro retroativo das altas já existentes
-- Cada paciente com data_alta ganha seu evento, para a linha do tempo não
-- começar vazia. Prescrições de paciente com alta são marcadas como
-- encerradas pela alta — é a melhor aproximação possível para o que já passou:
-- daqui em diante a marcação é feita no momento certo, só nas que estavam
-- ativas. Na reversão, a tela deixa você desmarcar o que não deve voltar.
-- ---------------------------------------------------------------------------
insert into paciente_eventos (paciente_id, data, tipo, motivo, is_dado_teste)
select p.id, p.data_alta, 'alta', 'registro retroativo da alta já lançada', p.is_dado_teste
  from pacientes p
 where p.data_alta is not null
   and not exists (select 1 from paciente_eventos e
                    where e.paciente_id = p.id and e.tipo = 'alta' and e.data = p.data_alta);

update prescricoes pr set encerrada_por_alta = true
  from pacientes p
 where p.id = pr.paciente_id
   and p.ativo = false
   and pr.ativo = false
   and pr.encerrada_por_alta = false;

-- ---------------------------------------------------------------------------
-- Limpeza de teste passa a incluir a nova tabela
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_proc where proname = 'limpar_dados_teste') then
    execute 'delete from paciente_eventos where is_dado_teste';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Conferência
-- ---------------------------------------------------------------------------
select p.nome_completo as paciente, p.data_admissao, p.data_alta, p.ativo,
       count(pr.id) filter (where pr.encerrada_por_alta) as presc_encerradas_pela_alta,
       count(pr.id) filter (where not pr.ativo and not pr.encerrada_por_alta) as presc_suspensas_antes
  from pacientes p
  left join prescricoes pr on pr.paciente_id = p.id
 where not p.is_dado_teste
 group by p.id, p.nome_completo, p.data_admissao, p.data_alta, p.ativo
 order by p.ativo desc, p.nome_completo;
