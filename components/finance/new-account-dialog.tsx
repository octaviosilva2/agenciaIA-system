'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import { Plus, X } from 'lucide-react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { chargeSchema, accountPayableSchema } from '@/lib/validations/finance'
import {
  CHARGE_METHOD_LABELS,
  NEW_PAYABLE_CATEGORY_LABELS,
  formatCurrency,
  type MockPayableCategory,
} from '@/lib/format'
import type { Charge, AccountPayable } from '@/lib/queries/finance'

// --- Estilos base ---

const inputCls =
  'h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring'
const inputErrCls =
  'h-9 w-full rounded-md border border-red-500 bg-card px-3 text-sm outline-none ring-2 ring-red-500/30'
const labelCls = 'mb-1 block text-xs font-medium'
const errCls = 'mt-1 text-xs text-red-600 dark:text-red-400'

// --- Tipos ---

type AccountType = 'receber' | 'pagar'

/** Tipo de cobrança para A Receber. */
type ReceberTipo = 'implementacao' | 'manutencao' | 'avulso'

/** Forma de pagamento para Implementação. */
type ImplPagamento = 'avista' | 'parcelado' | 'sla'

/** Duração para Manutenção. */
type ManutDuracao = 'recorrente' | 'contrato'

/** Etapa de pagamento do SLA. */
type SlaStage = { pct: string; date: string }

/** Tipo de lançamento para A Pagar. */
type PagarLaunchType = 'unico' | 'parcelado' | 'recorrente'
type RecurrenceFreq = 'semanal' | 'mensal' | 'anual'

// --- Constantes ---

const METHODS = Object.keys(CHARGE_METHOD_LABELS) as Array<keyof typeof CHARGE_METHOD_LABELS>
const CATEGORIES = Object.keys(NEW_PAYABLE_CATEGORY_LABELS) as Array<MockPayableCategory>

function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

function addMonthsISO(dateStr: string, months: number): string {
  const d = parseISO(dateStr)
  d.setMonth(d.getMonth() + months)
  return format(d, 'yyyy-MM-dd')
}

function defaultSlaStages(): SlaStage[] {
  const today = todayISO()
  return [
    { pct: '30', date: today },
    { pct: '70', date: addMonthsISO(today, 1) },
  ]
}

// --- Estilos de segmento ---

const segCls = (active: boolean) =>
  `flex h-8 flex-1 cursor-pointer items-center justify-center rounded-[6px] px-2.5 text-sm font-medium transition-colors ${
    active
      ? 'bg-primary text-primary-foreground'
      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
  }`

const seg3Cls = (active: boolean) =>
  `flex h-7 flex-1 cursor-pointer items-center justify-center rounded-[4px] px-2 text-xs font-medium transition-colors ${
    active
      ? 'bg-primary text-primary-foreground'
      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
  }`

// --- Gerador de datas para A Pagar ---

function generatePayableDates(
  baseDateStr: string,
  launchType: PagarLaunchType,
  installments: number,
  recurrenceFreq: RecurrenceFreq,
  recurrenceCount: number,
  recurrenceInfinite: boolean,
): string[] {
  const base = parseISO(baseDateStr)
  if (launchType === 'unico') return [baseDateStr]
  if (launchType === 'parcelado') {
    return Array.from({ length: installments }, (_, i) => {
      const d = new Date(base)
      d.setMonth(d.getMonth() + i)
      return format(d, 'yyyy-MM-dd')
    })
  }
  const n = recurrenceInfinite ? 24 : recurrenceCount
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(base)
    if (recurrenceFreq === 'semanal') d.setDate(d.getDate() + i * 7)
    else if (recurrenceFreq === 'mensal') d.setMonth(d.getMonth() + i)
    else d.setFullYear(d.getFullYear() + i)
    return format(d, 'yyyy-MM-dd')
  })
}

