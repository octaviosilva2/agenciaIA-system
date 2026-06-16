'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { updateScopeItems } from '@/lib/actions/project'
import type { ScopeItem } from '@/lib/queries/opportunity-detail'

const inputCls =
  'h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring'

/** Editor do checklist de escopo (contratado × entregue) do projeto. */
export function ScopeEditor({
  projectId,
  dealId,
  initialItems,
}: {
  projectId: string
  dealId: string
  initialItems: ScopeItem[]
}) {
  const [items, setItems] = useState<ScopeItem[]>(initialItems)
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)

  function addItem() {
    const t = title.trim()
    if (!t) return
    setItems((prev) => [...prev, { id: crypto.randomUUID(), title: t, contracted: true, delivered: false }])
    setTitle('')
  }

  function toggle(id: string, field: 'contracted' | 'delivered') {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [field]: !it[field] } : it)))
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id))
  }

  async function save() {
    setBusy(true)
    const res = await updateScopeItems(projectId, dealId, items)
    setBusy(false)
    if (res.success) toast.success(res.message)
    else toast.error(res.message)
  }

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum item de escopo ainda.</p>
      ) : (
        <ul className="divide-y divide-border">
          <li className="flex items-center gap-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <span className="flex-1">Item</span>
            <span className="w-20 text-center">Contratado</span>
            <span className="w-20 text-center">Entregue</span>
            <span className="w-8" />
          </li>
          {items.map((it) => (
            <li key={it.id} className="flex items-center gap-2 py-1.5 text-sm">
              <span className="flex-1">{it.title}</span>
              <span className="w-20 text-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border"
                  checked={it.contracted}
                  onChange={() => toggle(it.id, 'contracted')}
                />
              </span>
              <span className="w-20 text-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border"
                  checked={it.delivered}
                  onChange={() => toggle(it.id, 'delivered')}
                />
              </span>
              <span className="w-8 text-right">
                <button
                  type="button"
                  onClick={() => remove(it.id)}
                  className="text-muted-foreground hover:text-red-600"
                  aria-label="Remover item"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addItem()
            }
          }}
          placeholder="Novo item de escopo…"
          className={inputCls}
        />
        <Button type="button" variant="outline" size="sm" onClick={addItem}>
          <Plus className="h-4 w-4" />
          Adicionar
        </Button>
      </div>

      <div className="flex justify-end">
        <Button type="button" size="sm" disabled={busy} onClick={save}>
          {busy ? 'Salvando…' : 'Salvar escopo'}
        </Button>
      </div>
    </div>
  )
}
