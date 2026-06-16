'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Botão de alternância claro/escuro (espelha o toggle do style-guide).
 * A visibilidade do ícone é resolvida por CSS (dark:hidden / dark:block),
 * evitando mismatch de hidratação — não dependemos do tema no primeiro render.
 */
export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      type="button"
      className="h-8 w-8"
      aria-label="Alternar tema"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
    >
      <Sun className="h-4 w-4 dark:hidden" />
      <Moon className="hidden h-4 w-4 dark:block" />
    </Button>
  )
}
