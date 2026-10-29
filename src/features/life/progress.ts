import type { DailyActivity, PlannedTask, ProgressStatus } from '../../types'
import { shiftDay } from './helpers'

export const sectionAreas = [
  { key: 'english', name: 'English', path: '/english' },
  { key: 'gym', name: 'Gym', path: '/fitness' },
  { key: 'jobs', name: 'Job search', path: '/career' },
] as const
export const timeAreas = [
  { key: 'sleep', name: 'Sleep' },
  { key: 'deep_work', name: 'Deep work' },
  { key: 'problem_solving', name: 'Problem solving' },
] as const
export const statusLabels = {
  planned: 'Not reviewed',
  completed: 'Complete',
  incomplete: 'Incomplete',
}
export function planStatus(plan: PlannedTask): ProgressStatus {
  return plan.status || (plan.completed ? 'completed' : 'planned')
}
export function planOutcome(plan: PlannedTask, status: ProgressStatus) {
  return { ...plan, status, completed: status === 'completed' }
}
export function copyPlanToDate(
  plan: PlannedTask,
  date: string,
): Partial<PlannedTask> {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    shiftDay(date, 0) !== date ||
    date <= plan.date
  )
    throw new Error('Choose a later date for your next attempt.')
  return {
    title: plan.title,
    date,
    category: plan.category,
    start_time: plan.start_time,
    end_time: plan.end_time,
    ends_next_day: plan.ends_next_day || false,
    summary: plan.summary,
    status: 'planned',
    completed: false,
    actual_minutes: null,
    source_plan_id: plan.id,
  }
}
export function hoursToMinutes(value: string): number | null {
  if (!value.trim()) return null
  const hours = Number(value)
  if (!Number.isFinite(hours) || hours < 0 || hours > 24)
    throw new Error('Enter hours from 0 to 24, or leave blank if not recorded.')
  return Math.round(hours * 60)
}
export function durationLabel(minutes: number | null | undefined) {
  if (minutes == null) return 'Not logged'
  const hours = Math.floor(minutes / 60),
    rest = minutes % 60
  return hours ? `${hours}h${rest ? ` ${rest}m` : ''}` : `${rest}m`
}
export function plannedDuration(start: string, end: string, nextDay = false) {
  if (!start && !end) return null
  if (
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(start) ||
    (end && !/^([01]\d|2[0-3]):[0-5]\d$/.test(end))
  )
    throw new Error('Choose valid start and end times.')
  if (!end) return null
  const minutes = (time: string) =>
    Number(time.slice(0, 2)) * 60 + Number(time.slice(3))
  const length = minutes(end) - minutes(start) + (nextDay ? 1440 : 0)
  if (length <= 0 || length > 1440)
    throw new Error(
      'The end must follow the start, within 24 hours. Tick next day for overnight plans.',
    )
  return length
}
export function completionSeries(
  rows: { date: string; status: ProgressStatus }[],
  end: string,
  days: number,
) {
  return Array.from({ length: days }, (_, i) => {
    const date = shiftDay(end, i - days + 1)
    const entries = rows.filter((r) => r.date === date)
    return {
      date,
      label: date.slice(5),
      completed: entries.filter((r) => r.status === 'completed').length,
      incomplete: entries.filter((r) => r.status === 'incomplete').length,
      planned: entries.filter((r) => r.status === 'planned').length,
    }
  })
}
export function outcomeTotals(rows: { status: ProgressStatus }[]) {
  const completed = rows.filter((r) => r.status === 'completed').length
  const incomplete = rows.filter((r) => r.status === 'incomplete').length
  return {
    completed,
    incomplete,
    pending: rows.length - completed - incomplete,
    rate:
      completed + incomplete
        ? Math.round((completed / (completed + incomplete)) * 100)
        : null,
  }
}
export function timeSeries(rows: DailyActivity[], end: string, days: number) {
  return Array.from({ length: days }, (_, i) => {
    const date = shiftDay(end, i - days + 1)
    const values: Record<string, string | number | null> = {
      date,
      label: date.slice(5),
    }
    for (const area of timeAreas) {
      const row = rows.find(
        (r) =>
          r.date === date && r.activity_key === area.key && r.kind === 'time',
      )
      values[area.key] =
        row?.actual_minutes == null
          ? null
          : Math.round((row.actual_minutes / 60) * 100) / 100
    }
    return values
  })
}
export function defaultActivity(
  date: string,
  key: string,
  name: string,
  kind: DailyActivity['kind'],
): Partial<DailyActivity> {
  return {
    date,
    activity_key: key,
    name,
    kind,
    status: 'planned',
    planned_minutes: null,
    actual_minutes: null,
    note: '',
  }
}
