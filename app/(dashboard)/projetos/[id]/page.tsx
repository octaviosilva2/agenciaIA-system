import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getOpportunityDetail } from '@/lib/queries/opportunity-detail'
import { EntityBadge } from '@/components/ui/entity-badge'
import { OpportunityActions } from '@/components/opportunities/opportunity-actions'
import { ScopeEditor } from '@/components/opportunities/scope-editor'
import { ProposalEditor } from '@/components/opportunities/proposal-editor'
import { PaymentEditor } from '@/components/projects/payment-editor'
import { DeliveryControls } from '@/components/projects/delivery-controls'
import { MaintenanceEditor } from '@/components/projects/maintenance-editor'
import { DEAL_STAGE, PROJECT_STATUS, formatCurrency } from '@/lib/format'

function SectionCard({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}

export default async function ProjetoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const detail = await getOpportunityDetail(id)
  if (!detail) notFound()

  const headerValue = detail.totalValue ?? detail.estimatedValue
  const stages = detail.customStages ?? []
  const doneStages = stages.filter((s) => s.done).length

  // Escopo é reusado nas duas situações (fechado ou não).
  const scopeBlock = (
    <SectionCard title="Escopo">
      {detail.projectId ? (
        <ScopeEditor
          projectId={detail.projectId}
          dealId={detail.dealId}
          initialItems={detail.scopeItems}
        />
      ) : (
        <p className="text-sm text-muted-foreground">Sem projeto vinculado.</p>
      )}
    </SectionCard>
  )

  return (
    <div className="space-y-4">
      <Link
        href="/projetos"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Projetos
      </Link>

      {/* Header */}
      <header className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight">{detail.project}</h2>
              <EntityBadge meta={DEAL_STAGE[detail.stage]} />
            </div>
            <p className="text-sm text-muted-foreground">
              Cliente:{' '}
              <Link href={`/contatos/${detail.companyId}`} className="font-medium hover:underline">
                {detail.company}
              </Link>
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-lg font-semibold tabular-nums">
              {headerValue != null ? formatCurrency(headerValue) : '—'}
            </p>
          </div>
        </div>
        <div className="mt-3 border-t border-border pt-3">
          <OpportunityActions dealId={detail.dealId} stage={detail.stage} />
        </div>
      </header>

      {!detail.isClosed ? (
        // Em venda: proposta do valor + escopo.
        <div className="space-y-4">
          <SectionCard title="Proposta">
            {detail.projectId ? (
              <ProposalEditor
                projectId={detail.projectId}
                dealId={detail.dealId}
                totalValue={detail.totalValue}
                driveUrl={detail.driveUrl}
                notes={detail.notes}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Sem projeto vinculado.</p>
            )}
          </SectionCard>
          {scopeBlock}
        </div>
      ) : (
        // Fechado: pagamento + escopo na principal; implementação + manutenção na lateral.
        <div className="grid items-start gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <SectionCard title="Pagamento">
              {detail.projectId ? (
                <PaymentEditor
                  projectId={detail.projectId}
                  dealId={detail.dealId}
                  companyId={detail.companyId}
                  totalValue={detail.totalValue ?? detail.estimatedValue}
                  charges={detail.paymentCharges}
                />
              ) : (
                <p className="text-sm text-muted-foreground">Sem projeto vinculado.</p>
              )}
            </SectionCard>
            {scopeBlock}
          </div>

          <div className="space-y-4 lg:col-span-1">
            <SectionCard
              title="Implementação"
              action={
                detail.projectStatus && <EntityBadge meta={PROJECT_STATUS[detail.projectStatus]} />
              }
            >
              <div className="space-y-3">
                {stages.length > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${Math.round((doneStages / stages.length) * 100)}%` }}
                      />
                    </div>
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">
                      {doneStages}/{stages.length}
                    </span>
                  </div>
                )}
                {detail.projectId && detail.projectStatus && (
                  <DeliveryControls
                    projectId={detail.projectId}
                    dealId={detail.dealId}
                    status={detail.projectStatus}
                    dueDate={detail.dueDate}
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  A organização das tarefas e etapas fica na tela de Implementação.
                </p>
              </div>
            </SectionCard>

            <SectionCard title="Manutenção">
              {detail.projectId ? (
                <MaintenanceEditor
                  projectId={detail.projectId}
                  dealId={detail.dealId}
                  companyId={detail.companyId}
                  projectName={detail.project}
                  contract={detail.contract}
                  charges={detail.maintenanceCharges}
                  hasMaintenance={detail.hasMaintenance}
                />
              ) : (
                <p className="text-sm text-muted-foreground">Sem projeto vinculado.</p>
              )}
            </SectionCard>
          </div>
        </div>
      )}
    </div>
  )
}
