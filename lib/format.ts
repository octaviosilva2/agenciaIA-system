/**
 * Fonte única de labels PT-BR, cores de badge e formatação de número/data.
 * A UI NUNCA escreve label ou classe de cor de status solta — sempre via este módulo.
 * Cores e tons saem de docs/06-design-system.md (§6) e do frontend-teste/style-guide.html.
 */

import type { Database } from '@/lib/supabase/types'
import type { ContactStatus } from '@/lib/rules/contact-status'

type Enums = Database['public']['Enums']

/** Metadados de um badge: rótulo PT-BR + classes de cor (claro+escuro embutidos). */
export type BadgeMeta = { label: string; className: string }

// --- Tons reutilizáveis (design system §6.1) ---
export type Tone =
  | 'green'
  | 'amber'
  | 'red'
  | 'blue'
  | 'indigo'
  | 'zinc'
  | 'zinc-faint'
  | 'outline'
  | 'slate-soft'
  | 'slate-mid'

export const TONE: Record<Tone, string> = {
  green: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  red: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
  indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400',
  zinc: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-500/15 dark:text-zinc-400',
  'zinc-faint': 'bg-zinc-100 text-zinc-400 dark:bg-zinc-500/15 dark:text-zinc-500',
  outline: 'border border-zinc-300 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300',
  'slate-soft': 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300',
  'slate-mid': 'bg-slate-200 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300',
}

// --- Estágios do funil (deal_stage) ---
// Ativos: escala slate (tom único, intensidade crescente — design system §6.1).
// Terminais: green/red/amber/zinc-faint.
export const DEAL_STAGE: Record<Enums['deal_stage'], BadgeMeta> = {
  prospect: {
    label: 'Prospect',
    className: 'bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400',
  },
  lead: {
    label: 'Lead',
    className: 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300',
  },
  diagnostico: {
    label: 'Diagnóstico',
    className: 'bg-slate-200 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300',
  },
  oportunidade: {
    label: 'Oportunidade',
    className: 'bg-slate-200 text-slate-800 dark:bg-slate-500/25 dark:text-slate-200',
  },
  escopo: {
    label: 'Escopo',
    className: 'bg-slate-300 text-slate-800 dark:bg-slate-400/25 dark:text-slate-200',
  },
  proposta: {
    label: 'Proposta',
    className: 'bg-slate-300 text-slate-900 dark:bg-slate-400/30 dark:text-slate-100',
  },
  negociacao: {
    label: 'Negociação',
    className: 'bg-slate-400 text-slate-900 dark:bg-slate-400/40 dark:text-slate-100',
  },
  fechado: { label: 'Fechado', className: TONE.green },
  perdido: { label: 'Perdido', className: TONE.red },
  reativar_futuramente: { label: 'Reativar', className: TONE.amber },
  desqualificado: { label: 'Desqualificado', className: TONE['zinc-faint'] },
}

// --- Estado derivado do contato (não é enum do banco — vem de lib/rules/contact-status) ---
export const CONTACT_STATUS: Record<ContactStatus, BadgeMeta> = {
  em_negociacao: { label: 'Em negociação', className: TONE.blue },
  cliente_ativo: { label: 'Cliente ativo', className: TONE.green },
  reativar: { label: 'Reativar', className: TONE.amber },
  perdido: { label: 'Perdido', className: TONE.red },
  inativo: { label: 'Inativo', className: TONE.zinc },
  contato: { label: 'Contato', className: TONE.outline },
}

// --- Status de projeto (project_status) ---
export const PROJECT_STATUS: Record<Enums['project_status'], BadgeMeta> = {
  a_iniciar: { label: 'A iniciar', className: TONE.zinc },
  briefing: { label: 'Briefing', className: TONE['slate-soft'] },
  desenvolvimento: { label: 'Desenvolvimento', className: TONE.blue },
  revisao: { label: 'Revisão', className: TONE.amber },
  entregue: { label: 'Entregue', className: TONE.green },
}

// --- Status de tarefa (task_status) ---
export const TASK_STATUS: Record<Enums['task_status'], BadgeMeta> = {
  analisar: { label: 'Analisar', className: TONE.zinc },
  todo: { label: 'To-do', className: TONE['slate-soft'] },
  doing: { label: 'Doing', className: TONE.blue },
  impedimento: { label: 'Impedimento', className: TONE.red },
  done: { label: 'Concluída', className: TONE.green },
}

// --- Prioridade de tarefa (task_priority) ---
export const TASK_PRIORITY: Record<Enums['task_priority'], BadgeMeta> = {
  urgente: { label: 'Urgente', className: TONE.red },
  proximo: { label: 'Próximo', className: TONE.amber },
  futuro: { label: 'Futuro', className: TONE.zinc },
}

// --- Tipo de compromisso NCT (commitment_type) ---
export const COMMITMENT_TYPE: Record<Enums['commitment_type'], BadgeMeta> = {
  think_it: { label: 'Think-It', className: TONE.indigo },
  build_it: { label: 'Build-It', className: TONE.amber },
  launch_it: { label: 'Launch-It', className: TONE.green },
  quantitativo: { label: 'Quantitativo', className: TONE['slate-mid'] },
}

// --- Status de cobrança (charge_status) — reusado em accounts_payable ---
export const CHARGE_STATUS: Record<Enums['charge_status'], BadgeMeta> = {
  pendente: { label: 'Pendente', className: TONE.amber },
  pago: { label: 'Pago', className: TONE.green },
  cancelado: { label: 'Cancelado', className: TONE['zinc-faint'] },
}

