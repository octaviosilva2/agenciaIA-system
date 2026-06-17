'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { EntityActionsMenu } from '@/components/entity-actions-menu'
import { EditContactDialog, type EditableContact } from '@/components/contacts/edit-contact-dialog'
import { archiveContact, unarchiveContact, deleteContact } from '@/lib/actions/contacts'

/** Kebab de ações no header da tela do contato (/contatos/[id]). */
export function ContactHeaderActions({
  contact,
}: {
  contact: EditableContact & { archived: boolean }
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)

  return (
    <>
      <EntityActionsMenu
        archived={contact.archived}
        entityName={contact.name}
        onEdit={() => setEditing(true)}
        archiveAction={() => archiveContact(contact.id)}
        unarchiveAction={() => unarchiveContact(contact.id)}
        deleteAction={async () => {
          const res = await deleteContact(contact.id)
          // Excluído: o registro deixou de existir; volta para a lista.
          if (res.success) router.push('/contatos')
          return res
        }}
        onChanged={() => router.refresh()}
      />
      <EditContactDialog
        contact={contact}
        open={editing}
        onOpenChange={setEditing}
        onSaved={() => router.refresh()}
      />
    </>
  )
}
