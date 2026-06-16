'use client'

import { useDraggable } from '@dnd-kit/core'
import { MoreHorizontal, Clock, XCircle, Ban } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import { canDisqualify, type DealStage } from '@/lib/rules/deal-stage'

/** Deal exibido no kanban (forma do dado que a query vai entregar depois). */
export type KanbanDeal = {
  id: string
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
  onAction,
}: {
  deal: KanbanDeal
  dragging?: boolean
  onAction?: (action: DealAction, deal: KanbanDeal) => void
}) {
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
          <p className="truncate text-sm font-medium">{deal.company}</p>
          <p className="truncate text-xs text-muted-foreground">{deal.title}</p>
        </div>
        {onAction && !isTerminal && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="h-6 w-6 shrink-0"
                  aria-label="Ações do negócio"
                  // impede o sensor de drag de capturar o clique no menu
                  onPointerDown={(e) => e.stopPropagation()}
                />
              }
            >
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onAction('reativar', deal)}>
                <Clock />
                Reativar futuramente
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!canDisqualify(deal.stage)}
                onClick={() => onAction('desqualificar', deal)}
              >
                <Ban />
                Desqualificar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => onAction('perder', deal)}>
                <XCircle />
                Marcar como perdido
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
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
  onAction,
}: {
  deal: KanbanDeal
  onAction: (action: DealAction, deal: KanbanDeal) => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: deal.id })

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className="touch-none cursor-grab active:cursor-grabbing"
    >
      <DealCardContent deal={deal} dragging={isDragging} onAction={onAction} />
    </div>
  )
}
