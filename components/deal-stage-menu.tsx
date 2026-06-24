'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Check, CheckCircle2, Clock, Ban, XCircle } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
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
import { DEAL_STAGE } from '@/lib/format'
import { validateStageTransition, canDisqualify, type DealStage } from '@/lib/rules/deal-stage'
import {
  changeDealStage,
  createProjectAndAdvance,
  closeDeal,
  loseDeal,
  reactivateDeal,
  disqualifyDeal,
} from '@/lib/actions/deals'

/**
 * Estágios-alvo oferecidos por aba — espelham as colunas arrastáveis de cada kanban.
 * Contatos: pré-venda (contacts-kanban). Projetos: venda (opportunities-kanban).
 */
const CONTACT_TARGETS: DealStage[] = ['prospect', 'lead', 'diagnostico', 'oportunidade']
const PROJECT_TARGETS: DealStage[] = ['oportunidade', 'escopo', 'proposta', 'negociacao']

// Receitas de campo (design system §5.2)
const labelCls = 'mb-1 block text-xs font-medium'
const inputCls =
  'h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring'
const textareaCls =
  'w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring'

/** Data de hoje em 'yyyy-MM-dd' (default dos seletores de data). */
function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

/** Não propagar o clique para a linha clicável (que navega para o detalhe). */
function stop(e: { stopPropagation: () => void }) {
  e.stopPropagation()
}

/**
 * Badge de estágio clicável usado nas LISTAS de Contatos e Projetos.
 * Abre um menu com as mesmas ações da respectiva aba (kanban), reusando as
 * server actions de lib/actions/deals e os modais de criar-projeto / motivo /
 * com-sem manutenção. O kanban (drag) continua intacto.
 */
