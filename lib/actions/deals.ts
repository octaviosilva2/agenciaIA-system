'use server'

import { revalidatePath } from 'next/cache'
import { addMonths, format, parseISO } from 'date-fns'
import { createClient } from '@/lib/supabase/server'
import { paymentInstantFromYmd } from '@/lib/date-range'
import { validateStageTransition, canDisqualify, type DealStage } from '@/lib/rules/deal-stage'
import {
  setProjectPayment,
  setMaintenanceContract,
  setAvulsoContract,
  type PaymentInstallment,
} from '@/lib/actions/project'
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

/**
 * Instante de um evento/desfecho a partir da data ('yyyy-MM-dd') escolhida na UI.
 * Sem data → agora (data do clique); com data → meio-dia (não cruza o fuso),
 * permitindo registrar transições/fechamentos retroativos.
 */
function eventInstant(date?: string | null): string {
  return date ? paymentInstantFromYmd(date) : new Date().toISOString()
}

/**
 * Grava o evento de estágio (alimenta a página Funil). created_by fica null
 * (profiles pode estar vazia). `enteredAt` (ISO) permite datar a transição no passado.
 */
async function recordEvent(
  supabase: ServerClient,
  dealId: string,
  stage: DealStage,
  enteredAt?: string,
) {
  await supabase
    .from('deal_stage_events')
    .insert({ deal_id: dealId, stage, ...(enteredAt ? { entered_at: enteredAt } : {}) })
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

/** Move um deal entre estágios ativos (drag no kanban). `date` data a transição. */
export async function changeDealStage(
  dealId: string,
  target: DealStage,
  date?: string,
): Promise<ActionState> {
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

  await recordEvent(supabase, dealId, target, eventInstant(date))
  revalidateBoards()
  return { success: true, message: 'Estágio atualizado.' }
}

/** Cria o projeto vinculado e avança o deal para Oportunidade. */
export async function createProjectAndAdvance(
  dealId: string,
  name: string,
  description: string,
  date?: string,
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

  await recordEvent(supabase, dealId, 'oportunidade', eventInstant(date))
  revalidateBoards()
  return { success: true, message: 'Projeto criado · negócio em Oportunidade.' }
}

/** Fecha o negócio (com/sem manutenção) e cria a cobrança de setup (idempotente). */
export async function closeDeal(
  dealId: string,
  hasMaintenance: boolean,
  date?: string,
): Promise<ActionState> {
  const supabase = await createClient()
  const deal = await fetchDeal(supabase, dealId)
  if (!deal) return { success: false, message: 'Negócio não encontrado.' }

  const check = validateStageTransition(deal.stage, 'fechado', deal.projects.length > 0)
  if (!check.valid) return { success: false, message: check.error ?? 'Transição inválida.' }

  const closedAt = eventInstant(date)
  const { error } = await supabase
    .from('deals')
    .update({ stage: 'fechado', has_maintenance: hasMaintenance, closed_at: closedAt })
    .eq('id', dealId)
  if (error) return { success: false, message: `Erro ao fechar: ${error.message}` }

  await recordEvent(supabase, dealId, 'fechado', closedAt)

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
      // Vencimento 7 dias após o fechamento (base = data escolhida ou hoje).
      const due = date ? parseISO(date) : new Date()
      due.setDate(due.getDate() + 7)
      await supabase.from('charges').insert({
        company_id: deal.company_id,
        project_id: project.id,
        description: `Setup ${project.name}`,
        kind: 'setup',
        amount: deal.estimated_value ?? 0,
        due_date: format(due, 'yyyy-MM-dd'),
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

/** Pagamento da implementação coletado no wizard de fechamento. */
export type ClosePaymentInput = {
  total: number
  mode: 'avista' | 'parcelado'
  count: number // nº de parcelas (>= 2 quando parcelado)
  firstDate: string // 'yyyy-MM-dd'
  method: string | null
}

/** Manutenção coletada no wizard (nenhuma / mensal / hora avulsa). */
export type CloseMaintenanceInput =
  | { kind: 'none' }
  | { kind: 'mensal'; monthlyValue: number; minMonths: number; billingDay: number; startDate: string }
  | { kind: 'avulso'; hourlyRate: number; startDate: string }

/** Gera as parcelas (igual ao payment-editor): divide o total em N, sobra na última. */
function buildInstallments(p: ClosePaymentInput): PaymentInstallment[] {
  if (p.mode === 'avista') {
    return [{ amount: p.total, dueDate: p.firstDate, method: p.method }]
  }
  const count = Math.max(2, p.count)
  const cents = Math.round(p.total * 100)
  const base = Math.floor(cents / count)
  const remainder = cents - base * count
  return Array.from({ length: count }, (_, i) => {
    const amountCents = base + (i === count - 1 ? remainder : 0)
    const date = format(addMonths(parseISO(p.firstDate), i), 'yyyy-MM-dd')
    return { amount: amountCents / 100, dueDate: date, method: p.method }
  })
}

/**
 * Fecha o negócio a partir do WIZARD completo: marca `fechado`, popula o pagamento
 * (reusa setProjectPayment — NÃO cria a charge setup automática genérica), sincroniza
 * `total_value` com a soma das parcelas (valor do topo) e, se houver, cria o contrato
 * de manutenção (reusa setMaintenanceContract | setAvulsoContract). O escopo já é o
 * mesmo `projects.scope_items` — nada a sincronizar ali.
 */
export async function closeDealWithSetup(
  dealId: string,
  payment: ClosePaymentInput,
  maintenance: CloseMaintenanceInput,
  date?: string,
): Promise<ActionState> {
  const supabase = await createClient()
  const deal = await fetchDeal(supabase, dealId)
  if (!deal) return { success: false, message: 'Negócio não encontrado.' }

  const project = deal.projects[0] ?? null
  if (!project) return { success: false, message: 'Crie o projeto antes de fechar.' }

  const check = validateStageTransition(deal.stage, 'fechado', true)
  if (!check.valid) return { success: false, message: check.error ?? 'Transição inválida.' }

  if (!(payment.total > 0)) return { success: false, message: 'Informe o valor da implementação.' }
  if (!payment.firstDate) return { success: false, message: 'Informe o vencimento do pagamento.' }

  const hasMaintenance = maintenance.kind !== 'none'

  // 1. Marca o negócio como fechado (na data escolhida ou hoje).
  const closedAt = eventInstant(date)
  const { error } = await supabase
    .from('deals')
    .update({ stage: 'fechado', has_maintenance: hasMaintenance, closed_at: closedAt })
    .eq('id', dealId)
  if (error) return { success: false, message: `Erro ao fechar: ${error.message}` }
  await recordEvent(supabase, dealId, 'fechado', closedAt)

  // 2. Popula o pagamento (reusa a action existente; ela revalida o Financeiro).
  const installments = buildInstallments(payment)
  const payRes = await setProjectPayment(project.id, dealId, deal.company_id, installments)
  if (!payRes.success) return payRes

  // 3. Sincroniza o valor do topo com a soma das parcelas.
  const total = installments.reduce((s, it) => s + it.amount, 0)
  await supabase.from('projects').update({ total_value: total }).eq('id', project.id)

  // 4. Manutenção opcional (reusa as actions existentes).
  if (maintenance.kind === 'mensal') {
    const mRes = await setMaintenanceContract(project.id, dealId, deal.company_id, project.name, null, {
      monthlyValue: maintenance.monthlyValue,
      minMonths: maintenance.minMonths,
      billingDay: maintenance.billingDay,
      startDate: maintenance.startDate,
    })
    if (!mRes.success) return mRes
  } else if (maintenance.kind === 'avulso') {
    const mRes = await setAvulsoContract(project.id, dealId, deal.company_id, project.name, null, {
      hourlyRate: maintenance.hourlyRate,
      startDate: maintenance.startDate,
    })
    if (!mRes.success) return mRes
  }

  revalidateBoards()
  revalidatePath(`/projetos/${dealId}`)
  return { success: true, message: `Negócio fechado${hasMaintenance ? ' com manutenção' : ''}.` }
}

/** Marca como perdido (exige motivo). `date` data o desfecho. */
export async function loseDeal(dealId: string, reason: string, date?: string): Promise<ActionState> {
  if (!reason.trim()) return { success: false, message: 'Informe o motivo da perda.' }

  const supabase = await createClient()
  const closedAt = eventInstant(date)
  const { error } = await supabase
    .from('deals')
    .update({ stage: 'perdido', lost_reason: reason.trim(), closed_at: closedAt })
    .eq('id', dealId)
  if (error) return { success: false, message: `Erro: ${error.message}` }

  await recordEvent(supabase, dealId, 'perdido', closedAt)
  revalidateBoards()
  return { success: true, message: 'Negócio marcado como Perdido.' }
}

/** Marca para reativar futuramente. `date` data o desfecho. */
export async function reactivateDeal(dealId: string, date?: string): Promise<ActionState> {
  const supabase = await createClient()
  const closedAt = eventInstant(date)
  const { error } = await supabase
    .from('deals')
    .update({ stage: 'reativar_futuramente', closed_at: closedAt })
    .eq('id', dealId)
  if (error) return { success: false, message: `Erro: ${error.message}` }

  await recordEvent(supabase, dealId, 'reativar_futuramente', closedAt)
  revalidateBoards()
  return { success: true, message: 'Negócio marcado como Reativar.' }
}

/** Desqualifica (só a partir de Prospect ou Lead). `date` data o desfecho. */
export async function disqualifyDeal(dealId: string, date?: string): Promise<ActionState> {
  const supabase = await createClient()
  const deal = await fetchDeal(supabase, dealId)
  if (!deal) return { success: false, message: 'Negócio não encontrado.' }

  if (!canDisqualify(deal.stage)) {
    return { success: false, message: 'Só é possível desqualificar em Prospect ou Lead.' }
  }

  const closedAt = eventInstant(date)
  const { error } = await supabase
    .from('deals')
    .update({ stage: 'desqualificado', closed_at: closedAt })
    .eq('id', dealId)
  if (error) return { success: false, message: `Erro: ${error.message}` }

  await recordEvent(supabase, dealId, 'desqualificado', closedAt)
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
  // Data de criação opcional (retroativa): registra a oportunidade no passado.
  const createdYmd = str(formData.get('created_at'))
  const createdAt = createdYmd ? eventInstant(createdYmd) : undefined

  if (!companyId) return { success: false, message: 'Selecione o contato.' }
  if (!projectName) return { success: false, message: 'Informe o nome do projeto.' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('deals')
    .insert({
      company_id: companyId,
      title: projectName,
      stage: 'oportunidade',
      estimated_value: estimatedValue,
      // Omitido (undefined) → DB usa default now(); preenchido em lançamento retroativo.
      created_at: createdAt,
    })
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

  await recordEvent(supabase, deal.id, 'oportunidade', createdAt)
  revalidateBoards()
  return { success: true, message: 'Oportunidade criada.' }
}

// =====================================================================
// Arquivamento (soft delete) do projeto = o deal. Some de Projetos e
// Implementação quando arquivado; reversível. Excluir é permanente.
// =====================================================================

function revalidateProjectBoards() {
  revalidateBoards()
  revalidatePath('/implementacao')
}

/** Arquiva um projeto (o deal). */
export async function archiveProject(dealId: string): Promise<ActionState> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('deals')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', dealId)
  if (error) return { success: false, message: `Erro ao arquivar: ${error.message}` }
  revalidateProjectBoards()
  return { success: true, message: 'Projeto arquivado.' }
}

/** Reativa (desarquiva) um projeto. */
export async function unarchiveProject(dealId: string): Promise<ActionState> {
  const supabase = await createClient()
  const { error } = await supabase.from('deals').update({ archived_at: null }).eq('id', dealId)
  if (error) return { success: false, message: `Erro ao reativar: ${error.message}` }
  revalidateProjectBoards()
  return { success: true, message: 'Projeto reativado.' }
}

/**
 * Exclui um projeto PERMANENTEMENTE: apaga tarefas, cobranças, contas a pagar e
 * contrato ligados ao(s) project(s), depois o(s) project(s) e o deal.
 * (As FKs de projects/contracts para essas tabelas são ON DELETE SET NULL — feitas
 * assim de propósito para não perder histórico em edições normais — então aqui,
 * que é exclusão definitiva, cada uma precisa ser apagada explicitamente. Senão
 * viram registros órfãos que continuam aparecendo no Financeiro.)
 */
export async function deleteProject(dealId: string): Promise<ActionState> {
  const supabase = await createClient()

  const { data: projects, error: projFetchErr } = await supabase
    .from('projects')
    .select('id')
    .eq('deal_id', dealId)
  if (projFetchErr) return { success: false, message: `Erro ao excluir: ${projFetchErr.message}` }
  const projectIds = (projects ?? []).map((p) => p.id)

  if (projectIds.length > 0) {
    const { data: contracts, error: contractFetchErr } = await supabase
      .from('contracts')
      .select('id')
      .in('project_id', projectIds)
    if (contractFetchErr) return { success: false, message: `Erro ao excluir: ${contractFetchErr.message}` }
    const contractIds = (contracts ?? []).map((c) => c.id)
    const orFilter =
      contractIds.length > 0
        ? `project_id.in.(${projectIds.join(',')}),contract_id.in.(${contractIds.join(',')})`
        : `project_id.in.(${projectIds.join(',')})`

    const { error: taskErr } = await supabase.from('tasks').delete().or(orFilter)
    if (taskErr) return { success: false, message: `Erro ao excluir tarefas: ${taskErr.message}` }

    const { error: chargeErr } = await supabase.from('charges').delete().or(orFilter)
    if (chargeErr) return { success: false, message: `Erro ao excluir cobranças: ${chargeErr.message}` }

    const { error: payableErr } = await supabase
      .from('accounts_payable')
      .delete()
      .in('project_id', projectIds)
    if (payableErr) return { success: false, message: `Erro ao excluir contas a pagar: ${payableErr.message}` }

    const { error: contractErr } = await supabase.from('contracts').delete().in('project_id', projectIds)
    if (contractErr) return { success: false, message: `Erro ao excluir contrato: ${contractErr.message}` }
  }

  const { error: pErr } = await supabase.from('projects').delete().eq('deal_id', dealId)
  if (pErr) return { success: false, message: `Erro ao excluir projeto: ${pErr.message}` }
  const { error } = await supabase.from('deals').delete().eq('id', dealId)
  if (error) return { success: false, message: `Erro ao excluir: ${error.message}` }
  revalidateProjectBoards()
  revalidatePath('/financeiro')
  return { success: true, message: 'Projeto excluído permanentemente.' }
}
