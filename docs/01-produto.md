# 01 — Produto

## O que é

CRM interno de uma agência de IA com 2 sócios. Gerencia o ciclo completo: estratégia da empresa (NCT), comercial (contatos → negócios → fechamento), operacional (implementação de projetos + manutenção) e financeiro (contas a receber/pagar). Sem multi-tenant, sem billing, sem IA embutida — é ferramenta de operação interna.

**Modelo de receita da agência:** implementação (valor único por projeto, sempre) + manutenção mensal (opcional, contratada no fechamento). MRR não é a métrica central; o sistema reflete isso.

**Pergunta que o sistema responde:** "o que precisa da minha atenção agora?" — o Dashboard responde isso em 30 segundos.

## Usuários

2 sócios, ambos com acesso total (organização fechada). Login por e-mail/senha via Supabase Auth, sem cadastro público. Cada registro importante tem um DRI (responsável) apontando para um perfil.

## Conceitos centrais

| Conceito | O que é |
|---|---|
| **Contato** | A pessoa/empresa. Permanente, acumula histórico. Estado é DERIVADO (nunca editado à mão). |
| **Negócio (deal)** | A oportunidade comercial. Percorre o funil em estágios. Um contato pode ter vários ao longo do tempo. |
| **Projeto** | O trabalho em si. Nasce quando o negócio chega em "Oportunidade" (antes do fechamento, para acumular escopo/proposta/negociação). Após fechar, vira Implementação no Operacional. |
| **Manutenção (contrato)** | Contrato mensal pós-entrega ou suporte avulso. Gera parcelas automáticas no Financeiro. |
| **NCT** | Narrativa → Compromisso → Tarefa. Camada de gestão estratégica (estilo G4). Compromissos têm tipo, progresso, confiança e check-ins. |
| **Tarefa** | Unidade operacional global. Vincula opcionalmente a projeto, negócio, contato e compromisso NCT. |

## Funil comercial (pipeline único)

```
Prospect → Lead → Diagnóstico → Oportunidade → Escopo → Proposta → Negociação
              ↓                       ↓ (cria projeto obrigatório)        ↓
        Desqualificado                              Fechado · Perdido · Reativar futuramente
```

- **Desqualificado** só a partir de Prospect ou Lead.
- **Reativar futuramente** = interesse existe, timing errado. Não é perdido.
- **Fechado** exige resposta obrigatória: com manutenção ou sem manutenção.
- Ao mover para **Oportunidade**, o sistema EXIGE criar o projeto (com nome específico).

## Navegação (sidebar definitiva)

```
Dashboard

GESTÃO
  Estratégia
  NCT
  Tarefas

COMERCIAL
  Contatos
  Oportunidades
  Funil

OPERACIONAL
  Implementação
  Manutenção

FINANCEIRO
  Visão Geral
  Contas

SISTEMA
  Config
```

## Fora de escopo (NÃO construir)

Decisões deliberadas — não sugerir nem deixar "preparado para o futuro":

- Módulo de Marketing / canais de aquisição / CAC / lead sources estruturadas (origem do lead é texto livre)
- Metas e ciclos trimestrais (filtros temporais substituem)
- Catálogo de serviços pré-cadastrados (projetos são customizados)
- Playbook & ICP / score de fit
- DRE, fluxo de caixa e aba de impostos (só alíquota única em Config)
- Estágio "Piloto" no funil
- Integração com gateways de pagamento, e-mail ou WhatsApp
- Multi-tenant, permissões por papel, auditoria avançada
