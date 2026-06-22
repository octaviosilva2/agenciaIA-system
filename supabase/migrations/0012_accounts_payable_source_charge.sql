-- Migration 0012: vínculo de origem para contas a pagar geradas por uma cobrança
-- Suporta o lançamento automático de imposto ao marcar uma receita como recebida
-- (alíquota de org_settings). Ao reverter o pagamento, o imposto é removido por este
-- vínculo. ON DELETE CASCADE: apagar a cobrança remove o imposto derivado.
-- Aditiva e segura: coluna NULL, não afeta linhas existentes.

ALTER TABLE accounts_payable
  ADD COLUMN source_charge_id uuid REFERENCES charges(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_accounts_payable_source_charge
  ON accounts_payable(source_charge_id);
