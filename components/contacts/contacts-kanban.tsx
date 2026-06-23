'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { validateStageTransition, canDisqualify, type DealStage } from '@/lib/rules/deal-stage'
import {
  changeDealStage,
  createProjectAndAdvance,
  reactivateDeal,
  disqualifyDeal,
} from '@/lib/actions/deals'
import {
  DraggableDealCard,
  DealCardContent,
  type KanbanDeal,
} from '@/components/contacts/deal-card'
import { EntityActionsMenu } from '@/components/entity-actions-menu'
import { archiveContact, deleteContact } from '@/lib/actions/contacts'

/** Coluna terminal à ESQUERDA: desqualificados. Aceita drop (desqualifica ao soltar). */
const LEFT_COLUMNS: DealStage[] = ['desqualificado']

/** Colunas ATIVAS da pré-venda (drag livre entre elas). */
const ACTIVE_COLUMNS: DealStage[] = ['prospect', 'lead', 'diagnostico', 'oportunidade']

/**
 * Colunas à DIREITA: `fechado` é read-only (fechar acontece em Projetos);
 * `reativar_futuramente` aceita drop. `perdido` NÃO aparece no kanban de contatos —
 * perder é desfecho da tela de Projetos (B3).
 */
const RIGHT_COLUMNS: DealStage[] = ['fechado', 'reativar_futuramente']

/** Estágios terminais que, ao receberem um card solto, disparam uma action de desfecho. */
const DROP_OUTCOME: DealStage[] = ['desqualificado', 'reativar_futuramente']

// Receitas de campo (design system §5.2)
const labelCls = 'mb-1 block text-xs font-medium'
const inputCls =
  'h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring'
const textareaCls =
  'w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring'

/**
 * Coluna de um estágio.
 * - `droppable`: aceita receber um card (ativa ou terminal de desfecho).
 * - `draggableCards`: seus próprios cards podem ser arrastados (só nas ativas).
 */
function Column({
  stage,
  deals,
  droppable,
  draggableCards,
  renderMenu,
}: {
  stage: DealStage
  deals: KanbanDeal[]
  droppable: boolean
  draggableCards: boolean
  renderMenu: (deal: KanbanDeal) => React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage, disabled: !droppable })

  return (
    <div className="w-60 shrink-0">
      <div className="mb-2 flex items-center justify-between px-1">
        <EntityBadge meta={DEAL_STAGE[stage]} />
        <span className="text-xs tabular-nums text-muted-foreground">{deals.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-32 flex-col gap-2 rounded-lg border p-2 transition-colors',
          !droppable
            ? 'border-dashed border-border bg-muted/30'
            : isOver
              ? 'border-solid border-ring bg-accent/50'
              : 'border-dashed border-border',
        )}
      >
        {deals.length === 0 ? (
          <p className="px-1 py-6 text-center text-xs text-muted-foreground">Vazio</p>
        ) : draggableCards ? (
          deals.map((d) => <DraggableDealCard key={d.id} deal={d} menu={renderMenu(d)} />)
        ) : (
          deals.map((d) => <DealCardContent key={d.id} deal={d} menu={renderMenu(d)} />)
        )}
      </div>
    </div>
  )
}

