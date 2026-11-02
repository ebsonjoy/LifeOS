import { Copy, Pencil, Trash2, Clock3, AlertCircle } from 'lucide-react'
import type { PlannedTask, ProgressStatus } from '../../types'
import { durationLabel, plannedDuration, planStatus } from '../../features/life/progress'
import { PlanInstructions } from '../../features/life/PlanInstructions'
import { timeLabel } from '../../features/life/helpers'

export interface PlannerActions {
  onEdit: (task: PlannedTask) => void
  onCopy: (task: PlannedTask) => void
  onDelete: (task: PlannedTask) => void
  onStatus: (task: PlannedTask, status: ProgressStatus) => void
}
export function PlannerTask({ task, today, busy, conflict = false, now = false, actions }: {
  task: PlannedTask; today: string; busy: boolean; conflict?: boolean; now?: boolean; actions: PlannerActions
}) {
  let duration: number | null = null
  try { duration = plannedDuration(task.start_time, task.end_time, task.ends_next_day) } catch { /* Legacy entry remains editable. */ }
  const status = planStatus(task)
  return (
    <article className={`planner-task ${status}${now ? ' is-now' : ''}`} aria-label={task.title}>
      <div className="planner-task-main">
        <div className="planner-task-labels">
          <span className="planner-category">{task.category || 'personal'}</span>
          {now && <span className="planner-now">Now</span>}
          {conflict && <span className="planner-conflict"><AlertCircle size={12} /> Time overlap</span>}
        </div>
        <button className="planner-task-title" disabled={busy} onClick={() => actions.onEdit(task)}>{task.title}</button>
        <div className="planner-task-meta"><Clock3 size={12} /><span>{task.start_time ? timeLabel(task.start_time) + (task.end_time ? ' – ' + timeLabel(task.end_time) : '') + (task.ends_next_day ? ' (+1 day)' : '') : 'Any time'}{duration != null ? ' · ' + durationLabel(duration) : ''}</span>{task.actual_minutes != null && <span>Actual {durationLabel(task.actual_minutes)}</span>}</div>
        <PlanInstructions text={task.summary}/>
      </div>
      <div className="planner-task-controls">
        <select aria-label={'Status for ' + task.title} value={status} disabled={busy || task.date > today} onChange={event => actions.onStatus(task, event.target.value as ProgressStatus)}>
          <option value="planned">To do</option><option value="completed">Complete</option><option value="incomplete">Incomplete</option>
        </select>
        <div className="planner-task-buttons">
          <button className="icon-btn" disabled={busy} aria-label={'Edit ' + task.title} title="Edit or reschedule" onClick={() => actions.onEdit(task)}><Pencil size={15} /></button>
          <button className="icon-btn" disabled={busy} aria-label={'Copy ' + task.title} title="Copy to another day" onClick={() => actions.onCopy(task)}><Copy size={15} /></button>
          <button className="icon-btn" disabled={busy} aria-label={'Delete ' + task.title} title="Delete plan" onClick={() => actions.onDelete(task)}><Trash2 size={15} /></button>
        </div>
      </div>
    </article>
  )
}
