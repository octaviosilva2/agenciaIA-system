'use client'

import { useActionState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { updateTaxRate } from '@/lib/actions/config'
import { INITIAL_ACTION_STATE } from '@/lib/actions/action-state'
import type { OrgSettingsRow } from '@/lib/queries/config'

const inputCls =
  'h-9 w-40 rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring'
const labelCls = 'mb-1 block text-xs font-medium'

/**
 * Seção Financeiro — alíquota de imposto (org_settings.tax_rate), dados reais.
 * Migrado do antigo TaxCard; campos fantasma (future_tax_*) removidos.
 */
export function FinancialSection({ orgSettings }: { orgSettings: OrgSettingsRow }) {
  const [state, formAction, pending] = useActionState(updateTaxRate, INITIAL_ACTION_STATE)

  useEffect(() => {
    if (state.success) toast.success(state.message)
    else if (state.message) toast.error(state.message)
  }, [state])

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-base font-semibold">Financeiro</h3>
        <p className="text-sm text-muted-foreground">
          Alíquota aplicada no cálculo de receita líquida.
        </p>
      </div>

      <form action={formAction} className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-end gap-3">
          <div>
            <label className={labelCls} htmlFor="cfg_tax">
              Alíquota (%)
            </label>
            <input
              id="cfg_tax"
              name="tax_rate"
              type="number"
              min="0"
              max="100"
              step="0.01"
              defaultValue={orgSettings.tax_rate}
              className={inputCls}
              aria-invalid={state.errors?.tax_rate ? true : undefined}
            />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
        {state.errors?.tax_rate && (
          <p className="mt-1 text-xs text-destructive">{state.errors.tax_rate[0]}</p>
        )}
      </form>
    </section>
  )
}
