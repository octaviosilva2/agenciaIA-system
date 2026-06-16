'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Search, List, LayoutGrid, Inbox } from 'lucide-react'
import { EntityBadge } from '@/components/ui/entity-badge'
import { PeriodFilter } from '@/components/period-filter'
import { NewOpportunityDialog } from '@/components/opportunities/new-opportunity-dialog'
import { OpportunitiesKanban } from '@/components/opportunities/opportunities-kanban'
import { ImplementationBoard } from '@/components/projects/implementation-board'
import { MaintenanceList } from '@/components/projects/maintenance-list'
import { DEAL_STAGE, PROJECT_STATUS, deliveryCountdown, formatCurrency, formatDate, isOverdue } from '@/lib/format'
import type { OpportunityItem } from '@/components/opportunities/opportunity-card'
import type { ImplementationItem, MaintenanceItem } from '@/lib/queries/projects-board'
import type { CompanyOption } from '@/lib/queries/companies'
import type { DealStage } from '@/lib/rules/deal-stage'

type Phase = 'venda' | 'implementacao' | 'manutencao'

/** Estágios do funil comercial exibidos no filtro de Projetos. */
const SALE_STAGES: DealStage[] = [
  'oportunidade',
  'escopo',
  'proposta',
  'negociacao',
  'fechado',
  'perdido',
  'reativar_futuramente',
]

const PHASE_TITLE: Record<Phase, string> = {
  venda: 'Projetos',
  implementacao: 'Implementação',
  manutencao: 'Manutenção',
}

const PHASE_SUBTITLE: Record<Phase, string> = {
  venda: 'Projetos no funil comercial — da Oportunidade ao fechamento.',
  implementacao: 'Projetos fechados, por etapa de execução.',
  manutencao: 'Contratos de manutenção ativos.',
}

const segCls = (active: boolean) =>
  `flex h-8 items-center gap-1.5 rounded-[6px] px-2.5 text-sm font-medium transition-colors ${
    active
      ? 'bg-primary text-primary-foreground'
      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
  }`

/**
 * Tela de projetos focada numa fase.
 * Venda (/projetos): board comercial editável. Implementação e Manutenção (Operacional):
 * recortes read-only. A tela de implementação detalhada vive em /implementacao/[projectId].
 */
