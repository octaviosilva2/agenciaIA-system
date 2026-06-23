'use client'

import { useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import type { GrowthPoint } from '@/lib/queries/dashboard'

type Metric = 'revenue' | 'clients'

const METRIC_COLOR: Record<Metric, string> = {
  revenue: '#16a34a',  // green-600
  clients: '#52525b',  // zinc-600
}

/** Tooltip customizado seguindo o design system. */
function ChartTooltip({
  active,
  payload,
  label,
  metric,
}: {
  active?: boolean
  payload?: { value: number }[]
  label?: string
  metric: Metric
}) {
  if (!active || !payload?.length) return null
  const value = payload[0].value
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 shadow-sm">
      <p className="text-xs font-medium text-foreground">{label}</p>
      <p className="font-mono text-sm tabular-nums text-foreground">
        {metric === 'revenue' ? formatCurrency(value) : `${value} clientes`}
      </p>
    </div>
  )
}

/**
 * Gráfico de crescimento mensal do ano — alterna entre Receita e Clientes.
 * Mostra a variação percentual do último mês vs o anterior.
 */
export function GrowthChart({ data }: { data: GrowthPoint[] }) {
  const [metric, setMetric] = useState<Metric>('revenue')

  /* Variação percentual: último mês vs penúltimo. */
  const last = data[data.length - 1]
  const prev = data[data.length - 2]
  const growthPct =
    prev && prev[metric] > 0
      ? ((last[metric] - prev[metric]) / prev[metric]) * 100
      : 0
  const isPositive = growthPct >= 0
  const GrowthIcon = isPositive ? TrendingUp : TrendingDown
  const color = METRIC_COLOR[metric]

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <header className="mb-4 flex items-start justify-between">
        {/* Título + indicador de crescimento */}
        <div>
          <h3 className="text-base font-semibold">Crescimento</h3>
          <div className="mt-1 flex items-center gap-1.5">
            <GrowthIcon
              className={cn(
                'h-3.5 w-3.5',
                isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
              )}
            />
            <span
              className={cn(
                'font-mono text-sm font-semibold tabular-nums',
                isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
              )}
            >
              {isPositive ? '+' : ''}{growthPct.toFixed(1)}%
            </span>
            <span className="text-xs text-muted-foreground">
              vs mês anterior · {new Date().getFullYear()}
            </span>
          </div>
        </div>

        {/* Toggle Receita / Clientes */}
        <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
          {(['revenue', 'clients'] as Metric[]).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={cn(
                'rounded px-2.5 py-0.5 text-xs font-medium transition-colors',
                metric === m
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {m === 'revenue' ? 'Receita' : 'Clientes'}
            </button>
          ))}
        </div>
      </header>

      <ResponsiveContainer width="100%" height={340}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.18} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(240 6% 90%)"
            vertical={false}
          />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: 'hsl(240 4% 46%)' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={<ChartTooltip metric={metric} />}
            cursor={{ stroke: 'hsl(240 6% 90%)', strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey={metric}
            stroke={color}
            strokeWidth={2}
            fill="url(#growthGradient)"
            dot={{ r: 3, fill: color, strokeWidth: 0 }}
            activeDot={{ r: 4, fill: color, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </section>
  )
}
