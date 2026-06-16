'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { DEAL_STAGE } from '@/lib/format'
import { changeDealStage, closeDeal, loseDeal, reactivateDeal } from '@/lib/actions/deals'
import type { DealStage } from '@/lib/rules/deal-stage'

const SALE_STAGES: DealStage[] = ['oportunidade', 'escopo', 'proposta', 'negociacao']

const selectCls =
  'h-9 rounded-md border border-border bg-card px-2 text-sm outline-none focus:ring-2 focus:ring-ring'
const labelCls = 'mb-1 block text-xs font-medium'
const textareaCls =
  'w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring'

/** Controle de estágio + desfechos (Fechar/Perder/Reativar) da tela do projeto. */
export function OpportunityActions({
  dealId,
  stage,
}: {
  dealId: string
  stage: DealStage
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [closeOpen, setCloseOpen] = useState(false)
  const [maintenance, setMaintenance] = useState<'com' | 'sem'>('com')
  const [lostOpen, setLostOpen] = useState(false)
  const [lostReason, setLostReason] = useState('')

  const isTerminal = !SALE_STAGES.includes(stage)

  async function run(p: Promise<{ success: boolean; message: string }>, okMsg?: string) {
    setBusy(true)
    const res = await p
    setBusy(false)
    if (res.success) {
      toast.success(okMsg ?? res.message)
      router.refresh()
    } else {
      toast.error(res.message)
    }
  }

  async function setStage(target: DealStage) {
    if (target === stage) return
    await run(changeDealStage(dealId, target), `→ ${DEAL_STAGE[target].label}`)
  }

  if (isTerminal) {
    return (
      <div className="flex items-center gap-2">
        <EntityStage stage={stage} />
        <span className="text-sm text-muted-foreground">Negócio finalizado.</span>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="text-xs text-muted-foreground" htmlFor="stage-select">Estágio</label>
      <select
        id="stage-select"
        value={stage}
        disabled={busy}
        onChange={(e) => setStage(e.target.value as DealStage)}
        className={selectCls}
      >
        {SALE_STAGES.map((s) => (
          <option key={s} value={s}>{DEAL_STAGE[s].label}</option>
        ))}
      </select>

      <div className="mx-1 h-5 w-px bg-border" aria-hidden />

      <Button variant="outline" size="sm" disabled={busy} onClick={() => setLostOpen(true)}>
        Marcar perdido
      </Button>
      <Button variant="outline" size="sm" disabled={busy} onClick={() => void run(reactivateDeal(dealId))}>
        Reativar
      </Button>
      <Button size="sm" disabled={busy} onClick={() => setCloseOpen(true)}>
        Fechar negócio
      </Button>

      {/* Modal: com/sem manutenção */}
      <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fechar negócio</DialogTitle>
            <DialogDescription>O cliente fechou com manutenção?</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="detail-maintenance"
                className="h-4 w-4 border-border"
                checked={maintenance === 'com'}
                onChange={() => setMaintenance('com')}
              />
              Com manutenção (gera contrato mensal)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="detail-maintenance"
                className="h-4 w-4 border-border"
                checked={maintenance === 'sem'}
                onChange={() => setMaintenance('sem')}
              />
              Sem manutenção
            </label>
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline">Cancelar</Button>} />
            <Button
              type="button"
              disabled={busy}
              onClick={() => {
                setCloseOpen(false)
                void run(closeDeal(dealId, maintenance === 'com'))
              }}
            >
              Fechar negócio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: motivo da perda */}
      <Dialog open={lostOpen} onOpenChange={(o) => { setLostOpen(o); if (!o) setLostReason('') }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar como perdido</DialogTitle>
            <DialogDescription>Informe o motivo da perda.</DialogDescription>
          </DialogHeader>
          <div>
            <label className={labelCls} htmlFor="detail_lost_reason">Motivo</label>
            <textarea
              id="detail_lost_reason"
              rows={3}
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              placeholder="Ex.: escolheu concorrente / sem orçamento"
              className={textareaCls}
              autoFocus
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline">Cancelar</Button>} />
            <Button
              type="button"
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={busy}
              onClick={() => {
                if (!lostReason.trim()) {
                  toast.error('Informe o motivo da perda.')
                  return
                }
                setLostOpen(false)
                void run(loseDeal(dealId, lostReason))
              }}
            >
              Marcar perdido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Badge de estágio leve (evita import circular com EntityBadge nas terminais)
function EntityStage({ stage }: { stage: DealStage }) {
  const meta = DEAL_STAGE[stage]
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${meta.className}`}>
      {meta.label}
    </span>
  )
}
