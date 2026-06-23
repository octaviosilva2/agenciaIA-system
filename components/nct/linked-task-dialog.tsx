'use client'

import { useEffect, useState } from 'react'
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
import { TASK_STATUS, TASK_PRIORITY, TASK_AREA_LABELS } from '@/lib/format'
import type { TeamProfile } from '@/lib/queries/config'
import type { ManagedTask } from '@/lib/mock/tasks'
import type { Database } from '@/lib/supabase/types'

type TaskStatus = Database['public']['Enums']['task_status']
type TaskPriority = Database['public']['Enums']['task_priority']
type TaskArea = Database['public']['Enums']['task_area']

const labelCls = 'mb-1 block text-xs font-medium'
const inputCls =
  'h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring'
const inputErrCls =
  'h-9 w-full rounded-md border border-red-500 bg-card px-3 text-sm outline-none ring-2 ring-red-500/30'
const selectCls =
  'h-9 w-full rounded-md border border-border bg-card px-2 text-sm outline-none focus:ring-2 focus:ring-ring'
const errCls = 'mt-1 text-xs text-red-600 dark:text-red-400'

const NONE = 'none'

/**
 * Dialog simples de "criar tarefa já vinculada a este compromisso".
 * É a MESMA entidade `tasks` do módulo Tarefas — aqui só pré-preenchemos o
 * commitment_id. Ao salvar (MOCK), entrega a task pronta via callback.
 */
export function LinkedTaskDialog({
  commitmentId,
  profiles,
  open,
  onOpenChange,
  onCreate,
}: {
  commitmentId: string
  profiles: TeamProfile[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (task: ManagedTask) => void
}) {
  const [title, setTitle] = useState('')
  const [status, setStatus] = useState<TaskStatus>('todo')
  const [priority, setPriority] = useState<TaskPriority>('proximo')
  const [area, setArea] = useState<TaskArea>('gestao')
  const [assigneeId, setAssigneeId] = useState<string>(NONE)
  const [dueDate, setDueDate] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setTitle('')
    setStatus('todo')
    setPriority('proximo')
    setArea('gestao')
    setAssigneeId(NONE)
    setDueDate('')
    setError('')
  }, [open])

  function save() {
    const t = title.trim()
    if (!t) {
      setError('Informe um título.')
      return
    }
    onCreate({
      id: `t-${Date.now()}`,
      title: t,
      description: null,
      status,
      priority,
      area,
      assignee_id: assigneeId === NONE ? null : assigneeId,
      project_id: null,
      deal_id: null,
      company_id: null,
      commitment_id: commitmentId, // já vinculada
      due_date: dueDate || null,
      impact: null,
      effort: null,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova tarefa vinculada</DialogTitle>
          <DialogDescription>
            A tarefa nasce ligada a este compromisso e aparece também no board de Tarefas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className={labelCls} htmlFor="lt_title">
              Título <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <input
              id="lt_title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: preparar proposta de contrato"
              className={error ? inputErrCls : inputCls}
              autoFocus
            />
            {error && <p className={errCls}>{error}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="lt_status">
                Coluna
              </label>
              <select
                id="lt_status"
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className={selectCls}
              >
                {(Object.keys(TASK_STATUS) as TaskStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {TASK_STATUS[s].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="lt_priority">
                Prioridade
              </label>
              <select
                id="lt_priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className={selectCls}
              >
                {(Object.keys(TASK_PRIORITY) as TaskPriority[]).map((p) => (
                  <option key={p} value={p}>
                    {TASK_PRIORITY[p].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="lt_area">
                Área
              </label>
              <select
                id="lt_area"
                value={area}
                onChange={(e) => setArea(e.target.value as TaskArea)}
                className={selectCls}
              >
                {(Object.keys(TASK_AREA_LABELS) as TaskArea[]).map((a) => (
                  <option key={a} value={a}>
                    {TASK_AREA_LABELS[a]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="lt_assignee">
                Responsável
              </label>
              <select
                id="lt_assignee"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className={selectCls}
              >
                <option value={NONE}>—</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls} htmlFor="lt_due">
              Prazo
            </label>
            <input
              id="lt_due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={`${inputCls} w-44`}
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline">Cancelar</Button>} />
          <Button type="button" onClick={save}>
            Criar tarefa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
