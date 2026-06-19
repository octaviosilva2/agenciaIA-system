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
import { commitmentSchema } from '@/lib/validations/nct'
import { COMMITMENT_TYPE, CONFIDENCE_LABELS } from '@/lib/format'
import { MOCK_PROFILES } from '@/lib/mock/profiles'
import type { Commitment } from '@/lib/mock/nct'
import type { Database } from '@/lib/supabase/types'

type CommitmentType = Database['public']['Enums']['commitment_type']
type ConfidenceLevel = Database['public']['Enums']['confidence_level']

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

const NONE = 'none'

/**
 * Dialog de criar/editar compromisso, sempre dentro de uma narrativa.
 * Valida no client com o schema zod real (inclui a regra: meta obrigatória
 * quando o tipo é quantitativo). Ao salvar (MOCK), entrega o objeto via callback.
 */
export function CommitmentDialog({
  commitment,
  narrativeId,
  open,
  onOpenChange,
  onSubmit,
}: {
  commitment: Commitment | null
  narrativeId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (commitment: Commitment) => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<CommitmentType>('think_it')
  const [progress, setProgress] = useState(0)
  const [confidence, setConfidence] = useState<ConfidenceLevel>('media')
  const [driId, setDriId] = useState<string>(NONE)
  const [metricTarget, setMetricTarget] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    setTitle(commitment?.title ?? '')
    setDescription(commitment?.description ?? '')
    setType(commitment?.type ?? 'think_it')
    setProgress(commitment?.progress ?? 0)
    setConfidence(commitment?.confidence ?? 'media')
    setDriId(commitment?.dri_id ?? NONE)
    setMetricTarget(commitment?.metric_target ?? '')
    setErrors({})
  }, [open, commitment])

  function save() {
    const dri = driId === NONE ? null : driId
    const parsed = commitmentSchema.safeParse({
      narrative_id: narrativeId,
      title,
      description: description || null,
      type,
      status: commitment?.status ?? 'em_andamento',
      progress,
      confidence,
      dri_id: dri,
      metric_target: metricTarget || null,
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
      id: commitment?.id ?? `cm-${Date.now()}`,
      narrative_id: parsed.data.narrative_id,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      type: parsed.data.type,
      status: parsed.data.status,
      progress: parsed.data.progress,
      confidence: parsed.data.confidence,
      dri_id: parsed.data.dri_id ?? null,
      metric_target: parsed.data.metric_target ?? null,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{commitment ? 'Editar compromisso' : 'Novo compromisso'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className={labelCls} htmlFor="cm_title">
              Título <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <input
              id="cm_title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: fechar 8 contratos de manutenção"
              className={errors.title ? inputErrCls : inputCls}
              autoFocus
            />
            {errors.title && <p className={errCls}>{errors.title}</p>}
          </div>

          <div>
            <label className={labelCls} htmlFor="cm_desc">
              Descrição
            </label>
            <textarea
              id="cm_desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes (opcional)"
              className={textareaCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="cm_type">
                Tipo
              </label>
              <select
                id="cm_type"
                value={type}
                onChange={(e) => setType(e.target.value as CommitmentType)}
                className={selectCls}
              >
                {(Object.keys(COMMITMENT_TYPE) as CommitmentType[]).map((t) => (
                  <option key={t} value={t}>
                    {COMMITMENT_TYPE[t].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="cm_dri">
                DRI (responsável)
              </label>
              <select
                id="cm_dri"
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
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="cm_progress">
                Progresso (%)
              </label>
              <input
                id="cm_progress"
                type="number"
                min={0}
                max={100}
                value={progress}
                onChange={(e) =>
                  setProgress(Math.max(0, Math.min(100, Number(e.target.value) || 0)))
                }
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="cm_confidence">
                Confiança
              </label>
              <select
                id="cm_confidence"
                value={confidence}
                onChange={(e) => setConfidence(e.target.value as ConfidenceLevel)}
                className={selectCls}
              >
                {(Object.keys(CONFIDENCE_LABELS) as ConfidenceLevel[]).map((c) => (
                  <option key={c} value={c}>
                    {CONFIDENCE_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Meta só faz sentido (e é obrigatória) para o tipo quantitativo. */}
          {type === 'quantitativo' && (
            <div>
              <label className={labelCls} htmlFor="cm_metric">
                Meta quantitativa <span className="text-red-600 dark:text-red-400">*</span>
              </label>
              <input
                id="cm_metric"
                value={metricTarget}
                onChange={(e) => setMetricTarget(e.target.value)}
                placeholder="Ex.: 8 contratos ativos · NPS ≥ 70"
                className={errors.metric_target ? inputErrCls : inputCls}
              />
              {errors.metric_target && <p className={errCls}>{errors.metric_target}</p>}
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline">Cancelar</Button>} />
          <Button type="button" onClick={save}>
            {commitment ? 'Salvar' : 'Criar compromisso'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
