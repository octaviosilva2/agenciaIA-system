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
import {
  TASK_STATUS,
  TASK_PRIORITY,
  TASK_AREA_LABELS,
  LEVEL_SCALE_LABELS,
} from '@/lib/format'
import type { TeamProfile } from '@/lib/queries/config'
import { PROJECT_LABELS } from '@/lib/mock/tasks'
import type { ManagedTask } from '@/lib/mock/tasks'
import type { Commitment } from '@/lib/mock/nct'
import type { Database } from '@/lib/supabase/types'

type TaskStatus = Database['public']['Enums']['task_status']
type TaskPriority = Database['public']['Enums']['task_priority']
type TaskArea = Database['public']['Enums']['task_area']
type LevelScale = Database['public']['Enums']['level_scale']

const labelCls = 'mb-1 block text-xs font-medium'
const inputCls =
  'h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring'
const inputErrCls =
  'h-9 w-full rounded-md border border-red-500 bg-card px-3 text-sm outline-none ring-2 ring-red-500/30'
const selectCls =
  'h-9 w-full rounded-md border border-border bg-card px-2 text-sm outline-none focus:ring-2 focus:ring-ring'
const textareaCls =
  'w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring'
const errCls = 'mt-1 text-xs text-red-600 dark:text-red-400'

const NONE = 'none'

/**
 * Dialog de criar/editar tarefa do board global. Mais rico que o da Implementação:
 * inclui área, responsável, impacto×esforço, projeto e vínculo opcional a compromisso.
 * Ao salvar (MOCK), entrega a task pronta; ao excluir, dispara o callback.
 */
export function TaskBoardDialog({
  task,
  defaultStatus,
  commitments,
  profiles,
  open,
  onOpenChange,
  onSubmit,
  onDelete,
}: {
  task: ManagedTask | null
  defaultStatus: TaskStatus
  commitments: Commitment[]
  profiles: TeamProfile[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (task: ManagedTask) => void
  onDelete?: () => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>(defaultStatus)
  const [priority, setPriority] = useState<TaskPriority>('proximo')
  const [area, setArea] = useState<TaskArea>('gestao')
  const [assigneeId, setAssigneeId] = useState<string>(NONE)
  const [projectId, setProjectId] = useState<string>(NONE)
  const [commitmentId, setCommitmentId] = useState<string>(NONE)
  const [dueDate, setDueDate] = useState('')
  const [impact, setImpact] = useState<string>(NONE)
  const [effort, setEffort] = useState<string>(NONE)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setTitle(task?.title ?? '')
    setDescription(task?.description ?? '')
    setStatus(task?.status ?? defaultStatus)
    setPriority(task?.priority ?? 'proximo')
    setArea(task?.area ?? 'gestao')
    setAssigneeId(task?.assignee_id ?? NONE)
    setProjectId(task?.project_id ?? NONE)
    setCommitmentId(task?.commitment_id ?? NONE)
    setDueDate(task?.due_date ?? '')
    setImpact(task?.impact ?? NONE)
    setEffort(task?.effort ?? NONE)
    setError('')
  }, [open, task, defaultStatus])

  function save() {
    const t = title.trim()
    if (!t) {
      setError('Informe um título.')
      return
    }
    onSubmit({
      id: task?.id ?? `t-${Date.now()}`,
      title: t,
      description: description.trim() || null,
      status,
      priority,
      area,
      assignee_id: assigneeId === NONE ? null : assigneeId,
      project_id: projectId === NONE ? null : projectId,
      deal_id: task?.deal_id ?? null,
      company_id: task?.company_id ?? null,
      commitment_id: commitmentId === NONE ? null : commitmentId,
      due_date: dueDate || null,
      impact: impact === NONE ? null : (impact as LevelScale),
      effort: effort === NONE ? null : (effort as LevelScale),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? 'Editar tarefa' : 'Nova tarefa'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className={labelCls} htmlFor="tb_title">
              Título <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <input
              id="tb_title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: preparar proposta de contrato"
              className={error ? inputErrCls : inputCls}
              autoFocus
            />
            {error && <p className={errCls}>{error}</p>}
          </div>

          <div>
            <label className={labelCls} htmlFor="tb_desc">
              Descrição
            </label>
            <textarea
              id="tb_desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes (opcional)"
              className={textareaCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="tb_status">
                Coluna
              </label>
              <select
                id="tb_status"
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
              <label className={labelCls} htmlFor="tb_priority">
                Prioridade
              </label>
              <select
                id="tb_priority"
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
              <label className={labelCls} htmlFor="tb_area">
                Área
              </label>
              <select
                id="tb_area"
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
              <label className={labelCls} htmlFor="tb_assignee">
                Responsável
              </label>
              <select
                id="tb_assignee"
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
            <div>
              <label className={labelCls} htmlFor="tb_impact">
                Impacto
              </label>
              <select
                id="tb_impact"
                value={impact}
                onChange={(e) => setImpact(e.target.value)}
                className={selectCls}
              >
                <option value={NONE}>—</option>
                {(Object.keys(LEVEL_SCALE_LABELS) as LevelScale[]).map((l) => (
                  <option key={l} value={l}>
                    {LEVEL_SCALE_LABELS[l]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="tb_effort">
                Esforço
              </label>
              <select
                id="tb_effort"
                value={effort}
                onChange={(e) => setEffort(e.target.value)}
                className={selectCls}
              >
                <option value={NONE}>—</option>
                {(Object.keys(LEVEL_SCALE_LABELS) as LevelScale[]).map((l) => (
                  <option key={l} value={l}>
                    {LEVEL_SCALE_LABELS[l]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="tb_project">
                Projeto
              </label>
              <select
                id="tb_project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className={selectCls}
              >
                <option value={NONE}>—</option>
                {Object.entries(PROJECT_LABELS).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="tb_commitment">
                Vincular a compromisso
              </label>
              <select
                id="tb_commitment"
                value={commitmentId}
                onChange={(e) => setCommitmentId(e.target.value)}
                className={selectCls}
              >
                <option value={NONE}>—</option>
                {commitments.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls} htmlFor="tb_due">
              Prazo
            </label>
            <input
              id="tb_due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={`${inputCls} w-44`}
            />
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <div>
            {onDelete && (
              <Button
                type="button"
                variant="ghost"
                className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-500/10"
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4" />
                Excluir
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <DialogClose render={<Button type="button" variant="outline">Cancelar</Button>} />
            <Button type="button" onClick={save}>
              {task ? 'Salvar' : 'Criar tarefa'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
