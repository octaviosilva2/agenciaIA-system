-- Migration 0019: data de conclusão explícita em projects e tasks
-- Permite registrar a conclusão (entregue/done) numa data RETROATIVA e reconhecer
-- "concluído no mês X" pela data real — em vez do proxy frágil updated_at usado
-- até aqui pelo dashboard. Aditiva e segura: coluna NULL, não afeta linhas vivas.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Backfill: itens já concluídos recebem updated_at como melhor estimativa da
-- data de conclusão (preserva o comportamento histórico do dashboard).
UPDATE projects
  SET completed_at = updated_at
  WHERE status = 'entregue' AND completed_at IS NULL;

UPDATE tasks
  SET completed_at = updated_at
  WHERE status = 'done' AND completed_at IS NULL;
