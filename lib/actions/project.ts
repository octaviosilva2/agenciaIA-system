'use server'

import { revalidatePath } from 'next/cache'
import { parseISO } from 'date-fns'
import { createClient } from '@/lib/supabase/server'
import { generateRecurrences } from '@/lib/rules/recurrence'
import type { ActionState } from '@/lib/actions/action-state'
import type { ScopeItem } from '@/lib/queries/opportunity-detail'
import type { Database } from '@/lib/supabase/types'

type ProjectStatus = Database['public']['Enums']['project_status']

/** Revalida a tela do projeto (comercial) e os recortes de Implementação. */
function revalidateProject(dealId: string, projectId: string) {
  revalidatePath(`/projetos/${dealId}`)
  revalidatePath('/implementacao')
  revalidatePath(`/implementacao/${projectId}`)
}

/** Atualiza o checklist de escopo (contratado × entregue) de um projeto. */
export async function updateScopeItems(
  projectId: string,
  dealId: string,
  items: ScopeItem[],
): Promise<ActionState> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('projects')
    .update({ scope_items: items })
    .eq('id', projectId)
  if (error) return { success: false, message: `Erro ao salvar escopo: ${error.message}` }

  revalidatePath(`/projetos/${dealId}`)
  return { success: true, message: 'Escopo atualizado.' }
}

/** Atualiza dados da proposta (valor do projeto, link de arquivo, notas). */
export async function updateProposal(
  projectId: string,
  dealId: string,
  data: { totalValue: number | null; driveUrl: string | null; notes: string | null },
): Promise<ActionState> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('projects')
    .update({
      total_value: data.totalValue,
      drive_url: data.driveUrl,
      notes: data.notes,
    })
    .eq('id', projectId)
  if (error) return { success: false, message: `Erro ao salvar proposta: ${error.message}` }

  revalidatePath(`/projetos/${dealId}`)
  return { success: true, message: 'Proposta atualizada.' }
}

/** Uma parcela do pagamento do projeto. */
export type PaymentInstallment = {
  amount: number
  dueDate: string // 'yyyy-MM-dd'
  method: string | null
}

/**
 * Define o plano de pagamento do projeto (à vista ou parcelado).
 * Substitui as parcelas PENDENTES de fechamento (setup/avulso); preserva as já pagas.
 * Cada parcela vira uma cobrança que aparece no Financeiro.
 */
export async function setProjectPayment(
  projectId: string,
  dealId: string,
  companyId: string,
  installments: PaymentInstallment[],
): Promise<ActionState> {
  if (installments.length === 0) {
    return { success: false, message: 'Adicione ao menos uma parcela.' }
  }
  if (installments.some((it) => !it.dueDate)) {
    return { success: false, message: 'Toda parcela precisa de uma data de vencimento.' }
  }

  const supabase = await createClient()

  // Remove as parcelas de fechamento ainda pendentes (não mexe nas pagas/canceladas).
  const { error: delErr } = await supabase
    .from('charges')
    .delete()
    .eq('project_id', projectId)
    .in('kind', ['setup', 'avulso'])
    .eq('status', 'pendente')
  if (delErr) return { success: false, message: `Erro ao atualizar pagamento: ${delErr.message}` }

  const total = installments.length
  const rows = installments.map((it, idx) => ({
    company_id: companyId,
    project_id: projectId,
    description: total === 1 ? 'Pagamento do projeto' : `Parcela ${idx + 1}/${total}`,
    kind: 'setup' as const,
    amount: it.amount,
    due_date: it.dueDate,
    method: it.method,
    status: 'pendente' as const,
  }))
  const { error: insErr } = await supabase.from('charges').insert(rows)
  if (insErr) return { success: false, message: `Erro ao salvar parcelas: ${insErr.message}` }

  revalidatePath(`/projetos/${dealId}`)
  return { success: true, message: 'Pagamento atualizado.' }
}

/** Dados para criar/reconfigurar o contrato de manutenção mensal. */
export type MaintenanceContractInput = {
  monthlyValue: number
  minMonths: number
  billingDay: number // 1..28
  startDate: string // 'yyyy-MM-dd'
}

/**
 * Cria (ou reconfigura) o contrato de manutenção mensal do projeto e gera as
 * parcelas recorrentes (charges kind 'recorrencia'). Espelha o fluxo de pagamento:
 * substitui as recorrências PENDENTES e preserva as já pagas. A geração é idempotente
 * por (contract_id, due_date) — o upsert ignora parcelas já existentes (ex.: pagas).
 */
