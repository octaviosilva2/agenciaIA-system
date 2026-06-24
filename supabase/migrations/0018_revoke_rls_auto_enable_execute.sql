-- Migration 0018: hardening de segurança (advisor 0028/0029).
-- rls_auto_enable() é uma event trigger function SECURITY DEFINER (auto-habilita RLS
-- em tabelas novas). Não é chamável via RPC, mas revogamos EXECUTE de PUBLIC/anon/
-- authenticated por boa prática — o event trigger segue rodando como owner.
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM authenticated;
