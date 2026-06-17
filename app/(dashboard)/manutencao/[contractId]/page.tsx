import { MaintenanceDetail, type MaintenanceDetailData } from '@/components/projects/maintenance-detail'

/**
 * Tela de tarefas da Manutenção (por contrato).
 * MOCK do mini-gate visual (Fase 3): dados estáticos para validar o layout.
 * Após aprovação, troca por `getMaintenanceDetail(contractId)` + as mesmas
 * server actions de CRUD de tarefas da Implementação (TasksKanban compartilhado).
 */
export default async function ManutencaoDetailPage({
  params,
}: {
  params: Promise<{ contractId: string }>
}) {
  const { contractId } = await params

  const mock: MaintenanceDetailData = {
    contractId,
    dealId: 'mock-deal',
    company: 'Moda em Foco (TESTE)',
    companyId: 'mock-company',
    projectName: 'CRM Moda em Foco',
    kind: 'mensal',
    status: 'ativo',
    monthlyValue: 1200,
    minMonths: 12,
    billingDay: 10,
    startDate: '2026-05-10',
    nextContactDate: '2026-06-20',
    contactFrequencyDays: 30,
    sla: 'Resposta em até 24h úteis',
    notes: null,
    tasks: [
      { id: 'm1', title: 'Dar uma olhada no painel de métricas', description: null, status: 'analisar', priority: 'futuro', dueDate: '2026-06-22', recurrence: 'monthly', recurrenceDay: 1 },
      { id: 'm2', title: 'Entrar em contato com o cliente (check-in mensal)', description: null, status: 'todo', priority: 'proximo', dueDate: '2026-06-20', recurrence: 'monthly', recurrenceDay: 20 },
      { id: 'm3', title: 'Revisar logs de erro da semana', description: null, status: 'doing', priority: 'proximo', dueDate: '2026-06-18', recurrence: 'none', recurrenceDay: null },
      { id: 'm4', title: 'Pedir OK da última automação entregue', description: null, status: 'todo', priority: 'urgente', dueDate: '2026-06-17', recurrence: 'none', recurrenceDay: null },
      { id: 'm5', title: 'Renovar credenciais da API', description: null, status: 'impedimento', priority: 'urgente', dueDate: '2026-06-14', recurrence: 'none', recurrenceDay: null },
      { id: 'm6', title: 'Backup mensal conferido', description: null, status: 'done', priority: 'proximo', dueDate: '2026-06-05', recurrence: 'monthly', recurrenceDay: 5 },
    ],
  }

  return <MaintenanceDetail data={mock} />
}
