'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { createMaintenanceForProject } from '@/lib/actions/project'
import type { ContractProjectOption } from '@/lib/queries/projects-board'

const inputCls =
  'h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring'
const labelCls = 'mb-1 block text-xs font-medium'

function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

/**
 * "Nova manutenção": seleciona um projeto fechado e cria o contrato (mensal ou hora
 * avulsa). Ao criar, redireciona para a tela de gestão do contrato.
 */
export function NewMaintenanceDialog({ projects }: { projects: ContractProjectOption[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [projectId, setProjectId] = useState('')
  const [kind, setKind] = useState<'mensal' | 'avulso'>('mensal')
  const [monthlyValue, setMonthlyValue] = useState('')
  const [minMonths, setMinMonths] = useState(12)
  const [billingDay, setBillingDay] = useState(10)
  const [hourlyRate, setHourlyRate] = useState('')
  const [startDate, setStartDate] = useState(todayISO())
  const [busy, setBusy] = useState(false)

  function reset() {
    setProjectId('')
    setKind('mensal')
    setMonthlyValue('')
    setMinMonths(12)
    setBillingDay(10)
    setHourlyRate('')
    setStartDate(todayISO())
  }

  async function save() {
    if (!projectId) {
      toast.error('Selecione o projeto.')
      return
    }
    setBusy(true)
    const res = await createMaintenanceForProject(
      projectId,
      kind === 'mensal'
        ? { kind, monthlyValue: Number(monthlyValue) || 0, minMonths, billingDay, startDate }
        : { kind, hourlyRate: Number(hourlyRate) || 0, startDate },
    )
    setBusy(false)
    if (res.success && res.contractId) {
      toast.success(res.message)
      setOpen(false)
      router.push(`/manutencao/${res.contractId}`)
    } else {
      toast.error(res.message)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o) reset()
      }}
    >
      <DialogTrigger
        render={
          <Button type="button" size="sm">
            <Plus className="h-4 w-4" />
            Nova manutenção
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova manutenção</DialogTitle>
          <DialogDescription>
            Escolha um projeto fechado e o tipo de cobrança da manutenção.
          </DialogDescription>
        </DialogHeader>

        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum projeto fechado disponível (todos já têm manutenção ativa).
          </p>
        ) : (
          <div className="space-y-3">
            <div>
              <label className={labelCls} htmlFor="nm_project">
                Projeto <span className="text-red-600 dark:text-red-400">*</span>
              </label>
              <select
                id="nm_project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className={inputCls}
              >
                <option value="">Selecione…</option>
                {projects.map((p) => (
                  <option key={p.projectId} value={p.projectId}>
                    {p.projectName} · {p.company}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelCls} htmlFor="nm_kind">Tipo</label>
              <select
                id="nm_kind"
                value={kind}
                onChange={(e) => setKind(e.target.value as 'mensal' | 'avulso')}
                className={inputCls}
              >
                <option value="mensal">Mensal</option>
                <option value="avulso">Hora avulsa</option>
              </select>
            </div>

            {kind === 'mensal' ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div>
                  <label className={labelCls} htmlFor="nm_value">Valor mensal</label>
                  <input
                    id="nm_value"
                    type="number"
                    min="0"
                    step="0.01"
                    value={monthlyValue}
                    onChange={(e) => setMonthlyValue(e.target.value)}
                    placeholder="0,00"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor="nm_months">Duração (meses)</label>
                  <input
                    id="nm_months"
                    type="number"
                    min={1}
                    max={60}
                    value={minMonths}
                    onChange={(e) => setMinMonths(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor="nm_day">Dia de cobrança</label>
                  <input
                    id="nm_day"
                    type="number"
                    min={1}
                    max={28}
                    value={billingDay}
                    onChange={(e) => setBillingDay(Math.max(1, Math.min(28, Number(e.target.value) || 1)))}
                    className={inputCls}
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className={labelCls} htmlFor="nm_rate">Preço por hora</label>
                <input
                  id="nm_rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  placeholder="0,00"
                  className={`${inputCls} w-40`}
                />
              </div>
            )}

            <div>
              <label className={labelCls} htmlFor="nm_start">Início</label>
              <input
                id="nm_start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`${inputCls} w-44`}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline">Cancelar</Button>} />
          <Button type="button" disabled={busy || projects.length === 0} onClick={() => void save()}>
            {busy ? 'Criando…' : 'Criar manutenção'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
