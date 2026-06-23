import { NctView } from '@/components/nct/nct-view'
import { getProfiles } from '@/lib/queries/config'
import { getNarrativesWithCommitments } from '@/lib/queries/nct'

/**
 * Página NCT (Fase 5 — Gestão).
 * Server Component: carrega narrativas + compromissos reais e a equipe (getProfiles)
 * para os selects de DRI. Achata a lista aninhada nos dois arrays que a view consome.
 */
export default async function NCTPage() {
  const [narrativesWith, profiles] = await Promise.all([
    getNarrativesWithCommitments(),
    getProfiles(),
  ])

  const narratives = narrativesWith.map(({ commitments: _omit, ...n }) => n)
  const commitments = narrativesWith.flatMap((n) => n.commitments)

  return (
    <NctView
      initialNarratives={narratives}
      initialCommitments={commitments}
      profiles={profiles}
    />
  )
}
