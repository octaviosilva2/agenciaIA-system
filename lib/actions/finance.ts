'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getOrgSettings } from '@/lib/queries/config'
import { paymentInstantFromYmd, spYmdFromISO } from '@/lib/date-range'
import { chargeSchema, accountPayableSchema } from '@/lib/validations/finance'
import type { ActionState } from '@/lib/actions/action-state'
import type { Charge, AccountPayable } from '@/lib/queries/finance'
import type { Database } from '@/lib/supabase/types'

type Enums = Database['public']['Enums']

/** Campos persistíveis de uma nova cobrança (sem id nem campos só de exibição). */
export type NewChargeInput = Omit<Charge, 'id' | 'origin_label' | 'origin_href'>
/** Campos persistíveis de uma nova conta a pagar (sem id). */
export type NewPayableInput = Omit<AccountPayable, 'id'>

/** Revalida as duas telas do Financeiro afetadas por qualquer mutação. */
function revalidateFinance() {
  revalidatePath('/financeiro')
  revalidatePath('/financeiro/contas')
}

/** Extrai a primeira mensagem de erro de um ZodError (campo → mensagem). */
function firstIssue(error: import('zod').ZodError): string {
  return error.issues[0]?.message ?? 'Dados inválidos.'
}

/** Normaliza uma relação que o PostgREST pode devolver como objeto ou array. */
function one<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null
  return Array.isArray(v) ? (v[0] ?? null) : v
}

// =====================================================================
// Baixa (marcar pago/recebido).
// =====================================================================

/**
 * Resolve o instante de pagamento a gravar em `paid_at`. `paidDate` ('yyyy-MM-dd',
 * opcional) permite lançar com data retroativa; sem ela, usa o agora (data do clique).
 */
function resolvePaidAt(paid: boolean, paidDate?: string | null): string | null {
  if (!paid) return null
  return paidDate ? paymentInstantFromYmd(paidDate) : new Date().toISOString()
}

/**
 * Marca uma cobrança como recebida (ou reverte). Ao receber, materializa como
 * conta a pagar — usando as taxas reais do /config (org_settings) — vinculadas por
 * source_charge_id, na categoria "Taxas" (`imposto`):
 * - **imposto** (`tax_rate`): sempre que houver alíquota;
 * - **taxa de maquininha** (`card_fee_rate`): só quando o método é cartão.
 * A descrição de ambos identifica a PARCELA + ORIGEM (projeto/contrato · empresa).
 * O vencimento dos derivados é a DATA DO PAGAMENTO (regime de caixa), não o
 * vencimento da cobrança original. Ao reverter, remove os dois. Idempotente.
 *
 * `paidDate` ('yyyy-MM-dd') permite lançar com data retroativa (default = hoje).
 * `extraPaths` revalida páginas do contexto chamador (ex.: a tela do projeto).
 */
