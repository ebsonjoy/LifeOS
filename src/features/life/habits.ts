import type { Habit, HabitLog } from '../../types'
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
export function validateHabitCount(value: number) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 9999)
    throw new Error('Enter a whole count from 0 to 9999.')
  return value
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
