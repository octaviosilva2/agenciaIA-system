import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Mail, Phone, MapPin, User, FolderKanban } from 'lucide-react'
import { getContactProfile } from '@/lib/queries/contact-profile'
import { EntityBadge } from '@/components/ui/entity-badge'
import { ActivityForm } from '@/components/contacts/activity-form'
import { DiagnosticForm } from '@/components/contacts/diagnostic-form'
import { ContactHeaderActions } from '@/components/contacts/contact-header-actions'
import { TONE } from '@/lib/format'
import {
  DEAL_STAGE,
  ACTIVITY_TYPE_LABELS,
  formatCurrency,
  formatDate,
  formatDateTime,
} from '@/lib/format'

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

function InfoRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">{icon}</span>
      <span>{children}</span>
    </div>
  )
}

export default async function ContatoProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const profile = await getContactProfile(id)
  if (!profile) notFound()

  // Projetos do contato = negócios que já têm projeto vinculado.
  const projects = profile.deals.filter((d) => d.projectId)

  return (
    <div className="space-y-4">
      <Link
        href="/contatos"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Contatos
      </Link>

      {/* Header */}
      <header className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight">{profile.name}</h2>
              {/* Estágio do deal mais recente (deals já vêm ordenados desc). */}
              {profile.deals[0] && <EntityBadge meta={DEAL_STAGE[profile.deals[0].stage]} />}
              {profile.archived && (
                <EntityBadge meta={{ label: 'Arquivado', className: TONE['zinc-faint'] }} />
              )}
            </div>
            {profile.origin && (
              <p className="mt-1 text-xs text-muted-foreground">
                <span className="font-medium">Origem:</span> {profile.origin}
              </p>
            )}
          </div>
          <ContactHeaderActions
            contact={{
              id: profile.id,
              name: profile.name,
              segment: profile.segment,
              city: profile.city,
              contactName: profile.contactName,
              contactPhone: profile.contactPhone,
              contactEmail: profile.contactEmail,
              origin: profile.origin,
              notes: profile.notes,
              archived: profile.archived,
            }}
          />
        </div>
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-3">
        {/* Coluna esquerda: dados + projetos */}
        <div className="space-y-4 lg:col-span-1">
          <SectionCard title="Dados do contato">
            <div className="space-y-2">
              {(profile.segment || profile.city) && (
                <InfoRow icon={<MapPin className="h-3.5 w-3.5" />}>
                  {[profile.segment, profile.city].filter(Boolean).join(' · ')}
                </InfoRow>
              )}
              {profile.contactName && (
                <InfoRow icon={<User className="h-3.5 w-3.5" />}>{profile.contactName}</InfoRow>
              )}
              {profile.contactPhone && (
                <InfoRow icon={<Phone className="h-3.5 w-3.5" />}>{profile.contactPhone}</InfoRow>
              )}
              {profile.contactEmail && (
                <InfoRow icon={<Mail className="h-3.5 w-3.5" />}>{profile.contactEmail}</InfoRow>
              )}
              {profile.notes && (
                <p className="pt-1 text-sm text-muted-foreground whitespace-pre-wrap">{profile.notes}</p>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Projetos">
            {projects.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum projeto ainda.</p>
            ) : (
              <ul className="space-y-2">
                {projects.map((d) => (
                  <li key={d.id}>
                    <Link
                      href={`/projetos/${d.id}`}
                      className="flex items-center justify-between gap-2 rounded-md border border-border p-2.5 transition-colors hover:bg-accent"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <FolderKanban className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate text-sm font-medium">{d.projectName}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="font-mono text-xs tabular-nums text-muted-foreground">
                          {d.estimatedValue != null ? formatCurrency(d.estimatedValue) : '—'}
                        </span>
                        <EntityBadge meta={DEAL_STAGE[d.stage]} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>

        {/* Coluna direita: diagnósticos + interações */}
        <div className="space-y-4 lg:col-span-2">
          <SectionCard title="Diagnósticos" action={<DiagnosticForm companyId={profile.id} />}>
            {profile.diagnostics.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum diagnóstico registrado ainda.</p>
            ) : (
              <ul className="space-y-3">
                {profile.diagnostics.map((d) => (
                  <li
                    key={d.id}
                    className="rounded-md border border-border p-3 text-sm break-words [overflow-wrap:anywhere]"
                  >
                    <p className="mb-1.5 text-xs text-muted-foreground">{formatDate(d.createdAt)}</p>
                    {d.notes ? (
                      <p className="whitespace-pre-wrap">{d.notes}</p>
                    ) : (
                      // Fallback para diagnósticos antigos (campos separados).
                      <div className="space-y-1">
                        {d.context && <p><span className="font-medium">Contexto:</span> {d.context}</p>}
                        {d.problems && <p><span className="font-medium">Dores:</span> {d.problems}</p>}
                        {d.opportunities && <p><span className="font-medium">Oportunidades:</span> {d.opportunities}</p>}
                        {d.proposedSolution && <p><span className="font-medium">Solução:</span> {d.proposedSolution}</p>}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Interações">
            <div className="mb-4">
              <ActivityForm companyId={profile.id} />
            </div>
            {profile.activities.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma interação registrada.</p>
            ) : (
              <ul className="space-y-2.5">
                {profile.activities.map((a) => (
                  <li
                    key={a.id}
                    className="rounded-md border border-border p-3 text-sm break-words [overflow-wrap:anywhere]"
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <EntityBadge
                        meta={{
                          label: ACTIVITY_TYPE_LABELS[a.type as keyof typeof ACTIVITY_TYPE_LABELS] ?? a.type,
                          className: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-500/15 dark:text-zinc-300',
                        }}
                      />
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatDateTime(a.occurredAt)}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap">{a.content}</p>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
