'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, CheckCircle2, Plus, Trash2, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EntityBadge } from '@/components/ui/entity-badge'
import { TasksKanban, type TaskItem } from '@/components/tasks/tasks-kanban'
import {
  PROJECT_STATUS,
  deliveryCountdown,
  formatDate,
  isOverdue,
} from '@/lib/format'
import type { Database } from '@/lib/supabase/types'

type ProjectStatus = Database['public']['Enums']['project_status']
type Stage = { id: string; name: string; done: boolean }
type ScopeItem = { id: string; title: string; contracted: boolean; delivered: boolean }
type PhaseEvent = { status: ProjectStatus; enteredAt: string }

/** Dados da tela operacional do projeto (mock no mini-gate; query real depois). */
export type ImplementationDetailData = {
  projectId: string
  dealId: string
  project: string
  company: string
  companyId: string
  status: ProjectStatus
  dueDate: string | null
  customStages: Stage[]
  scopeItems: ScopeItem[]
  tasks: TaskItem[]
  phaseEvents: PhaseEvent[]
  hasContract: boolean
}

const inputCls =
  'h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring'

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

function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-xs tabular-nums text-muted-foreground">{done}/{total}</span>
    </div>
  )
}

export function ImplementationDetail({ data }: { data: ImplementationDetailData }) {
  // Estado local (mock): vira persistência via server actions após o mini-gate.
  const [status, setStatus] = useState<ProjectStatus>(data.status)
  const [stages, setStages] = useState<Stage[]>(data.customStages)
  const [scope, setScope] = useState<ScopeItem[]>(data.scopeItems)
  const [newStage, setNewStage] = useState('')
  const [newScope, setNewScope] = useState('')

  const delivered = status === 'entregue'
  const doneTasks = data.tasks.filter((t) => t.status === 'done').length
  const doneStages = stages.filter((s) => s.done).length
  const overdue = !delivered && isOverdue(data.dueDate)

  function toggleDelivered() {
    const next: ProjectStatus = delivered ? 'desenvolvimento' : 'entregue'
    setStatus(next)
    toast.success(next === 'entregue' ? 'Projeto marcado como entregue.' : 'Projeto reaberto.')
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
      <header className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight">{data.project}</h2>
              <EntityBadge meta={PROJECT_STATUS[status]} />
            </div>
            <p className="text-sm text-muted-foreground">
              Cliente:{' '}
              <Link href={`/contatos/${data.companyId}`} className="font-medium hover:underline">
                {data.company}
              </Link>
              {data.dueDate && (
                <>
                  {' · '}
                  <span className={overdue ? 'font-medium text-red-600 dark:text-red-400' : ''}>
                    Entrega {formatDate(data.dueDate)}
                    {!delivered && ` · ${deliveryCountdown(data.dueDate)}`}
                  </span>
                </>
              )}
            </p>
          </div>
          <Button type="button" variant={delivered ? 'outline' : 'default'} onClick={toggleDelivered}>
            <CheckCircle2 className="h-4 w-4" />
            {delivered ? 'Reabrir projeto' : 'Marcar como entregue'}
          </Button>
        </div>

        {/* Progresso por tarefas */}
        <div className="mt-3 border-t border-border pt-3">
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Tarefas concluídas
          </p>
          <ProgressBar done={doneTasks} total={data.tasks.length} />
        </div>
      </header>

      {/* Tarefas (peça central) */}
      <SectionCard title="Tarefas">
        <TasksKanban tasks={data.tasks} />
      </SectionCard>

      <div className="grid items-start gap-4 lg:grid-cols-3">
        {/* Escopo contratado × entregue */}
        <div className="lg:col-span-2">
          <SectionCard title="Escopo contratado × entregue">
            <div className="space-y-3">
              {scope.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum item de escopo ainda.</p>
              ) : (
                <ul className="divide-y divide-border">
                  <li className="flex items-center gap-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    <span className="flex-1">Item</span>
                    <span className="w-20 text-center">Contratado</span>
                    <span className="w-20 text-center">Entregue</span>
                    <span className="w-8" />
                  </li>
                  {scope.map((it) => (
                    <li key={it.id} className="flex items-center gap-2 py-1.5 text-sm">
                      <span className="flex-1">{it.title}</span>
                      <span className="w-20 text-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 cursor-pointer rounded border-border"
                          checked={it.contracted}
                          onChange={() =>
                            setScope((p) =>
                              p.map((x) => (x.id === it.id ? { ...x, contracted: !x.contracted } : x)),
                            )
                          }
                        />
                      </span>
                      <span className="w-20 text-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 cursor-pointer rounded border-border"
                          checked={it.delivered}
                          onChange={() =>
                            setScope((p) =>
                              p.map((x) => (x.id === it.id ? { ...x, delivered: !x.delivered } : x)),
                            )
                          }
                        />
                      </span>
                      <span className="w-8 text-right">
                        <button
                          type="button"
                          onClick={() => setScope((p) => p.filter((x) => x.id !== it.id))}
                          className="cursor-pointer text-muted-foreground hover:text-red-600"
                          aria-label="Remover item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2">
                <input
                  value={newScope}
                  onChange={(e) => setNewScope(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const t = newScope.trim()
                      if (!t) return
                      setScope((p) => [...p, { id: crypto.randomUUID(), title: t, contracted: true, delivered: false }])
                      setNewScope('')
                    }
                  }}
                  placeholder="Novo item de escopo…"
                  className={inputCls}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const t = newScope.trim()
                    if (!t) return
                    setScope((p) => [...p, { id: crypto.randomUUID(), title: t, contracted: true, delivered: false }])
                    setNewScope('')
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Adicionar
                </Button>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Lateral: etapas, histórico, manutenção */}
        <div className="space-y-4 lg:col-span-1">
          <SectionCard
            title="Etapas internas"
            action={
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {doneStages}/{stages.length}
              </span>
            }
          >
            <div className="space-y-3">
              {stages.length > 0 && <ProgressBar done={doneStages} total={stages.length} />}
              <ul className="space-y-1.5">
                {stages.map((s) => (
                  <li key={s.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 cursor-pointer rounded border-border"
                      checked={s.done}
                      onChange={() =>
                        setStages((p) => p.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)))
                      }
                    />
                    <input
                      value={s.name}
                      onChange={(e) =>
                        setStages((p) => p.map((x) => (x.id === s.id ? { ...x, name: e.target.value } : x)))
                      }
                      className="h-7 flex-1 rounded-md border border-transparent bg-transparent px-1.5 text-sm outline-none hover:border-border focus:border-border focus:ring-2 focus:ring-ring"
                    />
                    <button
                      type="button"
                      onClick={() => setStages((p) => p.filter((x) => x.id !== s.id))}
                      className="cursor-pointer text-muted-foreground hover:text-red-600"
                      aria-label="Remover etapa"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <input
                  value={newStage}
                  onChange={(e) => setNewStage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const t = newStage.trim()
                      if (!t) return
                      setStages((p) => [...p, { id: crypto.randomUUID(), name: t, done: false }])
                      setNewStage('')
                    }
                  }}
                  placeholder="Nova etapa…"
                  className={inputCls}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const t = newStage.trim()
                    if (!t) return
                    setStages((p) => [...p, { id: crypto.randomUUID(), name: t, done: false }])
                    setNewStage('')
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Histórico de fases">
            {data.phaseEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem histórico de fases ainda.</p>
            ) : (
              <ol className="space-y-2">
                {data.phaseEvents.map((ev, idx) => (
                  <li key={idx} className="flex items-center justify-between gap-2 text-sm">
                    <EntityBadge meta={PROJECT_STATUS[ev.status]} />
                    <span className="text-xs text-muted-foreground">{formatDate(ev.enteredAt)}</span>
                  </li>
                ))}
              </ol>
            )}
          </SectionCard>

          {data.hasContract && (
            <SectionCard title="Manutenção">
              <Link
                href={`/projetos/${data.dealId}`}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:underline"
              >
                <Wrench className="h-4 w-4 text-muted-foreground" />
                Ver contrato e tarefas de manutenção
              </Link>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  )
}
