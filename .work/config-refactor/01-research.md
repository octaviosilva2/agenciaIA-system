# Research — config-refactor

## Estrutura atual

A rota `/config` é uma página única simples, sem sub-rotas nem layout próprio.

- `app/(dashboard)/config/page.tsx` — Server Component. Importa duas seções client e injeta mocks. Header fixo "Sistema".
- `components/config/team-section.tsx` — Client. Tabela de profiles com toggle "ativo" e edição de nome via Dialog. Estado local + toast (mock).
- `components/config/settings-section.tsx` — Client. Dois cards: TaxCard (tax_rate) e StaleDealCard (stale_deal_days). Estado local + toast (mock).
- `lib/mock/config.ts` — `MOCK_PROFILES` e `MOCK_ORG_SETTINGS`. **Atenção:** campos `future_tax_rate` e `future_tax_from` no mock não existem no schema real.

## Layout do dashboard

- `app/(dashboard)/layout.tsx` — Server Component async. Header de 48px com `SidebarTrigger`, email do user, `<ThemeToggle/>` e botão logout. Main com `p-4 md:p-6`. A nav lateral interna nova vive **dentro** deste main.
- `components/app-sidebar.tsx` — Config está no grupo "Sistema" como item único. `isActive` por prefixo — sub-rotas `/config/*` seriam marcadas ativas automaticamente.

## Design system — navegação

- `docs/06-design-system.md` não tem seção dedicada a nav interna por seção.
- **Componente pronto:** `components/ui/tabs.tsx` (base-ui) suporta `orientation="vertical"`.
- **Padrão de referência:** `components/strategy/strategy-view.tsx` usa Tabs horizontal com painel por aba — adaptar para vertical em `/config`.

## Auth e perfil

- `lib/supabase/server.ts` — client async para Server Components/Actions.
- `profiles` schema real (`lib/supabase/types.ts:679`): `id, name, email, active, created_at, updated_at`. Sem role, avatar ou senha.
- **NÃO existem** queries nem actions para config/profiles/org_settings — tudo mock.
- Mudar senha: via `supabase.auth.updateUser({ password })`, modelo em `app/login/actions.ts`.

## Tema (next-themes)

- `next-themes ^0.4.6` instalado.
- `components/theme-provider.tsx` — ThemeProvider montado em `app/layout.tsx` com `attribute="class"`, `defaultTheme="light"`, `enableSystem={false}`.
- `components/theme-toggle.tsx` — toggle pronto via `useTheme`, já no header do dashboard.
- Seção Aparência reutiliza o mesmo `useTheme().setTheme`.

## Parâmetros CRM (org_settings)

Schema real: `id, tax_rate numeric(5,2), stale_deal_days int, created_at, updated_at`. Linha única.
- `tax_rate` → seção Financeiro
- `stale_deal_days` → seção CRM
- Campos `future_tax_rate`/`future_tax_from` do mock são **fictícios**, não existem no banco.

## Riscos

- 🟡 `settings-section.tsx` precisa ser dividido em dois componentes (Financeiro/CRM), mesma tabela.
- 🟡 ThemeToggle já existe no header global — seção Aparência duplica. Decidir coexistência.
- 🟢 RLS permissivo (authenticated_all) — qualquer membro logado edita tudo, sem role/admin.
- 🟢 `components/config/` não é importado por ninguém além de `config/page.tsx` — refatoração isolada.

## Questões em aberto (para resolver no gate)

1. Nav interna: Tabs vertical (estado client, sem mudar URL) ou sub-rotas reais `/config/perfil`?
2. O redesenho já liga Perfil e Segurança ao Supabase real, ou mantém mock por ora?
3. ThemeToggle do header coexiste com a seção Aparência, ou remove o do header?

## Arquivos relevantes

- `app/(dashboard)/config/page.tsx`
- `app/(dashboard)/layout.tsx`
- `components/app-sidebar.tsx`
- `components/config/team-section.tsx`
- `components/config/settings-section.tsx`
- `lib/mock/config.ts`
- `components/ui/tabs.tsx`
- `components/strategy/strategy-view.tsx`
- `components/theme-provider.tsx`
- `components/theme-toggle.tsx`
- `app/layout.tsx`
- `app/login/actions.ts`
- `lib/actions/action-state.ts`
- `lib/supabase/types.ts`
- `docs/06-design-system.md`
