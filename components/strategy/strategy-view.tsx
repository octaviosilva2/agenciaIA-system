'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Pencil, ArrowRight, Share2, TrendingUp, Sparkles, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { StrategyBlockDialog } from '@/components/strategy/strategy-block-dialog'
import { STRATEGY_BLOCK_META, type StrategyBlock } from '@/lib/mock/strategy'

/**
 * Tela de Estratégia: 5 blocos fixos em abas (uma por vez).
 * MOCK: estado inicial vindo do mock, muta só em memória + toast.
 * Quando o backend chegar, troque o estado inicial por dados de query e o
 * onSave por uma server action de update — o layout não muda.
 */
export function StrategyView({ initialBlocks }: { initialBlocks: StrategyBlock[] }) {
  const [blocks, setBlocks] = useState<StrategyBlock[]>(initialBlocks)
  const [editing, setEditing] = useState<StrategyBlock | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  function openEdit(block: StrategyBlock) {
    setEditing(block)
    setDialogOpen(true)
  }

  function handleSave(updated: StrategyBlock) {
    /* Atualiza em memória — backend: trocar por server action */
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === updated.id ? { ...updated, updated_at: new Date().toISOString() } : b,
      ),
    )
    setDialogOpen(false)
    toast.success(`${STRATEGY_BLOCK_META[updated.kind].title} atualizado.`)
  }

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-lg font-semibold tracking-tight">Estratégia</h2>
        <p className="text-sm text-muted-foreground">
          Os cinco blocos que orientam as decisões da empresa. Editáveis, nunca removidos.
        </p>
      </header>

      <Tabs defaultValue={blocks[0]?.kind}>
        {/* Barra de abas — scroll horizontal em telas pequenas */}
        <div className="overflow-x-auto border-b border-border">
          <TabsList
            variant="line"
            className="h-auto w-auto min-w-full rounded-none bg-transparent px-0 pb-0"
          >
            {blocks.map((block) => {
              const meta = STRATEGY_BLOCK_META[block.kind]
              return (
                <TabsTrigger
                  key={block.kind}
                  value={block.kind}
                  className="rounded-none px-4 pb-3 pt-2 text-[13px] font-medium"
                >
                  {meta.title}
                </TabsTrigger>
              )
            })}
          </TabsList>
        </div>

        {/* Painel de conteúdo por bloco */}
        {blocks.map((block) => (
          <TabsContent key={block.kind} value={block.kind} className="mt-0">
            <BlockPanel block={block} onEdit={() => openEdit(block)} />
          </TabsContent>
        ))}
      </Tabs>

      <StrategyBlockDialog
        block={editing}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSave}
      />
    </div>
  )
}

/** Painel completo de um bloco: cabeçalho + conteúdo + botão Editar. */
function BlockPanel({ block, onEdit }: { block: StrategyBlock; onEdit: () => void }) {
  const meta = STRATEGY_BLOCK_META[block.kind]
  return (
    <div className="rounded-b-lg border border-t-0 border-border bg-card p-6">
      {/* Cabeçalho: título + descrição + botão Editar */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-base font-semibold">{meta.title}</h3>
          <p className="mt-0.5 max-w-prose text-xs text-muted-foreground">{meta.description}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onEdit} className="shrink-0">
          <Pencil className="h-3.5 w-3.5" />
          Editar
        </Button>
      </div>

      {/* Conteúdo específico por kind */}
      <BlockContent block={block} />
    </div>
  )
}

/** Renderização do conteúdo por kind. */
function BlockContent({ block }: { block: StrategyBlock }) {
  switch (block.kind) {
    case 'missao':
      return <ManifestoBlock value={block.content.text} tone="zinc" />

    case 'proposito':
      return <ManifestoBlock value={block.content.text} tone="amber" />

    case 'swot':
      /* Matriz 2×2: cor de acento semântica (força=verde, fraqueza=vermelho, etc.) */
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <Quadrant title="Forças" tone="green" value={block.content.strengths} />
          <Quadrant title="Fraquezas" tone="red" value={block.content.weaknesses} />
          <Quadrant title="Oportunidades" tone="blue" value={block.content.opportunities} />
          <Quadrant title="Ameaças" tone="amber" value={block.content.threats} />
        </div>
      )

    case 'asis_tobe':
      /* Par lado a lado com seta entre estado atual e desejado */
      return (
        <div className="grid items-stretch gap-4 sm:grid-cols-[1fr_auto_1fr]">
          <StatePanel title="Estado atual (AS IS)" value={block.content.as_is} tone="muted" />
          <div className="hidden items-center justify-center text-muted-foreground sm:flex">
            <ArrowRight className="h-5 w-5" />
          </div>
          <StatePanel title="Estado desejado (TO BE)" value={block.content.to_be} tone="accent" />
        </div>
      )

    case 'blueprint':
      /* 4 campos com ícone e borda colorida semântica por área do modelo */
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <BlueprintPanel
            title="Canais"
            value={block.content.channels}
            icon={<Share2 className="h-4 w-4" />}
            tone="blue"
          />
          <BlueprintPanel
            title="Receita"
            value={block.content.revenue}
            icon={<TrendingUp className="h-4 w-4" />}
            tone="green"
          />
          <BlueprintPanel
            title="Proposta de valor"
            value={block.content.value_proposition}
            icon={<Sparkles className="h-4 w-4" />}
            tone="violet"
          />
          <BlueprintPanel
            title="Segmentos"
            value={block.content.segments}
            icon={<Users className="h-4 w-4" />}
            tone="amber"
          />
        </div>
      )
  }
}

