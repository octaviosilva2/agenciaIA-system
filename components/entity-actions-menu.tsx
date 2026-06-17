'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { MoreHorizontal, Pencil, Archive, ArchiveRestore, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { cn } from '@/lib/utils'
import type { ActionState } from '@/lib/actions/action-state'

/** Para o kebab dentro de linha clicável / card arrastável: não propagar o clique. */
function stop(e: { stopPropagation: () => void }) {
  e.stopPropagation()
}

/**
 * Dialog de confirmação forte para exclusão permanente: exige digitar o nome
 * exato da entidade. Irreversível (apaga em cascata pelo banco).
 */
export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  entityName,
  busy,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  entityName: string
  busy: boolean
  onConfirm: () => void
}) {
  const [text, setText] = useState('')
  useEffect(() => {
    if (open) setText('')
  }, [open])

  const ok = text.trim() === entityName.trim()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir permanentemente</DialogTitle>
          <DialogDescription>
            Esta ação é <span className="font-medium">irreversível</span> e remove tudo vinculado.
            Digite <span className="font-medium text-foreground">{entityName}</span> para confirmar.
          </DialogDescription>
        </DialogHeader>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={entityName}
          aria-label="Nome para confirmar"
          className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          autoFocus
        />
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline">Cancelar</Button>} />
          <Button
            type="button"
            className="bg-red-600 text-white hover:bg-red-700"
            disabled={!ok || busy}
            onClick={onConfirm}
          >
            {busy ? 'Excluindo…' : 'Excluir permanente'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Menu de ações (⋯) reutilizável para qualquer entidade arquivável.
 * Ativo: Editar · Arquivar · Excluir. Arquivado: Reativar · Excluir permanente.
 * Faz o toast; chama `onChanged` (ex.: router.refresh) após sucesso.
 */
export function EntityActionsMenu({
  archived,
  entityName,
  onEdit,
  archiveAction,
  unarchiveAction,
  deleteAction,
  onChanged,
  align = 'end',
  triggerClassName,
}: {
  archived: boolean
  entityName: string
  onEdit?: () => void
  archiveAction?: () => Promise<ActionState>
  unarchiveAction?: () => Promise<ActionState>
  deleteAction: () => Promise<ActionState>
  onChanged?: () => void
  align?: 'start' | 'end'
  triggerClassName?: string
}) {
  const [busy, setBusy] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  async function run(action: () => Promise<ActionState>) {
    setBusy(true)
    const res = await action()
    setBusy(false)
    if (res.success) {
      toast.success(res.message)
      onChanged?.()
    } else {
      toast.error(res.message)
    }
    return res.success
  }

  async function confirmDelete() {
    const ok = await run(deleteAction)
    if (ok) setConfirmOpen(false)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className={cn('h-7 w-7 shrink-0', triggerClassName)}
              aria-label="Ações"
              onPointerDown={stop}
              onClick={stop}
            />
          }
        >
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align} onClick={stop}>
          {onEdit && !archived && (
            <DropdownMenuItem onClick={onEdit}>
              <Pencil />
              Editar
            </DropdownMenuItem>
          )}
          {!archived
            ? archiveAction && (
                <DropdownMenuItem disabled={busy} onClick={() => void run(archiveAction)}>
                  <Archive />
                  Arquivar
                </DropdownMenuItem>
              )
            : unarchiveAction && (
                <DropdownMenuItem disabled={busy} onClick={() => void run(unarchiveAction)}>
                  <ArchiveRestore />
                  Reativar
                </DropdownMenuItem>
              )}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setConfirmOpen(true)}>
            <Trash2 />
            {archived ? 'Excluir permanente' : 'Excluir'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDeleteDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        entityName={entityName}
        busy={busy}
        onConfirm={confirmDelete}
      />
    </>
  )
}
