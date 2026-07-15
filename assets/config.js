/* ============================================================
   config.js — Hospital Reviva
   >>> ÚNICO ARQUIVO QUE VOCÊ PRECISA EDITAR PARA CONECTAR AO BANCO <<<

   Cole abaixo os DOIS valores do seu projeto Supabase.
   Onde encontrar (no painel do Supabase):
     Settings (engrenagem)  ->  Data API  (ou "API")
       • Project URL      -> cole em SUPABASE_URL
       • anon public key  -> cole em SUPABASE_ANON_KEY

   A chave "anon" é segura para ficar aqui: o acesso aos dados é
   protegido pela RLS do banco (ninguém deslogado lê nada de paciente).
   NUNCA cole aqui a chave "service_role".
   ============================================================ */

window.SUPABASE_URL      = "https://lgnwybsyzfynrlgbuqvn.supabase.co";      // ex.: https://abcdefgh.supabase.co
window.SUPABASE_ANON_KEY = "sb_publishable_esLanHXRMa44yqWLNj0bUA_2BoSbwpJ";  // uma string longa começando por "eyJ..."
