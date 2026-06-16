import { ImplementationDetail, type ImplementationDetailData } from '@/components/projects/implementation-detail'

/**
 * Tela operacional do projeto (execução).
 * MOCK do mini-gate visual (Fase 3): dados estáticos para validar o layout.
 * Após aprovação, troca por `getImplementationDetail(projectId)` + server actions
 * de CRUD de tarefas — o layout não muda.
 */
export default async function ImplementacaoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const mock: ImplementationDetailData = {
    projectId: id,
    dealId: 'mock-deal',
    project: 'CRM Moda em Foco',
    company: 'Moda em Foco (TESTE)',
    companyId: 'mock-company',
    status: 'desenvolvimento',
    dueDate: '2026-06-21',
    customStages: [
      { id: 's1', name: 'Briefing e acesso', done: true },
      { id: 's2', name: 'Modelagem de dados', done: true },
      { id: 's3', name: 'Telas comerciais', done: false },
      { id: 's4', name: 'Integração WhatsApp', done: false },
      { id: 's5', name: 'Entrega e treinamento', done: false },
    ],
    scopeItems: [
      { id: 'sc1', title: 'Funil de vendas (kanban)', contracted: true, delivered: true },
      { id: 'sc2', title: 'Disparo automático de propostas', contracted: true, delivered: false },
      { id: 'sc3', title: 'Relatório de conversão', contracted: true, delivered: false },
    ],
    tasks: [
      { id: 't1', title: 'Revisar layout do kanban com o cliente', description: null, status: 'analisar', priority: 'proximo', dueDate: '2026-06-19' },
      { id: 't2', title: 'Mapear campos do formulário de contato', description: null, status: 'todo', priority: 'futuro', dueDate: null },
      { id: 't3', title: 'Configurar webhook do WhatsApp', description: 'Cloud API', status: 'doing', priority: 'urgente', dueDate: '2026-06-17' },
      { id: 't4', title: 'Ajustar permissões RLS', description: null, status: 'doing', priority: 'proximo', dueDate: '2026-06-20' },
      { id: 't5', title: 'Aguardando acesso ao domínio', description: null, status: 'impedimento', priority: 'urgente', dueDate: '2026-06-12' },
      { id: 't6', title: 'Subir projeto na Vercel', description: null, status: 'done', priority: 'proximo', dueDate: '2026-06-10' },
    ],
    phaseEvents: [
      { status: 'a_iniciar', enteredAt: '2026-06-01' },
      { status: 'briefing', enteredAt: '2026-06-03' },
      { status: 'desenvolvimento', enteredAt: '2026-06-08' },
    ],
    hasContract: true,
  }

  return <ImplementationDetail data={mock} />
}
