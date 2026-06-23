'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { EntityActionsMenu } from '@/components/entity-actions-menu'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { archiveProject, unarchiveProject, deleteProject } from '@/lib/actions/deals'
import { renameProject } from '@/lib/actions/project'

const inputCls =
  'h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring'

/**
 * Kebab de ações no header da tela do projeto (/projetos/[id]): só Editar, Arquivar e Excluir.
 * "Editar" renomeia o projeto na própria tela (nome/proposta editam-se aqui; os desfechos
 * de funil ficam no bloco OpportunityActions).
 */
export function ProjectHeaderActions({
  dealId,
  projectId,
  projectName,
  archived,
}: {
  dealId: string
  projectId: string | null
  projectName: string
  archived: boolean
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(projectName)
  const [busy, setBusy] = useState(false)

  async function saveName() {
    setBusy(true)
    const res = await renameProject(dealId, projectId, name)
    setBusy(false)
    if (res.success) {
      toast.success(res.message)
      setEditing(false)
      router.refresh()
    } else {
      toast.error(res.message)
    }
  }

  return (
    <>
      <EntityActionsMenu
        archived={archived}
        entityName={projectName}
        onEdit={() => {
          setName(projectName)
          setEditing(true)
        }}
        archiveAction={() => archiveProject(dealId)}
        unarchiveAction={() => unarchiveProject(dealId)}
        deleteAction={async () => {
          const res = await deleteProject(dealId)
          if (res.success) router.push('/projetos')
          return res
        }}
        onChanged={() => router.refresh()}
      />

      {/* Edição do nome na própria tela. */}
      <Dialog open={editing} onOpenChange={(open) => !open && setEditing(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar projeto</DialogTitle>
          </DialogHeader>
          <div>
            <label className="mb-1 block text-xs font-medium" htmlFor="project_rename">
              Nome do projeto
            </label>
            <input
              id="project_rename"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
              autoFocus
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline">Cancelar</Button>} />
            <Button type="button" disabled={busy} onClick={saveName}>
              {busy ? 'Salvando…' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
