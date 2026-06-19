'use client'

import { useRouter } from 'next/navigation'
import { Inbox } from 'lucide-react'
import { CONTRACT_KIND_LABELS, formatCurrency, formatDate, isOverdue } from '@/lib/format'
import { ContractStatusMenu } from '@/components/projects/contract-status-menu'
import { EntityActionsMenu } from '@/components/entity-actions-menu'
import { archiveContract, unarchiveContract, deleteContract } from '@/lib/actions/contracts'
import type { MaintenanceItem } from '@/lib/queries/projects-board'

/** Lista de contratos de manutenção (kebab para arquivar/excluir; visão ativa × arquivada). */
export function MaintenanceList({
  items,
  archived = false,
}: {
  items: MaintenanceItem[]
  archived?: boolean
}) {
  const router = useRouter()

  if (items.length === 0) {
    return (
      <div className="grid place-items-center rounded-lg border border-dashed border-border bg-card p-10 text-center">
        <Inbox className="h-6 w-6 text-muted-foreground/50" />
        <p className="mt-2 text-sm font-medium">
          {archived ? 'Nenhuma manutenção arquivada' : 'Nenhum contrato de manutenção ativo'}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {archived
            ? 'Contratos arquivados aparecem aqui.'
            : 'Contratos nascem ao fechar um negócio com manutenção.'}
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2 font-medium">Cliente</th>
            <th className="px-3 py-2 font-medium">Projeto</th>
            <th className="px-3 py-2 font-medium">Tipo</th>
            <th className="px-3 py-2 text-right font-medium">Valor mensal</th>
            <th className="px-3 py-2 font-medium">Próximo contato</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="w-10 px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {items.map((c) => {
            const overdue = isOverdue(c.nextContactDate)
            return (
              <tr
                key={c.id}
                onClick={() => router.push(`/manutencao/${c.id}`)}
                className="cursor-pointer border-b border-border last:border-0 hover:bg-accent"
              >
                <td className="px-3 py-2 font-medium">{c.company}</td>
                <td className="px-3 py-2 text-muted-foreground">{c.projectName ?? '—'}</td>
                <td className="px-3 py-2">{CONTRACT_KIND_LABELS[c.kind]}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">
                  {c.monthlyValue != null ? formatCurrency(c.monthlyValue) : '—'}
                </td>
                <td
                  className={`px-3 py-2 ${
                    overdue ? 'font-medium text-red-600 dark:text-red-400' : 'text-muted-foreground'
                  }`}
                >
                  {c.nextContactDate ? formatDate(c.nextContactDate) : '—'}
                  {overdue && ' · atrasado'}
                </td>
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  <ContractStatusMenu contractId={c.id} status={c.status} />
                </td>
                <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                  <EntityActionsMenu
                    archived={archived}
                    entityName={c.projectName ?? c.company}
                    archiveAction={() => archiveContract(c.id)}
                    unarchiveAction={() => unarchiveContract(c.id)}
                    deleteAction={() => deleteContract(c.id)}
                    onChanged={() => router.refresh()}
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
