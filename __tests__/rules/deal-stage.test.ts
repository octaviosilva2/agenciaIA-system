import { describe, it, expect } from 'vitest';
import { canDisqualify, validateStageTransition } from '../../lib/rules/deal-stage';

describe('deal-stage rules', () => {
  it('should allow disqualify only on prospect or lead', () => {
    expect(canDisqualify('prospect')).toBe(true);
    expect(canDisqualify('lead')).toBe(true);
    expect(canDisqualify('diagnostico')).toBe(false);
  });

  it('should validate transition to desqualificado correctly', () => {
    const res = validateStageTransition('diagnostico', 'desqualificado', false);
    expect(res.valid).toBe(false);
    expect(res.error).toBe("Só é possível desqualificar nas fases de Prospect ou Lead");
  });

  it('should enforce project link requirement for advanced stages', () => {
    const res = validateStageTransition('oportunidade', 'escopo', false);
    expect(res.valid).toBe(false);
    expect(res.error).toBe("Este estágio exige que haja um projeto vinculado a oportunidade");

    const validRes = validateStageTransition('oportunidade', 'escopo', true);
    expect(validRes.valid).toBe(true);
  });
});
