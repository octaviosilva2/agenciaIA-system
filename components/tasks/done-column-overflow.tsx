'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

/** Quantos cards concluídos a coluna "Concluída" mostra antes de recolher. */
export const DONE_VISIBLE_LIMIT = 5

/**
 * Corpo compartilhado da coluna "Concluída" dos kanbans (anexo 3 / B2).
 * Mostra no máximo `DONE_VISIBLE_LIMIT` cards e, havendo mais, um botão
 * "Ver todos (N)" que abre um modal com a lista completa de concluídos.
 *
 * - `renderCard`: desenha o card na coluna (arrastável/clicável, como os demais).
 * - `renderModalItem`: desenha o card no modal (read-only — evita ids de drag
 *   duplicados entre a coluna e o modal). Cai para `renderCard` se não informado.
 *
 * O risco visual (line-through no título) é aplicado em cada card pelo próprio
 * kanban, pois cada um tem seu componente de card.
 */
export function DoneColumnOverflow<T extends { id: string }>({
  tasks,
  renderCard,
  renderModalItem,
}: {
  tasks: T[]
  renderCard: (task: T) => React.ReactNode
  renderModalItem?: (task: T) => React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const visible = tasks.slice(0, DONE_VISIBLE_LIMIT)
  const overflow = tasks.length - DONE_VISIBLE_LIMIT
  const modalItem = renderModalItem ?? renderCard

  return (
    <>
      {visible.map(renderCard)}

      {overflow > 0 && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="cursor-pointer rounded-md border border-dashed border-border px-2 py-1.5 text-center text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          Ver todos ({tasks.length})
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Concluídas ({tasks.length})</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">{tasks.map(modalItem)}</div>
        </DialogContent>
      </Dialog>
    </>
  )
}
