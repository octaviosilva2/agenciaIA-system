/**
 * Labels, badges e formatação PT-BR para enums do sistema.
 * Fonte única de verdade para textos de UI — nunca usar strings soltas.
 */

// --- Estágios do funil ---
export const DEAL_STAGE_LABELS: Record<string, string> = {
  prospect: 'Prospect',
  lead: 'Lead',
  diagnostico: 'Diagnóstico',
  oportunidade: 'Oportunidade',
  escopo: 'Escopo',
  proposta: 'Proposta',
  negociacao: 'Negociação',
  fechado: 'Fechado',
  perdido: 'Perdido',
  reativar_futuramente: 'Reativar Futuramente',
  desqualificado: 'Desqualificado',
}

export const DEAL_STAGE_COLORS: Record<string, string> = {
  prospect: 'bg-slate-100 text-slate-700',
  lead: 'bg-blue-100 text-blue-700',
  diagnostico: 'bg-cyan-100 text-cyan-700',
  oportunidade: 'bg-violet-100 text-violet-700',
  escopo: 'bg-indigo-100 text-indigo-700',
  proposta: 'bg-purple-100 text-purple-700',
  negociacao: 'bg-amber-100 text-amber-700',
  fechado: 'bg-emerald-100 text-emerald-700',
  perdido: 'bg-red-100 text-red-700',
  reativar_futuramente: 'bg-orange-100 text-orange-700',
  desqualificado: 'bg-zinc-100 text-zinc-500',
}

// --- Status de projeto ---
export const PROJECT_STATUS_LABELS: Record<string, string> = {
  a_iniciar: 'A Iniciar',
  briefing: 'Briefing',
  desenvolvimento: 'Desenvolvimento',
  revisao: 'Revisão',
  entregue: 'Entregue',
}

export const PROJECT_STATUS_COLORS: Record<string, string> = {
  a_iniciar: 'bg-slate-100 text-slate-700',
  briefing: 'bg-blue-100 text-blue-700',
  desenvolvimento: 'bg-amber-100 text-amber-700',
  revisao: 'bg-purple-100 text-purple-700',
  entregue: 'bg-emerald-100 text-emerald-700',
}

// --- Status de tarefa ---
export const TASK_STATUS_LABELS: Record<string, string> = {
  analisar: 'Analisar',
  todo: 'To-do',
  doing: 'Doing',
  impedimento: 'Impedimento',
  done: 'Done',
}

export const TASK_STATUS_COLORS: Record<string, string> = {
  analisar: 'bg-slate-100 text-slate-700',
  todo: 'bg-blue-100 text-blue-700',
  doing: 'bg-amber-100 text-amber-700',
  impedimento: 'bg-red-100 text-red-700',
  done: 'bg-emerald-100 text-emerald-700',
}

// --- Prioridade de tarefa ---
export const TASK_PRIORITY_LABELS: Record<string, string> = {
  urgente: 'Urgente',
  proximo: 'Próximo',
  futuro: 'Futuro',
}

export const TASK_PRIORITY_COLORS: Record<string, string> = {
  urgente: 'bg-red-100 text-red-700',
  proximo: 'bg-amber-100 text-amber-700',
  futuro: 'bg-slate-100 text-slate-500',
}

// --- Área da tarefa ---
export const TASK_AREA_LABELS: Record<string, string> = {
  gestao: 'Gestão',
  comercial: 'Comercial',
  operacional: 'Operacional',
  financeiro: 'Financeiro',
  sistema: 'Sistema',
}

// --- Urgência do deal ---
export const DEAL_URGENCY_LABELS: Record<string, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
}

// --- Escala (impact/effort) ---
export const LEVEL_SCALE_LABELS: Record<string, string> = {
  baixo: 'Baixo',
  medio: 'Médio',
  alto: 'Alto',
}

// --- Confiança ---
export const CONFIDENCE_LABELS: Record<string, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
}

export const CONFIDENCE_COLORS: Record<string, string> = {
  baixa: 'text-red-500',
  media: 'text-amber-500',
  alta: 'text-emerald-500',
}

