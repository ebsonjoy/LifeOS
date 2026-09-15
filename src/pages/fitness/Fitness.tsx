import { useState, useMemo } from 'react'
import {
  Plus,
  Dumbbell,
  Scale,
  Clock,
  Trash2,
  TrendingUp,
  Ruler,
  Calendar,
  Activity,
  Trophy,
  Zap,
  Layers,
} from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
} from 'recharts'
import { useFitness } from '../../hooks/useFitness'
import { getTodayString } from '../../lib/dateUtils'
import {
  PageHeader,
  Button,
  Card,
  Modal,
  Input,
  Textarea,
  ConfirmDialog,
  Badge,
  EmptyState,
} from '../../components/ui'
import type { MuscleGroup } from '../../types'

interface MuscleInfo {
  id: MuscleGroup
  name: string
  icon: string
  day: string
  recommendedExercises: string[]
  description: string
  color: string
}

const MUSCLE_PROGRAM: MuscleInfo[] = [
  {
    id: 'chest',
    name: 'Chest (Pectorals)',
    icon: '🛡️',
    day: 'Monday / Push Day',
    recommendedExercises: [
      'Barbell Bench Press',
      'Incline Dumbbell Press',
      'Dips',
      'Cable Chest Flyes',
      'Push-ups',
    ],
    description: 'Pectoral major & minor push volume and pressing power',
    color: 'from-indigo-500/20 to-indigo-600/5',
  },
  {
    id: 'back',
    name: 'Back (Lats & Traps)',
    icon: '🦅',
    day: 'Tuesday / Pull Day',
    recommendedExercises: [
      'Barbell Deadlift',
      'Pull-ups / Chin-ups',
      'Barbell Bent-Over Row',
      'Lat Pulldown',
      'Seated Cable Row',
    ],
    description: 'Lat width, upper back thickness, and posterior chain power',
    color: 'from-emerald-500/20 to-emerald-600/5',
  },
  {
    id: 'legs',
    name: 'Legs (Quads & Hamstrings)',
    icon: '🦵',
    day: 'Wednesday / Leg Day',
    recommendedExercises: [
      'Barbell Back Squat',
      'Romanian Deadlift (RDL)',
      'Leg Press',
      'Bulgarian Split Squat',
      'Calf Raises',
    ],
    description: 'Lower body foundation, quad drive, and explosive stability',
    color: 'from-amber-500/20 to-amber-600/5',
  },
  {
    id: 'shoulders',
    name: 'Shoulders (Deltoids)',
    icon: '🥥',
    day: 'Thursday / Shoulders',
    recommendedExercises: [
      'Overhead Press',
      'Dumbbell Lateral Raise',
      'Face Pulls',
      'Arnold Press',
      'Rear Delt Fly',
    ],
    description: 'Front, lateral, and rear deltoid cap development',
    color: 'from-rose-500/20 to-rose-600/5',
  },
  {
    id: 'arms',
    name: 'Arms (Biceps & Triceps)',
    icon: '💪',
    day: 'Friday / Hypertrophy',
    recommendedExercises: [
      'Barbell Bicep Curl',
      'Tricep Pushdown',
      'Hammer Curls',
      'Skullcrushers',
      'Close-Grip Bench',
    ],
    description: 'Biceps peak, triceps volume, and forearm grip power',
    color: 'from-sky-500/20 to-sky-600/5',
  },
  {
    id: 'core',
    name: 'Core & Abs',
    icon: '⚡',
    day: 'Daily / Post-Workout',
    recommendedExercises: [
      'Hanging Leg Raises',
      'Cable Woodchoppers',
      'Weighted Plank',
      'Ab Wheel Rollout',
    ],
    description: 'Core trunk stiffness, rotational stability, and lumbar support',
    color: 'from-violet-500/20 to-violet-600/5',
  },
]

