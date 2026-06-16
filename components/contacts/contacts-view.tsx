'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Search, List, LayoutGrid, Inbox } from 'lucide-react'
import { EntityBadge } from '@/components/ui/entity-badge'
import { PeriodFilter } from '@/components/period-filter'
import { NewContactDialog } from '@/components/contacts/new-contact-dialog'
import { ContactsKanban } from '@/components/contacts/contacts-kanban'
import { DEAL_STAGE, formatDate } from '@/lib/format'
import type { ContactRow } from '@/lib/queries/contacts'
import type { KanbanDeal } from '@/components/contacts/deal-card'
import type { Database } from '@/lib/supabase/types'

type DealStage = Database['public']['Enums']['deal_stage']

/** Estágios de pré-venda exibidos no filtro de Contatos. */
const CONTACT_STAGES: DealStage[] = [
  'prospect',
  'lead',
  'diagnostico',
  'oportunidade',
  'desqualificado',
]

export function ContactsView({
  contacts,
  deals,
}: {
  contacts: ContactRow[]
  deals: KanbanDeal[]
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

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return contacts.filter((c) => {
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.segment?.toLowerCase().includes(q) ?? false) ||
        (c.city?.toLowerCase().includes(q) ?? false)
      const matchesStage = stage === 'all' || c.currentStage === stage
      return matchesSearch && matchesStage
    })
  }, [contacts, search, stage])

  return (
    <div className="space-y-4">
      {/* Cabeçalho da página */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Contatos</h2>
          <p className="text-sm text-muted-foreground">
            Empresas e pessoas, pelo estágio no funil.
          </p>
        </div>
        <NewContactDialog />
      </header>

      {/* Barra de filtros + alternância de visão */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, segmento, cidade…"
            className="h-9 w-full rounded-md border border-border bg-card pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <select
          value={stage}
          onChange={(e) => setStage(e.target.value as DealStage | 'all')}
          className="h-9 rounded-md border border-border bg-card px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          aria-label="Filtrar por estágio do funil"
        >
          <option value="all">Todos os estágios</option>
          {CONTACT_STAGES.map((s) => (
            <option key={s} value={s}>
              {DEAL_STAGE[s].label}
            </option>
          ))}
        </select>

        <PeriodFilter />

        {/* Toggle Lista / Kanban */}
        <div className="ml-auto inline-flex items-center rounded-md border border-border bg-card p-0.5">
          <button
            type="button"
            onClick={() => setView('lista')}
            aria-pressed={view === 'lista'}
            className={`flex h-8 items-center gap-1.5 rounded-[6px] px-2.5 text-sm font-medium transition-colors ${
              view === 'lista'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            <List className="h-4 w-4" />
            Lista
          </button>
          <button
            type="button"
            onClick={() => setView('kanban')}
            aria-pressed={view === 'kanban'}
            className={`flex h-8 items-center gap-1.5 rounded-[6px] px-2.5 text-sm font-medium transition-colors ${
              view === 'kanban'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
            Kanban
          </button>
        </div>
      </div>

      {view === 'kanban' ? (
        <ContactsKanban deals={deals} />
      ) : rows.length === 0 ? (
        <div className="grid place-items-center rounded-lg border border-dashed border-border bg-card p-10 text-center">
          <Inbox className="h-6 w-6 text-muted-foreground/50" />
          <p className="mt-2 text-sm font-medium">Nenhum contato encontrado</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Ajuste a busca ou os filtros, ou cadastre um novo contato.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 font-medium">Empresa</th>
                <th className="px-3 py-2 font-medium">Estágio</th>
                <th className="px-3 py-2 font-medium">Projeto</th>
                <th className="px-3 py-2 font-medium">Última atividade</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => router.push(`/contatos/${c.id}`)}
                  className="cursor-pointer border-b border-border last:border-0 hover:bg-accent"
                >
                  <td className="px-3 py-2">
                    <div className="font-medium">{c.name}</div>
                    {(c.segment || c.city) && (
                      <div className="text-xs text-muted-foreground">
                        {[c.segment, c.city].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {c.currentStage ? (
                      <EntityBadge meta={DEAL_STAGE[c.currentStage]} />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {c.activeProject ?? <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {c.lastActivityAt ? formatDate(c.lastActivityAt) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
