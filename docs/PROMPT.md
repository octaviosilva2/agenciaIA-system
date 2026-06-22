# PROMPT — copiar e colar no chat novo

> **É ESTE o prompt que você roda.** Detalhe de cada fase e das próximas sessões: `docs/PLANO-BACKEND-FINAL.md`.
> Estamos na **Sessão 2 — Estratégia + Profiles**. Ao avançar de sessão, atualize este arquivo (nome da Sessão + `lib/mock/*` + arquivo-modelo do bloco §3 do plano).

---

Continue o CRM (Next.js 16 + Supabase). Front-end 100% pronto e aprovado.
Tarefa: ligar o BACKEND das telas mock ao Supabase SEM mudar layout.

LEIA SÓ (não releia os 9 docs):
- docs/PLANO-BACKEND-FINAL.md  → execute a "Sessão 2 — Estratégia + Profiles"
- lib/mock/strategy.ts         → contrato do `content` jsonb por kind
- lib/queries/finance.ts e lib/actions/finance.ts → arquivos-modelo (Sessão 1, recém-feita)

REGRAS:
- Mover os types do mock para lib/queries/strategy.ts (mesmo nome) e trocar 1 linha
  de import nos componentes. NÃO tocar no JSX/layout.
- Padrão: page = Server Component → lib/queries → client; mutação = Server Action
  (zod de lib/validations/* → supabase server → revalidatePath). Banco real
  (projeto czkcfhchsjtmmhtvethg, MCP supabase). RLS já aplicada (0007) — NÃO criar policy.
- PROFILES (destrava NCT/Tarefas): reusar getProfiles de lib/queries/config.ts; mover
  initialsOf de lib/mock/profiles.ts para lib/format.ts. ⚠️ NÃO é troca de 1 import — é
  refactor de props: o Server Component carrega getProfiles() e passa a lista por prop;
  findProfile deixa de ser busca global e opera sobre a lista recebida. Equipe = só
  sócios que logam (§4.3); sem migration; UUIDs do mock descartados (telas nascem vazias).
- ESTRATÉGIA: seed JÁ existe (migration 0006, 5 kinds com o shape do mock). NÃO criar
  migration/seed — só confirmar via select e seguir. Criar lib/queries/strategy.ts
  (getStrategyBlocks + STRATEGY_BLOCK_META) e lib/actions/strategy.ts (updateStrategyBlock
  — SÓ UPDATE do content por kind, validar o shape por kind com zod). Revalida /estrategia.
- Religar (sem mexer no JSX): app/(dashboard)/estrategia/page.tsx,
  components/strategy/{strategy-view,strategy-block-dialog}.tsx.
  Código em inglês, comentários/UI em PT-BR. Nada de subagente — execução direta.

GATE (parar e me mostrar): editar SWOT/Missão/Blueprint persiste; reload mantém; não dá
para criar/excluir bloco. Depois: npm run build + npm test, commit, STATUS.md.

Migration: nenhuma (próxima livre = 0014). Decisão §4.3 já tomada. Dúvidas só se algo no
mock divergir do schema real.
