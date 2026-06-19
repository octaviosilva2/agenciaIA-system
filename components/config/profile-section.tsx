'use client'

import { useActionState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { updateOwnProfile } from '@/lib/actions/config'
import { INITIAL_ACTION_STATE } from '@/lib/actions/action-state'
import type { OwnProfile } from '@/lib/queries/config'

const inputCls =
  'h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60'
const labelCls = 'mb-1 block text-xs font-medium'

/**
 * Seção Perfil — nome editável + email read-only.
 * Salva via server action real (updateOwnProfile). O userId é resolvido no servidor.
 */
export function ProfileSection({ profile }: { profile: OwnProfile }) {
  const [state, formAction, pending] = useActionState(updateOwnProfile, INITIAL_ACTION_STATE)

  useEffect(() => {
    if (state.success) toast.success(state.message)
    else if (state.message) toast.error(state.message)
  }, [state])

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-base font-semibold">Perfil</h3>
        <p className="text-sm text-muted-foreground">
          Seu nome de exibição. O e-mail não pode ser alterado por aqui.
        </p>
      </div>

      <form action={formAction} className="max-w-md space-y-4 rounded-lg border border-border bg-card p-4">
        <div>
          <label className={labelCls} htmlFor="profile_name">
            Nome
          </label>
          <input
            id="profile_name"
            name="name"
            defaultValue={profile.name}
            className={inputCls}
            aria-invalid={state.errors?.name ? true : undefined}
          />
          {/* Erro de validação inline (CA-07) */}
          {state.errors?.name && (
            <p className="mt-1 text-xs text-destructive">{state.errors.name[0]}</p>
          )}
        </div>

        <div>
          <label className={labelCls} htmlFor="profile_email">
            E-mail
          </label>
          {/* Read-only: não há action para trocar e-mail (CA-05) */}
          <input
            id="profile_email"
            value={profile.email}
            readOnly
            disabled
            className={inputCls}
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      </form>
    </section>
  )
}
