'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import { AlertCircle, ChevronRight, ListChecks } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EntityBadge } from '@/components/ui/entity-badge'
import {
  CHARGE_OVERDUE,
  CHARGE_STATUS,
  CONTRACT_KIND_LABELS,
  formatCurrency,
  formatDate,
  isOverdue,
} from '@/lib/format'
import { setMaintenanceContract, setAvulsoContract } from '@/lib/actions/project'
import { generateRecurrences } from '@/lib/rules/recurrence'
import { ContractStatusMenu } from '@/components/projects/contract-status-menu'
import { ContractManageActions } from '@/components/projects/contract-manage-actions'
import type { ChargeRow, MaintenanceContract } from '@/lib/queries/opportunity-detail'

const inputCls =
  'h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring'
const labelCls = 'mb-1 block text-xs font-medium'

function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  )
}

/**
 * Bloco de Manutenção (negócio fechado). Suporta dois tipos:
 * - Mensal: cria o contrato mensal e gera as parcelas recorrentes (charges 'recorrencia').
 * - Hora avulsa: define o preço/hora; os serviços são lançados sob demanda (charges 'avulso').
 */
export function MaintenanceEditor({
  projectId,
  dealId,
  companyId,
  projectName,
  contract,
  charges,
  hasMaintenance,
}: {
  projectId: string
  dealId: string
  companyId: string
  projectName: string
  contract: MaintenanceContract | null
  charges: ChargeRow[]
  hasMaintenance: boolean | null
}) {
  // Form mensal
  const [editing, setEditing] = useState(false)
  const [monthlyValue, setMonthlyValue] = useState('')
  const [minMonths, setMinMonths] = useState(12)
  const [billingDay, setBillingDay] = useState(10)
  const [startDate, setStartDate] = useState(todayISO())
  // Form avulso
  const [editingAvulso, setEditingAvulso] = useState(false)
  const [hourlyRate, setHourlyRate] = useState('')
  const [open, setOpen] = useState(false)
  const [showAllCharges, setShowAllCharges] = useState(false)
  const [busy, setBusy] = useState(false)

  const isAvulso = contract?.kind === 'avulso'

  function startEditing() {
    if (contract) {
      setMonthlyValue(contract.monthlyValue != null ? contract.monthlyValue.toFixed(2) : '')
      setMinMonths(contract.minMonths ?? 12)
      setBillingDay(contract.billingDay ?? 10)
      setStartDate(contract.startDate ?? todayISO())
    } else {
      setMonthlyValue('')
      setMinMonths(12)
      setBillingDay(10)
      setStartDate(todayISO())
    }
    setEditing(true)
  }

  function startEditingAvulso() {
    setHourlyRate(contract?.hourlyRate != null ? contract.hourlyRate.toFixed(2) : '')
    setEditingAvulso(true)
  }

  // Prévia das parcelas mensais (mesma regra pura do backend).
  const value = Number(monthlyValue) || 0
  const preview =
    value > 0 && startDate
      ? generateRecurrences({
          contractId: '',
          startDate: parseISO(startDate),
          minMonths,
          billingDay,
          monthlyValue: value,
        })
      : []
  const previewTotal = value * minMonths

  async function save() {
    setBusy(true)
    const res = await setMaintenanceContract(
      projectId,
      dealId,
      companyId,
      projectName,
      contract?.id ?? null,
      { monthlyValue: value, minMonths, billingDay, startDate },
    )
    setBusy(false)
    if (res.success) {
      toast.success(res.message)
      setEditing(false)
    } else {
      toast.error(res.message)
    }
  }

  async function saveAvulso() {
    setBusy(true)
    const res = await setAvulsoContract(
      projectId,
      dealId,
      companyId,
      projectName,
      contract?.id ?? null,
      { hourlyRate: Number(hourlyRate) || 0, startDate: contract?.startDate ?? todayISO() },
    )
    setBusy(false)
    if (res.success) {
      toast.success(res.message)
      setEditingAvulso(false)
    } else {
      toast.error(res.message)
    }
  }

  // --- Form mensal ---
  if (editing) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className={labelCls} htmlFor="mnt_value">Valor mensal</label>
            <input
              id="mnt_value"
              type="number"
              min="0"
              step="0.01"
              value={monthlyValue}
              onChange={(e) => setMonthlyValue(e.target.value)}
              placeholder="0,00"
              className={`${inputCls} w-32`}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="mnt_months">Duração (meses)</label>
            <input
              id="mnt_months"
              type="number"
              min={1}
              max={60}
              value={minMonths}
              onChange={(e) => setMinMonths(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
              className={`${inputCls} w-24`}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="mnt_day">Dia de cobrança</label>
            <input
              id="mnt_day"
              type="number"
              min={1}
              max={28}
              value={billingDay}
              onChange={(e) => setBillingDay(Math.max(1, Math.min(28, Number(e.target.value) || 1)))}
              className={`${inputCls} w-24`}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="mnt_start">Início</label>
            <input
              id="mnt_start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={`${inputCls} w-44`}
            />
          </div>
        </div>

        {preview.length > 0 ? (
          <ul className="max-h-48 space-y-1 overflow-y-auto border-t border-border pt-3">
            {preview.map((p, i) => (
              <li key={i} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground">
                  {p.description}
                  <span className="ml-1.5 text-xs">· vence {formatDate(p.due_date)}</span>
                </span>
                <span className="font-mono tabular-nums">{formatCurrency(p.amount)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="border-t border-border pt-3 text-sm text-muted-foreground">
            Informe o valor mensal para gerar as parcelas.
          </p>
        )}

        <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
          <span className="text-muted-foreground">
            Total do contrato:{' '}
            <span className="font-mono tabular-nums text-foreground">
              {formatCurrency(previewTotal)}
            </span>
            <span className="text-muted-foreground"> · {minMonths}x</span>
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => setEditing(false)}
            >
              Cancelar
            </Button>
            <Button type="button" size="sm" disabled={busy} onClick={save}>
              {busy ? 'Salvando…' : 'Salvar contrato'}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // --- Form avulso (preço/hora) ---
  if (editingAvulso) {
    return (
      <div className="space-y-3">
        <div>
          <label className={labelCls} htmlFor="mnt_rate">Preço por hora</label>
          <input
            id="mnt_rate"
            type="number"
            min="0"
            step="0.01"
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
            placeholder="0,00"
            className={`${inputCls} w-32`}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Sem mensalidade — você lança cada serviço (horas × preço) quando atender o cliente.
        </p>
        <div className="flex justify-end gap-2 border-t border-border pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => setEditingAvulso(false)}
          >
            Cancelar
          </Button>
          <Button type="button" size="sm" disabled={busy} onClick={saveAvulso}>
            {busy ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      </div>
    )
  }

  // --- Leitura: sem contrato ---
  if (!contract) {
    return (
      <div className="space-y-3">
        {hasMaintenance && (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-500/30 dark:bg-amber-500/10">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <p>
              Negócio fechado <span className="font-medium">com manutenção</span>, mas o contrato
              ainda não foi criado.
            </p>
          </div>
        )}
        <p className="text-sm text-muted-foreground">
          {hasMaintenance ? 'Escolha o tipo de manutenção:' : 'Fechado sem manutenção mensal.'}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={startEditing}>
            Manutenção mensal
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={startEditingAvulso}>
            Hora avulsa
          </Button>
        </div>
      </div>
    )
  }

  // --- Leitura: contrato avulso (enxuto: detalhes + reconfigurar + abrir tela) ---
  // Lançar serviço e listar cobranças vivem na tela de Manutenção (sem duplicar aqui).
  if (isAvulso) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="font-mono text-base font-semibold tabular-nums">
              {contract.hourlyRate != null ? formatCurrency(contract.hourlyRate) : '—'}
              <span className="ml-1 text-xs font-normal text-muted-foreground">/hora</span>
            </p>
            <p className="text-xs text-muted-foreground">{CONTRACT_KIND_LABELS[contract.kind]}</p>
          </div>
          <ContractStatusMenu contractId={contract.id} status={contract.status} />
        </div>

        <Button
          className="w-full"
          size="sm"
          render={<Link href={`/manutencao/${contract.id}`} />}
        >
          <ListChecks className="h-4 w-4" />
          Abrir tela de manutenção
        </Button>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={startEditingAvulso}>
            Reconfigurar preço
          </Button>
          <ContractManageActions
            contractId={contract.id}
            kind={contract.kind}
            monthlyValue={contract.monthlyValue}
            hourlyRate={contract.hourlyRate}
            minMonths={contract.minMonths}
            billingDay={contract.billingDay}
          />
        </div>
      </div>
    )
  }

  // --- Leitura: contrato mensal ---
  // Parcelas recorrentes: por padrão só as 2 próximas pendentes; "Ver mais" expande tudo.
  const pendingCharges = [...charges]
    .filter((c) => c.status === 'pendente')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const visibleCharges = showAllCharges ? charges : pendingCharges.slice(0, 2)
  const hiddenCharges = charges.length - visibleCharges.length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="font-mono text-base font-semibold tabular-nums">
            {contract.monthlyValue != null ? formatCurrency(contract.monthlyValue) : '—'}
            <span className="ml-1 text-xs font-normal text-muted-foreground">/mês</span>
          </p>
          <p className="text-xs text-muted-foreground">{CONTRACT_KIND_LABELS[contract.kind]}</p>
        </div>
        <ContractStatusMenu contractId={contract.id} status={contract.status} />
      </div>

      {/* Parcelas recorrentes geradas (só as próximas 2 pendentes por padrão) */}
      {charges.length > 0 && (
        <div className="space-y-2">
          {visibleCharges.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma parcela pendente.</p>
          ) : (
            <ul className="divide-y divide-border">
              {visibleCharges.map((c) => {
                const overdue = c.status === 'pendente' && isOverdue(c.dueDate)
                return (
                  <li key={c.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{c.description}</p>
                      <p className="text-xs text-muted-foreground">Vence {formatDate(c.dueDate)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-mono text-sm tabular-nums">{formatCurrency(c.amount)}</span>
                      <EntityBadge meta={overdue ? CHARGE_OVERDUE : CHARGE_STATUS[c.status]} />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
          {(hiddenCharges > 0 || showAllCharges) && (
            <button
              type="button"
              onClick={() => setShowAllCharges((v) => !v)}
              className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground"
              aria-expanded={showAllCharges}
            >
              {showAllCharges ? 'Ver menos' : `Ver mais (${hiddenCharges})`}
            </button>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        aria-expanded={open}
      >
        <ChevronRight className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-90' : ''}`} />
        {open ? 'Ocultar detalhes' : 'Ver detalhes'}
      </button>

      {open && (
        <dl className="space-y-2 border-t border-border pt-3 text-sm">
          {contract.minMonths != null && (
            <Row label="Contrato mínimo" value={`${contract.minMonths} meses`} />
          )}
          <Row label="Início" value={formatDate(contract.startDate)} />
          {contract.billingDay != null && (
            <Row label="Cobrança" value={`Dia ${contract.billingDay}`} />
          )}
          <Row
            label="Próximo contato"
            value={contract.nextContactDate ? formatDate(contract.nextContactDate) : '—'}
          />
          {contract.sla && <Row label="SLA" value={contract.sla} />}
        </dl>
      )}

      <Button className="w-full" size="sm" render={<Link href={`/manutencao/${contract.id}`} />}>
        <ListChecks className="h-4 w-4" />
        Abrir tela de manutenção
      </Button>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={startEditing}>
          Reconfigurar preço
        </Button>
        <ContractManageActions
          contractId={contract.id}
          kind={contract.kind}
          monthlyValue={contract.monthlyValue}
          hourlyRate={contract.hourlyRate}
          minMonths={contract.minMonths}
          billingDay={contract.billingDay}
        />
      </div>
    </div>
  )
}
