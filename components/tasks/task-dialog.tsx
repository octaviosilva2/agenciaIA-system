'use client'

import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { TASK_STATUS, TASK_PRIORITY } from '@/lib/format'
import type { Database } from '@/lib/supabase/types'

type TaskStatus = Database['public']['Enums']['task_status']
type TaskPriority = Database['public']['Enums']['task_priority']

/** Recorrência da tarefa (mock front): avulsa ou repetição mensal num dia do mês. */
export type TaskRecurrence = 'none' | 'monthly'

/** Dados editáveis de uma tarefa (sem id — usado em criar e editar). */
export type TaskDraft = {
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  dueDate: string | null
  recurrence: TaskRecurrence
  recurrenceDay: number | null // dia do mês (1–28) quando recurrence='monthly'
}

const labelCls = 'mb-1 block text-xs font-medium'
const inputCls =
  'h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring'
const selectCls =
  'h-9 w-full rounded-md border border-border bg-card px-2 text-sm outline-none focus:ring-2 focus:ring-ring'
const textareaCls =
  'w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring'

type TaskFields = {
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  dueDate: string | null
  recurrence?: TaskRecurrence
  recurrenceDay?: number | null
}

/**
 * Dialog de criar/editar tarefa. Quando `task` é null cria (no `defaultStatus`);
 * quando presente edita e mostra o botão Excluir.
 * `allowRecurrence` habilita a opção de recorrência mensal (usado na Manutenção).
 */
export function TaskDialog({
  open,
  onOpenChange,
  task,
  defaultStatus,
  allowRecurrence = false,
  onSubmit,
  onDelete,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: TaskFields | null
  defaultStatus: TaskStatus
  allowRecurrence?: boolean
  onSubmit: (draft: TaskDraft) => void
  onDelete?: () => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>(defaultStatus)
  const [priority, setPriority] = useState<TaskPriority>('proximo')
  const [dueDate, setDueDate] = useState('')
  const [recurring, setRecurring] = useState(false)
  const [recurrenceDay, setRecurrenceDay] = useState(10)
  const [error, setError] = useState('')

  // Repreenche os campos sempre que o dialog abre.
  useEffect(() => {
    if (!open) return
    setTitle(task?.title ?? '')
    setDescription(task?.description ?? '')
    setStatus(task?.status ?? defaultStatus)
    setPriority(task?.priority ?? 'proximo')
    setDueDate(task?.dueDate ?? '')
    setRecurring(task?.recurrence === 'monthly')
    setRecurrenceDay(task?.recurrenceDay ?? 10)
    setError('')
  }, [open, task, defaultStatus])

  function submit() {
    const t = title.trim()
    if (!t) {
      setError('Informe um título.')
      return
    }
    const monthly = allowRecurrence && recurring
    onSubmit({
      title: t,
      description: description.trim() || null,
      status,
      priority,
      dueDate: dueDate || null,
      recurrence: monthly ? 'monthly' : 'none',
      recurrenceDay: monthly ? recurrenceDay : null,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{task ? 'Editar tarefa' : 'Nova tarefa'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className={labelCls} htmlFor="task_title">Título</label>
            <input
              id="task_title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: dar uma olhada no fluxo de checkout"
              className={inputCls}
              autoFocus
            />
            {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
          </div>

          <div>
            <label className={labelCls} htmlFor="task_description">Descrição</label>
            <textarea
              id="task_description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes (opcional)"
              className={textareaCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="task_status">Coluna</label>
              <select
                id="task_status"
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className={selectCls}
              >
                {(Object.keys(TASK_STATUS) as TaskStatus[]).map((s) => (
                  <option key={s} value={s}>{TASK_STATUS[s].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="task_priority">Prioridade</label>
              <select
                id="task_priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className={selectCls}
              >
                {(Object.keys(TASK_PRIORITY) as TaskPriority[]).map((p) => (
                  <option key={p} value={p}>{TASK_PRIORITY[p].label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls} htmlFor="task_due">
              {recurring ? 'Primeiro vencimento' : 'Prazo'}
            </label>
            <input
              id="task_due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={`${inputCls} w-44`}
            />
          </div>

          {allowRecurrence && (
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  className="h-4 w-4 cursor-pointer rounded border-border"
                  checked={recurring}
                  onChange={(e) => setRecurring(e.target.checked)}
                />
                Repetir todo mês
              </label>
              {recurring && (
                <div className="mt-2 flex items-end gap-2">
                  <div>
                    <label className={labelCls} htmlFor="task_recur_day">Dia do mês</label>
                    <input
                      id="task_recur_day"
                      type="number"
                      min={1}
                      max={28}
                      value={recurrenceDay}
                      onChange={(e) =>
                        setRecurrenceDay(Math.max(1, Math.min(28, Number(e.target.value) || 1)))
                      }
                      className={`${inputCls} w-24`}
                    />
                  </div>
                  <p className="pb-2 text-xs text-muted-foreground">
                    Gera uma tarefa todo mês neste dia.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          {onDelete ? (
            <Button
              type="button"
              variant="ghost"
              className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-500/10"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
              Excluir
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <DialogClose render={<Button type="button" variant="outline">Cancelar</Button>} />
            <Button type="button" onClick={submit}>{task ? 'Salvar' : 'Criar tarefa'}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
