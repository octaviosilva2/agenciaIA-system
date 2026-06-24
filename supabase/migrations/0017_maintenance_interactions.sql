-- Migration 0017: relacionamento com o cliente na manutenção.
-- Relatos/interações registrados no contrato de manutenção (padrão das activities).
CREATE TABLE maintenance_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_maintenance_interactions_contract ON maintenance_interactions(contract_id);

-- RLS: organização fechada (mesmo padrão authenticated_all das demais tabelas).
ALTER TABLE maintenance_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_all" ON maintenance_interactions FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT ALL ON maintenance_interactions TO authenticated;
