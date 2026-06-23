'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, Ban, XCircle } from 'lucide-react'
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
  loseDeal,
  reactivateDeal,
  disqualifyDeal,
} from '@/lib/actions/deals'
import {
  DraggableDealCard,
  DealCardContent,
  type KanbanDeal,
  type DealAction,
} from '@/components/contacts/deal-card'
import { EntityActionsMenu } from '@/components/entity-actions-menu'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { archiveContact, deleteContact } from '@/lib/actions/contacts'

/** Coluna terminal à ESQUERDA de Prospect: contatos desqualificados (read-only). */
const LEFT_TERMINAL_COLUMNS: DealStage[] = ['desqualificado']

/**
 * Colunas ARRASTÁVEIS da pré-venda. O avanço a partir de Oportunidade
 * (escopo → proposta → negociação) acontece na tela Oportunidades.
 */
const ACTIVE_COLUMNS: DealStage[] = ['prospect', 'lead', 'diagnostico', 'oportunidade']

/**
 * Colunas TERMINAIS read-only à DIREITA: aparecem para visibilidade do desfecho,
 * mas NÃO recebem drag (o desfecho é feito em Oportunidades, ou via menu do card).
 */
const RIGHT_TERMINAL_COLUMNS: DealStage[] = ['fechado', 'perdido', 'reativar_futuramente']

// Receitas de campo (design system §5.2)
const labelCls = 'mb-1 block text-xs font-medium'
const inputCls =
  'h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring'
const textareaCls =
  'w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring'

/** Coluna de um estágio. Ativa = droppable + cards arrastáveis; terminal = read-only. */
function Column({
  stage,
  deals,
  terminal = false,
  renderMenu,
}: {
  stage: DealStage
  deals: KanbanDeal[]
  terminal?: boolean
  renderMenu: (deal: KanbanDeal, terminal: boolean) => React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage, disabled: terminal })

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
          terminal
            ? 'border-dashed border-border bg-muted/30'
            : isOver
              ? 'border-solid border-ring bg-accent/50'
              : 'border-dashed border-border',
        )}
      >
        {deals.length === 0 ? (
          <p className="px-1 py-6 text-center text-xs text-muted-foreground">Vazio</p>
        ) : terminal ? (
          deals.map((d) => <DealCardContent key={d.id} deal={d} menu={renderMenu(d, true)} />)
        ) : (
          deals.map((d) => <DraggableDealCard key={d.id} deal={d} menu={renderMenu(d, false)} />)
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

  // Modal: motivo ao perder
  const [lostDeal, setLostDeal] = useState<KanbanDeal | null>(null)
  const [lostReason, setLostReason] = useState('')

  const router = useRouter()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const activeDeal = deals.find((d) => d.id === activeId) ?? null

  /** Menu ⋯ do card: ações de funil (extras) + arquivar/excluir/editar do contato. */
  function renderMenu(deal: KanbanDeal, terminal: boolean) {
    const funnel = !terminal ? (
      <>
        <DropdownMenuItem onClick={() => handleAction('reativar', deal)}>
          <Clock />
          Reativar futuramente
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!canDisqualify(deal.stage)}
          onClick={() => handleAction('desqualificar', deal)}
        >
          <Ban />
          Desqualificar
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={() => handleAction('perder', deal)}>
          <XCircle />
          Marcar como perdido
        </DropdownMenuItem>
      </>
    ) : undefined
    return (
      <EntityActionsMenu
        archived={false}
        entityName={deal.company}
        onEdit={() => router.push(`/contatos/${deal.companyId}`)}
        archiveAction={() => archiveContact(deal.companyId)}
        deleteAction={() => deleteContact(deal.companyId)}
        onChanged={() => router.refresh()}
        extraItems={funnel}
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

  function handleAction(action: DealAction, deal: KanbanDeal) {
    if (action === 'perder') {
      setLostReason('')
      setLostDeal(deal)
    } else if (action === 'reativar') {
      void runReactivate(deal)
    } else if (action === 'desqualificar') {
      void runDisqualify(deal)
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

  async function confirmLost() {
    if (!lostDeal) return
    if (!lostReason.trim()) {
      toast.error('Informe o motivo da perda.')
      return
    }
    const deal = lostDeal
    const reason = lostReason
    setLostDeal(null)

    const prev = deals
    patchStage(deal.id, 'perdido')
    const res = await loseDeal(deal.id, reason)
    if (!res.success) {
      setDeals(prev)
      toast.error(res.message)
    } else {
      toast.success(`${deal.company} marcado como Perdido.`)
    }
  }

  return (
    <>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {/* Terminal à esquerda: desqualificados (read-only) */}
          {LEFT_TERMINAL_COLUMNS.map((stage) => (
            <Column
              key={stage}
              stage={stage}
              terminal
              deals={visibleDeals.filter((d) => d.stage === stage)}
              renderMenu={renderMenu}
            />
          ))}

          <div className="my-1 w-px shrink-0 self-stretch bg-border" aria-hidden />

          {ACTIVE_COLUMNS.map((stage) => (
            <Column
              key={stage}
              stage={stage}
              deals={visibleDeals.filter((d) => d.stage === stage)}
              renderMenu={renderMenu}
            />
          ))}

          {/* Divisória: daqui pra frente são desfechos read-only (vêm de Oportunidades) */}
          <div className="my-1 w-px shrink-0 self-stretch bg-border" aria-hidden />

          {RIGHT_TERMINAL_COLUMNS.map((stage) => (
            <Column
              key={stage}
              stage={stage}
              terminal
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

      {/* Modal: motivo ao perder */}
      <Dialog
        open={!!lostDeal}
        onOpenChange={(open) => {
          if (!open) {
            setLostDeal(null)
            setLostReason('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar como perdido</DialogTitle>
            <DialogDescription>
              {lostDeal ? `${lostDeal.company} — informe o motivo da perda.` : ''}
            </DialogDescription>
          </DialogHeader>
          <div>
            <label className={labelCls} htmlFor="lost_reason">Motivo</label>
            <textarea
              id="lost_reason"
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
