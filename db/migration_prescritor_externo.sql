-- ============================================================================
-- Hospital Reviva — migration_prescritor_externo.sql
-- Marca o VÍNCULO do prescritor: interno (da clínica) ou externo (de fora).
-- Permite registrar corretamente prescrições que o paciente traz de médicos
-- externos, mantendo o nome/CRM real do prescritor.
-- Rodar UMA VEZ no SQL Editor do Supabase. Aditivo e não-destrutivo.
-- ============================================================================

alter table prescritores
  add column if not exists externo boolean not null default false;

-- Prescritores já cadastrados continuam como internos (externo = false).
-- Fim da migração.
