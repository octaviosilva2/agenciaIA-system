# PROMPTS — copiar e colar no chat novo

> Backend das Sessões 1–4 (Financeiro, Estratégia, NCT, Tarefas, Dashboard) está 100% ligado ao Supabase.
> `lib/mock/` removido. Banco limpo (dados de teste apagados; profiles/org_settings/strategy_blocks preservados).
> Estado detalhado: `.work/STATUS.md`. Plano das fases: `docs/PLANO-BACKEND-FINAL.md`.

## ⚠️ REGRA DE EFICIÊNCIA — uma etapa por sessão

Ajustes e validação final são **duas tarefas distintas → duas sessões separadas**. Motivo (custo de token):
arrastar todo o contexto da implementação dos ajustes para dentro da validação enche a janela, encarece e
piora a varredura. Prática validada da comunidade (sessões focadas + `/clear` entre tarefas ≈ **67% mais barato**).

**Fluxo:**
1. Abrir sessão nova → rodar **PROMPT 1 (Ajustes)** → ao terminar, commit + STATUS.
2. **`/clear`** (ou fechar e abrir outra sessão).
3. Sessão limpa → rodar **PROMPT 2 (Validação final)**.

Dicas: primeira mensagem já com o brief completo; ler só o arquivo que cada item toca (não reler docs);
`/compact` ao fim de uma fase; sair/reiniciar ao bater ~80% do contexto.

---

# PROMPT 1 — AJUSTES (rodar primeiro, em sessão própria)

Continue o CRM (Next.js 16 + Supabase). Front-end aprovado e backend das telas já ligado ao banco real
(projeto czkcfhchsjtmmhtvethg, MCP supabase). RLS já aplicada — NÃO criar policy. Próxima migration livre = 0014.

LEIA SÓ (não releia os 9 docs):
- .work/STATUS.md → o que já está pronto e como está arquitetado.
- O arquivo/área que cada ajuste tocar (ler sob demanda, não tudo).

Tarefa desta sessão = APENAS os ajustes abaixo. NÃO fazer validação final aqui (é outra sessão).

1. **Analisar** cada item no código real (ler só o necessário — eficiência de token é prioridade).
2. **Montar PLANO de custo × benefício em tokens** antes de codar: valor que cada ajuste entrega × custo de
   implementar; agrupar mudanças nos mesmos arquivos; reusar queries/actions/componentes existentes; cortar
   "nice to have" de baixo retorno; ordenar por melhor retorno.
3. **GATE — parar e me mostrar o plano** (lista priorizada + abordagem + ordem + o que fica de fora e por quê).
   Só implementar após meu OK.
4. **Implementar visando eficiência total:** padrão existente (page = Server Component → lib/queries → client;
   mutação = Server Action com zod → regra → Supabase → revalidatePath). Sem subagente. Código em inglês,
   comentários/UI em PT-BR. Não tocar no layout aprovado sem eu pedir. Após mudança de schema: regenerar
   `lib/supabase/types.ts`.
5. **Fechar:** `npm run build` + `npm test` verdes → commit → atualizar `.work/STATUS.md`.
   Ao final, me lembrar de dar **`/clear`** e rodar o PROMPT 2.

## ALTERAÇÕES DESTA SESSÃO (Octavio cola aqui)
[COLE A LISTA DE AJUSTES — quanto mais concreto (tela, comportamento esperado × atual), menos token na análise.]

---

# PROMPT 2 — VALIDAÇÃO FINAL (rodar depois, em sessão LIMPA)

Validação final + entrega do CRM (Next.js 16 + Supabase). TODO o backend já está ligado ao banco real
(projeto czkcfhchsjtmmhtvethg, MCP supabase) e os ajustes da sessão anterior já foram aplicados e commitados.
Esta sessão NÃO implementa features novas — só valida, caça falhas e entrega.

LEIA SÓ: `.work/STATUS.md` (estado consolidado). Ler outros arquivos só ao investigar um achado.

Faça, nesta ordem:
1. `npm run build` (precisa sair limpo) + `npm test` (precisa ficar verde).
2. **Subir `npm run dev` e varrer o sistema inteiro:** percorrer TODAS as rotas e fluxos procurando
   falhas em runtime, erros de console, bugs e **problemas de usabilidade passados despercebidos** —
   estados vazios, loading, erros de formulário, links quebrados, dados incoerentes entre telas, ações
   que não revalidam, navegação confusa. Reportar cada achado com a tela, o que acontece e a causa provável.
3. `get_advisors` (security + performance) via MCP supabase — tratar o que não for esperado/`always_true`.
4. Smoke test dos fluxos-núcleo (com o banco real): fechar negócio → cobrança → pagar → dashboard;
   criar narrativa → compromisso → check-in (% atualiza na lista e no detalhe); mover/criar/filtrar tarefa.

GATE FINAL (parar e me mostrar): a lista de bugs/erros/usabilidade encontrados na varredura, priorizada,
+ veredito de build/test/advisors/smoke. Eu decido o que corrigir agora × o que vira backlog.
Depois do meu OK: corrigir o aprovado → `npm run build`/`npm test` de novo → commit final → `.work/STATUS.md`.

Decisões §4.4/§4.5 já tomadas. RLS já aplicada — NÃO criar policy. Dúvidas só se algo divergir do schema real.
