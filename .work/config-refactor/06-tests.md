# Testes — config-refactor

Suíte do projeto: **Vitest 4** (`npm test` → `vitest run`, `environment: 'node'`). Convenção: testes em `__tests__/`. Testing Library está nas devDeps, mas **jsdom não está instalado** e o environment é `node` — ver "O que ficou de fora".

Arquivos de teste criados:
- `__tests__/config/config-validations.test.ts` — validações zod (puras, sem mock).
- `__tests__/config/config-actions.test.ts` — server actions (Supabase + `next/cache` mockados nas bordas).

## Critérios de aceite → testes

Foco da story testável nesta camada (validações + backend). CAs de UI puramente visual (CA-01..04, CA-10..12, CA-15, CA-22) não têm teste automatizado aqui — ver "O que ficou de fora".

- [x] CA-06 (salvar nome → persiste) → `config-actions`: "salva nome válido usando o userId do SERVIDOR" — PASSOU
- [x] CA-07 (nome vazio bloqueado, sem escrita) → `config-validations`: "recusa nome vazio"/"só espaços" + `config-actions`: "bloqueia nome vazio e NÃO escreve" — PASSOU
- [x] CA-08 (troca chama updateUser) → `config-actions`: "tudo válido => reautentica e troca a senha" — PASSOU
- [x] CA-09 (senha inválida → erro sem chamar API) → `config-validations`: divergem/curta/atual vazia + `config-actions`: "senhas divergentes", "senha curta", "senha atual incorreta" — PASSOU
- [x] CA-14 (tax_rate persiste; fora de faixa falha) → `config-validations`: <0/>100/limites + `config-actions`: "valor válido => persiste"/"fora de faixa => sem escrita" — PASSOU
- [x] CA-17 (stale_deal_days persiste; inteiro≥1) → `config-validations`: <1/não-inteiro/coerce + `config-actions`: "inteiro >= 1 => persiste"/"não-inteiro => sem escrita" — PASSOU
- [x] CA-19 (toggle active persiste novo valor no id) → `config-actions`: "persiste o NOVO valor de active no id" (ativar/desativar) — PASSOU
- [x] CA-20 (editar nome de membro; vazio bloqueado) → `config-validations`: updateProfileNameSchema + `config-actions`: "id + nome válidos => persiste no id alvo"/"nome vazio => sem escrita" — PASSOU
- [x] CA-21 (escrita real + feedback; sem mock) → `config-actions`: cada action retorna mensagem de sucesso/erro real e revalida `/config` — PASSOU (cobertura indireta do contrato)

## Edge cases cobertos

- Nome vazio ou só espaços (Perfil/Equipe) → "recusa nome só com espaços" + "bloqueia nome vazio e NÃO escreve" — PASSOU
- Senha vazia/curta/confirmação divergente → 3 testes em validations + 2 em actions, sem chamar a API — PASSOU
- **Falha de escrita no Supabase** (erro do servidor) → "erro do Supabase => mensagem genérica, sem sucesso falso" em updateOwnProfile, updateTaxRate, updatePassword(updateUser), toggleProfileActive — PASSOU. Confirma que `success:false` com mensagem genérica (detalhe não vaza) e nenhum sucesso falso.
- **userId sempre do servidor** (segurança) → "ignora id do formData": a action filtra por `auth.getUser().id`, não pelo id enviado no formData — PASSOU
- **Sessão expirada** → updateOwnProfile sem user retorna "Sessão expirada." sem escrever — PASSOU
- **Reautenticação na senha** → senha atual errada não troca a senha — PASSOU
- Coerce de FormData (string → number) em tax_rate e stale_deal_days — PASSOU
- Idempotência de toggle (ativar/desativar com mensagem coerente) — PASSOU

## Resultado da rodada

```
npx vitest run __tests__/config
 Test Files  2 passed (2)
      Tests  38 passed (38)

npm test  (suíte completa, inclui os 21 testes pré-existentes em __tests__/rules)
 Test Files  8 passed (8)
      Tests  59 passed (59)

npm run build
 ✓ Compiled successfully in 3.4s
 ✓ Finished TypeScript (7.0s) — zero erros
 ✓ Generating static pages (16/16)
 (único aviso: depreciação do "middleware" → "proxy", pré-existente, sem relação com a feature)
```

Nenhuma falha. Nenhum bug de produção encontrado.

## Achado durante a escrita dos testes (não é bug — registrar)

Os fixtures iniciais usavam UUIDs "all-same-digit" (`11111111-...`). Em **zod 4**, `z.string().uuid()` valida os bits de versão/variante do RFC-9562 e **rejeita** esses valores. UUIDs reais do Supabase (v4) são válidos e passam normalmente — o schema `updateProfileNameSchema` está correto. Apenas os dados de teste foram trocados por UUIDs v4 válidos. Implicação prática: qualquer fixture/seed futuro que injete ids fabricados precisa usar UUID v4 real, senão `updateProfileName` os rejeitará na borda (comportamento desejado).

## O que ficou de fora e por quê

- **CA-01/02/03/04 (navegação por tabs, URL fixa, sidebar ativa), CA-10/11/12 (Aparência/tema), CA-15 (campos fantasma ausentes), CA-22 (design tokens)** — são comportamentos de **componente client/visual**. O Vitest do projeto roda em `environment: 'node'` e **jsdom não está instalado** (só `@testing-library/*` nas devDeps, sem o DOM runtime). Testar render exigiria adicionar `jsdom` + setup de environment — fora do escopo desta story (não introduzir runner/infra novos sem aprovação). Estes CAs foram verificados manualmente no estágio frontend (05) e ficam para cobertura E2E (Playwright) quando o projeto adotar.
  - Plano se a infra existir: `appearance-section` → clicar "Escuro" chama `setTheme('dark')` (mock de `next-themes`); `team-section` → checkbox do `currentUserId` vem `disabled`; `config-layout` → 6 abas nos 2 grupos, default Perfil, trocar aba não altera `location.pathname`.
- **`toggleProfileActiveSchema`** (citado no briefing da tarefa) — **não existe**. `toggleProfileActive` usa argumentos posicionais `(id, active)` sem schema zod (padrão `setContractStatus`, conforme spec/backend). Testado o comportamento da action diretamente, não um schema inexistente.
- **Reautenticação real / `updateUser` real** — a chamada a `supabase.auth` é fronteira externa (Auth/rede), mockada. Testamos a lógica de orquestração (ordem: valida → reautentica → troca; falha em cada ponto), não o serviço Auth do Supabase em si.
- **CA-05/13/16/18 (leitura inicial das queries)** — `getOwnProfile`/`getOrgSettings`/`getProfiles` são leitura simples passada ao Server Component; o comportamento observável (a tela mostra os valores) é validado pelo build + estágio frontend. Não há lógica de transformação a testar isoladamente.
