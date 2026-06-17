-- Migration 0008: tarefas de manutenção (contract_id) + recorrência mensal
-- Tarefa de manutenção = vinculada ao contrato (contract_id) + area='operacional'.
-- Tarefa de implementação continua só com project_id.

CREATE TYPE task_recurrence AS ENUM ('none', 'monthly');

ALTER TABLE tasks
  ADD COLUMN contract_id uuid REFERENCES contracts(id) ON DELETE SET NULL,
  ADD COLUMN recurrence task_recurrence NOT NULL DEFAULT 'none',
  ADD COLUMN recurrence_day int,
  ADD CONSTRAINT tasks_recurrence_day_range
    CHECK (recurrence_day IS NULL OR recurrence_day BETWEEN 1 AND 28),
  ADD CONSTRAINT tasks_monthly_needs_day
    CHECK (recurrence <> 'monthly' OR recurrence_day IS NOT NULL);

-- Índice do FK (padrão da migration 0007).
CREATE INDEX idx_tasks_contract ON tasks(contract_id);

-- RLS: tasks já tem policy authenticated_all (FOR ALL) e GRANT na migration 0007;
-- colunas novas ficam cobertas automaticamente.
