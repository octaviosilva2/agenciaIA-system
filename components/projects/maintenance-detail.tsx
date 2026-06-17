'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EntityBadge } from '@/components/ui/entity-badge'
import { TasksKanban, type TaskItem } from '@/components/tasks/tasks-kanban'
import {
  createMaintenanceTask,
  updateMaintenanceTask,
  moveMaintenanceTask,
  deleteMaintenanceTask,
} from '@/lib/actions/tasks'
import { updateMaintenanceContract } from '@/lib/actions/project'
import {
  CONTRACT_KIND_LABELS,
  CONTRACT_STATUS_LABELS,
  TONE,
  formatCurrency,
  formatDate,
  isOverdue,
} from '@/lib/format'
import type { Database } from '@/lib/supabase/types'

type ContractKind = Database['public']['Enums']['contract_kind']
type ContractStatus = Database['public']['Enums']['contract_status']

/** Dados da tela de manutenção por contrato (mock no mini-gate; query real depois). */
export type MaintenanceDetailData = {
  contractId: string
  dealId: string | null
  company: string
  companyId: string
  projectName: string | null
  kind: ContractKind
  status: ContractStatus
  monthlyValue: number | null
  minMonths: number | null
  billingDay: number | null
  startDate: string | null
  nextContactDate: string | null
  contactFrequencyDays: number | null
  sla: string | null
  notes: string | null
  tasks: TaskItem[]
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
  // Estado local (mock): vira persistência via server action de contrato após o mini-gate.
  const [editing, setEditing] = useState(false)
  const [monthlyValue, setMonthlyValue] = useState(data.monthlyValue ?? 0)
  const [minMonths, setMinMonths] = useState(data.minMonths ?? 12)
  const [billingDay, setBillingDay] = useState(data.billingDay ?? 10)
  const [startDate, setStartDate] = useState(data.startDate ?? '')
  const [nextContactDate, setNextContactDate] = useState(data.nextContactDate ?? '')
  const [contactFrequencyDays, setContactFrequencyDays] = useState(data.contactFrequencyDays ?? 30)
  const [sla, setSla] = useState(data.sla ?? '')
  const [notes, setNotes] = useState(data.notes ?? '')
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  const contactOverdue = isOverdue(nextContactDate)

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
              <EntityBadge
                meta={{
                  label: CONTRACT_STATUS_LABELS[data.status],
                  className: data.status === 'ativo' ? TONE.green : TONE['zinc-faint'],
                }}
              />
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
          <div className="text-right">
            <p className="font-mono text-lg font-semibold tabular-nums">
              {formatCurrency(monthlyValue)}
              {data.kind === 'mensal' && (
                <span className="ml-1 text-xs font-normal text-muted-foreground">/mês</span>
              )}
            </p>
          </div>
        </div>
      </header>

      {/* Cobrança — preço e detalhes (editável) */}
      <SectionCard
        title="Cobrança"
        action={
          !editing && (
            <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" />
              Editar cobrança
            </Button>
          )
        }
      >
        {editing ? (
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
          </div>
        )}
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
          }}
        />
      </SectionCard>
    </div>
  )
}
