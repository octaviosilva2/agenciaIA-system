'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Clock, XCircle } from 'lucide-react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { toast } from 'sonner'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { EntityBadge } from '@/components/ui/entity-badge'
import { cn } from '@/lib/utils'
import { DEAL_STAGE } from '@/lib/format'
import { type DealStage } from '@/lib/rules/deal-stage'
import {
  changeDealStage,
  closeDeal,
  loseDeal,
  reactivateDeal,
  archiveProject,
  unarchiveProject,
  deleteProject,
} from '@/lib/actions/deals'
import {
  DraggableOpportunityCard,
  OpportunityCardContent,
  type OpportunityItem,
  type OpportunityAction,
} from '@/components/opportunities/opportunity-card'
import { EntityActionsMenu } from '@/components/entity-actions-menu'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'

/** Colunas ARRASTÁVEIS da venda. */
const ACTIVE_COLUMNS: DealStage[] = ['oportunidade', 'escopo', 'proposta', 'negociacao']

/** Colunas TERMINAIS read-only (desfechos refletidos também em Contatos). */
const TERMINAL_COLUMNS: DealStage[] = ['fechado', 'perdido', 'reativar_futuramente']

// Receitas de campo (design system §5.2)
const labelCls = 'mb-1 block text-xs font-medium'
const textareaCls =
  'w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring'

/** Coluna de um estágio. Ativa = droppable + arrastável; terminal = read-only. */
function Column({
  stage,
  items,
  terminal = false,
  onOpen,
  renderMenu,
}: {
  stage: DealStage
  items: OpportunityItem[]
  terminal?: boolean
  onOpen?: (item: OpportunityItem) => void
  renderMenu: (item: OpportunityItem) => React.ReactNode
}) {
  // Em Projetos as terminais TAMBÉM recebem drag (desfecho via arrastar).
  const { setNodeRef, isOver } = useDroppable({ id: stage })

  return (
    <div className="w-60 shrink-0">
      <div className="mb-2 flex items-center justify-between px-1">
        <EntityBadge meta={DEAL_STAGE[stage]} />
        <span className="text-xs tabular-nums text-muted-foreground">{items.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-32 flex-col gap-2 rounded-lg border p-2 transition-colors',
          isOver
            ? 'border-solid border-ring bg-accent/50'
            : terminal
              ? 'border-dashed border-border bg-muted/30'
              : 'border-dashed border-border',
        )}
      >
        {items.length === 0 ? (
          <p className="px-1 py-6 text-center text-xs text-muted-foreground">Vazio</p>
        ) : terminal ? (
          items.map((it) => (
            <OpportunityCardContent
              key={it.id}
              item={it}
              onOpen={onOpen ? () => onOpen(it) : undefined}
              menu={renderMenu(it)}
            />
          ))
        ) : (
          items.map((it) => (
            <DraggableOpportunityCard
              key={it.id}
              item={it}
              onOpen={onOpen ? () => onOpen(it) : undefined}
              menu={renderMenu(it)}
            />
          ))
        )}
      </div>
    </div>
  )
}

