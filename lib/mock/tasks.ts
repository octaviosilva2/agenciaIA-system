/**
 * Dados MOCK do board global de Tarefas (tabela `tasks`) — modo UI-first, sem backend.
 *
 * Espelha a tabela `tasks` de docs/02-dados.md. Diferente do kanban da Implementação
 * (components/tasks/tasks-kanban.tsx, congelado), aqui o card é mais rico: mostra
 * responsável, impacto×esforço e vínculos (projeto/compromisso). Nada persiste.
 *
 * IMPORTANTE para o backend: os nomes de campo (snake_case) são o contrato implícito.
 */

import type { Database } from '@/lib/supabase/types'
import {
  PROFILE_OCTAVIO,
  PROFILE_KAUAN,
  PROFILE_CAIO,
  PROFILE_MARINA,
} from '@/lib/mock/profiles'
import {
  COMMITMENT_RECORRENCIA,
  COMMITMENT_FUNIL,
  COMMITMENT_PLAYBOOK,
  COMMITMENT_DASHBOARD,
  COMMITMENT_CONTEUDO,
} from '@/lib/mock/nct'

type Enums = Database['public']['Enums']

/**
 * Tarefa do board global (subconjunto da tabela `tasks`).
 * É a MESMA entidade `tasks` usada na Implementação/Manutenção — não é um conceito
 * novo. Aqui só expomos mais campos no card (assignee, impact, effort, vínculos).
 */
export type ManagedTask = {
  id: string
  title: string
  description: string | null
  status: Enums['task_status']
  priority: Enums['task_priority']
  area: Enums['task_area']
  assignee_id: string | null
  project_id: string | null
  deal_id: string | null
  company_id: string | null
  commitment_id: string | null
  due_date: string | null // ISO yyyy-MM-dd
  impact: Enums['level_scale'] | null
  effort: Enums['level_scale'] | null
}

// --- Projetos mock (só para exibir o vínculo como chip) ---
// Os ids batem com lib/mock/finance.ts para coerência entre telas.
export const PROJECT_MODA = '11111111-1111-1111-1111-111111111111'
export const PROJECT_DENTAL = '22222222-2222-2222-2222-222222222222'
export const PROJECT_LOGI = '33333333-3333-3333-3333-333333333333'

/** Rótulo de exibição de cada projeto mock (no backend vem do join). */
export const PROJECT_LABELS: Record<string, string> = {
  [PROJECT_MODA]: 'CRM Moda em Foco',
  [PROJECT_DENTAL]: 'Automação DentalCare',
  [PROJECT_LOGI]: 'LogiFlow',
}

// --- Datas relativas a "hoje" ---
function isoOffset(days: number): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

/**
 * ~10 tarefas variadas cobrindo todas as colunas (analisar/todo/doing/impedimento/done),
 * áreas, prioridades, com alguns vínculos de projeto e/ou compromisso NCT.
 */