export async function setMaintenanceContract(
  projectId: string,
  dealId: string,
  companyId: string,
  projectName: string,
  contractId: string | null, // presente → reconfigura o contrato existente
  data: MaintenanceContractInput,
): Promise<ActionState> {
  if (!(data.monthlyValue > 0)) return { success: false, message: 'Informe o valor mensal.' }
  if (!Number.isInteger(data.minMonths) || data.minMonths < 1) {
    return { success: false, message: 'A duração mínima deve ser de ao menos 1 mês.' }
  }
  if (!Number.isInteger(data.billingDay) || data.billingDay < 1 || data.billingDay > 28) {
    return { success: false, message: 'O dia de cobrança deve estar entre 1 e 28.' }
  }
  if (!data.startDate) return { success: false, message: 'Informe a data de início.' }

  const supabase = await createClient()

  // 1. Cria ou atualiza o contrato (mensal).
  let id = contractId
  if (id) {
    const { error } = await supabase
      .from('contracts')
      .update({
        monthly_value: data.monthlyValue,
        min_months: data.minMonths,
        billing_day: data.billingDay,
        start_date: data.startDate,
        status: 'ativo',
      })
      .eq('id', id)
    if (error) return { success: false, message: `Erro ao salvar contrato: ${error.message}` }
  } else {
    const { data: created, error } = await supabase
      .from('contracts')
      .insert({
        company_id: companyId,
        project_id: projectId,
        name: `Manutenção ${projectName}`,
        kind: 'mensal',
        status: 'ativo',
        monthly_value: data.monthlyValue,
        min_months: data.minMonths,
        billing_day: data.billingDay,
        start_date: data.startDate,
      })
      .select('id')
      .single()
    if (error || !created) {
      return { success: false, message: `Erro ao criar contrato: ${error?.message ?? ''}` }
    }
    id = (created as { id: string }).id
  }

  // 2. Limpa as recorrências ainda pendentes (não mexe nas pagas/canceladas).
  const { error: delErr } = await supabase
    .from('charges')
    .delete()
    .eq('contract_id', id)
    .eq('kind', 'recorrencia')
    .eq('status', 'pendente')
  if (delErr) return { success: false, message: `Erro ao atualizar parcelas: ${delErr.message}` }

  // 3. Gera as parcelas pela regra pura e completa os campos do charge.
  const generated = generateRecurrences({
    contractId: id,
    startDate: parseISO(data.startDate),
    minMonths: data.minMonths,
    billingDay: data.billingDay,
    monthlyValue: data.monthlyValue,
  })
  const rows = generated.map((g) => ({
    company_id: companyId,
    project_id: projectId,
    contract_id: g.contract_id,
    description: g.description,
    kind: g.kind,
    amount: g.amount,
    due_date: g.due_date,
    status: 'pendente' as const,
  }))
  // ignoreDuplicates: não sobrescreve parcelas preservadas (idempotência por contract_id+due_date).
  const { error: insErr } = await supabase
    .from('charges')
    .upsert(rows, { onConflict: 'contract_id,due_date', ignoreDuplicates: true })
  if (insErr) return { success: false, message: `Erro ao gerar parcelas: ${insErr.message}` }

  revalidatePath(`/projetos/${dealId}`)
  return { success: true, message: 'Contrato de manutenção salvo.' }
}

/** Atualiza o prazo de entrega (due_date) do projeto. */
export async function updateProjectDueDate(
  projectId: string,
  dealId: string,
  dueDate: string | null,
): Promise<ActionState> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('projects')
    .update({ due_date: dueDate })
    .eq('id', projectId)
  if (error) return { success: false, message: `Erro ao salvar prazo: ${error.message}` }

  revalidateProject(dealId, projectId)
  return { success: true, message: 'Prazo de entrega atualizado.' }
}

/**
 * Atualiza o macro-status da implementação do projeto e grava o evento de fase.
 * Usado para marcar como entregue (concluído) ou reabrir.
 */
export async function updateProjectStatus(
  projectId: string,
  dealId: string,
  status: ProjectStatus,
): Promise<ActionState> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('projects')
    .update({ status })
    .eq('id', projectId)
  if (error) return { success: false, message: `Erro ao atualizar status: ${error.message}` }

  // Histórico de fases (automação do modelo de dados).
  await supabase.from('project_stage_events').insert({ project_id: projectId, status })

  revalidateProject(dealId, projectId)
  return {
    success: true,
    message: status === 'entregue' ? 'Projeto marcado como entregue.' : 'Status atualizado.',
  }
}
