-- Taxa de maquininha global (%), aplicada como despesa variável ao CONFIRMAR
-- pagamento de uma cobrança no cartão (igual ao imposto). Default 0 = sem taxa.
alter table public.org_settings
  add column if not exists card_fee_rate numeric not null default 0;

comment on column public.org_settings.card_fee_rate is
  'Taxa de maquininha (%) descontada como despesa variável ao confirmar pagamento no cartão.';
