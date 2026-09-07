// ==============================================================================
// Date & Transformation Utilities
// ==============================================================================

export function getTodayString(): string {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatLongDate(dateString?: string): string {
  const d = dateString ? new Date(dateString + 'T00:00:00') : new Date()
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatShortDate(dateString: string): string {
  const d = new Date(dateString + 'T00:00:00')
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export function getTransformationStats(
  startDateStr: string,
  targetDateStr: string,
  todayStr: string = getTodayString()
) {
  const start = new Date(startDateStr + 'T00:00:00').getTime()
  const target = new Date(targetDateStr + 'T00:00:00').getTime()
  const today = new Date(todayStr + 'T00:00:00').getTime()

  const msPerDay = 1000 * 60 * 60 * 24

  const totalDays = Math.max(1, Math.round((target - start) / msPerDay))
  const dayDiff = Math.round((today - start) / msPerDay)
  const currentDay = Math.max(1, Math.min(totalDays, dayDiff + 1))
  const daysRemaining = Math.max(0, Math.round((target - today) / msPerDay))
  const progressPercent = Math.min(100, Math.max(0.1, ((currentDay - 1) / totalDays) * 100))

  return {
    currentDay,
    totalDays,
    daysRemaining,
    progressPercent: Number(progressPercent.toFixed(1)),
    isComplete: today >= target,
  }
}

export function getDaysOfWeek(): Array<{ name: string; short: string; date: string; isToday: boolean }> {
  const todayStr = getTodayString()
  const now = new Date()
  // Current day in 0-6 where 0 is Sunday, 1 is Monday...
  const currentDayOfWeek = now.getDay()
  // Calculate distance to previous Monday (0 -> -6, 1 -> 0, 2 -> -1...)
  const distanceToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek

  const days = []
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const singleLetters = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

  for (let i = 0; i < 7; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() + distanceToMonday + i)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`

    days.push({
      name: dayNames[i],
      short: singleLetters[i],
      date: dateStr,
      isToday: dateStr === todayStr,
    })
  }

  return days
}

export const CATEGORY_METADATA: Record<
  string,
  { label: string; color: string; bg: string; text: string }
> = {
  career: { label: 'Career', color: '#6366f1', bg: 'bg-indigo-500/10', text: 'text-indigo-400' },
  fitness: { label: 'Fitness', color: '#10b981', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  mind: { label: 'Mind', color: '#ec4899', bg: 'bg-pink-500/10', text: 'text-pink-400' },
  english: { label: 'English', color: '#f59e0b', bg: 'bg-amber-500/10', text: 'text-amber-400' },
  learning: { label: 'Learning', color: '#06b6d4', bg: 'bg-cyan-500/10', text: 'text-cyan-400' },
  finance: { label: 'Finance', color: '#22c55e', bg: 'bg-green-500/10', text: 'text-green-400' },
  discipline: { label: 'Discipline', color: '#8b5cf6', bg: 'bg-purple-500/10', text: 'text-purple-400' },
  personal: { label: 'Personal', color: '#3b82f6', bg: 'bg-blue-500/10', text: 'text-blue-400' },
}
