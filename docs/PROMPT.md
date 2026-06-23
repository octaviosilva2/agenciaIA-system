# PROMPT — copiar e colar no chat novo

> **É ESTE o prompt que você roda.** Detalhe de cada fase e das próximas sessões: `docs/PLANO-BACKEND-FINAL.md`.
> Estamos na **Sessão 5 — Validação final + entrega**. As Sessões 1–4 (Financeiro, Estratégia, NCT, Tarefas, Dashboard) já têm backend real; os `lib/mock/*` já foram removidos.

---

Continue o CRM (Next.js 16 + Supabase). Front-end 100% pronto e aprovado.
Backend das telas (Financeiro, Estratégia, NCT, Tarefas, Dashboard) JÁ está ligado ao Supabase.

LEIA SÓ (não releia os 9 docs):
- docs/PLANO-BACKEND-FINAL.md → execute a "Sessão 5 — Validação final + entrega"
- .work/STATUS.md → estado real do que ficou pronto nas Sessões 1–4

PRÉ-REQUISITO ✅ (Sessões 1–4 feitas): todas as telas mock foram religadas ao banco real
(projeto czkcfhchsjtmmhtvethg, MCP supabase). Pasta lib/mock/ removida (órfã).

REGRAS (Sessão 5 — §3 do plano):
1. npm run build (limpo) + npm test (verde).
2. get_advisors (security + performance) via MCP supabase — tratar o que não for esperado.
3. Smoke test E2E manual: fechar negócio→cobrança→pagar→dashboard; criar compromisso→check-in; mover tarefa.
4. Banco real (RLS já aplicada — NÃO criar policy). Sem migration prevista (próxima livre = 0014).

GATE (parar e me mostrar): build/test verdes; advisors sem alertas inesperados; smoke test E2E OK.
Depois: commit final + atualizar .work/STATUS.md.

Decisões §4.4/§4.5 já tomadas. Dúvidas só se algo divergir do schema real.
