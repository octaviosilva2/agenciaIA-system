'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { Inbox, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { EntityBadge } from '@/components/ui/entity-badge'
import { Checkbox } from '@/components/ui/checkbox'
import { PeriodFilter } from '@/components/period-filter'
import { usePeriodDates } from '@/components/period-filter'
import { NewAccountDialog } from '@/components/finance/new-account-dialog'
import { EditAccountDialog } from '@/components/finance/edit-account-dialog'
import {
  toggleChargePaid,
  togglePayablePaid,
  createCharges,
  createPayables,
  updateCharge,
  updatePayable,
  deleteCharge,
  deletePayable,
} from '@/lib/actions/finance'
import {
  CHARGE_STATUS,
  CHARGE_OVERDUE,
  NEW_PAYABLE_CATEGORY_LABELS,
  formatCurrency,
  formatDate,
  isOverdue,
  type MockPayableCategory,
} from '@/lib/format'

import type { Charge, AccountPayable, AccountRow } from '@/lib/queries/finance'

type Tab = 'todos' | 'receber' | 'pagar'
type ReceberFilter = 'todos' | 'manutencao' | 'projetos' | 'manual'
type PagarFilter = 'todos' | MockPayableCategory
type StatusFilter = 'todos' | 'pago' | 'vencido' | 'pendente'

const RECEBER_FILTERS: Array<{ id: ReceberFilter; label: string }> = [
  { id: 'todos', label: 'Todos' },
  { id: 'manutencao', label: 'Manutenção' },
  { id: 'projetos', label: 'Projetos' },
  { id: 'manual', label: 'Manual' },
]

const PAGAR_FILTERS: Array<{ id: PagarFilter; label: string }> = [
  { id: 'todos', label: 'Todos' },
  { id: 'fixo', label: NEW_PAYABLE_CATEGORY_LABELS.fixo },
  { id: 'variavel', label: NEW_PAYABLE_CATEGORY_LABELS.variavel },
  { id: 'imposto', label: NEW_PAYABLE_CATEGORY_LABELS.imposto },
]

// Filtro de baixa, disponível nas abas A Receber e A Pagar.
const STATUS_FILTERS: Array<{ id: StatusFilter; label: string }> = [
  { id: 'todos', label: 'Todos' },
  { id: 'pago', label: 'Pago' },
  { id: 'vencido', label: 'Vencido' },
  { id: 'pendente', label: 'Pendente' },
]

/** Verdadeiro se a linha bate com o filtro de baixa selecionado. */
function matchesStatus(row: AccountRow, f: StatusFilter): boolean {
  if (f === 'todos') return true
  const { status, due_date } = row.data
  if (f === 'pago') return status === 'pago'
  if (f === 'vencido') return status === 'pendente' && isOverdue(due_date)
  return status === 'pendente' && !isOverdue(due_date) // 'pendente' (a vencer)
}

const mainSegCls = (active: boolean) =>
  `flex h-8 items-center gap-1.5 rounded-[6px] px-2.5 text-sm font-medium transition-colors cursor-pointer ${
    active
      ? 'bg-primary text-primary-foreground'
      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
  }`

const subSegCls = (active: boolean) =>
  `flex h-7 cursor-pointer items-center rounded-md px-2.5 text-xs font-medium transition-colors ${
    active ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent/70 hover:text-foreground'
  }`

function rowDueDate(row: AccountRow): string {
  return row.data.due_date
}

/**
 * Tela unificada de Contas (A Receber + A Pagar).
 * Dados vêm do servidor (getAccounts) via props; mutações são server actions
 * (lib/actions/finance) e a tela atualiza por revalidação. Layout intocado.
 */