export function ContactsKanban({
  deals: dealsProp,
  stageFilter = 'all',
}: {
  deals: KanbanDeal[]
  /** Estágio selecionado no filtro da tela; 'all' mostra todas as colunas cheias. */
  stageFilter?: DealStage | 'all'
}) {
  const [deals, setDeals] = useState<KanbanDeal[]>(dealsProp)
  const [activeId, setActiveId] = useState<string | null>(null)

  // Sincroniza com o servidor após cada revalidação.
  useEffect(() => setDeals(dealsProp), [dealsProp])

  // Filtro de estágio: quando ativo, só os cards do estágio escolhido aparecem
  // (o drag continua operando sobre o conjunto completo `deals`).
  const visibleDeals = stageFilter === 'all' ? deals : deals.filter((d) => d.stage === stageFilter)

  // Modal: criar projeto ao mover para Oportunidade
  const [pendingMove, setPendingMove] = useState<KanbanDeal | null>(null)
  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')

  const router = useRouter()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const activeDeal = deals.find((d) => d.id === activeId) ?? null

  /** Menu ⋯ do card: só Editar/Arquivar/Excluir do contato (sem desfechos de funil — B3). */
  function renderMenu(deal: KanbanDeal) {
    return (
      <EntityActionsMenu
        archived={false}
        entityName={deal.company}
        onEdit={() => router.push(`/contatos/${deal.companyId}`)}
        archiveAction={() => archiveContact(deal.companyId)}
        deleteAction={() => deleteContact(deal.companyId)}
        onChanged={() => router.refresh()}
      />
    )
  }

  function patchStage(id: string, stage: DealStage, hasProject?: boolean) {
    setDeals((prev) =>
      prev.map((d) => (d.id === id ? { ...d, stage, hasProject: hasProject ?? d.hasProject } : d)),
    )
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id))
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveId(null)
    const { active, over } = e
    if (!over) return

    const deal = deals.find((d) => d.id === String(active.id))
    if (!deal) return

    const target = String(over.id) as DealStage
    if (target === deal.stage) return

    // Desfechos por arrasto nas colunas terminais droppable (B3).
    if (target === 'desqualificado') {
      if (!canDisqualify(deal.stage)) {
        toast.error('Só é possível desqualificar nas fases de Prospect ou Lead.')
        return
      }
      void runDisqualify(deal)
      return
    }
    if (target === 'reativar_futuramente') {
      void runReactivate(deal)
      return
    }

    const check = validateStageTransition(deal.stage, target, deal.hasProject)
    if (!check.valid) {
      toast.error(check.error ?? 'Transição inválida.')
      return
    }

    // Mover para Oportunidade sem projeto → abre o modal de criar projeto.
    if (target === 'oportunidade' && !deal.hasProject) {
      setPendingMove(deal)
      setProjectName('')
      setProjectDescription('')
      return
    }

    const prev = deals
    patchStage(deal.id, target) // otimista
    const res = await changeDealStage(deal.id, target)
    if (!res.success) {
      setDeals(prev)
      toast.error(res.message)
    } else {
      toast.success(`${deal.company} → ${DEAL_STAGE[target].label}`)
    }
  }

  async function confirmProject() {
    if (!pendingMove) return
    if (!projectName.trim()) {
      toast.error('Informe o nome do projeto.')
      return
    }
    const deal = pendingMove
    const name = projectName.trim()
    setPendingMove(null)
    setProjectName('')
    setProjectDescription('')

    const prev = deals
    patchStage(deal.id, 'oportunidade', true) // otimista
    const res = await createProjectAndAdvance(deal.id, name, projectDescription)
    if (!res.success) {
      setDeals(prev)
      toast.error(res.message)
    } else {
      toast.success(`Projeto "${name}" criado · ${deal.company} → Oportunidade`)
    }
  }

  async function runReactivate(deal: KanbanDeal) {
    const prev = deals
    patchStage(deal.id, 'reativar_futuramente')
    const res = await reactivateDeal(deal.id)
    if (!res.success) {
      setDeals(prev)
      toast.error(res.message)
    } else {
      toast.success(`${deal.company} marcado como Reativar.`)
    }
  }

  async function runDisqualify(deal: KanbanDeal) {
    const prev = deals
    patchStage(deal.id, 'desqualificado')
    const res = await disqualifyDeal(deal.id)
    if (!res.success) {
      setDeals(prev)
      toast.error(res.message)
    } else {
      toast.success(`${deal.company} desqualificado.`)
    }
  }

  return (
    <>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {/* Terminal à esquerda: desqualificados (aceita drop) */}
          {LEFT_COLUMNS.map((stage) => (
            <Column
              key={stage}
              stage={stage}
              droppable
              draggableCards={false}
              deals={visibleDeals.filter((d) => d.stage === stage)}
              renderMenu={renderMenu}
            />
          ))}

          <div className="my-1 w-px shrink-0 self-stretch bg-border" aria-hidden />

          {ACTIVE_COLUMNS.map((stage) => (
            <Column
              key={stage}
              stage={stage}
              droppable
              draggableCards
              deals={visibleDeals.filter((d) => d.stage === stage)}
              renderMenu={renderMenu}
            />
          ))}

          {/* Divisória: desfechos à direita (fechado read-only; reativar aceita drop) */}
          <div className="my-1 w-px shrink-0 self-stretch bg-border" aria-hidden />

          {RIGHT_COLUMNS.map((stage) => (
            <Column
              key={stage}
              stage={stage}
              droppable={DROP_OUTCOME.includes(stage)}
              draggableCards={false}
              deals={visibleDeals.filter((d) => d.stage === stage)}
              renderMenu={renderMenu}
            />
          ))}
        </div>
        <DragOverlay>{activeDeal ? <DealCardContent deal={activeDeal} /> : null}</DragOverlay>
      </DndContext>

      {/* Modal: criar projeto ao mover para Oportunidade */}
      <Dialog
        open={!!pendingMove}
        onOpenChange={(open) => {
          if (!open) {
            setPendingMove(null)
            setProjectName('')
            setProjectDescription('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar projeto</DialogTitle>
            <DialogDescription>
              {pendingMove
                ? `${pendingMove.company} vai para Oportunidade — crie o projeto vinculado.`
                : 'Mover para Oportunidade exige um projeto vinculado.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className={labelCls} htmlFor="project_name">
                Nome do projeto <span className="text-red-600 dark:text-red-400">*</span>
              </label>
              <input
                id="project_name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Ex.: CRM Moda em Foco"
                className={inputCls}
                autoFocus
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="project_description">Descrição</label>
              <textarea
                id="project_description"
                rows={3}
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                placeholder="Escopo inicial, contexto, o que será entregue…"
                className={textareaCls}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline">Cancelar</Button>} />
            <Button type="button" onClick={confirmProject}>Criar e mover</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
