import { useState } from 'react'
import { Plus, Target, Edit2, Trash2, CheckCircle2, Pause, Play } from 'lucide-react'
import { useGoals } from '../../hooks/useGoals'
import { CATEGORY_METADATA } from '../../lib/dateUtils'
import {
  PageHeader,
  Button,
  Card,
  Modal,
  Input,
  Textarea,
  Select,
  ProgressBar,
  ConfirmDialog,
  Badge,
  EmptyState,
} from '../../components/ui'
import type { Goal, GoalStatus, HabitCategory } from '../../types'

export function Goals() {
  const { goals, createGoal, updateGoal, deleteGoal, isLoading } = useGoals()

  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'paused'>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null)

  // Form states
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<HabitCategory>('career')
  const [targetDate, setTargetDate] = useState('')
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<GoalStatus>('active')

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setCategory('career')
    setTargetDate('')
    setProgress(0)
    setStatus('active')
    setEditingGoal(null)
  }

  const openEdit = (g: Goal) => {
    setEditingGoal(g)
    setTitle(g.title)
    setDescription(g.description || '')
    setCategory(g.category)
    setTargetDate(g.target_date || '')
    setProgress(g.progress)
    setStatus(g.status)
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editingGoal) {
      await updateGoal(editingGoal.id, {
        title: title.trim(),
        description: description.trim() || null,
        category,
        target_date: targetDate || null,
        progress,
        status,
      })
    } else {
      await createGoal({
        title: title.trim(),
        description: description.trim() || null,
        category,
        target_date: targetDate || null,
        progress,
        status,
      })
    }
    resetForm()
    setIsModalOpen(false)
  }

  const filteredGoals = goals.filter((g) => {
    if (filter === 'all') return true
    return g.status === filter
  })

  const categoryOptions = [
    { label: 'Career', value: 'career' },
    { label: 'Fitness', value: 'fitness' },
    { label: 'English', value: 'english' },
    { label: 'Learning', value: 'learning' },
    { label: 'Discipline', value: 'discipline' },
    { label: 'Mind', value: 'mind' },
    { label: 'Finance', value: 'finance' },
    { label: 'Personal', value: 'personal' },
  ]

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-in fade-in duration-300">
      <PageHeader
        title="Long-Term Goals"
        description="3-Year North Stars and major strategic transformation milestones"
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              resetForm()
              setIsModalOpen(true)
            }}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Create Goal
          </Button>
        }
      />

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 pb-2">
        {(['all', 'active', 'completed', 'paused'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
              filter === tab
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Goals Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-40 bg-zinc-800/40 rounded-2xl animate-pulse" />
          <div className="h-40 bg-zinc-800/40 rounded-2xl animate-pulse" />
        </div>
      ) : filteredGoals.length === 0 ? (
        <EmptyState
          icon={<Target className="w-7 h-7" />}
          title="No goals found"
          description="Your transformation starts with a clear, ambitious long-term goal."
          actionLabel="Create Your First Goal"
          onAction={() => {
            resetForm()
            setIsModalOpen(true)
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredGoals.map((goal) => {
            const meta = CATEGORY_METADATA[goal.category]

            return (
              <Card
                key={goal.id}
                className="p-5 bg-zinc-900/80 border-zinc-800 flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      {meta && (
                        <Badge variant="default" size="sm">
                          {meta.label}
                        </Badge>
                      )}
                      <Badge
                        variant={
                          goal.status === 'completed'
                            ? 'success'
                            : goal.status === 'paused'
                            ? 'warning'
                            : 'info'
                        }
                        size="sm"
                      >
                        {goal.status}
                      </Badge>
                    </div>

                    {goal.target_date && (
                      <span className="text-xs font-mono text-zinc-400">
                        Target: {goal.target_date}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-zinc-100 font-heading">
                    {goal.title}
                  </h3>
                  {goal.description && (
                    <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                      {goal.description}
                    </p>
                  )}
                </div>

                <div className="space-y-3 pt-2 border-t border-zinc-800/60">
                  <ProgressBar
                    value={goal.progress}
                    size="md"
                    color={goal.progress === 100 ? 'emerald' : 'indigo'}
                    showLabel
                    label="Progress"
                  />

                  {/* Inline quick progress adjuster & actions */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5">
                      {[25, 50, 75, 100].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() =>
                            updateGoal(goal.id, {
                              progress: val,
                              status: val === 100 ? 'completed' : goal.status,
                            })
                          }
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-lg border transition-colors ${
                            goal.progress >= val
                              ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/30'
                              : 'bg-zinc-950/40 text-zinc-500 border-zinc-800 hover:border-zinc-700'
                          }`}
                        >
                          {val}%
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1">
                      {goal.status !== 'completed' && (
                        <button
                          onClick={() =>
                            updateGoal(goal.id, {
                              status: goal.status === 'paused' ? 'active' : 'paused',
                            })
                          }
                          title={goal.status === 'paused' ? 'Resume Goal' : 'Pause Goal'}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                        >
                          {goal.status === 'paused' ? (
                            <Play className="w-3.5 h-3.5" />
                          ) : (
                            <Pause className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}

                      {goal.status !== 'completed' && (
                        <button
                          onClick={() =>
                            updateGoal(goal.id, { status: 'completed', progress: 100 })
                          }
                          title="Mark Completed"
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => openEdit(goal)}
                        title="Edit Goal"
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setDeletingGoalId(goal.id)}
                        title="Delete Goal"
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Goal Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          resetForm()
        }}
        title={editingGoal ? 'Edit Goal' : 'Create Transformation Goal'}
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Goal Title"
            placeholder="e.g. Master Distributed Systems Architecture"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
          />

          <Textarea
            label="Description & Criteria"
            placeholder="What does success look like when achieved?"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Life Area"
              value={category}
              onChange={(e) => setCategory(e.target.value as HabitCategory)}
              options={categoryOptions}
            />
            <Input
              label="Target Date"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1.5">
                Current Progress ({progress}%)
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={progress}
                onChange={(e) => setProgress(parseInt(e.target.value, 10))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>
            <Select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as GoalStatus)}
              options={[
                { label: 'Active', value: 'active' },
                { label: 'Completed', value: 'completed' },
                { label: 'Paused', value: 'paused' },
              ]}
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-zinc-800">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsModalOpen(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              {editingGoal ? 'Save Changes' : 'Create Goal'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deletingGoalId)}
        onClose={() => setDeletingGoalId(null)}
        onConfirm={async () => {
          if (deletingGoalId) {
            await deleteGoal(deletingGoalId)
            setDeletingGoalId(null)
          }
        }}
        title="Delete Goal"
        message="Are you sure you want to delete this goal? This action cannot be undone."
        confirmText="Delete"
      />
    </div>
  )
}
