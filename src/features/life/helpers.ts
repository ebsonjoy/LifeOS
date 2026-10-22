import type {
  EnglishSkill,
  FitnessLog,
  Habit,
  HabitLog,
  PlannedTask,
} from '../../types'

export function timeLabel(time: string): string {
  const [hour, minute] = time.split(':').map(Number)
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`
}

export function scheduleAt(tasks: PlannedTask[], now: Date) {
  const date = dateKey(now)
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const pending = tasks
    .filter(
      (t) =>
        t.date === date &&
        !t.completed &&
        /^([01]\d|2[0-3]):[0-5]\d$/.test(t.start_time),
    )
    .sort(
      (a, b) =>
        a.start_time.localeCompare(b.start_time) ||
        a.title.localeCompare(b.title),
    )
  return {
    due: pending.filter((t) => t.start_time <= time),
    next: pending.find((t) => t.start_time > time),
  }
}
export function dateKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export function shiftDay(date: string, amount: number): string {
  const d = new Date(date + 'T12:00:00')
  d.setDate(d.getDate() + amount)
  return dateKey(d)
}
export function dayLabel(date: string): string {
  return new Date(date + 'T12:00:00').toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}
export const skills: EnglishSkill[] = [
  'speaking',
  'listening',
  'reading',
  'writing',
]
export function recommendedSkill(date: string): EnglishSkill {
  const n = Math.floor(
    Date.UTC(
      ...(date
        .split('-')
        .map(Number)
        .map((v, i) => (i === 1 ? v - 1 : v)) as [number, number, number]),
    ) / 86400000,
  )
  return skills[((n % 4) + 4) % 4]
}
export function habitDone(
  habit: Habit,
  logs: HabitLog[],
  date: string,
): boolean {
  if (habit.frequency === 'daily')
    return logs.some(
      (l) => l.habit_id === habit.id && l.date === date && l.completed,
    )
  const weekday = new Date(date + 'T12:00:00').getDay()
  const monday = shiftDay(date, -(weekday === 0 ? 6 : weekday - 1))
  return logs.some(
    (l) =>
      l.habit_id === habit.id &&
      l.date >= monday &&
      l.date <= date &&
      l.completed,
  )
}
export function workoutSessions(logs: FitnessLog[]) {
  const groups = new Map<string, FitnessLog[]>()
  for (const row of logs.filter((l) => l.workout_completed)) {
    const key = row.exercises
      ? row.id
      : `${row.date}:${row.workout_type || 'Workout'}`
    groups.set(key, [...(groups.get(key) || []), row])
  }
  return [...groups.values()].sort((a, b) => b[0].date.localeCompare(a[0].date))
}
export function safeLink(value?: string | null) {
  if (!value) return undefined
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) ? url.href : undefined
  } catch {
    return undefined
  }
}
