-- Migration 0004: Contracts + Charges + Accounts Payable

CREATE TABLE contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  name text NOT NULL,
  kind contract_kind NOT NULL,
  status contract_status NOT NULL DEFAULT 'ativo',
  monthly_value numeric(12,2), -- obrigatório se kind='mensal'
  min_months int, -- contrato mínimo em meses (obrigatório se kind='mensal')
  billing_day int CHECK (billing_day >= 1 AND billing_day <= 28),
  start_date date NOT NULL,
  sla text,
  next_contact_date date,
  contact_frequency_days int,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Contas a Receber
CREATE TABLE charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  contract_id uuid REFERENCES contracts(id) ON DELETE SET NULL,
  description text NOT NULL,
  kind charge_kind NOT NULL,
  amount numeric(12,2) NOT NULL,
  due_date date NOT NULL,
  status charge_status NOT NULL DEFAULT 'pendente',
  method charge_method,
  paid_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- pago ⇔ paid_at not null
  CONSTRAINT chk_charge_paid
    CHECK (
      (status = 'pago' AND paid_at IS NOT NULL)
      OR
      (status <> 'pago' AND paid_at IS NULL)
    )
);

-- Idempotência: UNIQUE parcial para recorrências de contrato
CREATE UNIQUE INDEX uq_charge_contract_due
  ON charges (contract_id, due_date)
  WHERE contract_id IS NOT NULL;

-- Contas a Pagar
CREATE TABLE accounts_payable (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  category payable_category NOT NULL,
  amount numeric(12,2) NOT NULL,
  due_date date NOT NULL,
  status charge_status NOT NULL DEFAULT 'pendente',
  paid_at timestamptz,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  supplier text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
