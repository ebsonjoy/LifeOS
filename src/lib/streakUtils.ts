import type { HabitLog } from '../types'
import { getTodayString } from './dateUtils'

export interface StreakResult {
  currentStreak: number
  longestStreak: number
  hasActivityToday: boolean
}

export function calculateStreaks(habitLogs: HabitLog[]): StreakResult {
  // Collect unique dates where at least one habit was completed
  const completedDates = new Set<string>()
  habitLogs.forEach((log) => {
    if (log.completed) {
      completedDates.add(log.date)
    }
  })

  const sortedDates = Array.from(completedDates).sort()
  if (sortedDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0, hasActivityToday: false }
  }

  const todayStr = getTodayString()
  const hasActivityToday = completedDates.has(todayStr)

  // Calculate current streak
  let currentStreak = 0
  const d = new Date()
  if (!hasActivityToday) {
    // Check if there was activity yesterday to continue streak
    d.setDate(d.getDate() - 1)
  }

  while (true) {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const checkDate = `${year}-${month}-${day}`

    if (completedDates.has(checkDate)) {
      currentStreak++
      d.setDate(d.getDate() - 1)
    } else {
      break
    }
  }

  // Calculate longest streak historically
  let longestStreak = 0
  let tempStreak = 0
  let prevDate: Date | null = null

  sortedDates.forEach((dateStr) => {
    const currentDate = new Date(dateStr + 'T00:00:00')
    if (!prevDate) {
      tempStreak = 1
    } else {
      const diffDays = Math.round((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays === 1) {
        tempStreak++
      } else if (diffDays > 1) {
        tempStreak = 1
      }
    }
    if (tempStreak > longestStreak) {
      longestStreak = tempStreak
    }
    prevDate = currentDate
  })

  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
    hasActivityToday,
  }
}