/**
 * Badge derivado "Vencido": charge pendente com vencimento no passado.
 * Não é valor de enum — calculado na query/UI via isOverdue.
 */
export const CHARGE_OVERDUE: BadgeMeta = { label: 'Vencido', className: TONE.red }

// --- Confiança (confidence_level) — ponto colorido, não badge (design system §6.2) ---
export const CONFIDENCE_DOT: Record<Enums['confidence_level'], string> = {
  alta: 'bg-green-500',
  media: 'bg-amber-500',
  baixa: 'bg-red-500',
}

// =====================================================================
// Enums só-texto (sem badge colorido) — apenas o rótulo PT-BR.
// =====================================================================

export const CONFIDENCE_LABELS: Record<Enums['confidence_level'], string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
}

export const DEAL_URGENCY_LABELS: Record<Enums['deal_urgency'], string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
}

export const LEVEL_SCALE_LABELS: Record<Enums['level_scale'], string> = {
  baixo: 'Baixo',
  medio: 'Médio',
  alto: 'Alto',
}

export const TASK_AREA_LABELS: Record<Enums['task_area'], string> = {
  gestao: 'Gestão',
  comercial: 'Comercial',
  operacional: 'Operacional',
  financeiro: 'Financeiro',
  sistema: 'Sistema',
}

export const COMMITMENT_STATUS_LABELS: Record<Enums['commitment_status'], string> = {
  em_andamento: 'Em andamento',
  cumprido: 'Cumprido',
  nao_cumprido: 'Não cumprido',
}

export const NARRATIVE_STATUS_LABELS: Record<Enums['narrative_status'], string> = {
  ativa: 'Ativa',
  concluida: 'Concluída',
  arquivada: 'Arquivada',
}

export const CONTRACT_KIND_LABELS: Record<Enums['contract_kind'], string> = {
  mensal: 'Mensal',
  avulso: 'Hora avulsa',
}

export const CONTRACT_STATUS_LABELS: Record<Enums['contract_status'], string> = {
  ativo: 'Ativo',
  encerrado: 'Inativo',
}

export const CHARGE_KIND_LABELS: Record<Enums['charge_kind'], string> = {
  setup: 'Setup',
  recorrencia: 'Recorrência',
  avulso: 'Avulso',
}

export const CHARGE_METHOD_LABELS: Record<Enums['charge_method'], string> = {
  pix: 'Pix',
  boleto: 'Boleto',
  cartao: 'Cartão',
  transferencia: 'Transferência',
  outro: 'Outro',
}

export const PAYABLE_CATEGORY_LABELS: Record<Enums['payable_category'], string> = {
  infra: 'Infra',
  freela: 'Freela',
  ferramentas: 'Ferramentas',
  imposto: 'Imposto',
  outro: 'Outro',
}

/** Nova estrutura de categorias de contas a pagar (fixo/variavel/imposto).
 * O schema do banco ainda usa o enum antigo; uma migration vai alinhar quando o backend for ligado.
 */
export type MockPayableCategory = 'fixo' | 'variavel' | 'imposto'

export const NEW_PAYABLE_CATEGORY_LABELS: Record<MockPayableCategory, string> = {
  fixo: 'Fixo',
  variavel: 'Variável',
  imposto: 'Imposto',
}

export const ACTIVITY_TYPE_LABELS: Record<Enums['activity_type'], string> = {
  nota: 'Nota',
  reuniao: 'Reunião',
  ligacao: 'Ligação',
  email: 'E-mail',
  whatsapp: 'WhatsApp',
  outro: 'Outro',
}

// =====================================================================
// Helpers de número e data (pt-BR).
// =====================================================================

/** Formata valor em reais (R$) no padrão PT-BR. */
export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

/** Formata data no padrão dd/MM/yyyy. */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

/** Formata data e hora no padrão dd/MM/yyyy HH:mm. */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

/**
 * Indica se uma data de vencimento está no passado (atrasada).
 * Compara só a data (zera horas) — vence "ontem ou antes" = true.
 */
export function isOverdue(date: string | Date | null | undefined): boolean {
  if (!date) return false
  const due = typeof date === 'string' ? new Date(date) : new Date(date.getTime())
  due.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return due.getTime() < today.getTime()
}

/**
 * Dias entre hoje e a data: futuro positivo, passado negativo, hoje = 0.
 * null quando não há data. Compara só a data (zera horas).
 */
export function daysUntil(date: string | Date | null | undefined): number | null {
  if (!date) return null
  const due = typeof date === 'string' ? new Date(date) : new Date(date.getTime())
  due.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - today.getTime()) / 86_400_000)
}

/**
 * Rótulo PT-BR de contagem regressiva de um prazo
 * (ex.: "Faltam 3 dias", "Vence hoje", "Atrasado há 2 dias"). null sem data.
 */
export function deliveryCountdown(date: string | Date | null | undefined): string | null {
  const d = daysUntil(date)
  if (d == null) return null
  if (d === 0) return 'Vence hoje'
  if (d === 1) return 'Falta 1 dia'
  if (d > 1) return `Faltam ${d} dias`
  const past = Math.abs(d)
  return past === 1 ? 'Atrasado há 1 dia' : `Atrasado há ${past} dias`
}