export function ProjectsView({
  phase,
  sale = [],
  implementation = [],
  maintenance = [],
  contacts = [],
}: {
  phase: Phase
  sale?: OpportunityItem[]
  implementation?: ImplementationItem[]
  maintenance?: MaintenanceItem[]
  contacts?: CompanyOption[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const view = searchParams.get('view') === 'kanban' ? 'kanban' : 'lista'
  const [search, setSearch] = useState('')
  const [stage, setStage] = useState<DealStage | 'all'>('all')

  function setView(next: 'lista' | 'kanban') {
    const params = new URLSearchParams(searchParams.toString())
    if (next === 'lista') params.delete('view')
    else params.set('view', next)
    router.push(`${pathname}?${params.toString()}`)
  }

  const q = search.trim().toLowerCase()
  const saleRows = useMemo(
    () =>
      sale.filter((i) => {
        const matchesSearch =
          !q || i.project.toLowerCase().includes(q) || i.company.toLowerCase().includes(q)
        const matchesStage = stage === 'all' || i.stage === stage
        return matchesSearch && matchesStage
      }),
    [sale, q, stage],
  )
  const implRows = useMemo(
    () =>
      implementation.filter(
        (i) => !q || i.project.toLowerCase().includes(q) || i.company.toLowerCase().includes(q),
      ),
    [implementation, q],
  )
  const maintRows = useMemo(
    () =>
      maintenance.filter(
        (i) =>
          !q ||
          (i.projectName?.toLowerCase().includes(q) ?? false) ||
          i.company.toLowerCase().includes(q),
      ),
    [maintenance, q],
  )

  const showViewToggle = phase !== 'manutencao'

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{PHASE_TITLE[phase]}</h2>
          <p className="text-sm text-muted-foreground">{PHASE_SUBTITLE[phase]}</p>
        </div>
        {phase === 'venda' && <NewOpportunityDialog contacts={contacts} />}
      </header>

      {/* Filtros + alternância de visão */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por projeto ou contato…"
            className="h-9 w-full rounded-md border border-border bg-card pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {phase === 'venda' && (
          <select
            value={stage}
            onChange={(e) => setStage(e.target.value as DealStage | 'all')}
            className="h-9 rounded-md border border-border bg-card px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            aria-label="Filtrar por estágio"
          >
            <option value="all">Todos os estágios</option>
            {SALE_STAGES.map((s) => (
              <option key={s} value={s}>
                {DEAL_STAGE[s].label}
              </option>
            ))}
          </select>
        )}

        <PeriodFilter />

        {showViewToggle && (
          <div className="ml-auto inline-flex items-center rounded-md border border-border bg-card p-0.5">
            <button type="button" onClick={() => setView('lista')} aria-pressed={view === 'lista'} className={segCls(view === 'lista')}>
              <List className="h-4 w-4" />
              Lista
            </button>
            <button type="button" onClick={() => setView('kanban')} aria-pressed={view === 'kanban'} className={segCls(view === 'kanban')}>
              <LayoutGrid className="h-4 w-4" />
              Kanban
            </button>
          </div>
        )}
      </div>

      {/* Conteúdo por fase */}
      {phase === 'venda' && (
        view === 'kanban' ? (
          <OpportunitiesKanban items={saleRows} />
        ) : saleRows.length === 0 ? (
          <EmptyState message="Nenhum projeto em venda" hint="Crie um projeto ou ajuste a busca." />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Projeto</th>
                  <th className="px-3 py-2 font-medium">Cliente</th>
                  <th className="px-3 py-2 font-medium">Estágio</th>
                  <th className="px-3 py-2 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {saleRows.map((i) => (
                  <tr
                    key={i.id}
                    onClick={() => router.push(`/projetos/${i.id}`)}
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-accent"
                  >
                    <td className="px-3 py-2 font-medium">{i.project}</td>
                    <td className="px-3 py-2 text-muted-foreground">{i.company}</td>
                    <td className="px-3 py-2">
                      <EntityBadge meta={DEAL_STAGE[i.stage]} />
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">
                      {i.value != null ? formatCurrency(i.value) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {phase === 'implementacao' && (
        view === 'kanban' ? (
          <ImplementationBoard items={implRows} />
        ) : implRows.length === 0 ? (
          <EmptyState message="Nenhum projeto em implementação" hint="Projetos entram aqui ao fechar o negócio." />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Projeto</th>
                  <th className="px-3 py-2 font-medium">Cliente</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 text-right font-medium">Valor</th>
                  <th className="px-3 py-2 font-medium">Entrega</th>
                </tr>
              </thead>
              <tbody>
                {implRows.map((i) => {
                  const overdue = i.status !== 'entregue' && isOverdue(i.dueDate)
                  return (
                    <tr
                      key={i.id}
                      onClick={() => router.push(`/implementacao/${i.projectId}`)}
                      className="cursor-pointer border-b border-border last:border-0 hover:bg-accent"
                    >
                      <td className="px-3 py-2 font-medium">{i.project}</td>
                      <td className="px-3 py-2 text-muted-foreground">{i.company}</td>
                      <td className="px-3 py-2">
                        <EntityBadge meta={PROJECT_STATUS[i.status]} />
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">
                        {i.value != null ? formatCurrency(i.value) : '—'}
                      </td>
                      <td className={`px-3 py-2 ${overdue ? 'font-medium text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
                        {i.dueDate ? formatDate(i.dueDate) : '—'}
                        {i.dueDate && i.status !== 'entregue' && ` · ${deliveryCountdown(i.dueDate)}`}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {phase === 'manutencao' && <MaintenanceList items={maintRows} />}
    </div>
  )
}

function EmptyState({ message, hint }: { message: string; hint: string }) {
  return (
    <div className="grid place-items-center rounded-lg border border-dashed border-border bg-card p-10 text-center">
      <Inbox className="h-6 w-6 text-muted-foreground/50" />
      <p className="mt-2 text-sm font-medium">{message}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}
