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
import { createOpportunity } from '@/lib/actions/deals'
import { INITIAL_ACTION_STATE } from '@/lib/actions/action-state'
import type { CompanyOption } from '@/lib/queries/companies'

// Receitas de campo do design system (§5.2)
const labelCls = 'mb-1 block text-xs font-medium'
const inputCls =
  'h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring'
const selectCls =
  'h-9 w-full rounded-md border border-border bg-card px-2 text-sm outline-none focus:ring-2 focus:ring-ring'
const textareaCls =
  'w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring'

/**
 * Cria uma oportunidade: contato existente + projeto (já em estágio Oportunidade).
 * Fluxo: useActionState → createOpportunity (deal + projeto + evento).
 */
export function NewOpportunityDialog({ contacts }: { contacts: CompanyOption[] }) {
  const [open, setOpen] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const [state, formAction, pending] = useActionState(createOpportunity, INITIAL_ACTION_STATE)

  useEffect(() => {
    if (state.success) {
      toast.success(state.message)
      formRef.current?.reset()
      setOpen(false)
    } else if (state.message) {
      toast.error(state.message)
    }
  }, [state])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="h-4 w-4" />
            Novo projeto
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo projeto</DialogTitle>
          <DialogDescription>
            Selecione o contato e nomeie o projeto — ele nasce no estágio Oportunidade.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={formAction} className="space-y-3">
          <div>
            <label className={labelCls} htmlFor="company_id">
              Contato <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <select id="company_id" name="company_id" required defaultValue="" className={selectCls}>
              <option value="" disabled>
                Selecionar contato…
              </option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls} htmlFor="project_name">
              Nome do projeto <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <input
              id="project_name"
              name="project_name"
              required
              placeholder="Ex.: CRM Moda em Foco"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls} htmlFor="estimated_value">Valor estimado (R$)</label>
            <input
              id="estimated_value"
              name="estimated_value"
              inputMode="decimal"
              placeholder="Ex.: 18000"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls} htmlFor="project_description">Descrição</label>
            <textarea
              id="project_description"
              name="project_description"
              rows={3}
              placeholder="Escopo inicial, contexto, o que será entregue…"
              className={textareaCls}
            />
          </div>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline">Cancelar</Button>} />
            <Button type="submit" disabled={pending}>
              {pending ? 'Criando…' : 'Criar oportunidade'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
