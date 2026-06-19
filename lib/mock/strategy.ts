/**
 * Dados MOCK da Estratégia (tabela `strategy_blocks`) — modo UI-first, sem backend.
 *
 * São 5 blocos FIXOS (um por kind do enum strategy_block_kind). Não se cria nem
 * se exclui — só se edita. O campo `content` é jsonb e seu formato muda por kind.
 *
 * IMPORTANTE para o backend: os formatos de `content` abaixo são o contrato
 * implícito que a UI já consome. Cada kind tem um shape próprio:
 *   - missao / proposito → { text }
 *   - swot               → { strengths, weaknesses, opportunities, threats }
 *   - asis_tobe          → { as_is, to_be }
 *   - blueprint          → { channels, revenue, value_proposition, segments }
 */

import type { Database } from '@/lib/supabase/types'

type StrategyKind = Database['public']['Enums']['strategy_block_kind']

// --- Formato do `content` por kind (jsonb tipado na UI) ---

export type MissionContent = { text: string }
export type PurposeContent = { text: string }
export type SwotContent = {
  strengths: string
  weaknesses: string
  opportunities: string
  threats: string
}
export type AsIsToBeContent = { as_is: string; to_be: string }
export type BlueprintContent = {
  channels: string
  revenue: string
  value_proposition: string
  segments: string
}

/** Mapa kind → formato do content. Garante que cada bloco carregue o shape certo. */
export type StrategyContentByKind = {
  missao: MissionContent
  proposito: PurposeContent
  swot: SwotContent
  asis_tobe: AsIsToBeContent
  blueprint: BlueprintContent
}

/**
 * Bloco estratégico tipado por kind (união discriminada).
 * Espelha `strategy_blocks` (id, kind, content jsonb, updated_at).
 */
export type StrategyBlock = {
  [K in StrategyKind]: {
    id: string
    kind: K
    content: StrategyContentByKind[K]
    updated_at: string
  }
}[StrategyKind]

/**
 * Metadados FIXOS de UI por bloco: título e a descrição que explica o que é e
 * pra que serve. Não vêm do banco — são texto de interface (PT-BR).
 */
export const STRATEGY_BLOCK_META: Record<StrategyKind, { title: string; description: string }> = {
  missao: {
    title: 'Missão',
    description:
      'O que a empresa faz, para quem e por quê — em uma frase. É a razão de existir no presente.',
  },
  proposito: {
    title: 'Propósito',
    description:
      'A causa maior por trás do negócio: o impacto que queremos gerar além do lucro.',
  },
  swot: {
    title: 'SWOT',
    description:
      'Diagnóstico em quatro quadrantes: forças e fraquezas (internas) · oportunidades e ameaças (externas).',
  },
  asis_tobe: {
    title: 'AS IS → TO BE',
    description:
      'Onde estamos hoje (estado atual) e onde queremos chegar (estado desejado). A distância entre os dois é a estratégia.',
  },
  blueprint: {
    title: 'Blueprint de Negócio',
    description:
      'O desenho do modelo: por onde chegamos ao cliente, como geramos receita, o que entregamos de valor e para quem.',
  },
}

const now = new Date().toISOString()

/** Os 5 blocos fixos com conteúdo de exemplo. */
export const MOCK_STRATEGY_BLOCKS: StrategyBlock[] = [
  {
    id: 'sb-missao',
    kind: 'missao',
    content: {
      text: 'Levar inteligência artificial aplicada a pequenas e médias empresas, transformando processos manuais em automações que geram resultado mensurável.',
    },
    updated_at: now,
  },
  {
    id: 'sb-proposito',
    kind: 'proposito',
    content: {
      text: 'Democratizar o acesso à IA no Brasil, fazendo com que empresas que nunca pensaram em tecnologia ganhem tempo e cresçam com ela.',
    },
    updated_at: now,
  },
  {
    id: 'sb-swot',
    kind: 'swot',
    content: {
      strengths:
        'Domínio técnico de IA e automação · entrega rápida · proximidade com o cliente.',
      weaknesses: 'Equipe enxuta · marca ainda pouco conhecida · processos comerciais informais.',
      opportunities:
        'Onda de adoção de IA nas PMEs · poucos concorrentes especializados na região.',
      threats: 'Entrada de grandes players · commoditização de ferramentas no-code.',
    },
    updated_at: now,
  },
  {
    id: 'sb-asis_tobe',
    kind: 'asis_tobe',
    content: {
      as_is:
        'Atendimento sob demanda, projeto a projeto, receita instável e dependente do fundador para vender.',
      to_be:
        'Carteira de contratos recorrentes de manutenção, processo comercial previsível e entrega padronizada por playbooks.',
    },
    updated_at: now,
  },
  {
    id: 'sb-blueprint',
    kind: 'blueprint',
    content: {
      channels: 'Indicação · LinkedIn · workshops presenciais · parcerias com contadores.',
      revenue: 'Setup de projeto (one-off) + mensalidade de manutenção + consultorias avulsas.',
      value_proposition:
        'Automação de IA sob medida, do diagnóstico à manutenção, com resultado em semanas.',
      segments: 'PMEs de serviço (clínicas, e-commerce, logística) com processos manuais repetitivos.',
    },
    updated_at: now,
  },
]