export function AccountsView({
  initialCharges,
  initialPayables,
  initialTab = 'todos',
}: {
  initialCharges: Charge[]
  initialPayables: AccountPayable[]
  initialTab?: Tab
}) {
  // Dados vêm do servidor via props; cada mutação chama uma server action e o
  // revalidatePath re-renderiza esta tela com os dados atualizados.
  const charges = initialCharges
  const payables = initialPayables
  const [tab, setTab] = useState<Tab>(initialTab)
  const [receberFilter, setReceberFilter] = useState<ReceberFilter>('todos')
  const [pagarFilter, setPagarFilter] = useState<PagarFilter>('todos')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos')
  const [editingRow, setEditingRow] = useState<AccountRow | null>(null)
  const [, startTransition] = useTransition()
  const { from, to } = usePeriodDates()

  function changeTab(t: Tab) {
    setTab(t)
    setReceberFilter('todos')
    setPagarFilter('todos')
    setStatusFilter('todos')
  }

  // --- Mutações (server actions + toast). O estado atualiza por revalidação. ---

  /** Roda uma action, mostra o toast do resultado e executa onSuccess se ok. */
  function run(
    action: () => Promise<{ success: boolean; message: string }>,
    onSuccess?: () => void,
  ) {
    startTransition(async () => {
      const res = await action()
      if (res.success) {
        toast.success(res.message)
        onSuccess?.()
      } else {
        toast.error(res.message)
      }
    })
  }

  function handleToggleCharge(id: string, current: Charge['status']) {
    run(() => toggleChargePaid(id, current !== 'pago'))
  }

  function handleTogglePayable(id: string, current: AccountPayable['status']) {
    run(() => togglePayablePaid(id, current !== 'pago'))
  }

  function addCharges(newCharges: Charge[]) {
    run(() => createCharges(newCharges))
  }

  function addPayables(newPayables: AccountPayable[]) {
    run(() => createPayables(newPayables))
  }

  function handleDeleteCharge(id: string) {
    run(() => deleteCharge(id))
  }

  function handleDeletePayable(id: string) {
    run(() => deletePayable(id))
  }

  function handleUpdateCharge(id: string, data: Partial<Charge>) {
    run(
      () =>
        updateCharge(id, {
          description: data.description ?? '',
          amount: data.amount ?? 0,
          due_date: data.due_date ?? '',
          method: data.method ?? null,
        }),
      () => setEditingRow(null),
    )
  }

  function handleUpdatePayable(id: string, data: Partial<AccountPayable>) {
    run(
      () =>
        updatePayable(id, {
          description: data.description ?? '',
          amount: data.amount ?? 0,
          due_date: data.due_date ?? '',
          category: data.category ?? 'fixo',
          supplier: data.supplier ?? null,
        }),
      () => setEditingRow(null),
    )
  }

  // --- Linhas filtradas (aba + sub-filtro + período), ordenadas por vencimento ---
  const rows = useMemo<AccountRow[]>(() => {
    let receivable: AccountRow[] = charges.map((data) => ({ type: 'receber', data }))
    let payable: AccountRow[] = payables.map((data) => ({ type: 'pagar', data }))

    // Sub-filtro de A Receber
    if (tab === 'receber' && receberFilter !== 'todos') {
      receivable = receivable.filter((row) => {
        if (row.type !== 'receber') return false
        if (receberFilter === 'manutencao') return row.data.kind === 'recorrencia'
        if (receberFilter === 'projetos') return row.data.kind === 'setup'
        if (receberFilter === 'manual') return row.data.kind === 'avulso'
        return true
      })
    }

    // Sub-filtro de A Pagar
    if (tab === 'pagar' && pagarFilter !== 'todos') {
      payable = payable.filter((row) => {
        if (row.type !== 'pagar') return false
        return row.data.category === pagarFilter
      })
    }

    let all: AccountRow[]
    if (tab === 'receber') all = receivable
    else if (tab === 'pagar') all = payable
    else all = [...receivable, ...payable]

    // Filtro de baixa (pago/vencido/pendente) — só nas abas A Receber e A Pagar
    if ((tab === 'receber' || tab === 'pagar') && statusFilter !== 'todos') {
      all = all.filter((row) => matchesStatus(row, statusFilter))
    }

    // Filtro por período de vencimento
    const filtered = all.filter((row) => {
      if (!from && !to) return true
      const due = new Date(rowDueDate(row))
      due.setHours(0, 0, 0, 0)
      if (from && due < from) return false
      if (to && due > to) return false
      return true
    })

    return filtered.sort(
      (a, b) => new Date(rowDueDate(a)).getTime() - new Date(rowDueDate(b)).getTime(),
    )
  }, [charges, payables, tab, receberFilter, pagarFilter, statusFilter, from, to])

  const emptyMessage = 'Nenhuma conta neste filtro'
  const emptyHint = 'Lance uma conta a receber ou a pagar clicando em + Nova conta.'

  // Rótulo da coluna de baixa muda com a aba ativa
  const baixaLabel = tab === 'pagar' ? 'Pago' : tab === 'receber' ? 'Recebido' : 'Baixa'

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Contas</h2>
          <p className="text-sm text-muted-foreground">
            Contas a receber e a pagar em uma só visão.
          </p>
        </div>
        <NewAccountDialog onCreateCharges={addCharges} onCreatePayables={addPayables} />
      </header>

      {/* Filtros: abas principais + período */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center rounded-md border border-border bg-card p-0.5">
          <button type="button" onClick={() => changeTab('todos')} aria-pressed={tab === 'todos'} className={mainSegCls(tab === 'todos')}>
            Todos
          </button>
          <button type="button" onClick={() => changeTab('receber')} aria-pressed={tab === 'receber'} className={mainSegCls(tab === 'receber')}>
            A Receber
          </button>
          <button type="button" onClick={() => changeTab('pagar')} aria-pressed={tab === 'pagar'} className={mainSegCls(tab === 'pagar')}>
            A Pagar
          </button>
        </div>
        <div className="ml-auto">
          <PeriodFilter />
        </div>
      </div>

      {/* Sub-filtros (aparecem só quando uma aba específica está ativa) */}
      {tab === 'receber' && (
        <div className="flex flex-wrap items-center gap-1">
          {RECEBER_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setReceberFilter(f.id)}
              className={subSegCls(receberFilter === f.id)}
            >
              {f.label}
            </button>
          ))}
          <StatusFilterGroup value={statusFilter} onChange={setStatusFilter} />
        </div>
      )}
      {tab === 'pagar' && (
        <div className="flex flex-wrap items-center gap-1">
          {PAGAR_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setPagarFilter(f.id)}
              className={subSegCls(pagarFilter === f.id)}
            >
              {f.label}
            </button>
          ))}
          <StatusFilterGroup value={statusFilter} onChange={setStatusFilter} />
        </div>
      )}

      {/* Tabela densa */}
      {rows.length === 0 && <EmptyState message={emptyMessage} hint={emptyHint} />}
      {rows.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 font-medium">Descrição</th>
                <th className="px-3 py-2 text-right font-medium">Valor</th>
                <th className="px-3 py-2 font-medium">Vencimento</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="w-28 px-3 py-2 font-medium">{baixaLabel}</th>
                <th className="w-20 px-3 py-2 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <AccountTableRow
                  key={`${row.type}-${row.data.id}`}
                  row={row}
                  showType={tab === 'todos'}
                  onTogglePaid={
                    row.type === 'receber'
                      ? () => handleToggleCharge(row.data.id, row.data.status)
                      : () => handleTogglePayable(row.data.id, row.data.status)
                  }
                  onEdit={() => setEditingRow(row)}
                  onDelete={
                    row.type === 'receber'
                      ? () => handleDeleteCharge(row.data.id)
                      : () => handleDeletePayable(row.data.id)
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialog de edição — só monta quando há uma linha selecionada */}
      {editingRow && (
        <EditAccountDialog
          row={editingRow}
          onClose={() => setEditingRow(null)}
          onSaveCharge={handleUpdateCharge}
          onSavePayable={handleUpdatePayable}
        />
      )}
    </div>
  )
}

