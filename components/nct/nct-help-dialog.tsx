'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { HelpCircle, BookOpen, Target, CheckSquare, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

/* Tabs disponíveis no guia */
type Tab = 'visao-geral' | 'narrativa' | 'compromisso' | 'tarefas-checkin'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'visao-geral',      label: 'Visão geral',     icon: <BookOpen className="h-3.5 w-3.5" /> },
  { id: 'narrativa',        label: 'Narrativa',        icon: <Target className="h-3.5 w-3.5" /> },
  { id: 'compromisso',      label: 'Compromisso',      icon: <CheckSquare className="h-3.5 w-3.5" /> },
  { id: 'tarefas-checkin',  label: 'Tarefas & Check-in', icon: <RefreshCw className="h-3.5 w-3.5" /> },
]

/* Bloco de conceito reutilizável */
function ConceptBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-muted/40 px-3.5 py-3">
      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="space-y-1 text-sm text-foreground">{children}</div>
    </div>
  )
}

/* Linha de exemplo destacada */
function Example({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2 rounded border-l-2 border-primary/40 bg-card pl-3 py-1.5 text-[13px] italic text-muted-foreground">
      {children}
    </div>
  )
}

/* Seção: Visão Geral */
function TabVisaoGeral() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        O NCT é o sistema de gestão estratégica da agência. Ele organiza o trabalho em três
        camadas hierárquicas — cada ação operacional precisa se conectar a essa estrutura.
      </p>

      {/* Pirâmide hierárquica */}
      <div className="space-y-1.5">
        <div className="rounded-md bg-primary/10 px-4 py-2.5 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide">Narrativa</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">A frente estratégica — o "porquê grande"</p>
        </div>
        <div className="mx-4 rounded-md border border-border bg-card px-4 py-2.5 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide">Compromisso</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">A promessa mensurável dentro da narrativa</p>
        </div>
        <div className="mx-8 rounded-md border border-dashed border-border px-4 py-2.5 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide">Tarefa + Check-in</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Execução diária e atualização periódica de progresso</p>
        </div>
      </div>

      <ConceptBlock label="Regra de ouro">
        <p>
          Toda ação que você faz na agência deve se conectar a um compromisso, que por sua vez
          pertence a uma narrativa. Se uma tarefa não cabe em nenhum compromisso, ou é micro-gestão
          ou está fora da estratégia.
        </p>
      </ConceptBlock>

      <ConceptBlock label="Cadência recomendada">
        <ul className="list-inside list-disc space-y-1 text-[13px] text-muted-foreground">
          <li><span className="font-medium text-foreground">Semanal</span> — check-in em cada compromisso ativo</li>
          <li><span className="font-medium text-foreground">Quinzenal</span> — revisão das narrativas e confiança geral</li>
          <li><span className="font-medium text-foreground">Mensal/Trimestral</span> — criar, arquivar ou concluir narrativas</li>
        </ul>
      </ConceptBlock>
    </div>
  )
}

/* Seção: Narrativa */
function TabNarrativa() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        A narrativa é a frente estratégica. Representa um foco grande que a agência está perseguindo
        em um período — normalmente um trimestre ou semestre.
      </p>

      <ConceptBlock label="Como criar uma boa narrativa">
        <ul className="list-inside list-disc space-y-1 text-[13px] text-muted-foreground">
          <li>Título curto e orientado a resultado, não a processo</li>
          <li>Propósito explica <span className="italic">por que</span> isso importa agora</li>
          <li>Um único DRI (Directly Responsible Individual) — quem responde</li>
        </ul>
        <Example>
          "Dobrar a receita recorrente no Q3" — não "Melhorar vendas"
        </Example>
      </ConceptBlock>

      <ConceptBlock label="Status da narrativa">
        <ul className="space-y-1.5 text-[13px]">
          <li>
            <span className="font-medium">Ativa</span>
            <span className="text-muted-foreground"> — em andamento, sendo trabalhada agora</span>
          </li>
          <li>
            <span className="font-medium">Pausada</span>
            <span className="text-muted-foreground"> — temporariamente travada por bloqueio externo ou mudança de prioridade</span>
          </li>
          <li>
            <span className="font-medium">Concluída</span>
            <span className="text-muted-foreground"> — todos os compromissos foram cumpridos ou a frente foi encerrada</span>
          </li>
        </ul>
      </ConceptBlock>

      <ConceptBlock label="Quantas narrativas ter?">
        <p className="text-[13px] text-muted-foreground">
          Entre 2 e 5 simultâneas. Mais do que isso é falta de foco — revise as prioridades antes
          de criar uma nova.
        </p>
      </ConceptBlock>
    </div>
  )
}

