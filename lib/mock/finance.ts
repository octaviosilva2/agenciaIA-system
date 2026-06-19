/**
 * Dados MOCK da Fase 4 (Financeiro) — modo UI-first, sem backend.
 *
 * Espelha as tabelas `charges` (A Receber) e `accounts_payable` (A Pagar) de
 * docs/02-dados.md. Nada persiste: as views consomem isto como estado inicial e
 * "mutam" só em memória (estado local React + toast). Quando o backend chegar,
 * estes tipos viram o contrato que as queries/actions devem respeitar.
 *
 * IMPORTANTE para o backend: os nomes de campo abaixo são o contrato implícito
 * que a UI já consome (snake_case, igual ao schema). Trocar nome = quebrar a UI.
 */

import type { Database } from '@/lib/supabase/types'
import type { MockPayableCategory } from '@/lib/format'

type Enums = Database['public']['Enums']

// --- Tipos das duas tabelas financeiras (subconjunto que a UI usa) ---

/** Conta a receber (tabela `charges`). */
export type Charge = {
  id: string
  company_id: string | null
  project_id: string | null
  contract_id: string | null
  description: string
  kind: Enums['charge_kind']
  amount: number
  due_date: string // ISO yyyy-MM-dd
  status: Enums['charge_status']
  method: Enums['charge_method'] | null
  paid_at: string | null // ISO datetime quando pago
  notes: string | null
  // Campo auxiliar só de exibição (a origem real vem do join project/contract no backend).
  origin_label: string | null
}

/**
 * Conta a pagar (tabela `accounts_payable`).
 * NOTA: category usa MockPayableCategory no mock. Quando o backend for ligado,
 * uma migration vai alinhar o enum do banco às novas categorias (fixo/variavel/imposto).
 */
export type AccountPayable = {
  id: string
  description: string
  category: MockPayableCategory
  amount: number
  due_date: string // ISO yyyy-MM-dd
  status: Enums['charge_status'] // reusa charge_status (pendente/pago/cancelado)
  paid_at: string | null
  project_id: string | null
  supplier: string | null
  notes: string | null
}

/**
 * Linha unificada do extrato (A Receber + A Pagar na mesma tabela).
 * `kind: 'receber'` carrega o Charge; `kind: 'pagar'` carrega o AccountPayable.
 * É um tipo só de UI — o backend continua expondo as duas tabelas separadas.
 */
export type AccountRow =
  | { type: 'receber'; data: Charge }
  | { type: 'pagar'; data: AccountPayable }

// --- Alíquota mock (virá de org_settings no backend) ---
// NOTA: ainda consumida pelo Dashboard (app/(dashboard)/page.tsx).
export const MOCK_TAX_RATE = 13 // % — alíquota atual

// --- IDs fixos de projetos/contratos mock ---
const PROJECT_MODA = '11111111-1111-1111-1111-111111111111'
const PROJECT_DENTAL = '22222222-2222-2222-2222-222222222222'
const PROJECT_LOGI = '33333333-3333-3333-3333-333333333333'
const CONTRACT_MODA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const CONTRACT_DENTAL = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

// --- Helpers de data (ano base 2026) ---

const Y = 2026

