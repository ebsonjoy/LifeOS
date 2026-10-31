import type { WorkProject, WorkTask, WorkTaskStatus } from '../../types'
import { dateKey, safeLink } from './helpers'

export const workStatusLabels: Record<WorkTaskStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  completed: 'Complete',
  incomplete: 'Incomplete',
}
export const workColumns: { status: WorkTaskStatus; label: string; hint: string }[] = [
  { status: 'todo', label: 'To do', hint: 'Ready to pick up' },
  { status: 'in_progress', label: 'In progress', hint: 'Work happening now' },
  { status: 'incomplete', label: 'Needs attention', hint: 'Marked incomplete · revisit next' },
  { status: 'completed', label: 'Done', hint: 'Finished and recorded' },
]

export function filterWorkTasks(
  tasks: WorkTask[],
  filters: { search: string; status: string; priority: string },
  today: string,
) {
  const search = filters.search.trim().toLowerCase()
  return sortWorkTasks(tasks.filter((task) =>
    (filters.priority === 'all' || task.priority === filters.priority) &&
    (filters.status === 'all' ||
      (filters.status === 'open' ? task.status !== 'completed' :
        filters.status === 'overdue'
          ? task.status !== 'completed' && !!task.due_date && task.due_date < today
          : task.status === filters.status)) &&
    `${task.title} ${task.notes} ${task.id}`.toLowerCase().includes(search),
  ))
}

export function projectHealth(project: WorkProject, tasks: WorkTask[], today: string) {
  const stats = workStats(tasks, today)
  if (project.status === 'archived') return { label: 'Archived', tone: 'neutral' }
  if (project.status === 'paused') return { label: 'Paused', tone: 'neutral' }
  if (stats.total > 0 && stats.open === 0) return { label: 'All tasks done', tone: 'success' }
  if (project.due_date && project.due_date < today) return { label: 'Past deadline', tone: 'danger' }
  if (stats.overdue || stats.incomplete) return { label: 'Needs attention', tone: 'danger' }
  if (!stats.total) return { label: 'Ready to plan', tone: 'neutral' }
  return { label: 'On track', tone: 'success' }
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
