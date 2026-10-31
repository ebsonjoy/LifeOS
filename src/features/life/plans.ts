import type { PlannedTask, ProgressStatus } from '../../types'
import { shiftDay } from './helpers'
import { planStatus, plannedDuration } from './progress'

export const planCategories = ['personal', 'work', 'learning', 'english', 'fitness', 'career', 'schedule']
export const clockMinutes = (time: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time)
  ? Number(time.slice(0, 2)) * 60 + Number(time.slice(3)) : null
export const minuteClock = (minutes: number) =>
  `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

export function schedulePreset(start: string, duration: number) {
  const minutes = clockMinutes(start)
  if (minutes == null || duration <= 0 || duration > 1440) throw new Error('Choose a start time and a duration up to 24 hours.')
  return { end_time: minuteClock(minutes + duration), ends_next_day: minutes + duration >= 1440 }
}
export function sortPlans(rows: PlannedTask[]) {
  return [...rows].sort((a, b) => (a.start_time || '24:00').localeCompare(b.start_time || '24:00') || a.title.localeCompare(b.title))
}
/** Clip overnight entries to the displayed day; point reminders have no duration. */
export function dayIntervals(rows: PlannedTask[], date: string) {
  return rows.flatMap(task => {
    const start = clockMinutes(task.start_time), end = clockMinutes(task.end_time)
    if (start == null || end == null) return []
    if (task.date === date) {
      const finish = task.ends_next_day ? 1440 : end
      return finish > start ? [{ task, start, end: finish, carryover: false }] : []
    }
    if (task.date === shiftDay(date, -1) && task.ends_next_day && end > 0)
      return [{ task, start: 0, end, carryover: true }]
    return []
  }).sort((a, b) => a.start - b.start || a.end - b.end)
}
export function planConflicts(rows: PlannedTask[], date: string) {
  const intervals = dayIntervals(rows, date)
  const conflicts = new Set<string>()
  for (let i = 0; i < intervals.length; i++) {
    for (let j = i + 1; j < intervals.length && intervals[j].start < intervals[i].end; j++) {
      conflicts.add(intervals[i].task.id)
      conflicts.add(intervals[j].task.id)
    }
  }
  return conflicts
}
export function availableGaps(rows: PlannedTask[], date: string, start = 8 * 60, end = 22 * 60) {
  const gaps: { start: number; end: number }[] = []
  let cursor = start
  for (const interval of dayIntervals(rows, date)) {
    if (interval.end <= start || interval.start >= end) continue
    if (interval.start > cursor) gaps.push({ start: cursor, end: interval.start })
    cursor = Math.max(cursor, Math.min(interval.end, end))
  }
  if (cursor < end) gaps.push({ start: cursor, end })
  return gaps.filter(gap => gap.end - gap.start >= 15)
}
export function plannerSummary(rows: PlannedTask[], date: string) {
  const selected = rows.filter(row => row.date === date)
  let scheduled = 0, cursor = 0
  for (const interval of dayIntervals(rows, date)) {
    scheduled += Math.max(0, interval.end - Math.max(interval.start, cursor))
    cursor = Math.max(cursor, interval.end)
  }
  return {
    total: selected.length,
    complete: selected.filter(row => planStatus(row) === 'completed').length,
    open: selected.filter(row => planStatus(row) === 'planned').length,
    untimed: selected.filter(row => clockMinutes(row.start_time) == null).length,
    scheduled,
    actual: selected.some(row => row.actual_minutes != null)
      ? selected.reduce((total, row) => total + (row.actual_minutes || 0), 0) : null,
  }
}
export function validatePlanEdit(original: Partial<PlannedTask>, next: {
  date: string; start_time: string; end_time: string; ends_next_day: boolean;
  status: ProgressStatus; actual_minutes: number | null;
}, today: string, rows: PlannedTask[] = []) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(next.date) || shiftDay(next.date, 0) !== next.date)
    throw new Error('Choose a valid date.')
  plannedDuration(next.start_time, next.end_time, next.ends_next_day)
  if (next.ends_next_day && (!next.start_time || !next.end_time))
    throw new Error('An overnight plan needs both a start and an end time.')
  if (next.date > today && (next.status !== 'planned' || next.actual_minutes != null))
    throw new Error('Future plans cannot have an outcome or actual time yet.')
  if (original.id && original.date !== next.date &&
    ((original.status || (original.completed ? 'completed' : 'planned')) !== 'planned' || original.actual_minutes != null))
    throw new Error('This plan has recorded history. Copy it to another day to preserve that history.')
  if (original.source_plan_id && rows.some(row => row.id !== original.id &&
    row.source_plan_id === original.source_plan_id && row.date === next.date))
    throw new Error('This plan already has an attempt on that day. Open that attempt instead.')
}
