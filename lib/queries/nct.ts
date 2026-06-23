import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'

type Enums = Database['public']['Enums']

// =====================================================================
// Tipos (contrato da UI) — movidos de lib/mock/nct.ts, mesmo nome e shape.
// snake_case espelha as tabelas narratives / commitments / commitment_checkins.
// =====================================================================

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

/** Narrativa com seus compromissos aninhados (resultado da lista). */
export type NarrativeWithCommitments = Narrative & { commitments: Commitment[] }

/** Detalhe de um compromisso: o card + a narrativa pai + o histórico de check-ins. */
export type CommitmentDetail = {
  commitment: Commitment
  narrative: Narrative | null
  checkins: Checkin[]
}

// Colunas selecionadas (mantêm o shape dos tipos acima — sem created_at/updated_at na UI).
const NARRATIVE_COLS = 'id, title, purpose, dri_id, status'
const COMMITMENT_COLS =
  'id, narrative_id, title, description, type, status, progress, confidence, dri_id, metric_target'
const CHECKIN_COLS = 'id, commitment_id, progress, confidence, comment, author_id, created_at'

/**
 * Lista de narrativas com seus compromissos aninhados (tela /nct).
 * Uma query com join embutido; ordena narrativas e compromissos por criação.
 */
export async function getNarrativesWithCommitments(): Promise<NarrativeWithCommitments[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('narratives')
    .select(`${NARRATIVE_COLS}, commitments ( ${COMMITMENT_COLS}, created_at )`)
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Falha ao carregar narrativas: ${error.message}`)

  type RawNarrative = Narrative & { commitments: (Commitment & { created_at: string })[] }

  return ((data ?? []) as unknown as RawNarrative[]).map((n) => ({
    id: n.id,
    title: n.title,
    purpose: n.purpose,
    dri_id: n.dri_id,
    status: n.status,
    // Ordena os compromissos por criação (mais antigo primeiro) e remove created_at.
    commitments: [...n.commitments]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map(({ created_at: _omit, ...c }) => c),
  }))
}

/**
 * Detalhe de um compromisso (tela /nct/[commitmentId]): o card, a narrativa pai
 * e o histórico de check-ins. Retorna null quando o id não existe (→ notFound).
 */
export async function getCommitmentDetail(id: string): Promise<CommitmentDetail | null> {
  const supabase = await createClient()

  const { data: commitment, error } = await supabase
    .from('commitments')
    .select(COMMITMENT_COLS)
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(`Falha ao carregar compromisso: ${error.message}`)
  if (!commitment) return null

  const cm = commitment as Commitment

  // Narrativa pai (para o breadcrumb do header).
  const { data: narrative, error: nErr } = await supabase
    .from('narratives')
    .select(NARRATIVE_COLS)
    .eq('id', cm.narrative_id)
    .maybeSingle()

  if (nErr) throw new Error(`Falha ao carregar narrativa: ${nErr.message}`)

  // Histórico de check-ins (mais recentes primeiro; a view reordena conforme precisar).
  const { data: checkins, error: ckErr } = await supabase
    .from('commitment_checkins')
    .select(CHECKIN_COLS)
    .eq('commitment_id', id)
    .order('created_at', { ascending: false })

  if (ckErr) throw new Error(`Falha ao carregar check-ins: ${ckErr.message}`)

  return {
    commitment: cm,
    narrative: (narrative as Narrative | null) ?? null,
    checkins: (checkins ?? []) as Checkin[],
  }
}
