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

/** Atualiza o escopo de um projeto (persistido em projects.scope_items JSONB). */
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

  revalidateProject(dealId, projectId)
  return { success: true, message: 'Escopo atualizado.' }
}

/**
 * Renomeia o projeto a partir da própria tela (kebab "Editar" do header).
 * Quando há projeto vinculado, grava em `projects.name`; senão, no `deals.title`
 * (a tela exibe `projects.name ?? deals.title`).
 */
export async function renameProject(
  dealId: string,
  projectId: string | null,
  name: string,
): Promise<ActionState> {
  const trimmed = name.trim()
  if (!trimmed) return { success: false, message: 'Informe o nome do projeto.' }

  const supabase = await createClient()
  const { error } = projectId
    ? await supabase.from('projects').update({ name: trimmed }).eq('id', projectId)
    : await supabase.from('deals').update({ title: trimmed }).eq('id', dealId)
  if (error) return { success: false, message: `Erro ao renomear: ${error.message}` }

  revalidatePath(`/projetos/${dealId}`)
  revalidatePath('/projetos')
  return { success: true, message: 'Projeto renomeado.' }
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
 *
 * A taxa de maquininha NÃO é lançada aqui: ela só vira despesa ao CONFIRMAR o
 * recebimento de uma cobrança no cartão (toggleChargePaid, taxa global do /config). (B5)
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
  if (insErr) {
    return { success: false, message: `Erro ao salvar parcelas: ${insErr.message}` }
  }

  revalidatePath(`/projetos/${dealId}`)
  revalidatePath('/financeiro')
  revalidatePath('/financeiro/contas')
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

/** Dados para criar/reconfigurar o contrato de manutenção por hora avulsa. */
export type AvulsoContractInput = {
  hourlyRate: number
  startDate: string // 'yyyy-MM-dd'
}

/**
 * Cria (ou reconfigura) o contrato de manutenção por HORA AVULSA do projeto.
 * Diferente do mensal: não tem valor mensal nem recorrências — só o preço/hora.
 * Os serviços são lançados depois via `addAvulsoCharge` (gera charges 'avulso').
 */
export async function setAvulsoContract(
  projectId: string,
  dealId: string,
  companyId: string,
  projectName: string,
  contractId: string | null, // presente → reconfigura o contrato existente
  data: AvulsoContractInput,
): Promise<ActionState> {
  if (!(data.hourlyRate > 0)) return { success: false, message: 'Informe o preço por hora.' }
  if (!data.startDate) return { success: false, message: 'Informe a data de início.' }

  const supabase = await createClient()

  if (contractId) {
    const { error } = await supabase
      .from('contracts')
      .update({ hourly_rate: data.hourlyRate, start_date: data.startDate, kind: 'avulso', status: 'ativo' })
      .eq('id', contractId)
    if (error) return { success: false, message: `Erro ao salvar contrato: ${error.message}` }
  } else {
    const { error } = await supabase.from('contracts').insert({
      company_id: companyId,
      project_id: projectId,
      name: `Manutenção ${projectName}`,
      kind: 'avulso',
      status: 'ativo',
      hourly_rate: data.hourlyRate,
      start_date: data.startDate,
    })
    if (error) return { success: false, message: `Erro ao criar contrato: ${error.message}` }
  }

  revalidatePath(`/projetos/${dealId}`)
  revalidatePath('/manutencao')
  return { success: true, message: 'Manutenção por hora avulsa salva.' }
}

/** Lançamento de um serviço no contrato avulso (descrição + horas → cobrança). */
export type AvulsoChargeInput = {
  description: string
  hours: number | null
  amount: number | null // se informado, sobrepõe horas × preço/hora
  dueDate: string // 'yyyy-MM-dd'
  method: string | null
}

/**
 * Lança um serviço avulso: calcula `amount = hours × hourly_rate` (ou usa `amount`
 * direto) e cria uma cobrança `kind='avulso'` vinculada ao contrato. Aparece no
 * Financeiro e na lista de cobranças do contrato.
 */
export async function addAvulsoCharge(
  contractId: string,
  data: AvulsoChargeInput,
): Promise<ActionState> {
  if (!data.description.trim()) return { success: false, message: 'Descreva o serviço.' }
  if (!data.dueDate) return { success: false, message: 'Informe o vencimento.' }

  const supabase = await createClient()

  // Contexto do contrato: preço/hora + company/project para a cobrança e revalidação.
  const { data: ctr, error: cErr } = await supabase
    .from('contracts')
    .select('company_id, project_id, hourly_rate, project:projects ( deal_id )')
    .eq('id', contractId)
    .single()
  if (cErr || !ctr) return { success: false, message: `Contrato não encontrado: ${cErr?.message ?? ''}` }

  const ctx = ctr as unknown as {
    company_id: string
    project_id: string | null
    hourly_rate: number | null
    project: { deal_id: string | null } | { deal_id: string | null }[] | null
  }

  // Valor: explícito, ou horas × preço/hora.
  const computed =
    data.hours != null && ctx.hourly_rate != null ? data.hours * ctx.hourly_rate : null
  const amount = data.amount ?? computed
  if (amount == null || !(amount > 0)) {
    return { success: false, message: 'Informe as horas (com preço/hora) ou um valor.' }
  }

  const { error } = await supabase.from('charges').insert({
    company_id: ctx.company_id,
    project_id: ctx.project_id,
    contract_id: contractId,
    description: data.description.trim(),
    kind: 'avulso',
    amount,
    hours: data.hours,
    due_date: data.dueDate,
    method: data.method as Database['public']['Enums']['charge_method'] | null,
    status: 'pendente',
  })
  if (error) return { success: false, message: `Erro ao lançar serviço: ${error.message}` }

  revalidatePath(`/manutencao/${contractId}`)
  revalidatePath('/manutencao')
  const proj = ctx.project
  const dealId = Array.isArray(proj) ? proj[0]?.deal_id : proj?.deal_id
  if (dealId) revalidatePath(`/projetos/${dealId}`)
  return { success: true, message: 'Serviço lançado.' }
}

/** Cria um contrato de manutenção a partir de um projeto (tela /manutencao). */
export type CreateMaintenanceInput =
  | { kind: 'mensal'; monthlyValue: number; minMonths: number; billingDay: number; startDate: string }
  | { kind: 'avulso'; hourlyRate: number; startDate: string }

/**
 * Cria o contrato de manutenção (mensal ou hora avulsa) para um projeto fechado.
 * Retorna o `contractId` para a UI redirecionar à tela de gestão do contrato.
 */
export async function createMaintenanceForProject(
  projectId: string,
  input: CreateMaintenanceInput,
): Promise<ActionState & { contractId?: string }> {
  const supabase = await createClient()

  const { data: proj, error: pErr } = await supabase
    .from('projects')
    .select('id, name, company_id, deal_id')
    .eq('id', projectId)
    .single()
  if (pErr || !proj) return { success: false, message: 'Projeto não encontrado.' }
  const p = proj as { id: string; name: string; company_id: string; deal_id: string | null }

  function revalidate() {
    revalidatePath('/manutencao')
    if (p.deal_id) revalidatePath(`/projetos/${p.deal_id}`)
  }

  if (input.kind === 'avulso') {
    if (!(input.hourlyRate > 0)) return { success: false, message: 'Informe o preço por hora.' }
    const { data: created, error } = await supabase
      .from('contracts')
      .insert({
        company_id: p.company_id,
        project_id: p.id,
        name: `Manutenção ${p.name}`,
        kind: 'avulso',
        status: 'ativo',
        hourly_rate: input.hourlyRate,
        start_date: input.startDate,
      })
      .select('id')
      .single()
    if (error || !created) {
      return { success: false, message: `Erro ao criar contrato: ${error?.message ?? ''}` }
    }
    revalidate()
    return { success: true, message: 'Manutenção criada.', contractId: (created as { id: string }).id }
  }

  // Mensal: cria o contrato e gera as parcelas recorrentes.
  if (!(input.monthlyValue > 0)) return { success: false, message: 'Informe o valor mensal.' }
  const { data: created, error } = await supabase
    .from('contracts')
    .insert({
      company_id: p.company_id,
      project_id: p.id,
      name: `Manutenção ${p.name}`,
      kind: 'mensal',
      status: 'ativo',
      monthly_value: input.monthlyValue,
      min_months: input.minMonths,
      billing_day: input.billingDay,
      start_date: input.startDate,
    })
    .select('id')
    .single()
  if (error || !created) {
    return { success: false, message: `Erro ao criar contrato: ${error?.message ?? ''}` }
  }
  const contractId = (created as { id: string }).id

  const generated = generateRecurrences({
    contractId,
    startDate: parseISO(input.startDate),
    minMonths: input.minMonths,
    billingDay: input.billingDay,
    monthlyValue: input.monthlyValue,
  })
  const rows = generated.map((g) => ({
    company_id: p.company_id,
    project_id: p.id,
    contract_id: g.contract_id,
    description: g.description,
    kind: g.kind,
    amount: g.amount,
    due_date: g.due_date,
    status: 'pendente' as const,
  }))
  const { error: insErr } = await supabase
    .from('charges')
    .upsert(rows, { onConflict: 'contract_id,due_date', ignoreDuplicates: true })
  if (insErr) return { success: false, message: `Erro ao gerar parcelas: ${insErr.message}` }

  revalidate()
  return { success: true, message: 'Manutenção criada.', contractId }
}

type ContractContext = {
  company_id: string
  project_id: string | null
  kind: 'mensal' | 'avulso'
  project: { deal_id: string | null } | { deal_id: string | null }[] | null
}

/** Lê o contexto do contrato e devolve o dealId (para revalidar a tela do projeto). */
async function loadContractContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  contractId: string,
): Promise<{ ctx: ContractContext; dealId: string | null } | null> {
  const { data, error } = await supabase
    .from('contracts')
    .select('company_id, project_id, kind, project:projects ( deal_id )')
    .eq('id', contractId)
    .single()
  if (error || !data) return null
  const ctx = data as unknown as ContractContext
  const proj = ctx.project
  const dealId = Array.isArray(proj) ? (proj[0]?.deal_id ?? null) : (proj?.deal_id ?? null)
  return { ctx, dealId }
}

