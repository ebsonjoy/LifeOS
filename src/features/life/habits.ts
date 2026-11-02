import type { Habit, HabitLog, ProgressStatus } from '../../types'
import { shiftDay } from './helpers'

export function habitPeriod(habit: Partial<Habit>): 1 | 2 | 3 | 7 {
  return habit.period_days || (habit.frequency === 'weekly' ? 7 : 1)
}
export function habitTarget(habit: Partial<Habit>) {
  const value = Number(habit.target_value ?? 1)
  return Number.isFinite(value) && value >= 0 ? value : 1
}
// Old unchecked logs commonly have value=1. Do not count those as occurrences.
export function habitCount(log?: HabitLog): number | null {
  if (!log) return null
  if (!log.completed) return 0
  const value = Number(log.value ?? 1)
  return Number.isFinite(value) && value >= 0 ? value : 1
}
export function habitWindow(habit: Habit, date: string) {
  const period = habitPeriod(habit)
  const weekday = new Date(date + 'T12:00:00').getDay()
  const days = period === 7 ? (weekday === 0 ? 7 : weekday) : period
  return {
    start: shiftDay(date, 1 - days),
    days,
    label:
      period === 1
        ? 'This day'
        : period === 7
          ? 'This week (Mon–Sun)'
          : `Last ${period} days`,
  }
}
export function habitDays(
  habit: Habit,
  logs: HabitLog[],
  end: string,
  days: number,
) {
  return Array.from({ length: days }, (_, i) => {
    const date = shiftDay(end, i - days + 1)
    return {
      date,
      value: habitCount(
        logs.find((l) => l.habit_id === habit.id && l.date === date),
      ),
    }
  })
}
export function habitSummary(
  habit: Habit,
  logs: HabitLog[],
  end: string,
  days: number,
) {
  const values = habitDays(habit, logs, end, days)
  return {
    days: values,
    total: values.reduce((sum, day) => sum + (day.value ?? 0), 0),
    recorded: values.filter((day) => day.value !== null).length,
    zeroDays: values.filter((day) => day.value === 0).length,
    occurrenceDays: values.filter((day) => day.value !== null && day.value > 0)
      .length,
  }
}
export type HabitGraphPeriod = 'week' | 'month' | 'year' | 'custom'
export function habitGraphRange(period: HabitGraphPeriod, end: string) {
  return { start: period === 'week' || period === 'custom' ? shiftDay(end, -6) : period === 'month' ? end.slice(0, 7) + '-01' : end.slice(0, 4) + '-01-01', end }
}
export function habitGraphData(habitId: string, logs: HabitLog[], start: string, end: string, today: string, monthly = false) {
  for (const date of [start, end]) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || shiftDay(date, 0) !== date) throw new Error('Choose valid start and end dates.')
  }
  if (start > end) throw new Error('The start date must be on or before the end date.')
  if (end > today) throw new Error('Choose an end date on or before today.')
  const days = Math.round((Date.parse(end + 'T00:00:00Z') - Date.parse(start + 'T00:00:00Z')) / 86400000) + 1
  if (days > 3660) throw new Error('Choose a range of up to 10 years.')
  const byDate = new Map(logs.filter(log => log.habit_id === habitId && log.date >= start && log.date <= end).map(log => [log.date, log]))
  const grouped = monthly || days > 62
  const points: { start: string; end: string; value: number | null; recorded: number; days: number; completed: number }[] = []
  let total = 0, recorded = 0, zeroDays = 0, completed = 0
  for (let date = start; date <= end; date = shiftDay(date, 1)) {
    const log = byDate.get(date)
    const value = habitCount(log)
    const last = points[points.length - 1]
    const point = grouped && last?.start.slice(0, 7) === date.slice(0, 7) ? last : { start: date, end: date, value: null, recorded: 0, days: 0, completed: 0 }
    if (point !== last) points.push(point)
    point.end = date; point.days++
    if (value !== null) {
      point.value = (point.value ?? 0) + value; point.recorded++
      total += value; recorded++
      if (value === 0) zeroDays++
      if (log?.outcome === 'completed') { completed++; point.completed++ }
    }
  }
  return { points, grouped, days, total, recorded, zeroDays, completed }
}
export function validateHabitCount(value: number) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 9999)
    throw new Error('Enter a whole count from 0 to 9999.')
  return value
}
export function prepareHabitEntry(habitId: string, date: string, existing: HabitLog | undefined, value: number, note?: string, outcome?: ProgressStatus): Partial<HabitLog> {
  validateHabitCount(value)
  if (outcome && !['planned', 'completed', 'incomplete'].includes(outcome)) throw new Error('Choose a valid day review.')
  return {
    ...existing,
    habit_id: habitId,
    date,
    value,
    completed: value > 0,
    outcome: outcome ?? (existing && habitCount(existing) === value ? existing.outcome : 'planned'),
    note: note ?? existing?.note ?? '',
  }
}
export function prepareHabit(input: {
  name: string
  habit_type: string
  period_days: number
  target_value: number
  unit: string
  description: string
}) {
  const name = input.name.trim()
  if (!name || name.length > 100)
    throw new Error('Use a habit name from 1 to 100 characters.')
  if (!['good', 'bad'].includes(input.habit_type))
    throw new Error('Choose a good or bad habit.')
  if (![1, 2, 3, 7].includes(input.period_days))
    throw new Error('Choose a target period.')
  const target = validateHabitCount(input.target_value)
  if (input.habit_type === 'good' && target === 0)
    throw new Error('Choose at least 1 for a habit you want to build.')
  const unit = input.unit.trim() || 'times'
  if (unit.length > 24)
    throw new Error('Keep the count unit under 25 characters.')
  return {
    name,
    habit_type: input.habit_type as 'good' | 'bad',
    period_days: input.period_days as 1 | 2 | 3 | 7,
    frequency:
      input.period_days === 7 ? ('weekly' as const) : ('daily' as const),
    target_value: target,
    unit,
    description: input.description.trim(),
    color: input.habit_type === 'bad' ? '#a84040' : '#3e6b50',
  }
}
export function isAlcoholHabit(name: string) {
  return /alcoh|alcah|beer|wine|whisk|vodka|rum\b|drinking|booze/i.test(name)
}
