import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOwnProfile, getOrgSettings, getProfiles } from '@/lib/queries/config'
import { ConfigLayout } from '@/components/config/config-layout'

/**
 * /config (Server Component) — busca user + dados em paralelo e monta o layout client.
 * Queries de leitura no servidor; mutações via server actions nas seções.
 */
export default async function ConfigPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Rota já protegida por middleware; falha fechado por segurança.
  if (!user) redirect('/login')

  // Busca em paralelo: perfil próprio, parâmetros da org e lista da equipe.
  const [profile, orgSettings, profiles] = await Promise.all([
    getOwnProfile({ id: user.id, email: user.email ?? '' }),
    getOrgSettings(),
    getProfiles(),
  ])

  return (
    <ConfigLayout
      currentUserId={user.id}
      profile={profile}
      orgSettings={orgSettings}
      profiles={profiles}
    />
  )
}