/**
 * Converte o tipo de um contrato existente (Mensal ↔ Hora avulsa).
 * Cancela as parcelas mensais PENDENTES (preserva as pagas); nunca apaga lançamentos
 * avulsos reais. Ao virar mensal, gera as novas recorrências.
 */
export async function convertContractKind(
  contractId: string,
  input: CreateMaintenanceInput,
): Promise<ActionState> {
  const supabase = await createClient()
  const loaded = await loadContractContext(supabase, contractId)
  if (!loaded) return { success: false, message: 'Contrato não encontrado.' }
  const { ctx, dealId } = loaded

  // Cancela as mensalidades pendentes do tipo antigo (não cobra o que não existe mais).
  const { error: cancErr } = await supabase
    .from('charges')
    .update({ status: 'cancelado' })
    .eq('contract_id', contractId)
    .eq('kind', 'recorrencia')
    .eq('status', 'pendente')
  if (cancErr) return { success: false, message: `Erro ao cancelar parcelas: ${cancErr.message}` }

  function revalidate() {
    revalidatePath('/manutencao')
    revalidatePath(`/manutencao/${contractId}`)
    if (dealId) revalidatePath(`/projetos/${dealId}`)
  }

  if (input.kind === 'avulso') {
    if (!(input.hourlyRate > 0)) return { success: false, message: 'Informe o preço por hora.' }
    const { error } = await supabase
      .from('contracts')
      .update({
        kind: 'avulso',
        hourly_rate: input.hourlyRate,
        monthly_value: null,
        min_months: null,
        billing_day: null,
        start_date: input.startDate,
        status: 'ativo',
      })
      .eq('id', contractId)
    if (error) return { success: false, message: `Erro ao converter: ${error.message}` }
    revalidate()
    return { success: true, message: 'Convertido para hora avulsa.' }
  }

  // → Mensal: zera o preço/hora, define os campos mensais e gera as recorrências.
  if (!(input.monthlyValue > 0)) return { success: false, message: 'Informe o valor mensal.' }
  const { error } = await supabase
    .from('contracts')
    .update({
      kind: 'mensal',
      monthly_value: input.monthlyValue,
      min_months: input.minMonths,
      billing_day: input.billingDay,
      hourly_rate: null,
      start_date: input.startDate,
      status: 'ativo',
    })
    .eq('id', contractId)
  if (error) return { success: false, message: `Erro ao converter: ${error.message}` }

  const generated = generateRecurrences({
    contractId,
    startDate: parseISO(input.startDate),
    minMonths: input.minMonths,
    billingDay: input.billingDay,
    monthlyValue: input.monthlyValue,
  })
  const rows = generated.map((g) => ({
    company_id: ctx.company_id,
    project_id: ctx.project_id,
    contract_id: g.contract_id,
    description: g.description,
    kind: g.kind,
    amount: g.amount,
    due_date: g.due_date,
    status: 'pendente' as const,
  }))
  const { error: insErr } = await supabase
    .from('charges')
    .upsert(rows, { onConflict: 'contract_id,due_date', ignoreDuplicates: true })
  if (insErr) return { success: false, message: `Erro ao gerar parcelas: ${insErr.message}` }

  revalidate()
  return { success: true, message: 'Convertido para mensal.' }
}

