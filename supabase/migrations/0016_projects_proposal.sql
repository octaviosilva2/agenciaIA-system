-- Migration 0016: proposta como área de organização (estimativas pré-fechamento).
-- jsonb com: setup_estimate, maintenance_min, maintenance_max, hourly_estimate (number),
-- delivery_estimate, notes (text). Não confundir com o pagamento real (charges pós-fechamento).
ALTER TABLE projects ADD COLUMN proposal jsonb NOT NULL DEFAULT '{}'::jsonb;
