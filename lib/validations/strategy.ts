import { z } from 'zod'
import type { Database } from '@/lib/supabase/types'

type StrategyKind = Database['public']['Enums']['strategy_block_kind']

// =====================================================================
// Schema do `content` jsonb por kind. A action valida o shape conforme o
// kind do bloco antes de persistir — cada kind tem um formato próprio.
// `.strict()` garante que nenhuma chave fora do shape do kind passe.
// =====================================================================

export const missionContentSchema = z.object({ text: z.string() }).strict()
export const purposeContentSchema = z.object({ text: z.string() }).strict()
export const swotContentSchema = z
  .object({
    strengths: z.string(),
    weaknesses: z.string(),
    opportunities: z.string(),
    threats: z.string(),
  })
  .strict()
export const asIsToBeContentSchema = z
  .object({ as_is: z.string(), to_be: z.string() })
  .strict()
export const blueprintContentSchema = z
  .object({
    channels: z.string(),
    revenue: z.string(),
    value_proposition: z.string(),
    segments: z.string(),
  })
  .strict()

/** Mapa kind → schema do content. Usado pela action para validar por kind. */
export const STRATEGY_CONTENT_SCHEMAS: Record<StrategyKind, z.ZodTypeAny> = {
  missao: missionContentSchema,
  proposito: purposeContentSchema,
  swot: swotContentSchema,
  asis_tobe: asIsToBeContentSchema,
  blueprint: blueprintContentSchema,
}
