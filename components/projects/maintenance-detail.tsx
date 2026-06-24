'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { ArrowLeft, CalendarClock, CheckCircle2, Circle, Pencil, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EntityBadge } from '@/components/ui/entity-badge'
import { TasksKanban, type TaskItem } from '@/components/tasks/tasks-kanban'
import {
  createMaintenanceTask,
  updateMaintenanceTask,
  moveMaintenanceTask,
  deleteMaintenanceTask,
  archiveMaintenanceTask,
  unarchiveMaintenanceTask,
} from '@/lib/actions/tasks'
import {
  updateMaintenanceContract,
  setAvulsoContract,
  createMaintenanceInteraction,
  registerMaintenanceContact,
} from '@/lib/actions/project'
import { toggleChargePaid } from '@/lib/actions/finance'
import { MarkPaidPopover } from '@/components/finance/mark-paid-popover'
import { EntityActionsMenu } from '@/components/entity-actions-menu'
import { ContractStatusMenu } from '@/components/projects/contract-status-menu'
import { ContractManageActions } from '@/components/projects/contract-manage-actions'
import { AvulsoChargeDialog } from '@/components/projects/avulso-charge-dialog'
import { archiveContract, unarchiveContract, deleteContract } from '@/lib/actions/contracts'
import {
  CHARGE_OVERDUE,
  CHARGE_STATUS,
  CONTRACT_KIND_LABELS,
  TONE,
  deliveryCountdown,
  formatCurrency,
  formatDate,
  formatDateTime,
  isOverdue,
} from '@/lib/format'
import type { ChargeRow } from '@/lib/queries/opportunity-detail'
import type { Database } from '@/lib/supabase/types'

type ContractKind = Database['public']['Enums']['contract_kind']
type ContractStatus = Database['public']['Enums']['contract_status']

/** Relato/interação de relacionamento com o cliente (maintenance_interactions). */
export type MaintenanceInteraction = {
  id: string
  content: string
  createdAt: string
  authorName: string | null
}

/** Dados da tela de manutenção por contrato. */
export type MaintenanceDetailData = {
  contractId: string
  dealId: string | null
  projectId: string | null
  company: string
  companyId: string
  projectName: string | null
  kind: ContractKind
  status: ContractStatus
  monthlyValue: number | null
  hourlyRate: number | null
  minMonths: number | null
  billingDay: number | null
  startDate: string | null
  nextContactDate: string | null
  contactFrequencyDays: number | null
  sla: string | null
  notes: string | null
  archived: boolean
  charges: ChargeRow[]
  tasks: TaskItem[]
  interactions: MaintenanceInteraction[]
}

const inputCls =
  'h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring'
const labelCls = 'mb-1 block text-xs font-medium'
const textareaCls =
  'w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring'

