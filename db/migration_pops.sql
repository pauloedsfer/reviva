-- ============================================================================
-- Hospital Reviva — migration_pops.sql
-- Camada 1 da área de POPs: registro/checklist funcional.
-- Adiciona campos de CONTROLE (código, versão, vigência, próxima revisão,
-- responsável, observação) e cadastra os POPs do fluxo como PERMANENTES
-- (não mais dado de teste), para que não se percam em limpezas.
-- Rodar UMA VEZ no SQL Editor do Supabase. Aditivo e não-destrutivo.
-- ============================================================================

alter table pops add column if not exists codigo         text;
alter table pops add column if not exists versao         text;
alter table pops add column if not exists data_vigencia  date;
alter table pops add column if not exists proxima_revisao date;
alter table pops add column if not exists responsavel    text;
alter table pops add column if not exists observacao     text;
alter table pops add column if not exists ordem          integer not null default 0;

-- Semeia os POPs do fluxo de dispensação como PERMANENTES,
-- apenas se ainda não houver POPs permanentes cadastrados (evita duplicar).
do $$
begin
  if not exists (select 1 from pops where coalesce(is_dado_teste,false) = false) then
    insert into pops (area, titulo, status, ordem, is_dado_teste) values
      ('Farmácia',            'Admissão e Cadastro do Paciente',                         'pendente', 1,  false),
      ('Farmácia',            'Recebimento e Conferência de Notas Fiscais',              'pendente', 2,  false),
      ('Farmácia',            'Recebimento de Doações',                                  'pendente', 3,  false),
      ('Farmácia',            'Medicação Trazida pelo Paciente (Custódia)',              'pendente', 4,  false),
      ('Farmácia',            'Destino da Custódia na Alta (Devolução / Integração)',    'pendente', 5,  false),
      ('Farmácia',            'Preparo e Etiquetagem da Dose Unitária',                  'pendente', 6,  false),
      ('Enfermagem',          'Dupla Checagem e Administração de Medicamentos',          'pendente', 7,  false),
      ('Farmácia',            'Devolução e Reintegração de Medicação SOS ao Estoque',    'pendente', 8,  false),
      ('Farmácia',            'Ajuste e Contagem de Inventário',                         'pendente', 9,  false),
      ('Farmácia + Enfermagem','Controle do Carrinho de Emergência e Lacre',             'pendente', 10, false),
      ('Farmácia',            'Escrituração e Balanço Mensal de Controlados',            'pendente', 11, false),
      ('Farmácia',            'Cotação e Aquisição de Medicamentos',                     'pendente', 12, false),
      ('Farmácia',            'Backup e Continuidade do Sistema',                        'pendente', 13, false);
  end if;
end $$;

-- Fim da migração.
