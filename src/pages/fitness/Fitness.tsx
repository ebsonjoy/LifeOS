import { useState, useMemo } from 'react'
import { Plus, Dumbbell, Scale, Clock, Trash2, CheckCircle2 } from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
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
  StatCard,
  ConfirmDialog,
  Badge,
  EmptyState,
} from '../../components/ui'

export function Fitness() {
  const {
    logs,
    workouts,
    weightLogs,
    saveFitnessLog,
    deleteFitnessLog,
    isLoading,
  } = useFitness()

  const [isWorkoutModalOpen, setIsWorkoutModalOpen] = useState(false)
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Workout form
  const [workoutType, setWorkoutType] = useState('Strength Training')
  const [duration, setDuration] = useState('45')
  const [workoutDate, setWorkoutDate] = useState(getTodayString())
  const [workoutNotes, setWorkoutNotes] = useState('')

  // Weight form
  const [weightVal, setWeightVal] = useState('')
  const [weightDate, setWeightDate] = useState(getTodayString())

  const handleSaveWorkout = async (e: React.FormEvent) => {
    e.preventDefault()
    await saveFitnessLog({
      date: workoutDate,
      workout_completed: true,
      workout_type: workoutType.trim(),
      duration_minutes: parseInt(duration, 10) || 0,
      notes: workoutNotes.trim() || null,
      weight: null,
    })
    setWorkoutNotes('')
    setIsWorkoutModalOpen(false)
  }

  const handleSaveWeight = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!weightVal) return
    await saveFitnessLog({
      date: weightDate,
      workout_completed: false,
      workout_type: null,
      duration_minutes: 0,
      notes: null,
      weight: parseFloat(weightVal),
    })
    setWeightVal('')
    setIsWeightModalOpen(false)
  }

  // Weight Trend Data
  const weightChartData = useMemo(() => {
    return weightLogs.map((log) => ({
      date: log.date.slice(5), // MM-DD
      weight: log.weight,
    }))
  }, [weightLogs])

  const latestWeight = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1].weight : null
  const totalWorkoutMinutes = workouts.reduce((sum, w) => sum + (w.duration_minutes || 0), 0)

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-in fade-in duration-300">
      <PageHeader
        title="Physical Fitness & Metrics"
        description="Physical conditioning, training consistency, and biometric tracking"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsWeightModalOpen(true)}
              leftIcon={<Scale className="w-4 h-4 text-emerald-400" />}
            >
              Log Weight
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsWorkoutModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Log Workout
            </Button>
          </div>
        }
      />

      {/* 1. FITNESS STATS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total Workouts"
          value={workouts.length}
          icon={<Dumbbell className="w-5 h-5 text-indigo-400" />}
          subValue="Completed sessions"
        />
        <StatCard
          label="Active Training Time"
          value={`${totalWorkoutMinutes}m`}
          icon={<Clock className="w-5 h-5 text-sky-400" />}
          subValue="Total volume"
        />
        <StatCard
          label="Latest Body Weight"
          value={latestWeight ? `${latestWeight} kg` : '—'}
          icon={<Scale className="w-5 h-5 text-emerald-400" />}
          subValue={latestWeight ? 'Logged metric' : 'No logs yet'}
        />
        <StatCard
          label="Training Discipline"
          value={workouts.length >= 4 ? 'Elite' : 'Active'}
          icon={<CheckCircle2 className="w-5 h-5 text-amber-400" />}
          subValue="Consistent routine"
        />
      </div>

      {/* 2. BODY WEIGHT TREND CHART */}
      <Card className="p-6 bg-zinc-900/80 border-zinc-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-zinc-100 font-heading">
              Body Weight Trend (kg)
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">Progressive biometric tracking over time</p>
          </div>
          {latestWeight && (
            <span className="font-mono text-sm font-bold text-emerald-400 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              Current: {latestWeight} kg
            </span>
          )}
        </div>

        {weightChartData.length < 2 ? (
          <div className="h-44 flex items-center justify-center text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-2xl">
            Log your body weight at least 2 times to visualize your weight curve.
          </div>
        ) : (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
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
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload
                      return (
                        <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-2.5 shadow-xl text-xs">
                          <p className="text-zinc-400">{d.date}</p>
                          <p className="font-mono font-bold text-emerald-400 mt-1">
                            {d.weight} kg
                          </p>
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
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#10b981' }}
                  activeDot={{ r: 6, fill: '#34d399' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* 3. RECENT ACTIVITY FEED */}
      <Card className="p-5 bg-zinc-900/80 border-zinc-800">
        <h3 className="text-base font-bold text-zinc-100 font-heading mb-4">
          Training Log & History
        </h3>

        {isLoading ? (
          <div className="space-y-3 py-6">
            <div className="h-12 bg-zinc-800/40 rounded-xl animate-pulse" />
            <div className="h-12 bg-zinc-800/40 rounded-xl animate-pulse" />
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon={<Dumbbell className="w-7 h-7" />}
            title="No workout logs yet"
            description="Consistency in training builds cognitive sharpness and physical resilience."
            actionLabel="Log Workout"
            onAction={() => setIsWorkoutModalOpen(true)}
          />
        ) : (
          <div className="space-y-3">
            {logs.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 rounded-xl bg-zinc-950/40 border border-zinc-800/80 hover:border-zinc-700 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    {item.workout_completed ? (
                      <Badge variant="success" size="sm">
                        Workout
                      </Badge>
                    ) : (
                      <Badge variant="info" size="sm">
                        Metric
                      </Badge>
                    )}
                    <span className="font-semibold text-sm text-zinc-100">
                      {item.workout_type || (item.weight ? `Weight Entry: ${item.weight} kg` : 'Activity')}
                    </span>
                    <span className="text-xs text-zinc-500 font-mono">{item.date}</span>
                  </div>

                  {item.duration_minutes > 0 && (
                    <span className="text-xs text-indigo-400 font-medium block">
                      Duration: {item.duration_minutes} minutes
                    </span>
                  )}
                  {item.notes && <p className="text-xs text-zinc-400">{item.notes}</p>}
                </div>

                <button
                  onClick={() => setDeletingId(item.id)}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                  title="Delete entry"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Workout Modal */}
      <Modal
        isOpen={isWorkoutModalOpen}
        onClose={() => setIsWorkoutModalOpen(false)}
        title="Log Workout Session"
        maxWidth="md"
      >
        <form onSubmit={handleSaveWorkout} className="space-y-4">
          <Input
            label="Workout Type / Focus"
            placeholder="e.g. Upper Body Push, 5K Run, Deadlift Heavy"
            value={workoutType}
            onChange={(e) => setWorkoutType(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Duration (Minutes)"
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              required
            />
            <Input
              label="Date"
              type="date"
              value={workoutDate}
              onChange={(e) => setWorkoutDate(e.target.value)}
              required
            />
          </div>

          <Textarea
            label="Workout Notes & Weights"
            placeholder="Sets, reps, weights lifted, or perceived effort..."
            rows={3}
            value={workoutNotes}
            onChange={(e) => setWorkoutNotes(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsWorkoutModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Workout
            </Button>
          </div>
        </form>
      </Modal>

      {/* Weight Modal */}
      <Modal
        isOpen={isWeightModalOpen}
        onClose={() => setIsWeightModalOpen(false)}
        title="Log Body Weight"
        maxWidth="sm"
      >
        <form onSubmit={handleSaveWeight} className="space-y-4">
          <Input
            label="Body Weight (kg)"
            type="number"
            step="0.1"
            placeholder="e.g. 76.5"
            value={weightVal}
            onChange={(e) => setWeightVal(e.target.value)}
            required
            autoFocus
          />
          <Input
            label="Date"
            type="date"
            value={weightDate}
            onChange={(e) => setWeightDate(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsWeightModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Weight
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={async () => {
          if (deletingId) {
            await deleteFitnessLog(deletingId)
            setDeletingId(null)
          }
        }}
        title="Delete Fitness Entry"
        message="Are you sure you want to delete this fitness log?"
        confirmText="Delete"
      />
    </div>
  )
}
