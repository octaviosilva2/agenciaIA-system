export type DealInput = { stage: string };
export type ProjectInput = { status: string };
export type ContractInput = { status: string };

export type ContactStatus = 'em_negociacao' | 'cliente_ativo' | 'reativar' | 'perdido' | 'inativo' | 'contato';

/**
 * Precedência:
 * 1. em_negociacao (deal no funil ativo)
 * 2. cliente_ativo (projeto não entregue OU contrato ativo)
 * 3. reativar (deal mais recente reativar_futuramente)
 * 4. perdido (deal mais recente perdido)
 * 5. inativo (teve projeto entregue)
 * 6. contato (fallback)
 */
export function deriveContactStatus(
  deals: DealInput[],
  projects: ProjectInput[],
  contracts: ContractInput[]
): ContactStatus {
  // 1. em_negociacao
  const activeFunnelStages = ['prospect', 'lead', 'diagnostico', 'oportunidade', 'escopo', 'proposta', 'negociacao'];
  if (deals.some(d => activeFunnelStages.includes(d.stage))) {
    return 'em_negociacao';
  }

  // 2. cliente_ativo
  if (projects.some(p => p.status !== 'entregue') || contracts.some(c => c.status === 'ativo')) {
    return 'cliente_ativo';
  }

  // Se não caiu acima, analisamos os deals terminais.
  // Assume-se que a array "deals" venha ordenada do mais recente para o mais antigo.
  if (deals.length > 0) {
    const latestDeal = deals[0];
    
    // 3. reativar
    if (latestDeal.stage === 'reativar_futuramente') {
      return 'reativar';
    }

    // 4. perdido
    if (latestDeal.stage === 'perdido') {
      return 'perdido';
    }
  }

  // 5. inativo (já teve projeto, logo todos entregues, e não caiu em perdido/reativar)
  if (projects.length > 0) {
    return 'inativo';
  }

  // 6. contato
  return 'contato';
}
