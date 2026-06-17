-- Migration 0009: soft delete (arquivamento) das entidades principais.
-- archived_at NULL = ativo; preenchido = arquivado (some das listas ativas, reversível).
-- "Excluir permanente" é DELETE de verdade (cascata pelas FKs já existentes).
-- projects segue o deal (não recebe coluna própria).

ALTER TABLE companies ADD COLUMN archived_at timestamptz;
ALTER TABLE deals ADD COLUMN archived_at timestamptz;
ALTER TABLE contracts ADD COLUMN archived_at timestamptz;
ALTER TABLE tasks ADD COLUMN archived_at timestamptz;

-- Índices para a visão de arquivados (e ajudar o planner no filtro).
CREATE INDEX idx_companies_archived ON companies(archived_at);
CREATE INDEX idx_deals_archived ON deals(archived_at);
CREATE INDEX idx_contracts_archived ON contracts(archived_at);
CREATE INDEX idx_tasks_archived ON tasks(archived_at);
