-- Migration 0011: alinhar o enum payable_category à UI (fixo/variavel/imposto)
-- Decisão §4.1 do plano de backend. Recreate destrutivo do enum.
-- Seguro: accounts_payable estava vazia (0 linhas) e nenhum outro objeto usa o tipo;
-- os valores antigos (infra/freela/ferramentas/imposto/outro) são descartados.

-- 1. Desacopla a coluna do tipo enum (vira text temporariamente)
ALTER TABLE accounts_payable
  ALTER COLUMN category TYPE text USING category::text;

-- 2. Recria o tipo com os valores da UI
DROP TYPE payable_category;
CREATE TYPE payable_category AS ENUM ('fixo', 'variavel', 'imposto');

-- 3. Reaplica o tipo à coluna (tabela vazia → nada a converter)
ALTER TABLE accounts_payable
  ALTER COLUMN category TYPE payable_category USING category::payable_category;
