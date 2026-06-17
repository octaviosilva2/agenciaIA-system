import { describe, it, expect } from 'vitest'
import { nextMonthlyDueDate } from '../../lib/rules/task-recurrence'

describe('task recurrence rule', () => {
  it('avança para o próximo mês quando o dia é o mesmo da data base', () => {
    expect(nextMonthlyDueDate('2026-06-20', 20)).toBe('2026-07-20')
  })

  it('mantém o mês quando o dia ainda não chegou', () => {
    expect(nextMonthlyDueDate('2026-06-20', 25)).toBe('2026-06-25')
  })

  it('avança para o próximo mês quando o dia já passou', () => {
    expect(nextMonthlyDueDate('2026-06-20', 10)).toBe('2026-07-10')
  })

  it('vira o ano corretamente em dezembro', () => {
    expect(nextMonthlyDueDate('2026-12-15', 10)).toBe('2027-01-10')
  })
})