/**
 * Renova um contrato mensal por mais um ciclo: gera as parcelas do novo período a
 * partir da nova data, SEM apagar as antigas (pagas e pendentes seguem no Financeiro).
 */
export async function renewMaintenanceContract(
  contractId: string,
  data: MaintenanceContractInput,
): Promise<ActionState> {
  if (!(data.monthlyValue > 0)) return { success: false, message: 'Informe o valor mensal.' }
  if (!Number.isInteger(data.minMonths) || data.minMonths < 1) {
    return { success: false, message: 'A duração deve ser de ao menos 1 mês.' }
  }
  if (!Number.isInteger(data.billingDay) || data.billingDay < 1 || data.billingDay > 28) {
    return { success: false, message: 'O dia de cobrança deve estar entre 1 e 28.' }
  }
  if (!data.startDate) return { success: false, message: 'Informe a data de início.' }

  const supabase = await createClient()
  const loaded = await loadContractContext(supabase, contractId)
  if (!loaded) return { success: false, message: 'Contrato não encontrado.' }
  const { ctx, dealId } = loaded
  if (ctx.kind !== 'mensal') {
    return { success: false, message: 'Apenas contratos mensais podem ser renovados.' }
  }

  const { error } = await supabase
    .from('contracts')
    .update({
      monthly_value: data.monthlyValue,
      min_months: data.minMonths,
      billing_day: data.billingDay,
      start_date: data.startDate,
      status: 'ativo',
    })
    .eq('id', contractId)
  if (error) return { success: false, message: `Erro ao renovar: ${error.message}` }

  // Gera o novo ciclo sem tocar nas parcelas já existentes (idempotência por due_date).
  const generated = generateRecurrences({
    contractId,
    startDate: parseISO(data.startDate),
    minMonths: data.minMonths,
    billingDay: data.billingDay,
    monthlyValue: data.monthlyValue,
  })
  const rows = generated.map((g) => ({
    company_id: ctx.company_id,
    project_id: ctx.project_id,
    contract_id: g.contract_id,
    description: g.description,
    kind: g.kind,
    amount: g.amount,
    due_date: g.due_date,
    status: 'pendente' as const,
  }))
  const { error: insErr } = await supabase
    .from('charges')
    .upsert(rows, { onConflict: 'contract_id,due_date', ignoreDuplicates: true })
  if (insErr) return { success: false, message: `Erro ao gerar parcelas: ${insErr.message}` }

  revalidatePath('/manutencao')
  revalidatePath(`/manutencao/${contractId}`)
  if (dealId) revalidatePath(`/projetos/${dealId}`)
  return { success: true, message: 'Contrato renovado.' }
}

