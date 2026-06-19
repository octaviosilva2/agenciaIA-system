'use client'

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ProfileSection } from '@/components/config/profile-section'
import { SecuritySection } from '@/components/config/security-section'
import { AppearanceSection } from '@/components/config/appearance-section'
import { FinancialSection } from '@/components/config/financial-section'
import { CrmSection } from '@/components/config/crm-section'
import { TeamSection } from '@/components/config/team-section'
import type { OwnProfile, OrgSettingsRow, TeamProfile } from '@/lib/queries/config'

/**
 * Layout de /config — nav lateral de abas verticais (2 grupos) + painel à direita.
 * Estado da aba é client (base-ui Tabs); a URL permanece /config (sem sub-rotas).
 */
export function ConfigLayout({
  currentUserId,
  profile,
  orgSettings,
  profiles,
}: {
  currentUserId: string
  profile: OwnProfile
  orgSettings: OrgSettingsRow
  profiles: TeamProfile[]
}) {
  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-lg font-semibold tracking-tight">Configurações</h2>
        <p className="text-sm text-muted-foreground">
          Seus dados, preferências e parâmetros do sistema.
        </p>
      </header>

      <Tabs orientation="vertical" defaultValue="perfil" className="gap-6">
        {/* Nav lateral: 2 grupos rotulados (labels não-clicáveis) */}
        <TabsList
          variant="line"
          className="w-48 shrink-0 items-stretch gap-0.5 bg-transparent p-0"
        >
          <p className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Minha Conta
          </p>
          <TabsTrigger value="perfil" className="cursor-pointer">
            Perfil
          </TabsTrigger>
          <TabsTrigger value="seguranca" className="cursor-pointer">
            Segurança
          </TabsTrigger>
          <TabsTrigger value="aparencia" className="cursor-pointer">
            Aparência
          </TabsTrigger>

          <p className="mt-2 px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Sistema
          </p>
          <TabsTrigger value="financeiro" className="cursor-pointer">
            Financeiro
          </TabsTrigger>
          <TabsTrigger value="crm" className="cursor-pointer">
            CRM
          </TabsTrigger>
          <TabsTrigger value="equipe" className="cursor-pointer">
            Equipe
          </TabsTrigger>
        </TabsList>

        {/* Painel da aba ativa */}
        <div className="flex-1">
          <TabsContent value="perfil">
            <ProfileSection profile={profile} />
          </TabsContent>
          <TabsContent value="seguranca">
            <SecuritySection />
          </TabsContent>
          <TabsContent value="aparencia">
            <AppearanceSection />
          </TabsContent>
          <TabsContent value="financeiro">
            <FinancialSection orgSettings={orgSettings} />
          </TabsContent>
          <TabsContent value="crm">
            <CrmSection orgSettings={orgSettings} />
          </TabsContent>
          <TabsContent value="equipe">
            <TeamSection profiles={profiles} currentUserId={currentUserId} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
