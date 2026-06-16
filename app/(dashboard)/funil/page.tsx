import { getFunnelMetrics } from '@/lib/queries/funnel'
import { PeriodFilter } from '@/components/period-filter'
import { DEAL_STAGE, formatCurrency } from '@/lib/format'

/**
 * Resolve o intervalo de datas a partir dos query params do PeriodFilter
 * (espelha o usePeriodDates client, mas no servidor).
 */
function resolvePeriod(
  periodo: string | undefined,
  de: string | undefined,
  ate: string | undefined,
): { from: Date | null; to: Date | null } {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (periodo) {
    case 'hoje':
      return { from: today, to: today }
    case 'semanal': {
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - today.getDay())
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      return { from: weekStart, to: weekEnd }
    }
    case 'mensal': {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      return { from: monthStart, to: monthEnd }
    }
    case 'personalizado':
      return { from: de ? new Date(de) : null, to: ate ? new Date(ate) : null }
    default:
      return { from: null, to: null }
  }
}

/** Percentual inteiro (0..1 → "42%"). */
function pct(n: number): string {
  return `${Math.round(n * 100)}%`
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

export default async function FunilPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; de?: string; ate?: string }>
}) {
  const sp = await searchParams
  const { from, to } = resolvePeriod(sp.periodo, sp.de, sp.ate)
  const m = await getFunnelMetrics(from, to)

  const maxCount = Math.max(1, ...m.stageCounts.map((s) => s.count))

  return (
    <div className="space-y-4">
      {/* Cabeçalho + filtro temporal */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Funil</h2>
          <p className="text-sm text-muted-foreground">
            Movimentação no funil comercial a partir do histórico de estágios.
          </p>
        </div>
        <PeriodFilter />
      </header>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Pipeline atual"
          value={formatCurrency(m.pipelineValue)}
          hint="Negócios em estágio ativo"
        />
        <StatCard label="Receita ganha" value={formatCurrency(m.wonValue)} hint="Fechados no período" />
        <StatCard
          label="Conversão"
          value={pct(m.conversionRate)}
          hint={`${m.won} ganhos de ${m.totalEntered} no funil`}
        />
        <StatCard
          label="Tempo médio"
          value={m.avgCycleDays != null ? `${Math.round(m.avgCycleDays)} dias` : '—'}
          hint="Do 1º contato ao fechamento"
        />
      </div>

      {/* Funil por estágio */}
      <section className="rounded-lg border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold">Por estágio</h3>
          <p className="text-xs text-muted-foreground">
            Ganhos {m.won} · Perdas {m.lost} · Win rate {pct(m.winRate)}
          </p>
        </div>

        {m.totalEntered === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhuma movimentação de funil no período.
          </p>
        ) : (
          <ul className="space-y-2">
            {m.stageCounts.map((s, i) => {
              const prev = i > 0 ? m.stageCounts[i - 1].count : null
              // Conversão em relação ao estágio anterior (queda no funil).
              const conv = prev && prev > 0 ? s.count / prev : null
              const widthPct = Math.round((s.count / maxCount) * 100)
              return (
                <li key={s.stage} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 text-sm">{DEAL_STAGE[s.stage].label}</span>
                  <div className="h-6 flex-1 overflow-hidden rounded-md bg-muted">
                    <div
                      className="flex h-full items-center justify-end rounded-md bg-primary px-2 transition-all"
                      style={{ width: `${Math.max(widthPct, s.count > 0 ? 6 : 0)}%` }}
                    >
                      {s.count > 0 && (
                        <span className="font-mono text-xs font-medium tabular-nums text-primary-foreground">
                          {s.count}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="w-12 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground">
                    {conv != null ? pct(conv) : '—'}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