/**
 * "+ Nova conta": cria A Receber com tipo semântico (Implementação / Manutenção / Avulso)
 * ou A Pagar com lançamento único/parcelado/recorrente.
 * Tudo MOCK — entrega objetos prontos via callback.
 */
export function NewAccountDialog({
  onCreateCharges,
  onCreatePayables,
}: {
  onCreateCharges: (charges: Charge[]) => void
  onCreatePayables: (payables: AccountPayable[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<AccountType>('receber')

  // --- Campos comuns ---
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState(todayISO())
  const [method, setMethod] = useState('')
  const [cardFeeRate, setCardFeeRate] = useState('2.5') // taxa maquininha (%)
  const [alreadyPaid, setAlreadyPaid] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // --- A Receber ---
  const [receberTipo, setReceberTipo] = useState<ReceberTipo>('avulso')
  const [implPagamento, setImplPagamento] = useState<ImplPagamento>('avista')
  const [implInstallments, setImplInstallments] = useState('3')
  const [slaStages, setSlaStages] = useState<SlaStage[]>(defaultSlaStages)
  const [manutDuracao, setManutDuracao] = useState<ManutDuracao>('recorrente')
  const [manutMeses, setManutMeses] = useState('12')

  // --- A Pagar ---
  const [category, setCategory] = useState<MockPayableCategory>('fixo')
  const [supplier, setSupplier] = useState('')
  const [pagarLaunchType, setPagarLaunchType] = useState<PagarLaunchType>('unico')
  const [pagarInstallments, setPagarInstallments] = useState('2')
  const [recurrenceFreq, setRecurrenceFreq] = useState<RecurrenceFreq>('mensal')
  const [recurrenceCount, setRecurrenceCount] = useState('12')
  const [recurrenceInfinite, setRecurrenceInfinite] = useState(false)

  // --- Derivados ---

  const amountNum = parseFloat(amount)
  const implInstNum = Math.max(2, parseInt(implInstallments) || 2)
  const pagarInstNum = Math.max(2, parseInt(pagarInstallments) || 2)
  const slaTotal = slaStages.reduce((sum, s) => sum + (parseFloat(s.pct) || 0), 0)
  const recurrenceTotal = recurrenceInfinite ? 24 : Math.max(2, parseInt(recurrenceCount) || 2)

  // --- Helpers SLA ---

  function addSlaStage() {
    setSlaStages((prev) => {
      const lastDate = prev[prev.length - 1]?.date || dueDate
      const usedPct = prev.reduce((sum, s) => sum + (parseFloat(s.pct) || 0), 0)
      return [
        ...prev,
        { pct: String(Math.max(0, 100 - usedPct)), date: addMonthsISO(lastDate, 1) },
      ]
    })
  }

  function removeSlaStage(i: number) {
    if (i === 0) return
    setSlaStages((prev) => prev.filter((_, idx) => idx !== i))
  }

  function updateSlaStage(i: number, field: keyof SlaStage, value: string) {
    setSlaStages((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)))
  }

  // --- Reset ---

  function reset() {
    setType('receber')
    setDescription('')
    setAmount('')
    setDueDate(todayISO())
    setMethod('')
    setCardFeeRate('2.5')
    setAlreadyPaid(false)
    setErrors({})
    setReceberTipo('avulso')
    setImplPagamento('avista')
    setImplInstallments('3')
    setSlaStages(defaultSlaStages())
    setManutDuracao('recorrente')
    setManutMeses('12')
    setCategory('fixo')
    setSupplier('')
    setPagarLaunchType('unico')
    setPagarInstallments('2')
    setRecurrenceFreq('mensal')
    setRecurrenceCount('12')
    setRecurrenceInfinite(false)
  }

  // --- Save ---

  function save() {
    if (!description.trim()) { setErrors({ description: 'Descrição é obrigatória' }); return }
    if (isNaN(amountNum) || amountNum <= 0) { setErrors({ amount: 'Valor inválido' }); return }

    const paidAt = alreadyPaid ? new Date().toISOString() : null
    const status = alreadyPaid ? ('pago' as const) : ('pendente' as const)

    // ==============================
    // A RECEBER
    // ==============================
    if (type === 'receber') {
      const charges: Charge[] = []

      // --- Avulso ---
      if (receberTipo === 'avulso') {
        if (!dueDate) { setErrors({ due_date: 'Data obrigatória' }); return }
        charges.push({
          id: `c-${Date.now()}-0`,
          company_id: null, project_id: null, contract_id: null,
          description,
          kind: 'avulso',
          amount: amountNum,
          due_date: dueDate,
          status,
          method: (method as Charge['method']) || null,
          paid_at: paidAt,
          notes: null,
          origin_label: null,
        })
      }

      // --- Implementação ---
      else if (receberTipo === 'implementacao') {
        if (implPagamento === 'avista') {
          if (!dueDate) { setErrors({ due_date: 'Data obrigatória' }); return }
          charges.push({
            id: `c-${Date.now()}-0`,
            company_id: null, project_id: null, contract_id: null,
            description,
            kind: 'setup',
            amount: amountNum,
            due_date: dueDate,
            status,
            method: (method as Charge['method']) || null,
            paid_at: paidAt,
            notes: null,
            origin_label: null,
          })
        } else if (implPagamento === 'parcelado') {
          if (!dueDate) { setErrors({ due_date: 'Data obrigatória' }); return }
          const amountPer = amountNum / implInstNum
          for (let i = 0; i < implInstNum; i++) {
            const d = parseISO(dueDate)
            d.setMonth(d.getMonth() + i)
            charges.push({
              id: `c-${Date.now()}-${i}`,
              company_id: null, project_id: null, contract_id: null,
              description: `${description} (${i + 1}/${implInstNum})`,
              kind: 'setup',
              amount: amountPer,
              due_date: format(d, 'yyyy-MM-dd'),
              status,
              method: (method as Charge['method']) || null,
              paid_at: paidAt,
              notes: null,
              origin_label: null,
            })
          }
        } else {
          // SLA — valida etapas
          if (Math.round(slaTotal) !== 100) {
            setErrors({ sla: `A soma das etapas deve ser 100% (atual: ${slaTotal}%)` })
            return
          }
          const invalid = slaStages.find((s) => !s.date || !(parseFloat(s.pct) > 0))
          if (invalid) { setErrors({ sla: 'Todas as etapas precisam de data e percentual válidos' }); return }

          slaStages.forEach((stage, i) => {
            const pct = parseFloat(stage.pct) / 100
            const label = i === 0 ? 'Entrada' : `Etapa ${i + 1}`
            charges.push({
              id: `c-${Date.now()}-${i}`,
              company_id: null, project_id: null, contract_id: null,
              description: `${description} — ${label} (${stage.pct}%)`,
              kind: 'setup',
              amount: amountNum * pct,
              due_date: stage.date,
              status,
              method: (method as Charge['method']) || null,
              paid_at: paidAt,
              notes: null,
              origin_label: null,
            })
          })
        }
      }

      // --- Manutenção ---
      else {
        if (!dueDate) { setErrors({ due_date: 'Data obrigatória' }); return }
        const months = manutDuracao === 'recorrente' ? 24 : Math.max(1, parseInt(manutMeses) || 1)
        for (let i = 0; i < months; i++) {
          const d = parseISO(dueDate)
          d.setMonth(d.getMonth() + i)
          charges.push({
            id: `c-${Date.now()}-${i}`,
            company_id: null, project_id: null, contract_id: null,
            description,
            kind: 'recorrencia',
            amount: amountNum,
            due_date: format(d, 'yyyy-MM-dd'),
            status,
            method: (method as Charge['method']) || null,
            paid_at: paidAt,
            notes: null,
            origin_label: null,
          })
        }
      }

      onCreateCharges(charges)

      // Gera despesa de taxa de maquininha quando método = cartão
      const feeRate = parseFloat(cardFeeRate)
      if (method === 'cartao' && feeRate > 0) {
        const feePayables: AccountPayable[] = charges.map((charge) => ({
          id: `auto-card-fee-${charge.id}`,
          description: `Taxa maquininha (${cardFeeRate}%) — ${charge.description}`,
          category: 'variavel' as const,
          amount: charge.amount * (feeRate / 100),
          due_date: charge.due_date,
          status,
          paid_at: paidAt,
          project_id: null,
          supplier: null,
          notes: null,
        }))
        onCreatePayables(feePayables)
      }

      toast.success(
        charges.length > 1 ? `${charges.length} cobranças criadas.` : 'Conta a receber criada.',
      )
      setOpen(false)
      return
    }

    // ==============================
    // A PAGAR
    // ==============================
    if (!dueDate) { setErrors({ due_date: 'Data obrigatória' }); return }

    const dates = generatePayableDates(
      dueDate,
      pagarLaunchType,
      pagarInstNum,
      recurrenceFreq,
      Math.max(2, parseInt(recurrenceCount) || 2),
      recurrenceInfinite,
    )
    const amountPer = pagarLaunchType === 'parcelado' ? amountNum / dates.length : amountNum

    // Valida schema do primeiro item
    const parsed = accountPayableSchema.safeParse({
      description,
      category,
      amount: amountPer,
      due_date: dueDate,
      status,
      supplier: supplier || null,
    })
    if (!parsed.success) { setErrors(fieldErrors(parsed.error)); return }

    const payables: AccountPayable[] = dates.map((date, i) => ({
      id: `p-${Date.now()}-${i}`,
      description:
        pagarLaunchType === 'parcelado' && dates.length > 1
          ? `${description} (${i + 1}/${dates.length})`
          : description,
      category: parsed.data.category,
      amount: amountPer,
      due_date: date,
      status,
      paid_at: paidAt,
      project_id: null,
      supplier: parsed.data.supplier ?? null,
      notes: null,
    }))

    onCreatePayables(payables)
    toast.success(
      payables.length > 1 ? `${payables.length} contas criadas.` : 'Conta a pagar criada.',
    )
    setOpen(false)
  }

  // --- Render ---

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o) reset()
      }}
    >
      <DialogTrigger
        render={
          <Button type="button" size="sm">
            <Plus className="h-4 w-4" />
            Nova conta
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova conta</DialogTitle>
          <DialogDescription>Lance uma conta a receber ou a pagar.</DialogDescription>
        </DialogHeader>

        {/* Toggle A Receber / A Pagar */}
        <div className="inline-flex w-full items-center rounded-md border border-border bg-card p-0.5">
          <button type="button" onClick={() => setType('receber')} aria-pressed={type === 'receber'} className={segCls(type === 'receber')}>
            A Receber
          </button>
          <button type="button" onClick={() => setType('pagar')} aria-pressed={type === 'pagar'} className={segCls(type === 'pagar')}>
            A Pagar
          </button>
        </div>

        <div className="space-y-3">

          {/* ============================================================
              A RECEBER
          ============================================================ */}
          {type === 'receber' && (
            <>
              {/* Tipo de cobrança */}
              <div>
                <p className={labelCls}>Tipo de cobrança</p>
                <div className="inline-flex w-full items-center rounded-md border border-border bg-card p-0.5">
                  <button type="button" onClick={() => setReceberTipo('implementacao')} className={segCls(receberTipo === 'implementacao')}>
                    Implementação
                  </button>
                  <button type="button" onClick={() => setReceberTipo('manutencao')} className={segCls(receberTipo === 'manutencao')}>
                    Manutenção
                  </button>
                  <button type="button" onClick={() => setReceberTipo('avulso')} className={segCls(receberTipo === 'avulso')}>
                    Avulso
                  </button>
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className={labelCls} htmlFor="na_desc">
                  Descrição <span className="text-red-600 dark:text-red-400">*</span>
                </label>
                <input
                  id="na_desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={
                    receberTipo === 'implementacao'
                      ? 'Ex.: CRM Moda em Foco'
                      : receberTipo === 'manutencao'
                        ? 'Ex.: Manutenção mensal — DentalCare'
                        : 'Ex.: Consultoria avulsa'
                  }
                  className={errors.description ? inputErrCls : inputCls}
                  autoFocus
                />
                {errors.description && <p className={errCls}>{errors.description}</p>}
              </div>

              {/* Valor */}
              <div>
                <label className={labelCls} htmlFor="na_amount">
                  {receberTipo === 'implementacao' && implPagamento === 'sla'
                    ? 'Valor total do contrato (R$)'
                    : receberTipo === 'manutencao'
                      ? 'Valor mensal (R$)'
                      : 'Valor (R$)'}{' '}
                  <span className="text-red-600 dark:text-red-400">*</span>
                </label>
                <input
                  id="na_amount"
                  type="number" min="0" step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                  className={errors.amount ? inputErrCls : inputCls}
                />
                {errors.amount && <p className={errCls}>{errors.amount}</p>}
              </div>

              {/* ---- IMPLEMENTAÇÃO ---- */}
              {receberTipo === 'implementacao' && (
                <>
                  <div>
                    <p className={labelCls}>Forma de pagamento</p>
                    <div className="inline-flex w-full items-center rounded-md border border-border bg-card p-0.5">
                      <button type="button" onClick={() => setImplPagamento('avista')} className={seg3Cls(implPagamento === 'avista')}>
                        À vista
                      </button>
                      <button type="button" onClick={() => setImplPagamento('parcelado')} className={seg3Cls(implPagamento === 'parcelado')}>
                        Parcelado
                      </button>
                      <button type="button" onClick={() => setImplPagamento('sla')} className={seg3Cls(implPagamento === 'sla')}>
                        SLA / Etapas
                      </button>
                    </div>
                  </div>

                  {/* À vista */}
                  {implPagamento !== 'sla' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls} htmlFor="na_due">
                          {implPagamento === 'parcelado' ? '1ª parcela' : 'Vencimento'}{' '}
                          <span className="text-red-600 dark:text-red-400">*</span>
                        </label>
                        <input
                          id="na_due" type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          className={errors.due_date ? inputErrCls : inputCls}
                        />
                        {errors.due_date && <p className={errCls}>{errors.due_date}</p>}
                      </div>
                      <div>
                        <label className={labelCls} htmlFor="na_method">Forma de recebimento</label>
                        <select id="na_method" value={method} onChange={(e) => setMethod(e.target.value)} className={inputCls}>
                          <option value="">—</option>
                          {METHODS.map((m) => <option key={m} value={m}>{CHARGE_METHOD_LABELS[m]}</option>)}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Parcelado: número de parcelas */}
                  {implPagamento === 'parcelado' && (
                    <div>
                      <label className={labelCls} htmlFor="na_impl_inst">Número de parcelas</label>
                      <input
                        id="na_impl_inst" type="number" min="2" max="60"
                        value={implInstallments}
                        onChange={(e) => setImplInstallments(e.target.value)}
                        className={inputCls}
                      />
                      {!isNaN(amountNum) && amountNum > 0 && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {implInstNum}× de {formatCurrency(amountNum / implInstNum)} — total {formatCurrency(amountNum)}
                        </p>
                      )}
                    </div>
                  )}

                  {/* SLA: etapas configuráveis */}
                  {implPagamento === 'sla' && (
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <p className={labelCls}>Etapas de pagamento</p>
                        <span
                          className={`text-xs font-medium ${
                            Math.round(slaTotal) === 100
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          Total: {slaTotal}%
                        </span>
                      </div>
                      <div className="space-y-2">
                        {slaStages.map((stage, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <input
                                type="number" min="1" max="100"
                                value={stage.pct}
                                onChange={(e) => updateSlaStage(i, 'pct', e.target.value)}
                                className="h-9 w-14 rounded-md border border-border bg-card px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                              />
                              <span className="text-xs text-muted-foreground">%</span>
                            </div>
                            <input
                              type="date"
                              value={stage.date}
                              onChange={(e) => updateSlaStage(i, 'date', e.target.value)}
                              className="h-9 flex-1 rounded-md border border-border bg-card px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                            />
                            <span className="min-w-[48px] text-xs text-muted-foreground">
                              {i === 0 ? 'entrada' : `etapa ${i + 1}`}
                            </span>
                            {i > 0 ? (
                              <button
                                type="button"
                                onClick={() => removeSlaStage(i)}
                                className="cursor-pointer rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            ) : (
                              <div className="h-7 w-7" /> // Placeholder para manter alinhamento
                            )}
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={addSlaStage}
                        className="mt-2 cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground"
                      >
                        + Adicionar etapa
                      </button>

                      {/* Preview dos valores */}
                      {!isNaN(amountNum) && amountNum > 0 && (
                        <div className="mt-2 space-y-0.5 rounded-md bg-muted/50 px-3 py-2">
                          {slaStages.map((s, i) => {
                            const pct = parseFloat(s.pct) || 0
                            return (
                              <p key={i} className="flex justify-between text-xs text-muted-foreground">
                                <span>{i === 0 ? 'Entrada' : `Etapa ${i + 1}`} ({s.pct}%)</span>
                                <span className="font-mono font-medium">{formatCurrency(amountNum * pct / 100)}</span>
                              </p>
                            )
                          })}
                        </div>
                      )}

                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div>
                          {/* Forma de recebimento para SLA */}
                          <label className={labelCls} htmlFor="na_sla_method">Forma de recebimento</label>
                          <select id="na_sla_method" value={method} onChange={(e) => setMethod(e.target.value)} className={inputCls}>
                            <option value="">—</option>
                            {METHODS.map((m) => <option key={m} value={m}>{CHARGE_METHOD_LABELS[m]}</option>)}
                          </select>
                        </div>
                      </div>
                      {errors.sla && <p className={errCls}>{errors.sla}</p>}
                    </div>
                  )}
                </>
              )}

              {/* ---- MANUTENÇÃO ---- */}
              {receberTipo === 'manutencao' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls} htmlFor="na_manut_due">
                        1ª cobrança <span className="text-red-600 dark:text-red-400">*</span>
                      </label>
                      <input
                        id="na_manut_due" type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className={errors.due_date ? inputErrCls : inputCls}
                      />
                      {errors.due_date && <p className={errCls}>{errors.due_date}</p>}
                    </div>
                    <div>
                      <label className={labelCls} htmlFor="na_manut_method">Forma de recebimento</label>
                      <select id="na_manut_method" value={method} onChange={(e) => setMethod(e.target.value)} className={inputCls}>
                        <option value="">—</option>
                        {METHODS.map((m) => <option key={m} value={m}>{CHARGE_METHOD_LABELS[m]}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <p className={labelCls}>Duração</p>
                    <div className="inline-flex w-full items-center rounded-md border border-border bg-card p-0.5">
                      <button type="button" onClick={() => setManutDuracao('recorrente')} className={segCls(manutDuracao === 'recorrente')}>
                        Todo mês
                      </button>
                      <button type="button" onClick={() => setManutDuracao('contrato')} className={segCls(manutDuracao === 'contrato')}>
                        Por contrato
                      </button>
                    </div>
                  </div>

                  {manutDuracao === 'contrato' && (
                    <div>
                      <label className={labelCls} htmlFor="na_manut_meses">Duração (meses)</label>
                      <input
                        id="na_manut_meses" type="number" min="1" max="60"
                        value={manutMeses}
                        onChange={(e) => setManutMeses(e.target.value)}
                        className={inputCls}
                      />
                      {!isNaN(amountNum) && amountNum > 0 && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {manutMeses}× de {formatCurrency(amountNum)} — total {formatCurrency(amountNum * (parseInt(manutMeses) || 1))}
                        </p>
                      )}
                    </div>
                  )}

                  {manutDuracao === 'recorrente' && (
                    <p className="text-xs text-muted-foreground">
                      Serão criadas 24 cobranças mensais (2 anos à frente).
                    </p>
                  )}
                </>
              )}

              {/* ---- AVULSO ---- */}
              {receberTipo === 'avulso' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls} htmlFor="na_avulso_due">
                      Vencimento <span className="text-red-600 dark:text-red-400">*</span>
                    </label>
                    <input
                      id="na_avulso_due" type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className={errors.due_date ? inputErrCls : inputCls}
                    />
                    {errors.due_date && <p className={errCls}>{errors.due_date}</p>}
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="na_avulso_method">Forma de recebimento</label>
                    <select id="na_avulso_method" value={method} onChange={(e) => setMethod(e.target.value)} className={inputCls}>
                      <option value="">—</option>
                      {METHODS.map((m) => <option key={m} value={m}>{CHARGE_METHOD_LABELS[m]}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {/* Taxa maquininha — aparece quando método = cartão */}
              {method === 'cartao' && (
                <div className="rounded-md bg-muted/50 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <label className={labelCls} htmlFor="na_card_fee">
                        Taxa maquininha (%)
                      </label>
                      <input
                        id="na_card_fee"
                        type="number"
                        min="0"
                        max="20"
                        step="0.1"
                        value={cardFeeRate}
                        onChange={(e) => setCardFeeRate(e.target.value)}
                        className="h-9 w-24 rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    {!isNaN(amountNum) && amountNum > 0 && parseFloat(cardFeeRate) > 0 && (
                      <p className="pt-4 text-xs text-muted-foreground">
                        Taxa: {formatCurrency(amountNum * parseFloat(cardFeeRate) / 100)}<br />
                        <span className="font-medium text-foreground">Líquido: {formatCurrency(amountNum * (1 - parseFloat(cardFeeRate) / 100))}</span>
                      </p>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    A taxa será lançada como despesa variável automaticamente.
                  </p>
                </div>
              )}

              {/* Já recebido */}
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox checked={alreadyPaid} onCheckedChange={(v) => setAlreadyPaid(v === true)} />
                <span>Lançar como já recebido</span>
              </label>
            </>
          )}

          {/* ============================================================
              A PAGAR
          ============================================================ */}
          {type === 'pagar' && (
            <>
              {/* Descrição */}
              <div>
                <label className={labelCls} htmlFor="na_desc_pagar">
                  Descrição <span className="text-red-600 dark:text-red-400">*</span>
                </label>
                <input
                  id="na_desc_pagar"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex.: licença de ferramenta"
                  className={errors.description ? inputErrCls : inputCls}
                  autoFocus
                />
                {errors.description && <p className={errCls}>{errors.description}</p>}
              </div>

              {/* Valor + Vencimento */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls} htmlFor="na_amount_pagar">
                    Valor (R$) <span className="text-red-600 dark:text-red-400">*</span>
                  </label>
                  <input
                    id="na_amount_pagar" type="number" min="0" step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0,00"
                    className={errors.amount ? inputErrCls : inputCls}
                  />
                  {errors.amount && <p className={errCls}>{errors.amount}</p>}
                </div>
                <div>
                  <label className={labelCls} htmlFor="na_due_pagar">
                    {pagarLaunchType === 'parcelado' ? '1ª parcela' : pagarLaunchType === 'recorrente' ? '1ª cobrança' : 'Vencimento'}{' '}
                    <span className="text-red-600 dark:text-red-400">*</span>
                  </label>
                  <input
                    id="na_due_pagar" type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className={errors.due_date ? inputErrCls : inputCls}
                  />
                  {errors.due_date && <p className={errCls}>{errors.due_date}</p>}
                </div>
              </div>

              {/* Categoria + Fornecedor */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls} htmlFor="na_category">Categoria</label>
                  <select id="na_category" value={category} onChange={(e) => setCategory(e.target.value as MockPayableCategory)} className={inputCls}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{NEW_PAYABLE_CATEGORY_LABELS[c]}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls} htmlFor="na_supplier">Fornecedor</label>
                  <input id="na_supplier" value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Opcional" className={inputCls} />
                </div>
              </div>

              {/* Divisor */}
              <div className="border-t border-border" />

              {/* Tipo de lançamento */}
              <div>
                <p className={labelCls}>Tipo de lançamento</p>
                <div className="inline-flex w-full items-center rounded-md border border-border bg-card p-0.5">
                  {(['unico', 'parcelado', 'recorrente'] as PagarLaunchType[]).map((t) => (
                    <button key={t} type="button" onClick={() => setPagarLaunchType(t)} className={segCls(pagarLaunchType === t)}>
                      {t === 'unico' ? 'Único' : t === 'parcelado' ? 'Parcelado' : 'Recorrente'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Parcelado */}
              {pagarLaunchType === 'parcelado' && (
                <div>
                  <label className={labelCls} htmlFor="na_inst">Número de parcelas</label>
                  <input id="na_inst" type="number" min="2" max="60" value={pagarInstallments} onChange={(e) => setPagarInstallments(e.target.value)} className={inputCls} />
                  {!isNaN(amountNum) && amountNum > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {pagarInstNum}× de {formatCurrency(amountNum / pagarInstNum)} — total {formatCurrency(amountNum)}
                    </p>
                  )}
                </div>
              )}

              {/* Recorrente */}
              {pagarLaunchType === 'recorrente' && (
                <div className="space-y-3">
                  <div>
                    <label className={labelCls} htmlFor="na_freq">Frequência</label>
                    <select id="na_freq" value={recurrenceFreq} onChange={(e) => setRecurrenceFreq(e.target.value as RecurrenceFreq)} className={inputCls}>
                      <option value="semanal">Semanal</option>
                      <option value="mensal">Mensal</option>
                      <option value="anual">Anual</option>
                    </select>
                  </div>
                  <div>
                    <p className={labelCls}>Duração</p>
                    <div className="flex flex-col gap-2">
                      <label className="flex cursor-pointer items-center gap-2 text-sm">
                        <input type="radio" name="rec_dur" checked={!recurrenceInfinite} onChange={() => setRecurrenceInfinite(false)} className="cursor-pointer" />
                        <span className="text-muted-foreground">Por</span>
                        <input type="number" min="2" max="120" value={recurrenceCount} onChange={(e) => setRecurrenceCount(e.target.value)} disabled={recurrenceInfinite} className="h-8 w-16 rounded-md border border-border bg-card px-2 text-sm disabled:opacity-50" />
                        <span className="text-muted-foreground">vezes</span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-2 text-sm">
                        <input type="radio" name="rec_dur" checked={recurrenceInfinite} onChange={() => setRecurrenceInfinite(true)} className="cursor-pointer" />
                        <span>Sem parar (todo {recurrenceFreq === 'semanal' ? 'semana' : recurrenceFreq === 'anual' ? 'ano' : 'mês'})</span>
                      </label>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Serão criadas {recurrenceTotal} cobranças{recurrenceInfinite ? ' (2 anos à frente)' : ''}.
                    </p>
                  </div>
                </div>
              )}

              {/* Já pago */}
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox checked={alreadyPaid} onCheckedChange={(v) => setAlreadyPaid(v === true)} />
                <span>Lançar como já pago</span>
              </label>
            </>
          )}
        </div>

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline">Cancelar</Button>} />
          <Button type="button" onClick={save}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Achata os erros do zod em { campo: primeira mensagem }. */
function fieldErrors(error: import('zod').ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path[0]
    if (typeof key === 'string' && !(key in out)) {
      out[key] = issue.message
    }
  }
  return out
}
