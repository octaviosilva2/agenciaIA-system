# Validação — config-refactor

Auditoria independente da entrega contra a story (`02-story.md`) e a spec (`03-spec.md`). Build e testes rodados pelo validador. Nenhum código foi editado.

## Checklist de arquivos (existe no disco)

| Arquivo | Estado |
|---|---|
| `lib/validations/config.ts` | ✅ existe |
| `lib/queries/config.ts` | ✅ existe |
| `lib/actions/config.ts` | ✅ existe |
| `components/config/config-layout.tsx` | ✅ existe |
| `components/config/profile-section.tsx` | ✅ existe |
| `components/config/security-section.tsx` | ✅ existe |
| `components/config/appearance-section.tsx` | ✅ existe |
| `components/config/financial-section.tsx` | ✅ existe |
| `components/config/crm-section.tsx` | ✅ existe |
| `components/config/team-section.tsx` (modificado) | ✅ existe, recebe `currentUserId` (team-section.tsx:35,38) |
| `app/(dashboard)/config/page.tsx` (refatorado) | ✅ existe (rota `/config` no build) |
| `__tests__/config/config-validations.test.ts` | ✅ existe |
| `__tests__/config/config-actions.test.ts` | ✅ existe |

Removidos conforme planejado: `components/config/settings-section.tsx` e `lib/mock/config.ts` — confirmado que `mock/config.ts` nunca foi tracked pelo git (`git ls-files --error-unmatch` falhou) e não existe no disco. Nenhum import de `mock/config` fora dos artefatos `.work` (Grep).

## Checklist de arquivos proibidos

| Arquivo | Estado | Nota |
|---|---|---|
| `app/(dashboard)/layout.tsx` | ✅ intacto | `git status --porcelain` vazio |
| `lib/actions/config.ts` (não alterado pelo frontend) | ✅ intacto | frontend declara não ter tocado; contrato bate com `04-backend.md` |
| `components/app-sidebar.tsx` | ⚠️ MODIFICADO | ver achado 🟡 abaixo |

### 🟡 `components/app-sidebar.tsx` foi modificado — mas NÃO pela feature
Diff (`git diff components/app-sidebar.tsx`): única mudança é a remoção da linha
`{ title: 'Tarefas', href: '/tarefas', icon: CheckSquare }` (1 deletion).
- Não tem relação com config-refactor — não toca o item "Config" nem a navegação de configuração.
- O item **"Config" segue presente e intacto** (`app-sidebar.tsx:74`), então CA-04 está atendido.
- A árvore de trabalho contém dezenas de arquivos modificados de outras fases (git status inicial); esta alteração é contaminação de outro trabalho, não da entrega auditada.
- **Impacto:** nenhum sobre os CAs desta story. Mas viola a regra "sidebar global não muda" se for commitada junto. Recomendação: não incluir esse arquivo no commit da feature (`git restore components/app-sidebar.tsx` ou commit separado), para manter a refatoração isolada como a spec promete.

## Testes/build (rodados por mim)

```
npx vitest run            → Test Files 8 passed (8) | Tests 59 passed (59)
npx vitest run __tests__/config → Test Files 2 passed (2) | Tests 38 passed (38)
npm run build             → ✓ Compiled successfully in 3.7s
                            ✓ Finished TypeScript in 7.0s (zero erros)
                            ✓ Generating static pages (16/16)
                            rota /config presente
```
Bate com o relatado em `06-tests.md` (38 config + 21 pré-existentes = 59). Sem falhas.

## Veredito por critério de aceite

**Navegação**
- ✅ CA-01: nav lateral vertical com 6 `TabsTrigger` em 2 grupos rotulados "Minha Conta"/"Sistema" — `config-layout.tsx:36,43,45-66`.
- ✅ CA-02: `Tabs` base-ui com estado client, sem `router.push`/searchParams — URL fixa em `/config` (`config-layout.tsx:36`).
- ✅ CA-03: `defaultValue="perfil"` (`config-layout.tsx:36`).
- ✅ CA-04: item "Config" intacto em `app-sidebar.tsx:74`; ativo por prefixo de rota.

