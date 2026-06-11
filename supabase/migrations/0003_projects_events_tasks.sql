-- Migration 0003: Projects + Project Stage Events + Tasks

CREATE TABLE projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES deals(id) ON DELETE SET NULL,
  name text NOT NULL,
  status project_status NOT NULL DEFAULT 'a_iniciar',
  custom_stages jsonb, -- [{id, name, done}] — etapas internas customizáveis
  scope_items jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{id, title, contracted, delivered}]
  total_value numeric(12,2),
  start_date date,
  due_date date,
  owner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  drive_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Histórico de fases do projeto
CREATE TABLE project_stage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status project_status NOT NULL,
  entered_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Tarefas (unidade operacional global)
CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status task_status NOT NULL DEFAULT 'todo',
  priority task_priority NOT NULL DEFAULT 'proximo',
  area task_area NOT NULL,
  assignee_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES deals(id) ON DELETE SET NULL,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  commitment_id uuid, -- FK será adicionada na migration 0005 (NCT)
  due_date date,
  impact level_scale,
  effort level_scale,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
