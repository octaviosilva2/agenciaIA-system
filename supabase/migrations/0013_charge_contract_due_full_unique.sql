-- Migration 0013: corrige o índice único de idempotência das recorrências.
-- O índice era parcial (WHERE contract_id IS NOT NULL) e o supabase-js não consegue
-- especificar o predicado no upsert (.onConflict), causando o erro
-- "there is no unique or exclusion constraint matching the ON CONFLICT specification".
-- Troca por índice único completo: no Postgres os NULLs continuam distintos (NULLS
-- DISTINCT, padrão), então avulsos/setups com contract_id NULL seguem sem colidir.
DROP INDEX IF EXISTS uq_charge_contract_due;
CREATE UNIQUE INDEX uq_charge_contract_due ON charges (contract_id, due_date);
