import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Flame,
  CheckCircle2,
  Calendar,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Plus,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts'
import { useAuth } from '../../context/AuthContext'
import { useHabits } from '../../hooks/useHabits'
import { useGoals } from '../../hooks/useGoals'
import {
  getTodayString,
  formatLongDate,
  getTransformationStats,
  getDaysOfWeek,
  CATEGORY_METADATA,
} from '../../lib/dateUtils'
import { calculateStreaks } from '../../lib/streakUtils'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  ProgressBar,
  Checkbox,
  Badge,
  EmptyState,
} from '../../components/ui'

export function Dashboard() {
  const { profile } = useAuth()
  const todayStr = getTodayString()

  // Habits & Logs
  const {
    activeHabits,
    logs,
    todayLogsMap,
    todayScore,
    todayCompletedCount,
    toggleHabit,
    isLoading: habitsLoading,
  } = useHabits()

  // Goals
  const { activeGoals, isLoading: goalsLoading } = useGoals()

  // Transformation Stats
  const startDate = profile?.transformation_start_date || '2026-09-05'
  const targetDate = profile?.transformation_target_date || '2029-09-05'
  const { currentDay, totalDays, daysRemaining, progressPercent } = getTransformationStats(
    startDate,
    targetDate,
    todayStr
  )

  // Streaks
  const { currentStreak, longestStreak } = useMemo(() => calculateStreaks(logs), [logs])

  // Weekly Overview Data (Mon - Sun)
  const weekDays = useMemo(() => getDaysOfWeek(), [])
  const weeklyChartData = useMemo(() => {
    return weekDays.map((day) => {
      const dayLogs = logs.filter((l) => l.date === day.date)
      const dayCompleted = dayLogs.filter((l) => l.completed).length
      // Calculate score for active habits
      const score =
        activeHabits.length > 0
          ? Math.round((dayCompleted / activeHabits.length) * 100)
          : day.isToday
          ? todayScore
          : 0

      return {
        day: day.name,
        short: day.short,
        date: day.date,
        score,
        isToday: day.isToday,
      }
    })
  }, [weekDays, logs, activeHabits.length, todayScore])

  // Life Area Progress
  const lifeAreas = useMemo(() => {
    const categories = [
      'career',
      'fitness',
      'mind',
      'english',
      'learning',
      'finance',
      'discipline',
      'personal',
    ]

    return categories.map((catKey) => {
      const meta = CATEGORY_METADATA[catKey] || {
        label: catKey,
        color: '#6366f1',
        bg: 'bg-indigo-500/10',
        text: 'text-indigo-400',
      }

      // Find habits in this category
      const catHabits = activeHabits.filter((h) => h.category === catKey)
      let score = 0
      if (catHabits.length > 0) {
        const completed = catHabits.filter((h) => todayLogsMap.get(h.id)).length
        score = Math.round((completed / catHabits.length) * 100)
      } else {
        // Check if any goals in this category
        const catGoals = activeGoals.filter((g) => g.category === catKey)
        if (catGoals.length > 0) {
          const avgProgress =
            catGoals.reduce((sum, g) => sum + g.progress, 0) / catGoals.length
          score = Math.round(avgProgress)
        }
      }

      return {
        key: catKey,
        ...meta,
        score,
        habitsCount: catHabits.length,
      }
    })
  }, [activeHabits, todayLogsMap, activeGoals])

  // Dynamic greeting based on current local hour
  const currentHour = new Date().getHours()
  const greeting =
    currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening'
  const firstName = profile?.full_name?.split(' ')[0] || 'Dev'

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* 1. TOP GREETING & DAY NUMBER BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-7 rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-indigo-950/40 border border-zinc-800/90 shadow-xl relative overflow-hidden">
        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Consistency Beats Intensity</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 font-heading tracking-tight">
            {greeting}, {firstName}
          </h1>
          <p className="text-sm text-zinc-400 flex items-center gap-2 font-medium">
            <Calendar className="w-4 h-4 text-zinc-500" />
            {formatLongDate()}
          </p>
        </div>

        <div className="flex items-center gap-4 sm:gap-6 z-10">
          <div className="flex flex-col items-start sm:items-end">
            <span className="text-xs font-medium text-zinc-400">Transformation Progress</span>
            <span className="text-xl sm:text-2xl font-bold font-heading text-zinc-100">
              Day {currentDay} <span className="text-sm text-zinc-500 font-normal">/ {totalDays}</span>
            </span>
            <span className="text-xs text-indigo-400 font-medium">{daysRemaining} days remaining</span>
          </div>

          <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex flex-col items-center justify-center text-indigo-300 shadow-inner">
            <span className="text-base font-extrabold font-mono">{progressPercent}%</span>
            <span className="text-[9px] uppercase font-semibold text-indigo-400">Horizon</span>
          </div>
        </div>
      </div>

      {/* 2. THREE-YEAR TRANSFORMATION BAR */}
      <Card className="p-5 sm:p-6 bg-zinc-900/70 border-zinc-800/80">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <h3 className="text-sm font-semibold text-zinc-200 font-heading">
              3-Year Transformation
            </h3>
          </div>
          <div className="flex items-center gap-3 text-xs text-zinc-400">
            <span>Start: {startDate}</span>
            <span>•</span>
            <span>Target: {targetDate}</span>
          </div>
        </div>
        <ProgressBar
          value={progressPercent}
          size="md"
          color="indigo"
          showLabel
          label={`Day ${currentDay} of ${totalDays}`}
        />
      </Card>

      {/* 3. CORE METRICS ROW: TODAY SCORE & STREAK */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Today's Score */}
        <Card className="p-5 relative overflow-hidden bg-gradient-to-br from-zinc-900/90 to-zinc-900/50">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Today's Performance
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black font-heading text-zinc-100">
                  {todayScore}
                </span>
                <span className="text-sm text-zinc-400">/ 100</span>
              </div>
              <p className="text-xs text-zinc-400 pt-1">
                {todayCompletedCount} of {activeHabits.length} habits completed today
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <ProgressBar
              value={todayScore}
              size="sm"
              color={todayScore >= 80 ? 'emerald' : todayScore >= 50 ? 'indigo' : 'amber'}
            />
          </div>
        </Card>

        {/* Streak Card */}
        <Card className="p-5 relative overflow-hidden bg-gradient-to-br from-zinc-900/90 to-zinc-900/50">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Habit Streak
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black font-heading text-amber-400 flex items-center gap-1.5">
                  <Flame className="w-7 h-7 text-amber-500 fill-amber-500" />
                  {currentStreak}
                </span>
                <span className="text-sm text-zinc-400">Days</span>
              </div>
              <p className="text-xs text-zinc-400 pt-1">
                Personal record: <span className="text-zinc-200 font-semibold">{longestStreak} days</span>
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-zinc-400">
            <span>{currentStreak > 0 ? 'Streak is active' : 'Complete a habit to start'}</span>
            <span className="text-amber-400/80 font-mono font-medium">Keep going</span>
          </div>
        </Card>

        {/* Focus Workspace Quick Link */}
        <Card className="p-5 relative overflow-hidden bg-gradient-to-br from-zinc-900/90 to-indigo-950/30 sm:col-span-2 lg:col-span-1 flex flex-col justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
              Daily Mission
            </span>
            <h4 className="text-base font-bold text-zinc-100 font-heading">
              Ready for Daily Review?
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Reflect on accomplishments, capture friction points, and rate today's mood.
            </p>
          </div>

          <div className="pt-4">
            <Link to="/today">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-between hover:border-indigo-500/50"
                rightIcon={<ArrowRight className="w-3.5 h-3.5 text-indigo-400" />}
              >
                Open Daily Workspace
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      {/* 4. TODAY'S HABITS CHECKLIST & WEEKLY OVERVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 cols: Today's Habits Checklist */}
        <Card className="lg:col-span-7 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle>Today's Habits</CardTitle>
              <p className="text-xs text-zinc-400 mt-0.5">
                Check off habits as you complete them
              </p>
            </div>
            <Link to="/habits">
              <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                Manage
              </Button>
            </Link>
          </CardHeader>

          <CardContent className="flex-1">
            {habitsLoading ? (
              <div className="space-y-3 py-2">
                <div className="h-12 bg-zinc-800/40 rounded-xl animate-pulse" />
                <div className="h-12 bg-zinc-800/40 rounded-xl animate-pulse" />
                <div className="h-12 bg-zinc-800/40 rounded-xl animate-pulse" />
              </div>
            ) : activeHabits.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 className="w-6 h-6" />}
                title="No active habits"
                description="Your transformation journey is powered by daily routines."
                actionLabel="Create First Habit"
                onAction={() => (window.location.href = '/habits')}
                className="py-8"
              />
            ) : (
              <div className="space-y-2.5">
                {activeHabits.map((habit) => {
                  const isCompleted = Boolean(todayLogsMap.get(habit.id))
                  const meta = CATEGORY_METADATA[habit.category]

                  return (
                    <div
                      key={habit.id}
                      onClick={() => toggleHabit(habit.id, !isCompleted, todayStr, habit.target_value)}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                        isCompleted
                          ? 'bg-zinc-900/90 border-emerald-500/30 text-zinc-100 shadow-sm'
                          : 'bg-zinc-950/40 border-zinc-800/80 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900/40'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Checkbox
                          checked={isCompleted}
                          onChange={(checked) =>
                            toggleHabit(habit.id, checked, todayStr, habit.target_value)
                          }
                        />
                        <div className="min-w-0">
                          <span
                            className={`text-sm font-semibold block truncate ${
                              isCompleted ? 'text-zinc-300 line-through opacity-85' : 'text-zinc-100'
                            }`}
                          >
                            {habit.name}
                          </span>
                          {habit.description && (
                            <span className="text-xs text-zinc-400 block truncate">
                              {habit.description}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {meta && (
                          <Badge variant="default" size="sm" className="hidden sm:inline-flex">
                            {meta.label}
                          </Badge>
                        )}
                        <span
                          className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-lg ${
                            isCompleted
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-zinc-800/60 text-zinc-400'
                          }`}
                        >
                          {isCompleted ? 'Done' : `${habit.target_value} ${habit.unit}`}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right 5 cols: Weekly Overview Chart */}
        <Card className="lg:col-span-5 flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle>Weekly Performance</CardTitle>
            <p className="text-xs text-zinc-400 mt-0.5">
              Daily habit completion score for the current week
            </p>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col justify-between pt-2">
            <div className="h-52 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis
                    dataKey="day"
                    stroke="#71717a"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#27272a' }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    stroke="#71717a"
                    fontSize={10}
                    tickLine={false}
                    axisLine={{ stroke: '#27272a' }}
                    ticks={[0, 25, 50, 75, 100]}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload
                        return (
                          <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-2.5 shadow-xl text-xs">
                            <p className="font-semibold text-zinc-200">
                              {data.day} ({data.date})
                            </p>
                            <p className="text-indigo-400 font-mono font-bold mt-1">
                              Score: {data.score} / 100
                            </p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                    {weeklyChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.isToday
                            ? '#6366f1'
                            : entry.score >= 70
                            ? '#10b981'
                            : entry.score > 0
                            ? '#818cf8'
                            : '#27272a'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Day by Day Quick Indicators */}
            <div className="grid grid-cols-7 gap-1.5 pt-4 border-t border-zinc-800/80 text-center">
              {weeklyChartData.map((item) => (
                <div
                  key={item.day}
                  className={`p-1.5 rounded-xl flex flex-col gap-0.5 ${
                    item.isToday
                      ? 'bg-indigo-600/20 border border-indigo-500/40'
                      : 'bg-zinc-950/40 border border-zinc-800/50'
                  }`}
                >
                  <span className="text-[10px] text-zinc-400 font-medium">{item.short}</span>
                  <span
                    className={`text-xs font-mono font-bold ${
                      item.score >= 70
                        ? 'text-emerald-400'
                        : item.score > 0
                        ? 'text-indigo-400'
                        : 'text-zinc-500'
                    }`}
                  >
                    {item.score > 0 ? item.score : '-'}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 5. LIFE AREAS PROGRESS GRID */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-zinc-100 font-heading tracking-tight">
              Life Areas
            </h2>
            <p className="text-xs text-zinc-400">
              Holistic balance across the 8 key pillars of your transformation
            </p>
          </div>
          <Link to="/analytics" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1">
            Detailed Analytics <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          {lifeAreas.map((area) => (
            <Card
              key={area.key}
              hoverable
              className="p-4 bg-zinc-900/60 border-zinc-800/80 flex flex-col justify-between"
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs font-semibold text-zinc-300 font-heading">
                  {area.label}
                </span>
                <span className="font-mono text-xs font-bold text-zinc-100">
                  {area.score}%
                </span>
              </div>
              <ProgressBar
                value={area.score}
                size="sm"
                color={area.score >= 75 ? 'emerald' : area.score >= 40 ? 'indigo' : 'amber'}
              />
              <span className="text-[11px] text-zinc-500 mt-2 block">
                {area.habitsCount} active {area.habitsCount === 1 ? 'habit' : 'habits'}
              </span>
            </Card>
          ))}
        </div>
      </div>

      {/* 6. GOALS PREVIEW */}
      <Card className="p-6 bg-zinc-900/60 border-zinc-800/80">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-zinc-100 font-heading">
              Active Transformation Goals
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Long-term milestones guiding your daily consistency
            </p>
          </div>
          <Link to="/goals">
            <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
              All Goals
            </Button>
          </Link>
        </div>

        {goalsLoading ? (
          <div className="h-16 bg-zinc-800/40 rounded-xl animate-pulse" />
        ) : activeGoals.length === 0 ? (
          <div className="p-6 text-center border border-dashed border-zinc-800 rounded-2xl">
            <p className="text-xs text-zinc-400 mb-3">No active long-term goals set yet.</p>
            <Link to="/goals">
              <Button size="sm" variant="outline" leftIcon={<Plus className="w-3.5 h-3.5" />}>
                Create Goal
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeGoals.slice(0, 3).map((goal) => {
              const meta = CATEGORY_METADATA[goal.category]
              return (
                <div
                  key={goal.id}
                  className="p-4 rounded-2xl bg-zinc-950/40 border border-zinc-800/80 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      {meta && (
                        <Badge variant="default" size="sm">
                          {meta.label}
                        </Badge>
                      )}
                      {goal.target_date && (
                        <span className="text-[11px] text-zinc-400 font-mono">
                          Target: {goal.target_date}
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-semibold text-zinc-100 font-heading line-clamp-1 mt-1">
                      {goal.title}
                    </h4>
                    {goal.description && (
                      <p className="text-xs text-zinc-400 line-clamp-2">{goal.description}</p>
                    )}
                  </div>

                  <div>
                    <ProgressBar
                      value={goal.progress}
                      size="sm"
                      color="indigo"
                      showLabel
                      label="Progress"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
