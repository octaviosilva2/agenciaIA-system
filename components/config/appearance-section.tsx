'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'

/**
 * Seção Aparência — escolha entre tema claro e escuro (sem "Sistema").
 * Coexiste com o ThemeToggle do header; ambos usam o mesmo hook (mesmo estado).
 *
 * O destaque do ativo é resolvido por CSS (classe `.dark` no <html>, via variante `dark:`),
 * não por `resolvedTheme` no render — assim evitamos mismatch de hidratação sem `mounted`,
 * espelhando a abordagem do ThemeToggle.
 */
export function AppearanceSection() {
  const { setTheme } = useTheme()

  // Classes base do card + classes de destaque por tema, ligadas/desligadas via `dark:`.
  const cardBase =
    'flex w-40 cursor-pointer flex-col items-center gap-2 rounded-lg border p-4 text-sm font-medium outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring'

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-base font-semibold">Aparência</h3>
        <p className="text-sm text-muted-foreground">Escolha o tema de exibição do CRM.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        {/* Claro: destacado quando NÃO está no dark (estado base). */}
        <button
          type="button"
          onClick={() => setTheme('light')}
          aria-label="Tema claro"
          className={`${cardBase} border-primary bg-card ring-2 ring-primary dark:border-border dark:ring-0`}
        >
          <Sun className="h-6 w-6" />
          Claro
        </button>

        {/* Escuro: destacado quando está no dark. */}
        <button
          type="button"
          onClick={() => setTheme('dark')}
          aria-label="Tema escuro"
          className={`${cardBase} border-border bg-card dark:border-primary dark:ring-2 dark:ring-primary`}
        >
          <Moon className="h-6 w-6" />
          Escuro
        </button>
      </div>
    </section>
  )
}