export const CONFIDENCE_DOT_COLORS: Record<string, string> = {
  baixa: 'bg-red-500',
  media: 'bg-amber-500',
  alta: 'bg-emerald-500',
}

// --- Tipo de compromisso NCT ---
export const COMMITMENT_TYPE_LABELS: Record<string, string> = {
  think_it: 'Think-It',
  build_it: 'Build-It',
  launch_it: 'Launch-It',
  quantitativo: 'Quantitativo',
}

export const COMMITMENT_TYPE_COLORS: Record<string, string> = {
  think_it: 'bg-indigo-100 text-indigo-700',
  build_it: 'bg-amber-100 text-amber-700',
  launch_it: 'bg-emerald-100 text-emerald-700',
  quantitativo: 'bg-slate-100 text-slate-600',
}

// --- Status de compromisso ---
export const COMMITMENT_STATUS_LABELS: Record<string, string> = {
  em_andamento: 'Em Andamento',
  cumprido: 'Cumprido',
  nao_cumprido: 'Não Cumprido',
}

// --- Status de narrativa ---
export const NARRATIVE_STATUS_LABELS: Record<string, string> = {
  ativa: 'Ativa',
  concluida: 'Concluída',
  arquivada: 'Arquivada',
}

// --- Tipo de contrato ---
export const CONTRACT_KIND_LABELS: Record<string, string> = {
  mensal: 'Mensal',
  avulso: 'Avulso',
}

// --- Status de contrato ---
export const CONTRACT_STATUS_LABELS: Record<string, string> = {
  ativo: 'Ativo',
  encerrado: 'Encerrado',
}

// --- Tipo de cobrança ---
export const CHARGE_KIND_LABELS: Record<string, string> = {
  setup: 'Setup',
  recorrencia: 'Recorrência',
  avulso: 'Avulso',
}

// --- Status de cobrança ---
export const CHARGE_STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  pago: 'Pago',
  cancelado: 'Cancelado',
}

export const CHARGE_STATUS_COLORS: Record<string, string> = {
  pendente: 'bg-amber-100 text-amber-700',
  pago: 'bg-emerald-100 text-emerald-700',
  cancelado: 'bg-zinc-100 text-zinc-500',
}

// --- Método de pagamento ---
export const CHARGE_METHOD_LABELS: Record<string, string> = {
  pix: 'Pix',
  boleto: 'Boleto',
  cartao: 'Cartão',
  transferencia: 'Transferência',
  outro: 'Outro',
}

// --- Categoria contas a pagar ---
export const PAYABLE_CATEGORY_LABELS: Record<string, string> = {
  infra: 'Infra',
  freela: 'Freela',
  ferramentas: 'Ferramentas',
  imposto: 'Imposto',
  outro: 'Outro',
}

// --- Tipo de atividade ---
export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  nota: 'Nota',
  reuniao: 'Reunião',
  ligacao: 'Ligação',
  email: 'E-mail',
  whatsapp: 'WhatsApp',
  outro: 'Outro',
}

// --- Estado derivado do contato ---
export const CONTACT_STATUS_LABELS: Record<string, string> = {
  em_negociacao: 'Em Negociação',
  cliente_ativo: 'Cliente Ativo',
  reativar: 'Reativar',
  perdido: 'Perdido',
  inativo: 'Inativo',
  contato: 'Contato',
}

export const CONTACT_STATUS_COLORS: Record<string, string> = {
  em_negociacao: 'bg-blue-100 text-blue-700',
  cliente_ativo: 'bg-emerald-100 text-emerald-700',
  reativar: 'bg-orange-100 text-orange-700',
  perdido: 'bg-red-100 text-red-700',
  inativo: 'bg-zinc-100 text-zinc-500',
  contato: 'bg-slate-100 text-slate-600',
}

// --- Formatação de moeda e datas ---

/**
 * Formata valor em reais (R$) no padrão PT-BR.
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

/**
 * Formata data no padrão dd/MM/yyyy.
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

/**
 * Formata data e hora no padrão dd/MM/yyyy HH:mm.
 */
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
