'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { Inbox, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { EntityBadge } from '@/components/ui/entity-badge'
import { Checkbox } from '@/components/ui/checkbox'
import { PeriodFilter, usePeriodDates } from '@/components/period-filter'
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
import { parseDateOnly } from '@/lib/date-range'

import type { Charge, AccountPayable, AccountRow } from '@/lib/queries/finance'

// Abas: A Receber/A Pagar = pendentes (a vencer/atrasadas); Receita/Despesa = pagos.
type Tab = 'receber' | 'pagar' | 'receita' | 'despesa'
type KindFilter = 'todos' | 'manutencao' | 'projetos' | 'manual'
type CategoryFilter = 'todos' | MockPayableCategory
type SituacaoFilter = 'todos' | 'vencido' | 'a_vencer'

const MAIN_TABS: Array<{ id: Tab; label: string }> = [
  { id: 'receber', label: 'A Receber' },
  { id: 'pagar', label: 'A Pagar' },
  { id: 'receita', label: 'Receita' },
  { id: 'despesa', label: 'Despesa' },
]

// Sub-filtro por tipo de cobrança (abas A Receber + Receita).
const KIND_FILTERS: Array<{ id: KindFilter; label: string }> = [
  { id: 'todos', label: 'Todos' },
  { id: 'projetos', label: 'Implementação' },
  { id: 'manutencao', label: 'Manutenção' },
  { id: 'manual', label: 'Avulso' },
]

// Sub-filtro por categoria de despesa (abas A Pagar + Despesa).
const CATEGORY_FILTERS: Array<{ id: CategoryFilter; label: string }> = [
  { id: 'todos', label: 'Todos' },
  { id: 'fixo', label: NEW_PAYABLE_CATEGORY_LABELS.fixo },
  { id: 'variavel', label: NEW_PAYABLE_CATEGORY_LABELS.variavel },
  { id: 'imposto', label: NEW_PAYABLE_CATEGORY_LABELS.imposto },
]

// Filtro de situação (só nas abas de pendentes): vencidas × a vencer.
const SITUACAO_FILTERS: Array<{ id: SituacaoFilter; label: string }> = [
  { id: 'todos', label: 'Todos' },
  { id: 'vencido', label: 'Vencido' },
  { id: 'a_vencer', label: 'A vencer' },
]

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

/**
 * Tela unificada de Contas. Quatro abas: A Receber/A Pagar (pendentes, inclui
 * vencidas) e Receita/Despesa (pagos). Dados vêm do servidor (getAccounts);
 * mutações são server actions e a tela atualiza por revalidação.
 */
