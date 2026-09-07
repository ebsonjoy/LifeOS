import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useHabits } from '../../hooks/useHabits'
import { useGoals } from '../../hooks/useGoals'
import { Button, Card, Input, Checkbox } from '../../components/ui'
import { Zap, CheckCircle2, ArrowRight, Sparkles, Target, Compass } from 'lucide-react'
import type { HabitCategory } from '../../types'

interface HabitOption {
  id: string
  name: string
  category: HabitCategory
  unit: string
  targetValue: number
  color: string
  icon: string
  description: string
  selected: boolean
}

export function Onboarding() {
  const navigate = useNavigate()
  const { profile, updateProfile } = useAuth()
  const { createHabit } = useHabits()
  const { createGoal } = useGoals()

  const [step, setStep] = useState(1)
  const [startDate, setStartDate] = useState(
    profile?.transformation_start_date || new Date().toISOString().split('T')[0]
  )
  const [targetDate, setTargetDate] = useState(
    profile?.transformation_target_date ||
      new Date(Date.now() + 1095 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  )

  // Preset habits
  const [habits, setHabits] = useState<HabitOption[]>([
    {
      id: 'h1',
      name: 'Deep Work (2 hrs)',
      category: 'career',
      unit: 'hours',
      targetValue: 2,
      color: '#6366f1',
      icon: '💻',
      description: 'Focused coding and deep technical architecture without distraction',
      selected: true,
    },
    {
      id: 'h2',
      name: 'Physical Workout',
      category: 'fitness',
      unit: 'session',
      targetValue: 1,
      color: '#10b981',
      icon: '🏋️',
      description: 'Strength training or cardiovascular workout',
      selected: true,
    },
    {
      id: 'h3',
      name: 'English Practice',
      category: 'english',
      unit: 'minutes',
      targetValue: 20,
      color: '#f59e0b',
      icon: '🗣️',
      description: 'Active speaking, vocabulary, or presentation practice',
      selected: true,
    },
    {
      id: 'h4',
      name: 'Reading 20 mins',
      category: 'learning',
      unit: 'minutes',
      targetValue: 20,
      color: '#06b6d4',
      icon: '📚',
      description: 'Non-fiction books, engineering blogs, or philosophy',
      selected: true,
    },
    {
      id: 'h5',
      name: 'Sleep on Time',
      category: 'discipline',
      unit: 'check',
      targetValue: 1,
      color: '#8b5cf6',
      icon: '😴',
      description: 'Consistent sleep schedule for brain recovery',
      selected: true,
    },
    {
      id: 'h6',
      name: 'Control Screen Time',
      category: 'mind',
      unit: 'hours',
      targetValue: 2,
      color: '#ec4899',
      icon: '📱',
      description: 'Keep recreational phone screen time below 2 hours',
      selected: false,
    },
  ])

  // Initial Goal
  const [goalTitle, setGoalTitle] = useState('Become an exceptional senior engineer')
  const [goalCategory, setGoalCategory] = useState<HabitCategory>('career')

  const toggleHabit = (id: string) => {
    setHabits((prev) =>
      prev.map((h) => (h.id === id ? { ...h, selected: !h.selected } : h))
    )
  }

  const handleFinish = async () => {
    try {
      // 1. Update transformation dates & mark onboarding completed
      await updateProfile({
        transformation_start_date: startDate,
        transformation_target_date: targetDate,
        onboarding_completed: true,
      })

      // 2. Create selected habits
      const selectedHabits = habits.filter((h) => h.selected)
      for (const h of selectedHabits) {
        await createHabit({
          name: h.name,
          category: h.category,
          frequency: 'daily',
          target_value: h.targetValue,
          unit: h.unit,
          color: h.color,
          is_active: true,
          description: h.description,
        })
      }

      // 3. Create initial goal if title present
      if (goalTitle.trim()) {
        await createGoal({
          title: goalTitle.trim(),
          category: goalCategory,
          target_date: targetDate,
          progress: 10,
          status: 'active',
        })
      }

      navigate('/dashboard')
    } catch (err) {
      console.error('Error completing onboarding', err)
      navigate('/dashboard')
    }
  }

  const handleSkip = async () => {
    await updateProfile({ onboarding_completed: true })
    navigate('/dashboard')
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'Dev'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-zinc-950 text-zinc-100">
      <div className="w-full max-w-xl">
        {/* Progress header indicator */}
        <div className="flex items-center justify-between mb-8 px-2">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
              <Zap className="w-3.5 h-3.5 fill-white" />
            </div>
            <span className="font-bold text-sm text-zinc-100 font-heading">LifeOS Setup</span>
          </div>

          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  step === i
                    ? 'w-6 bg-indigo-500'
                    : step > i
                    ? 'w-3 bg-indigo-800'
                    : 'w-3 bg-zinc-800'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleSkip}
            className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Skip for now
          </button>
        </div>

        {/* STEP 1: Welcome & Vision */}
        {step === 1 && (
          <Card className="p-8 sm:p-10 bg-zinc-900/90 border-zinc-800 text-center shadow-2xl animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 rounded-3xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mx-auto mb-6">
              <Sparkles className="w-8 h-8" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-heading text-zinc-100 tracking-tight">
              Welcome to LifeOS, {firstName}.
            </h1>
            <p className="text-base text-zinc-300 font-medium mt-3">
              Your 3-year transformation begins today.
            </p>
            <div className="my-6 p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800 text-zinc-400 text-sm space-y-1">
              <p className="font-mono text-indigo-400 font-semibold text-base">1,095 Days</p>
              <p>You don't need to change everything today.</p>
              <p className="text-zinc-200 font-medium">You only need to win today.</p>
            </div>
            <Button
              size="lg"
              variant="primary"
              onClick={() => setStep(2)}
              className="w-full justify-center"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Start Day 1
            </Button>
          </Card>
        )}

        {/* STEP 2: Dates */}
        {step === 2 && (
          <Card className="p-8 bg-zinc-900/90 border-zinc-800 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-zinc-100 font-heading">Transformation Horizon</h2>
                <p className="text-xs text-zinc-400">Set your official 3-year transformation dates</p>
              </div>
            </div>

            <div className="space-y-4">
              <Input
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                helperText="Day 1 of your journey"
              />
              <Input
                label="Target Date (3 Years)"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                helperText="1,095 days horizon"
              />
            </div>

            <div className="flex justify-between items-center mt-8 pt-5 border-t border-zinc-800">
              <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => setStep(3)}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Continue
              </Button>
            </div>
          </Card>
        )}

        {/* STEP 3: Starter Habits */}
        {step === 3 && (
          <Card className="p-8 bg-zinc-900/90 border-zinc-800 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-zinc-100 font-heading">Choose Your Daily Habits</h2>
                <p className="text-xs text-zinc-400">Select what you want to practice each day (you can customize anytime)</p>
              </div>
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {habits.map((h) => (
                <div
                  key={h.id}
                  onClick={() => toggleHabit(h.id)}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                    h.selected
                      ? 'bg-zinc-800/80 border-indigo-500/50 text-zinc-100 shadow-sm'
                      : 'bg-zinc-950/40 border-zinc-800/80 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{h.icon}</span>
                    <div>
                      <span className="text-sm font-semibold block text-zinc-100">{h.name}</span>
                      <span className="text-xs text-zinc-400">{h.description}</span>
                    </div>
                  </div>
                  <Checkbox checked={h.selected} onChange={() => toggleHabit(h.id)} />
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center mt-8 pt-5 border-t border-zinc-800">
              <Button variant="ghost" size="sm" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => setStep(4)}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Continue
              </Button>
            </div>
          </Card>
        )}

        {/* STEP 4: First Transformation Goal */}
        {step === 4 && (
          <Card className="p-8 bg-zinc-900/90 border-zinc-800 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-zinc-100 font-heading">Set Your North Star Goal</h2>
                <p className="text-xs text-zinc-400">What is the single biggest milestone you are working towards?</p>
              </div>
            </div>

            <div className="space-y-4">
              <Input
                label="Goal Description"
                placeholder="e.g. Master Backend Systems & Land Staff Role"
                value={goalTitle}
                onChange={(e) => setGoalTitle(e.target.value)}
                required
              />

              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-2">Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['career', 'fitness', 'english', 'learning', 'discipline', 'mind'] as HabitCategory[]).map(
                    (cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setGoalCategory(cat)}
                        className={`px-3 py-2 rounded-xl text-xs font-medium capitalize border transition-all ${
                          goalCategory === cat
                            ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40 shadow-sm'
                            : 'bg-zinc-950/50 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        {cat}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center mt-8 pt-5 border-t border-zinc-800">
              <Button variant="ghost" size="sm" onClick={() => setStep(3)}>
                Back
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => setStep(5)}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Review & Launch
              </Button>
            </div>
          </Card>
        )}

        {/* STEP 5: Ready to launch */}
        {step === 5 && (
          <Card className="p-8 sm:p-10 bg-zinc-900/90 border-zinc-800 text-center shadow-2xl animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold font-heading text-zinc-100">You're Ready.</h2>
            <p className="text-base text-zinc-300 mt-2">Day 1 starts now.</p>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-4 leading-relaxed">
              Every small repetition compounds. Open LifeOS daily, record your mission, and maintain consistency.
            </p>

            <Button
              size="lg"
              variant="primary"
              onClick={handleFinish}
              className="mt-8 w-full justify-center"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Enter My Dashboard
            </Button>
          </Card>
        )}
      </div>
    </div>
  )
}
