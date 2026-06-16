'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { createContact } from '@/app/(dashboard)/contatos/actions'
import { INITIAL_ACTION_STATE } from '@/lib/actions/action-state'

// Receitas de campo do design system (§5.2)
const labelCls = 'mb-1 block text-xs font-medium'
const inputCls =
  'h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring'
const inputErrorCls =
  'h-9 w-full rounded-md border border-red-500 bg-card px-3 text-sm outline-none ring-2 ring-red-500/30'
const textareaCls =
  'w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring'
const errorTextCls = 'mt-1 text-xs text-red-600 dark:text-red-400'

/**
 * Form de novo contato. Origem em TEXTO LIVRE (02-dados.md).
 * Fluxo: useActionState → server action createContact (zod → Supabase → revalidate).
 */
export function NewContactDialog() {
  const [open, setOpen] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const [state, formAction, pending] = useActionState(createContact, INITIAL_ACTION_STATE)

  useEffect(() => {
    if (state.success) {
      toast.success(state.message)
      formRef.current?.reset()
      setOpen(false)
    } else if (state.message && state.errors) {
      // erros de validação ficam inline; um toast curto sinaliza a falha
      toast.error(state.message)
    } else if (state.message) {
      toast.error(state.message)
    }
  }, [state])

  const errors = state.errors ?? {}

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="h-4 w-4" />
            Novo contato
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo contato</DialogTitle>
          <DialogDescription>
            Cadastre a empresa/pessoa. A origem é texto livre.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={formAction} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="name">
              Nome <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <input
              id="name"
              name="name"
              required
              placeholder="Nome da empresa ou pessoa"
              className={errors.name ? inputErrorCls : inputCls}
            />
            {errors.name && <p className={errorTextCls}>{errors.name[0]}</p>}
          </div>

          <div>
            <label className={labelCls} htmlFor="segment">Segmento</label>
            <input id="segment" name="segment" placeholder="Ex.: Moda, Saúde…" className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="city">Cidade</label>
            <input id="city" name="city" placeholder="Ex.: Balneário Camboriú" className={inputCls} />
          </div>

          <div>
            <label className={labelCls} htmlFor="contact_name">Nome do contato</label>
            <input id="contact_name" name="contact_name" placeholder="Pessoa de contato" className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="contact_phone">Telefone</label>
            <input id="contact_phone" name="contact_phone" placeholder="(47) 90000-0000" className={inputCls} />
          </div>

          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="contact_email">E-mail</label>
            <input
              id="contact_email"
              name="contact_email"
              type="email"
              placeholder="contato@empresa.com"
              className={errors.contact_email ? inputErrorCls : inputCls}
            />
            {errors.contact_email && <p className={errorTextCls}>{errors.contact_email[0]}</p>}
          </div>

          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="origin">Origem</label>
            <textarea
              id="origin"
              name="origin"
              rows={2}
              placeholder="Ex.: veio pelo Roberto, que conhece a Maria"
              className={textareaCls}
            />
          </div>

          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="notes">Observações</label>
            <input id="notes" name="notes" placeholder="Notas rápidas" className={inputCls} />
          </div>

          <DialogFooter className="sm:col-span-2">
            <DialogClose render={<Button type="button" variant="outline">Cancelar</Button>} />
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" />
                  Salvando…
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