const WEEKLY_SPLIT_SCHEDULE = [
  { day: 'Monday', focus: 'Push Day', muscles: 'Chest, Front Delts & Triceps', color: 'indigo' },
  { day: 'Tuesday', focus: 'Pull Day', muscles: 'Back, Lats, Traps & Biceps', color: 'emerald' },
  { day: 'Wednesday', focus: 'Legs & Core', muscles: 'Quads, Hamstrings & Calves', color: 'amber' },
  { day: 'Thursday', focus: 'Active Recovery', muscles: 'Cardio, Mobility & Core', color: 'teal' },
  { day: 'Friday', focus: 'Upper Body', muscles: 'Chest, Back, Shoulders & Arms', color: 'rose' },
  { day: 'Saturday', focus: 'Lower Body & PRs', muscles: 'Deadlift, Squats & Conditioning', color: 'sky' },
  { day: 'Sunday', focus: 'Rest & Reset', muscles: 'Rest, Sleep & Deep Nutrition', color: 'zinc' },
]

function computeBMI(weightKg?: number | null, heightCm?: number | null) {
  if (!weightKg || !heightCm || heightCm <= 0) return null
  const heightM = heightCm / 100
  const bmi = weightKg / (heightM * heightM)
  return parseFloat(bmi.toFixed(1))
}

function getBMICategory(bmi: number) {
  if (bmi < 18.5) return { label: 'Underweight', color: 'text-amber-400', bg: 'bg-amber-500/10' }
  if (bmi < 25) return { label: 'Normal / Athletic', color: 'text-emerald-400', bg: 'bg-emerald-500/10' }
  if (bmi < 30) return { label: 'Overweight / Muscular', color: 'text-sky-400', bg: 'bg-sky-500/10' }
  return { label: 'High Body Mass', color: 'text-rose-400', bg: 'bg-rose-500/10' }
}

