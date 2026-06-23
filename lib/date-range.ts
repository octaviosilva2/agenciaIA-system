/**
 * Helper ÚNICO de intervalos de período em horário de Brasília (America/Sao_Paulo).
 * Unifica o que estava duplicado e divergente em:
 * - components/period-filter.tsx > usePeriodDates
 * - components/finance/financeiro-view.tsx > getKpiRange
 * - lib/queries/dashboard.ts > currentMonthRange
 * - app/(dashboard)/funil/page.tsx > resolvePeriod
 *
 * Regras (decisão do Octavio):
 * - Hoje   = dia inteiro (00:00:00.000 → 23:59:59.999)
 * - Semana = SEGUNDA 00:00 → DOMINGO 23:59:59.999
 * - Mês    = 1º dia 00:00 → último dia 23:59:59.999
 *
 * As comparações no app zeram a hora do vencimento (date-only), por isso o `to`
 * fica no fim do dia para incluir a borda. Datas `yyyy-MM-dd` são lidas como dia
 * local (parseDateOnly) — nunca via `new Date('yyyy-MM-dd')`, que recuaria 1 dia
 * ao formatar em Brasília.
 */

export const SP_TZ = 'America/Sao_Paulo'

/** Chaves canônicas de período (idioma interno do helper). */
export type PeriodKey = 'hoje' | 'semana' | 'mes'
export type DateRange = { from: Date | null; to: Date | null }

/** y/m/d (mês 1-based) do "hoje" de Brasília — independente do fuso do runtime. */
function spTodayYmd(): [number, number, number] {
  const s = new Intl.DateTimeFormat('en-CA', {
    timeZone: SP_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
  const [y, m, d] = s.split('-').map(Number)
  return [y!, m!, d!]
}

/** Início do dia (00:00:00.000) representando o "hoje" de Brasília. */
export function spStartOfToday(): Date {
  const [y, m, d] = spTodayYmd()
  return new Date(y, m - 1, d, 0, 0, 0, 0)
}

/** Fim do dia (23:59:59.999) de uma data. Não muta o argumento. */
function endOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

/** Converte 'yyyy-MM-dd' (date-only) em Date local 00:00 — sem deslocar o dia. */
export function parseDateOnly(value: string): Date {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y!, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0)
}

/** Intervalo [from, to] de um período canônico, em Brasília. */
export function periodRange(period: PeriodKey): DateRange {
  const today = spStartOfToday()
  switch (period) {
    case 'hoje':
      return { from: today, to: endOfDay(today) }
    case 'semana': {
      // getDay(): 0=Dom..6=Sáb. Recuo até a SEGUNDA da semana corrente.
      const from = new Date(today)
      from.setDate(today.getDate() - ((today.getDay() + 6) % 7))
      const to = new Date(from)
      to.setDate(from.getDate() + 6)
      return { from, to: endOfDay(to) }
    }
    case 'mes': {
      const from = new Date(today.getFullYear(), today.getMonth(), 1)
      const to = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      return { from, to: endOfDay(to) }
    }
  }
}

/**
 * Resolve o intervalo a partir dos valores do PeriodFilter (URL/estado).
 * Aceita tanto os rótulos da UI ('semanal'/'mensal') quanto os canônicos
 * ('semana'/'mes'). 'todos' e desconhecido → sem recorte.
 */
export function resolvePeriodRange(
  periodo: string | null | undefined,
  de?: string | null,
  ate?: string | null,
): DateRange {
  switch (periodo) {
    case 'hoje':
      return periodRange('hoje')
    case 'semana':
    case 'semanal':
      return periodRange('semana')
    case 'mes':
    case 'mensal':
      return periodRange('mes')
    case 'personalizado':
      return {
        from: de ? parseDateOnly(de) : null,
        to: ate ? endOfDay(parseDateOnly(ate)) : null,
      }
    default:
      return { from: null, to: null }
  }
}
