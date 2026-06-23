'use client'

import { useDraggable } from '@dnd-kit/core'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import { type DealStage } from '@/lib/rules/deal-stage'

/** Deal exibido no kanban (forma do dado que a query vai entregar depois). */
export type KanbanDeal = {
  id: string
  companyId: string
  company: string
  title: string
  stage: DealStage
  estimatedValue: number | null
  nextAction: string | null
  hasProject: boolean
  /** Só quando stage='fechado': mostra "com/sem manutenção" como descrição. */
  maintenance?: 'com' | 'sem' | null
}

/** Estágios terminais que aparecem como colunas read-only no kanban de contatos. */
const TERMINAL_CARD_STAGES: DealStage[] = [
  'desqualificado',
  'fechado',
  'perdido',
  'reativar_futuramente',
]

/**
 * Ações de desfecho da PRÉ-VENDA disparadas pelo menu do card.
 * "Fechar" não existe aqui — fechamento acontece na tela Oportunidades.
 */
export type DealAction = 'perder' | 'reativar' | 'desqualificar'

/** Conteúdo visual do card (usado tanto na coluna quanto no DragOverlay). */
export function DealCardContent({
  deal,
  dragging = false,
  menu,
}: {
  deal: KanbanDeal
  dragging?: boolean
  /** Menu de ações (⋯) no canto superior direito — montado pelo board. */
  menu?: React.ReactNode
}) {
  const router = useRouter()
  const isTerminal = TERMINAL_CARD_STAGES.includes(deal.stage)
  // No fechado, a manutenção é só descrição (não badge separado).
  const outcomeNote =
    deal.stage === 'fechado' && deal.maintenance
      ? `Fechado · ${deal.maintenance === 'com' ? 'com' : 'sem'} manutenção`
      : null

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card p-3 shadow-sm',
        dragging && 'opacity-50',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {/* Nome clicável → perfil do contato. stopPropagation no pointer evita conflito com o drag. */}
          <p
            className="cursor-pointer truncate text-sm font-medium hover:underline"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              router.push(`/contatos/${deal.companyId}`)
            }}
          >
            {deal.company}
          </p>
          <p className="truncate text-xs text-muted-foreground">{deal.title}</p>
        </div>
        {menu}
      </div>

      {outcomeNote ? (
        <p className="mt-2 truncate text-xs text-muted-foreground">{outcomeNote}</p>
      ) : (
        !isTerminal &&
        deal.nextAction && (
          <p className="mt-2 truncate text-xs text-muted-foreground">Próx.: {deal.nextAction}</p>
        )
      )}

      <div className="mt-2">
        <span className="font-mono text-xs font-medium tabular-nums">
          {deal.estimatedValue != null ? formatCurrency(deal.estimatedValue) : '—'}
        </span>
      </div>
    </div>
  )
}

/** Card arrastável (dnd-kit) que envolve o conteúdo. */
export function DraggableDealCard({
  deal,
  menu,
}: {
  deal: KanbanDeal
  menu?: React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: deal.id })

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className="touch-none cursor-grab active:cursor-grabbing"
    >
      <DealCardContent deal={deal} dragging={isDragging} menu={menu} />
    </div>
  )
}