/** Uma linha do extrato unificado. */
function AccountTableRow({
  row,
  onTogglePaid,
  onEdit,
  onDelete,
  showType = false,
}: {
  row: AccountRow
  onTogglePaid: () => void
  onEdit: () => void
  onDelete: () => void
  showType?: boolean
}) {
  const { type, data } = row
  const paid = data.status === 'pago'
  const canceled = data.status === 'cancelado'
  const overdue = data.status === 'pendente' && isOverdue(data.due_date)

  // Subtítulo do fornecedor aparece quando NÃO estamos em showType (aba A Pagar)
  const supplierLabel =
    !showType && type === 'pagar' ? (row.data as AccountPayable).supplier : null

  // Origem da cobrança (projeto/contrato) com link para a tela de origem — só A Receber.
  const originLabel = type === 'receber' ? (data as Charge).origin_label : null
  const originHref = type === 'receber' ? (data as Charge).origin_href : null

  const amountLabel =
    type === 'pagar' ? `− ${formatCurrency(data.amount)}` : formatCurrency(data.amount)

  return (
    <tr className="h-9 border-b border-border last:border-0 hover:bg-accent">
      {/* Descrição + indicador de tipo (em Todos/Vencidos) ou fornecedor (em A Pagar) */}
      <td className="px-3 py-2">
        <p className="font-medium leading-tight">{data.description}</p>
        {showType && (
          <p
            className={`text-xs font-medium ${
              type === 'receber'
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {type === 'receber' ? '↑ A receber' : '↓ A pagar'}
          </p>
        )}
        {supplierLabel && (
          <p className="text-xs text-muted-foreground">{supplierLabel}</p>
        )}
        {originLabel &&
          (originHref ? (
            <Link
              href={originHref}
              className="text-xs text-muted-foreground transition-colors hover:text-foreground hover:underline"
            >
              {originLabel}
            </Link>
          ) : (
            <p className="text-xs text-muted-foreground">{originLabel}</p>
          ))}
      </td>

      {/* Valor — verde para receber, vermelho para pagar */}
      <td
        className={`px-3 py-2 text-right font-mono tabular-nums ${
          type === 'pagar'
            ? 'text-red-600 dark:text-red-400'
            : 'text-green-600 dark:text-green-400'
        }`}
      >
        {amountLabel}
      </td>

      {/* Vencimento — vermelho quando atrasada */}
      <td
        className={`px-3 py-2 ${
          overdue ? 'font-medium text-red-600 dark:text-red-400' : 'text-muted-foreground'
        }`}
      >
        {formatDate(data.due_date)}
      </td>

      {/* Status — badge (com "Vencido" quando aplicável) */}
      <td className="px-3 py-2">
        <EntityBadge meta={overdue ? CHARGE_OVERDUE : CHARGE_STATUS[data.status]} />
      </td>

      {/* Checkbox de baixa inline — some quando cancelada */}
      <td className="px-3 py-2">
        {canceled ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : (
          <label className="flex cursor-pointer items-center gap-2">
            <Checkbox
              checked={paid}
              onCheckedChange={onTogglePaid}
              aria-label={type === 'pagar' ? 'Marcar como pago' : 'Marcar como recebido'}
            />
            <span className="text-xs text-muted-foreground">
              {type === 'pagar' ? 'Pago' : 'Recebido'}
            </span>
          </label>
        )}
      </td>

      {/* Ações: editar + excluir */}
      <td className="px-3 py-2">
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={onEdit}
            className="cursor-pointer rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Editar conta"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="cursor-pointer rounded p-1 text-muted-foreground transition-colors hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-500/15 dark:hover:text-red-400"
            aria-label="Excluir conta"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  )
}

/** Filtro de baixa (pago/vencido/pendente) — usado nas abas A Receber e A Pagar. */
function StatusFilterGroup({
  value,
  onChange,
}: {
  value: StatusFilter
  onChange: (v: StatusFilter) => void
}) {
  return (
    <div className="ml-auto flex items-center gap-1">
      <span className="mr-1 text-xs text-muted-foreground">Baixa:</span>
      {STATUS_FILTERS.map((f) => (
        <button
          key={f.id}
          type="button"
          onClick={() => onChange(f.id)}
          className={subSegCls(value === f.id)}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}

function EmptyState({ message, hint }: { message: string; hint: string }) {
  return (
    <div className="grid place-items-center rounded-lg border border-dashed border-border bg-card p-10 text-center">
      <Inbox className="h-6 w-6 text-muted-foreground/50" />
      <p className="mt-2 text-sm font-medium">{message}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}
