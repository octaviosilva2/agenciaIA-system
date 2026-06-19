'use client'

import { useEffect, useState } from 'react'
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
import {
  STRATEGY_BLOCK_META,
  type StrategyBlock,
} from '@/lib/mock/strategy'

const labelCls = 'mb-1 block text-xs font-medium'
const textareaCls =
  'w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring'

/**
 * Dialog de edição de UM bloco estratégico. Os campos mudam por kind:
 * missao/proposito (1 texto) · swot (4 textos) · asis_tobe (2 textos) ·
 * blueprint (4 textos). Salvar entrega o bloco atualizado via callback (MOCK).
 *
 * Mantém o conteúdo no formato do `content` jsonb daquele kind (contrato do backend).
 */
export function StrategyBlockDialog({
  block,
  open,
  onOpenChange,
  onSave,
}: {
  block: StrategyBlock | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (block: StrategyBlock) => void
}) {
  // Estado local do conteúdo em edição (clonado do bloco ao abrir).
  const [draft, setDraft] = useState<StrategyBlock | null>(block)

  // Repreenche ao abrir / trocar de bloco.
  useEffect(() => {
    if (open) setDraft(block)
  }, [open, block])

  if (!draft) return null
  const meta = STRATEGY_BLOCK_META[draft.kind]

  function save() {
    if (!draft) return
    onSave(draft)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar — {meta.title}</DialogTitle>
          <DialogDescription>{meta.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">{renderFields(draft, setDraft)}</div>

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline">Cancelar</Button>} />
          <Button type="button" onClick={save}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Campos do form por kind (mantém o shape do content). */
function renderFields(
  draft: StrategyBlock,
  setDraft: (b: StrategyBlock) => void,
) {
  switch (draft.kind) {
    case 'missao':
    case 'proposito':
      return (
        <Field
          label="Texto"
          value={draft.content.text}
          rows={4}
          onChange={(text) => setDraft({ ...draft, content: { text } })}
        />
      )
    case 'swot':
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Forças"
            value={draft.content.strengths}
            onChange={(strengths) => setDraft({ ...draft, content: { ...draft.content, strengths } })}
          />
          <Field
            label="Fraquezas"
            value={draft.content.weaknesses}
            onChange={(weaknesses) => setDraft({ ...draft, content: { ...draft.content, weaknesses } })}
          />
          <Field
            label="Oportunidades"
            value={draft.content.opportunities}
            onChange={(opportunities) =>
              setDraft({ ...draft, content: { ...draft.content, opportunities } })
            }
          />
          <Field
            label="Ameaças"
            value={draft.content.threats}
            onChange={(threats) => setDraft({ ...draft, content: { ...draft.content, threats } })}
          />
        </div>
      )
    case 'asis_tobe':
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Estado atual (AS IS)"
            value={draft.content.as_is}
            onChange={(as_is) => setDraft({ ...draft, content: { ...draft.content, as_is } })}
          />
          <Field
            label="Estado desejado (TO BE)"
            value={draft.content.to_be}
            onChange={(to_be) => setDraft({ ...draft, content: { ...draft.content, to_be } })}
          />
        </div>
      )
    case 'blueprint':
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Canais"
            value={draft.content.channels}
            onChange={(channels) => setDraft({ ...draft, content: { ...draft.content, channels } })}
          />
          <Field
            label="Receita"
            value={draft.content.revenue}
            onChange={(revenue) => setDraft({ ...draft, content: { ...draft.content, revenue } })}
          />
          <Field
            label="Proposta de valor"
            value={draft.content.value_proposition}
            onChange={(value_proposition) =>
              setDraft({ ...draft, content: { ...draft.content, value_proposition } })
            }
          />
          <Field
            label="Segmentos"
            value={draft.content.segments}
            onChange={(segments) => setDraft({ ...draft, content: { ...draft.content, segments } })}
          />
        </div>
      )
  }
}

/** Campo de texto multilinha rotulado (padrão do design system §5.2). */
function Field({
  label,
  value,
  rows = 3,
  onChange,
}: {
  label: string
  value: string
  rows?: number
  onChange: (v: string) => void
}) {
  const id = `sb_${label.replace(/\s+/g, '_').toLowerCase()}`
  return (
    <div>
      <label className={labelCls} htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={textareaCls}
      />
    </div>
  )
}
