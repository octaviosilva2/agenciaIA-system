'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { updateProposal } from '@/lib/actions/project'
import { formatCurrency } from '@/lib/format'
import type { ProposalData } from '@/lib/queries/opportunity-detail'

const inputCls =
  'h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring'
const textareaCls =
  'w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring'
const labelCls = 'mb-1 block text-xs font-medium'

/** Converte string de input numérico → number|null (vazio = null). */
function toNum(v: string): number | null {
  const t = v.trim()
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}
const numStr = (n: number | null) => (n != null ? String(n) : '')

/** Linha de leitura (label à esquerda, valor à direita) — só renderiza se houver valor. */
function ReadRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono tabular-nums">{value}</dd>
    </div>
  )
}

/**
 * Bloco de Proposta como área de organização (edição inline, sem modal).
 * Valor headline + estimativas (setup, faixa de manutenção mensal, hora avulsa),
 * prazo estimado e notas — grava via updateProposal (total_value + proposal jsonb).
 */
export function ProposalEditor({
  projectId,
  dealId,
  totalValue,
  driveUrl,
  proposal,
  legacyNotes,
}: {
  projectId: string
  dealId: string
  totalValue: number | null
  driveUrl: string | null
  proposal: ProposalData
  legacyNotes: string | null
}) {
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)

  // Campos do form (string para casar com inputs nativos).
  const [value, setValue] = useState(numStr(totalValue))
  const [setup, setSetup] = useState(numStr(proposal.setupEstimate))
  const [maintMin, setMaintMin] = useState(numStr(proposal.maintenanceMin))
  const [maintMax, setMaintMax] = useState(numStr(proposal.maintenanceMax))
  const [hourly, setHourly] = useState(numStr(proposal.hourlyEstimate))
  const [delivery, setDelivery] = useState(proposal.deliveryEstimate ?? '')
  // Notas: prioriza proposal.notes; cai para projects.notes legado.
  const [note, setNote] = useState(proposal.notes ?? legacyNotes ?? '')

  function cancel() {
    setValue(numStr(totalValue))
    setSetup(numStr(proposal.setupEstimate))
    setMaintMin(numStr(proposal.maintenanceMin))
    setMaintMax(numStr(proposal.maintenanceMax))
    setHourly(numStr(proposal.hourlyEstimate))
    setDelivery(proposal.deliveryEstimate ?? '')
    setNote(proposal.notes ?? legacyNotes ?? '')
    setEditing(false)
  }

  async function save() {
    setBusy(true)
    const res = await updateProposal(projectId, dealId, {
      totalValue: toNum(value),
      driveUrl, // campo removido da UI — preserva o valor já existente
      proposal: {
        setupEstimate: toNum(setup),
        maintenanceMin: toNum(maintMin),
        maintenanceMax: toNum(maintMax),
        hourlyEstimate: toNum(hourly),
        deliveryEstimate: delivery.trim() === '' ? null : delivery.trim(),
        notes: note.trim() === '' ? null : note.trim(),
      },
    })
    setBusy(false)
    if (res.success) {
      toast.success(res.message)
      setEditing(false)
    } else {
      toast.error(res.message)
    }
  }

  if (!editing) {
    const notes = proposal.notes ?? legacyNotes
    const maintRange =
      proposal.maintenanceMin != null || proposal.maintenanceMax != null
        ? `${proposal.maintenanceMin != null ? formatCurrency(proposal.maintenanceMin) : '—'} – ${
            proposal.maintenanceMax != null ? formatCurrency(proposal.maintenanceMax) : '—'
          }`
        : null
    return (
      <div className="space-y-2 text-sm">
        <div className="flex items-start justify-between gap-2">
          <dl className="flex-1 space-y-2">
            <ReadRow label="Valor" value={totalValue != null ? formatCurrency(totalValue) : '—'} />
            <ReadRow
              label="Setup (estimado)"
              value={proposal.setupEstimate != null ? formatCurrency(proposal.setupEstimate) : null}
            />
            <ReadRow label="Manutenção mensal" value={maintRange} />
            <ReadRow
              label="Hora avulsa"
              value={proposal.hourlyEstimate != null ? `${formatCurrency(proposal.hourlyEstimate)}/h` : null}
            />
            {proposal.deliveryEstimate && (
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Prazo estimado</dt>
                <dd>{proposal.deliveryEstimate}</dd>
              </div>
            )}
            {notes && (
              <div>
                <dt className="mb-1 text-muted-foreground">Notas</dt>
                <dd className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{notes}</dd>
              </div>
            )}
          </dl>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0"
            onClick={() => setEditing(true)}
          >
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div>
        <label className={labelCls} htmlFor="proposal_value">
          Valor do projeto (R$)
        </label>
        <input
          id="proposal_value"
          type="number"
          min="0"
          step="0.01"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="0,00"
          className={inputCls}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor="proposal_setup">
            Setup estimado (R$)
          </label>
          <input
            id="proposal_setup"
            type="number"
            min="0"
            step="0.01"
            value={setup}
            onChange={(e) => setSetup(e.target.value)}
            placeholder="0,00"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="proposal_hourly">
            Hora avulsa (R$/h)
          </label>
          <input
            id="proposal_hourly"
            type="number"
            min="0"
            step="0.01"
            value={hourly}
            onChange={(e) => setHourly(e.target.value)}
            placeholder="0,00"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="proposal_maint_min">
            Manutenção mensal — mín. (R$)
          </label>
          <input
            id="proposal_maint_min"
            type="number"
            min="0"
            step="0.01"
            value={maintMin}
            onChange={(e) => setMaintMin(e.target.value)}
            placeholder="0,00"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="proposal_maint_max">
            Manutenção mensal — máx. (R$)
          </label>
          <input
            id="proposal_maint_max"
            type="number"
            min="0"
            step="0.01"
            value={maintMax}
            onChange={(e) => setMaintMax(e.target.value)}
            placeholder="0,00"
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <label className={labelCls} htmlFor="proposal_delivery">
          Prazo estimado de entrega
        </label>
        <input
          id="proposal_delivery"
          value={delivery}
          onChange={(e) => setDelivery(e.target.value)}
          placeholder="Ex.: 45 dias após o briefing"
          className={inputCls}
        />
      </div>

      <div>
        <label className={labelCls} htmlFor="proposal_notes">
          Notas / condições
        </label>
        <textarea
          id="proposal_notes"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ex.: 50% na assinatura, 50% na entrega."
          className={textareaCls}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={cancel}>
          Cancelar
        </Button>
        <Button type="button" size="sm" disabled={busy} onClick={save}>
          {busy ? 'Salvando…' : 'Salvar proposta'}
        </Button>
      </div>
    </div>
  )
}