/** Atualiza o progresso manual (0–100) definido pelo programador. */
export async function updateProjectProgress(
  projectId: string,
  dealId: string,
  progress: number,
): Promise<ActionState> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('projects')
    .update({ progress })
    .eq('id', projectId)
  if (error) return { success: false, message: `Erro: ${error.message}` }

  revalidateProject(dealId, projectId)
  return { success: true, message: 'Progresso atualizado.' }
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

/** Edição de preço/cobrança do contrato a partir da tela de Manutenção. */
export type MaintenanceContractFullInput = {
  monthlyValue: number
  minMonths: number
  billingDay: number // 1..28
  startDate: string // 'yyyy-MM-dd'
  nextContactDate: string | null
  contactFrequencyDays: number | null
  sla: string | null
  notes: string | null
}

/**
 * Atualiza todos os campos do contrato de manutenção (preço e detalhes de cobrança)
 * a partir da tela de Manutenção. Para contratos mensais, regenera as recorrências
 * PENDENTES (substitui pendentes, preserva pagas via idempotência contract_id+due_date),
 * mantendo o Financeiro consistente com o novo valor mensal.
 */
export async function updateMaintenanceContract(
  contractId: string,
  data: MaintenanceContractFullInput,
): Promise<ActionState> {
  if (!Number.isInteger(data.minMonths) || data.minMonths < 1) {
    return { success: false, message: 'A duração mínima deve ser de ao menos 1 mês.' }
  }
  if (!Number.isInteger(data.billingDay) || data.billingDay < 1 || data.billingDay > 28) {
    return { success: false, message: 'O dia de cobrança deve estar entre 1 e 28.' }
  }
  if (!data.startDate) return { success: false, message: 'Informe a data de início.' }

  const supabase = await createClient()

  // Contexto do contrato (para gerar charges e revalidar a tela do projeto).
  const { data: ctr, error: cErr } = await supabase
    .from('contracts')
    .select('company_id, project_id, kind, project:projects ( deal_id )')
    .eq('id', contractId)
    .single()
  if (cErr || !ctr) return { success: false, message: `Contrato não encontrado: ${cErr?.message ?? ''}` }

  const ctx = ctr as unknown as {
    company_id: string
    project_id: string | null
    kind: 'mensal' | 'avulso'
    project: { deal_id: string | null } | { deal_id: string | null }[] | null
  }

  // Valor mensal só é obrigatório para contrato mensal (avulso pode não ter).
  if (ctx.kind === 'mensal' && !(data.monthlyValue > 0)) {
    return { success: false, message: 'Informe o valor mensal.' }
  }

  const { error: uErr } = await supabase
    .from('contracts')
    .update({
      monthly_value: data.monthlyValue,
      min_months: data.minMonths,
      billing_day: data.billingDay,
      start_date: data.startDate,
      next_contact_date: data.nextContactDate,
      contact_frequency_days: data.contactFrequencyDays,
      sla: data.sla,
      notes: data.notes,
    })
    .eq('id', contractId)
  if (uErr) return { success: false, message: `Erro ao salvar contrato: ${uErr.message}` }

  // Regenera as recorrências pendentes do contrato mensal (preserva pagas).
  if (ctx.kind === 'mensal') {
    const { error: delErr } = await supabase
      .from('charges')
      .delete()
      .eq('contract_id', contractId)
      .eq('kind', 'recorrencia')
      .eq('status', 'pendente')
    if (delErr) return { success: false, message: `Erro ao atualizar parcelas: ${delErr.message}` }

    const generated = generateRecurrences({
      contractId,
      startDate: parseISO(data.startDate),
      minMonths: data.minMonths,
      billingDay: data.billingDay,
      monthlyValue: data.monthlyValue,
    })
    const rows = generated.map((g) => ({
      company_id: ctx.company_id,
      project_id: ctx.project_id,
      contract_id: g.contract_id,
      description: g.description,
      kind: g.kind,
      amount: g.amount,
      due_date: g.due_date,
      status: 'pendente' as const,
    }))
    const { error: insErr } = await supabase
      .from('charges')
      .upsert(rows, { onConflict: 'contract_id,due_date', ignoreDuplicates: true })
    if (insErr) return { success: false, message: `Erro ao gerar parcelas: ${insErr.message}` }
  }

  revalidatePath(`/manutencao/${contractId}`)
  revalidatePath('/manutencao')
  const proj = ctx.project
  const dealId = Array.isArray(proj) ? proj[0]?.deal_id : proj?.deal_id
  if (dealId) revalidatePath(`/projetos/${dealId}`)
  return { success: true, message: 'Cobrança atualizada.' }
}
