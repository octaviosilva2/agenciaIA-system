'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'

/** Data de hoje em 'yyyy-MM-dd' (default do seletor). */
function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

const dateInputCls =
  'h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring'

/**
 * Ao marcar uma conta como paga/recebida, abre um popover com um seletor de data
 * (default = hoje) para permitir lançamentos retroativos. Confirmar devolve a data
 * escolhida ('yyyy-MM-dd'); a receita/despesa é reconhecida nessa data (regime de
 * caixa). Use SÓ no caminho "marcar como pago" — o caminho de reverter (desmarcar)
 * não precisa de data e fica a cargo de quem chama.
 */
export function MarkPaidPopover({
  trigger,
  title = 'Marcar como pago',
  confirmLabel = 'Confirmar',
  onConfirm,
  disabled = false,
}: {
  trigger: React.ReactElement
  title?: string
  confirmLabel?: string
  onConfirm: (dateYmd: string) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(todayISO())

  function confirm() {
    if (!date) return
    onConfirm(date)
    setOpen(false)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o) setDate(todayISO()) // reseta para hoje a cada abertura
      }}
    >
      <PopoverTrigger disabled={disabled} render={trigger} />
      <PopoverContent align="end" className="w-60 gap-2">
        <p className="text-xs font-medium">{title}</p>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={dateInputCls}
          aria-label="Data do pagamento"
        />
        <p className="text-[11px] text-muted-foreground">
          A receita/despesa será reconhecida nesta data.
        </p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button type="button" size="sm" onClick={confirm}>
            {confirmLabel}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
