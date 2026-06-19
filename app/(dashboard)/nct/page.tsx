import { NctView } from '@/components/nct/nct-view'
import { MOCK_NARRATIVES, MOCK_COMMITMENTS } from '@/lib/mock/nct'

/** Página NCT (Fase 5 — Gestão), modo MOCK. */
export default function NCTPage() {
  return <NctView initialNarratives={MOCK_NARRATIVES} initialCommitments={MOCK_COMMITMENTS} />
}
