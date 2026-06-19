'use client'

import { useState } from 'react'
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
import { CHARGE_METHOD_LABELS, formatCurrency } from '@/lib/format'
import { addAvulsoCharge } from '@/lib/actions/project'

const inputCls =
  'h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring'
const labelCls = 'mb-1 block text-xs font-medium'

function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

const METHODS = Object.keys(CHARGE_METHOD_LABELS) as Array<keyof typeof CHARGE_METHOD_LABELS>

/**
 * Dialog de lançamento de serviço avulso (manutenção por hora).
 * Informa descrição + horas → valor = horas × preço/hora (sobreponível) → cria a cobrança.
 */
export function AvulsoChargeDialog({
  open,
  onOpenChange,
  contractId,
  hourlyRate,
  onDone,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  contractId: string
  hourlyRate: number | null
  onDone?: () => void
}) {
  const [description, setDescription] = useState('')
  const [hours, setHours] = useState('')
  const [amount, setAmount] = useState('') // vazio → usa o cálculo horas × preço/hora
  const [dueDate, setDueDate] = useState(todayISO())
  const [method, setMethod] = useState('')
  const [busy, setBusy] = useState(false)

  // Limpa os campos ao fechar — a próxima abertura já vem zerada (sem efeito colateral).
  function handleOpenChange(next: boolean) {
    if (!next) {
      setDescription('')
      setHours('')
      setAmount('')
      setDueDate(todayISO())
      setMethod('')
    }
    onOpenChange(next)
  }

  const hoursNum = Number(hours) || 0
  const computed = hourlyRate != null && hoursNum > 0 ? hoursNum * hourlyRate : 0
  // Valor final: o que o usuário digitou tem prioridade; senão, o cálculo.
  const finalAmount = amount.trim() !== '' ? Number(amount) || 0 : computed

  async function save() {
    if (!description.trim()) {
      toast.error('Descreva o serviço.')
      return
    }
    if (!(finalAmount > 0)) {
      toast.error('Informe as horas (com preço/hora) ou um valor.')
      return
    }
    setBusy(true)
    const res = await addAvulsoCharge(contractId, {
      description: description.trim(),
      hours: hoursNum > 0 ? hoursNum : null,
      amount: finalAmount,
      dueDate,
      method: method || null,
    })
    setBusy(false)
    if (res.success) {
      toast.success(res.message)
      handleOpenChange(false)
      onDone?.()
    } else {
      toast.error(res.message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lançar serviço</DialogTitle>
          <DialogDescription>
            {hourlyRate != null
              ? `Preço/hora: ${formatCurrency(hourlyRate)} — informe as horas e gere a cobrança.`
              : 'Informe o valor do serviço para gerar a cobrança.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className={labelCls} htmlFor="av_desc">
              Descrição <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <input
              id="av_desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex.: ajuste no fluxo de checkout"
              className={inputCls}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <label className={labelCls} htmlFor="av_hours">Horas</label>
              <input
                id="av_hours"
                type="number"
                min="0"
                step="0.5"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="0"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="av_amount">Valor (R$)</label>
              <input
                id="av_amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={computed > 0 ? computed.toFixed(2) : '0,00'}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="av_due">Vencimento</label>
              <input
                id="av_due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
          {amount.trim() === '' && computed > 0 && (
            <p className="text-xs text-muted-foreground">
              Valor calculado: {formatCurrency(computed)} ({hoursNum}h × {formatCurrency(hourlyRate ?? 0)})
            </p>
          )}
          <div>
            <label className={labelCls} htmlFor="av_method">Forma de pagamento</label>
            <select
              id="av_method"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className={inputCls}
            >
              <option value="">—</option>
              {METHODS.map((m) => (
                <option key={m} value={m}>
                  {CHARGE_METHOD_LABELS[m]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline">Cancelar</Button>} />
          <Button type="button" disabled={busy} onClick={() => void save()}>
            {busy ? 'Lançando…' : 'Lançar serviço'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