**Perfil**
- ✅ CA-05: `getOwnProfile` lê `id,name,email` de `profiles` (`queries/config.ts:16-28`); email read-only (profile-section, frontend 05).
- ✅ CA-06: `updateOwnProfile` faz `update({name}).eq('id',user.id)` + `revalidatePath('/config')` (`actions/config.ts:37-44`); teste "salva nome válido usando o userId do SERVIDOR" passou.
- ✅ CA-07: nome vazio → `safeParse` falha, retorna `errors`, nenhuma escrita (`actions/config.ts:25-29`); testes "recusa nome vazio/só espaços" + "bloqueia nome vazio e NÃO escreve" passaram.

**Segurança**
- ✅ CA-08: `updatePassword` chama `supabase.auth.updateUser({password})` (`actions/config.ts:79`); teste "reautentica e troca a senha" passou.
- ✅ CA-09: validação zod antes da API; divergente/curta/atual-errada → erro sem chamar `updateUser` (`actions/config.ts:56-77`); testes correspondentes passaram. Reautenticação extra (`signInWithPassword`) confirmada (gate aprovou).

**Aparência**
- ✅ CA-10: 2 opções Claro/Escuro via `useTheme().setTheme`, sem "Sistema" (frontend 05, appearance-section).
- ✅ CA-11: `setTheme` aplica imediato; ativo resolvido por CSS (`dark:`) espelhando `ThemeToggle`.
- ✅ CA-12: `ThemeToggle` global não tocado; ambos usam o mesmo hook `next-themes`.
- Nota: CA-10/11/12 sem teste automatizado (jsdom não instalado — justificado em 06); verificados via build + frontend. Evidência de comportamento é estrutural, não de teste de render.

**Financeiro**
- ✅ CA-13: `financial-section` consome só `orgSettings.tax_rate` de `getOrgSettings` (`queries/config.ts:34-45`).
- ✅ CA-14: `updateTaxRate` busca id do singleton e `update({tax_rate}).eq('id',id)` + revalidate (`actions/config.ts:99-121`); testes válido/fora-de-faixa passaram.
- ✅ CA-15: Grep por `future_tax_rate|future_tax_from` em `components/config/` → **No matches found**. Campos fantasma ausentes.

**CRM**
- ✅ CA-16: `crm-section` consome só `orgSettings.stale_deal_days` (mesma query única).
- ✅ CA-17: `updateStaleDealDays` valida inteiro≥1, `update` por id + revalidate (`actions/config.ts:124-148`); testes passaram.

**Equipe**
- ✅ CA-18: `getProfiles` lista `id,name,email,active` ordenado por nome; lista vazia válida (`queries/config.ts:48-57`).
- ✅ CA-19: `toggleProfileActive(id, active)` args posicionais, `update({active}).eq('id',id)` + revalidate (`actions/config.ts:155-165`); teste "persiste o NOVO valor de active no id" passou.
- ✅ CA-20: `updateProfileName` valida `id`+`name`, nome vazio bloqueado (`actions/config.ts:168-189`); testes "id+nome válidos => persiste" e "nome vazio => sem escrita" passaram.

**Geral**
- ✅ CA-21: todas as escritas usam server action real; `lib/mock/config.ts` removido e sem imports restantes; feedback via toast (frontend 05). Teste confirma mensagem de sucesso/erro real por action.
- ✅ CA-22: tokens do design system aplicados; `TONE` de `lib/format.ts` para status Ativo/Inativo (team-section, frontend 05). Verificação visual, não automatizada.

## Edge cases

