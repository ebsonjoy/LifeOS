import { useState, useMemo } from 'react'
import {
  BarChart3,
  TrendingUp,
  Flame,
  Award,
  Zap,
} from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'
import { useHabits } from '../../hooks/useHabits'
import { calculateStreaks } from '../../lib/streakUtils'
import { CATEGORY_METADATA } from '../../lib/dateUtils'
import {
  PageHeader,
  Card,
  StatCard,
  ProgressBar,
  EmptyState,
} from '../../components/ui'

export function Analytics() {
  const [timeframe, setTimeframe] = useState<'7' | '30'>('7')

  const { habits, logs, isLoading } = useHabits()

  const { currentStreak, longestStreak } = useMemo(() => calculateStreaks(logs), [logs])

  // Aggregate daily scores for selected timeframe (7 or 30 days)
  const scoreTrends = useMemo(() => {
    const daysCount = parseInt(timeframe, 10)
    const result = []
    const now = new Date()

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      const dateStr = `${year}-${month}-${day}`
      const shortLabel = `${month}/${day}`

      const dayLogs = logs.filter((l) => l.date === dateStr)
      const completed = dayLogs.filter((l) => l.completed).length
      const activeCount = habits.filter((h) => h.is_active).length
      const score = activeCount > 0 ? Math.round((completed / activeCount) * 100) : 0

      result.push({
        date: dateStr,
        label: shortLabel,
        score,
        completed,
      })
    }
    return result
  }, [timeframe, logs, habits])

  // Life Area Performance
  const lifeAreaStats = useMemo(() => {
    const categories = ['career', 'fitness', 'english', 'discipline', 'learning', 'mind']

    return categories.map((catKey) => {
      const meta = CATEGORY_METADATA[catKey]
      const catHabits = habits.filter((h) => h.category === catKey)
      const catHabitIds = new Set(catHabits.map((h) => h.id))

      // Filter logs for this category over the last 30 days
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]

      const relevantLogs = logs.filter(
        (l) => catHabitIds.has(l.habit_id) && l.date >= thirtyDaysAgoStr
      )
      const completedLogs = relevantLogs.filter((l) => l.completed).length
      const totalExpected = Math.max(1, catHabits.length * 30)
      const completionRate = Math.min(100, Math.round((completedLogs / totalExpected) * 100))

      return {
        key: catKey,
        label: meta?.label || catKey,
        color: meta?.color || '#6366f1',
        rate: completionRate,
        habitsCount: catHabits.length,
      }
    })
  }, [habits, logs])

  // Overall Consistency Scores
  const { weeklyConsistency, monthlyConsistency } = useMemo(() => {
    const now = new Date()
    const getRate = (days: number) => {
      let activeDaysWithCheck = 0
      for (let i = 0; i < days; i++) {
        const d = new Date(now)
        d.setDate(now.getDate() - i)
        const dateStr = d.toISOString().split('T')[0]
        const hasCompleted = logs.some((l) => l.date === dateStr && l.completed)
        if (hasCompleted) activeDaysWithCheck++
      }
      return Math.round((activeDaysWithCheck / days) * 100)
    }

    return {
      weeklyConsistency: getRate(7),
      monthlyConsistency: getRate(30),
    }
  }, [logs])

  const hasData = logs.length > 0 || habits.length > 0

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-in fade-in duration-300">
      <PageHeader
        title="Performance Analytics"
        description="Data-driven insights on consistency, habit velocity, and life area mastery"
      />

      {!hasData && !isLoading ? (
        <EmptyState
          icon={<BarChart3 className="w-8 h-8" />}
          title="No analytics recorded yet"
          description="Analytics are generated dynamically as you track daily habits and complete missions."
          actionLabel="Start Daily Habits"
          onAction={() => (window.location.href = '/habits')}
        />
      ) : (
        <>
          {/* 1. CONSISTENCY & STREAK METRICS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              label="Current Streak"
              value={`${currentStreak} Days`}
              icon={<Flame className="w-5 h-5 text-amber-500 fill-amber-500" />}
              subValue="Active consecutive streak"
            />
            <StatCard
              label="Longest Streak"
              value={`${longestStreak} Days`}
              icon={<Award className="w-5 h-5 text-indigo-400" />}
              subValue="All-time personal record"
            />
            <StatCard
              label="Weekly Consistency"
              value={`${weeklyConsistency}%`}
              icon={<Zap className="w-5 h-5 text-emerald-400" />}
              subValue="Last 7 calendar days"
            />
            <StatCard
              label="Monthly Consistency"
              value={`${monthlyConsistency}%`}
              icon={<TrendingUp className="w-5 h-5 text-sky-400" />}
              subValue="Last 30 calendar days"
            />
          </div>

          {/* 2. DAILY SCORE TREND */}
          <Card className="p-6 bg-zinc-900/80 border-zinc-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="text-base font-bold text-zinc-100 font-heading">
                  Daily Execution Score Trend
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Percentage of active habits completed per day (0–100)
                </p>
              </div>

              {/* Timeframe selector */}
              <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 self-start">
                <button
                  onClick={() => setTimeframe('7')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    timeframe === '7'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Last 7 Days
                </button>
                <button
                  onClick={() => setTimeframe('30')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    timeframe === '30'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Last 30 Days
                </button>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={scoreTrends} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                  <XAxis
                    dataKey="label"
                    stroke="#71717a"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#27272a' }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    stroke="#71717a"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#27272a' }}
                    ticks={[0, 25, 50, 75, 100]}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload
                        return (
                          <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-2.5 shadow-xl text-xs">
                            <p className="font-semibold text-zinc-300">{d.date}</p>
                            <p className="font-mono font-bold text-indigo-400 mt-1">
                              Score: {d.score} / 100
                            </p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#6366f1' }}
                    activeDot={{ r: 5, fill: '#818cf8' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* 3. LIFE AREA PERFORMANCE */}
          <Card className="p-6 bg-zinc-900/80 border-zinc-800">
            <h3 className="text-base font-bold text-zinc-100 font-heading mb-1">
              Life Area Consistency (Last 30 Days)
            </h3>
            <p className="text-xs text-zinc-400 mb-6">
              Evaluation of which domains are advancing and which need immediate attention
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {lifeAreaStats.map((area) => (
                <div
                  key={area.key}
                  className="p-4 rounded-xl bg-zinc-950/40 border border-zinc-800/80 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-zinc-200">{area.label}</span>
                    <span className="font-mono text-xs font-bold text-zinc-100">
                      {area.rate}% Consistency
                    </span>
                  </div>
                  <ProgressBar
                    value={area.rate}
                    size="sm"
                    color={area.rate >= 70 ? 'emerald' : area.rate >= 40 ? 'indigo' : 'amber'}
                  />
                  <span className="text-[11px] text-zinc-500">
                    {area.habitsCount} active {area.habitsCount === 1 ? 'habit' : 'habits'} tracked
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
