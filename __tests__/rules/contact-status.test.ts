import { describe, it, expect } from 'vitest';
import { deriveContactStatus, DealInput, ProjectInput, ContractInput } from '../../lib/rules/contact-status';

describe('contact-status rule', () => {
  it('should return em_negociacao if active funnel', () => {
    const deals: DealInput[] = [{ stage: 'lead' }];
    expect(deriveContactStatus(deals, [], [])).toBe('em_negociacao');
  });

  it('should return cliente_ativo if no active funnel but project active', () => {
    const deals: DealInput[] = [{ stage: 'fechado' }];
    const projects: ProjectInput[] = [{ status: 'desenvolvimento' }];
    expect(deriveContactStatus(deals, projects, [])).toBe('cliente_ativo');
  });

  it('should return cliente_ativo if project is delivered but contract is active', () => {
    const deals: DealInput[] = [{ stage: 'fechado' }];
    const projects: ProjectInput[] = [{ status: 'entregue' }];
    const contracts: ContractInput[] = [{ status: 'ativo' }];
    expect(deriveContactStatus(deals, projects, contracts)).toBe('cliente_ativo');
  });

  it('should fallback to terminal deal rules if no project/contract active', () => {
    const deals: DealInput[] = [{ stage: 'reativar_futuramente' }];
    expect(deriveContactStatus(deals, [], [])).toBe('reativar');
  });

  it('should be inativo if delivered project and no active contract/terminal deal mismatch', () => {
    // Deal fechado (não é reativar, não é perdido, não está no funil ativo)
    const deals: DealInput[] = [{ stage: 'fechado' }];
    const projects: ProjectInput[] = [{ status: 'entregue' }]; // entregue -> inativo se nao tem contract
    expect(deriveContactStatus(deals, projects, [])).toBe('inativo');
  });

  it('should be contato if pure without anything', () => {
    expect(deriveContactStatus([], [], [])).toBe('contato');
  });

  it('should be contato if only disqualified deals exist', () => {
    const deals: DealInput[] = [{ stage: 'desqualificado' }];
    expect(deriveContactStatus(deals, [], [])).toBe('contato');
  });
});
