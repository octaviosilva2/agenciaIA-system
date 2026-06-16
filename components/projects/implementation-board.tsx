'use client'

import { useRouter } from 'next/navigation'
import { EntityBadge } from '@/components/ui/entity-badge'
import { PROJECT_STATUS, deliveryCountdown, formatCurrency, formatDate, isOverdue } from '@/lib/format'
import type { ImplementationItem } from '@/lib/queries/projects-board'
import type { Database } from '@/lib/supabase/types'

type ProjectStatus = Database['public']['Enums']['project_status']

/** Colunas fixas da implementação (macro-status do projeto). */
const COLUMNS: ProjectStatus[] = ['a_iniciar', 'briefing', 'desenvolvimento', 'revisao', 'entregue']

/**
 * Kanban read-only da fase Implementação (por project_status).
 * A edição/arraste de status é da área Operacional (gera project_stage_events).
 */
export function ImplementationBoard({ items }: { items: ImplementationItem[] }) {
  const router = useRouter()

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {COLUMNS.map((status) => {
        const cards = items.filter((i) => i.status === status)
        return (
          <div key={status} className="w-60 shrink-0">
            <div className="mb-2 flex items-center justify-between px-1">
              <EntityBadge meta={PROJECT_STATUS[status]} />
              <span className="text-xs tabular-nums text-muted-foreground">{cards.length}</span>
            </div>
            <div className="flex min-h-32 flex-col gap-2 rounded-lg border border-dashed border-border p-2">
              {cards.length === 0 ? (
                <p className="px-1 py-6 text-center text-xs text-muted-foreground">Vazio</p>
              ) : (
                cards.map((i) => {
                  const overdue = status !== 'entregue' && isOverdue(i.dueDate)
                  return (
                    <button
                      key={i.id}
                      type="button"
                      onClick={() => router.push(`/implementacao/${i.projectId}`)}
                      className="cursor-pointer rounded-lg border border-border bg-card p-3 text-left shadow-sm transition-colors hover:bg-accent"
                    >
                      <p className="truncate text-sm font-medium">{i.project}</p>
                      <p className="truncate text-xs text-muted-foreground">{i.company}</p>
                      <div className="mt-2">
                        <span className="font-mono text-xs font-medium tabular-nums">
                          {i.value != null ? formatCurrency(i.value) : '—'}
                        </span>
                      </div>
                      {i.dueDate && (
                        <p
                          className={`mt-1.5 text-xs ${
                            overdue
                              ? 'font-medium text-red-600 dark:text-red-400'
                              : 'text-muted-foreground'
                          }`}
                        >
                          Entrega: {formatDate(i.dueDate)}
                          {status !== 'entregue' && ` · ${deliveryCountdown(i.dueDate)}`}
                        </p>
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