export function Fitness() {
  const {
    logs,
    workouts,
    weightLogs,
    latestWeight,
    latestHeight,
    strengthLogs,
    exerciseNames,
    saveFitnessLog,
    deleteFitnessLog,
    isLoading,
  } = useFitness()

  const [activeTab, setActiveTab] = useState<'workouts' | 'program' | 'biometrics'>('workouts')
  const [isWorkoutModalOpen, setIsWorkoutModalOpen] = useState(false)
  const [isBiometricModalOpen, setIsBiometricModalOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Workout form state
  const [workoutDate, setWorkoutDate] = useState(getTodayString())
  const [workoutType, setWorkoutType] = useState('Push Day')
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup>('chest')
  const [exerciseName, setExerciseName] = useState('Barbell Bench Press')
  const [weightLifted, setWeightLifted] = useState('85')
  const [sets, setSets] = useState('4')
  const [reps, setReps] = useState('8')
  const [duration, setDuration] = useState('50')
  const [workoutNotes, setWorkoutNotes] = useState('')

  // Biometric form state
  const [biometricDate, setBiometricDate] = useState(getTodayString())
  const [bodyWeightInput, setBodyWeightInput] = useState(latestWeight ? String(latestWeight) : '')
  const [bodyHeightInput, setBodyHeightInput] = useState(latestHeight ? String(latestHeight) : '178')

  // Selected exercise for strength progression graph
  const defaultExercise = exerciseNames.length > 0 ? exerciseNames[0] : 'Barbell Bench Press'
  const [selectedExerciseForGraph, setSelectedExerciseForGraph] = useState<string>(defaultExercise)

  // Ensure selectedExerciseForGraph points to valid item if available
  const activeExerciseForGraph =
    selectedExerciseForGraph && (exerciseNames.includes(selectedExerciseForGraph) || strengthLogs.some(l => l.exercise_name === selectedExerciseForGraph))
      ? selectedExerciseForGraph
      : defaultExercise

  // Strength graph data for the selected exercise
  const exerciseStrengthLogs = useMemo(() => {
    return strengthLogs
      .filter(
        (l) =>
          l.exercise_name?.trim().toLowerCase() ===
          activeExerciseForGraph.trim().toLowerCase()
      )
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [strengthLogs, activeExerciseForGraph])

  const strengthChartData = useMemo(() => {
    return exerciseStrengthLogs.map((l) => ({
      date: l.date.slice(5), // MM-DD
      fullDate: l.date,
      weight: l.weight_lifted ?? 0,
      sets: l.sets,
      reps: l.reps,
      notes: l.notes,
    }))
  }, [exerciseStrengthLogs])

  // Compute upgrade metric (progressive overload)
  const strengthUpgradeMetric = useMemo(() => {
    if (exerciseStrengthLogs.length === 0) return null
    const firstLift = exerciseStrengthLogs[0].weight_lifted || 0
    const maxLift = Math.max(...exerciseStrengthLogs.map((l) => l.weight_lifted || 0))
    const latestLift = exerciseStrengthLogs[exerciseStrengthLogs.length - 1].weight_lifted || 0
    const upgradeKg = parseFloat((latestLift - firstLift).toFixed(1))
    const percentChange = firstLift > 0 ? ((upgradeKg / firstLift) * 100).toFixed(1) : '0'
    return {
      firstLift,
      maxLift,
      latestLift,
      upgradeKg,
      percentChange,
      isUpgrade: upgradeKg > 0,
      totalSessions: exerciseStrengthLogs.length,
    }
  }, [exerciseStrengthLogs])

  // Weight Trend Data for biometrics
  const weightChartData = useMemo(() => {
    return weightLogs.map((log) => ({
      date: log.date.slice(5),
      fullDate: log.date,
      weight: log.weight,
    }))
  }, [weightLogs])

  // Compute weekly weight change
  const weeklyWeightDelta = useMemo(() => {
    if (weightLogs.length < 2) return null
    const current = weightLogs[weightLogs.length - 1].weight ?? 0
    const prev = weightLogs[weightLogs.length - 2].weight ?? 0
    const delta = parseFloat((current - prev).toFixed(1))
    return delta
  }, [weightLogs])

  const currentBMI = computeBMI(latestWeight, latestHeight)
  const bmiCategory = currentBMI ? getBMICategory(currentBMI) : null
  const totalWorkoutMinutes = workouts.reduce((sum, w) => sum + (w.duration_minutes || 0), 0)

  // Save Workout handler
  const handleSaveWorkout = async (e: React.FormEvent) => {
    e.preventDefault()
    await saveFitnessLog({
      date: workoutDate,
      workout_completed: true,
      workout_type: workoutType.trim() || 'Strength Training',
      muscle_group: selectedMuscle,
      exercise_name: exerciseName.trim(),
      weight_lifted: weightLifted ? parseFloat(weightLifted) : null,
      sets: sets ? parseInt(sets, 10) : null,
      reps: reps ? parseInt(reps, 10) : null,
      duration_minutes: parseInt(duration, 10) || 0,
      notes: workoutNotes.trim() || null,
      weight: null,
      height: null,
    })
    setWorkoutNotes('')
    setIsWorkoutModalOpen(false)
  }

  // Save Weekly Biometrics (Height & Weight) handler
  const handleSaveBiometric = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bodyWeightInput && !bodyHeightInput) return
    await saveFitnessLog({
      date: biometricDate,
      workout_completed: false,
      workout_type: null,
      muscle_group: null,
      exercise_name: null,
      weight_lifted: null,
      sets: null,
      reps: null,
      duration_minutes: 0,
      notes: 'Weekly Biometric Metric Entry',
      weight: bodyWeightInput ? parseFloat(bodyWeightInput) : null,
      height: bodyHeightInput ? parseFloat(bodyHeightInput) : null,
    })
    setIsBiometricModalOpen(false)
  }

  // Find personal record (PR) for each muscle group
  const musclePRs = useMemo(() => {
    const prs: Partial<Record<MuscleGroup, { exercise: string; weight: number }>> = {}
    logs.forEach((log) => {
      if (log.muscle_group && log.weight_lifted && log.exercise_name) {
        const mg = log.muscle_group as MuscleGroup
        if (!prs[mg] || log.weight_lifted > prs[mg]!.weight) {
          prs[mg] = { exercise: log.exercise_name, weight: log.weight_lifted }
        }
      }
    })
    return prs
  }, [logs])

  // Auto-fill exercise recommendation when choosing muscle
  const handleSelectMuscle = (m: MuscleGroup) => {
    setSelectedMuscle(m)
    const target = MUSCLE_PROGRAM.find((p) => p.id === m)
    if (target && target.recommendedExercises.length > 0) {
      setExerciseName(target.recommendedExercises[0])
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 animate-in fade-in duration-300">
      {/* Header */}
      <PageHeader
        title="Physical Fitness & Strength Command"
        description="Track your weekly height & body weight, target muscle workouts, and progressive overload upgrades"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBiometricModalOpen(true)}
              leftIcon={<Scale className="w-4 h-4 text-emerald-400" />}
            >
              Log Weekly Height & Weight
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsWorkoutModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
              className="shadow-lg shadow-indigo-500/20"
            >
              Log Workout
            </Button>
          </div>
        }
      />

      {/* 1. TOP SECTION: WEEKLY HEIGHT, WEIGHT & CORE METRICS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Latest Body Weight */}
        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 shadow-md space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Body Weight
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 pt-1">
            <span className="text-2xl font-black font-heading text-zinc-100 font-mono">
              {latestWeight ? `${latestWeight} kg` : '—'}
            </span>
            {weeklyWeightDelta !== null && (
              <span
                className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${
                  weeklyWeightDelta < 0
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : weeklyWeightDelta > 0
                    ? 'bg-amber-500/10 text-amber-400'
                    : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {weeklyWeightDelta > 0 ? `+${weeklyWeightDelta}` : weeklyWeightDelta} kg this week
              </span>
            )}
          </div>
          <p className="text-[11px] text-zinc-400">
            {weightLogs.length > 0 ? `${weightLogs.length} logged check-ins` : 'Log weekly weight'}
          </p>
        </div>

        {/* Height & Stature */}
        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 shadow-md space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Height
            </span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Ruler className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 pt-1">
            <span className="text-2xl font-black font-heading text-zinc-100 font-mono">
              {latestHeight ? `${latestHeight} cm` : '178 cm'}
            </span>
            {latestHeight && (
              <span className="text-xs text-zinc-400 font-mono">
                {Math.floor(latestHeight / 30.48)}'
                {Math.round((latestHeight % 30.48) / 2.54)}"
              </span>
            )}
          </div>
          <p className="text-[11px] text-zinc-400">Recorded physical baseline</p>
        </div>

        {/* Calculated BMI */}
        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 shadow-md space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Calculated BMI
            </span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 pt-1">
            <span className="text-2xl font-black font-heading text-zinc-100 font-mono">
              {currentBMI ?? '—'}
            </span>
            {bmiCategory && (
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${bmiCategory.bg} ${bmiCategory.color}`}
              >
                {bmiCategory.label}
              </span>
            )}
          </div>
          <p className="text-[11px] text-zinc-400">Optimal lean athletic target</p>
        </div>

        {/* Training Discipline */}
        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 shadow-md space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Strength Volume
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 pt-1">
            <span className="text-2xl font-black font-heading text-zinc-100 font-mono">
              {workouts.length}
            </span>
            <span className="text-xs text-zinc-400">sessions ({totalWorkoutMinutes}m)</span>
          </div>
          <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
            <Zap className="w-3 h-3" /> Progressive Overload Active
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-1">
        <button
          onClick={() => setActiveTab('workouts')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'workouts'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Strength Upgrades & History</span>
        </button>

        <button
          onClick={() => setActiveTab('program')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'program'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Main Muscles & Program Split</span>
        </button>

        <button
          onClick={() => setActiveTab('biometrics')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'biometrics'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>Weekly Height & Weight Curve</span>
        </button>
      </div>

      {/* TAB 1: STRENGTH PROGRESSION GRAPH & WORKOUT HISTORY */}
      {activeTab === 'workouts' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* STRENGTH UPGRADE GRAPH CARD */}
          <Card className="p-6 bg-zinc-900/80 border-zinc-800 shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-zinc-100 font-heading">
                    Strength Progression & Upgrade Graph
                  </h3>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Visualize your progressive overload and weight upgrades over time
                </p>
              </div>

              {/* Exercise Selector */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-zinc-400 font-medium">Focus Exercise:</span>
                <select
                  value={activeExerciseForGraph}
                  onChange={(e) => setSelectedExerciseForGraph(e.target.value)}
                  className="bg-zinc-950 border border-zinc-700 text-zinc-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-500 font-semibold"
                >
                  {exerciseNames.map((ex) => (
                    <option key={ex} value={ex}>
                      {ex}
                    </option>
                  ))}
                  {!exerciseNames.includes('Barbell Bench Press') && (
                    <option value="Barbell Bench Press">Barbell Bench Press</option>
                  )}
                  {!exerciseNames.includes('Barbell Squat') && (
                    <option value="Barbell Squat">Barbell Squat</option>
                  )}
                  {!exerciseNames.includes('Overhead Press') && (
                    <option value="Overhead Press">Overhead Press</option>
                  )}
                </select>
              </div>
            </div>

            {/* Upgrade Metric Callout Banner */}
            {strengthUpgradeMetric && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 mb-6 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold block">
                    Starting Weight
                  </span>
                  <span className="text-base sm:text-lg font-mono font-bold text-zinc-300">
                    {strengthUpgradeMetric.firstLift} kg
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold block">
                    Current Max Lift
                  </span>
                  <span className="text-base sm:text-lg font-mono font-bold text-emerald-400 flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5" />
                    {strengthUpgradeMetric.maxLift} kg
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold block">
                    Strength Upgrade
                  </span>
                  <span
                    className={`text-base sm:text-lg font-mono font-bold ${
                      strengthUpgradeMetric.isUpgrade ? 'text-indigo-400' : 'text-zinc-400'
                    }`}
                  >
                    {strengthUpgradeMetric.isUpgrade ? `+${strengthUpgradeMetric.upgradeKg} kg` : '0 kg'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold block">
                    Relative Growth
                  </span>
                  <span className="text-base sm:text-lg font-mono font-bold text-emerald-400">
                    +{strengthUpgradeMetric.percentChange}%
                  </span>
                </div>
              </div>
            )}

            {/* Recharts Line/Area Graph */}
            {strengthChartData.length < 2 ? (
              <div className="h-56 flex flex-col items-center justify-center text-center p-6 border border-dashed border-zinc-800 rounded-2xl">
                <Dumbbell className="w-8 h-8 text-zinc-600 mb-2" />
                <p className="text-xs font-medium text-zinc-400">
                  Not enough weight records yet for "{activeExerciseForGraph}".
                </p>
                <p className="text-[11px] text-zinc-500 mt-1 max-w-sm">
                  Log at least 2 sessions for this exercise to generate your strength curve.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setExerciseName(activeExerciseForGraph)
                    setIsWorkoutModalOpen(true)
                  }}
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                >
                  Log Lift for {activeExerciseForGraph}
                </Button>
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={strengthChartData}
                    margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="strengthGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      stroke="#71717a"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#27272a' }}
                    />
                    <YAxis
                      domain={['dataMin - 5', 'dataMax + 5']}
                      stroke="#71717a"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#27272a' }}
                      tickFormatter={(val) => `${val}kg`}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload
                          return (
                            <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-3 shadow-2xl text-xs space-y-1">
                              <p className="text-zinc-400 text-[10px] uppercase tracking-wider font-semibold">
                                {d.fullDate}
                              </p>
                              <p className="font-mono font-bold text-indigo-300 text-sm">
                                {d.weight} kg lifted
                              </p>
                              {d.sets && d.reps && (
                                <p className="text-zinc-400 text-[11px]">
                                  {d.sets} sets × {d.reps} reps
                                </p>
                              )}
                              {d.notes && (
                                <p className="text-zinc-400 italic text-[11px] pt-1 max-w-xs">
                                  "{d.notes}"
                                </p>
                              )}
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="weight"
                      stroke="#6366f1"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#strengthGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          {/* WORKOUT LOGS HISTORY FEED */}
          <Card className="p-6 bg-zinc-900/80 border-zinc-800 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-zinc-100 font-heading">
                  Training Log & Workout History
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Chronological record of completed sessions, weights, and muscle targets
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsWorkoutModalOpen(true)}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Log New Session
              </Button>
            </div>

            {isLoading ? (
              <div className="space-y-3 py-6">
                <div className="h-14 bg-zinc-800/40 rounded-xl animate-pulse" />
                <div className="h-14 bg-zinc-800/40 rounded-xl animate-pulse" />
              </div>
            ) : workouts.length === 0 ? (
              <EmptyState
                icon={<Dumbbell className="w-8 h-8 text-indigo-400" />}
                title="No workouts logged yet"
                description="Start tracking your training days, muscle groups, and weights lifted."
                actionLabel="Log First Workout"
                onAction={() => setIsWorkoutModalOpen(true)}
              />
            ) : (
              <div className="space-y-3">
                {workouts.map((item) => {
                  const muscleData = MUSCLE_PROGRAM.find((m) => m.id === item.muscle_group)

                  return (
                    <div
                      key={item.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-zinc-950/50 border border-zinc-800/80 hover:border-zinc-700 transition-colors gap-3"
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="success" size="sm">
                            {item.workout_type || 'Workout'}
                          </Badge>

                          {muscleData && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 flex items-center gap-1">
                              <span>{muscleData.icon}</span>
                              <span>{muscleData.name.split(' ')[0]}</span>
                            </span>
                          )}

                          <span className="text-xs font-mono text-zinc-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {item.date}
                          </span>
                        </div>

                        <div className="flex items-baseline gap-2">
                          <h4 className="font-bold text-sm text-zinc-100">
                            {item.exercise_name || item.workout_type || 'Training Session'}
                          </h4>

                          {item.weight_lifted != null && (
                            <span className="font-mono text-xs font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                              {item.weight_lifted} kg
                            </span>
                          )}

                          {item.sets && item.reps && (
                            <span className="text-xs font-mono text-zinc-400">
                              ({item.sets} sets × {item.reps} reps)
                            </span>
                          )}
                        </div>

                        {item.duration_minutes > 0 && (
                          <span className="text-xs text-indigo-400 font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {item.duration_minutes} minutes
                          </span>
                        )}

                        {item.notes && (
                          <p className="text-xs text-zinc-400 leading-relaxed max-w-xl">
                            {item.notes}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          onClick={() => setDeletingId(item.id)}
                          className="p-2 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                          title="Delete workout entry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 2: MAIN MUSCLE GROUPS & PROGRAM SPLIT */}
      {activeTab === 'program' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Weekly Program Split Overview */}
          <Card className="p-6 bg-zinc-900/80 border-zinc-800 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-zinc-100 font-heading">
                  Weekly Training Program Split
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Scheduled daily muscle focus to ensure balanced progressive overload & recovery
                </p>
              </div>
              <Badge variant="info" size="sm">
                7-Day Blueprint
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {WEEKLY_SPLIT_SCHEDULE.map((dayPlan) => (
                <div
                  key={dayPlan.day}
                  className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 transition-colors space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono">
                      {dayPlan.day}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                      {dayPlan.focus}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-zinc-100">{dayPlan.muscles}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Muscle Group Breakdown Cards */}
          <div>
            <div className="mb-4">
              <h3 className="text-base font-bold text-zinc-100 font-heading">
                Main Muscle Groups & Target Exercises
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Review specific exercises, training focus, and your all-time PR weight for each muscle
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {MUSCLE_PROGRAM.map((muscle) => {
                const pr = musclePRs[muscle.id]

                return (
                  <Card
                    key={muscle.id}
                    className="p-5 bg-zinc-900/90 border-zinc-800/80 hover:border-zinc-700 transition-all shadow-md space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">{muscle.icon}</span>
                        <div>
                          <h4 className="text-sm font-bold text-zinc-100">{muscle.name}</h4>
                          <span className="text-[10px] font-mono text-zinc-400">{muscle.day}</span>
                        </div>
                      </div>

                      {pr && (
                        <div className="text-right">
                          <span className="text-[9px] uppercase tracking-wider text-amber-400 font-bold block flex items-center justify-end gap-1">
                            <Trophy className="w-3 h-3" /> PR
                          </span>
                          <span className="text-xs font-mono font-black text-zinc-100">
                            {pr.weight} kg
                          </span>
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-zinc-400 leading-relaxed">{muscle.description}</p>

                    <div>
                      <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
                        Key Exercises:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {muscle.recommendedExercises.map((ex) => (
                          <button
                            key={ex}
                            type="button"
                            onClick={() => {
                              setSelectedMuscle(muscle.id)
                              setExerciseName(ex)
                              setIsWorkoutModalOpen(true)
                            }}
                            className="text-[10px] font-medium px-2 py-1 rounded-lg bg-zinc-950/80 border border-zinc-800 text-zinc-300 hover:text-indigo-300 hover:border-indigo-500/40 transition-colors cursor-pointer"
                          >
                            + {ex}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedMuscle(muscle.id)
                          setExerciseName(muscle.recommendedExercises[0])
                          setIsWorkoutModalOpen(true)
                        }}
                        className="text-xs text-indigo-400 hover:text-indigo-300 p-0"
                      >
                        Log {muscle.name.split(' ')[0]} Workout →
                      </Button>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: WEEKLY HEIGHT & BODY WEIGHT CURVE */}
      {activeTab === 'biometrics' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <Card className="p-6 bg-zinc-900/80 border-zinc-800 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-zinc-100 font-heading">
                  Body Weight & Height Progression (kg)
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Consistent weekly check-ins to monitor muscle gain, fat loss, and body composition
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsBiometricModalOpen(true)}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Log This Week's Metrics
              </Button>
            </div>

            {weightChartData.length < 2 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center p-6 border border-dashed border-zinc-800 rounded-2xl">
                <Scale className="w-8 h-8 text-zinc-600 mb-2" />
                <p className="text-xs text-zinc-400">
                  Log at least 2 weekly weight check-ins to visualize your weight curve.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setIsBiometricModalOpen(true)}
                >
                  Log Biometrics Now
                </Button>
              </div>
            ) : (
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={weightChartData}
                    margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="date"
                      stroke="#71717a"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#27272a' }}
                    />
                    <YAxis
                      domain={['dataMin - 1', 'dataMax + 1']}
                      stroke="#71717a"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#27272a' }}
                      tickFormatter={(val) => `${val}kg`}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload
                          return (
                            <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-2.5 shadow-xl text-xs font-mono">
                              <p className="text-zinc-400">{d.fullDate}</p>
                              <p className="font-bold text-emerald-400 mt-1">{d.weight} kg</p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ r: 5, fill: '#10b981' }}
                      activeDot={{ r: 7, fill: '#34d399' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          {/* Biometric History Table */}
          <Card className="p-6 bg-zinc-900/80 border-zinc-800 shadow-xl">
            <h3 className="text-base font-bold text-zinc-100 font-heading mb-3">
              Weekly Biometrics Log
            </h3>
            {weightLogs.length === 0 ? (
              <div className="text-center py-6 text-xs text-zinc-500">
                No biometric logs yet. Log your weekly height and weight to track physical changes.
              </div>
            ) : (
              <div className="space-y-2">
                {weightLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/40 border border-zinc-800 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-zinc-400">{log.date}</span>
                      <span className="font-bold text-zinc-200">
                        Weight: <span className="text-emerald-400">{log.weight} kg</span>
                      </span>
                      {log.height && (
                        <span className="text-zinc-400">
                          Height: <span className="text-indigo-300">{log.height} cm</span>
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => setDeletingId(log.id)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                      title="Delete log"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* MODAL 1: LOG WORKOUT (DAY, MUSCLE, EXERCISE, WEIGHT, SETS/REPS) */}
      <Modal
        isOpen={isWorkoutModalOpen}
        onClose={() => setIsWorkoutModalOpen(false)}
        title="Log Workout & Muscle Strength"
        description="Record your workout day, targeted muscle, exercise, weight lifted, and sets/reps"
        maxWidth="lg"
        position="right"
      >
        <form onSubmit={handleSaveWorkout} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Workout Date"
              type="date"
              value={workoutDate}
              onChange={(e) => setWorkoutDate(e.target.value)}
              required
            />
            <Input
              label="Day Focus / Routine"
              placeholder="e.g. Push Day, Pull Day, Heavy Legs"
              value={workoutType}
              onChange={(e) => setWorkoutType(e.target.value)}
              required
            />
          </div>

          {/* Muscle Group Selector */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-2">
              Target Muscle Group
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {MUSCLE_PROGRAM.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSelectMuscle(m.id)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all text-xs cursor-pointer ${
                    selectedMuscle === m.id
                      ? 'bg-indigo-600/25 border-indigo-500 text-zinc-100 shadow-sm ring-1 ring-indigo-500/30'
                      : 'bg-zinc-950/50 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <span className="text-lg">{m.icon}</span>
                  <span className="text-[10px] font-semibold mt-1 truncate w-full text-center">
                    {m.name.split(' ')[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Exercise Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                Exercise / Workout Name
              </label>
              <span className="text-[10px] text-zinc-500">Pick preset or type custom</span>
            </div>

            {/* Recommended exercise chips */}
            {selectedMuscle && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {MUSCLE_PROGRAM.find((m) => m.id === selectedMuscle)?.recommendedExercises.map(
                  (rec) => (
                    <button
                      key={rec}
                      type="button"
                      onClick={() => setExerciseName(rec)}
                      className={`text-[10px] px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                        exerciseName === rec
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {rec}
                    </button>
                  )
                )}
              </div>
            )}

            <Input
              placeholder="e.g. Barbell Bench Press"
              value={exerciseName}
              onChange={(e) => setExerciseName(e.target.value)}
              required
            />
          </div>

          {/* Weight Lifted, Sets & Reps */}
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Weight Lifted (kg)"
              type="number"
              step="0.5"
              placeholder="e.g. 85"
              value={weightLifted}
              onChange={(e) => setWeightLifted(e.target.value)}
              required
            />
            <Input
              label="Sets"
              type="number"
              min={1}
              placeholder="e.g. 4"
              value={sets}
              onChange={(e) => setSets(e.target.value)}
              required
            />
            <Input
              label="Reps / Set"
              type="number"
              min={1}
              placeholder="e.g. 8"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Duration (Minutes)"
              type="number"
              min={0}
              placeholder="45"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>

          <Textarea
            label="Workout Notes & Progression Feedback"
            placeholder="e.g. New PR today, +2.5kg increase from last week, explosive bar speed..."
            rows={2}
            value={workoutNotes}
            onChange={(e) => setWorkoutNotes(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsWorkoutModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Workout
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: LOG WEEKLY HEIGHT & WEIGHT BIOMETRICS */}
      <Modal
        isOpen={isBiometricModalOpen}
        onClose={() => setIsBiometricModalOpen(false)}
        title="Log Weekly Height & Body Weight"
        description="Record your weekly body weight and height to update your BMI and trend curve"
        maxWidth="sm"
        position="center"
      >
        <form onSubmit={handleSaveBiometric} className="space-y-4">
          <Input
            label="Check-in Date"
            type="date"
            value={biometricDate}
            onChange={(e) => setBiometricDate(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Body Weight (kg)"
              type="number"
              step="0.1"
              placeholder="e.g. 76.4"
              value={bodyWeightInput}
              onChange={(e) => setBodyWeightInput(e.target.value)}
              required
              autoFocus
            />

            <Input
              label="Height (cm)"
              type="number"
              step="0.5"
              placeholder="e.g. 178"
              value={bodyHeightInput}
              onChange={(e) => setBodyHeightInput(e.target.value)}
              required
            />
          </div>

          {bodyWeightInput && bodyHeightInput && (
            <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs">
              <span className="text-zinc-400 block mb-1">Calculated BMI Preview:</span>
              <span className="font-mono text-emerald-400 font-bold text-sm">
                {computeBMI(parseFloat(bodyWeightInput), parseFloat(bodyHeightInput)) ?? '—'}
              </span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsBiometricModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Metrics
            </Button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION DIALOG */}
      <ConfirmDialog
        isOpen={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={async () => {
          if (deletingId) {
            await deleteFitnessLog(deletingId)
            setDeletingId(null)
          }
        }}
        title="Delete Fitness Record"
        message="Are you sure you want to delete this fitness entry?"
        confirmText="Delete"
      />
    </div>
  )
}
