'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { ExternalLink, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { updateProposal } from '@/lib/actions/project'
import { formatCurrency } from '@/lib/format'

const inputCls =
  'h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring'
const textareaCls =
  'w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring'
const labelCls = 'mb-1 block text-xs font-medium'

/**
 * Bloco de Proposta com edição inline (sem modal).
 * Valor, link do arquivo e notas — grava via updateProposal.
 */
export function ProposalEditor({
  projectId,
  dealId,
  totalValue,
  driveUrl,
  notes,
}: {
  projectId: string
  dealId: string
  totalValue: number | null
  driveUrl: string | null
  notes: string | null
}) {
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  // Campos do form (string para casar com inputs nativos).
  const [value, setValue] = useState(totalValue != null ? String(totalValue) : '')
  const [url, setUrl] = useState(driveUrl ?? '')
  const [note, setNote] = useState(notes ?? '')

  function cancel() {
    setValue(totalValue != null ? String(totalValue) : '')
    setUrl(driveUrl ?? '')
    setNote(notes ?? '')
    setEditing(false)
  }

  async function save() {
    setBusy(true)
    const parsed = value.trim() === '' ? null : Number(value)
    const res = await updateProposal(projectId, dealId, {
      totalValue: parsed != null && Number.isFinite(parsed) ? parsed : null,
      driveUrl: url.trim() === '' ? null : url.trim(),
      notes: note.trim() === '' ? null : note.trim(),
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
    return (
      <div className="space-y-2 text-sm">
        <div className="flex items-start justify-between gap-2">
          <dl className="flex-1 space-y-2">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Valor</dt>
              <dd className="font-mono tabular-nums">
                {totalValue != null ? formatCurrency(totalValue) : '—'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Arquivo</dt>
              <dd>
                {driveUrl ? (
                  <a
                    href={driveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium hover:underline"
                  >
                    Abrir <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </dd>
            </div>
            {notes && (
              <div>
                <dt className="mb-1 text-muted-foreground">Notas</dt>
                <dd className="whitespace-pre-wrap">{notes}</dd>
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
      <div>
        <label className={labelCls} htmlFor="proposal_url">
          Link do arquivo (proposta)
        </label>
        <input
          id="proposal_url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://drive.google.com/…"
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
