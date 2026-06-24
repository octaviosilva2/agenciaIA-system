-- Migration 0015: múltiplos contatos por empresa.
-- Tabela company_contacts (1..N por empresa; a UI limita a 3).
-- contact_email segue em companies; contact_name/contact_phone passam a espelhar
-- o "primeiro" contato (compat com telas que leem essas colunas).

CREATE TABLE company_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_company_contacts_company ON company_contacts(company_id);

-- RLS: organização fechada (mesmo padrão authenticated_all das demais tabelas).
ALTER TABLE company_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_all" ON company_contacts FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT ALL ON company_contacts TO authenticated;

-- Migra o contato atual (contact_name/contact_phone) para 1 linha por empresa.
INSERT INTO company_contacts (company_id, name, phone, position)
SELECT id, contact_name, contact_phone, 0
FROM companies
WHERE contact_name IS NOT NULL AND btrim(contact_name) <> '';
