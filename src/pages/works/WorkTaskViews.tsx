import { useState } from 'react'
import { CalendarDays, GripVertical, Plus, SquareCheck } from 'lucide-react'
import type { WorkTask, WorkTaskStatus } from '../../types'
import { dayLabel } from '../../features/life/helpers'
import { workColumns } from '../../features/life/works'

interface TaskViewProps {
  tasks: WorkTask[]
  today: string
  disabled: boolean
  onEdit: (task: WorkTask) => void
  onMove: (task: WorkTask, status: WorkTaskStatus) => void
  onCreate: (status: WorkTaskStatus) => void
}

function TaskStatus({ task, disabled, onMove }: Pick<TaskViewProps, 'disabled' | 'onMove'> & { task: WorkTask }) {
  return (
    <select
      className={'issue-status ' + task.status}
      aria-label={'Status for ' + task.title}
      value={task.status}
      disabled={disabled}
      onChange={(event) => onMove(task, event.target.value as WorkTaskStatus)}
    >
      {workColumns.map(({ status, label }) => <option key={status} value={status}>{label}</option>)}
    </select>
  )
}

function DueDate({ task, today }: { task: WorkTask; today: string }) {
  const overdue = task.status !== 'completed' && !!task.due_date && task.due_date < today
  return (
    <span className={'issue-due ' + (overdue ? 'work-late' : '')}>
      <CalendarDays size={12} aria-hidden="true" />
      {task.due_date ? (overdue ? 'Overdue · ' : '') + dayLabel(task.due_date) : 'No due date'}
    </span>
  )
}

export function WorkBoard({ tasks, today, disabled, onEdit, onMove, onCreate }: TaskViewProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [target, setTarget] = useState<WorkTaskStatus | null>(null)
  return (
    <div className="work-board-scroll" role="region" aria-label="Project task board. Scroll horizontally for all columns." tabIndex={0}>
      <div className="work-board">
        {workColumns.map(({ status, label, hint }) => {
          const columnTasks = tasks.filter((task) => task.status === status)
          return (
            <section
              key={status}
              className={`board-column ${status}${target === status ? ' is-drop-target' : ''}`}
              aria-label={label + ' column'}
              onDragOver={(event) => {
                if (disabled || !draggedId) return
                event.preventDefault()
                event.dataTransfer.dropEffect = 'move'
                setTarget(status)
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setTarget(null)
              }}
              onDrop={(event) => {
                event.preventDefault()
                const task = tasks.find((item) => item.id === draggedId)
                setDraggedId(null)
                setTarget(null)
                if (!disabled && task && task.status !== status) onMove(task, status)
              }}
            >
              <header className="board-column-heading">
                <div><span className="board-status-dot" /><h3>{label}</h3><span className="board-count">{columnTasks.length}</span></div>
                <button className="icon-btn" aria-label={'Add task to ' + label} disabled={disabled} onClick={() => onCreate(status)}><Plus size={16} /></button>
              </header>
              <p className="board-column-hint">{hint}</p>
              <div className="board-issues">
                {columnTasks.map((task) => (
                  <article
                    className={'board-issue' + (draggedId === task.id ? ' is-dragging' : '')}
                    key={task.id}
                    aria-label={task.title}
                    draggable={!disabled}
                    onDragStart={(event) => {
                      if (disabled) { event.preventDefault(); return }
                      event.dataTransfer.setData('text/plain', task.id)
                      event.dataTransfer.effectAllowed = 'move'
                      setDraggedId(task.id)
                    }}
                    onDragEnd={() => { setDraggedId(null); setTarget(null) }}
                  >
                    <div className="issue-topline">
                      <span className="issue-id" title={task.id}><SquareCheck size={13} />{task.id.slice(0, 8).toUpperCase()}</span>
                      {!disabled && <GripVertical size={15} className="issue-grip" aria-label="Drag task to another column" />}
                    </div>
                    <button className="issue-title" onClick={() => onEdit(task)}>{task.title}</button>
                    {task.notes && <p className="issue-preview">{task.notes}</p>}
                    <div className="issue-meta"><span className={'issue-priority ' + task.priority}>{task.priority} priority</span><DueDate task={task} today={today} /></div>
                    <TaskStatus task={task} disabled={disabled} onMove={onMove} />
                  </article>
                ))}
                {!columnTasks.length && <div className="board-empty">No tasks here</div>}
              </div>
              <button className="board-add" disabled={disabled} onClick={() => onCreate(status)}><Plus size={14} /> Create task</button>
            </section>
          )
        })}
      </div>
    </div>
  )
}

export function WorkList({ tasks, today, disabled, onEdit, onMove }: TaskViewProps) {
  return (
    <div className="work-issue-table table-wrap" role="region" aria-label="Project task list" tabIndex={0}>
      <table>
        <thead><tr><th>Task</th><th>Status</th><th>Priority</th><th>Due date</th><th>Completed</th></tr></thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id}>
              <td><span className="issue-id">{task.id.slice(0, 8).toUpperCase()}</span><button className="issue-title" onClick={() => onEdit(task)}>{task.title}</button></td>
              <td><TaskStatus task={task} disabled={disabled} onMove={onMove} /></td>
              <td><span className={'issue-priority ' + task.priority}>{task.priority}</span></td>
              <td><DueDate task={task} today={today} /></td>
              <td>{task.completed_on ? dayLabel(task.completed_on) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
