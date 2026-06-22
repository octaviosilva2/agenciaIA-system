'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, ChevronDown } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { formatCurrency, type MockPayableCategory } from '@/lib/format'
import type { AccountPayable, Charge } from '@/lib/queries/finance'

// --- Tipos ---

type KpiPeriod = 'todos' | 'hoje' | 'semana' | 'mes' | 'personalizado'
type ChartMode = 'receita' | 'despesa' | 'lucro'

type ChartGranularity =
  | 'ano'
  | 'sem1'
  | 'sem2'
  | 'q1'
  | 'q2'
  | 'q3'
  | 'q4'
  | 'mensal'
  | 'semanal'
  | 'diario'

type ChartBar = { label: string; paid: number; overdue: number; upcoming: number }
type ProfitBar = { label: string; value: number }
type ChargeKind = 'recorrencia' | 'avulso' | 'setup'
type BarItem = { status: string; due_date: string; amount: number }

// --- Constantes ---

const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const CHART_MAX_H = 160

const CHART_GRAN_LABELS: Record<ChartGranularity, string> = {
  ano: 'Ano',
  sem1: '1° Sem.',
  sem2: '2° Sem.',
  q1: 'Q1',
  q2: 'Q2',
  q3: 'Q3',
  q4: 'Q4',
  mensal: 'Mensal',
  semanal: 'Semanal',
  diario: 'Diário',
}

const CHART_PRIMARY: ChartGranularity[] = ['ano', 'mensal']
const CHART_EXTRA: ChartGranularity[] = ['sem1', 'sem2', 'q1', 'q2', 'q3', 'q4', 'semanal', 'diario']

const KPI_PERIOD_OPTS: Array<{ id: KpiPeriod; label: string }> = [
  { id: 'todos', label: 'Todos' },
  { id: 'hoje', label: 'Hoje' },
  { id: 'semana', label: 'Semana' },
  { id: 'mes', label: 'Mês' },
  { id: 'personalizado', label: 'Personalizado' },
]

const REVENUE_FILTERS: Array<{ id: ChargeKind; label: string }> = [
  { id: 'recorrencia', label: 'Manutenção' },
  { id: 'avulso', label: 'Avulso' },
  { id: 'setup', label: 'Implementação' },
]

const EXPENSE_FILTERS: Array<{ id: MockPayableCategory; label: string }> = [
  { id: 'fixo', label: 'Fixo' },
  { id: 'variavel', label: 'Variável' },
  { id: 'imposto', label: 'Imposto' },
]

// --- Helpers ---

function getKpiRange(period: KpiPeriod): { from: Date | null; to: Date | null } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  switch (period) {
    case 'hoje':
      return { from: today, to: today }
    case 'semana': {
      const from = new Date(today)
      from.setDate(today.getDate() - ((today.getDay() + 6) % 7))
      const to = new Date(from)
      to.setDate(from.getDate() + 6)
      return { from, to }
    }
    case 'mes': {
      const from = new Date(today.getFullYear(), today.getMonth(), 1)
      const to = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      return { from, to }
    }
    default:
      return { from: null, to: null }
  }
}

function inRange(date: string, from: Date | null, to: Date | null): boolean {
  if (!from && !to) return true
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  if (from && d < from) return false
  if (to && d > to) return false
  return true
}

