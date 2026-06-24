'use client'

import { useActionState, useEffect } from 'react'
import { toast } from 'sonner'
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
import { updateContact } from '@/lib/actions/contacts'
import { ContactsFieldset, type ContactItem } from '@/components/contacts/contacts-fieldset'
import { INITIAL_ACTION_STATE } from '@/lib/actions/action-state'

const labelCls = 'mb-1 block text-xs font-medium'
const inputCls =
  'h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring'
const inputErrorCls =
  'h-9 w-full rounded-md border border-red-500 bg-card px-3 text-sm outline-none ring-2 ring-red-500/30'
const textareaCls =
  'w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring'
const errorTextCls = 'mt-1 text-xs text-red-600 dark:text-red-400'

/** Dados editáveis de um contato (espelha as colunas de companies). */
export type EditableContact = {
  id: string
  name: string
  segment: string | null
  city: string | null
  contactName: string | null
  contactPhone: string | null
  contactEmail: string | null
  origin: string | null
  notes: string | null
  // Lista completa de contatos (company_contacts). Fallback p/ o par antigo abaixo.
  contacts?: ContactItem[]
}

/** Dialog controlado de edição de contato (aberto pelo kebab). */
export function EditContactDialog({
  contact,
  open,
  onOpenChange,
  onSaved,
}: {
  contact: EditableContact
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}) {
  const [state, formAction, pending] = useActionState(updateContact, INITIAL_ACTION_STATE)

  useEffect(() => {
    if (state.success) {
      toast.success(state.message)
      onOpenChange(false)
      onSaved?.()
    } else if (state.message) {
      toast.error(state.message)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  const errors = state.errors ?? {}

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar contato</DialogTitle>
          <DialogDescription>Atualize os dados da empresa/pessoa.</DialogDescription>
        </DialogHeader>

        {/* key força o remount dos campos (defaultValue) ao trocar de contato. */}
        <form key={contact.id} action={formAction} className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="id" defaultValue={contact.id} />

          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="edit_name">
              Nome <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <input
              id="edit_name"
              name="name"
              required
              defaultValue={contact.name}
              className={errors.name ? inputErrorCls : inputCls}
            />
            {errors.name && <p className={errorTextCls}>{errors.name[0]}</p>}
          </div>

          <div>
            <label className={labelCls} htmlFor="edit_segment">Segmento</label>
            <input id="edit_segment" name="segment" defaultValue={contact.segment ?? ''} className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="edit_city">Cidade</label>
            <input id="edit_city" name="city" defaultValue={contact.city ?? ''} className={inputCls} />
          </div>

          <ContactsFieldset
            initial={
              contact.contacts && contact.contacts.length > 0
                ? contact.contacts
                : contact.contactName
                  ? [{ name: contact.contactName, phone: contact.contactPhone ?? '' }]
                  : undefined
            }
          />

          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="edit_contact_email">E-mail</label>
            <input
              id="edit_contact_email"
              name="contact_email"
              type="email"
              defaultValue={contact.contactEmail ?? ''}
              className={errors.contact_email ? inputErrorCls : inputCls}
            />
            {errors.contact_email && <p className={errorTextCls}>{errors.contact_email[0]}</p>}
          </div>

          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="edit_origin">Origem</label>
            <textarea id="edit_origin" name="origin" rows={2} defaultValue={contact.origin ?? ''} className={textareaCls} />
          </div>

          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="edit_notes">Observações</label>
            <input id="edit_notes" name="notes" defaultValue={contact.notes ?? ''} className={inputCls} />
          </div>

          <DialogFooter className="sm:col-span-2">
            <DialogClose render={<Button type="button" variant="outline">Cancelar</Button>} />
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" />
                  Salvando…
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
