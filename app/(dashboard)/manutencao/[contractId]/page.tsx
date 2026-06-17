import { notFound } from 'next/navigation'
import { getMaintenanceDetail } from '@/lib/queries/maintenance-detail'
import { MaintenanceDetail } from '@/components/projects/maintenance-detail'

/**
 * Tela de tarefas + cobrança da Manutenção (por contrato).
 * Server Component: lê o contrato e as tarefas reais; mutações via server actions
 * (cobrança em lib/actions/project, tarefas em lib/actions/tasks).
 */
export default async function ManutencaoDetailPage({
  params,
}: {
  params: Promise<{ contractId: string }>
}) {
  const { contractId } = await params
  const data = await getMaintenanceDetail(contractId)
  if (!data) notFound()

  return <MaintenanceDetail data={data} />
}