/** Agrega itens em barras empilhadas para o nível de granularidade. */
function computeBars(items: BarItem[], granularity: ChartGranularity): ChartBar[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const year = today.getFullYear()
  const month = today.getMonth()

  type Period = { label: string; from: Date; to: Date }
  const mp = (m: number): Period => ({
    label: MONTHS_PT[m],
    from: new Date(year, m, 1),
    to: new Date(year, m + 1, 0),
  })

  let periods: Period[]
  switch (granularity) {
    case 'ano':
      periods = Array.from({ length: 12 }, (_, i) => mp(i))
      break
    case 'sem1':
      periods = Array.from({ length: 6 }, (_, i) => mp(i))
      break
    case 'sem2':
      periods = Array.from({ length: 6 }, (_, i) => mp(6 + i))
      break
    case 'q1':
      periods = [mp(0), mp(1), mp(2)]
      break
    case 'q2':
      periods = [mp(3), mp(4), mp(5)]
      break
    case 'q3':
      periods = [mp(6), mp(7), mp(8)]
      break
    case 'q4':
      periods = [mp(9), mp(10), mp(11)]
      break
    case 'mensal': {
      const monthStart = new Date(year, month, 1)
      const monthEnd = new Date(year, month + 1, 0)
      const weeks: Period[] = []
      let cursor = new Date(monthStart)
      let wn = 1
      while (cursor <= monthEnd) {
        const weekEnd = new Date(cursor)
        weekEnd.setDate(cursor.getDate() + 6)
        if (weekEnd > monthEnd) weekEnd.setTime(monthEnd.getTime())
        weeks.push({ label: `Sem ${wn}`, from: new Date(cursor), to: new Date(weekEnd) })
        cursor = new Date(weekEnd)
        cursor.setDate(cursor.getDate() + 1)
        wn++
      }
      periods = weeks
      break
    }
    case 'semanal': {
      const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
      const mon = new Date(today)
      mon.setDate(today.getDate() - ((today.getDay() + 6) % 7))
      periods = Array.from({ length: 7 }, (_, i) => {
        const dd = new Date(mon)
        dd.setDate(mon.getDate() + i)
        return { label: DAYS[i], from: dd, to: dd }
      })
      break
    }
    case 'diario':
      periods = [{ label: 'Hoje', from: today, to: today }]
      break
  }

  return periods.map(({ label, from, to }) => {
    let paid = 0, overdue = 0, upcoming = 0
    for (const item of items) {
      if (item.status === 'cancelado') continue
      const due = new Date(item.due_date)
      due.setHours(0, 0, 0, 0)
      if (due < from || due > to) continue
      if (item.status === 'pago') paid += item.amount
      else if (due < today) overdue += item.amount
      else upcoming += item.amount
    }
    return { label, paid, overdue, upcoming }
  })
}

/** Calcula lucro por período: receita total − despesa total. */
function computeProfitBars(
  charges: BarItem[],
  payables: BarItem[],
  granularity: ChartGranularity,
): ProfitBar[] {
  const rev = computeBars(charges, granularity)
  const exp = computeBars(payables, granularity)
  return rev.map((r, i) => ({
    label: r.label,
    value:
      r.paid + r.overdue + r.upcoming - (exp[i].paid + exp[i].overdue + exp[i].upcoming),
  }))
}

/** Formata valor compacto para rótulos (ex.: 1800 → "1,8k"). */
function compactAmount(value: number): string {
  if (value === 0) return ''
  if (value < 1000) return String(Math.round(value))
  const k = Math.round((value / 1000) * 10) / 10
  return k % 1 === 0 ? `${k}k` : `${k.toFixed(1).replace('.', ',')}k`
}

// --- Componente principal ---

type Props = { allCharges: Charge[]; allPayables: AccountPayable[] }