/** ISO yyyy-MM-dd a partir de partes. */
function d(month: number, day: number): string {
  return `${Y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** ISO datetime (noon UTC) para paid_at. */
function dt(month: number, day: number): string {
  return `${d(month, day)}T12:00:00.000Z`
}

const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

// --- Geradores de recorrência ---

/** Gera a cobrança mensal da Moda em Foco (billing_day=10, R$1.800/mês). */
function modaRec(month: number): Charge {
  const paid = month <= 5 // jan–mai pagos; jun=10 vencido (hoje é 18)
  return {
    id: `m-moda-${month}`,
    company_id: 'co-moda',
    project_id: null,
    contract_id: CONTRACT_MODA,
    description: `Manutenção mensal — Moda em Foco (${MONTHS_PT[month - 1]})`,
    kind: 'recorrencia',
    amount: 1800,
    due_date: d(month, 10),
    status: paid ? 'pago' : 'pendente',
    method: paid ? 'pix' : null,
    paid_at: paid ? dt(month, 12) : null,
    notes: null,
    origin_label: 'Contrato Moda em Foco',
  }
}

/** Gera a cobrança mensal do DentalCare (billing_day=15, R$2.400/mês). */
function dentalRec(month: number): Charge {
  const paid = month <= 6 // jan–jun pagos (15/jun já passou no dia 18)
  return {
    id: `m-dental-${month}`,
    company_id: 'co-dental',
    project_id: null,
    contract_id: CONTRACT_DENTAL,
    description: `Manutenção mensal — DentalCare (${MONTHS_PT[month - 1]})`,
    kind: 'recorrencia',
    amount: 2400,
    due_date: d(month, 15),
    status: paid ? 'pago' : 'pendente',
    method: paid ? 'boleto' : null,
    paid_at: paid ? dt(month, 15) : null,
    notes: null,
    origin_label: 'Contrato DentalCare',
  }
}

// --- MOCK_CHARGES: recorrências (jan–dez) + setups + avulsos ---

export const MOCK_CHARGES: Charge[] = [
  // Recorrências Moda em Foco — janeiro a dezembro
  ...Array.from({ length: 12 }, (_, i) => modaRec(i + 1)),

  // Recorrências DentalCare — janeiro a dezembro
  ...Array.from({ length: 12 }, (_, i) => dentalRec(i + 1)),

  // Setups (Implementações)
  {
    id: 's-moda-1',
    company_id: 'co-moda',
    project_id: PROJECT_MODA,
    contract_id: null,
    description: 'Setup — CRM Moda em Foco',
    kind: 'setup',
    amount: 12000,
    due_date: d(2, 15),
    status: 'pago',
    method: 'pix',
    paid_at: dt(2, 18),
    notes: null,
    origin_label: 'CRM Moda em Foco',
  },
  {
    id: 's-dental-1',
    company_id: 'co-dental',
    project_id: PROJECT_DENTAL,
    contract_id: null,
    description: 'Setup — Automação DentalCare',
    kind: 'setup',
    amount: 8500,
    due_date: d(6, 23),
    status: 'pendente',
    method: null,
    paid_at: null,
    notes: null,
    origin_label: 'Automação DentalCare',
  },
  {
    id: 's-logi-1',
    company_id: 'co-logi',
    project_id: PROJECT_LOGI,
    contract_id: null,
    description: 'Setup — Sistema LogiFlow',
    kind: 'setup',
    amount: 15000,
    due_date: d(9, 15),
    status: 'pendente',
    method: null,
    paid_at: null,
    notes: null,
    origin_label: 'Sistema LogiFlow',
  },

  // Avulsos
  {
    id: 'a-1',
    company_id: 'co-moda',
    project_id: null,
    contract_id: null,
    description: 'Consultoria estratégica — diagnóstico de processos',
    kind: 'avulso',
    amount: 2500,
    due_date: d(3, 5),
    status: 'pago',
    method: 'pix',
    paid_at: dt(3, 7),
    notes: null,
    origin_label: null,
  },
  {
    id: 'a-2',
    company_id: null,
    project_id: null,
    contract_id: null,
    description: 'Consultoria avulsa — workshop de IA',
    kind: 'avulso',
    amount: 3200,
    due_date: d(6, 28),
    status: 'pendente',
    method: 'transferencia',
    paid_at: null,
    notes: null,
    origin_label: null,
  },
  {
    id: 'a-3',
    company_id: 'co-logi',
    project_id: null,
    contract_id: null,
    description: 'Ajuste fora de escopo — LogiFlow',
    kind: 'avulso',
    amount: 950,
    due_date: d(6, 10),
    status: 'cancelado',
    method: null,
    paid_at: null,
    notes: 'Cliente desistiu do ajuste.',
    origin_label: null,
  },
]

// --- MOCK_PAYABLES: fixo / variavel / imposto ---

export const MOCK_PAYABLES: AccountPayable[] = [
  // Fixo
  {
    id: 'p-fixo-1',
    description: 'Aluguel — escritório compartilhado',
    category: 'fixo',
    amount: 1200,
    due_date: d(6, 5),
    status: 'pago',
    paid_at: dt(6, 5),
    project_id: null,
    supplier: 'Coworking BC',
    notes: null,
  },
  {
    id: 'p-fixo-2',
    description: 'Internet fibra',
    category: 'fixo',
    amount: 200,
    due_date: d(6, 5),
    status: 'pago',
    paid_at: dt(6, 5),
    project_id: null,
    supplier: 'Claro',
    notes: null,
  },
  // Variável
  {
    id: 'p-var-1',
    description: 'Servidores e banco (Supabase + Vercel)',
    category: 'variavel',
    amount: 480,
    due_date: d(6, 8),
    status: 'pendente',
    paid_at: null,
    project_id: null,
    supplier: 'Vercel',
    notes: null,
  },
  {
    id: 'p-var-2',
    description: 'Licenças de ferramentas (Figma, Linear)',
    category: 'variavel',
    amount: 320,
    due_date: d(6, 16),
    status: 'pendente',
    paid_at: null,
    project_id: null,
    supplier: 'Figma',
    notes: null,
  },
  {
    id: 'p-var-3',
    description: 'Freelancer de design — landing DentalCare',
    category: 'variavel',
    amount: 1500,
    due_date: d(6, 21),
    status: 'pendente',
    paid_at: null,
    project_id: PROJECT_DENTAL,
    supplier: 'Marina Souza',
    notes: null,
  },
  {
    id: 'p-var-4',
    description: 'OpenAI API — créditos do mês',
    category: 'variavel',
    amount: 740,
    due_date: d(6, 6),
    status: 'pago',
    paid_at: dt(6, 6),
    project_id: PROJECT_LOGI,
    supplier: 'OpenAI',
    notes: null,
  },
  // Imposto
  {
    id: 'p-imp-1',
    description: 'Simples Nacional (DAS) — maio',
    category: 'imposto',
    amount: 1890,
    due_date: d(5, 31),
    status: 'pago',
    paid_at: dt(5, 31),
    project_id: null,
    supplier: null,
    notes: null,
  },
  {
    id: 'p-imp-2',
    description: 'Simples Nacional (DAS) — junho',
    category: 'imposto',
    amount: 2100,
    due_date: d(6, 30),
    status: 'pendente',
    paid_at: null,
    project_id: null,
    supplier: null,
    notes: null,
  },
]
