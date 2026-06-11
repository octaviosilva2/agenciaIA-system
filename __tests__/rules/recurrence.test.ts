import { describe, it, expect } from 'vitest';
import { generateRecurrences } from '../../lib/rules/recurrence';

describe('recurrence rule', () => {
  it('should generate exact amount of recurrences with correct due dates', () => {
    const charges = generateRecurrences({
      contractId: '123',
      startDate: new Date('2024-01-10T12:00:00Z'),
      minMonths: 3,
      billingDay: 15,
      monthlyValue: 1000
    });

    expect(charges).toHaveLength(3);
    expect(charges[0].due_date).toBe('2024-01-15');
    expect(charges[1].due_date).toBe('2024-02-15');
    expect(charges[2].due_date).toBe('2024-03-15');
    expect(charges[0].amount).toBe(1000);
    expect(charges[0].kind).toBe('recorrencia');
    expect(charges[0].description).toBe('Parcela 1/3');
  });
});
