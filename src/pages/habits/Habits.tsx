import { useState, useMemo } from 'react'
import { Plus, Edit2, Trash2, CheckSquare, Power } from 'lucide-react'
import { useHabits } from '../../hooks/useHabits'
import { getDaysOfWeek, CATEGORY_METADATA } from '../../lib/dateUtils'
import {
  PageHeader,
  Button,
  Card,
  Modal,
  Input,
  Select,
  Textarea,
  ConfirmDialog,
  Badge,
  EmptyState,
} from '../../components/ui'
import type { Habit, HabitCategory, HabitFrequency } from '../../types'

export function Habits() {
  const {
    habits,
    logs,
    createHabit,
    updateHabit,
    deleteHabit,
    toggleHabit,
    isLoading,
  } = useHabits()

  const weekDays = useMemo(() => getDaysOfWeek(), [])

  // Modals & form state
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null)
  const [deletingHabitId, setDeletingHabitId] = useState<string | null>(null)

  // Form inputs
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<HabitCategory>('career')
  const [frequency, setFrequency] = useState<HabitFrequency>('daily')
  const [targetValue, setTargetValue] = useState('1')
  const [unit, setUnit] = useState('times')
  const [color, setColor] = useState('#6366f1')

  // Filter
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const resetForm = () => {
    setName('')
    setDescription('')
    setCategory('career')
    setFrequency('daily')
    setTargetValue('1')
    setUnit('times')
    setColor('#6366f1')
    setEditingHabit(null)
  }

  const openEdit = (habit: Habit) => {
    setEditingHabit(habit)
    setName(habit.name)
    setDescription(habit.description || '')
    setCategory(habit.category)
    setFrequency(habit.frequency)
    setTargetValue(String(habit.target_value))
    setUnit(habit.unit)
    setColor(habit.color)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editingHabit) {
      await updateHabit(editingHabit.id, {
        name: name.trim(),
        description: description.trim() || null,
        category,
        frequency,
        target_value: parseFloat(targetValue) || 1,
        unit,
        color,
      })
    } else {
      await createHabit({
        name: name.trim(),
        description: description.trim() || null,
        category,
        frequency,
        target_value: parseFloat(targetValue) || 1,
        unit,
        color,
        is_active: true,
      })
    }
    resetForm()
    setIsCreateOpen(false)
  }

  const filteredHabits = habits.filter((h) => {
    if (selectedCategory !== 'all' && h.category !== selectedCategory) return false
    return true
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
        title="Habit Architecture"
        description="Daily non-negotiables driving your 3-year transformation"
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              resetForm()
              setIsCreateOpen(true)
            }}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Create Habit
          </Button>
        }
      />

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
            selectedCategory === 'all'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
          }`}
        >
          All ({habits.length})
        </button>
        {categoryOptions.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setSelectedCategory(cat.value)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
              selectedCategory === cat.value
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Habit Cards with 7-Day History */}
      {isLoading ? (
        <div className="space-y-3">
          <div className="h-24 bg-zinc-800/40 rounded-2xl animate-pulse" />
          <div className="h-24 bg-zinc-800/40 rounded-2xl animate-pulse" />
        </div>
      ) : filteredHabits.length === 0 ? (
        <EmptyState
          icon={<CheckSquare className="w-7 h-7" />}
          title="No habits found"
          description="Build consistency by creating your daily core habits."
          actionLabel="Add Your First Habit"
          onAction={() => {
            resetForm()
            setIsCreateOpen(true)
          }}
        />
      ) : (
        <div className="space-y-3.5">
          {filteredHabits.map((habit) => {
            const meta = CATEGORY_METADATA[habit.category]

            // 7-day completion analysis
            let completedDaysCount = 0
            const dayStatus = weekDays.map((d) => {
              const log = logs.find((l) => l.habit_id === habit.id && l.date === d.date)
              const isCompleted = Boolean(log?.completed)
              if (isCompleted) completedDaysCount++
              return {
                ...d,
                isCompleted,
              }
            })

            const completionRate = Math.round((completedDaysCount / 7) * 100)

            return (
              <Card
                key={habit.id}
                className={`p-5 bg-zinc-900/80 border-zinc-800 transition-all ${
                  !habit.is_active ? 'opacity-60 bg-zinc-950/40' : ''
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Habit details */}
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-zinc-100 font-heading truncate">
                        {habit.name}
                      </h3>
                      {meta && (
                        <Badge variant="default" size="sm">
                          {meta.label}
                        </Badge>
                      )}
                      {!habit.is_active && (
                        <Badge variant="warning" size="sm">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    {habit.description && (
                      <p className="text-xs text-zinc-400 leading-relaxed">{habit.description}</p>
                    )}
                    <div className="text-xs text-zinc-500 font-medium pt-0.5">
                      Target: {habit.target_value} {habit.unit} • Frequency: {habit.frequency}
                    </div>
                  </div>

                  {/* 7-Day History Grid: Mon - Sun */}
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-1.5">
                        {dayStatus.map((d) => (
                          <button
                            key={d.date}
                            onClick={() =>
                              toggleHabit(habit.id, !d.isCompleted, d.date, habit.target_value)
                            }
                            title={`${d.name} (${d.date}): ${d.isCompleted ? 'Completed' : 'Missed'}`}
                            className={`w-7 h-8 rounded-lg flex flex-col items-center justify-center text-[10px] font-mono font-bold transition-all ${
                              d.isCompleted
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                : 'bg-zinc-950/60 text-zinc-500 border border-zinc-800 hover:border-zinc-700'
                            } ${d.isToday ? 'ring-1 ring-indigo-500/70' : ''}`}
                          >
                            <span className="text-[9px] font-normal text-zinc-400">{d.short}</span>
                            <span>{d.isCompleted ? '✓' : '✕'}</span>
                          </button>
                        ))}
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-1 font-mono">
                        {completedDaysCount} / 7 days ({completionRate}%)
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 border-l border-zinc-800 pl-4">
                      <button
                        onClick={() =>
                          updateHabit(habit.id, { is_active: !habit.is_active })
                        }
                        title={habit.is_active ? 'Pause Habit' : 'Activate Habit'}
                        className={`p-2 rounded-xl text-xs transition-colors ${
                          habit.is_active
                            ? 'text-zinc-400 hover:text-amber-400 hover:bg-zinc-800'
                            : 'text-zinc-500 hover:text-emerald-400 hover:bg-zinc-800'
                        }`}
                      >
                        <Power className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => openEdit(habit)}
                        title="Edit Habit"
                        className="p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setDeletingHabitId(habit.id)}
                        title="Delete Habit"
                        className="p-2 rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create / Edit Habit Modal */}
      <Modal
        isOpen={isCreateOpen || Boolean(editingHabit)}
        onClose={() => {
          setIsCreateOpen(false)
          resetForm()
        }}
        title={editingHabit ? 'Edit Habit' : 'Create New Habit'}
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Habit Name"
            placeholder="e.g. 2 Hours Deep Work"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />

          <Textarea
            label="Description & Intention"
            placeholder="Why is this habit critical to your 3-year journey?"
            rows={2}
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
            <Select
              label="Frequency"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as HabitFrequency)}
              options={[
                { label: 'Daily', value: 'daily' },
                { label: 'Weekly', value: 'weekly' },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Target Value"
              type="number"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              required
            />
            <Input
              label="Unit"
              placeholder="e.g. hours, pages, session"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-zinc-800">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsCreateOpen(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              {editingHabit ? 'Save Changes' : 'Create Habit'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deletingHabitId)}
        onClose={() => setDeletingHabitId(null)}
        onConfirm={async () => {
          if (deletingHabitId) {
            await deleteHabit(deletingHabitId)
            setDeletingHabitId(null)
          }
        }}
        title="Delete Habit"
        message="Are you sure you want to delete this habit and all associated logs? This action cannot be undone."
        confirmText="Delete"
      />
    </div>
  )
}
