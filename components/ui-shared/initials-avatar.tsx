import { cn } from '@/lib/utils'
import { initialsOf } from '@/lib/format'

/**
 * Avatar de iniciais (design system §5.5): iniciais sobre bg-primary, rounded-full.
 * Tamanhos: xs (h-5) · sm (h-6) · md (h-8). Quando não há nome, mostra "—" neutro.
 * Componente compartilhado por NCT e Tarefas (DRI/responsável).
 */
export function InitialsAvatar({
  name,
  size = 'sm',
  className,
}: {
  name: string | null | undefined
  size?: 'xs' | 'sm' | 'md'
  className?: string
}) {
  const sizeCls =
    size === 'xs'
      ? 'h-5 w-5 text-[9px]'
      : size === 'md'
        ? 'h-8 w-8 text-xs'
        : 'h-6 w-6 text-[10px]'

  // Sem responsável: avatar neutro (não preto) para não competir visualmente.
  if (!name) {
    return (
      <span
        className={cn(
          'grid place-items-center rounded-full bg-muted font-medium text-muted-foreground',
          sizeCls,
          className,
        )}
        aria-label="Sem responsável"
        title="Sem responsável"
      >
        —
      </span>
    )
  }

  return (
    <span
      className={cn(
        'grid place-items-center rounded-full bg-primary font-medium text-primary-foreground',
        sizeCls,
        className,
      )}
      aria-label={name}
      title={name}
    >
      {initialsOf(name)}
    </span>
  )
}
