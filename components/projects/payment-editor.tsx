'use client'

import { useState } from 'react'
import { addMonths, format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import { CheckCircle2, Circle, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EntityBadge } from '@/components/ui/entity-badge'
import {
  CHARGE_STATUS,
  CHARGE_OVERDUE,
  CHARGE_METHOD_LABELS,
  formatCurrency,
  formatDate,
  isOverdue,
} from '@/lib/format'
import { setProjectPayment, type PaymentInstallment } from '@/lib/actions/project'
import { toggleChargePaid } from '@/lib/actions/finance'
import type { ChargeRow } from '@/lib/queries/opportunity-detail'

const inputCls =
  'h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring'
const labelCls = 'mb-1 block text-xs font-medium'

type Mode = 'avista' | 'parcelado'
type Row = { amount: string; dueDate: string; method: string }

const METHODS = Object.keys(CHARGE_METHOD_LABELS) as (keyof typeof CHARGE_METHOD_LABELS)[]

function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

/** Divide o total igualmente em N parcelas (sobra de centavos vai na última). */
function splitEqually(total: number, count: number, firstDate: string, method: string): Row[] {
  const cents = Math.round(total * 100)
  const base = Math.floor(cents / count)
  const remainder = cents - base * count
  return Array.from({ length: count }, (_, i) => {
    const amountCents = base + (i === count - 1 ? remainder : 0)
    const date = firstDate ? format(addMonths(parseISO(firstDate), i), 'yyyy-MM-dd') : ''
    return { amount: (amountCents / 100).toFixed(2), dueDate: date, method }
  })
}

/**
 * Bloco de Pagamento (negócio fechado): define à vista ou parcelado e gera as
 * cobranças que vão para o Financeiro.
 */
export function PaymentEditor({
  projectId,
  dealId,
  companyId,
  totalValue,
  charges,
}: {
  projectId: string
  dealId: string
  companyId: string
  totalValue: number | null
  charges: ChargeRow[]
}) {
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [busyToggleIds, setBusyToggleIds] = useState<string[]>([])
  const [mode, setMode] = useState<Mode>('avista')
  const [count, setCount] = useState(2)
  const [firstDate, setFirstDate] = useState(todayISO())
  const [method, setMethod] = useState<string>('pix')
  const [rows, setRows] = useState<Row[]>([])

  const total = totalValue ?? 0
  const rowsTotal = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0)

  function startEditing() {
    if (charges.length > 0) {
      // Reconfigurar a partir das parcelas existentes.
      setMode(charges.length > 1 ? 'parcelado' : 'avista')
      setCount(Math.max(2, charges.length))
      setMethod(charges[0].method ?? 'pix')
      setRows(
        charges.map((c) => ({
          amount: c.amount.toFixed(2),
          dueDate: c.dueDate,
          method: c.method ?? 'pix',
        })),
      )
    } else {
      setMode('avista')
      setRows([{ amount: total.toFixed(2), dueDate: todayISO(), method: 'pix' }])
    }
    setEditing(true)
  }

  function selectMode(next: Mode) {
    setMode(next)
    if (next === 'avista') {
      setRows([{ amount: total.toFixed(2), dueDate: firstDate, method }])
    } else {
      setRows(splitEqually(total, count, firstDate, method))
    }
  }

  function regenerate(nextCount: number, nextFirst: string, nextMethod: string) {
    setRows(splitEqually(total, nextCount, nextFirst, nextMethod))
  }

  function updateRow(i: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }

  async function handleToggle(chargeId: string, paid: boolean) {
    setBusyToggleIds((prev) => [...prev, chargeId])
    const res = await toggleChargePaid(chargeId, paid, [`/projetos/${dealId}`])
    setBusyToggleIds((prev) => prev.filter((id) => id !== chargeId))
    if (res.success) {
      toast.success(res.message)
    } else {
      toast.error(res.message)
    }
  }

  async function save() {
    const installments: PaymentInstallment[] = rows.map((r) => ({
      amount: Number(r.amount) || 0,
      dueDate: r.dueDate,
      method: r.method || null,
    }))
    setBusy(true)
    const res = await setProjectPayment(projectId, dealId, companyId, installments)
    setBusy(false)
    if (res.success) {
      toast.success(res.message)
      setEditing(false)
    } else {
      toast.error(res.message)
    }
  }

  // --- Modo leitura ---
  if (!editing) {
    return (
      <div className="space-y-3">
        {charges.length === 0 ? (
          <p className="text-sm text-muted-foreground">Pagamento ainda não configurado.</p>
        ) : (
          <ul className="divide-y divide-border">
            {charges.map((c, i) => {
              const overdue = c.status === 'pendente' && isOverdue(c.dueDate)
              const isBusy = busyToggleIds.includes(c.id)
              return (
                <li key={c.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {charges.length > 1 ? `Parcela ${i + 1}/${charges.length}` : 'Pagamento'}
                      {c.method && (
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                          · {CHARGE_METHOD_LABELS[c.method as keyof typeof CHARGE_METHOD_LABELS]}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">Vence {formatDate(c.dueDate)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-mono text-sm tabular-nums">{formatCurrency(c.amount)}</span>
                    <EntityBadge meta={overdue ? CHARGE_OVERDUE : CHARGE_STATUS[c.status]} />
                    {/* Botão de marcar como recebido */}
                    <button
                      type="button"
                      disabled={c.status === 'cancelado' || isBusy}
                      onClick={() => handleToggle(c.id, c.status !== 'pago')}
                      title={c.status === 'pago' ? 'Desmarcar recebimento' : 'Marcar como recebido'}
                      className="text-muted-foreground hover:text-green-600 disabled:opacity-40 dark:hover:text-green-400"
                    >
                      {c.status === 'pago' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <Circle className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        <Button type="button" variant="outline" size="sm" onClick={startEditing}>
          {charges.length === 0 ? 'Configurar pagamento' : 'Reconfigurar'}
        </Button>
      </div>
    )
  }

  // --- Modo edição ---
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="payment-mode"
            className="h-4 w-4 border-border"
            checked={mode === 'avista'}
            onChange={() => selectMode('avista')}
          />
          À vista
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="payment-mode"
            className="h-4 w-4 border-border"
            checked={mode === 'parcelado'}
            onChange={() => selectMode('parcelado')}
          />
          Parcelado
        </label>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        {mode === 'parcelado' && (
          <div>
            <label className={labelCls} htmlFor="pay_count">Parcelas</label>
            <input
              id="pay_count"
              type="number"
              min={2}
              max={36}
              value={count}
              onChange={(e) => {
                const n = Math.max(2, Math.min(36, Number(e.target.value) || 2))
                setCount(n)
                regenerate(n, firstDate, method)
              }}
              className={`${inputCls} w-20`}
            />
          </div>
        )}
        <div>
          <label className={labelCls} htmlFor="pay_first">
            {mode === 'parcelado' ? '1ª parcela' : 'Vencimento'}
          </label>
          <input
            id="pay_first"
            type="date"
            value={firstDate}
            onChange={(e) => {
              setFirstDate(e.target.value)
              if (mode === 'parcelado') regenerate(count, e.target.value, method)
              else updateRow(0, { dueDate: e.target.value })
            }}
            className={`${inputCls} w-44`}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="pay_method">Método</label>
          <select
            id="pay_method"
            value={method}
            onChange={(e) => {
              setMethod(e.target.value)
              setRows((prev) => prev.map((r) => ({ ...r, method: e.target.value })))
            }}
            className={`${inputCls} w-36`}
          >
            {METHODS.map((m) => (
              <option key={m} value={m}>{CHARGE_METHOD_LABELS[m]}</option>
            ))}
          </select>
        </div>
        {method === 'cartao' && (
          <p className="text-xs text-muted-foreground">
            A taxa de maquininha (definida em Configurações · Financeiro) é lançada como
            despesa ao confirmar o recebimento de cada parcela no cartão.
          </p>
        )}
      </div>

      {/* Parcelas (editáveis) */}
      <ul className="space-y-2">
        {rows.map((r, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-xs text-muted-foreground">
              {rows.length > 1 ? `Parc. ${i + 1}` : 'Valor'}
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={r.amount}
              onChange={(e) => updateRow(i, { amount: e.target.value })}
              className={`${inputCls} w-32`}
              aria-label={`Valor da parcela ${i + 1}`}
            />
            <input
              type="date"
              value={r.dueDate}
              onChange={(e) => updateRow(i, { dueDate: e.target.value })}
              className={`${inputCls} w-44`}
              aria-label={`Vencimento da parcela ${i + 1}`}
            />
            {mode === 'parcelado' && rows.length > 1 && (
              <button
                type="button"
                onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
                className="text-muted-foreground hover:text-red-600"
                aria-label="Remover parcela"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </li>
        ))}
      </ul>

      {mode === 'parcelado' && (
        <button
          type="button"
          onClick={() =>
            setRows((prev) => [...prev, { amount: '0.00', dueDate: '', method }])
          }
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar parcela
        </button>
      )}

      <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
        <span className="text-muted-foreground">
          Soma das parcelas:{' '}
          <span
            className={`font-mono tabular-nums ${
              Math.round(rowsTotal * 100) !== Math.round(total * 100)
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-foreground'
            }`}
          >
            {formatCurrency(rowsTotal)}
          </span>
          {total > 0 && <span className="text-muted-foreground"> / {formatCurrency(total)}</span>}
        </span>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => setEditing(false)}>
            Cancelar
          </Button>
          <Button type="button" size="sm" disabled={busy} onClick={save}>
            {busy ? 'Salvando…' : 'Salvar pagamento'}
          </Button>
        </div>
      </div>
    </div>
  )
}
