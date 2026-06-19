'use client'

import { useActionState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { updateStaleDealDays } from '@/lib/actions/config'
import { INITIAL_ACTION_STATE } from '@/lib/actions/action-state'
import type { OrgSettingsRow } from '@/lib/queries/config'

const inputCls =
  'h-9 w-40 rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring'
const labelCls = 'mb-1 block text-xs font-medium'

/**
 * Seção CRM — dias para um negócio ser considerado parado (org_settings.stale_deal_days).
 * Migrado do antigo StaleDealCard, com dados reais.
 */
export function CrmSection({ orgSettings }: { orgSettings: OrgSettingsRow }) {
  const [state, formAction, pending] = useActionState(updateStaleDealDays, INITIAL_ACTION_STATE)

  useEffect(() => {
    if (state.success) toast.success(state.message)
    else if (state.message) toast.error(state.message)
  }, [state])

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-base font-semibold">CRM</h3>
        <p className="text-sm text-muted-foreground">
          Após quantos dias sem atividade um negócio é sinalizado como parado.
        </p>
      </div>

      <form action={formAction} className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-end gap-3">
          <div>
            <label className={labelCls} htmlFor="cfg_stale">
              Dias para negócio parado
            </label>
            <input
              id="cfg_stale"
              name="stale_deal_days"
              type="number"
              min="1"
              step="1"
              defaultValue={orgSettings.stale_deal_days}
              className={inputCls}
              aria-invalid={state.errors?.stale_deal_days ? true : undefined}
            />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
        {state.errors?.stale_deal_days && (
          <p className="mt-1 text-xs text-destructive">{state.errors.stale_deal_days[0]}</p>
        )}
      </form>
    </section>
  )
}