export async function toggleChargePaid(
  chargeId: string,
  paid: boolean,
  extraPaths: string[] = [],
  paidDate?: string | null,
): Promise<ActionState> {
  const supabase = await createClient()

  // Origem (projeto/contrato/empresa) junto da cobrança — para a descrição.
  const { data: charge, error: cErr } = await supabase
    .from('charges')
    .select(
      `amount, description, due_date, method,
       project:projects ( name ),
       contract:contracts ( name ),
       company:companies ( name )`,
    )
    .eq('id', chargeId)
    .single()
  if (cErr || !charge) return { success: false, message: 'Cobrança não encontrada.' }

  const paidAt = resolvePaidAt(paid, paidDate)

  const { error } = await supabase
    .from('charges')
    .update({ status: paid ? 'pago' : 'pendente', paid_at: paidAt })
    .eq('id', chargeId)
  if (error) return { success: false, message: `Erro: ${error.message}` }

  // Rótulo: PARCELA (charge.description: "Parcela 2/3", "Pagamento do projeto", …)
  // + origem (contrato/projeto) + empresa, sem repetir partes vazias.
  const project = one(charge.project as { name: string } | { name: string }[] | null)
  const contract = one(charge.contract as { name: string } | { name: string }[] | null)
  const company = one(charge.company as { name: string } | { name: string }[] | null)
  const originName = contract?.name ?? project?.name ?? null
  const labelParts = [charge.description, originName, company?.name].filter(
    (p): p is string => !!p,
  )
  const origin = labelParts.join(' · ')

  // Vencimento dos derivados = dia do PAGAMENTO (não o vencimento da cobrança).
  const derivedDue = paidAt ? spYmdFromISO(paidAt) : charge.due_date

  // Limpa os derivados anteriores desta cobrança (idempotência): imposto/taxa
  // (categorias imposto E variavel, para também limpar dados legados). Não toca
  // em despesas avulsas (sem source_charge_id).
  await supabase
    .from('accounts_payable')
    .delete()
    .eq('source_charge_id', chargeId)
    .in('category', ['imposto', 'variavel'])

  const derived: Database['public']['Tables']['accounts_payable']['Insert'][] = []
  if (paid) {
    const { tax_rate, card_fee_rate } = await getOrgSettings()
    if (tax_rate > 0) {
      derived.push({
        description: `Imposto (${tax_rate}%) — ${origin}`,
        category: 'imposto',
        amount: Number(charge.amount) * (tax_rate / 100),
        due_date: derivedDue,
        status: 'pendente',
        source_charge_id: chargeId,
      })
    }
    if (charge.method === 'cartao' && card_fee_rate > 0) {
      derived.push({
        description: `Taxa maquininha (${card_fee_rate}%) — ${origin}`,
        category: 'imposto',
        amount: Number(charge.amount) * (card_fee_rate / 100),
        due_date: derivedDue,
        status: 'pendente',
        source_charge_id: chargeId,
      })
    }
  }

  if (derived.length > 0) {
    const { error: derErr } = await supabase.from('accounts_payable').insert(derived)
    if (derErr) return { success: false, message: `Erro ao lançar imposto/taxa: ${derErr.message}` }
  }

  revalidateFinance()
  for (const path of extraPaths) revalidatePath(path)
  return {
    success: true,
    message: paid
      ? derived.length > 0
        ? 'Recebido — taxas lançadas automaticamente.'
        : 'Marcado como recebido.'
      : 'Marcado como pendente.',
  }
}

/**
 * Marca uma conta a pagar como paga (ou reverte). `paidDate` ('yyyy-MM-dd')
 * permite lançar com data retroativa (default = hoje).
 */
export async function togglePayablePaid(
  payableId: string,
  paid: boolean,
  paidDate?: string | null,
): Promise<ActionState> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('accounts_payable')
    .update({ status: paid ? 'pago' : 'pendente', paid_at: resolvePaidAt(paid, paidDate) })
    .eq('id', payableId)
  if (error) return { success: false, message: `Erro: ${error.message}` }

  revalidateFinance()
  return { success: true, message: paid ? 'Pago.' : 'Marcado como pendente.' }
}

// =====================================================================
// Criação (em lote — a UI gera parcelas/recorrências client-side).
// =====================================================================

/**
 * Cria uma ou mais cobranças (a receber). A UI já calcula as parcelas; aqui só
 * persistimos. Avulsos NÃO são idempotentes (sempre inserem) — só recorrências
 * por (contract_id, due_date) têm índice único, e estas vêm do fluxo comercial.
 */
export async function createCharges(charges: NewChargeInput[]): Promise<ActionState> {
  if (charges.length === 0) return { success: false, message: 'Nada a lançar.' }
  const supabase = await createClient()

  const rows = []
  for (const c of charges) {
    const parsed = chargeSchema.safeParse({
      company_id: c.company_id,
      project_id: c.project_id,
      contract_id: c.contract_id,
      description: c.description,
      kind: c.kind,
      amount: c.amount,
      due_date: c.due_date,
      status: c.status,
      method: c.method,
      paid_at: c.paid_at,
      notes: c.notes,
    })
    if (!parsed.success) return { success: false, message: firstIssue(parsed.error) }
    rows.push(parsed.data)
  }

  const { error } = await supabase.from('charges').insert(rows)
  if (error) return { success: false, message: `Erro ao lançar cobrança: ${error.message}` }

  revalidateFinance()
  return {
    success: true,
    message: rows.length > 1 ? `${rows.length} cobranças criadas.` : 'Conta a receber criada.',
  }
}

