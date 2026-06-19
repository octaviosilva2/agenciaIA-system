'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  CHARGE_METHOD_LABELS,
  NEW_PAYABLE_CATEGORY_LABELS,
  type MockPayableCategory,
} from '@/lib/format'
import type { Charge, AccountPayable, AccountRow } from '@/lib/mock/finance'

type Props = {
  row: AccountRow
  onClose: () => void
  onSaveCharge: (id: string, data: Partial<Charge>) => void
  onSavePayable: (id: string, data: Partial<AccountPayable>) => void
}

const inputCls =
  'h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring'
const labelCls = 'mb-1 block text-xs font-medium'

const METHODS = Object.keys(CHARGE_METHOD_LABELS) as Array<keyof typeof CHARGE_METHOD_LABELS>
const CATEGORIES = Object.keys(NEW_PAYABLE_CATEGORY_LABELS) as Array<MockPayableCategory>

/** Dialog de edição de uma conta (a receber ou a pagar). */
export function EditAccountDialog({ row, onClose, onSaveCharge, onSavePayable }: Props) {
  const { type, data } = row

  const [description, setDescription] = useState(data.description)
  const [amount, setAmount] = useState(String(data.amount))
  const [dueDate, setDueDate] = useState(data.due_date)

  // Campos específicos de A Receber
  const [method, setMethod] = useState(
    type === 'receber' ? ((data as Charge).method ?? '') : '',
  )

  // Campos específicos de A Pagar
  const [category, setCategory] = useState<MockPayableCategory>(
    type === 'pagar' ? (data as AccountPayable).category : 'fixo',
  )
  const [supplier, setSupplier] = useState(
    type === 'pagar' ? ((data as AccountPayable).supplier ?? '') : '',
  )

  function save() {
    const amountNum = parseFloat(amount)
    if (!description.trim() || isNaN(amountNum) || amountNum <= 0 || !dueDate) {
      toast.error('Preencha todos os campos obrigatórios.')
      return
    }

    if (type === 'receber') {
      onSaveCharge(data.id, {
        description: description.trim(),
        amount: amountNum,
        due_date: dueDate,
        method: (method as Charge['method']) || null,
      })
    } else {
      onSavePayable(data.id, {
        description: description.trim(),
        amount: amountNum,
        due_date: dueDate,
        category,
        supplier: supplier.trim() || null,
      })
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Editar conta {type === 'receber' ? 'a receber' : 'a pagar'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className={labelCls} htmlFor="ea_desc">
              Descrição <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <input
              id="ea_desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputCls}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="ea_amount">
                Valor (R$) <span className="text-red-600 dark:text-red-400">*</span>
              </label>
              <input
                id="ea_amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="ea_due">
                Vencimento <span className="text-red-600 dark:text-red-400">*</span>
              </label>
              <input
                id="ea_due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {type === 'receber' ? (
            <div>
              <label className={labelCls} htmlFor="ea_method">
                Forma de pagamento
              </label>
              <select
                id="ea_method"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className={inputCls}
              >
                <option value="">—</option>
                {METHODS.map((m) => (
                  <option key={m} value={m}>
                    {CHARGE_METHOD_LABELS[m]}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} htmlFor="ea_category">
                  Categoria
                </label>
                <select
                  id="ea_category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as MockPayableCategory)}
                  className={inputCls}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {NEW_PAYABLE_CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls} htmlFor="ea_supplier">
                  Fornecedor
                </label>
                <input
                  id="ea_supplier"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="Opcional"
                  className={inputCls}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline">Cancelar</Button>} />
          <Button type="button" onClick={save}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
