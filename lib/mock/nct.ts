/**
 * Dados MOCK do NCT (Narrativas · Compromissos · Tarefas) — modo UI-first, sem backend.
 *
 * Espelha as tabelas `narratives`, `commitments` e `commitment_checkins` de
 * docs/02-dados.md. Nada persiste: as views consomem isto como estado inicial e
 * "mutam" só em memória (estado local React + toast).
 *
 * IMPORTANTE para o backend: os nomes de campo abaixo (snake_case) são o contrato
 * implícito que a UI já consome. Trocar nome = quebrar a UI.
 */

import type { Database } from '@/lib/supabase/types'
import {
  PROFILE_OCTAVIO,
  PROFILE_KAUAN,
  PROFILE_CAIO,
  PROFILE_MARINA,
} from '@/lib/mock/profiles'

type Enums = Database['public']['Enums']

/** Narrativa (tabela `narratives`). */
export type Narrative = {
  id: string
  title: string
  purpose: string | null
  dri_id: string | null
  status: Enums['narrative_status']
}

/** Compromisso (tabela `commitments`). */
export type Commitment = {
  id: string
  narrative_id: string
  title: string
  description: string | null
  type: Enums['commitment_type']
  status: Enums['commitment_status']
  progress: number // 0–100
  confidence: Enums['confidence_level']
  dri_id: string | null
  metric_target: string | null
}

/** Check-in de um compromisso (tabela `commitment_checkins`). */
export type Checkin = {
  id: string
  commitment_id: string
  progress: number // 0–100
  confidence: Enums['confidence_level']
  comment: string | null
  author_id: string | null
  created_at: string // ISO datetime
}

// IDs fixos de narrativas para os compromissos referenciarem.
export const NARRATIVE_RECEITA = 'n0000000-0000-0000-0000-000000000001'
export const NARRATIVE_PRODUTO = 'n0000000-0000-0000-0000-000000000002'
export const NARRATIVE_MARCA = 'n0000000-0000-0000-0000-000000000003'

// IDs fixos de compromissos — usados também pelo vínculo de tarefas (lib/mock/tasks.ts).
export const COMMITMENT_RECORRENCIA = 'cm000000-0000-0000-0000-000000000001'
export const COMMITMENT_FUNIL = 'cm000000-0000-0000-0000-000000000002'
export const COMMITMENT_PLAYBOOK = 'cm000000-0000-0000-0000-000000000003'
export const COMMITMENT_DASHBOARD = 'cm000000-0000-0000-0000-000000000004'
export const COMMITMENT_CONTEUDO = 'cm000000-0000-0000-0000-000000000005'
export const COMMITMENT_NPS = 'cm000000-0000-0000-0000-000000000006'

/** 3 narrativas mock — uma por frente estratégica. */
export const MOCK_NARRATIVES: Narrative[] = [
  {
    id: NARRATIVE_RECEITA,
    title: 'Receita recorrente previsível',
    purpose: 'Sair da receita por projeto e construir uma base de MRR estável.',
    dri_id: PROFILE_OCTAVIO,
    status: 'ativa',
  },
  {
    id: NARRATIVE_PRODUTO,
    title: 'Padronizar a entrega de IA',
    purpose: 'Transformar o conhecimento em playbooks e produtos repetíveis.',
    dri_id: PROFILE_KAUAN,
    status: 'ativa',
  },
  {
    id: NARRATIVE_MARCA,
    title: 'Marca de referência em IA na região',
    purpose: 'Ser lembrada como a agência de IA para PMEs em SC.',
    dri_id: PROFILE_CAIO,
    status: 'ativa',
  },
]

/**
 * 6 compromissos cobrindo os 4 tipos (think_it/build_it/launch_it/quantitativo)
 * e as 3 confianças (alta/media/baixa).
 */
