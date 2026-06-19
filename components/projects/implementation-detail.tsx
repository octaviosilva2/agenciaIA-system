'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Circle,
  CircleDot,
  Plus,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { TasksKanban, type TaskItem } from '@/components/tasks/tasks-kanban'
import { updateScopeItems, updateProjectStatus, updateProjectProgress } from '@/lib/actions/project'
import { PROJECT_STATUS, deliveryCountdown, formatDate, isOverdue } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ScopeItem, ScopeStatus } from '@/lib/queries/opportunity-detail'
import type { Database } from '@/lib/supabase/types'

type ProjectStatus = Database['public']['Enums']['project_status']

/** Fases do projeto em ordem linear para o stepper. */
const PHASE_ORDER: ProjectStatus[] = [
  'a_iniciar',
  'briefing',
  'desenvolvimento',
  'revisao',
  'entregue',
]

function nextScopeStatus(s: ScopeStatus): ScopeStatus {
  if (s === 'pendente') return 'em_andamento'
  if (s === 'em_andamento') return 'entregue'
  return 'pendente'
}

const SCOPE_LABEL: Record<ScopeStatus, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em andamento',
  entregue: 'Entregue',
}

const inputCls =
  'h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring'

const textareaCls =
  'w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none'

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

function ScopeStatusIcon({ status, onClick }: { status: ScopeStatus; onClick: () => void }) {
  if (status === 'entregue') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label="Desfazer entrega"
        className="cursor-pointer text-green-600 transition-opacity hover:opacity-70 dark:text-green-400"
      >
        <CheckCircle2 className="h-5 w-5" />
      </button>
    )
  }
  if (status === 'em_andamento') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label="Marcar como entregue"
        className="cursor-pointer text-blue-600 transition-opacity hover:opacity-70 dark:text-blue-400"
      >
        <CircleDot className="h-5 w-5" />
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Iniciar item"
      className="cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
    >
      <Circle className="h-5 w-5" />
    </button>
  )
}

