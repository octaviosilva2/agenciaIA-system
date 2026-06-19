'use client'

import { useMemo, useState } from 'react'
import { Inbox, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { EntityBadge } from '@/components/ui/entity-badge'
import { Checkbox } from '@/components/ui/checkbox'
import { PeriodFilter } from '@/components/period-filter'
import { usePeriodDates } from '@/components/period-filter'
import { NewAccountDialog } from '@/components/finance/new-account-dialog'
import { EditAccountDialog } from '@/components/finance/edit-account-dialog'
import {
  CHARGE_STATUS,
  CHARGE_OVERDUE,
  NEW_PAYABLE_CATEGORY_LABELS,
  formatCurrency,
  formatDate,
  isOverdue,
  type MockPayableCategory,
} from '@/lib/format'

import type { Charge, AccountPayable, AccountRow } from '@/lib/mock/finance'

// Taxa de imposto aplicada automaticamente ao marcar uma receita como recebida.
// TODO: virá de org_settings quando o backend for ligado.
const AUTO_TAX_RATE = 13 // percentual

type Tab = 'todos' | 'receber' | 'pagar' | 'vencidos'
type ReceberFilter = 'todos' | 'manutencao' | 'projetos' | 'manual'
type PagarFilter = 'todos' | MockPayableCategory

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
 * MOCK: parte do estado inicial vindo do mock e muta só em memória.
 * Quando o backend chegar, troque o estado inicial por dados de query e os
 * handlers por server actions — o layout não muda.
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
  const [charges, setCharges] = useState<Charge[]>(initialCharges)
  const [payables, setPayables] = useState<AccountPayable[]>(initialPayables)
  const [tab, setTab] = useState<Tab>(initialTab)
  const [receberFilter, setReceberFilter] = useState<ReceberFilter>('todos')
  const [pagarFilter, setPagarFilter] = useState<PagarFilter>('todos')
  const [editingRow, setEditingRow] = useState<AccountRow | null>(null)
  const { from, to } = usePeriodDates()

  function changeTab(t: Tab) {
    setTab(t)
    setReceberFilter('todos')
    setPagarFilter('todos')
  }

  // --- Mutações MOCK (estado local + toast) ---

  function toggleChargePaid(id: string) {
    const charge = charges.find((c) => c.id === id)
    if (!charge) return
    const willBePaid = charge.status !== 'pago'

    setCharges((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c
        return willBePaid
          ? { ...c, status: 'pago', paid_at: new Date().toISOString() }
          : { ...c, status: 'pendente', paid_at: null }
      }),
    )

    // Lança (ou remove) imposto automático ao marcar como recebido
    const taxId = `auto-tax-${id}`
    if (willBePaid) {
      setPayables((prev) => {
        if (prev.find((p) => p.id === taxId)) return prev // já existe
        const taxPayable: AccountPayable = {
          id: taxId,
          description: `Imposto (${AUTO_TAX_RATE}%) — ${charge.description}`,
          category: 'imposto',
          amount: charge.amount * (AUTO_TAX_RATE / 100),
          due_date: charge.due_date,
          status: 'pendente',
          paid_at: null,
          project_id: null,
          supplier: null,
          notes: null,
        }
        return [taxPayable, ...prev]
      })
      toast.success(`Recebido — imposto de ${AUTO_TAX_RATE}% lançado automaticamente.`)
    } else {
      setPayables((prev) => prev.filter((p) => p.id !== taxId))
      toast.success('Marcado como pendente.')
    }
  }

  function togglePayablePaid(id: string) {
    let nowPaid = false
    setPayables((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p
        nowPaid = p.status !== 'pago'
        return nowPaid
          ? { ...p, status: 'pago', paid_at: new Date().toISOString() }
          : { ...p, status: 'pendente', paid_at: null }
      }),
    )
    toast.success(nowPaid ? 'Pago' : 'Marcado como pendente')
  }

  function addCharges(newCharges: Charge[]) {
    setCharges((prev) => [...newCharges, ...prev])
  }

  function addPayables(newPayables: AccountPayable[]) {
    setPayables((prev) => [...newPayables, ...prev])
  }

  function deleteCharge(id: string) {
    setCharges((prev) => prev.filter((c) => c.id !== id))
    toast.success('Conta removida.')
  }

  function deletePayable(id: string) {
    setPayables((prev) => prev.filter((p) => p.id !== id))
    toast.success('Conta removida.')
  }

  function updateCharge(id: string, data: Partial<Charge>) {
    setCharges((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)))
    setEditingRow(null)
    toast.success('Conta atualizada.')
  }

  function updatePayable(id: string, data: Partial<AccountPayable>) {
    setPayables((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)))
    setEditingRow(null)
    toast.success('Conta atualizada.')
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
    else if (tab === 'vencidos') {
      // Tudo pendente e com due_date no passado (A Receber + A Pagar)
      all = [...receivable, ...payable].filter(
        (row) => row.data.status === 'pendente' && isOverdue(row.data.due_date),
      )
    } else all = [...receivable, ...payable]

    // Filtro por período de vencimento — não aplica em Vencidos (já são todos os vencidos)
    const filtered =
      tab === 'vencidos'
        ? all
        : all.filter((row) => {
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
  }, [charges, payables, tab, receberFilter, pagarFilter, from, to])

  const emptyMessage = tab === 'vencidos' ? 'Nenhuma conta vencida' : 'Nenhuma conta neste filtro'
  const emptyHint =
    tab === 'vencidos'
      ? 'Tudo em dia! Nenhuma conta com prazo expirado.'
      : 'Lance uma conta a receber ou a pagar clicando em + Nova conta.'

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
          <button type="button" onClick={() => changeTab('vencidos')} aria-pressed={tab === 'vencidos'} className={mainSegCls(tab === 'vencidos')}>
            Vencidos
          </button>
        </div>
        {tab !== 'vencidos' && (
          <div className="ml-auto">
            <PeriodFilter />
          </div>
        )}
      </div>

      {/* Sub-filtros (aparecem só quando uma aba específica está ativa) */}
      {tab === 'receber' && (
        <div className="flex items-center gap-1">
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
        </div>
      )}
      {tab === 'pagar' && (
        <div className="flex items-center gap-1">
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
                  showType={tab === 'vencidos' || tab === 'todos'}
                  onTogglePaid={
                    row.type === 'receber'
                      ? () => toggleChargePaid(row.data.id)
                      : () => togglePayablePaid(row.data.id)
                  }
                  onEdit={() => setEditingRow(row)}
                  onDelete={
                    row.type === 'receber'
                      ? () => deleteCharge(row.data.id)
                      : () => deletePayable(row.data.id)
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
          onSaveCharge={updateCharge}
          onSavePayable={updatePayable}
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
