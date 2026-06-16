import { cn } from '@/lib/utils'
import type { BadgeMeta } from '@/lib/format'

/**
 * Badge único do sistema (design system §6.1/§7).
 * Recebe o meta resolvido em lib/format.ts ({ label, className }) e renderiza
 * a base comum + o tom. A UI nunca escreve label ou cor de status solta.
 */
export function EntityBadge({
  meta,
  className,
}: {
  meta: BadgeMeta
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        meta.className,
        className,
      )}
    >
      {meta.label}
    </span>
  )
}