export function DealStageMenu({
  context,
  dealId,
  stage,
  /** Nome exibido nos modais (empresa no contexto contato; projeto no projeto). */
  name,
  hasProject,
}: {
  context: 'contato' | 'projeto'
  dealId: string
  stage: DealStage
  name: string
  hasProject: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  // Modal: criar projeto ao mover para Oportunidade (contexto contato sem projeto)
  const [createOpen, setCreateOpen] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')

  // Modal: motivo ao perder
  const [lostOpen, setLostOpen] = useState(false)
  const [lostReason, setLostReason] = useState('')
  const [lostDate, setLostDate] = useState(todayISO()) // data da perda (retroativa)

  // Modal: com/sem manutenção ao fechar (contexto projeto)
  const [closeOpen, setCloseOpen] = useState(false)
  const [maintenance, setMaintenance] = useState<'com' | 'sem'>('com')
  const [closeDate, setCloseDate] = useState(todayISO()) // data do fechamento (retroativa)

  const targets = context === 'contato' ? CONTACT_TARGETS : PROJECT_TARGETS

  /** Move para um estágio-alvo, respeitando as regras de transição. */
  async function moveTo(target: DealStage) {
    if (target === stage) return

    // Mover para Oportunidade sem projeto → abre o modal de criar projeto.
    if (target === 'oportunidade' && !hasProject) {
      setProjectName('')
      setProjectDescription('')
      setCreateOpen(true)
      return
    }

    const check = validateStageTransition(stage, target, hasProject)
    if (!check.valid) {
      toast.error(check.error ?? 'Transição inválida.')
      return
    }

    setBusy(true)
    const res = await changeDealStage(dealId, target)
    setBusy(false)
    if (!res.success) {
      toast.error(res.message)
    } else {
      toast.success(`${name} → ${DEAL_STAGE[target].label}`)
      router.refresh()
    }
  }

  async function confirmCreate() {
    if (!projectName.trim()) {
      toast.error('Informe o nome do projeto.')
      return
    }
    setBusy(true)
    const res = await createProjectAndAdvance(dealId, projectName.trim(), projectDescription)
    setBusy(false)
    if (!res.success) {
      toast.error(res.message)
    } else {
      setCreateOpen(false)
      toast.success(`Projeto "${projectName.trim()}" criado · ${name} → Oportunidade`)
      router.refresh()
    }
  }

  async function runReactivate() {
    setBusy(true)
    const res = await reactivateDeal(dealId)
    setBusy(false)
    if (!res.success) {
      toast.error(res.message)
    } else {
      toast.success(`${name} marcado como Reativar.`)
      router.refresh()
    }
  }

  async function runDisqualify() {
    setBusy(true)
    const res = await disqualifyDeal(dealId)
    setBusy(false)
    if (!res.success) {
      toast.error(res.message)
    } else {
      toast.success(`${name} desqualificado.`)
      router.refresh()
    }
  }

  async function confirmLost() {
    if (!lostReason.trim()) {
      toast.error('Informe o motivo da perda.')
      return
    }
    setBusy(true)
    const res = await loseDeal(dealId, lostReason, lostDate)
    setBusy(false)
    if (!res.success) {
      toast.error(res.message)
    } else {
      setLostOpen(false)
      toast.success(`${name} marcado como Perdido.`)
      router.refresh()
    }
  }

  async function confirmClose() {
    const withMaintenance = maintenance === 'com'
    setBusy(true)
    const res = await closeDeal(dealId, withMaintenance, closeDate)
    setBusy(false)
    if (!res.success) {
      toast.error(res.message)
    } else {
      setCloseOpen(false)
      toast.success(`${name} fechado ${withMaintenance ? 'com' : 'sem'} manutenção.`)
      router.refresh()
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              aria-label="Mudar estágio"
              className="cursor-pointer rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onPointerDown={stop}
              onClick={stop}
            />
          }
        >
          <EntityBadge meta={DEAL_STAGE[stage]} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-auto min-w-44" onClick={stop}>
          <DropdownMenuLabel>Mudar estágio</DropdownMenuLabel>
          {targets.map((t) => (
            <DropdownMenuItem
              key={t}
              disabled={busy || t === stage}
              onClick={() => void moveTo(t)}
            >
              <EntityBadge meta={DEAL_STAGE[t]} />
              {t === stage && <Check className="ml-auto" />}
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />

          {context === 'projeto' && (
            <DropdownMenuItem
              disabled={busy}
              onClick={() => {
                setMaintenance('com')
                setCloseOpen(true)
              }}
            >
              <CheckCircle2 />
              Fechar negócio
            </DropdownMenuItem>
          )}
          <DropdownMenuItem disabled={busy} onClick={() => void runReactivate()}>
            <Clock />
            Reativar futuramente
          </DropdownMenuItem>
          {context === 'contato' && (
            <DropdownMenuItem
              disabled={busy || !canDisqualify(stage)}
              onClick={() => void runDisqualify()}
            >
              <Ban />
              Desqualificar
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            variant="destructive"
            disabled={busy}
            onClick={() => {
              setLostReason('')
              setLostOpen(true)
            }}
          >
            <XCircle />
            Marcar como perdido
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Modal: criar projeto ao mover para Oportunidade */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent onClick={stop}>
          <DialogHeader>
            <DialogTitle>Criar projeto</DialogTitle>
            <DialogDescription>
              {name} vai para Oportunidade — crie o projeto vinculado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className={labelCls} htmlFor="dsm_project_name">
                Nome do projeto <span className="text-red-600 dark:text-red-400">*</span>
              </label>
              <input
                id="dsm_project_name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Ex.: CRM Moda em Foco"
                className={inputCls}
                autoFocus
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="dsm_project_description">Descrição</label>
              <textarea
                id="dsm_project_description"
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
            <Button type="button" disabled={busy} onClick={() => void confirmCreate()}>
              Criar e mover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: com/sem manutenção ao fechar */}
      <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
        <DialogContent onClick={stop}>
          <DialogHeader>
            <DialogTitle>Fechar negócio</DialogTitle>
            <DialogDescription>{name} — o cliente fechou com manutenção?</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="dsm-maintenance"
                className="h-4 w-4 border-border"
                checked={maintenance === 'com'}
                onChange={() => setMaintenance('com')}
              />
              Com manutenção (gera contrato mensal)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="dsm-maintenance"
                className="h-4 w-4 border-border"
                checked={maintenance === 'sem'}
                onChange={() => setMaintenance('sem')}
              />
              Sem manutenção
            </label>
            <div className="pt-1">
              <label className={labelCls} htmlFor="dsm_close_date">Data do fechamento</label>
              <input
                id="dsm_close_date"
                type="date"
                value={closeDate}
                onChange={(e) => setCloseDate(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline">Cancelar</Button>} />
            <Button type="button" disabled={busy} onClick={() => void confirmClose()}>
              Fechar negócio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: motivo ao perder */}
      <Dialog open={lostOpen} onOpenChange={setLostOpen}>
        <DialogContent onClick={stop}>
          <DialogHeader>
            <DialogTitle>Marcar como perdido</DialogTitle>
            <DialogDescription>{name} — informe o motivo da perda.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className={labelCls} htmlFor="dsm_lost_reason">Motivo</label>
              <textarea
                id="dsm_lost_reason"
                rows={3}
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                placeholder="Ex.: escolheu concorrente / sem orçamento"
                className={textareaCls}
                autoFocus
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="dsm_lost_date">Data</label>
              <input
                id="dsm_lost_date"
                type="date"
                value={lostDate}
                onChange={(e) => setLostDate(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline">Cancelar</Button>} />
            <Button
              type="button"
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={busy}
              onClick={() => void confirmLost()}
            >
              Marcar perdido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
