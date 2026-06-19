import { cn } from '@/lib/utils'
import { CONFIDENCE_DOT, CONFIDENCE_LABELS } from '@/lib/format'
import type { Database } from '@/lib/supabase/types'

type ConfidenceLevel = Database['public']['Enums']['confidence_level']

/**
 * Mini-barra de progresso inline (design system §5.6).
 * Trilho bg-muted, preenchimento bg-primary. Largura via `w` (ex.: 'w-20').
 */
export function ProgressBar({
  value,
  className,
}: {
  value: number
  className?: string
}) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div
      className={cn('h-1.5 overflow-hidden rounded-full bg-muted', className)}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
    </div>
  )
}

/**
 * Ponto colorido de confiança (design system §6.2 — NÃO é badge).
 * Verde alta / âmbar média / vermelho baixa, via CONFIDENCE_DOT do format.ts.
 */
export function ConfidenceDot({
  confidence,
  className,
}: {
  confidence: ConfidenceLevel
  className?: string
}) {
  const label = `Confiança ${CONFIDENCE_LABELS[confidence].toLowerCase()}`
  return (
    <span
      className={cn('inline-block h-2.5 w-2.5 shrink-0 rounded-full', CONFIDENCE_DOT[confidence], className)}
      aria-label={label}
      title={label}
    />
  )
}