/**
 * Bloco "manifesto" para Missão e Propósito: frase grande com aspas decorativas.
 * zinc = tom neutro/primário (Missão); amber = tom quente (Propósito).
 */
function ManifestoBlock({ value, tone }: { value: string; tone: 'zinc' | 'amber' }) {
  const wrapperStyles =
    tone === 'amber'
      ? 'border-t-amber-500 bg-amber-50/60 dark:bg-amber-950/20'
      : 'border-t-zinc-900 bg-zinc-50 dark:border-t-zinc-100 dark:bg-zinc-900/40'

  const quoteStyles =
    tone === 'amber'
      ? 'text-amber-400/25 dark:text-amber-300/15'
      : 'text-zinc-900/10 dark:text-zinc-100/10'

  return (
    <div className={`relative overflow-hidden rounded-lg border border-t-4 px-10 py-10 ${wrapperStyles}`}>
      {/* Aspas decorativas em segundo plano */}
      <span
        aria-hidden
        className={`pointer-events-none absolute -top-4 left-4 select-none font-serif text-[9rem] leading-none ${quoteStyles}`}
      >
        &ldquo;
      </span>
      <div className="relative">
        <TextOrEmpty
          value={value}
          className="text-xl font-semibold leading-relaxed tracking-tight text-foreground"
        />
      </div>
    </div>
  )
}

/**
 * Painel do Blueprint com ícone e borda esquerda colorida por área do modelo de negócio.
 */
function BlueprintPanel({
  title,
  value,
  icon,
  tone,
}: {
  title: string
  value: string
  icon: React.ReactNode
  tone: 'blue' | 'green' | 'violet' | 'amber'
}) {
  const styles = {
    blue: {
      card: 'border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20',
      icon: 'text-blue-600 dark:text-blue-400',
      label: 'text-blue-700 dark:text-blue-400',
    },
    green: {
      card: 'border-l-green-500 bg-green-50/50 dark:bg-green-950/20',
      icon: 'text-green-600 dark:text-green-400',
      label: 'text-green-700 dark:text-green-400',
    },
    violet: {
      card: 'border-l-violet-500 bg-violet-50/50 dark:bg-violet-950/20',
      icon: 'text-violet-600 dark:text-violet-400',
      label: 'text-violet-700 dark:text-violet-400',
    },
    amber: {
      card: 'border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20',
      icon: 'text-amber-600 dark:text-amber-400',
      label: 'text-amber-700 dark:text-amber-400',
    },
  }[tone]

  return (
    <div className={`min-h-[120px] rounded-md border border-l-4 p-4 ${styles.card}`}>
      <div className="mb-2 flex items-center gap-2">
        <span className={styles.icon}>{icon}</span>
        <p className={`text-[11px] font-semibold uppercase tracking-wider ${styles.label}`}>
          {title}
        </p>
      </div>
      <TextOrEmpty value={value} className="text-sm leading-relaxed" />
    </div>
  )
}

/**
 * Quadrante SWOT com borda esquerda colorida por significado:
 * verde=força, vermelho=fraqueza, azul=oportunidade, âmbar=ameaça.
 */
function Quadrant({
  title,
  value,
  tone,
}: {
  title: string
  value: string
  tone: 'green' | 'red' | 'blue' | 'amber'
}) {
  const styles = {
    green: 'border-l-green-500 bg-green-50/50 dark:bg-green-950/20',
    red: 'border-l-red-500 bg-red-50/50 dark:bg-red-950/20',
    blue: 'border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20',
    amber: 'border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20',
  }[tone]

  const labelColors = {
    green: 'text-green-700 dark:text-green-400',
    red: 'text-red-700 dark:text-red-400',
    blue: 'text-blue-700 dark:text-blue-400',
    amber: 'text-amber-700 dark:text-amber-400',
  }[tone]

  return (
    <div className={`min-h-[120px] rounded-md border border-l-4 p-4 ${styles}`}>
      <p className={`text-[11px] font-semibold uppercase tracking-wider ${labelColors}`}>
        {title}
      </p>
      <TextOrEmpty value={value} className="mt-2 text-sm leading-relaxed" />
    </div>
  )
}

/** Painel do AS IS → TO BE: destaque visual por estado (atual vs. desejado). */
function StatePanel({
  title,
  value,
  tone,
}: {
  title: string
  value: string
  tone: 'muted' | 'accent'
}) {
  const styles =
    tone === 'accent'
      ? 'border-border bg-primary/5 dark:bg-primary/10'
      : 'border-border bg-muted/50'

  return (
    <div className={`min-h-[120px] rounded-md border p-4 ${styles}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <TextOrEmpty value={value} className="mt-2 text-sm leading-relaxed" />
    </div>
  )
}

/** Texto ou placeholder quando vazio. */
function TextOrEmpty({ value, className }: { value: string; className?: string }) {
  const trimmed = value?.trim()
  if (!trimmed) {
    return <p className="mt-2 text-sm italic text-muted-foreground">Não preenchido ainda.</p>
  }
  return <p className={className}>{trimmed}</p>
}
