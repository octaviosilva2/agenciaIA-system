'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ChevronRight, Plus, Target, ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EntityBadge } from '@/components/ui/entity-badge'
import { InitialsAvatar } from '@/components/ui-shared/initials-avatar'
import { ProgressBar, ConfidenceDot } from '@/components/nct/nct-bits'
import { NarrativeDialog } from '@/components/nct/narrative-dialog'
import { CommitmentDialog } from '@/components/nct/commitment-dialog'
import { NctHelpDialog } from '@/components/nct/nct-help-dialog'
import { COMMITMENT_TYPE, NARRATIVE_STATUS_LABELS, findProfile } from '@/lib/format'
import {
  createNarrative,
  updateNarrative,
  createCommitment,
  updateCommitment,
} from '@/lib/actions/nct'
import type { TeamProfile } from '@/lib/queries/config'
import type { Narrative, Commitment } from '@/lib/queries/nct'
import { cn } from '@/lib/utils'

/** Card de métrica (mesmo molde do StatCard do funil/financeiro). */
function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

/** % médio de progresso dos compromissos de uma narrativa (0 se vazia). */
function avgProgress(commitments: Commitment[]): number {
  if (commitments.length === 0) return 0
  const sum = commitments.reduce((acc, c) => acc + c.progress, 0)
  return Math.round(sum / commitments.length)
}

/**
 * Tela NCT (Narrativas · Compromissos · Tarefas), nível hierárquico.
 * MOCK: estado inicial vindo do mock, muta só em memória + toast.
 * Quando o backend chegar, troque o estado inicial por queries e os handlers
 * por server actions — o layout não muda.
 */
