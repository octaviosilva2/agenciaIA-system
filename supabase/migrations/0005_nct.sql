-- Migration 0005: NCT (Narratives, Commitments, Check-ins) + FK tasks.commitment_id

CREATE TABLE narratives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  purpose text,
  dri_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status narrative_status NOT NULL DEFAULT 'ativa',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE commitments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  narrative_id uuid NOT NULL REFERENCES narratives(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  type commitment_type NOT NULL,
  status commitment_status NOT NULL DEFAULT 'em_andamento',
  progress int NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  confidence confidence_level NOT NULL DEFAULT 'media',
  dri_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  metric_target text, -- só relevante para type='quantitativo'
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE commitment_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commitment_id uuid NOT NULL REFERENCES commitments(id) ON DELETE CASCADE,
  progress int NOT NULL CHECK (progress >= 0 AND progress <= 100),
  confidence confidence_level NOT NULL,
  comment text,
  author_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Adiciona FK de tasks.commitment_id → commitments
ALTER TABLE tasks
  ADD CONSTRAINT fk_tasks_commitment
  FOREIGN KEY (commitment_id) REFERENCES commitments(id) ON DELETE SET NULL;