export function ImplementationDetail({
  projectId,
  dealId,
  initialScopeItems,
  initialStatus = 'desenvolvimento',
  initialProgress = 0,
  tasks,
  project,
  company,
  companyId,
  dueDate = null,
}: {
  projectId: string
  dealId: string
  initialScopeItems: ScopeItem[]
  initialStatus?: ProjectStatus
  initialProgress?: number
  tasks: TaskItem[]
  project?: string
  company?: string
  companyId?: string
  dueDate?: string | null
}) {
  const router = useRouter()
  const [phaseStatus, setPhaseStatus] = useState<ProjectStatus>(initialStatus)
  const [scope, setScope] = useState<ScopeItem[]>(initialScopeItems)
  const [progress, setProgress] = useState<number>(initialProgress)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [savingScope, setSavingScope] = useState(false)
  const [descDialog, setDescDialog] = useState<ScopeItem | null>(null)

  const blockedTasks = tasks.filter((t) => t.status === 'impedimento').length
  const overdue = phaseStatus !== 'entregue' && isOverdue(dueDate)
  const currentPhaseIdx = PHASE_ORDER.indexOf(phaseStatus)

  /** Persiste o escopo atual no banco e atualiza as telas. */
  async function persistScope(nextItems: ScopeItem[]) {
    setSavingScope(true)
    const res = await updateScopeItems(projectId, dealId, nextItems)
    setSavingScope(false)
    if (res.success) {
      router.refresh()
    } else {
      toast.error(res.message)
    }
  }

  function advanceScopeStatus(id: string) {
    const next = scope.map((x) => (x.id === id ? { ...x, status: nextScopeStatus(x.status) } : x))
    setScope(next)
    void persistScope(next)
  }

  function removeScopeItem(id: string) {
    const next = scope.filter((x) => x.id !== id)
    setScope(next)
    void persistScope(next)
  }

  function addScopeItem() {
    const t = newTitle.trim()
    if (!t) return
    const next = [
      ...scope,
      { id: crypto.randomUUID(), title: t, description: newDesc.trim(), status: 'pendente' as ScopeStatus },
    ]
    setScope(next)
    setNewTitle('')
    setNewDesc('')
    void persistScope(next)
  }

  /** Muda fase — atualiza local e persiste no banco (sincroniza com o kanban). */
  async function changePhase(next: ProjectStatus) {
    if (next === phaseStatus) return
    setPhaseStatus(next)
    const res = await updateProjectStatus(projectId, dealId, next)
    if (!res.success) {
      toast.error(res.message)
      setPhaseStatus(phaseStatus) // reverte se falhou
    } else {
      router.refresh()
    }
  }

  /** Persiste o progresso (%) ao soltar o slider. */
  async function commitProgress(value: number) {
    const res = await updateProjectProgress(projectId, dealId, value)
    if (!res.success) toast.error(res.message)
  }

  return (
    <div className="space-y-4">
      <Link
        href="/implementacao"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Implementação
      </Link>

      {/* Header */}
      <header className="space-y-4 rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-0.5">
            {project && <h2 className="text-lg font-semibold tracking-tight">{project}</h2>}
            {company && companyId && (
              <p className="text-sm text-muted-foreground">
                <Link href={`/contatos/${companyId}`} className="font-medium hover:underline">
                  {company}
                </Link>
                {dueDate && (
                  <>
                    {' · '}
                    <span className={overdue ? 'font-medium text-red-600 dark:text-red-400' : ''}>
                      Entrega {formatDate(dueDate)}
                      {phaseStatus !== 'entregue' && ` · ${deliveryCountdown(dueDate)}`}
                    </span>
                  </>
                )}
              </p>
            )}
          </div>

          {blockedTasks > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-red-100 px-2.5 py-1 text-sm font-medium text-red-700 dark:bg-red-500/15 dark:text-red-400">
              <AlertTriangle className="h-4 w-4" />
              {blockedTasks} impedimento{blockedTasks > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Stepper + botão "Mover de fase" */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1">
            {PHASE_ORDER.map((phase, idx) => {
              const isPast = idx < currentPhaseIdx
              const isCurrent = idx === currentPhaseIdx
              return (
                <div key={phase} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => void changePhase(phase)}
                    className={cn(
                      'cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                      isCurrent
                        ? 'bg-primary text-primary-foreground'
                        : isPast
                          ? 'text-muted-foreground hover:bg-accent hover:text-foreground'
                          : 'text-muted-foreground/40 hover:bg-accent hover:text-foreground',
                    )}
                  >
                    {isPast && (
                      <CheckCircle2 className="mr-1.5 inline h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                    )}
                    {PROJECT_STATUS[phase].label}
                  </button>
                  {idx < PHASE_ORDER.length - 1 && (
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/30" />
                  )}
                </div>
              )
            })}
          </div>

          {currentPhaseIdx < PHASE_ORDER.length - 1 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void changePhase(PHASE_ORDER[currentPhaseIdx + 1])}
            >
              Mover de fase
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Progresso manual — slider definido pelo programador */}
        <div className="flex items-center gap-4 border-t border-border pt-3">
          <div className="flex-1 space-y-2">
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              onMouseUp={(e) => void commitProgress(Number((e.target as HTMLInputElement).value))}
              onTouchEnd={(e) => void commitProgress(Number((e.target as HTMLInputElement).value))}
              className="h-2 w-full cursor-pointer accent-primary"
              aria-label="Progresso do projeto"
            />
            <p className="text-xs text-muted-foreground">
              Progresso{savingScope ? ' · salvando…' : ''}
            </p>
          </div>
          <span className="w-14 text-right font-mono text-3xl font-semibold tabular-nums tracking-tight">
            {progress}%
          </span>
        </div>
      </header>

      {/* Kanban de tarefas */}
      <SectionCard title="Tarefas">
        <TasksKanban tasks={tasks} />
      </SectionCard>

      {/* Escopo contratado — persiste no banco ao mudar */}
      <SectionCard title="Escopo contratado">
        <div className="space-y-1">
          {/* Dialog de descrição completa */}
          <Dialog open={!!descDialog} onOpenChange={(v) => !v && setDescDialog(null)}>
            <DialogContent className="sm:max-w-4xl">
              <DialogHeader>
                <DialogTitle>{descDialog?.title}</DialogTitle>
              </DialogHeader>
              <div className="mt-2 max-h-[75vh] overflow-y-auto text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                {descDialog?.description || 'Sem descrição.'}
              </div>
            </DialogContent>
          </Dialog>

          {scope.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">Nenhum item de escopo ainda.</p>
          ) : (
            <ul className="divide-y divide-border">
              {scope.map((it) => (
                <li key={it.id} className="flex items-center gap-3 py-3">
                  <div className="shrink-0">
                    <ScopeStatusIcon
                      status={it.status}
                      onClick={() => advanceScopeStatus(it.id)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => it.description && setDescDialog(it)}
                    className={cn(
                      'min-w-0 flex-1 text-left text-sm font-medium',
                      it.description ? 'cursor-pointer hover:underline' : 'cursor-default',
                      it.status === 'entregue' && 'text-muted-foreground line-through',
                    )}
                  >
                    {it.title}
                  </button>
                  <span
                    className={cn(
                      'shrink-0 text-xs',
                      it.status === 'entregue'
                        ? 'text-green-600 dark:text-green-400'
                        : it.status === 'em_andamento'
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-muted-foreground',
                    )}
                  >
                    {SCOPE_LABEL[it.status]}
                  </span>
                  {it.description && (
                    <button
                      type="button"
                      onClick={() => setDescDialog(it)}
                      className="shrink-0 cursor-pointer text-xs text-muted-foreground hover:text-foreground"
                    >
                      Ver
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeScopeItem(it.id)}
                    className="shrink-0 cursor-pointer text-muted-foreground hover:text-red-600"
                    aria-label="Remover item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-2 border-t border-border pt-3">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  addScopeItem()
                }
              }}
              placeholder="Título do item…"
              className={inputCls}
            />
            <textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Descrição do que abrange esse item…"
              rows={2}
              className={textareaCls}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!newTitle.trim()}
              onClick={addScopeItem}
            >
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
