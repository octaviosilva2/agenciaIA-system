'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { checkinSchema } from '@/lib/validations/nct'
import { CONFIDENCE_LABELS } from '@/lib/format'
import type { Checkin } from '@/lib/mock/nct'
import type { Database } from '@/lib/supabase/types'

type ConfidenceLevel = Database['public']['Enums']['confidence_level']

const labelCls = 'mb-1 block text-xs font-medium'
const inputCls =
  'h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring'
const selectCls =
  'h-9 w-full rounded-md border border-border bg-card px-2 text-sm outline-none focus:ring-2 focus:ring-ring'
const textareaCls =
  'w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring'
const errCls = 'mt-1 text-xs text-red-600 dark:text-red-400'

/**
 * Form de registrar check-in: progresso (slider + número) + confiança + comentário.
 * Valida com o schema zod real (checkinSchema). Ao registrar (MOCK), entrega o
 * check-in pronto via callback — a view adiciona ao topo e espelha % e confiança.
 */
export function CheckinForm({
  commitmentId,
  defaultProgress,
  defaultConfidence,
  onRegister,
}: {
  commitmentId: string
  defaultProgress: number
  defaultConfidence: ConfidenceLevel
  onRegister: (checkin: Checkin) => void
}) {
  const [progress, setProgress] = useState(defaultProgress)
  const [confidence, setConfidence] = useState<ConfidenceLevel>(defaultConfidence)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')

  function submit() {
    const parsed = checkinSchema.safeParse({
      commitment_id: commitmentId,
      progress,
      confidence,
      comment: comment || null,
    })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Não foi possível registrar.')
      return
    }
    onRegister({
      id: `ck-${Date.now()}`,
      commitment_id: commitmentId,
      progress: parsed.data.progress,
      confidence: parsed.data.confidence,
      comment: parsed.data.comment ?? null,
      author_id: null, // no backend virá do usuário autenticado
      created_at: new Date().toISOString(),
    })
    // Reset do comentário; mantém progresso/confiança como ponto de partida do próximo.
    setComment('')
    setError('')
  }

  return (
    <div className="space-y-3">
      <div>
        <label className={labelCls} htmlFor="ck_progress">
          Progresso: <span className="font-mono tabular-nums">{progress}%</span>
        </label>
        <div className="flex items-center gap-3">
          <input
            id="ck_progress"
            type="range"
            min={0}
            max={100}
            value={progress}
            onChange={(e) => setProgress(Number(e.target.value))}
            className="h-2 flex-1 cursor-pointer accent-primary"
            aria-label="Progresso em porcentagem"
          />
          <input
            type="number"
            min={0}
            max={100}
            value={progress}
            onChange={(e) =>
              setProgress(Math.max(0, Math.min(100, Number(e.target.value) || 0)))
            }
            className={`${inputCls} w-20`}
            aria-label="Progresso (número)"
          />
        </div>
      </div>

      <div>
        <label className={labelCls} htmlFor="ck_confidence">
          Confiança
        </label>
        <select
          id="ck_confidence"
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

      <div>
        <label className={labelCls} htmlFor="ck_comment">
          Comentário
        </label>
        <textarea
          id="ck_comment"
          rows={2}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="O que avançou desde o último check-in (opcional)"
          className={textareaCls}
        />
        {error && <p className={errCls}>{error}</p>}
      </div>

      <Button type="button" onClick={submit} className="w-full">
        Registrar check-in
      </Button>
    </div>
  )
}
