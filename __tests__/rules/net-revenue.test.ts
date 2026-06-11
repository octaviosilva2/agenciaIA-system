import { describe, it, expect } from 'vitest';
import { calculateNetRevenue, calculateTotalNetRevenue } from '../../lib/rules/net-revenue';

describe('net-revenue rule', () => {
  it('should calculate pure net revenue', () => {
    expect(calculateNetRevenue(1000, 10)).toBe(900);
    expect(calculateNetRevenue(1000, 0)).toBe(1000);
    expect(calculateNetRevenue(500, 50)).toBe(250);
  });

  it('should calculate total net revenue', () => {
    expect(calculateTotalNetRevenue([1000, 2000, 3000], 10)).toBe(5400); // 6000 * 0.9
  });
});
