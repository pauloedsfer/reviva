-- ============================================================================
-- Hospital Reviva — migration_pops_corpo.sql
-- Camada 2 da área de POPs: corpo estruturado do documento.
-- Adiciona uma coluna JSONB "corpo" com as seções do POP no padrão consagrado
-- (objetivo, aplicação, responsabilidades, materiais, procedimento passo a
-- passo, registros, referências). A impressão gera o documento formatado.
-- Rodar UMA VEZ no SQL Editor do Supabase. Aditivo e não-destrutivo.
-- ============================================================================

alter table pops add column if not exists corpo jsonb;

-- Estrutura esperada de "corpo" (todas as chaves opcionais):
-- {
--   "objetivo": "texto",
--   "aplicacao": "texto",
--   "responsabilidades": ["item", "item"],
--   "materiais": ["item", "item"],
--   "procedimento": ["passo 1", "passo 2"],
--   "registros": ["registro gerado"],
--   "referencias": ["norma"]
-- }

-- Fim da migração.
