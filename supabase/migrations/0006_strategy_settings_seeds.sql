-- Migration 0006: Strategy Blocks + Org Settings + Seeds

-- Blocos de estratégia (5 fixos, criados por seed)
CREATE TABLE strategy_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind strategy_block_kind NOT NULL UNIQUE,
  content jsonb NOT NULL DEFAULT '{}',
  updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Configurações da organização (linha única)
CREATE TABLE org_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_rate numeric(5,2) NOT NULL DEFAULT 0,
  stale_deal_days int NOT NULL DEFAULT 7,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- === SEEDS ===

-- Strategy blocks: 5 linhas fixas
INSERT INTO strategy_blocks (kind, content) VALUES
  ('missao', '{"text": ""}'),
  ('proposito', '{"text": ""}'),
  ('swot', '{"strengths": "", "weaknesses": "", "opportunities": "", "threats": ""}'),
  ('asis_tobe', '{"as_is": "", "to_be": ""}'),
  ('blueprint', '{"channels": "", "revenue": "", "value_proposition": "", "segments": ""}');

-- Org settings: linha única
INSERT INTO org_settings (tax_rate, stale_deal_days) VALUES (0, 7);
