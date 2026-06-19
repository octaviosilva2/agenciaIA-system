-- Migration 0010: manutenção por hora avulsa
-- Contrato avulso (kind='avulso') ganha um preço por hora; cada serviço lançado
-- vira uma cobrança (charges kind='avulso') com as horas registradas.
-- Aditivo: ambas as colunas são NULL — não afeta contratos/cobranças existentes.

ALTER TABLE contracts
  ADD COLUMN hourly_rate numeric(12,2); -- preço por hora (contrato avulso)

ALTER TABLE charges
  ADD COLUMN hours numeric(6,2); -- horas do lançamento avulso (gestão/totais)
