'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Pencil } from 'lucide-react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { EntityBadge } from '@/components/ui/entity-badge'
import { TONE } from '@/lib/format'
import { toggleProfileActive, updateProfileName } from '@/lib/actions/config'
import { INITIAL_ACTION_STATE } from '@/lib/actions/action-state'
import type { TeamProfile } from '@/lib/queries/config'

const inputCls =
  'h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring'
const labelCls = 'mb-1 block text-xs font-medium'

/**
 * Seção Equipe — tabela de profiles (dados reais) com toggle "ativo" e edição de nome.
 * Toggle: chamada direta de toggleProfileActive (não é form action).
 * Edição de nome: dialog com useActionState(updateProfileName).
 * Auto-inativação bloqueada na UI (checkbox disabled p/ o próprio usuário) — limitação conhecida.
 */
export function TeamSection({
  profiles,
  currentUserId,
}: {
  profiles: TeamProfile[]
  currentUserId: string
}) {
  const [editing, setEditing] = useState<TeamProfile | null>(null)
  const [isToggling, startToggle] = useTransition()

  function handleToggle(profile: TeamProfile) {
    const nextActive = !profile.active
    startToggle(async () => {
      const result = await toggleProfileActive(profile.id, nextActive)
      if (result.success) toast.success(result.message)
      else toast.error(result.message)
    })
  }

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-base font-semibold">Equipe</h3>
        <p className="text-sm text-muted-foreground">
          Membros com acesso. Novos usuários são criados no painel do Supabase.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 font-medium">Nome</th>
              <th className="px-3 py-2 font-medium">E-mail</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="w-32 px-3 py-2 font-medium">Ativo</th>
              <th className="w-10 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {/* Estado vazio: nenhuma linha, tabela não quebra (CA-18) */}
            {profiles.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Nenhum membro cadastrado.
                </td>
              </tr>
            )}
            {profiles.map((p) => {
              const isSelf = p.id === currentUserId
              return (
                <tr key={p.id} className="h-9 border-b border-border last:border-0 hover:bg-accent">
                  <td className="px-3 py-2 font-medium">{p.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{p.email}</td>
                  <td className="px-3 py-2">
                    <EntityBadge
                      meta={
                        p.active
                          ? { label: 'Ativo', className: TONE.green }
                          : { label: 'Inativo', className: TONE.zinc }
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <label
                      className={`flex items-center gap-2 ${isSelf ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <Checkbox
                        checked={p.active}
                        onCheckedChange={() => handleToggle(p)}
                        disabled={isSelf || isToggling}
                        aria-label={p.active ? 'Desativar membro' : 'Ativar membro'}
                      />
                      <span className="text-xs text-muted-foreground">
                        {p.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </label>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setEditing(p)}
                      aria-label={`Editar ${p.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Dialog de edição de nome — remontado por key para resetar o action state */}
      <EditNameDialog
        key={editing?.id ?? 'none'}
        profile={editing}
        onClose={() => setEditing(null)}
      />
    </section>
  )
}

/** Dialog de edição de nome de um membro via updateProfileName. */
function EditNameDialog({
  profile,
  onClose,
}: {
  profile: TeamProfile | null
  onClose: () => void
}) {
  const [state, formAction, pending] = useActionState(updateProfileName, INITIAL_ACTION_STATE)

  useEffect(() => {
    if (state.success) {
      toast.success(state.message)
      onClose()
    } else if (state.message && !state.errors) {
      toast.error(state.message)
    }
  }, [state, onClose])

  return (
    <Dialog open={profile !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar membro</DialogTitle>
          <DialogDescription>Atualize o nome de exibição.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={profile?.id ?? ''} />
          <div>
            <label className={labelCls} htmlFor="tm_name">
              Nome
            </label>
            <input
              id="tm_name"
              name="name"
              defaultValue={profile?.name ?? ''}
              className={inputCls}
              autoFocus
              aria-invalid={state.errors?.name ? true : undefined}
            />
            {state.errors?.name && (
              <p className="mt-1 text-xs text-destructive">{state.errors.name[0]}</p>
            )}
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline">Cancelar</Button>} />
            <Button type="submit" disabled={pending}>
              {pending ? 'Salvando…' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