export function OpportunitiesKanban({
  items,
  archived = false,
}: {
  items: OpportunityItem[]
  archived?: boolean
}) {
  const router = useRouter()
  const [deals, setDeals] = useState<OpportunityItem[]>(items)
  const [activeId, setActiveId] = useState<string | null>(null)

  // Sincroniza com o servidor após cada revalidação.
  useEffect(() => setDeals(items), [items])

  // Modal: com/sem manutenção ao fechar
  const [closeTarget, setCloseTarget] = useState<OpportunityItem | null>(null)
  const [maintenance, setMaintenance] = useState<'com' | 'sem'>('com')

  // Modal: motivo ao perder
  const [lostTarget, setLostTarget] = useState<OpportunityItem | null>(null)
  const [lostReason, setLostReason] = useState('')

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const activeItem = deals.find((d) => d.id === activeId) ?? null

  /** Menu ⋯ do card: desfechos (extras) + arquivar/excluir/editar do projeto. */
  function renderMenu(item: OpportunityItem) {
    const isTerminal = TERMINAL_COLUMNS.includes(item.stage)
    const funnel = !isTerminal ? (
      <>
        <DropdownMenuItem onClick={() => handleAction('fechar', item)}>
          <CheckCircle2 />
          Fechar negócio
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAction('reativar', item)}>
          <Clock />
          Reativar futuramente
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={() => handleAction('perder', item)}>
          <XCircle />
          Marcar como perdido
        </DropdownMenuItem>
      </>
    ) : undefined
    return (
      <EntityActionsMenu
        archived={archived}
        entityName={item.project}
        onEdit={() => router.push(`/projetos/${item.id}`)}
        archiveAction={() => archiveProject(item.id)}
        unarchiveAction={() => unarchiveProject(item.id)}
        deleteAction={() => deleteProject(item.id)}
        onChanged={() => router.refresh()}
        extraItems={funnel}
      />
    )
  }

  function patchStage(id: string, stage: DealStage, maint?: 'com' | 'sem' | null) {
    setDeals((prev) => prev.map((d) => (d.id === id ? { ...d, stage, maintenance: maint ?? d.maintenance } : d)))
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id))
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveId(null)
    const { active, over } = e
    if (!over) return

    const item = deals.find((d) => d.id === String(active.id))
    if (!item) return

    const target = String(over.id) as DealStage
    if (target === item.stage) return

    // Arrastar para uma coluna terminal abre o desfecho correspondente.
    if (target === 'fechado') {
      setMaintenance('com')
      setCloseTarget(item)
      return
    }
    if (target === 'perdido') {
      setLostReason('')
      setLostTarget(item)
      return
    }
    if (target === 'reativar_futuramente') {
      void runReactivate(item)
      return
    }

    const prev = deals
    patchStage(item.id, target) // otimista
    const res = await changeDealStage(item.id, target)
    if (!res.success) {
      setDeals(prev)
      toast.error(res.message)
    } else {
      toast.success(`${item.project} → ${DEAL_STAGE[target].label}`)
    }
  }

  function handleAction(action: OpportunityAction, item: OpportunityItem) {
    if (action === 'fechar') {
      setMaintenance('com')
      setCloseTarget(item)
    } else if (action === 'perder') {
      setLostReason('')
      setLostTarget(item)
    } else if (action === 'reativar') {
      void runReactivate(item)
    }
  }

  async function runReactivate(item: OpportunityItem) {
    const prev = deals
    patchStage(item.id, 'reativar_futuramente')
    const res = await reactivateDeal(item.id)
    if (!res.success) {
      setDeals(prev)
      toast.error(res.message)
    } else {
      toast.success(`${item.project} marcado como Reativar.`)
    }
  }

  async function confirmClose() {
    if (!closeTarget) return
    const item = closeTarget
    const withMaintenance = maintenance === 'com'
    setCloseTarget(null)
    const prev = deals
    patchStage(item.id, 'fechado', withMaintenance ? 'com' : 'sem')
    const res = await closeDeal(item.id, withMaintenance)
    if (!res.success) {
      setDeals(prev)
      toast.error(res.message)
    } else {
      toast.success(
        `${item.project} fechado ${withMaintenance ? 'com' : 'sem'} manutenção · vai para Implementação.`,
      )
    }
  }

  async function confirmLost() {
    if (!lostTarget) return
    if (!lostReason.trim()) {
      toast.error('Informe o motivo da perda.')
      return
    }
    const item = lostTarget
    setLostTarget(null)
    const prev = deals
    patchStage(item.id, 'perdido')
    const res = await loseDeal(item.id, lostReason)
    if (!res.success) {
      setDeals(prev)
      toast.error(res.message)
    } else {
      toast.success(`${item.project} marcado como Perdido.`)
    }
  }

  return (
    <>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {ACTIVE_COLUMNS.map((stage) => (
            <Column
              key={stage}
              stage={stage}
              items={deals.filter((d) => d.stage === stage)}
              renderMenu={renderMenu}
              onOpen={(it) => router.push(`/projetos/${it.id}`)}
            />
          ))}

          {/* Divisória: desfechos read-only (refletem em Contatos) */}
          <div className="my-1 w-px shrink-0 self-stretch bg-border" aria-hidden />

          {TERMINAL_COLUMNS.map((stage) => (
            <Column
              key={stage}
              stage={stage}
              terminal
              items={deals.filter((d) => d.stage === stage)}
              renderMenu={renderMenu}
              onOpen={(it) => router.push(`/projetos/${it.id}`)}
            />
          ))}
        </div>
        <DragOverlay>{activeItem ? <OpportunityCardContent item={activeItem} /> : null}</DragOverlay>
      </DndContext>

      {/* Modal: com/sem manutenção ao fechar */}
      <Dialog open={!!closeTarget} onOpenChange={(open) => !open && setCloseTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fechar negócio</DialogTitle>
            <DialogDescription>
              {closeTarget ? `${closeTarget.project} — o cliente fechou com manutenção?` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="opp-maintenance"
                className="h-4 w-4 border-border"
                checked={maintenance === 'com'}
                onChange={() => setMaintenance('com')}
              />
              Com manutenção (gera contrato mensal)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="opp-maintenance"
                className="h-4 w-4 border-border"
                checked={maintenance === 'sem'}
                onChange={() => setMaintenance('sem')}
              />
              Sem manutenção
            </label>
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline">Cancelar</Button>} />
            <Button type="button" onClick={confirmClose}>Fechar negócio</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: motivo ao perder */}
      <Dialog
        open={!!lostTarget}
        onOpenChange={(open) => {
          if (!open) {
            setLostTarget(null)
            setLostReason('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar como perdido</DialogTitle>
            <DialogDescription>
              {lostTarget ? `${lostTarget.project} — informe o motivo da perda.` : ''}
            </DialogDescription>
          </DialogHeader>
          <div>
            <label className={labelCls} htmlFor="opp_lost_reason">Motivo</label>
            <textarea
              id="opp_lost_reason"
              rows={3}
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              placeholder="Ex.: escolheu concorrente / sem orçamento"
              className={textareaCls}
              autoFocus
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline">Cancelar</Button>} />
            <Button
              type="button"
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={confirmLost}
            >
              Marcar perdido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
