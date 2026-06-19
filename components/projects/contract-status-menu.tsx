'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Check } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { EntityBadge } from '@/components/ui/entity-badge'
import { CONTRACT_STATUS_LABELS, TONE } from '@/lib/format'
import { setContractStatus } from '@/lib/actions/contracts'
import type { Database } from '@/lib/supabase/types'

type ContractStatus = Database['public']['Enums']['contract_status']

const STATUS_TONE: Record<ContractStatus, string> = {
  ativo: TONE.green,
  encerrado: TONE['zinc-faint'],
}

/** Não propagar o clique para a linha clicável (que navega para o detalhe). */
function stop(e: { stopPropagation: () => void }) {
  e.stopPropagation()
}

/**
 * Badge de status do contrato (Ativo/Inativo) clicável: abre um menu para alternar.
 * O status é independente do arquivamento (lixeira).
 */
export function ContractStatusMenu({
  contractId,
  status,
}: {
  contractId: string
  status: ContractStatus
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function change(next: ContractStatus) {
    if (next === status) return
    setBusy(true)
    const res = await setContractStatus(contractId, next)
    setBusy(false)
    if (!res.success) {
      toast.error(res.message)
    } else {
      toast.success(res.message)
      router.refresh()
    }
  }

  const options: ContractStatus[] = ['ativo', 'encerrado']

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label="Mudar status"
            className="cursor-pointer rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onPointerDown={stop}
            onClick={stop}
          />
        }
      >
        <EntityBadge meta={{ label: CONTRACT_STATUS_LABELS[status], className: STATUS_TONE[status] }} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-auto min-w-36" onClick={stop}>
        <DropdownMenuLabel>Status</DropdownMenuLabel>
        {options.map((s) => (
          <DropdownMenuItem key={s} disabled={busy || s === status} onClick={() => void change(s)}>
            <EntityBadge meta={{ label: CONTRACT_STATUS_LABELS[s], className: STATUS_TONE[s] }} />
            {s === status && <Check className="ml-auto" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
