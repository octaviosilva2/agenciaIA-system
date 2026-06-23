'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  narrativeSchema,
  commitmentSchema,
  checkinSchema,
  type NarrativeInput,
  type CommitmentInput,
  type CheckinInput,
} from '@/lib/validations/nct'
import type { ActionState } from '@/lib/actions/action-state'
import type { Narrative, Commitment, Checkin } from '@/lib/queries/nct'

// Colunas devolvidas após insert (mesmo shape dos tipos da UI).
const NARRATIVE_COLS = 'id, title, purpose, dri_id, status'
const COMMITMENT_COLS =
  'id, narrative_id, title, description, type, status, progress, confidence, dri_id, metric_target'
const CHECKIN_COLS = 'id, commitment_id, progress, confidence, comment, author_id, created_at'

/** Primeiro erro do zod como mensagem legível. */
function firstIssue(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? 'Dados inválidos.'
}

// =====================================================================
// Narrativas — CRUD.
// =====================================================================

/** Cria uma narrativa; devolve a linha persistida (com id real) para a UI. */
export async function createNarrative(
  input: NarrativeInput,
): Promise<ActionState & { narrative?: Narrative }> {
  const parsed = narrativeSchema.safeParse(input)
  if (!parsed.success) return { success: false, message: firstIssue(parsed.error) }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('narratives')
    .insert({
      title: parsed.data.title,
      purpose: parsed.data.purpose ?? null,
      dri_id: parsed.data.dri_id ?? null,
      status: parsed.data.status,
    })
    .select(NARRATIVE_COLS)
    .single()

  if (error || !data) {
    return { success: false, message: `Erro ao criar narrativa: ${error?.message ?? ''}` }
  }

  revalidatePath('/nct')
  return { success: true, message: 'Narrativa criada.', narrative: data as Narrative }
}

/** Atualiza os campos de uma narrativa existente. */
export async function updateNarrative(id: string, input: NarrativeInput): Promise<ActionState> {
  const parsed = narrativeSchema.safeParse(input)
  if (!parsed.success) return { success: false, message: firstIssue(parsed.error) }

  const supabase = await createClient()
  const { error } = await supabase
    .from('narratives')
    .update({
      title: parsed.data.title,
      purpose: parsed.data.purpose ?? null,
      dri_id: parsed.data.dri_id ?? null,
      status: parsed.data.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { success: false, message: `Erro ao salvar narrativa: ${error.message}` }

  revalidatePath('/nct')
  return { success: true, message: 'Narrativa atualizada.' }
}

/** Exclui uma narrativa (e, por FK em cascata, seus compromissos). */
export async function deleteNarrative(id: string): Promise<ActionState> {
  const supabase = await createClient()
  const { error } = await supabase.from('narratives').delete().eq('id', id)
  if (error) return { success: false, message: `Erro ao excluir narrativa: ${error.message}` }

  revalidatePath('/nct')
  return { success: true, message: 'Narrativa excluída.' }
}

// =====================================================================
// Compromissos — CRUD.
// =====================================================================

/** Cria um compromisso dentro de uma narrativa; devolve a linha persistida. */
export async function createCommitment(
  input: CommitmentInput,
): Promise<ActionState & { commitment?: Commitment }> {
  const parsed = commitmentSchema.safeParse(input)
  if (!parsed.success) return { success: false, message: firstIssue(parsed.error) }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('commitments')
    .insert({
      narrative_id: parsed.data.narrative_id,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      type: parsed.data.type,
      status: parsed.data.status,
      progress: parsed.data.progress,
      confidence: parsed.data.confidence,
      dri_id: parsed.data.dri_id ?? null,
      metric_target: parsed.data.metric_target ?? null,
    })
    .select(COMMITMENT_COLS)
    .single()

  if (error || !data) {
    return { success: false, message: `Erro ao criar compromisso: ${error?.message ?? ''}` }
  }

  revalidatePath('/nct')
  return { success: true, message: 'Compromisso criado.', commitment: data as Commitment }
}

/** Atualiza um compromisso (inclui edição inline de progresso no detalhe). */
export async function updateCommitment(id: string, input: CommitmentInput): Promise<ActionState> {
  const parsed = commitmentSchema.safeParse(input)
  if (!parsed.success) return { success: false, message: firstIssue(parsed.error) }

  const supabase = await createClient()
  const { error } = await supabase
    .from('commitments')
    .update({
      narrative_id: parsed.data.narrative_id,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      type: parsed.data.type,
      status: parsed.data.status,
      progress: parsed.data.progress,
      confidence: parsed.data.confidence,
      dri_id: parsed.data.dri_id ?? null,
      metric_target: parsed.data.metric_target ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { success: false, message: `Erro ao salvar compromisso: ${error.message}` }

  revalidatePath('/nct')
  revalidatePath(`/nct/${id}`)
  return { success: true, message: 'Compromisso atualizado.' }
}

/** Exclui um compromisso. */
export async function deleteCommitment(id: string): Promise<ActionState> {
  const supabase = await createClient()
  const { error } = await supabase.from('commitments').delete().eq('id', id)
  if (error) return { success: false, message: `Erro ao excluir compromisso: ${error.message}` }

  revalidatePath('/nct')
  return { success: true, message: 'Compromisso excluído.' }
}

// =====================================================================
// Check-in — DUAS escritas na MESMA action (o último check-in é a fonte de
// verdade do card): insere em commitment_checkins E atualiza progress/confidence
// do compromisso com os valores recém-registrados.
// =====================================================================

/** Registra um check-in e espelha progresso/confiança no compromisso. */
export async function createCheckin(
  input: CheckinInput,
): Promise<ActionState & { checkin?: Checkin }> {
  const parsed = checkinSchema.safeParse(input)
  if (!parsed.success) return { success: false, message: firstIssue(parsed.error) }

  const supabase = await createClient()

  // Autor = usuário logado (profiles.id == auth.uid). Sem login → null.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 1) insere o check-in.
  const { data, error } = await supabase
    .from('commitment_checkins')
    .insert({
      commitment_id: parsed.data.commitment_id,
      progress: parsed.data.progress,
      confidence: parsed.data.confidence,
      comment: parsed.data.comment ?? null,
      author_id: user?.id ?? parsed.data.author_id ?? null,
    })
    .select(CHECKIN_COLS)
    .single()

  if (error || !data) {
    return { success: false, message: `Erro ao registrar check-in: ${error?.message ?? ''}` }
  }

  // 2) atualiza o card do compromisso (progresso + confiança do check-in mais novo).
  const { error: upErr } = await supabase
    .from('commitments')
    .update({
      progress: parsed.data.progress,
      confidence: parsed.data.confidence,
      updated_at: new Date().toISOString(),
    })
    .eq('id', parsed.data.commitment_id)

  if (upErr) {
    return {
      success: false,
      message: `Check-in salvo, mas falhou ao atualizar o compromisso: ${upErr.message}`,
    }
  }

  // A lista mostra o % atualizado; o detalhe mostra o novo check-in no topo.
  revalidatePath('/nct')
  revalidatePath(`/nct/${parsed.data.commitment_id}`)
  return { success: true, message: 'Check-in registrado.', checkin: data as Checkin }
}
