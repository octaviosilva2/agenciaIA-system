-- Migration 0007: Índices + RLS

-- === ÍNDICES para FKs e consultas frequentes ===

-- Companies
CREATE INDEX idx_companies_owner ON companies(owner_id);

-- Deals
CREATE INDEX idx_deals_company ON deals(company_id);
CREATE INDEX idx_deals_owner ON deals(owner_id);
CREATE INDEX idx_deals_stage ON deals(stage);
CREATE INDEX idx_deals_next_action_date ON deals(next_action_date);

-- Deal Stage Events
CREATE INDEX idx_deal_stage_events_deal ON deal_stage_events(deal_id);
CREATE INDEX idx_deal_stage_events_entered ON deal_stage_events(entered_at);

-- Diagnostics
CREATE INDEX idx_diagnostics_company ON diagnostics(company_id);

-- Activities
CREATE INDEX idx_activities_company ON activities(company_id);
CREATE INDEX idx_activities_occurred ON activities(occurred_at);

-- Projects
CREATE INDEX idx_projects_company ON projects(company_id);
CREATE INDEX idx_projects_deal ON projects(deal_id);
CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_projects_status ON projects(status);

-- Project Stage Events
CREATE INDEX idx_project_stage_events_project ON project_stage_events(project_id);

-- Tasks
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_deal ON tasks(deal_id);
CREATE INDEX idx_tasks_commitment ON tasks(commitment_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);

-- Contracts
CREATE INDEX idx_contracts_company ON contracts(company_id);
CREATE INDEX idx_contracts_project ON contracts(project_id);

-- Charges
CREATE INDEX idx_charges_company ON charges(company_id);
CREATE INDEX idx_charges_project ON charges(project_id);
CREATE INDEX idx_charges_contract ON charges(contract_id);
CREATE INDEX idx_charges_due_date ON charges(due_date);
CREATE INDEX idx_charges_status ON charges(status);

-- Accounts Payable
CREATE INDEX idx_payables_due_date ON accounts_payable(due_date);
CREATE INDEX idx_payables_status ON accounts_payable(status);

-- Commitments
CREATE INDEX idx_commitments_narrative ON commitments(narrative_id);

-- Check-ins
CREATE INDEX idx_checkins_commitment ON commitment_checkins(commitment_id);

-- === RLS ===
-- Organização fechada: RLS habilitado, política permissiva para authenticated.
-- anon não acessa nada. Warnings always_true são esperados.

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_stage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostics ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_stage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts_payable ENABLE ROW LEVEL SECURITY;
ALTER TABLE narratives ENABLE ROW LEVEL SECURITY;
ALTER TABLE commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE commitment_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_settings ENABLE ROW LEVEL SECURITY;

-- Políticas: authenticated tem acesso total
CREATE POLICY "authenticated_all" ON profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON companies FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON deals FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON deal_stage_events FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON diagnostics FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON activities FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON projects FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON project_stage_events FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON contracts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON charges FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON accounts_payable FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON narratives FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON commitments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON commitment_checkins FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON strategy_blocks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON org_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- GRANTs para authenticated
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON companies TO authenticated;
GRANT ALL ON deals TO authenticated;
GRANT ALL ON deal_stage_events TO authenticated;
GRANT ALL ON diagnostics TO authenticated;
GRANT ALL ON activities TO authenticated;
GRANT ALL ON projects TO authenticated;
GRANT ALL ON project_stage_events TO authenticated;
GRANT ALL ON tasks TO authenticated;
GRANT ALL ON contracts TO authenticated;
GRANT ALL ON charges TO authenticated;
GRANT ALL ON accounts_payable TO authenticated;
GRANT ALL ON narratives TO authenticated;
GRANT ALL ON commitments TO authenticated;
GRANT ALL ON commitment_checkins TO authenticated;
GRANT ALL ON strategy_blocks TO authenticated;
GRANT ALL ON org_settings TO authenticated;
