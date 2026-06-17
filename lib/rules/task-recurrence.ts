import { addMonths, format, parseISO, setDate, startOfDay } from 'date-fns'

/**
 * Próxima data de vencimento de uma tarefa mensal: o dia `day` do mês,
 * estritamente DEPOIS de `fromISO`. Se o dia deste mês já passou (ou é hoje),
 * pula para o mês seguinte. `day` é 1–28 (garantido pelo CHECK do banco),
 * então nunca há overflow de mês curto.
 */
export function nextMonthlyDueDate(fromISO: string, day: number): string {
  const from = startOfDay(parseISO(fromISO))
  let candidate = setDate(from, day)
  if (candidate.getTime() <= from.getTime()) {
    candidate = setDate(addMonths(from, 1), day)
  }
  return format(candidate, 'yyyy-MM-dd')
}
