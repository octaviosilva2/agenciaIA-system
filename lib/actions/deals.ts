'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { validateStageTransition, canDisqualify, type DealStage } from '@/lib/rules/deal-stage'
import type { ActionState } from '@/lib/actions/action-state'

type ServerClient = Awaited<ReturnType<typeof createClient>>

/** Lê um campo de texto do FormData: string vazia → null. */
function str(v: FormDataEntryValue | null): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t === '' ? null : t
}

/** Lê um campo numérico do FormData (aceita vírgula decimal). */
function num(v: FormDataEntryValue | null): number | null {
  const s = str(v)
  if (s == null) return null
  const n = Number(s.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/** Grava o evento de estágio (alimenta a página Funil). created_by fica null (profiles pode estar vazia). */
async function recordEvent(supabase: ServerClient, dealId: string, stage: DealStage) {
  await supabase.from('deal_stage_events').insert({ deal_id: dealId, stage })
}

/** Revalida as duas telas que compartilham os deals → reflexo automático. */
function revalidateBoards() {
  revalidatePath('/contatos')
  revalidatePath('/projetos')
}

type DealRow = {
  id: string
  stage: DealStage
  company_id: string
  estimated_value: number | null
  projects: { id: string; name: string }[]
}

async function fetchDeal(supabase: ServerClient, dealId: string): Promise<DealRow | null> {
  const { data, error } = await supabase
    .from('deals')
    .select('id, stage, company_id, estimated_value, projects ( id, name )')
    .eq('id', dealId)
    .single()
  if (error || !data) return null
  return data as unknown as DealRow
}

/** Move um deal entre estágios ativos (drag no kanban). */
export async function changeDealStage(dealId: string, target: DealStage): Promise<ActionState> {
  const supabase = await createClient()
  const deal = await fetchDeal(supabase, dealId)
  if (!deal) return { success: false, message: 'Negócio não encontrado.' }

  const hasProject = deal.projects.length > 0

  // Mover para Oportunidade sem projeto → a UI abre o modal de criar projeto.
  if (target === 'oportunidade' && !hasProject) {
    return { success: false, message: 'Crie o projeto para mover a Oportunidade.' }
  }

  const check = validateStageTransition(deal.stage, target, hasProject)
  if (!check.valid) return { success: false, message: check.error ?? 'Transição inválida.' }

  const { error } = await supabase
    .from('deals')
    .update({ stage: target, closed_at: null })
    .eq('id', dealId)
  if (error) return { success: false, message: `Erro ao mover: ${error.message}` }

  await recordEvent(supabase, dealId, target)
  revalidateBoards()
  return { success: true, message: 'Estágio atualizado.' }
}

/** Cria o projeto vinculado e avança o deal para Oportunidade. */
export async function createProjectAndAdvance(
  dealId: string,
  name: string,
  description: string,
): Promise<ActionState> {
  if (!name.trim()) return { success: false, message: 'Informe o nome do projeto.' }

  const supabase = await createClient()
  const deal = await fetchDeal(supabase, dealId)
  if (!deal) return { success: false, message: 'Negócio não encontrado.' }

  // Idempotência: só cria projeto se ainda não houver.
  if (deal.projects.length === 0) {
    const { error: projErr } = await supabase.from('projects').insert({
      company_id: deal.company_id,
      deal_id: dealId,
      name: name.trim(),
      notes: description.trim() || null,
      status: 'a_iniciar',
    })
    if (projErr) return { success: false, message: `Erro ao criar projeto: ${projErr.message}` }
  }

  const { error } = await supabase
    .from('deals')
    .update({ stage: 'oportunidade', closed_at: null })
    .eq('id', dealId)
  if (error) return { success: false, message: `Erro ao mover: ${error.message}` }

  await recordEvent(supabase, dealId, 'oportunidade')
  revalidateBoards()
  return { success: true, message: 'Projeto criado · negócio em Oportunidade.' }
}

/** Fecha o negócio (com/sem manutenção) e cria a cobrança de setup (idempotente). */
export async function closeDeal(dealId: string, hasMaintenance: boolean): Promise<ActionState> {
  const supabase = await createClient()
  const deal = await fetchDeal(supabase, dealId)
  if (!deal) return { success: false, message: 'Negócio não encontrado.' }

  const check = validateStageTransition(deal.stage, 'fechado', deal.projects.length > 0)
  if (!check.valid) return { success: false, message: check.error ?? 'Transição inválida.' }

  const { error } = await supabase
    .from('deals')
    .update({ stage: 'fechado', has_maintenance: hasMaintenance, closed_at: new Date().toISOString() })
    .eq('id', dealId)
  if (error) return { success: false, message: `Erro ao fechar: ${error.message}` }

  await recordEvent(supabase, dealId, 'fechado')

  // Charge setup: consultar-antes-de-criar (idempotente por projeto).
  const project = deal.projects[0] ?? null
  if (project) {
    const { data: existing } = await supabase
      .from('charges')
      .select('id')
      .eq('project_id', project.id)
      .eq('kind', 'setup')
      .limit(1)
    if (!existing || existing.length === 0) {
      const due = new Date()
      due.setDate(due.getDate() + 7)
      await supabase.from('charges').insert({
        company_id: deal.company_id,
        project_id: project.id,
        description: `Setup ${project.name}`,
        kind: 'setup',
        amount: deal.estimated_value ?? 0,
        due_date: due.toISOString().slice(0, 10),
        status: 'pendente',
      })
    }
  }

  revalidateBoards()
  return {
    success: true,
    message: `Negócio fechado ${hasMaintenance ? 'com' : 'sem'} manutenção.`,
  }
}

/** Marca como perdido (exige motivo). */
export async function loseDeal(dealId: string, reason: string): Promise<ActionState> {
  if (!reason.trim()) return { success: false, message: 'Informe o motivo da perda.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('deals')
    .update({ stage: 'perdido', lost_reason: reason.trim(), closed_at: new Date().toISOString() })
    .eq('id', dealId)
  if (error) return { success: false, message: `Erro: ${error.message}` }

  await recordEvent(supabase, dealId, 'perdido')
  revalidateBoards()
  return { success: true, message: 'Negócio marcado como Perdido.' }
}

/** Marca para reativar futuramente. */
export async function reactivateDeal(dealId: string): Promise<ActionState> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('deals')
    .update({ stage: 'reativar_futuramente', closed_at: new Date().toISOString() })
    .eq('id', dealId)
  if (error) return { success: false, message: `Erro: ${error.message}` }

  await recordEvent(supabase, dealId, 'reativar_futuramente')
  revalidateBoards()
  return { success: true, message: 'Negócio marcado como Reativar.' }
}

/** Desqualifica (só a partir de Prospect ou Lead). */
export async function disqualifyDeal(dealId: string): Promise<ActionState> {
  const supabase = await createClient()
  const deal = await fetchDeal(supabase, dealId)
  if (!deal) return { success: false, message: 'Negócio não encontrado.' }

  if (!canDisqualify(deal.stage)) {
    return { success: false, message: 'Só é possível desqualificar em Prospect ou Lead.' }
  }

  const { error } = await supabase
    .from('deals')
    .update({ stage: 'desqualificado', closed_at: new Date().toISOString() })
    .eq('id', dealId)
  if (error) return { success: false, message: `Erro: ${error.message}` }

  await recordEvent(supabase, dealId, 'desqualificado')
  revalidateBoards()
  return { success: true, message: 'Negócio desqualificado.' }
}

/** Cria uma oportunidade: deal já em Oportunidade + projeto vinculado, de uma vez. */
export async function createOpportunity(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const companyId = str(formData.get('company_id'))
  const projectName = str(formData.get('project_name'))
  const description = str(formData.get('project_description'))
  const estimatedValue = num(formData.get('estimated_value'))

  if (!companyId) return { success: false, message: 'Selecione o contato.' }
  if (!projectName) return { success: false, message: 'Informe o nome do projeto.' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('deals')
    .insert({ company_id: companyId, title: projectName, stage: 'oportunidade', estimated_value: estimatedValue })
    .select('id')
    .single()
  if (error || !data) return { success: false, message: `Erro ao criar negócio: ${error?.message ?? ''}` }

  const deal = data as { id: string }
  const { error: projErr } = await supabase.from('projects').insert({
    company_id: companyId,
    deal_id: deal.id,
    name: projectName,
    notes: description,
    status: 'a_iniciar',
  })
  if (projErr) return { success: false, message: `Erro ao criar projeto: ${projErr.message}` }

  await recordEvent(supabase, deal.id, 'oportunidade')
  revalidateBoards()
  return { success: true, message: 'Oportunidade criada.' }
}
