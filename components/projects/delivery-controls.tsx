'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { updateProjectDueDate, updateProjectStatus } from '@/lib/actions/project'
import { deliveryCountdown, isOverdue } from '@/lib/format'
import type { Database } from '@/lib/supabase/types'

type ProjectStatus = Database['public']['Enums']['project_status']

const inputCls =
  'h-9 rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring'

/** Data de hoje em 'yyyy-MM-dd'. */
function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

/**
 * Prazo de entrega + conclusão do projeto, na tela do projeto.
 * Marcar como entregue também pode ser feito na tela de Implementação.
 */
export function DeliveryControls({
  projectId,
  dealId,
  status,
  dueDate,
}: {
  projectId: string
  dealId: string
  status: ProjectStatus
  dueDate: string | null
}) {
  const router = useRouter()
  const [due, setDue] = useState(dueDate ?? '')
  const [busy, setBusy] = useState(false)
  const [deliverOpen, setDeliverOpen] = useState(false)
  const [deliverDate, setDeliverDate] = useState(todayISO()) // data da entrega (retroativa)

  const delivered = status === 'entregue'
  const changed = (dueDate ?? '') !== due

  async function run(p: Promise<{ success: boolean; message: string }>) {
    setBusy(true)
    const res = await p
    setBusy(false)
    if (res.success) {
      toast.success(res.message)
      router.refresh()
    } else {
      toast.error(res.message)
    }
  }

  return (
    <div className="space-y-3">
      {delivered && (
        <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-2.5 text-sm dark:border-green-500/30 dark:bg-green-500/10">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
          <span className="font-medium">Projeto entregue</span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            disabled={busy}
            onClick={() => void run(updateProjectStatus(projectId, dealId, 'desenvolvimento'))}
          >
            Reabrir
          </Button>
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-medium" htmlFor="delivery_due">
          Prazo de entrega
        </label>
        <div className="flex items-center gap-2">
          <input
            id="delivery_due"
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className={`${inputCls} w-44`}
          />
          {changed && (
            <Button
              size="sm"
              disabled={busy}
              onClick={() => void run(updateProjectDueDate(projectId, dealId, due || null))}
            >
              Salvar
            </Button>
          )}
        </div>
        {due && !delivered && (
          <p
            className={`mt-1 text-xs font-medium ${
              isOverdue(due) ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'
            }`}
          >
            {deliveryCountdown(due)}
          </p>
        )}
      </div>

      {!delivered && (
        <Popover
          open={deliverOpen}
          onOpenChange={(o) => {
            setDeliverOpen(o)
            if (o) setDeliverDate(todayISO())
          }}
        >
          <PopoverTrigger
            render={
              <Button variant="outline" size="sm" disabled={busy}>
                <CheckCircle2 className="h-4 w-4" />
                Marcar como entregue
              </Button>
            }
          />
          <PopoverContent align="start" className="w-60 gap-2">
            <p className="text-xs font-medium">Data da entrega</p>
            <input
              type="date"
              value={deliverDate}
              onChange={(e) => setDeliverDate(e.target.value)}
              className={`${inputCls} w-full`}
              aria-label="Data da entrega"
            />
            <p className="text-[11px] text-muted-foreground">
              A conclusão será registrada nesta data.
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setDeliverOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={busy}
                onClick={() => {
                  setDeliverOpen(false)
                  void run(updateProjectStatus(projectId, dealId, 'entregue', deliverDate))
                }}
              >
                Confirmar
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}
