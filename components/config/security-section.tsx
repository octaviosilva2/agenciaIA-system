'use client'

import { useActionState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { updatePassword } from '@/lib/actions/config'
import { INITIAL_ACTION_STATE } from '@/lib/actions/action-state'

const inputCls =
  'h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring'
const labelCls = 'mb-1 block text-xs font-medium'

/**
 * Seção Segurança — troca de senha (senha atual + nova + confirmação).
 * O servidor reautentica com a senha atual antes de trocar. Campos são limpos no sucesso.
 */
export function SecuritySection() {
  const formRef = useRef<HTMLFormElement>(null)
  const [state, formAction, pending] = useActionState(updatePassword, INITIAL_ACTION_STATE)

  useEffect(() => {
    if (state.success) {
      toast.success(state.message)
      // Limpa os 3 campos de senha após sucesso.
      formRef.current?.reset()
    } else if (state.message) {
      toast.error(state.message)
    }
  }, [state])

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-base font-semibold">Segurança</h3>
        <p className="text-sm text-muted-foreground">
          Troque sua senha. Informe a senha atual para confirmar.
        </p>
      </div>

      <form
        ref={formRef}
        action={formAction}
        className="max-w-md space-y-4 rounded-lg border border-border bg-card p-4"
      >
        <div>
          <label className={labelCls} htmlFor="currentPassword">
            Senha atual
          </label>
          <input
            id="currentPassword"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            className={inputCls}
            aria-invalid={state.errors?.currentPassword ? true : undefined}
          />
          {state.errors?.currentPassword && (
            <p className="mt-1 text-xs text-destructive">{state.errors.currentPassword[0]}</p>
          )}
        </div>

        <div>
          <label className={labelCls} htmlFor="newPassword">
            Nova senha
          </label>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            className={inputCls}
            aria-invalid={state.errors?.newPassword ? true : undefined}
          />
          {state.errors?.newPassword && (
            <p className="mt-1 text-xs text-destructive">{state.errors.newPassword[0]}</p>
          )}
        </div>

        <div>
          <label className={labelCls} htmlFor="confirmPassword">
            Confirmar nova senha
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            className={inputCls}
            aria-invalid={state.errors?.confirmPassword ? true : undefined}
          />
          {state.errors?.confirmPassword && (
            <p className="mt-1 text-xs text-destructive">{state.errors.confirmPassword[0]}</p>
          )}
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
