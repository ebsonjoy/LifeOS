import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles,
  Calendar,
  Save,
  CheckCircle2,
  Smile,
  Frown,
  Meh,
  Award,
  Clock,
  ArrowRight,
  Smartphone,
  Languages,
  Copy,
  CheckCheck,
  Moon,
  ChevronRight,
} from 'lucide-react'
import { useHabits } from '../../hooks/useHabits'
import { useDailyLog } from '../../hooks/useDailyLog'
import { usePlanning } from '../../hooks/usePlanning'
import { getTodayString, formatLongDate, CATEGORY_METADATA } from '../../lib/dateUtils'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Textarea,
  Checkbox,
  ProgressBar,
  Badge,
  Modal,
} from '../../components/ui'
import type { HabitCategory } from '../../types'

export function Today() {
  const todayStr = getTodayString()

  const {
    activeHabits,
    todayLogsMap,
    todayScore,
    todayCompletedCount,
    toggleHabit,
    isLoading: habitsLoading,
  } = useHabits()

  const { dailyLog, saveDailyLog, isSaving } = useDailyLog(todayStr)
  const {
    tasks: plannedTasks,
    totalTasks,
    completedTasks,
    progressPercent: planProgress,
    toggleTask,
  } = usePlanning(todayStr)

  // Right-side drawer modal state
  const [isReviewDrawerOpen, setIsReviewDrawerOpen] = useState(false)

  // Daily reflection state
  const [mood, setMood] = useState<number>(4)
  const [screenHours, setScreenHours] = useState('')
  const [screenMinutes, setScreenMinutes] = useState('')
  const [accomplishments, setAccomplishments] = useState('')
  const [wentWrong, setWentWrong] = useState('')
  const [improveTomorrow, setImproveTomorrow] = useState('')
  const [journal, setJournal] = useState('')
  const [journalCorrected, setJournalCorrected] = useState('')
  const [isComparingJournal, setIsComparingJournal] = useState(false)

  // Sync existing daily log data
  useEffect(() => {
    if (dailyLog) {
      if (dailyLog.mood != null) setMood(dailyLog.mood)
      if (dailyLog.screen_time_minutes != null) {
        const h = Math.floor(dailyLog.screen_time_minutes / 60)
        const m = dailyLog.screen_time_minutes % 60
        setScreenHours(h.toString())
        setScreenMinutes(m.toString())
      }
      if (dailyLog.accomplishments) setAccomplishments(dailyLog.accomplishments)
      if (dailyLog.went_wrong) setWentWrong(dailyLog.went_wrong)
      if (dailyLog.improve_tomorrow) setImproveTomorrow(dailyLog.improve_tomorrow)
      if (dailyLog.journal) setJournal(dailyLog.journal)
      if (dailyLog.journal_corrected) setJournalCorrected(dailyLog.journal_corrected)
    }
  }, [dailyLog])

  // Computed total minutes for display and saving
  const computedScreenMinutes =
    screenHours !== '' || screenMinutes !== ''
      ? (parseInt(screenHours, 10) || 0) * 60 + (parseInt(screenMinutes, 10) || 0)
      : null

  const handleSaveDay = async (e: React.FormEvent) => {
    e.preventDefault()
    await saveDailyLog({
      mood,
      daily_score: todayScore,
      screen_time_minutes: computedScreenMinutes,
      accomplishments,
      went_wrong: wentWrong,
      improve_tomorrow: improveTomorrow,
      journal,
      journal_corrected: journalCorrected,
    })
    setIsReviewDrawerOpen(false)
  }

  // Group habits by category for mission structure
  const habitsByCategory = activeHabits.reduce((acc, habit) => {
    if (!acc[habit.category]) acc[habit.category] = []
    acc[habit.category].push(habit)
    return acc
  }, {} as Record<HabitCategory, typeof activeHabits>)

  const categories = Object.keys(habitsByCategory) as HabitCategory[]

  const moodOptions = [
    { value: 1, label: 'Difficult', icon: <Frown className="w-5 h-5 text-rose-400" /> },
    { value: 2, label: 'Challenging', icon: <Frown className="w-5 h-5 text-amber-400" /> },
    { value: 3, label: 'Neutral', icon: <Meh className="w-5 h-5 text-zinc-400" /> },
    { value: 4, label: 'Solid / Good', icon: <Smile className="w-5 h-5 text-emerald-400" /> },
    { value: 5, label: 'Peak Flow', icon: <Award className="w-5 h-5 text-indigo-400" /> },
  ]

  const selectedMoodObj = moodOptions.find((m) => m.value === mood)
  const isReviewCompleted = Boolean(
    dailyLog && (dailyLog.mood != null || dailyLog.accomplishments || dailyLog.journal)
  )

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Daily Execution Workspace</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 font-heading tracking-tight">
            Today's Mission
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 flex items-center gap-2 mt-1">
            <Calendar className="w-4 h-4 text-zinc-500" />
            {formatLongDate(todayStr)}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* How was today? CTA Button */}
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsReviewDrawerOpen(true)}
            leftIcon={<Moon className="w-4 h-4 text-indigo-200" />}
            className="shadow-lg shadow-indigo-500/20"
          >
            How was today?
          </Button>

          {/* Live Score Banner */}
          <div className="flex items-center gap-4 p-3 sm:p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 shadow-md">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold block">
                Day Score
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-2xl font-black font-heading text-zinc-100">{todayScore}</span>
                <span className="text-xs text-zinc-500">/ 100</span>
              </div>
            </div>
            <div className="w-20 sm:w-24">
              <ProgressBar
                value={todayScore}
                size="sm"
                color={todayScore >= 80 ? 'emerald' : todayScore >= 50 ? 'indigo' : 'amber'}
              />
              <span className="text-[10px] text-zinc-400 mt-1 block text-right font-mono">
                {todayCompletedCount}/{activeHabits.length}
              </span>
            </div>

            {(dailyLog?.screen_time_minutes != null || computedScreenMinutes !== null) && (
              <div className="hidden sm:flex flex-col border-l border-zinc-800/80 pl-4">
                <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold block">
                  Screen Time
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-sm font-bold text-zinc-100 font-mono">
                    {Math.floor((dailyLog?.screen_time_minutes ?? computedScreenMinutes ?? 0) / 60)}h{' '}
                    {(dailyLog?.screen_time_minutes ?? computedScreenMinutes ?? 0) % 60}m
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Evening Review Status Card (Click to open right-side modal) */}
      <div
        onClick={() => setIsReviewDrawerOpen(true)}
        className={`group cursor-pointer p-4 sm:p-5 rounded-2xl border transition-all duration-200 ${
          isReviewCompleted
            ? 'bg-gradient-to-r from-emerald-950/20 via-zinc-900/80 to-zinc-900/90 border-emerald-500/30 hover:border-emerald-500/50 shadow-md'
            : 'bg-gradient-to-r from-indigo-950/30 via-zinc-900/80 to-zinc-900/90 border-indigo-500/30 hover:border-indigo-500/50 shadow-lg'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div
              className={`p-3 rounded-2xl ${
                isReviewCompleted
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse'
              }`}
            >
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-zinc-100 font-heading">
                  How was today? — Evening Review
                </h3>
                {isReviewCompleted ? (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Reviewed
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                    Pending
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                {isReviewCompleted
                  ? `Logged state: ${selectedMoodObj?.label || 'Solid'} (${mood}/5) • ${
                      computedScreenMinutes != null
                        ? `Screen: ${Math.floor(computedScreenMinutes / 60)}h ${computedScreenMinutes % 60}m • `
                        : ''
                    }Click to view or edit reflection`
                  : 'Take 2 minutes to record your mood, screen time, daily wins, and English journal.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <span className="text-xs font-semibold text-indigo-400 group-hover:text-indigo-300 flex items-center gap-1">
              {isReviewCompleted ? 'Edit Review' : 'Open Review Modal'}
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </span>
          </div>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Scheduled Time-Blocks Column */}
        {totalTasks > 0 && (
          <div className="lg:col-span-5 space-y-4">
            <Card className="p-5 bg-zinc-900/90 border-zinc-800 shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Today's Time-Blocks</span>
                  </div>
                  <h3 className="text-sm font-bold text-zinc-100 font-heading mt-0.5">
                    Schedule Execution ({completedTasks}/{totalTasks})
                  </h3>
                </div>
                <Link
                  to="/planning"
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                >
                  Edit Schedule <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <ProgressBar
                value={planProgress}
                size="sm"
                color={planProgress === 100 ? 'emerald' : 'indigo'}
                showLabel
              />

              <div className="space-y-1.5 pt-1">
                {plannedTasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => toggleTask(t.id, !t.completed)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                      t.completed
                        ? 'bg-zinc-800/40 border-emerald-500/30'
                        : 'bg-zinc-950/40 border-zinc-800/80 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Checkbox checked={t.completed} onChange={(c) => toggleTask(t.id, c)} />
                      <span
                        className={`text-xs font-semibold truncate ${
                          t.completed ? 'line-through text-zinc-400 opacity-80' : 'text-zinc-200'
                        }`}
                      >
                        {t.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="default" size="sm">
                        {t.category}
                      </Badge>
                      <span className="text-[11px] font-mono text-zinc-400">
                        {t.start_time}–{t.end_time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Habits & Tasks Column */}
        <div className={totalTasks > 0 ? 'lg:col-span-7' : 'lg:col-span-12'}>
          <Card className="p-6 bg-zinc-900/80 border-zinc-800/80 shadow-lg">
            <CardHeader className="p-0 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Habits & Tasks</CardTitle>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Execute today's system. One win at a time.
                  </p>
                </div>
                <Badge variant="info" size="sm">
                  {todayCompletedCount}/{activeHabits.length} Completed
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-0 space-y-5">
              {habitsLoading ? (
                <div className="space-y-3">
                  <div className="h-10 bg-zinc-800/40 rounded-xl animate-pulse" />
                  <div className="h-10 bg-zinc-800/40 rounded-xl animate-pulse" />
                </div>
              ) : categories.length === 0 ? (
                <div className="text-center py-8 text-zinc-400 text-xs">
                  No active habits. Create habits from the Habits page or Quick Action.
                </div>
              ) : (
                categories.map((catKey) => {
                  const meta = CATEGORY_METADATA[catKey]
                  const items = habitsByCategory[catKey] || []

                  return (
                    <div key={catKey} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="default" size="sm">
                          {meta?.label || catKey}
                        </Badge>
                      </div>

                      <div className="space-y-1.5 pl-1">
                        {items.map((habit) => {
                          const isCompleted = Boolean(todayLogsMap.get(habit.id))

                          return (
                            <div
                              key={habit.id}
                              onClick={() =>
                                toggleHabit(habit.id, !isCompleted, todayStr, habit.target_value)
                              }
                              className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                                isCompleted
                                  ? 'bg-zinc-800/40 border-emerald-500/30 text-zinc-200'
                                  : 'bg-zinc-950/40 border-zinc-800/70 hover:border-zinc-700'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  checked={isCompleted}
                                  onChange={(c) =>
                                    toggleHabit(habit.id, c, todayStr, habit.target_value)
                                  }
                                />
                                <div>
                                  <span
                                    className={`text-sm font-semibold block ${
                                      isCompleted
                                        ? 'line-through text-zinc-400 opacity-80'
                                        : 'text-zinc-100'
                                    }`}
                                  >
                                    {habit.name}
                                  </span>
                                  {habit.description && (
                                    <span className="text-xs text-zinc-400 block">
                                      {habit.description}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <span className="text-[11px] font-mono text-zinc-400 shrink-0">
                                {isCompleted ? '✓ Done' : `${habit.target_value} ${habit.unit}`}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* "HOW WAS TODAY?" RIGHT-SIDE SLIDE-OVER DRAWER MODAL */}
      <Modal
        isOpen={isReviewDrawerOpen}
        onClose={() => setIsReviewDrawerOpen(false)}
        title="How was today?"
        description="Close out your day with an honest 2-minute review & deliberate language practice"
        position="right"
        maxWidth="xl"
      >
        <form onSubmit={handleSaveDay} className="space-y-5 pb-4">
          {/* Mood Selector */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-2">
              Today's State & Mood
            </label>
            <div className="grid grid-cols-5 gap-2">
              {moodOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMood(opt.value)}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all ${
                    mood === opt.value
                      ? 'bg-indigo-600/25 border-indigo-500/70 shadow-sm ring-1 ring-indigo-500/30'
                      : 'bg-zinc-950/40 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  {opt.icon}
                  <span className="text-[10px] font-semibold text-zinc-300 mt-1">
                    {opt.value}/5
                  </span>
                  <span className="text-[9px] text-zinc-500">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Screen Time Section */}
          <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/90 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-200 block leading-tight">
                    Screen Time
                  </label>
                  <span className="text-[11px] text-zinc-500">
                    Phone & device screen usage
                  </span>
                </div>
              </div>

              {/* Digital Discipline / Focus Indicator */}
              {computedScreenMinutes !== null ? (
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    computedScreenMinutes <= 120
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                      : computedScreenMinutes <= 240
                      ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                      : computedScreenMinutes <= 360
                      ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                      : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                  }`}
                >
                  {computedScreenMinutes <= 120
                    ? '🟢 Minimal / Deep Focus'
                    : computedScreenMinutes <= 240
                    ? '🔵 Controlled'
                    : computedScreenMinutes <= 360
                    ? '🟡 Moderate'
                    : '🔴 High Screen Time'}
                </span>
              ) : (
                <span className="text-[11px] text-zinc-500">Optional</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={24}
                  placeholder="0"
                  value={screenHours}
                  onChange={(e) => setScreenHours(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 pr-12 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors font-mono"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 pointer-events-none font-medium">
                  hours
                </span>
              </div>

              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={59}
                  placeholder="0"
                  value={screenMinutes}
                  onChange={(e) => setScreenMinutes(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 pr-12 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors font-mono"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 pointer-events-none font-medium">
                  mins
                </span>
              </div>
            </div>

            {/* Quick Preset Badges */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mr-1">
                Presets:
              </span>
              {[
                { label: '1h 30m', h: '1', m: '30' },
                { label: '2h 30m', h: '2', m: '30' },
                { label: '4h 00m', h: '4', m: '0' },
                { label: '5h 30m', h: '5', m: '30' },
                { label: '7h+', h: '7', m: '0' },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setScreenHours(preset.h)
                    setScreenMinutes(preset.m)
                  }}
                  className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-zinc-900 border border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 hover:bg-zinc-800/60 transition-all cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
              {(screenHours !== '' || screenMinutes !== '') && (
                <button
                  type="button"
                  onClick={() => {
                    setScreenHours('')
                    setScreenMinutes('')
                  }}
                  className="text-[10px] text-rose-400 hover:text-rose-300 ml-auto font-medium cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Accomplished */}
          <Textarea
            label="What did I accomplish today?"
            placeholder="Key wins, finished tasks, progress made..."
            rows={2}
            value={accomplishments}
            onChange={(e) => setAccomplishments(e.target.value)}
          />

          {/* Went Wrong */}
          <Textarea
            label="What went wrong or caused friction?"
            placeholder="Distractions, procrastination, energy drops..."
            rows={2}
            value={wentWrong}
            onChange={(e) => setWentWrong(e.target.value)}
          />

          {/* Improve Tomorrow */}
          <Textarea
            label="What will I improve tomorrow?"
            placeholder="One specific adjustment to win tomorrow..."
            rows={2}
            value={improveTomorrow}
            onChange={(e) => setImproveTomorrow(e.target.value)}
          />

          {/* Dual Journal: My Version & Corrected English Version */}
          <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/90 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-zinc-800/70">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                  <Languages className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                    <span>Daily English Journal & Correction</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-medium">
                      Self-Improvement
                    </span>
                  </h4>
                  <p className="text-[11px] text-zinc-400">
                    Write in your own English, then observe corrections to spot mistakes
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {journal.trim() && !journalCorrected.trim() && (
                  <button
                    type="button"
                    onClick={() => setJournalCorrected(journal)}
                    className="text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-1 rounded-lg border border-indigo-500/20 transition-all cursor-pointer"
                    title="Copy original draft into corrected field to start refining"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy Draft to Edit</span>
                  </button>
                )}

                {journal.trim() && journalCorrected.trim() && (
                  <button
                    type="button"
                    onClick={() => setIsComparingJournal(!isComparingJournal)}
                    className={`text-[10px] font-semibold flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                      isComparingJournal
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                    }`}
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>{isComparingJournal ? 'Hide Comparison' : 'Compare Versions'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Side-by-side Comparative Diff Preview */}
            {isComparingJournal && journal.trim() && journalCorrected.trim() && (
              <div className="p-3 rounded-xl bg-zinc-900/90 border border-indigo-500/30 space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-[11px] text-indigo-300 font-medium">
                  <span>Side-by-Side Review</span>
                  <span className="text-[10px] text-zinc-400">
                    Notice grammar, vocabulary & sentence structure
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800 text-zinc-300 leading-relaxed">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400/90 mb-1 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                      <span>My Version (Original Draft)</span>
                    </div>
                    <p className="whitespace-pre-wrap">{journal}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-emerald-200 leading-relaxed">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-1 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      <span>Corrected Version (Target English)</span>
                    </div>
                    <p className="whitespace-pre-wrap">{journalCorrected}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Input 1: My Version (Raw / Original Draft) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  <span>1. My Journal (Your Version / Raw Draft)</span>
                </label>
                <span className="text-[10px] font-mono text-zinc-500">
                  {journal.trim() ? `${journal.trim().split(/\s+/).length} words` : '0 words'}
                </span>
              </div>
              <Textarea
                placeholder="Write freely in your own English without worrying about mistakes (e.g. what you did, learned, felt today)..."
                rows={3}
                value={journal}
                onChange={(e) => setJournal(e.target.value)}
              />
            </div>

            {/* Input 2: Corrected Journal (Polished Version) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>2. Corrected Journal (Polished English & Feedback)</span>
                </label>
                <span className="text-[10px] font-mono text-zinc-500">
                  {journalCorrected.trim()
                    ? `${journalCorrected.trim().split(/\s+/).length} words`
                    : '0 words'}
                </span>
              </div>
              <Textarea
                placeholder="Paste or write the improved version here (from grammar tool, AI, mentor, or self-correction) to observe and learn from mistakes..."
                rows={3}
                value={journalCorrected}
                onChange={(e) => setJournalCorrected(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => setIsReviewDrawerOpen(false)}
              className="flex-1 justify-center"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="flex-2 justify-center"
              isLoading={isSaving}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Save Day Review
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