/** Cria uma ou mais contas a pagar. */
export async function createPayables(payables: NewPayableInput[]): Promise<ActionState> {
  if (payables.length === 0) return { success: false, message: 'Nada a lançar.' }
  const supabase = await createClient()

  const rows = []
  for (const p of payables) {
    const parsed = accountPayableSchema.safeParse({
      description: p.description,
      category: p.category,
      amount: p.amount,
      due_date: p.due_date,
      status: p.status,
      paid_at: p.paid_at,
      project_id: p.project_id,
      supplier: p.supplier,
      notes: p.notes,
    })
    if (!parsed.success) return { success: false, message: firstIssue(parsed.error) }
    rows.push(parsed.data)
  }

  const { error } = await supabase.from('accounts_payable').insert(rows)
  if (error) return { success: false, message: `Erro ao lançar conta: ${error.message}` }

  revalidateFinance()
  return {
    success: true,
    message: rows.length > 1 ? `${rows.length} contas criadas.` : 'Conta a pagar criada.',
  }
}

// =====================================================================
// Edição.
// =====================================================================

/** Atualiza os campos editáveis de uma cobrança (a receber). */
export async function updateCharge(
  id: string,
  data: { description: string; amount: number; due_date: string; method: Enums['charge_method'] | null },
): Promise<ActionState> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('charges')
    .update({
      description: data.description,
      amount: data.amount,
      due_date: data.due_date,
      method: data.method,
    })
    .eq('id', id)
  if (error) return { success: false, message: `Erro: ${error.message}` }

  revalidateFinance()
  return { success: true, message: 'Conta atualizada.' }
}

/** Atualiza os campos editáveis de uma conta a pagar. */
export async function updatePayable(
  id: string,
  data: {
    description: string
    amount: number
    due_date: string
    category: Enums['payable_category']
    supplier: string | null
  },
): Promise<ActionState> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('accounts_payable')
    .update({
      description: data.description,
      amount: data.amount,
      due_date: data.due_date,
      category: data.category,
      supplier: data.supplier,
    })
    .eq('id', id)
  if (error) return { success: false, message: `Erro: ${error.message}` }

  revalidateFinance()
  return { success: true, message: 'Conta atualizada.' }
}

// =====================================================================
// Exclusão (decisão §4.2: DELETE para avulso/manual, cancelar o resto).
// =====================================================================

/**
 * Remove uma cobrança. Avulsos são apagados (DELETE); cobranças com origem
 * (setup/recorrência) são canceladas (status=cancelado) para preservar histórico.
 * O imposto vinculado some junto (cascade no DELETE; removido à mão no cancelamento).
 */
export async function deleteCharge(id: string): Promise<ActionState> {
  const supabase = await createClient()
  const { data: charge, error: cErr } = await supabase
    .from('charges')
    .select('kind')
    .eq('id', id)
    .single()
  if (cErr || !charge) return { success: false, message: 'Cobrança não encontrada.' }

  if (charge.kind === 'avulso') {
    const { error } = await supabase.from('charges').delete().eq('id', id)
    if (error) return { success: false, message: `Erro: ${error.message}` }
  } else {
    const { error } = await supabase
      .from('charges')
      .update({ status: 'cancelado', paid_at: null })
      .eq('id', id)
    if (error) return { success: false, message: `Erro: ${error.message}` }
    // Cobrança cancelada não gera imposto — remove o derivado, se houver.
    await supabase.from('accounts_payable').delete().eq('source_charge_id', id)
  }

  revalidateFinance()
  return { success: true, message: 'Conta removida.' }
}

/** Remove uma conta a pagar (sempre manual → DELETE). */
export async function deletePayable(id: string): Promise<ActionState> {
  const supabase = await createClient()
  const { error } = await supabase.from('accounts_payable').delete().eq('id', id)
  if (error) return { success: false, message: `Erro: ${error.message}` }

  revalidateFinance()
  return { success: true, message: 'Conta removida.' }
}
