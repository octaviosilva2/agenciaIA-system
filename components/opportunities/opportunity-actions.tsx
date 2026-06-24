'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
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
import { CHARGE_METHOD_LABELS, DEAL_STAGE } from '@/lib/format'
import {
  changeDealStage,
  closeDealWithSetup,
  loseDeal,
  reactivateDeal,
  type CloseMaintenanceInput,
} from '@/lib/actions/deals'
import type { DealStage } from '@/lib/rules/deal-stage'

const SALE_STAGES: DealStage[] = ['oportunidade', 'escopo', 'proposta', 'negociacao']

const selectCls =
  'h-9 rounded-md border border-border bg-card px-2 text-sm outline-none focus:ring-2 focus:ring-ring'
const inputCls =
  'h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring'
const labelCls = 'mb-1 block text-xs font-medium'
const textareaCls =
  'w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring'

const METHODS = Object.keys(CHARGE_METHOD_LABELS) as (keyof typeof CHARGE_METHOD_LABELS)[]

function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}
const numStr = (n: number | null) => (n != null ? String(n) : '')

type MaintKind = 'none' | 'mensal' | 'avulso'

/** Controle de estágio + desfechos (Fechar via wizard / Perder / Reativar) da tela do projeto. */
export function OpportunityActions({
  dealId,
  stage,
  projectId,
  companyId,
  projectName,
  suggestedTotal,
  suggestedMonthly,
  suggestedHourly,
}: {
  dealId: string
  stage: DealStage
  projectId: string | null
  companyId: string
  projectName: string
  suggestedTotal: number | null
  suggestedMonthly: number | null
  suggestedHourly: number | null
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [closeOpen, setCloseOpen] = useState(false)
  const [lostOpen, setLostOpen] = useState(false)
  const [lostReason, setLostReason] = useState('')

  // --- Estado do wizard de fechamento ---
  // Implementação (pagamento)
  const [payValue, setPayValue] = useState(numStr(suggestedTotal))
  const [payMode, setPayMode] = useState<'avista' | 'parcelado'>('avista')
  const [payCount, setPayCount] = useState(2)
  const [payFirst, setPayFirst] = useState(todayISO())
  const [payMethod, setPayMethod] = useState<string>('pix')
  // Manutenção
  const [maint, setMaint] = useState<MaintKind>('none')
  const [monthlyValue, setMonthlyValue] = useState(numStr(suggestedMonthly))
  const [minMonths, setMinMonths] = useState(12)
  const [billingDay, setBillingDay] = useState(10)
  const [maintStart, setMaintStart] = useState(todayISO())
  const [hourlyRate, setHourlyRate] = useState(numStr(suggestedHourly))
  const [avulsoStart, setAvulsoStart] = useState(todayISO())

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

  async function submitClose() {
    if (!projectId) {
      toast.error('Crie o projeto antes de fechar.')
      return
    }
    const total = Number(payValue) || 0
    if (!(total > 0)) {
      toast.error('Informe o valor da implementação.')
      return
    }
    // Valida a manutenção ANTES de fechar — evita marcar fechado/pagar e falhar no contrato.
    if (maint === 'mensal' && !(Number(monthlyValue) > 0)) {
      toast.error('Informe o valor mensal da manutenção.')
      return
    }
    if (maint === 'avulso' && !(Number(hourlyRate) > 0)) {
      toast.error('Informe o preço por hora da manutenção.')
      return
    }
    const maintenance: CloseMaintenanceInput =
      maint === 'mensal'
        ? {
            kind: 'mensal',
            monthlyValue: Number(monthlyValue) || 0,
            minMonths,
            billingDay,
            startDate: maintStart,
          }
        : maint === 'avulso'
          ? { kind: 'avulso', hourlyRate: Number(hourlyRate) || 0, startDate: avulsoStart }
          : { kind: 'none' }

    setCloseOpen(false)
    await run(
      closeDealWithSetup(
        dealId,
        { total, mode: payMode, count: payCount, firstDate: payFirst, method: payMethod },
        maintenance,
      ),
    )
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

      {/* Wizard: implementação (pagamento) + manutenção */}
      <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Fechar negócio</DialogTitle>
            <DialogDescription>
              Defina o pagamento da implementação e, se houver, a manutenção. Tudo cai no
              Financeiro automaticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] space-y-5 overflow-y-auto pr-1">
            {/* Implementação */}
            <section className="space-y-3">
              <h4 className="text-sm font-semibold">Implementação</h4>
              <div>
                <label className={labelCls} htmlFor="close_value">Valor (R$)</label>
                <input
                  id="close_value"
                  type="number"
                  min="0"
                  step="0.01"
                  value={payValue}
                  onChange={(e) => setPayValue(e.target.value)}
                  placeholder="0,00"
                  className={inputCls}
                />
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="close-pay-mode"
                    className="h-4 w-4 border-border"
                    checked={payMode === 'avista'}
                    onChange={() => setPayMode('avista')}
                  />
                  À vista
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="close-pay-mode"
                    className="h-4 w-4 border-border"
                    checked={payMode === 'parcelado'}
                    onChange={() => setPayMode('parcelado')}
                  />
                  Parcelado
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {payMode === 'parcelado' && (
                  <div>
                    <label className={labelCls} htmlFor="close_count">Parcelas</label>
                    <input
                      id="close_count"
                      type="number"
                      min={2}
                      max={36}
                      value={payCount}
                      onChange={(e) => setPayCount(Math.max(2, Math.min(36, Number(e.target.value) || 2)))}
                      className={inputCls}
                    />
                  </div>
                )}
                <div>
                  <label className={labelCls} htmlFor="close_first">
                    {payMode === 'parcelado' ? '1ª parcela' : 'Vencimento'}
                  </label>
                  <input
                    id="close_first"
                    type="date"
                    value={payFirst}
                    onChange={(e) => setPayFirst(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor="close_method">Método</label>
                  <select
                    id="close_method"
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className={inputCls}
                  >
                    {METHODS.map((m) => (
                      <option key={m} value={m}>{CHARGE_METHOD_LABELS[m]}</option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {/* Manutenção */}
            <section className="space-y-3 border-t border-border pt-4">
              <h4 className="text-sm font-semibold">Manutenção</h4>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="close-maint"
                    className="h-4 w-4 border-border"
                    checked={maint === 'none'}
                    onChange={() => setMaint('none')}
                  />
                  Nenhuma
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="close-maint"
                    className="h-4 w-4 border-border"
                    checked={maint === 'mensal'}
                    onChange={() => setMaint('mensal')}
                  />
                  Mensal
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="close-maint"
                    className="h-4 w-4 border-border"
                    checked={maint === 'avulso'}
                    onChange={() => setMaint('avulso')}
                  />
                  Hora avulsa
                </label>
              </div>

              {maint === 'mensal' && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelCls} htmlFor="close_monthly">Valor mensal (R$)</label>
                    <input
                      id="close_monthly"
                      type="number"
                      min="0"
                      step="0.01"
                      value={monthlyValue}
                      onChange={(e) => setMonthlyValue(e.target.value)}
                      placeholder="0,00"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="close_months">Duração (meses)</label>
                    <input
                      id="close_months"
                      type="number"
                      min={1}
                      max={60}
                      value={minMonths}
                      onChange={(e) => setMinMonths(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="close_day">Dia de cobrança</label>
                    <input
                      id="close_day"
                      type="number"
                      min={1}
                      max={28}
                      value={billingDay}
                      onChange={(e) => setBillingDay(Math.max(1, Math.min(28, Number(e.target.value) || 1)))}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="close_maint_start">Início</label>
                    <input
                      id="close_maint_start"
                      type="date"
                      value={maintStart}
                      onChange={(e) => setMaintStart(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>
              )}

              {maint === 'avulso' && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelCls} htmlFor="close_hourly">Preço por hora (R$)</label>
                    <input
                      id="close_hourly"
                      type="number"
                      min="0"
                      step="0.01"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(e.target.value)}
                      placeholder="0,00"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="close_avulso_start">Início</label>
                    <input
                      id="close_avulso_start"
                      type="date"
                      value={avulsoStart}
                      onChange={(e) => setAvulsoStart(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>
              )}
            </section>
          </div>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline">Cancelar</Button>} />
            <Button type="button" disabled={busy} onClick={() => void submitClose()}>
              {busy ? 'Fechando…' : 'Fechar negócio'}
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
