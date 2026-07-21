-- migration_qtd_dose.sql — quantidade explícita por horário na prescrição (padrão 1)
alter table prescricoes add column if not exists qtd_por_horario numeric not null default 1 check (qtd_por_horario > 0);
