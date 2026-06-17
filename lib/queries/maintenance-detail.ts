import { createClient } from '@/lib/supabase/server'
import type { MaintenanceDetailData } from '@/components/projects/maintenance-detail'
import type { TaskItem } from '@/components/tasks/tasks-kanban'

function one<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

type RawContract = {
  id: string
  kind: MaintenanceDetailData['kind']
  status: MaintenanceDetailData['status']
  monthly_value: number | null
  min_months: number | null
  billing_day: number | null
  start_date: string | null
  next_contact_date: string | null
  contact_frequency_days: number | null
  sla: string | null
  notes: string | null
  archived_at: string | null
  company: { id: string; name: string } | { id: string; name: string }[] | null
  project: { name: string; deal_id: string | null } | { name: string; deal_id: string | null }[] | null
}

type RawTask = {
  id: string
  title: string
  description: string | null
  status: TaskItem['status']
  priority: TaskItem['priority']
  due_date: string | null
  recurrence: 'none' | 'monthly'
  recurrence_day: number | null
  archived_at: string | null
}

/** Tela de manutenção por contrato: dados do contrato + tarefas vinculadas. */
export async function getMaintenanceDetail(contractId: string): Promise<MaintenanceDetailData | null> {
  const supabase = await createClient()

  const { data: contract, error } = await supabase
    .from('contracts')
    .select(
      `
      id, kind, status, monthly_value, min_months, billing_day, start_date,
      next_contact_date, contact_frequency_days, sla, notes, archived_at,
      company:companies ( id, name ),
      project:projects ( name, deal_id )
    `,
    )
    .eq('id', contractId)
    .maybeSingle()

  if (error) throw new Error(`Falha ao carregar contrato: ${error.message}`)
  if (!contract) return null

  const ct = contract as unknown as RawContract

  const { data: tasksData, error: tErr } = await supabase
    .from('tasks')
    .select('id, title, description, status, priority, due_date, recurrence, recurrence_day, archived_at')
    .eq('contract_id', contractId)
    .order('created_at', { ascending: true })

  if (tErr) throw new Error(`Falha ao carregar tarefas: ${tErr.message}`)

  const company = one(ct.company)
  const project = one(ct.project)
  const tasks: TaskItem[] = ((tasksData ?? []) as RawTask[]).map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    dueDate: t.due_date,
    recurrence: t.recurrence,
    recurrenceDay: t.recurrence_day,
    archived: t.archived_at != null,
  }))

  return {
    contractId: ct.id,
    dealId: project?.deal_id ?? null,
    company: company?.name ?? '—',
    companyId: company?.id ?? '',
    projectName: project?.name ?? null,
    kind: ct.kind,
    status: ct.status,
    monthlyValue: ct.monthly_value,
    minMonths: ct.min_months,
    billingDay: ct.billing_day,
    startDate: ct.start_date,
    nextContactDate: ct.next_contact_date,
    contactFrequencyDays: ct.contact_frequency_days,
    sla: ct.sla,
    notes: ct.notes,
    archived: ct.archived_at != null,
    tasks,
  }
}
