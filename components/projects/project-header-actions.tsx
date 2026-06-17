'use client'

import { useRouter } from 'next/navigation'
import { EntityActionsMenu } from '@/components/entity-actions-menu'
import { archiveProject, unarchiveProject, deleteProject } from '@/lib/actions/deals'

/** Kebab de ações no header da tela do projeto (/projetos/[id]). Editar = a própria tela. */
export function ProjectHeaderActions({
  dealId,
  projectName,
  archived,
}: {
  dealId: string
  projectName: string
  archived: boolean
}) {
  const router = useRouter()
  return (
    <EntityActionsMenu
      archived={archived}
      entityName={projectName}
      archiveAction={() => archiveProject(dealId)}
      unarchiveAction={() => unarchiveProject(dealId)}
      deleteAction={async () => {
        const res = await deleteProject(dealId)
        if (res.success) router.push('/projetos')
        return res
      }}
      onChanged={() => router.refresh()}
    />
  )
}
