-- Migration 0001: Enums + Profiles + Companies
-- Cria todos os enums do sistema e as tabelas base

-- === ENUMS ===

CREATE TYPE deal_stage AS ENUM (
  'prospect', 'lead', 'diagnostico', 'oportunidade', 'escopo',
  'proposta', 'negociacao', 'fechado', 'perdido',
  'reativar_futuramente', 'desqualificado'
);

CREATE TYPE deal_urgency AS ENUM ('baixa', 'media', 'alta');

CREATE TYPE project_status AS ENUM (
  'a_iniciar', 'briefing', 'desenvolvimento', 'revisao', 'entregue'
);

CREATE TYPE task_status AS ENUM (
  'analisar', 'todo', 'doing', 'impedimento', 'done'
);

CREATE TYPE task_priority AS ENUM ('urgente', 'proximo', 'futuro');

CREATE TYPE task_area AS ENUM (
  'gestao', 'comercial', 'operacional', 'financeiro', 'sistema'
);

CREATE TYPE level_scale AS ENUM ('baixo', 'medio', 'alto');

CREATE TYPE confidence_level AS ENUM ('baixa', 'media', 'alta');

CREATE TYPE contract_kind AS ENUM ('mensal', 'avulso');

CREATE TYPE contract_status AS ENUM ('ativo', 'encerrado');

CREATE TYPE narrative_status AS ENUM ('ativa', 'concluida', 'arquivada');

CREATE TYPE commitment_type AS ENUM (
  'think_it', 'build_it', 'launch_it', 'quantitativo'
);

CREATE TYPE commitment_status AS ENUM (
  'em_andamento', 'cumprido', 'nao_cumprido'
);

CREATE TYPE charge_kind AS ENUM ('setup', 'recorrencia', 'avulso');

CREATE TYPE charge_status AS ENUM ('pendente', 'pago', 'cancelado');

CREATE TYPE charge_method AS ENUM (
  'pix', 'boleto', 'cartao', 'transferencia', 'outro'
);

CREATE TYPE payable_category AS ENUM (
  'infra', 'freela', 'ferramentas', 'imposto', 'outro'
);

CREATE TYPE activity_type AS ENUM (
  'nota', 'reuniao', 'ligacao', 'email', 'whatsapp', 'outro'
);

CREATE TYPE strategy_block_kind AS ENUM (
  'missao', 'proposito', 'swot', 'asis_tobe', 'blueprint'
);

-- === PROFILES ===

CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- === COMPANIES (Contatos) ===

CREATE TABLE companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  segment text,
  city text,
  contact_name text,
  contact_phone text,
  contact_email text,
  origin text, -- texto livre, sem enum
  owner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
