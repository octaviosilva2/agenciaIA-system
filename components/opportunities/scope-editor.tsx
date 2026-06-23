'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CheckCircle2, Circle, CircleDot, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { updateScopeItems } from '@/lib/actions/project'
import { cn } from '@/lib/utils'
import type { ScopeItem, ScopeStatus } from '@/lib/queries/opportunity-detail'

const inputCls =
  'h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring'

const textareaCls =
  'w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none'

const SCOPE_LABEL: Record<ScopeStatus, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em andamento',
  entregue: 'Entregue',
}

function nextScopeStatus(s: ScopeStatus): ScopeStatus {
  if (s === 'pendente') return 'em_andamento'
  if (s === 'em_andamento') return 'entregue'
  return 'pendente'
}

function ScopeStatusIcon({ status, onClick }: { status: ScopeStatus; onClick: () => void }) {
  if (status === 'entregue') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label="Desfazer entrega"
        className="cursor-pointer text-green-600 transition-opacity hover:opacity-70 dark:text-green-400"
      >
        <CheckCircle2 className="h-5 w-5" />
      </button>
    )
  }
  if (status === 'em_andamento') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label="Marcar como entregue"
        className="cursor-pointer text-blue-600 transition-opacity hover:opacity-70 dark:text-blue-400"
      >
        <CircleDot className="h-5 w-5" />
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Iniciar item"
      className="cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
    >
      <Circle className="h-5 w-5" />
    </button>
  )
}

/** Dialog que exibe a descrição completa de um item de escopo. */
function ScopeDescriptionDialog({
  item,
  open,
  onClose,
}: {
  item: ScopeItem | null
  open: boolean
  onClose: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{item?.title}</DialogTitle>
        </DialogHeader>
        <div className="mt-2 max-h-[75vh] overflow-y-auto text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
          {item?.description || 'Sem descrição.'}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Editor do escopo contratado do projeto (título + descrição + 3 estados). */
export function ScopeEditor({
  projectId,
  dealId,
  initialItems,
}: {
  projectId: string
  dealId: string
  initialItems: ScopeItem[]
}) {
  const router = useRouter()
  const [items, setItems] = useState<ScopeItem[]>(initialItems)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [busy, setBusy] = useState(false)
  const [descDialog, setDescDialog] = useState<ScopeItem | null>(null)

  /**
   * Auto-save: persiste o escopo a cada mudança (add/avançar/remover) — espelha
   * implementation-detail.tsx. Sucesso é silencioso (+ refresh p/ sincronizar a tela);
   * o botão "Salvar escopo" segue como reforço.
   */
  async function persist(nextItems: ScopeItem[]) {
    setBusy(true)
    const res = await updateScopeItems(projectId, dealId, nextItems)
    setBusy(false)
    if (res.success) router.refresh()
    else toast.error(res.message)
  }

  function advance(id: string) {
    const next = items.map((x) => (x.id === id ? { ...x, status: nextScopeStatus(x.status) } : x))
    setItems(next)
    void persist(next)
  }

  function remove(id: string) {
    const next = items.filter((x) => x.id !== id)
    setItems(next)
    void persist(next)
  }

  function addItem() {
    const t = newTitle.trim()
    if (!t) return
    const next: ScopeItem[] = [
      ...items,
      { id: crypto.randomUUID(), title: t, description: newDesc.trim(), status: 'pendente' },
    ]
    setItems(next)
    setNewTitle('')
    setNewDesc('')
    void persist(next)
  }

  async function save() {
    setBusy(true)
    const res = await updateScopeItems(projectId, dealId, items)
    setBusy(false)
    if (res.success) {
      toast.success(res.message)
      router.refresh()
    } else {
      toast.error(res.message)
    }
  }

  return (
    <div className="space-y-1">
      <ScopeDescriptionDialog
        item={descDialog}
        open={!!descDialog}
        onClose={() => setDescDialog(null)}
      />

      {items.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">Nenhum item de escopo ainda.</p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((it) => (
            <li key={it.id} className="flex items-center gap-3 py-3">
              <div className="shrink-0">
                <ScopeStatusIcon status={it.status} onClick={() => advance(it.id)} />
              </div>
              <button
                type="button"
                onClick={() => it.description && setDescDialog(it)}
                className={cn(
                  'min-w-0 flex-1 text-left text-sm font-medium',
                  it.description ? 'cursor-pointer hover:underline' : 'cursor-default',
                  it.status === 'entregue' && 'text-muted-foreground line-through',
                )}
              >
                {it.title}
              </button>
              <span
                className={cn(
                  'shrink-0 text-xs',
                  it.status === 'entregue'
                    ? 'text-green-600 dark:text-green-400'
                    : it.status === 'em_andamento'
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-muted-foreground',
                )}
              >
                {SCOPE_LABEL[it.status]}
              </span>
              {it.description && (
                <button
                  type="button"
                  onClick={() => setDescDialog(it)}
                  className="shrink-0 cursor-pointer text-xs text-muted-foreground hover:text-foreground"
                >
                  Ver
                </button>
              )}
              <button
                type="button"
                onClick={() => remove(it.id)}
                className="shrink-0 cursor-pointer text-muted-foreground hover:text-red-600"
                aria-label="Remover item"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Formulário de adição */}
      <div className="space-y-2 border-t border-border pt-3">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              addItem()
            }
          }}
          placeholder="Título do item…"
          className={inputCls}
        />
        <textarea
          value={newDesc}
          onChange={(e) => setNewDesc(e.target.value)}
          placeholder="Descrição do que abrange esse item…"
          rows={2}
          className={textareaCls}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!newTitle.trim()}
          onClick={addItem}
        >
          <Plus className="h-4 w-4" />
          Adicionar
        </Button>
      </div>

      <div className="flex justify-end pt-1">
        <Button type="button" size="sm" disabled={busy} onClick={save}>
          {busy ? 'Salvando…' : 'Salvar escopo'}
        </Button>
      </div>
    </div>
  )
}