function SectionCard({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}

function Info({ label, value, overdue = false }: { label: string; value: React.ReactNode; overdue?: boolean }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-sm ${overdue ? 'font-medium text-red-600 dark:text-red-400' : ''}`}>
        {value}
      </p>
    </div>
  )
}

export function MaintenanceDetail({ data }: { data: MaintenanceDetailData }) {
  const isAvulso = data.kind === 'avulso'

  const [editing, setEditing] = useState(false)
  const [monthlyValue, setMonthlyValue] = useState(data.monthlyValue ?? 0)
  const [minMonths, setMinMonths] = useState(data.minMonths ?? 12)
  const [billingDay, setBillingDay] = useState(data.billingDay ?? 10)
  const [startDate, setStartDate] = useState(data.startDate ?? '')
  const [nextContactDate, setNextContactDate] = useState(data.nextContactDate ?? '')
  const [contactFrequencyDays, setContactFrequencyDays] = useState(data.contactFrequencyDays ?? 30)
  const [sla, setSla] = useState(data.sla ?? '')
  const [notes, setNotes] = useState(data.notes ?? '')
  // Avulso: preço/hora editável + dialog de lançar serviço.
  const [hourlyRate, setHourlyRate] = useState(data.hourlyRate ?? 0)
  const [chargeOpen, setChargeOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [busyIds, setBusyIds] = useState<string[]>([])
  // Relacionamento: relato novo + estados de envio.
  const [interaction, setInteraction] = useState('')
  const [busyContact, setBusyContact] = useState(false)
  const [busyInteraction, setBusyInteraction] = useState(false)
  const router = useRouter()

  const contactOverdue = isOverdue(nextContactDate)

  /** "Contato dado": registra a interação e avança o próximo contato. */
  async function giveContact() {
    setBusyContact(true)
    const res = await registerMaintenanceContact(data.contractId)
    setBusyContact(false)
    if (res.success) {
      toast.success(res.message)
      router.refresh()
    } else {
      toast.error(res.message)
    }
  }

  /** Registra um relato/interação livre. */
  async function addInteraction() {
    const text = interaction.trim()
    if (!text) return
    setBusyInteraction(true)
    const res = await createMaintenanceInteraction(data.contractId, text)
    setBusyInteraction(false)
    if (res.success) {
      toast.success(res.message)
      setInteraction('')
      router.refresh()
    } else {
      toast.error(res.message)
    }
  }

  async function handleToggle(chargeId: string, paid: boolean, date?: string) {
    setBusyIds((prev) => [...prev, chargeId])
    const res = await toggleChargePaid(chargeId, paid, [`/manutencao/${data.contractId}`], date ?? null)
    setBusyIds((prev) => prev.filter((id) => id !== chargeId))
    if (res.success) {
      toast.success(res.message)
      router.refresh()
    } else {
      toast.error(res.message)
    }
  }

  async function save() {
    setBusy(true)
    const res = await updateMaintenanceContract(data.contractId, {
      monthlyValue,
      minMonths,
      billingDay,
      startDate,
      nextContactDate: nextContactDate || null,
      contactFrequencyDays,
      sla: sla.trim() || null,
      notes: notes.trim() || null,
    })
    setBusy(false)
    if (res.success) {
      toast.success(res.message)
      setEditing(false)
      router.refresh()
    } else {
      toast.error(res.message)
    }
  }

  async function saveAvulso() {
    setBusy(true)
    const res = await setAvulsoContract(
      data.projectId ?? '',
      data.dealId ?? '',
      data.companyId,
      data.projectName ?? '',
      data.contractId,
      { hourlyRate, startDate: startDate || format(new Date(), 'yyyy-MM-dd') },
    )
    setBusy(false)
    if (res.success) {
      toast.success(res.message)
      setEditing(false)
      router.refresh()
    } else {
      toast.error(res.message)
    }
  }

  return (
    <div className="space-y-4">
      <Link
        href="/manutencao"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Manutenção
      </Link>

      {/* Header do contrato */}
      <header className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight">Manutenção · {data.company}</h2>
              <EntityBadge
                meta={{ label: CONTRACT_KIND_LABELS[data.kind], className: TONE['slate-soft'] }}
              />
              <ContractStatusMenu contractId={data.contractId} status={data.status} />
              {data.archived && (
                <EntityBadge meta={{ label: 'Arquivado', className: TONE['zinc-faint'] }} />
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {data.projectName ? (
                <>
                  Projeto:{' '}
                  {data.dealId ? (
                    <Link href={`/projetos/${data.dealId}`} className="font-medium hover:underline">
                      {data.projectName}
                    </Link>
                  ) : (
                    <span className="font-medium">{data.projectName}</span>
                  )}
                  {' · '}
                </>
              ) : null}
              <Link href={`/contatos/${data.companyId}`} className="font-medium hover:underline">
                {data.company}
              </Link>
            </p>
          </div>
          <div className="flex items-start gap-2">
            <p className="font-mono text-lg font-semibold tabular-nums">
              {isAvulso ? formatCurrency(data.hourlyRate) : formatCurrency(monthlyValue)}
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                {isAvulso ? '/hora' : '/mês'}
              </span>
            </p>
            <EntityActionsMenu
              archived={data.archived}
              entityName={data.projectName ?? data.company}
              archiveAction={() => archiveContract(data.contractId)}
              unarchiveAction={() => unarchiveContract(data.contractId)}
              deleteAction={async () => {
                const res = await deleteContract(data.contractId)
                if (res.success) router.push('/manutencao')
                return res
              }}
              onChanged={() => router.refresh()}
            />
          </div>
        </div>
      </header>

      {/* Cobrança — mensal (parcelas) ou hora avulsa (lançamentos) */}
      <SectionCard
        title={isAvulso ? 'Hora avulsa' : 'Cobrança'}
        action={
          !editing &&
          (isAvulso ? (
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={() => setChargeOpen(true)}>
                <Plus className="h-4 w-4" />
                Lançar serviço
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" />
                Editar
              </Button>
            </div>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" />
              Editar cobrança
            </Button>
          ))
        }
      >
        {isAvulso ? (
          editing ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div>
                  <label className={labelCls} htmlFor="av_rate">Preço por hora</label>
                  <input
                    id="av_rate"
                    type="number"
                    min="0"
                    step="0.01"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(Number(e.target.value) || 0)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor="av_start">Início</label>
                  <input
                    id="av_start"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-border pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => setEditing(false)}
                >
                  Cancelar
                </Button>
                <Button type="button" size="sm" disabled={busy} onClick={saveAvulso}>
                  {busy ? 'Salvando…' : 'Salvar'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Info label="Preço por hora" value={formatCurrency(data.hourlyRate)} />
                <Info label="Início" value={startDate ? formatDate(startDate) : '—'} />
                <Info label="Lançamentos" value={`${data.charges.length}`} />
              </div>
              {data.charges.length > 0 ? (
                <ul className="divide-y divide-border border-t border-border">
                  {data.charges.map((c) => {
                    const overdue = c.status === 'pendente' && isOverdue(c.dueDate)
                    const isBusy = busyIds.includes(c.id)
                    return (
                      <li key={c.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{c.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {c.hours != null ? `${c.hours}h · ` : ''}Vence {formatDate(c.dueDate)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="font-mono text-sm tabular-nums">
                            {formatCurrency(c.amount)}
                          </span>
                          <EntityBadge meta={overdue ? CHARGE_OVERDUE : CHARGE_STATUS[c.status]} />
                          {/* Marcar como recebido (popover c/ data) ou desmarcar (clique direto) */}
                          {c.status === 'pago' ? (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleToggle(c.id, false)}
                              title="Desmarcar recebimento"
                              className="text-muted-foreground hover:text-green-600 disabled:opacity-40 dark:hover:text-green-400"
                            >
                              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                            </button>
                          ) : (
                            <MarkPaidPopover
                              title="Marcar como recebido"
                              confirmLabel="Recebido"
                              disabled={c.status === 'cancelado' || isBusy}
                              onConfirm={(date) => handleToggle(c.id, true, date)}
                              trigger={
                                <button
                                  type="button"
                                  disabled={c.status === 'cancelado' || isBusy}
                                  title="Marcar como recebido"
                                  className="text-muted-foreground hover:text-green-600 disabled:opacity-40 dark:hover:text-green-400"
                                >
                                  <Circle className="h-4 w-4" />
                                </button>
                              }
                            />
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="border-t border-border pt-3 text-sm text-muted-foreground">
                  Nenhum serviço lançado. Use “Lançar serviço” para gerar uma cobrança.
                </p>
              )}
            </div>
          )
        ) : editing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <label className={labelCls} htmlFor="mnt_value">Valor mensal</label>
                <input
                  id="mnt_value"
                  type="number"
                  min="0"
                  step="0.01"
                  value={monthlyValue}
                  onChange={(e) => setMonthlyValue(Number(e.target.value) || 0)}
                  className={inputCls}
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
                  className={inputCls}
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
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="mnt_start">Início</label>
                <input
                  id="mnt_start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="mnt_next">Próximo contato</label>
                <input
                  id="mnt_next"
                  type="date"
                  value={nextContactDate}
                  onChange={(e) => setNextContactDate(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="mnt_freq">Contato a cada (dias)</label>
                <input
                  id="mnt_freq"
                  type="number"
                  min={1}
                  value={contactFrequencyDays}
                  onChange={(e) => setContactFrequencyDays(Math.max(1, Number(e.target.value) || 1))}
                  className={inputCls}
                />
              </div>
            </div>
            <div>
              <label className={labelCls} htmlFor="mnt_sla">SLA</label>
              <input
                id="mnt_sla"
                value={sla}
                onChange={(e) => setSla(e.target.value)}
                placeholder="Ex.: resposta em até 24h úteis"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="mnt_notes">Observações</label>
              <textarea
                id="mnt_notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas internas do contrato"
                className={textareaCls}
              />
            </div>
            <div className="flex justify-end gap-2 border-t border-border pt-3">
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
                {busy ? 'Salvando…' : 'Salvar cobrança'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Info
                label="Valor mensal"
                value={`${formatCurrency(monthlyValue)}${data.kind === 'mensal' ? '/mês' : ''}`}
              />
              <Info label="Contrato mínimo" value={`${minMonths} meses`} />
              <Info label="Dia de cobrança" value={`Dia ${billingDay}`} />
              <Info label="Início" value={startDate ? formatDate(startDate) : '—'} />
              <Info
                label="Próximo contato"
                overdue={contactOverdue}
                value={
                  nextContactDate
                    ? `${formatDate(nextContactDate)}${contactOverdue ? ' · atrasado' : ''}`
                    : '—'
                }
              />
              <Info label="Frequência de contato" value={`A cada ${contactFrequencyDays} dias`} />
            </div>
            {sla && <Info label="SLA" value={sla} />}
            {notes && <Info label="Observações" value={notes} />}
            {/* Cobranças mensais recorrentes */}
            {data.charges.length > 0 && (
              <div className="border-t border-border pt-3">
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Cobranças ({data.charges.length})
                </p>
                <ul className="divide-y divide-border">
                  {data.charges.map((c) => {
                    const overdue = c.status === 'pendente' && isOverdue(c.dueDate)
                    const isBusy = busyIds.includes(c.id)
                    return (
                      <li key={c.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{c.description}</p>
                          <p className="text-xs text-muted-foreground">Vence {formatDate(c.dueDate)}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="font-mono tabular-nums">{formatCurrency(c.amount)}</span>
                          <EntityBadge meta={overdue ? CHARGE_OVERDUE : CHARGE_STATUS[c.status]} />
                          {/* Marcar como recebido (popover c/ data) ou desmarcar (clique direto) */}
                          {c.status === 'pago' ? (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleToggle(c.id, false)}
                              title="Desmarcar recebimento"
                              className="text-muted-foreground hover:text-green-600 disabled:opacity-40 dark:hover:text-green-400"
                            >
                              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                            </button>
                          ) : (
                            <MarkPaidPopover
                              title="Marcar como recebido"
                              confirmLabel="Recebido"
                              disabled={c.status === 'cancelado' || isBusy}
                              onConfirm={(date) => handleToggle(c.id, true, date)}
                              trigger={
                                <button
                                  type="button"
                                  disabled={c.status === 'cancelado' || isBusy}
                                  title="Marcar como recebido"
                                  className="text-muted-foreground hover:text-green-600 disabled:opacity-40 dark:hover:text-green-400"
                                >
                                  <Circle className="h-4 w-4" />
                                </button>
                              }
                            />
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Ciclo de vida: trocar tipo (Mensal ↔ Hora avulsa) e renovar */}
        {!editing && (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
            <ContractManageActions
              contractId={data.contractId}
              kind={data.kind}
              monthlyValue={data.monthlyValue}
              hourlyRate={data.hourlyRate}
              minMonths={data.minMonths}
              billingDay={data.billingDay}
            />
          </div>
        )}
      </SectionCard>

      {/* Relacionamento com o cliente: próximo contato + relatos/interações */}
      <SectionCard title="Relacionamento com o cliente">
        <div className="space-y-4">
          {/* Próximo contato + botão "Contato dado" */}
          <div
            className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 ${
              contactOverdue
                ? 'border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10'
                : 'border-border bg-muted/40'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <CalendarClock
                className={`h-5 w-5 shrink-0 ${
                  contactOverdue ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'
                }`}
              />
              <div>
                <p className="text-xs text-muted-foreground">Próximo contato</p>
                <p
                  className={`text-sm font-semibold ${
                    contactOverdue ? 'text-red-600 dark:text-red-400' : ''
                  }`}
                >
                  {data.nextContactDate
                    ? `${formatDate(data.nextContactDate)} · ${deliveryCountdown(data.nextContactDate)}`
                    : 'Sem data definida'}
                </p>
              </div>
            </div>
            <Button type="button" size="sm" disabled={busyContact} onClick={giveContact}>
              {busyContact ? 'Registrando…' : 'Contato dado'}
            </Button>
          </div>

          {/* Form de relato */}
          <div className="space-y-2">
            <textarea
              value={interaction}
              onChange={(e) => setInteraction(e.target.value)}
              rows={2}
              placeholder="Registrar um relato / interação com o cliente…"
              className={textareaCls}
            />
            <Button
              type="button"
              size="sm"
              disabled={busyInteraction || !interaction.trim()}
              onClick={addInteraction}
            >
              {busyInteraction ? 'Salvando…' : 'Registrar relato'}
            </Button>
          </div>

          {/* Lista de relatos (mais recentes primeiro) */}
          {data.interactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum relato registrado ainda.</p>
          ) : (
            <ul className="space-y-2.5">
              {data.interactions.map((it) => (
                <li
                  key={it.id}
                  className="rounded-md border border-border p-3 text-sm break-words [overflow-wrap:anywhere]"
                >
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>{it.authorName ?? '—'}</span>
                    <span className="shrink-0">{formatDateTime(it.createdAt)}</span>
                  </div>
                  <p className="whitespace-pre-wrap">{it.content}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SectionCard>

      {/* Tarefas da manutenção (mesmo kanban da Implementação, com recorrência mensal) */}
      <SectionCard title="Tarefas de manutenção">
        <TasksKanban
          tasks={data.tasks}
          allowRecurrence
          handlers={{
            onCreate: (draft) => createMaintenanceTask(data.contractId, draft),
            onUpdate: (id, draft) => updateMaintenanceTask(data.contractId, id, draft),
            onMove: (id, status) => moveMaintenanceTask(data.contractId, id, status),
            onDelete: (id) => deleteMaintenanceTask(data.contractId, id),
            onArchive: (id) => archiveMaintenanceTask(data.contractId, id),
            onUnarchive: (id) => unarchiveMaintenanceTask(data.contractId, id),
          }}
        />
      </SectionCard>

      {isAvulso && (
        <AvulsoChargeDialog
          open={chargeOpen}
          onOpenChange={setChargeOpen}
          contractId={data.contractId}
          hourlyRate={data.hourlyRate}
          onDone={() => router.refresh()}
        />
      )}
    </div>
  )
}
