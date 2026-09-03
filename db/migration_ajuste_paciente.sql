-- ============================================================================
-- Hospital Reviva — migration_ajuste_paciente.sql
-- O ajuste de inventário passa a registrar A QUEM pertence o saldo ajustado.
--
-- Motivo: o mesmo número de lote pode existir no estoque da clínica e na
-- custódia de um ou mais pacientes. Sem o paciente, não havia como saber
-- de qual saldo o ajuste saiu, e ele acabava aplicado no lugar errado.
--
-- Ajustes antigos ficam com paciente nulo — nesses casos o sistema resolve
-- pelo lote quando existe um único saldo, e pelo estoque da clínica quando há
-- mais de um.
--
-- Rodar UMA VEZ. Aditivo e não-destrutivo.
-- ============================================================================

alter table ajustes_estoque
  add column if not exists paciente_id uuid references pacientes(id);

comment on column ajustes_estoque.paciente_id is
  'Dono do saldo ajustado: paciente (custódia) ou nulo (estoque da clínica).';

create index if not exists ix_ajustes_paciente on ajustes_estoque(paciente_id);

-- ============================================================================
-- CONFERÊNCIA
-- ============================================================================
select count(*) filter (where paciente_id is null)     as sem_paciente_antigos,
       count(*) filter (where paciente_id is not null) as com_paciente,
       count(*)                                        as total
from ajustes_estoque;
