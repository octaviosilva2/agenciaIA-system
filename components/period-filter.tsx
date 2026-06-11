'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useState } from 'react'

/**
 * Filtro temporal reusado em todas as telas com dados temporais.
 * Grava nos query params ?de=&ate= para ser compartilhável.
 */
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
  const [calendarOpen, setCalendarOpen] = useState(false)

  const currentPeriod = (searchParams.get('periodo') as PeriodValue) || 'todos'
  const de = searchParams.get('de')
  const ate = searchParams.get('ate')

  function setPeriod(value: PeriodValue) {
    const params = new URLSearchParams(searchParams.toString())

    if (value === 'todos') {
      params.delete('periodo')
      params.delete('de')
      params.delete('ate')
    } else if (value === 'personalizado') {
      params.set('periodo', value)
      // Mantém de/ate existentes ou não seta
    } else {
      params.set('periodo', value)
      params.delete('de')
      params.delete('ate')
    }

    router.push(`${pathname}?${params.toString()}`)
  }

  function setCustomDates(from: Date | undefined, to: Date | undefined) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('periodo', 'personalizado')
    if (from) params.set('de', format(from, 'yyyy-MM-dd'))
    if (to) params.set('ate', format(to, 'yyyy-MM-dd'))
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-1">
      {PERIODS.map((p) => {
        if (p.value === 'personalizado') {
          return (
            <Popover key={p.value} open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger
                render={
                  <Button
                    variant={currentPeriod === 'personalizado' ? 'default' : 'ghost'}
                    size="sm"
                    className="text-xs"
                  />
                }
              >
                <CalendarIcon className="h-3 w-3" />
                {de && ate
                  ? `${format(new Date(de), 'dd/MM', { locale: ptBR })} - ${format(new Date(ate), 'dd/MM', { locale: ptBR })}`
                  : 'Personalizado'}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={{
                    from: de ? new Date(de) : undefined,
                    to: ate ? new Date(ate) : undefined,
                  }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setCustomDates(range.from, range.to)
                      setCalendarOpen(false)
                    }
                  }}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          )
        }

        return (
          <Button
            key={p.value}
            variant={currentPeriod === p.value ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setPeriod(p.value)}
            className="text-xs"
          >
            {p.label}
          </Button>
        )
      })}
    </div>
  )
}

/**
 * Hook utilitário para obter o intervalo de datas do filtro ativo.
 * Retorna { from: Date | null, to: Date | null }.
 */
export function usePeriodDates(): { from: Date | null; to: Date | null } {
  const searchParams = useSearchParams()
  const periodo = (searchParams.get('periodo') as PeriodValue) || 'todos'
  const de = searchParams.get('de')
  const ate = searchParams.get('ate')

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (periodo) {
    case 'hoje':
      return { from: today, to: today }
    case 'semanal': {
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - today.getDay())
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      return { from: weekStart, to: weekEnd }
    }
    case 'mensal': {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      return { from: monthStart, to: monthEnd }
    }
    case 'personalizado':
      return {
        from: de ? new Date(de) : null,
        to: ate ? new Date(ate) : null,
      }
    default:
      return { from: null, to: null }
  }
}
