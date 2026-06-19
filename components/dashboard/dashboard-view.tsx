'use client'

import Link from 'next/link'
import {
  Wallet,
  TrendingUp,
  Rocket,
  Target,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { EntityBadge } from '@/components/ui/entity-badge'
import { DEAL_STAGE, formatCurrency } from '@/lib/format'
import type {
  CommercialSummary,
  ImplementationSummary,
} from '@/lib/mock/dashboard'

/** Resumo financeiro do mês corrente. */
type FinanceSummary = {
  revenue: number  // receita (cobranças não canceladas com vencimento no mês)
  expenses: number // despesas (contas a pagar no mês)
  profit: number   // receita − despesas
}

/** Resumo NCT derivado dos compromissos/narrativas. */
type NctSummary = {
  atRisk: number
  avgProgress: number
  activeNarratives: number
  staleCommitmentsCount: number
}

/**
 * Casca de um bloco do Dashboard: título com ícone + link para o módulo.
 * No backend cada bloco vira um Server Component com error boundary próprio.
 */
function BlockCard({
  icon: Icon,
  title,
  href,
  children,
}: {
  icon: typeof Wallet
  title: string
  href: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col rounded-lg border border-border bg-card p-4">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-base font-semibold">{title}</h3>
        </div>
        <Link
          href={href}
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          Ver <ArrowRight className="h-3 w-3" />
        </Link>
      </header>
      <div className="flex-1">{children}</div>
    </section>
  )
}

/** Métrica compacta: número grande (mono) + rótulo. */
function Metric({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'default' | 'red' | 'green'
}) {
  return (
    <div>
      <p
        className={cn(
          'font-mono text-2xl font-semibold tabular-nums',
          tone === 'red' && 'text-red-600 dark:text-red-400',
          tone === 'green' && 'text-green-600 dark:text-green-400',
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

/**
 * Dashboard (Fase 6 — agregador). 5 blocos: Financeiro, Comercial,
 * Implementações, Manutenção e NCT (full width). Cada bloco vira um
 * Server Component com error boundary próprio quando o backend chegar.
 */
export function DashboardView({
  finance,
  commercial,
  implementation,
  nct,
}: {
  finance: FinanceSummary
  commercial: CommercialSummary
  implementation: ImplementationSummary
  nct: NctSummary
}) {
  const activeDealsTotal = commercial.activeByStage.reduce((s, x) => s + x.count, 0)

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-lg font-semibold tracking-tight">Dashboard</h2>
        <p className="text-sm text-muted-foreground">O que precisa da sua atenção hoje.</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* 1. Financeiro */}
        <BlockCard icon={Wallet} title="Financeiro" href="/financeiro">
          <div className="grid grid-cols-3 gap-4">
            <Metric label="Receita (mês)" value={formatCurrency(finance.revenue)} tone="green" />
            <Metric label="Despesas (mês)" value={formatCurrency(finance.expenses)} tone="red" />
            <Metric
              label="Lucro (mês)"
              value={formatCurrency(finance.profit)}
              tone={finance.profit >= 0 ? 'green' : 'red'}
            />
          </div>
        </BlockCard>

        {/* 2. Comercial */}
        <BlockCard icon={TrendingUp} title="Comercial" href="/projetos">
          <div className="grid grid-cols-3 gap-4">
            <Metric label="No funil" value={String(activeDealsTotal)} />
            <Metric
              label="Novos (mês)"
              value={String(commercial.newCount)}
              tone={commercial.newCount > 0 ? 'green' : 'default'}
            />
            <Metric
              label="Fechados (mês)"
              value={String(commercial.closedCount)}
              tone={commercial.closedCount > 0 ? 'green' : 'default'}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {commercial.activeByStage.map((s) => (
                <span key={s.stage} className="inline-flex items-center gap-1">
                  <EntityBadge meta={DEAL_STAGE[s.stage]} />
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {s.count}
                  </span>
                </span>
              ))}
            </div>
            {commercial.pipelineValue > 0 && (
              <span className="text-xs text-muted-foreground">
                {formatCurrency(commercial.pipelineValue)} em negociação
              </span>
            )}
          </div>
        </BlockCard>

        {/* 3. Implementações */}
        <BlockCard icon={Rocket} title="Implementações" href="/implementacao">
          <div className="grid grid-cols-2 gap-4">
            <Metric label="Em andamento" value={String(implementation.active)} />
            <Metric label="Concluídas (mês)" value={String(implementation.completedThisMonth)} tone="green" />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {implementation.active === 0
              ? 'Nenhum projeto em andamento.'
              : `${implementation.active} projeto${implementation.active > 1 ? 's' : ''} em execução.`}
          </p>
        </BlockCard>

        {/* 4. NCT */}
        <BlockCard icon={Target} title="NCT" href="/nct">
          <div className="grid grid-cols-3 gap-4">
            <Metric
              label="Compromissos em risco"
              value={String(nct.atRisk)}
              tone={nct.atRisk > 0 ? 'red' : 'default'}
            />
            <Metric label="Narrativas ativas" value={String(nct.activeNarratives)} />
            <Metric label="Progresso geral" value={`${nct.avgProgress}%`} />
          </div>
          <div className="mt-3">
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${nct.avgProgress}%` }}
              />
            </div>
            {nct.staleCommitmentsCount > 0 && (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                <span className="font-medium">{nct.staleCommitmentsCount}</span>{' '}
                {nct.staleCommitmentsCount === 1 ? 'compromisso sem' : 'compromissos sem'} check-in
                há +14 dias
              </p>
            )}
          </div>
        </BlockCard>
      </div>
    </div>
  )
}