export function FinanceiroView({ allCharges, allPayables }: Props) {
  const [kpiPeriod, setKpiPeriod] = useState<KpiPeriod>('mes')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [chartMode, setChartMode] = useState<ChartMode>('receita')
  const [chartGran, setChartGran] = useState<ChartGranularity>('ano')
  const [activeKinds, setActiveKinds] = useState<Set<ChargeKind>>(
    new Set(['recorrencia', 'avulso', 'setup']),
  )
  const [activeCategories, setActiveCategories] = useState<Set<MockPayableCategory>>(
    new Set(['fixo', 'variavel', 'imposto']),
  )

  // --- Caixa total (sempre histórico completo) ---
  const totalCaixa = useMemo(() => {
    const received = allCharges.filter((c) => c.status === 'pago').reduce((s, c) => s + c.amount, 0)
    const paid = allPayables.filter((p) => p.status === 'pago').reduce((s, p) => s + p.amount, 0)
    return received - paid
  }, [allCharges, allPayables])

  // --- KPIs do período ---
  const kpis = useMemo(() => {
    let from: Date | null, to: Date | null
    if (kpiPeriod === 'personalizado') {
      from = customFrom ? new Date(customFrom) : null
      to = customTo ? new Date(customTo) : null
      if (from) from.setHours(0, 0, 0, 0)
      if (to) to.setHours(0, 0, 0, 0)
    } else {
      ;({ from, to } = getKpiRange(kpiPeriod))
    }
    const charges = allCharges.filter((c) => c.status !== 'cancelado' && inRange(c.due_date, from, to))
    const payables = allPayables.filter((p) => p.status !== 'cancelado' && inRange(p.due_date, from, to))
    // Receita/despesa do período = só o CONFIRMADO (pago). O pendente/vencido fica
    // em "a receber"/"a pagar". Assim o lucro reflete a variação de caixa do período.
    const grossRevenue = charges.filter((c) => c.status === 'pago').reduce((s, c) => s + c.amount, 0)
    const totalExpenses = payables.filter((p) => p.status === 'pago').reduce((s, p) => s + p.amount, 0)
    return {
      grossRevenue,
      totalExpenses,
      profit: grossRevenue - totalExpenses,
      toReceive: charges.filter((c) => c.status === 'pendente').reduce((s, c) => s + c.amount, 0),
      toPay: payables.filter((p) => p.status === 'pendente').reduce((s, p) => s + p.amount, 0),
    }
  }, [allCharges, allPayables, kpiPeriod, customFrom, customTo])

  // --- Dados dos gráficos ---
  const filteredCharges = useMemo(
    () => allCharges.filter((c) => c.status !== 'cancelado' && activeKinds.has(c.kind)),
    [allCharges, activeKinds],
  )
  const filteredPayables = useMemo(
    () => allPayables.filter((p) => p.status !== 'cancelado' && activeCategories.has(p.category)),
    [allPayables, activeCategories],
  )

  // Barras do gráfico ativo
  const revBars = useMemo(() => computeBars(filteredCharges, chartGran), [filteredCharges, chartGran])
  const expBars = useMemo(() => computeBars(filteredPayables, chartGran), [filteredPayables, chartGran])

  // Lucro usa todos os itens não-cancelados (visão completa)
  const allActiveCharges = useMemo(() => allCharges.filter((c) => c.status !== 'cancelado'), [allCharges])
  const allActivePayables = useMemo(() => allPayables.filter((p) => p.status !== 'cancelado'), [allPayables])
  const lucroBars = useMemo(
    () => computeProfitBars(allActiveCharges, allActivePayables, chartGran),
    [allActiveCharges, allActivePayables, chartGran],
  )

  // --- Toggles de filtro ---
  const allKindsActive = activeKinds.size === REVENUE_FILTERS.length
  const allCatsActive = activeCategories.size === EXPENSE_FILTERS.length

  function toggleKind(kind: ChargeKind) {
    setActiveKinds((prev) => {
      const next = new Set(prev)
      if (next.has(kind)) next.delete(kind)
      else next.add(kind)
      return next
    })
  }

  function toggleAllKinds() {
    setActiveKinds(allKindsActive ? new Set() : new Set<ChargeKind>(['recorrencia', 'avulso', 'setup']))
  }

  function toggleCategory(cat: MockPayableCategory) {
    setActiveCategories((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  function toggleAllCategories() {
    setActiveCategories(allCatsActive ? new Set() : new Set<MockPayableCategory>(['fixo', 'variavel', 'imposto']))
  }

  const kpiBtnCls = (active: boolean) =>
    `flex h-7 cursor-pointer items-center rounded-md px-2.5 text-xs font-medium transition-colors ${
      active
        ? 'bg-primary text-primary-foreground'
        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
    }`

  const chartModeCls = (active: boolean) =>
    `flex h-8 flex-1 cursor-pointer items-center justify-center rounded-[6px] px-3 text-sm font-medium transition-colors ${
      active
        ? 'bg-primary text-primary-foreground'
        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
    }`

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <header>
        <h2 className="text-lg font-semibold tracking-tight">Visão geral financeira</h2>
        <p className="text-[13px] text-muted-foreground">Resumo consolidado de receitas e despesas</p>
      </header>

      {/* Caixa total */}
      <div
        className={`rounded-lg border p-5 ${
          totalCaixa >= 0
            ? 'border-green-200 bg-green-50 dark:border-green-500/20 dark:bg-green-500/5'
            : 'border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-500/5'
        }`}
      >
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Caixa total
        </p>
        <p
          className={`mt-1 font-mono text-3xl font-semibold tabular-nums tracking-tight ${
            totalCaixa >= 0
              ? 'text-green-700 dark:text-green-400'
              : 'text-red-700 dark:text-red-400'
          }`}
        >
          {formatCurrency(totalCaixa)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Saldo acumulado de tudo que entrou e saiu</p>
      </div>

      {/* KPIs */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1">
            {KPI_PERIOD_OPTS.map((opt) => (
              <button key={opt.id} type="button" onClick={() => setKpiPeriod(opt.id)} className={kpiBtnCls(kpiPeriod === opt.id)}>
                {opt.label}
              </button>
            ))}
          </div>
          {kpiPeriod === 'personalizado' && (
            <div className="flex items-center gap-1.5">
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="h-7 rounded-md border border-border bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-ring" />
              <span className="text-xs text-muted-foreground">–</span>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="h-7 rounded-md border border-border bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-ring" />
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Receita bruta" value={formatCurrency(kpis.grossRevenue)} hint="Recebido no período" />
          <StatCard label="Total despesas" value={formatCurrency(kpis.totalExpenses)} hint="Pago no período" />
          <StatCard label="Lucro" value={formatCurrency(kpis.profit)} hint="Entradas menos saídas" highlight={kpis.profit >= 0 ? 'positive' : 'negative'} />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <StatCard label="A receber" value={formatCurrency(kpis.toReceive)} hint="Cobranças pendentes" />
          <StatCard label="A pagar" value={formatCurrency(kpis.toPay)} hint="Contas pendentes" />
        </div>
      </div>

      {/* Gráfico unificado — Receita / Despesa / Lucro */}
      <div className="space-y-3 rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle de modo */}
          <div className="inline-flex items-center rounded-md border border-border bg-card p-0.5">
            <button type="button" onClick={() => setChartMode('receita')} className={chartModeCls(chartMode === 'receita')}>
              Receita
            </button>
            <button type="button" onClick={() => setChartMode('despesa')} className={chartModeCls(chartMode === 'despesa')}>
              Despesa
            </button>
            <button type="button" onClick={() => setChartMode('lucro')} className={chartModeCls(chartMode === 'lucro')}>
              Lucro
            </button>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <GranularitySelector value={chartGran} onChange={setChartGran} />
            {chartMode === 'receita' && (
              <Link href="/financeiro/contas?tab=receber" className="flex h-7 cursor-pointer items-center gap-1 rounded-md border border-border px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                Ver receitas <ArrowUpRight className="h-3 w-3" />
              </Link>
            )}
            {chartMode === 'despesa' && (
              <Link href="/financeiro/contas?tab=pagar" className="flex h-7 cursor-pointer items-center gap-1 rounded-md border border-border px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                Ver despesas <ArrowUpRight className="h-3 w-3" />
              </Link>
            )}
            {chartMode === 'lucro' && (
              <Link href="/financeiro/contas" className="flex h-7 cursor-pointer items-center gap-1 rounded-md border border-border px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                Ver contas <ArrowUpRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>

        {/* Receita */}
        {chartMode === 'receita' && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <CheckItem label="Total" checked={allKindsActive} onChange={toggleAllKinds} />
              {REVENUE_FILTERS.map((f) => (
                <CheckItem key={f.id} label={f.label} checked={activeKinds.has(f.id)} onChange={() => toggleKind(f.id)} />
              ))}
            </div>
            <ChartLegend />
            <StackedBarChart bars={revBars} />
          </>
        )}

        {/* Despesa */}
        {chartMode === 'despesa' && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <CheckItem label="Total" checked={allCatsActive} onChange={toggleAllCategories} />
              {EXPENSE_FILTERS.map((f) => (
                <CheckItem key={f.id} label={f.label} checked={activeCategories.has(f.id)} onChange={() => toggleCategory(f.id)} />
              ))}
            </div>
            <ChartLegend />
            <StackedBarChart bars={expBars} />
          </>
        )}

        {/* Lucro */}
        {chartMode === 'lucro' && (
          <>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-green-500/60 dark:bg-green-500/40" />
                Positivo
              </span>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-400/60 dark:bg-red-500/40" />
                Negativo
              </span>
            </div>
            <ProfitBarChart bars={lucroBars} />
          </>
        )}
      </div>
    </div>
  )
}

// --- Sub-componentes ---

function StatCard({
  label,
  value,
  hint,
  highlight,
}: {
  label: string
  value: string
  hint?: string
  highlight?: 'positive' | 'negative'
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={`mt-1 font-mono text-xl font-semibold tabular-nums ${
          highlight === 'positive'
            ? 'text-green-600 dark:text-green-400'
            : highlight === 'negative'
              ? 'text-red-600 dark:text-red-400'
              : ''
        }`}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function GranularitySelector({ value, onChange }: { value: ChartGranularity; onChange: (v: ChartGranularity) => void }) {
  const [open, setOpen] = useState(false)
  const isExtraActive = CHART_EXTRA.includes(value)

  const btnCls = (active: boolean) =>
    `flex h-7 cursor-pointer items-center rounded-md px-2.5 text-xs font-medium transition-colors ${
      active
        ? 'bg-primary text-primary-foreground'
        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
    }`

  return (
    <div className="flex items-center gap-1">
      {CHART_PRIMARY.map((g) => (
        <button key={g} type="button" onClick={() => onChange(g)} className={btnCls(value === g)}>
          {CHART_GRAN_LABELS[g]}
        </button>
      ))}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`flex h-7 cursor-pointer items-center gap-0.5 rounded-md px-2.5 text-xs font-medium transition-colors ${
            isExtraActive
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          }`}
        >
          {isExtraActive ? CHART_GRAN_LABELS[value] : '···'}
          <ChevronDown className="h-3 w-3 opacity-70" />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-[9]" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-full z-10 mt-1 min-w-[110px] rounded-md border border-border bg-popover p-1 shadow-md">
              {CHART_EXTRA.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => { onChange(g); setOpen(false) }}
                  className={`flex w-full cursor-pointer items-center rounded px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    value === g ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
                >
                  {CHART_GRAN_LABELS[g]}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function CheckItem({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-1.5">
      <Checkbox checked={checked} onCheckedChange={() => onChange()} />
      <span className="select-none text-xs font-medium text-muted-foreground">{label}</span>
    </label>
  )
}

function ChartLegend() {
  return (
    <div className="flex items-center gap-4">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="inline-block h-2.5 w-2.5 rounded-sm bg-primary/75" />
        Pago
      </span>
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-400/70 dark:bg-red-500/50" />
        Vencido
      </span>
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="inline-block h-2.5 w-2.5 rounded-sm bg-zinc-200 dark:bg-zinc-700/50" />
        A vencer
      </span>
    </div>
  )
}

function StackedBarChart({ bars }: { bars: ChartBar[] }) {
  const maxTotal = Math.max(...bars.map((b) => b.paid + b.overdue + b.upcoming), 1)
  return (
    <div className="flex items-end gap-1">
      {bars.map((bar, idx) => (
        <StackedBar key={`${bar.label}-${idx}`} bar={bar} maxTotal={maxTotal} />
      ))}
    </div>
  )
}

function StackedBar({ bar, maxTotal }: { bar: ChartBar; maxTotal: number }) {
  const [hovered, setHovered] = useState(false)
  const total = bar.paid + bar.overdue + bar.upcoming
  const barH = Math.max(Math.round((total / maxTotal) * CHART_MAX_H), total > 0 ? 4 : 2)
  const paidH = total > 0 ? Math.round((bar.paid / total) * barH) : 0
  const overdueH = total > 0 ? Math.round((bar.overdue / total) * barH) : 0
  const upcomingH = barH - paidH - overdueH

  return (
    <div className="flex flex-1 flex-col items-center gap-0.5">
      <span className="h-4 text-[10px] font-medium leading-none tabular-nums text-foreground/60">
        {total > 0 ? compactAmount(total) : ''}
      </span>
      <div
        className="relative w-full"
        style={{ height: barH }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="absolute inset-0 overflow-hidden rounded-t-sm">
          {upcomingH > 0 && <div className="absolute inset-x-0 top-0 bg-zinc-200 dark:bg-zinc-700/50" style={{ height: upcomingH }} />}
          {overdueH > 0 && <div className="absolute inset-x-0 bg-red-400/70 dark:bg-red-500/50" style={{ top: upcomingH, height: overdueH }} />}
          {paidH > 0 && <div className="absolute inset-x-0 bottom-0 bg-primary/75" style={{ height: paidH }} />}
          {total === 0 && <div className="absolute inset-0 bg-zinc-100 dark:bg-zinc-800/30" />}
        </div>
        {hovered && total > 0 && (
          <div className="pointer-events-none absolute -top-1 left-1/2 z-20 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-border bg-popover px-2.5 py-1.5 shadow-md">
            <p className="mb-1 text-[11px] font-semibold text-foreground">{bar.label}</p>
            {bar.paid > 0 && <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><span className="inline-block h-2 w-2 shrink-0 rounded-sm bg-primary/75" />Pago: {formatCurrency(bar.paid)}</p>}
            {bar.overdue > 0 && <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><span className="inline-block h-2 w-2 shrink-0 rounded-sm bg-red-400/70" />Vencido: {formatCurrency(bar.overdue)}</p>}
            {bar.upcoming > 0 && <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><span className="inline-block h-2 w-2 shrink-0 rounded-sm bg-zinc-200" />A vencer: {formatCurrency(bar.upcoming)}</p>}
          </div>
        )}
      </div>
      <span className="text-[11px] text-muted-foreground">{bar.label}</span>
    </div>
  )
}

/** Gráfico de barras para Lucro: verde (positivo) / vermelho (negativo). */
function ProfitBarChart({ bars }: { bars: ProfitBar[] }) {
  const maxAbs = Math.max(...bars.map((b) => Math.abs(b.value)), 1)

  return (
    <div className="flex items-end gap-1">
      {bars.map((bar, idx) => (
        <ProfitBar key={`${bar.label}-${idx}`} bar={bar} maxAbs={maxAbs} />
      ))}
    </div>
  )
}

function ProfitBar({ bar, maxAbs }: { bar: ProfitBar; maxAbs: number }) {
  const [hovered, setHovered] = useState(false)
  const positive = bar.value >= 0
  const barH = Math.max(Math.round((Math.abs(bar.value) / maxAbs) * CHART_MAX_H), bar.value !== 0 ? 4 : 2)

  return (
    <div className="flex flex-1 flex-col items-center gap-0.5">
      <span
        className={`h-4 text-[10px] font-medium leading-none tabular-nums ${
          positive ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'
        }`}
      >
        {bar.value !== 0 ? compactAmount(Math.abs(bar.value)) : ''}
      </span>
      <div
        className="relative w-full"
        style={{ height: barH }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div
          className={`h-full w-full rounded-t-sm ${
            positive
              ? 'bg-green-500/60 dark:bg-green-500/40'
              : 'bg-red-400/60 dark:bg-red-500/40'
          } ${bar.value === 0 ? 'opacity-30' : ''}`}
        />
        {hovered && bar.value !== 0 && (
          <div className="pointer-events-none absolute -top-1 left-1/2 z-20 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-border bg-popover px-2.5 py-1.5 shadow-md">
            <p className="mb-1 text-[11px] font-semibold text-foreground">{bar.label}</p>
            <p className={`text-[11px] font-medium ${positive ? 'text-green-600' : 'text-red-500'}`}>
              Lucro: {positive ? '' : '−'}{formatCurrency(Math.abs(bar.value))}
            </p>
          </div>
        )}
      </div>
      <span className="text-[11px] text-muted-foreground">{bar.label}</span>
    </div>
  )
}
