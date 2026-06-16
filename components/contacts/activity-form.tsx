'use client'

import { useActionState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { createActivity } from '@/lib/actions/contact-profile'
import { INITIAL_ACTION_STATE } from '@/lib/actions/action-state'
import { ACTIVITY_TYPE_LABELS } from '@/lib/format'
import type { Database } from '@/lib/supabase/types'

type ActivityType = Database['public']['Enums']['activity_type']
const ACTIVITY_TYPES: ActivityType[] = ['nota', 'reuniao', 'ligacao', 'email', 'whatsapp', 'outro']

const selectCls =
  'h-9 rounded-md border border-border bg-card px-2 text-sm outline-none focus:ring-2 focus:ring-ring'
const textareaCls =
  'w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring'

/** Form rápido de interação (nota/reunião/…) na timeline do contato/negócio. */
export function ActivityForm({ companyId, dealId }: { companyId: string; dealId?: string }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [state, formAction, pending] = useActionState(createActivity, INITIAL_ACTION_STATE)

  useEffect(() => {
    if (state.success) {
      toast.success(state.message)
      formRef.current?.reset()
    } else if (state.message) {
      toast.error(state.message)
    }
  }, [state])

  return (
    <form ref={formRef} action={formAction} className="space-y-2">
      <input type="hidden" name="company_id" value={companyId} />
      {dealId && <input type="hidden" name="deal_id" value={dealId} />}
      <select name="type" defaultValue="nota" className={selectCls} aria-label="Tipo de interação">
        {ACTIVITY_TYPES.map((t) => (
          <option key={t} value={t}>{ACTIVITY_TYPE_LABELS[t]}</option>
        ))}
      </select>
      <textarea
        name="content"
        required
        rows={2}
        placeholder="Escreva uma nota, resumo da reunião, próximo passo…"
        className={textareaCls}
      />
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? 'Salvando…' : 'Registrar interação'}
        </Button>
      </div>
    </form>
  )
}
