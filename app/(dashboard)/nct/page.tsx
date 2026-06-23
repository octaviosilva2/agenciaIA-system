import { NctView } from '@/components/nct/nct-view'
import { getProfiles } from '@/lib/queries/config'
import { MOCK_NARRATIVES, MOCK_COMMITMENTS } from '@/lib/mock/nct'

/**
 * Página NCT (Fase 5 — Gestão).
 * Server Component: carrega a equipe real (getProfiles) para os selects de DRI.
 * Narrativas/compromissos ainda são mock (religados na Sessão 3).
 */
export default async function NCTPage() {
  const profiles = await getProfiles()
  return (
    <NctView
      initialNarratives={MOCK_NARRATIVES}
      initialCommitments={MOCK_COMMITMENTS}
      profiles={profiles}
    />
  )
}
