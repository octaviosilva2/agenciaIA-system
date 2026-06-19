import { notFound } from 'next/navigation'
import { ImplementationDetail } from '@/components/projects/implementation-detail'
import { getProjectScope } from '@/lib/queries/opportunity-detail'
import type { TaskItem } from '@/components/tasks/tasks-kanban'

/**
 * Tela operacional do projeto (execução).
 * Escopo e status: banco real. Tarefas: mock até o backend do sócio.
 */
export default async function ImplementacaoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const scope = await getProjectScope(id)
  if (!scope) notFound()

  // Tarefas permanecem mock até o backend do sócio ser ligado.
  const mockTasks: TaskItem[] = [
    {
      id: 't1',
      title: 'Revisar layout do kanban com o cliente',
      description: null,
      status: 'analisar',
      priority: 'proximo',
      dueDate: '2026-06-19',
    },
    {
      id: 't2',
      title: 'Mapear campos do formulário de contato',
      description: null,
      status: 'todo',
      priority: 'futuro',
      dueDate: null,
    },
    {
      id: 't3',
      title: 'Configurar webhook do WhatsApp',
      description: 'Cloud API',
      status: 'doing',
      priority: 'urgente',
      dueDate: '2026-06-17',
    },
    {
      id: 't4',
      title: 'Ajustar permissões RLS',
      description: null,
      status: 'doing',
      priority: 'proximo',
      dueDate: '2026-06-20',
    },
    {
      id: 't5',
      title: 'Aguardando acesso ao domínio',
      description: null,
      status: 'impedimento',
      priority: 'urgente',
      dueDate: '2026-06-12',
    },
    {
      id: 't6',
      title: 'Subir projeto na Vercel',
      description: null,
      status: 'done',
      priority: 'proximo',
      dueDate: '2026-06-10',
    },
  ]

  return (
    <ImplementationDetail
      projectId={scope.projectId}
      dealId={scope.dealId}
      initialScopeItems={scope.scopeItems}
      initialStatus={scope.status}
      initialProgress={scope.progress}
      project={scope.projectName}
      company={scope.company}
      companyId={scope.companyId}
      dueDate={scope.dueDate}
      tasks={mockTasks}
    />
  )
}
