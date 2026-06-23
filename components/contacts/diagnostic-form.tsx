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
import { createDiagnostic } from '@/lib/actions/contact-profile'
import { INITIAL_ACTION_STATE } from '@/lib/actions/action-state'

const labelCls = 'mb-1 block text-xs font-medium'
const textareaCls =
  'w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring'

/** Dialog para registrar um diagnóstico do contato. */
export function DiagnosticForm({ companyId }: { companyId: string }) {
  const [open, setOpen] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const [state, formAction, pending] = useActionState(createDiagnostic, INITIAL_ACTION_STATE)

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
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4" />
            Novo diagnóstico
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo diagnóstico</DialogTitle>
          <DialogDescription>Registre o contexto, dores e oportunidades do cliente.</DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="space-y-3">
          <input type="hidden" name="company_id" value={companyId} />
          <div>
            <label className={labelCls} htmlFor="notes">Diagnóstico</label>
            <textarea
              id="notes"
              name="notes"
              rows={6}
              required
              placeholder="Contexto, dores, oportunidades de IA/automação e solução proposta…"
              className={textareaCls}
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline">Cancelar</Button>} />
            <Button type="submit" disabled={pending}>
              {pending ? 'Salvando…' : 'Salvar diagnóstico'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
