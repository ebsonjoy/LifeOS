import type { WorkTask, WorkTaskStatus } from '../../types'
import { dateKey, safeLink } from './helpers'

export const workStatusLabels: Record<WorkTaskStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  completed: 'Complete',
  incomplete: 'Incomplete',
}
export function workTaskOutcome(
  task: Partial<WorkTask>,
  status: WorkTaskStatus,
  today: string,
) {
  return {
    ...task,
    status,
    completed_on:
      status === 'completed'
        ? task.status === 'completed'
          ? task.completed_on || today
          : today
        : null,
  }
}
export function workStats(tasks: WorkTask[], today: string) {
  const completed = tasks.filter((t) => t.status === 'completed').length
  return {
    total: tasks.length,
    completed,
    open: tasks.length - completed,
    incomplete: tasks.filter((t) => t.status === 'incomplete').length,
    inProgress: tasks.filter((t) => t.status === 'in_progress').length,
    overdue: tasks.filter(
      (t) => t.status !== 'completed' && t.due_date && t.due_date < today,
    ).length,
    percent: tasks.length ? Math.round((completed / tasks.length) * 100) : 0,
  }
}
export function sortWorkTasks(tasks: WorkTask[]) {
  const priority = { high: 0, normal: 1, low: 2 }
  return [...tasks].sort(
    (a, b) =>
      Number(a.status === 'completed') - Number(b.status === 'completed') ||
      (a.due_date || '9999').localeCompare(b.due_date || '9999') ||
      priority[a.priority] - priority[b.priority] ||
      a.created_at.localeCompare(b.created_at),
  )
}
export function workDate(value: string): string | null {
  if (!value) return null
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    dateKey(new Date(value + 'T12:00:00')) !== value
  )
    throw new Error('Enter a valid date.')
  return value
}
export function workProjectDates(start: string, due: string) {
  const start_date = workDate(start),
    due_date = workDate(due)
  if (start_date && due_date && due_date < start_date)
    throw new Error('The project deadline must be on or after its start date.')
  return { start_date, due_date }
}
export function workLink(value: string) {
  if (!value.trim()) return null
  const url = safeLink(value.trim())
  if (!url) throw new Error('Use a full http:// or https:// project link.')
  return url
}