/* Seção: Compromisso */
function TabCompromisso() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        O compromisso é a promessa concreta dentro de uma narrativa. É o que você se compromete
        a entregar ou mover — com métrica, prazo e responsável.
      </p>

      <ConceptBlock label="Os 4 tipos">
        <ul className="space-y-2 text-[13px]">
          <li>
            <span className="font-medium">Think-It</span>
            <span className="text-muted-foreground"> — pensar, mapear, decidir. Ainda não tem produto ou ação — é o compromisso de chegar a uma conclusão clara</span>
            <Example>"Desenhar o processo comercial padrão da agência"</Example>
          </li>
          <li>
            <span className="font-medium">Build-It</span>
            <span className="text-muted-foreground"> — construir algo concreto: produto, processo, documento ou sistema</span>
            <Example>"Construir o playbook de automação de atendimento"</Example>
          </li>
          <li>
            <span className="font-medium">Launch-It</span>
            <span className="text-muted-foreground"> — publicar, lançar ou executar algo que já existe. Foco em fazer chegar ao mundo</span>
            <Example>"Lançar o template de dashboard de resultados para clientes"</Example>
          </li>
          <li>
            <span className="font-medium">Quantitativo</span>
            <span className="text-muted-foreground"> — atingir um número. Métrica clara, prazo definido, sem ambiguidade</span>
            <Example>"Fechar 8 contratos de manutenção mensal até o fim do trimestre"</Example>
          </li>
        </ul>
      </ConceptBlock>

      <ConceptBlock label="Sequência natural">
        <p className="text-[13px] text-muted-foreground">
          A maioria das iniciativas passa por <span className="font-medium text-foreground">Think → Build → Launch</span>.
          O Quantitativo é o resultado que se quer alcançar com tudo isso.
          Um compromisso não precisa cobrir todas as fases — separe em compromissos distintos quando as responsabilidades ou prazos forem diferentes.
        </p>
      </ConceptBlock>

      <ConceptBlock label="Meta (metric_target)">
        <p className="text-[13px] text-muted-foreground">
          Escreva em uma linha: <span className="font-medium text-foreground">o quê</span> +{' '}
          <span className="font-medium text-foreground">quanto</span> +{' '}
          <span className="font-medium text-foreground">até quando</span>.
          Metas vagas como "aumentar engajamento" não servem — qualquer número concreto é melhor.
        </p>
      </ConceptBlock>

      <ConceptBlock label="Confiança">
        <ul className="space-y-1 text-[13px]">
          <li><span className="font-medium">Alta</span><span className="text-muted-foreground"> — no caminho, sem bloqueios</span></li>
          <li><span className="font-medium">Média</span><span className="text-muted-foreground"> — progredindo mas com riscos visíveis</span></li>
          <li><span className="font-medium">Baixa</span><span className="text-muted-foreground"> — bloqueado ou fora do ritmo necessário</span></li>
        </ul>
        <p className="mt-2 text-[12px] text-muted-foreground">
          Confiança baixa não é falha — é sinal de que precisa de atenção. Seja honesto.
        </p>
      </ConceptBlock>
    </div>
  )
}

/* Seção: Tarefas & Check-in */
function TabTarefasCheckin() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Tarefas são as ações concretas do dia a dia. Check-ins são as atualizações periódicas
        que mantêm o progresso do compromisso vivo e visível.
      </p>

      <ConceptBlock label="Tarefas">
        <ul className="list-inside list-disc space-y-1 text-[13px] text-muted-foreground">
          <li>Cada tarefa pertence a um compromisso</li>
          <li>Título no imperativo: "Enviar proposta para cliente X"</li>
          <li>Tarefa concluída contribui para o progresso do compromisso</li>
          <li>Se não cabe em nenhum compromisso, questione se deve existir</li>
        </ul>
      </ConceptBlock>

      <ConceptBlock label="Check-in — o que registrar">
        <ul className="list-inside list-disc space-y-1 text-[13px] text-muted-foreground">
          <li><span className="font-medium text-foreground">Progresso atual</span> — % de avanço em relação à meta</li>
          <li><span className="font-medium text-foreground">Confiança</span> — como você está se sentindo sobre a entrega</li>
          <li><span className="font-medium text-foreground">Nota</span> — o que avançou, o que travou, próximo passo</li>
        </ul>
        <Example>
          "Fechamos 2 clientes novos (+R$ 8k). Trava: proposta X ainda sem resposta. Próximo: follow-up amanhã."
        </Example>
      </ConceptBlock>

      <ConceptBlock label="Frequência recomendada">
        <p className="text-[13px] text-muted-foreground">
          No mínimo <span className="font-medium text-foreground">1 check-in por semana</span> em cada
          compromisso ativo. Compromissos sem check-in há mais de 10 dias ficam em risco silencioso —
          o time não sabe se está avançando.
        </p>
      </ConceptBlock>

      <ConceptBlock label="Progresso vs. confiança">
        <p className="text-[13px] text-muted-foreground">
          São duas informações diferentes. Progresso é fato (quanto foi feito). Confiança é
          percepção (vai dar tempo de chegar?). Um compromisso pode estar em 80% de progresso
          mas com confiança baixa — e isso é informação crítica para gestão.
        </p>
      </ConceptBlock>
    </div>
  )
}

/* Componente principal exportado */
export function NctHelpDialog() {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('visao-geral')

  return (
    <>
      {/* Botão de gatilho */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5 text-muted-foreground"
      >
        <HelpCircle className="h-4 w-4" />
        Como funciona
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
              Como usar o NCT
            </DialogTitle>
          </DialogHeader>

          {/* Tabs */}
          <div className="flex gap-0 border-b border-border">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-4 pb-2.5 pt-1 text-xs font-medium transition-colors',
                  activeTab === tab.id
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Conteúdo da tab com scroll */}
          <div className="max-h-[500px] overflow-y-auto pr-1">
            {activeTab === 'visao-geral'     && <TabVisaoGeral />}
            {activeTab === 'narrativa'        && <TabNarrativa />}
            {activeTab === 'compromisso'      && <TabCompromisso />}
            {activeTab === 'tarefas-checkin'  && <TabTarefasCheckin />}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
