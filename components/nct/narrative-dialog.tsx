'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { narrativeSchema } from '@/lib/validations/nct'
import { NARRATIVE_STATUS_LABELS } from '@/lib/format'
import { MOCK_PROFILES } from '@/lib/mock/profiles'
import type { Narrative } from '@/lib/mock/nct'
import type { Database } from '@/lib/supabase/types'

type NarrativeStatus = Database['public']['Enums']['narrative_status']

const labelCls = 'mb-1 block text-xs font-medium'
const inputCls =
  'h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring'
const inputErrCls =
  'h-9 w-full rounded-md border border-red-500 bg-card px-3 text-sm outline-none ring-2 ring-red-500/30'
const selectCls =
  'h-9 w-full rounded-md border border-border bg-card px-2 text-sm outline-none focus:ring-2 focus:ring-ring'
const textareaCls =
  'w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring'
const errCls = 'mt-1 text-xs text-red-600 dark:text-red-400'

// Sentinel "none" → null (design system §5.2: select vazio nunca string vazia).
const NONE = 'none'

/**
 * Dialog de criar/editar narrativa. Valida no client com o schema zod real
 * (lib/validations/nct.ts). Ao salvar (MOCK), entrega a narrativa pronta via callback.
 */
export function NarrativeDialog({
  narrative,
  open,
  onOpenChange,
  onSubmit,
}: {
  narrative: Narrative | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (narrative: Narrative) => void
}) {
  const [title, setTitle] = useState('')
  const [purpose, setPurpose] = useState('')
  const [driId, setDriId] = useState<string>(NONE)
  const [status, setStatus] = useState<NarrativeStatus>('ativa')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    setTitle(narrative?.title ?? '')
    setPurpose(narrative?.purpose ?? '')
    setDriId(narrative?.dri_id ?? NONE)
    setStatus(narrative?.status ?? 'ativa')
    setErrors({})
  }, [open, narrative])

  function save() {
    const dri = driId === NONE ? null : driId
    const parsed = narrativeSchema.safeParse({
      title,
      purpose: purpose || null,
      dri_id: dri,
      status,
    })
    if (!parsed.success) {
      const out: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0]
        if (typeof key === 'string' && !(key in out)) out[key] = issue.message
      }
      setErrors(out)
      return
    }
    onSubmit({
      id: narrative?.id ?? `n-${Date.now()}`,
      title: parsed.data.title,
      purpose: parsed.data.purpose ?? null,
      dri_id: parsed.data.dri_id ?? null,
      status: parsed.data.status,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{narrative ? 'Editar narrativa' : 'Nova narrativa'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className={labelCls} htmlFor="nar_title">
              Título <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <input
              id="nar_title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: receita recorrente previsível"
              className={errors.title ? inputErrCls : inputCls}
              autoFocus
            />
            {errors.title && <p className={errCls}>{errors.title}</p>}
          </div>

          <div>
            <label className={labelCls} htmlFor="nar_purpose">
              Propósito
            </label>
            <textarea
              id="nar_purpose"
              rows={2}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Por que esta narrativa importa (opcional)"
              className={textareaCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="nar_dri">
                DRI (responsável)
              </label>
              <select
                id="nar_dri"
                value={driId}
                onChange={(e) => setDriId(e.target.value)}
                className={selectCls}
              >
                <option value={NONE}>—</option>
                {MOCK_PROFILES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="nar_status">
                Status
              </label>
              <select
                id="nar_status"
                value={status}
                onChange={(e) => setStatus(e.target.value as NarrativeStatus)}
                className={selectCls}
              >
                {(Object.keys(NARRATIVE_STATUS_LABELS) as NarrativeStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {NARRATIVE_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline">Cancelar</Button>} />
          <Button type="button" onClick={save}>
            {narrative ? 'Salvar' : 'Criar narrativa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