export function AccountsView({
  initialCharges,
  initialPayables,
  initialTab = 'receber',
}: {
  initialCharges: Charge[]
  initialPayables: AccountPayable[]
  initialTab?: Tab
}) {
  const charges = initialCharges
  const payables = initialPayables
  const [tab, setTab] = useState<Tab>(initialTab)
  const [kindFilter, setKindFilter] = useState<KindFilter>('todos')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('todos')
  const [situacaoFilter, setSituacaoFilter] = useState<SituacaoFilter>('todos')
  const [editingRow, setEditingRow] = useState<AccountRow | null>(null)
  const [, startTransition] = useTransition()
  const { from, to } = usePeriodDates()

  // Recortes da aba ativa.
  const isReceivable = tab === 'receber' || tab === 'receita'
  const isPending = tab === 'receber' || tab === 'pagar'

  function changeTab(t: Tab) {
    setTab(t)
    setKindFilter('todos')
    setCategoryFilter('todos')
    setSituacaoFilter('todos')
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

  // --- Linhas filtradas (aba + sub-filtro + situação + período), por vencimento ---
  const rows = useMemo<AccountRow[]>(() => {
    // Base: tipo (receber/pagar) + status (pendente nas abas de pendentes; pago nas de realizado).
    const wantStatus = isPending ? 'pendente' : 'pago'
    let base: AccountRow[] = isReceivable
      ? charges.filter((c) => c.status === wantStatus).map((data) => ({ type: 'receber', data }))
      : payables.filter((p) => p.status === wantStatus).map((data) => ({ type: 'pagar', data }))

    // Sub-filtro por tipo de cobrança (A Receber + Receita).
    if (isReceivable && kindFilter !== 'todos') {
      base = base.filter((row) => {
        const k = (row.data as Charge).kind
        if (kindFilter === 'manutencao') return k === 'recorrencia'
        if (kindFilter === 'projetos') return k === 'setup'
        if (kindFilter === 'manual') return k === 'avulso'
        return true
      })
    }

    // Sub-filtro por categoria de despesa (A Pagar + Despesa).
    if (!isReceivable && categoryFilter !== 'todos') {
      base = base.filter((row) => (row.data as AccountPayable).category === categoryFilter)
    }

    // Situação (só nas abas de pendentes): vencido × a vencer.
    if (isPending && situacaoFilter !== 'todos') {
      base = base.filter((row) => {
        const overdue = isOverdue(row.data.due_date)
        return situacaoFilter === 'vencido' ? overdue : !overdue
      })
    }

    // Filtro por período de vencimento (date-only sem deslocar dia).
    const filtered = base.filter((row) => {
      if (!from && !to) return true
      const due = parseDateOnly(row.data.due_date)
      if (from && due < from) return false
      if (to && due > to) return false
      return true
    })

    // yyyy-MM-dd ordena lexicalmente = cronologicamente.
    return filtered.sort((a, b) => a.data.due_date.localeCompare(b.data.due_date))
  }, [charges, payables, isReceivable, isPending, kindFilter, categoryFilter, situacaoFilter, from, to])

  const emptyMessage = 'Nenhuma conta neste filtro'
  const emptyHint = 'Lance uma conta a receber ou a pagar clicando em + Nova conta.'

  // Rótulo da coluna de baixa muda com a aba ativa.
  const baixaLabel = isReceivable ? 'Recebido' : 'Pago'

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Contas</h2>
          <p className="text-sm text-muted-foreground">
            A receber e a pagar (pendentes) · Receita e Despesa (já realizado).
          </p>
        </div>
        <NewAccountDialog onCreateCharges={addCharges} onCreatePayables={addPayables} />
      </header>

      {/* Filtros: abas principais + período */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center rounded-md border border-border bg-card p-0.5">
          {MAIN_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => changeTab(t.id)}
              aria-pressed={tab === t.id}
              className={mainSegCls(tab === t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="ml-auto">
          <PeriodFilter />
        </div>
      </div>

      {/* Sub-filtros da aba ativa */}
      <div className="flex flex-wrap items-center gap-1">
        {isReceivable
          ? KIND_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setKindFilter(f.id)}
                className={subSegCls(kindFilter === f.id)}
              >
                {f.label}
              </button>
            ))
          : CATEGORY_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setCategoryFilter(f.id)}
                className={subSegCls(categoryFilter === f.id)}
              >
                {f.label}
              </button>
            ))}
        {/* Situação (vencido × a vencer) só nas abas de pendentes */}
        {isPending && (
          <div className="ml-auto flex items-center gap-1">
            <span className="mr-1 text-xs text-muted-foreground">Situação:</span>
            {SITUACAO_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSituacaoFilter(f.id)}
                className={subSegCls(situacaoFilter === f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

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

/** Uma linha do extrato. */
function AccountTableRow({
  row,
  onTogglePaid,
  onEdit,
  onDelete,
}: {
  row: AccountRow
  onTogglePaid: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const { type, data } = row
  const paid = data.status === 'pago'
  const canceled = data.status === 'cancelado'
  const overdue = data.status === 'pendente' && isOverdue(data.due_date)

  // Fornecedor (A Pagar/Despesa) ou origem (A Receber/Receita) como subtítulo.
  const supplierLabel = type === 'pagar' ? (data as AccountPayable).supplier : null
  const originLabel = type === 'receber' ? (data as Charge).origin_label : null
  const originHref = type === 'receber' ? (data as Charge).origin_href : null

  const amountLabel =
    type === 'pagar' ? `− ${formatCurrency(data.amount)}` : formatCurrency(data.amount)

  return (
    <tr className="h-9 border-b border-border last:border-0 hover:bg-accent">
      <td className="px-3 py-2">
        <p className="font-medium leading-tight">{data.description}</p>
        {supplierLabel && <p className="text-xs text-muted-foreground">{supplierLabel}</p>}
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

function EmptyState({ message, hint }: { message: string; hint: string }) {
  return (
    <div className="grid place-items-center rounded-lg border border-dashed border-border bg-card p-10 text-center">
      <Inbox className="h-6 w-6 text-muted-foreground/50" />
      <p className="mt-2 text-sm font-medium">{message}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}