export function NctView({
  initialNarratives,
  initialCommitments,
  profiles,
}: {
  initialNarratives: Narrative[]
  initialCommitments: Commitment[]
  profiles: TeamProfile[]
}) {
  const [narratives, setNarratives] = useState<Narrative[]>(initialNarratives)
  const [commitments, setCommitments] = useState<Commitment[]>(initialCommitments)
  const [, startTransition] = useTransition()

  // Resync com o servidor após revalidação (nova prop = dados frescos do banco).
  useEffect(() => setNarratives(initialNarratives), [initialNarratives])
  useEffect(() => setCommitments(initialCommitments), [initialCommitments])

  // Faixas expandidas (estado local — clique abre/fecha inline).
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([initialNarratives[0]?.id]))

  // Dialogs
  const [narDialogOpen, setNarDialogOpen] = useState(false)
  const [editingNarrative, setEditingNarrative] = useState<Narrative | null>(null)
  const [cmDialogOpen, setCmDialogOpen] = useState(false)
  const [editingCommitment, setEditingCommitment] = useState<Commitment | null>(null)
  const [cmNarrativeId, setCmNarrativeId] = useState<string>('')

  // --- Métricas (no mock o PeriodFilter é visual; com backend vira recorte por data) ---
  const metrics = useMemo(() => {
    const fulfilled = commitments.filter((c) => c.status === 'cumprido').length
    const activeNarratives = narratives.filter((n) => n.status === 'ativa').length
    const atRisk = commitments.filter((c) => c.confidence === 'baixa').length
    return { fulfilled, activeNarratives, atRisk }
  }, [commitments, narratives])

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // --- Mutações MOCK ---
  function openNewNarrative() {
    setEditingNarrative(null)
    setNarDialogOpen(true)
  }
  function openEditNarrative(n: Narrative) {
    setEditingNarrative(n)
    setNarDialogOpen(true)
  }
  function saveNarrative(n: Narrative) {
    const input = { title: n.title, purpose: n.purpose, dri_id: n.dri_id, status: n.status }
    startTransition(async () => {
      if (editingNarrative) {
        const res = await updateNarrative(n.id, input)
        if (!res.success) return void toast.error(res.message)
        setNarratives((prev) => prev.map((x) => (x.id === n.id ? n : x)))
        setNarDialogOpen(false)
        toast.success('Narrativa atualizada.')
      } else {
        const res = await createNarrative(input)
        if (!res.success || !res.narrative) return void toast.error(res.message)
        const created = res.narrative
        setNarratives((prev) => [...prev, created])
        setExpanded((prev) => new Set(prev).add(created.id))
        setNarDialogOpen(false)
        toast.success('Narrativa criada.')
      }
    })
  }

  function openNewCommitment(narrativeId: string) {
    setEditingCommitment(null)
    setCmNarrativeId(narrativeId)
    setCmDialogOpen(true)
  }
  function saveCommitment(c: Commitment) {
    const input = {
      narrative_id: c.narrative_id,
      title: c.title,
      description: c.description,
      type: c.type,
      status: c.status,
      progress: c.progress,
      confidence: c.confidence,
      dri_id: c.dri_id,
      metric_target: c.metric_target,
    }
    startTransition(async () => {
      if (editingCommitment) {
        const res = await updateCommitment(c.id, input)
        if (!res.success) return void toast.error(res.message)
        setCommitments((prev) => prev.map((x) => (x.id === c.id ? c : x)))
        setExpanded((prev) => new Set(prev).add(c.narrative_id))
        setCmDialogOpen(false)
        toast.success('Compromisso atualizado.')
      } else {
        const res = await createCommitment(input)
        if (!res.success || !res.commitment) return void toast.error(res.message)
        const created = res.commitment
        setCommitments((prev) => [...prev, created])
        setExpanded((prev) => new Set(prev).add(created.narrative_id))
        setCmDialogOpen(false)
        toast.success('Compromisso criado.')
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho + filtro temporal */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">NCT</h2>
          <p className="text-sm text-muted-foreground">
            Narrativas, compromissos e o progresso de cada um.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NctHelpDialog />
          <Button type="button" size="sm" onClick={openNewNarrative}>
            <Plus className="h-4 w-4" />
            Nova narrativa
          </Button>
        </div>
      </header>

      {/* 3 cards de métrica */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Compromissos cumpridos"
          value={String(metrics.fulfilled)}
          hint={`de ${commitments.length} no total`}
        />
        <StatCard
          label="Narrativas ativas"
          value={String(metrics.activeNarratives)}
          hint="em andamento agora"
        />
        <StatCard
          label="Em risco"
          value={String(metrics.atRisk)}
          hint="confiança baixa"
        />
      </div>

      {/* Lista de narrativas (faixas expansíveis) */}
      {narratives.length === 0 ? (
        <EmptyNarratives onCreate={openNewNarrative} />
      ) : (
        <div className="space-y-2">
          {narratives.map((narrative) => {
            const its = commitments.filter((c) => c.narrative_id === narrative.id)
            const isOpen = expanded.has(narrative.id)
            return (
              <NarrativeBand
                key={narrative.id}
                narrative={narrative}
                commitments={its}
                profiles={profiles}
                open={isOpen}
                onToggle={() => toggle(narrative.id)}
                onEditNarrative={() => openEditNarrative(narrative)}
                onAddCommitment={() => openNewCommitment(narrative.id)}
              />
            )
          })}
        </div>
      )}

      {/* Dialogs */}
      <NarrativeDialog
        narrative={editingNarrative}
        profiles={profiles}
        open={narDialogOpen}
        onOpenChange={setNarDialogOpen}
        onSubmit={saveNarrative}
      />
      <CommitmentDialog
        commitment={editingCommitment}
        narrativeId={cmNarrativeId}
        profiles={profiles}
        open={cmDialogOpen}
        onOpenChange={setCmDialogOpen}
        onSubmit={saveCommitment}
      />
    </div>
  )
}

/** Faixa de uma narrativa (cabeçalho clicável + compromissos quando expandida). */
function NarrativeBand({
  narrative,
  commitments,
  profiles,
  open,
  onToggle,
  onEditNarrative,
  onAddCommitment,
}: {
  narrative: Narrative
  commitments: Commitment[]
  profiles: TeamProfile[]
  open: boolean
  onToggle: () => void
  onEditNarrative: () => void
  onAddCommitment: () => void
}) {
  const dri = findProfile(profiles, narrative.dri_id)
  const avg = avgProgress(commitments)

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      {/* Cabeçalho da faixa — clique abre/fecha */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent"
      >
        <ChevronRight
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-90',
          )}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{narrative.title}</span>
            <EntityBadge
              meta={{
                label: NARRATIVE_STATUS_LABELS[narrative.status],
                // Status da narrativa é só-texto no format.ts → usamos tom outline neutro.
                className: 'border border-zinc-300 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300',
              }}
            />
          </div>
          {narrative.purpose && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{narrative.purpose}</p>
          )}
        </div>

        {/* DRI */}
        <InitialsAvatar name={dri?.name} size="sm" />

        {/* % médio dos compromissos (mini-barra) */}
        <div className="hidden w-32 shrink-0 items-center gap-2 sm:flex">
          <ProgressBar value={avg} className="flex-1" />
          <span className="w-9 text-right font-mono text-xs tabular-nums text-muted-foreground">
            {avg}%
          </span>
        </div>

        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {commitments.length} comp.
        </span>
      </button>

      {/* Conteúdo expandido: compromissos */}
      {open && (
        <div className="border-t border-border px-4 py-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Compromissos
            </p>
            <div className="flex items-center gap-1">
              <Button type="button" variant="ghost" size="sm" onClick={onEditNarrative}>
                Editar narrativa
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={onAddCommitment}>
                <Plus className="h-3.5 w-3.5" />
                Novo compromisso
              </Button>
            </div>
          </div>

          {commitments.length === 0 ? (
            <div className="rounded-md border border-dashed border-border px-4 py-6 text-center">
              <p className="text-sm text-muted-foreground">Nenhum compromisso nesta narrativa.</p>
              <Button type="button" variant="outline" size="sm" className="mt-2" onClick={onAddCommitment}>
                <Plus className="h-3.5 w-3.5" />
                Adicionar o primeiro
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {commitments.map((c) => (
                <CommitmentRow key={c.id} commitment={c} profiles={profiles} />
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}

/** Linha de um compromisso dentro da narrativa expandida. */
function CommitmentRow({
  commitment: c,
  profiles,
}: {
  commitment: Commitment
  profiles: TeamProfile[]
}) {
  const dri = findProfile(profiles, c.dri_id)
  return (
    <li className="flex items-center gap-3 py-2.5">
      {/* Badge do tipo (índigo/âmbar/verde/slate via format.ts) */}
      <EntityBadge meta={COMMITMENT_TYPE[c.type]} className="shrink-0" />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{c.title}</p>
        {c.metric_target && (
          <p className="truncate text-xs text-muted-foreground">Meta: {c.metric_target}</p>
        )}
      </div>

      {/* DRI */}
      <InitialsAvatar name={dri?.name} size="xs" />

      {/* % progresso (mini-barra) */}
      <div className="hidden w-28 shrink-0 items-center gap-2 sm:flex">
        <ProgressBar value={c.progress} className="flex-1" />
        <span className="w-9 text-right font-mono text-xs tabular-nums text-muted-foreground">
          {c.progress}%
        </span>
      </div>

      {/* Ponto de confiança (não badge) */}
      <ConfidenceDot confidence={c.confidence} />

      {/* Abrir detalhe */}
      <Button type="button" variant="ghost" size="sm" render={<Link href={`/nct/${c.id}`} />}>
        Abrir
        <ArrowUpRight className="h-3.5 w-3.5" />
      </Button>
    </li>
  )
}

/** Empty state da lista de narrativas (com CTA). */
function EmptyNarratives({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-card px-6 py-12 text-center">
      <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-muted text-muted-foreground">
        <Target className="h-5 w-5" />
      </div>
      <p className="mt-3 text-sm font-medium">Nenhuma narrativa ainda</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Comece criando a primeira frente estratégica.
      </p>
      <Button type="button" size="sm" className="mt-4" onClick={onCreate}>
        <Plus className="h-4 w-4" />
        Nova narrativa
      </Button>
    </div>
  )
}
