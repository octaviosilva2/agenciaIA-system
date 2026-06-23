'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { resolvePeriodRange } from '@/lib/date-range'

const ITEM_BASE =
  'flex h-8 cursor-pointer items-center gap-1.5 rounded-[6px] px-2.5 text-xs font-medium transition-colors'
const ITEM_ACTIVE = 'bg-primary text-primary-foreground'
const ITEM_IDLE = 'text-muted-foreground hover:bg-accent hover:text-foreground'

const PERIODS = [
  { label: 'Todos', value: 'todos' },
  { label: 'Hoje', value: 'hoje' },
  { label: 'Semanal', value: 'semanal' },
  { label: 'Mensal', value: 'mensal' },
  { label: 'Personalizado', value: 'personalizado' },
] as const

export type PeriodValue = (typeof PERIODS)[number]['value']

export function PeriodFilter() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const currentPeriod = (searchParams.get('periodo') as PeriodValue) || 'todos'
  const de = searchParams.get('de') ?? ''
  const ate = searchParams.get('ate') ?? ''

  function setPeriod(value: PeriodValue) {
    const params = new URLSearchParams(searchParams.toString())

    if (value === 'todos') {
      params.set('periodo', 'todos')
      params.delete('de')
      params.delete('ate')
    } else {
      params.set('periodo', value)
      if (value !== 'personalizado') {
        params.delete('de')
        params.delete('ate')
      }
    }

    router.push(`${pathname}?${params.toString()}`)
  }

  function setCustomDate(field: 'de' | 'ate', value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('periodo', 'personalizado')
    if (value) params.set(field, value)
    else params.delete(field)
    router.push(`${pathname}?${params.toString()}`)
  }

  /* Rótulo do botão: mostra o intervalo se ambas as datas estiverem definidas */
  function customLabel() {
    if (de && ate) {
      const fmt = (s: string) => {
        const [, m, d] = s.split('-')
        return `${d}/${m}`
      }
      return `${fmt(de)} – ${fmt(ate)}`
    }
    return 'Personalizado'
  }

  return (
    <div className="inline-flex items-center rounded-md border border-border bg-card p-0.5">
      {PERIODS.map((p) => {
        if (p.value === 'personalizado') {
          const active = currentPeriod === 'personalizado'
          return (
            <div key={p.value} className="relative">
              <button
                type="button"
                onClick={() => {
                  setPeriod('personalizado')
                  setOpen((o) => !o)
                }}
                className={cn(ITEM_BASE, active ? ITEM_ACTIVE : ITEM_IDLE)}
              >
                {customLabel()}
              </button>

              {open && (
                <>
                  {/* backdrop para fechar ao clicar fora */}
                  <div className="fixed inset-0 z-[9]" onClick={() => setOpen(false)} />

                  {/* painel flutuante */}
                  <div className="absolute right-0 top-full z-10 mt-1 flex items-center gap-1.5 rounded-md border border-border bg-popover px-3 py-2 shadow-md">
                    <input
                      type="date"
                      value={de}
                      onChange={(e) => setCustomDate('de', e.target.value)}
                      className="h-7 rounded-md border border-border bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-ring"
                    />
                    <span className="text-xs text-muted-foreground">–</span>
                    <input
                      type="date"
                      value={ate}
                      onChange={(e) => {
                        setCustomDate('ate', e.target.value)
                        /* fecha automaticamente quando ambas as datas estão preenchidas */
                        if (de) setOpen(false)
                      }}
                      className="h-7 rounded-md border border-border bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                </>
              )}
            </div>
          )
        }

        const active = currentPeriod === p.value
        return (
          <button
            key={p.value}
            type="button"
            onClick={() => {
              setPeriod(p.value)
              setOpen(false)
            }}
            className={cn(ITEM_BASE, active ? ITEM_ACTIVE : ITEM_IDLE)}
          >
            {p.label}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Hook utilitário para obter o intervalo de datas do filtro ativo (Brasília).
 * Delega ao helper único `resolvePeriodRange` (lib/date-range) — semana = seg→dom.
 */
export function usePeriodDates(): { from: Date | null; to: Date | null } {
  const searchParams = useSearchParams()
  return resolvePeriodRange(
    searchParams.get('periodo'),
    searchParams.get('de'),
    searchParams.get('ate'),
  )
}