- ✅ Nome vazio/só espaços (Perfil/Equipe) → bloqueio, sem escrita (testes em validations + actions).
- ✅ Senha vazia/curta/divergente → erro antes da API (testes).
- ✅ Falha de escrita no Supabase → `success:false` com mensagem genérica, sem sucesso falso; detalhe não vaza (teste "erro do Supabase => mensagem genérica").
- ✅ `org_settings` sem linha → query lança (PA-01 resolvido = opção c, seed garante linha) (`queries/config.ts:41-43`).
- ✅ Equipe vazia → `getProfiles` retorna `[]`, tabela renderiza linha "Nenhum membro cadastrado." (frontend 05).
- ✅ Auto-inativação (PA-02) → checkbox `disabled` quando `p.id === currentUserId` (team-section.tsx:82). Bloqueio só na UI — limitação documentada e aceita no gate.
- ✅ Salvar sem alterar → operação idempotente (update simples, sem erro).

## Segurança

- ✅ `userId`/email sempre do servidor (`auth.getUser()`), nunca do formData (`actions/config.ts:32-35,67-70`); teste "ignora id do formData" passou. IDOR mitigado no perfil/senha.
- ✅ Validação zod na borda em todas as actions de form; falha fechado.
- ✅ Senha nunca logada; mensagens de erro genéricas ("Não foi possível...") — sem vazamento de detalhe interno.
- ✅ `updateUser` (anon key, própria sessão) em vez de `admin.updateUserById` — service_role não introduzido no cliente. Reautenticação com senha atual impede troca por sessão sequestrada.
- 🟡 `toggleProfileActive`/`updateProfileName` aceitam qualquer `id` e escrevem (RLS `authenticated_all` permissivo). Qualquer autenticado altera qualquer membro. **Aceito por design** — RLS permissiva em todo o CRM nesta versão, documentado na spec (fora de escopo: authz por papel). Não bloqueia.
- ✅ RLS `authenticated_all` (USING+WITH CHECK) já presente em `profiles`/`org_settings`; sem migration nova, sem regressão de segurança.

## Escopo

- **Faltou?** Não. Todos os 22 CAs cobertos.
- **Além?** Não na pasta da feature — `components/config/`, `lib/*/config.ts` e testes batem exatamente com a spec; `config-nav` inlinado (autorizado pela spec).
- **Fora de escopo virou furo?** O único arquivo proibido tocado (`app-sidebar.tsx`) é contaminação de outro trabalho na árvore, não da feature — não afeta CA, mas precisa ficar fora do commit desta story.

## Riscos do research / spec

- ✅ Update em singleton sem id estável → resolvido buscando o id (`getOrgSettingsId`, actions/config.ts:90-96). Tratado.
- 🟡 Revalidação de telas que consomem `tax_rate` → só `/config` é revalidado hoje; outras telas com `tax_rate` em cache podem não refletir imediatamente. **De pé**, mas anotado como limitação conhecida fora do escopo da story (spec linha 226, backend 04). Não bloqueia esta entrega.
- ✅ Hidratação do tema → resolvido via CSS (`dark:`) sem `mounted`, evitando mismatch e a violação `react-hooks/set-state-in-effect`. Tratado.
- ✅ `team-section` em transição (type `Profile` do mock → `TeamProfile`) → migrado; mock removido sem imports órfãos. Tratado.

## Veredito

**APROVAR** — todos os 22 CAs atendidos com evidência, build limpo e 59/59 testes passando; único achado fora de escopo (`app-sidebar.tsx`) não é da feature e deve apenas ser mantido fora do commit.

### Pendência de higiene (não bloqueia o veredito, mas resolver antes de commitar)
- 🟡 Restaurar `components/app-sidebar.tsx` (remoção de "Tarefas") para fora do commit da feature — a refatoração deve permanecer isolada a `components/config/`, `lib/*/config.ts`, `app/(dashboard)/config/page.tsx` e `__tests__/config/`.

---
**GATE humano:** este veredito é recomendação. Decisão final é do Octavio.