export const MOCK_COMMITMENTS: Commitment[] = [
  {
    id: COMMITMENT_RECORRENCIA,
    narrative_id: NARRATIVE_RECEITA,
    title: 'Fechar 8 contratos de manutenção mensal',
    description: 'Converter clientes de projeto em contratos recorrentes até o fim do trimestre.',
    type: 'quantitativo',
    status: 'em_andamento',
    progress: 50,
    confidence: 'media',
    dri_id: PROFILE_OCTAVIO,
    metric_target: '8 contratos ativos',
  },
  {
    id: COMMITMENT_FUNIL,
    narrative_id: NARRATIVE_RECEITA,
    title: 'Desenhar o processo comercial padrão',
    description: 'Mapear etapas do funil, gatilhos e materiais de cada fase.',
    type: 'think_it',
    status: 'em_andamento',
    progress: 70,
    confidence: 'alta',
    dri_id: PROFILE_OCTAVIO,
    metric_target: null,
  },
  {
    id: COMMITMENT_PLAYBOOK,
    narrative_id: NARRATIVE_PRODUTO,
    title: 'Construir o playbook de automação de atendimento',
    description: 'Documentar o passo a passo replicável de um projeto de atendimento com IA.',
    type: 'build_it',
    status: 'em_andamento',
    progress: 35,
    confidence: 'media',
    dri_id: PROFILE_KAUAN,
    metric_target: null,
  },
  {
    id: COMMITMENT_DASHBOARD,
    narrative_id: NARRATIVE_PRODUTO,
    title: 'Lançar o template de dashboard de resultados',
    description: 'Produto padrão entregue a todo cliente de manutenção, com métricas do projeto.',
    type: 'launch_it',
    status: 'em_andamento',
    progress: 20,
    confidence: 'baixa',
    dri_id: PROFILE_MARINA,
    metric_target: null,
  },
  {
    id: COMMITMENT_CONTEUDO,
    narrative_id: NARRATIVE_MARCA,
    title: 'Publicar conteúdo técnico semanal',
    description: 'Manter cadência de posts no LinkedIn mostrando cases e bastidores.',
    type: 'launch_it',
    status: 'em_andamento',
    progress: 60,
    confidence: 'alta',
    dri_id: PROFILE_CAIO,
    metric_target: null,
  },
  {
    id: COMMITMENT_NPS,
    narrative_id: NARRATIVE_MARCA,
    title: 'Atingir NPS 70 na base de clientes',
    description: 'Medir e elevar a satisfação dos clientes ativos.',
    type: 'quantitativo',
    status: 'em_andamento',
    progress: 15,
    confidence: 'baixa',
    dri_id: PROFILE_CAIO,
    metric_target: 'NPS ≥ 70',
  },
]

// --- Datas relativas a "hoje" para os check-ins parecerem recentes ---
function isoDateTimeOffset(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

/** Histórico de check-ins mock — concentra exemplos no compromisso de recorrência. */
export const MOCK_CHECKINS: Checkin[] = [
  {
    id: 'ck1',
    commitment_id: COMMITMENT_RECORRENCIA,
    progress: 25,
    confidence: 'alta',
    comment: 'Primeiros 2 contratos assinados, pipeline aquecido.',
    author_id: PROFILE_OCTAVIO,
    created_at: isoDateTimeOffset(-21),
  },
  {
    id: 'ck2',
    commitment_id: COMMITMENT_RECORRENCIA,
    progress: 38,
    confidence: 'media',
    comment: 'Mais 1 contrato. Dois clientes pediram para reavaliar no próximo mês.',
    author_id: PROFILE_OCTAVIO,
    created_at: isoDateTimeOffset(-9),
  },
  {
    id: 'ck3',
    commitment_id: COMMITMENT_RECORRENCIA,
    progress: 50,
    confidence: 'media',
    comment: '4 de 8 fechados. Ritmo bom, mas o segundo semestre é mais lento.',
    author_id: PROFILE_OCTAVIO,
    created_at: isoDateTimeOffset(-2),
  },
  {
    id: 'ck4',
    commitment_id: COMMITMENT_FUNIL,
    progress: 70,
    confidence: 'alta',
    comment: 'Etapas mapeadas, faltam os materiais de proposta.',
    author_id: PROFILE_OCTAVIO,
    created_at: isoDateTimeOffset(-5),
  },
]
