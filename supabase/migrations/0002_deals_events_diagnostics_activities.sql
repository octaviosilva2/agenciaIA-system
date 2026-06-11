-- Migration 0002: Deals + Stage Events + Diagnostics + Activities

CREATE TABLE deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  stage deal_stage NOT NULL DEFAULT 'prospect',
  estimated_value numeric(12,2),
  budget text,
  urgency deal_urgency,
  decision_maker text,
  next_action text,
  next_action_date date,
  owner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  has_maintenance boolean, -- NOT NULL quando stage='fechado' (CHECK abaixo)
  lost_reason text, -- NOT NULL quando stage='perdido' (CHECK abaixo)
  closed_at timestamptz, -- preenchido em estágios terminais
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Regras de integridade
  CONSTRAINT chk_deal_lost_reason
    CHECK (stage <> 'perdido' OR lost_reason IS NOT NULL),
  CONSTRAINT chk_deal_has_maintenance
    CHECK (stage <> 'fechado' OR has_maintenance IS NOT NULL),
  CONSTRAINT chk_deal_closed_at
    CHECK (
      (stage IN ('fechado', 'perdido', 'reativar_futuramente', 'desqualificado') AND closed_at IS NOT NULL)
      OR
      (stage NOT IN ('fechado', 'perdido', 'reativar_futuramente', 'desqualificado') AND closed_at IS NULL)
    )
);

-- Histórico de movimentação no funil
CREATE TABLE deal_stage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  stage deal_stage NOT NULL,
  entered_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Diagnósticos (aba do perfil do contato)
CREATE TABLE diagnostics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES deals(id) ON DELETE SET NULL,
  context text,
  problems text,
  opportunities text,
  proposed_solution text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Timeline de interações
CREATE TABLE activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES deals(id) ON DELETE SET NULL,
  type activity_type NOT NULL,
  content text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