export const MOCK_TASKS: ManagedTask[] = [
  {
    id: 't1',
    title: 'Mapear etapas do funil comercial',
    description: 'Listar gatilhos e materiais de cada fase.',
    status: 'analisar',
    priority: 'proximo',
    area: 'comercial',
    assignee_id: PROFILE_OCTAVIO,
    project_id: null,
    deal_id: null,
    company_id: null,
    commitment_id: COMMITMENT_FUNIL,
    due_date: isoOffset(6),
    impact: 'alto',
    effort: 'medio',
  },
  {
    id: 't2',
    title: 'Roteiro do playbook de atendimento',
    description: 'Esqueleto do passo a passo replicável.',
    status: 'analisar',
    priority: 'futuro',
    area: 'operacional',
    assignee_id: PROFILE_KAUAN,
    project_id: null,
    deal_id: null,
    company_id: null,
    commitment_id: COMMITMENT_PLAYBOOK,
    due_date: null,
    impact: 'alto',
    effort: 'alto',
  },
  {
    id: 't3',
    title: 'Proposta de contrato recorrente — DentalCare',
    description: 'Montar proposta de manutenção mensal.',
    status: 'todo',
    priority: 'urgente',
    area: 'comercial',
    assignee_id: PROFILE_OCTAVIO,
    project_id: PROJECT_DENTAL,
    deal_id: null,
    company_id: null,
    commitment_id: COMMITMENT_RECORRENCIA,
    due_date: isoOffset(2),
    impact: 'alto',
    effort: 'baixo',
  },
  {
    id: 't4',
    title: 'Wireframe do template de dashboard',
    description: 'Layout das métricas padrão do produto.',
    status: 'todo',
    priority: 'proximo',
    area: 'operacional',
    assignee_id: PROFILE_MARINA,
    project_id: null,
    deal_id: null,
    company_id: null,
    commitment_id: COMMITMENT_DASHBOARD,
    due_date: isoOffset(9),
    impact: 'medio',
    effort: 'medio',
  },
  {
    id: 't5',
    title: 'Calendário editorial do LinkedIn (jul)',
    description: 'Definir 4 temas de posts do mês.',
    status: 'doing',
    priority: 'proximo',
    area: 'comercial',
    assignee_id: PROFILE_CAIO,
    project_id: null,
    deal_id: null,
    company_id: null,
    commitment_id: COMMITMENT_CONTEUDO,
    due_date: isoOffset(1),
    impact: 'medio',
    effort: 'baixo',
  },
  {
    id: 't6',
    title: 'Integração de webhook — CRM Moda',
    description: 'Conectar o formulário do site ao CRM.',
    status: 'doing',
    priority: 'urgente',
    area: 'operacional',
    assignee_id: PROFILE_KAUAN,
    project_id: PROJECT_MODA,
    deal_id: null,
    company_id: null,
    commitment_id: null,
    due_date: isoOffset(-1), // atrasada e não-done → vermelho
    impact: 'alto',
    effort: 'medio',
  },
  {
    id: 't7',
    title: 'Aprovar acesso à API do cliente — LogiFlow',
    description: 'Aguardando credenciais do cliente.',
    status: 'impedimento',
    priority: 'urgente',
    area: 'operacional',
    assignee_id: PROFILE_KAUAN,
    project_id: PROJECT_LOGI,
    deal_id: null,
    company_id: null,
    commitment_id: null,
    due_date: isoOffset(-4), // atrasada
    impact: 'alto',
    effort: 'baixo',
  },
  {
    id: 't8',
    title: 'Revisar política de preços de manutenção',
    description: 'Aguardando decisão de margem com a contabilidade.',
    status: 'impedimento',
    priority: 'futuro',
    area: 'financeiro',
    assignee_id: PROFILE_OCTAVIO,
    project_id: null,
    deal_id: null,
    company_id: null,
    commitment_id: COMMITMENT_RECORRENCIA,
    due_date: null,
    impact: 'medio',
    effort: 'baixo',
  },
  {
    id: 't9',
    title: 'Configurar ambiente de staging',
    description: 'Subir ambiente de homologação no Vercel.',
    status: 'done',
    priority: 'proximo',
    area: 'sistema',
    assignee_id: PROFILE_MARINA,
    project_id: PROJECT_MODA,
    deal_id: null,
    company_id: null,
    commitment_id: null,
    due_date: isoOffset(-3),
    impact: 'baixo',
    effort: 'medio',
  },
  {
    id: 't10',
    title: 'Documentar processo de onboarding',
    description: 'Checklist de início de contrato de manutenção.',
    status: 'done',
    priority: 'futuro',
    area: 'gestao',
    assignee_id: PROFILE_OCTAVIO,
    project_id: null,
    deal_id: null,
    company_id: null,
    commitment_id: COMMITMENT_PLAYBOOK,
    due_date: isoOffset(-6),
    impact: 'medio',
    effort: 'baixo',
  },
]

/**
 * Tarefas já vinculadas ao compromisso de recorrência — usadas na tela de detalhe
 * do compromisso (/nct/[id]) para mostrar a lista de tasks vinculadas.
 * É um recorte do MOCK_TASKS por commitment_id (mesma fonte).
 */
export function tasksByCommitment(commitmentId: string): ManagedTask[] {
  return MOCK_TASKS.filter((t) => t.commitment_id === commitmentId)
}
