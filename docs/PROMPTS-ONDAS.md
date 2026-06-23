# Prompts das 3 ondas de ajustes (cola e roda)

> Rode **uma onda por sessão**, na ordem (1 → 2 → 3), dando `/clear` entre elas.
> O mapa detalhado de cada item vive em `.work/AJUSTES-OCTAVIO.md` (checklist + decisões + arquivos).

---

## PROMPT — ONDA 1 (quick wins)

```
Continue o CRM (Next.js 16 + Supabase, projeto czkcfhchsjtmmhtvethg, MCP supabase).
Front-end aprovado e backend ligado ao banco real. RLS já aplicada — NÃO criar policy.

LEIA SÓ (não releia os 9 docs):
- .work/AJUSTES-OCTAVIO.md → seu mapa/checklist desta tarefa (contexto técnico, decisões do Octavio,
  protocolo de retomada e a lista da ONDA 1, itens A1..A11).
- .work/STATUS.md → o que já existe e como está arquitetado.
- O arquivo que cada item tocar (ler sob demanda; eficiência de token é prioridade).

TAREFA = executar TODOS os itens da ONDA 1 (A1 a A11) de uma vez, como um loop:
1. Para cada item [ ] da ONDA 1, na ordem: ler o arquivo indicado, implementar exatamente o descrito,
   marcar [x] no .work/AJUSTES-OCTAVIO.md e anotar o(s) arquivo(s) tocado(s).
2. Se perder o contexto, releia .work/AJUSTES-OCTAVIO.md e retome do primeiro item [ ] da ONDA 1.
3. NÃO comece a ONDA 2. NÃO faça validação final (é outra sessão).

PADRÃO (obrigatório): page = Server Component → lib/queries/* → client; mutação = Server Action com
zod → regra → Supabase → revalidatePath. Reusar query/action/componente existente antes de criar.
Código em inglês; comentários/UI em PT-BR. Labels/cores SEMPRE de lib/format.ts. Não tocar no layout
aprovado além do que o item pede. Sem subagente. Onda 1 NÃO tem migration.

FECHAR: npm run build + npm test verdes → commit "feat(ajustes): onda 1 — quick wins" →
atualizar .work/AJUSTES-OCTAVIO.md (todos os A* em [x]) e .work/STATUS.md.
Ao final, me lembrar de dar /clear e rodar o PROMPT da ONDA 2.
```

---

## PROMPT — ONDA 2 (tarefas, datas, financeiro)

```
Continue o CRM (Next.js 16 + Supabase, projeto czkcfhchsjtmmhtvethg, MCP supabase).
RLS já aplicada — NÃO criar policy. Próxima migration livre = 0014.

LEIA SÓ:
- .work/AJUSTES-OCTAVIO.md → seu mapa/checklist (contexto técnico, decisões do Octavio, protocolo de
  retomada e a lista da ONDA 2, itens B1..B8). Confira que a ONDA 1 está [x]; se não, pare e avise.
- .work/STATUS.md → arquitetura atual.
- O arquivo que cada item tocar (ler sob demanda).

TAREFA = executar TODOS os itens da ONDA 2 (B1 a B8) de uma vez, como um loop:
1. Para cada item [ ] da ONDA 2, na ordem: implementar o descrito, marcar [x] e anotar arquivos.
2. B5 tem migration 0014 (org_settings.card_fee_rate): aplicar via MCP supabase e DEPOIS regenerar
   lib/supabase/types.ts (generate_typescript_types).
3. Se perder o contexto, releia .work/AJUSTES-OCTAVIO.md e retome do primeiro item [ ] da ONDA 2.
4. NÃO comece a ONDA 3. NÃO faça validação final.

DECISÕES JÁ FECHADAS (não reabrir): financeiro abas = A Receber/A Pagar (pendentes) + Receita/Despesa
(pagos); Concluída = line-through + máx 5 + "Ver todos"; semana = segunda→domingo; datas em Brasília.

PADRÃO: page = Server Component → lib/queries → client; mutação = Server Action zod → regra → Supabase
→ revalidatePath. Após schema, regenerar types. Reusar antes de criar. Inglês no código, PT-BR na UI,
labels/cores de lib/format.ts. Sem subagente.

FECHAR: build + test verdes → commit "feat(ajustes): onda 2 — tarefas, datas, financeiro" →
atualizar .work/AJUSTES-OCTAVIO.md (B* em [x]) e .work/STATUS.md.
Ao final, me lembrar de dar /clear e rodar o PROMPT da ONDA 3.
```

---

## PROMPT — ONDA 3 (projeto / fechamento / implementação / manutenção)

```
Continue o CRM (Next.js 16 + Supabase, projeto czkcfhchsjtmmhtvethg, MCP supabase).
RLS já aplicada — NÃO criar policy. Use a próxima migration livre em sequência (confirme com list_migrations).

LEIA SÓ:
- .work/AJUSTES-OCTAVIO.md → seu mapa/checklist (contexto técnico, decisões do Octavio, protocolo de
  retomada e a lista da ONDA 3, itens C1..C6 + mapa de migrations). Confira ONDAS 1 e 2 em [x].
- .work/STATUS.md → arquitetura atual.
- O arquivo que cada item tocar (ler sob demanda).

TAREFA = executar TODOS os itens da ONDA 3 (C1 a C6) de uma vez, como um loop, NA ORDEM dada
(é o bloco mais interligado — cada item deve deixar o build verde antes do próximo):
1. Para cada item [ ] da ONDA 3: implementar o descrito, aplicar migrations via MCP supabase quando
   indicado e regenerar lib/supabase/types.ts, marcar [x] e anotar arquivos.
2. Se perder o contexto, releia .work/AJUSTES-OCTAVIO.md e retome do primeiro item [ ] da ONDA 3.
3. NÃO faça validação final (é a outra sessão / PROMPT 2).

DECISÕES JÁ FECHADAS (não reabrir):
- C1: tabela nova company_contacts (migrar contato atual; limite 3 na UI).
- C3: "Fechar negócio" vira wizard (implementação: valor/parcelas/método; manutenção: mensal ou avulsa)
  → cai no A Receber; valor do topo e pagamento sincronizados; escopo é o mesmo scope_items.
- C5: backend de tarefas da implementação é PARA FAZER agora (não é mais do sócio).
- C6: tabela maintenance_interactions; "Contato dado" avança next_contact_date += contact_frequency_days.

PADRÃO: page = Server Component → lib/queries → client; mutação = Server Action zod → regra → Supabase
→ revalidatePath. Migrations: expand-safe, sem policy nova, regenerar types depois. Reusar
setProjectPayment/setMaintenanceContract/setAvulsoContract/paymentSum existentes. Aplicar nos kanbans
desta onda o padrão "Concluída line-through + máx 5 + Ver todos" (helper da Onda 2). Inglês no código,
PT-BR na UI, labels/cores de lib/format.ts. Não inventar campo/lib. Sem subagente.

FECHAR: build + test verdes → commit "feat(ajustes): onda 3 — projeto/fechamento/implementação/manutenção"
→ atualizar .work/AJUSTES-OCTAVIO.md (C* em [x]) e .work/STATUS.md.
Ao final, me lembrar: ajustes concluídos → dar /clear e rodar o PROMPT 2 (validação final).
```
