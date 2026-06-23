'use client'

import { useDraggable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import type { DealStage } from '@/lib/rules/deal-stage'

/** Oportunidade exibida no kanban/lista = projeto + contato. */
export type OpportunityItem = {
  id: string // deal id (usado no drag e nas actions)
  project: string // nome do projeto (destaque)
  company: string // nome do contato
  contactId: string
  stage: DealStage // oportunidade…negociacao (ativos) ou fechado/perdido/reativar (terminais)
  value: number | null
  /** Só quando stage='fechado': 'com'/'sem' manutenção (descrição). */
  maintenance?: 'com' | 'sem' | null
}

/** Desfechos disparados pelo menu do card (não são colunas ativas). */
export type OpportunityAction = 'fechar' | 'perder' | 'reativar'

/** Estágios terminais que aparecem como colunas read-only no kanban. */
const TERMINAL_CARD_STAGES: DealStage[] = ['fechado', 'perdido', 'reativar_futuramente']

/** Conteúdo visual do card (usado na coluna e no DragOverlay). */
export function OpportunityCardContent({
  item,
  dragging = false,
  onOpen,
  menu,
}: {
  item: OpportunityItem
  dragging?: boolean
  /** Quando presente, o corpo do card vira clicável (abre o projeto). */
  onOpen?: () => void
  /** Menu de ações (⋯) no canto superior direito — montado pelo board. */
  menu?: React.ReactNode
}) {
  const outcomeNote =
    item.stage === 'fechado' && item.maintenance
      ? `Fechado · ${item.maintenance === 'com' ? 'com' : 'sem'} manutenção`
      : null

  return (
    <div
      onClick={onOpen}
      className={cn(
        'rounded-lg border border-border bg-card p-3 shadow-sm',
        dragging && 'opacity-50',
        onOpen && 'cursor-pointer transition-colors hover:bg-accent',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{item.project}</p>
          <p className="truncate text-xs text-muted-foreground">{item.company}</p>
        </div>
        {menu}
      </div>

      {outcomeNote && (
        <p className="mt-2 truncate text-xs text-muted-foreground">{outcomeNote}</p>
      )}

      <div className="mt-2">
        <span className="font-mono text-xs font-medium tabular-nums">
          {item.value != null ? formatCurrency(item.value) : '—'}
        </span>
      </div>
    </div>
  )
}

/** Card arrastável (dnd-kit). */
export function DraggableOpportunityCard({
  item,
  onOpen,
  menu,
}: {
  item: OpportunityItem
  /** Quando presente, o corpo do card abre o projeto (clique sem arrasto). */
  onOpen?: () => void
  menu?: React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id })

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className="touch-none cursor-grab active:cursor-grabbing"
    >
      <OpportunityCardContent item={item} dragging={isDragging} onOpen={onOpen} menu={menu} />
    </div>
  )
}
