'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { ArrowLeftRight, RefreshCw } from 'lucide-react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { convertContractKind, renewMaintenanceContract } from '@/lib/actions/project'

const inputCls =
  'h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring'
const labelCls = 'mb-1 block text-xs font-medium'

function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

type ContractKind = 'mensal' | 'avulso'

/**
 * Ações de ciclo de vida do contrato de manutenção, compartilhadas entre o bloco
 * do projeto e a tela de Manutenção:
 * - Mudar tipo (Mensal ↔ Hora avulsa) — converte e cancela mensalidades pendentes.
 * - Renovar (mensal) — gera mais um ciclo sem apagar o histórico.
 * (Encerrar/Reativar fica no badge de status — ContractStatusMenu.)
 */
export function ContractManageActions({
  contractId,
  kind,
  monthlyValue,
  hourlyRate,
  minMonths,
  billingDay,
}: {
  contractId: string
  kind: ContractKind
  monthlyValue: number | null
  hourlyRate: number | null
  minMonths: number | null
  billingDay: number | null
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  // Dialog: mudar tipo
  const [kindOpen, setKindOpen] = useState(false)
  const target: ContractKind = kind === 'mensal' ? 'avulso' : 'mensal'
  const [cMonthly, setCMonthly] = useState('')
  const [cMonths, setCMonths] = useState(12)
  const [cDay, setCDay] = useState(10)
  const [cRate, setCRate] = useState('')
  const [cStart, setCStart] = useState(todayISO())

  // Dialog: renovar (mensal)
  const [renewOpen, setRenewOpen] = useState(false)
  const [rMonthly, setRMonthly] = useState('')
  const [rMonths, setRMonths] = useState(12)
  const [rDay, setRDay] = useState(10)
  const [rStart, setRStart] = useState(todayISO())

  function openChangeKind() {
    setCMonthly(monthlyValue != null ? monthlyValue.toFixed(2) : '')
    setCMonths(minMonths ?? 12)
    setCDay(billingDay ?? 10)
    setCRate(hourlyRate != null ? hourlyRate.toFixed(2) : '')
    setCStart(todayISO())
    setKindOpen(true)
  }

  function openRenew() {
    setRMonthly(monthlyValue != null ? monthlyValue.toFixed(2) : '')
    setRMonths(minMonths ?? 12)
    setRDay(billingDay ?? 10)
    setRStart(todayISO())
    setRenewOpen(true)
  }

  async function confirmChangeKind() {
    setBusy(true)
    const res = await convertContractKind(
      contractId,
      target === 'avulso'
        ? { kind: 'avulso', hourlyRate: Number(cRate) || 0, startDate: cStart }
        : {
            kind: 'mensal',
            monthlyValue: Number(cMonthly) || 0,
            minMonths: cMonths,
            billingDay: cDay,
            startDate: cStart,
          },
    )
    setBusy(false)
    if (res.success) {
      toast.success(res.message)
      setKindOpen(false)
      router.refresh()
    } else {
      toast.error(res.message)
    }
  }

  async function confirmRenew() {
    setBusy(true)
    const res = await renewMaintenanceContract(contractId, {
      monthlyValue: Number(rMonthly) || 0,
      minMonths: rMonths,
      billingDay: rDay,
      startDate: rStart,
    })
    setBusy(false)
    if (res.success) {
      toast.success(res.message)
      setRenewOpen(false)
      router.refresh()
    } else {
      toast.error(res.message)
    }
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={openChangeKind}>
        <ArrowLeftRight className="h-4 w-4" />
        {target === 'avulso' ? 'Mudar para hora avulsa' : 'Mudar para mensal'}
      </Button>
      {kind === 'mensal' && (
        <Button type="button" variant="outline" size="sm" onClick={openRenew}>
          <RefreshCw className="h-4 w-4" />
          Renovar
        </Button>
      )}

      {/* Dialog: mudar tipo */}
      <Dialog open={kindOpen} onOpenChange={setKindOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {target === 'avulso' ? 'Mudar para hora avulsa' : 'Mudar para mensal'}
            </DialogTitle>
            <DialogDescription>
              As mensalidades pendentes (não pagas) são canceladas; as já pagas e os serviços
              avulsos lançados são preservados.
            </DialogDescription>
          </DialogHeader>

          {target === 'avulso' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} htmlFor="ck_rate">Preço por hora</label>
                <input
                  id="ck_rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={cRate}
                  onChange={(e) => setCRate(e.target.value)}
                  placeholder="0,00"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="ck_start_a">Início</label>
                <input
                  id="ck_start_a"
                  type="date"
                  value={cStart}
                  onChange={(e) => setCStart(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls} htmlFor="ck_value">Valor mensal</label>
                <input
                  id="ck_value"
                  type="number"
                  min="0"
                  step="0.01"
                  value={cMonthly}
                  onChange={(e) => setCMonthly(e.target.value)}
                  placeholder="0,00"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="ck_start_m">Início</label>
                <input
                  id="ck_start_m"
                  type="date"
                  value={cStart}
                  onChange={(e) => setCStart(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="ck_months">Duração (meses)</label>
                <input
                  id="ck_months"
                  type="number"
                  min={1}
                  max={60}
                  value={cMonths}
                  onChange={(e) => setCMonths(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="ck_day">Dia de cobrança</label>
                <input
                  id="ck_day"
                  type="number"
                  min={1}
                  max={28}
                  value={cDay}
                  onChange={(e) => setCDay(Math.max(1, Math.min(28, Number(e.target.value) || 1)))}
                  className={inputCls}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline">Cancelar</Button>} />
            <Button type="button" disabled={busy} onClick={() => void confirmChangeKind()}>
              {busy ? 'Convertendo…' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: renovar (mensal) */}
      <Dialog open={renewOpen} onOpenChange={setRenewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renovar contrato</DialogTitle>
            <DialogDescription>
              Gera as parcelas de um novo ciclo a partir da data de início. As parcelas
              anteriores (pagas ou pendentes) permanecem no Financeiro.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="rn_value">Valor mensal</label>
              <input
                id="rn_value"
                type="number"
                min="0"
                step="0.01"
                value={rMonthly}
                onChange={(e) => setRMonthly(e.target.value)}
                placeholder="0,00"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="rn_start">Início</label>
              <input
                id="rn_start"
                type="date"
                value={rStart}
                onChange={(e) => setRStart(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="rn_months">Duração (meses)</label>
              <input
                id="rn_months"
                type="number"
                min={1}
                max={60}
                value={rMonths}
                onChange={(e) => setRMonths(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="rn_day">Dia de cobrança</label>
              <input
                id="rn_day"
                type="number"
                min={1}
                max={28}
                value={rDay}
                onChange={(e) => setRDay(Math.max(1, Math.min(28, Number(e.target.value) || 1)))}
                className={inputCls}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline">Cancelar</Button>} />
            <Button type="button" disabled={busy} onClick={() => void confirmRenew()}>
              {busy ? 'Renovando…' : 'Renovar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
