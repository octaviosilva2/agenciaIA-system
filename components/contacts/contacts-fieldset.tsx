'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'

// Receitas de campo do design system (§5.2).
const labelCls = 'mb-1 block text-xs font-medium'
const inputCls =
  'h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring'

/** Limite de contatos por empresa (anexo 5). */
export const MAX_CONTACTS = 3

export type ContactItem = { name: string; phone: string }

/**
 * Lista dinâmica de contatos (nome + telefone) da empresa — limite de 3.
 * Emite N pares de inputs name="contact_name"/"contact_phone"; a action lê via
 * FormData.getAll e faz o zip por índice. O primeiro contato é espelhado em
 * companies.contact_name/contact_phone (compat das telas que leem essas colunas).
 */
export function ContactsFieldset({ initial }: { initial?: ContactItem[] }) {
  const seed = initial && initial.length > 0 ? initial : [{ name: '', phone: '' }]
  const [items, setItems] = useState<ContactItem[]>(seed)

  function update(i: number, patch: Partial<ContactItem>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))
  }
  function add() {
    setItems((prev) => (prev.length >= MAX_CONTACTS ? prev : [...prev, { name: '', phone: '' }]))
  }
  function remove(i: number) {
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)))
  }

  return (
    <div className="space-y-2 sm:col-span-2">
      <label className={labelCls}>Contatos</label>
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            name="contact_name"
            value={it.name}
            onChange={(e) => update(i, { name: e.target.value })}
            placeholder="Nome do contato"
            className={inputCls}
          />
          <input
            name="contact_phone"
            value={it.phone}
            onChange={(e) => update(i, { phone: e.target.value })}
            placeholder="(47) 90000-0000"
            className={inputCls}
          />
          {items.length > 1 && (
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label="Remover contato"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
      {items.length < MAX_CONTACTS && (
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar contato
        </button>
      )}
    </div>
  )
}
