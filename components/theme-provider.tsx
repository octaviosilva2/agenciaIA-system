'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'

/**
 * Provider de tema (next-themes) — alterna a classe `.dark` no <html>,
 * que é o que os tokens semânticos do design system (§2) esperam.
 */
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
