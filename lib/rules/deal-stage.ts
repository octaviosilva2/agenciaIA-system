export type DealStage =
  | 'prospect' | 'lead' | 'diagnostico' | 'oportunidade' | 'escopo'
  | 'proposta' | 'negociacao' | 'fechado' | 'perdido'
  | 'reativar_futuramente' | 'desqualificado';

export const TERMINAL_STAGES: DealStage[] = ['fechado', 'perdido', 'reativar_futuramente', 'desqualificado'];
export const ACTIVE_FUNNEL_STAGES: DealStage[] = ['prospect', 'lead', 'diagnostico', 'oportunidade', 'escopo', 'proposta', 'negociacao'];

export function canDisqualify(currentStage: DealStage): boolean {
  return currentStage === 'prospect' || currentStage === 'lead';
}

export function requiresProjectCreation(targetStage: DealStage): boolean {
  return targetStage === 'oportunidade';
}

export function requiresProjectLinked(targetStage: DealStage): boolean {
  return ['escopo', 'proposta', 'negociacao', 'fechado'].includes(targetStage);
}

export function validateStageTransition(currentStage: DealStage, targetStage: DealStage, hasProject: boolean): { valid: boolean; error?: string } {
  if (targetStage === 'desqualificado' && !canDisqualify(currentStage)) {
    return { valid: false, error: "Só é possível desqualificar nas fases de Prospect ou Lead" };
  }

  if (requiresProjectLinked(targetStage) && !hasProject) {
    return { valid: false, error: "Este estágio exige que haja um projeto vinculado a oportunidade" };
  }

  return { valid: true };
}
