import { useState } from 'react'
import {
  Plus,
  Calendar,
  Clock,
  CheckCircle2,
  Trash2,
  Edit2,
  FileText,
  TrendingUp,
} from 'lucide-react'
import { usePlanning } from '../../hooks/usePlanning'
import { getTodayString, formatLongDate } from '../../lib/dateUtils'
import {
  PageHeader,
  Button,
  Card,
  Modal,
  Input,
  Select,
  Textarea,
  ProgressBar,
  Checkbox,
  ConfirmDialog,
  Badge,
  EmptyState,
} from '../../components/ui'
import type { PlannedTask } from '../../types'

export function Planning() {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString())
  const todayStr = getTodayString()

  const {
    tasks,
    totalTasks,
    completedTasks,
    progressPercent,
    toggleTask,
    createPlan,
    updatePlan,
    deletePlan,
    isLoading,
  } = usePlanning(selectedDate)

  // Drawer / Modal states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<PlannedTask | null>(null)
  const [summaryTask, setSummaryTask] = useState<PlannedTask | null>(null)
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null)

  // Form states
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('reading')
  const [startTime, setStartTime] = useState('10:00')
  const [endTime, setEndTime] = useState('10:30')
  const [summaryNote, setSummaryNote] = useState('')

  const resetForm = () => {
    setTitle('')
    setCategory('reading')
    setStartTime('10:00')
    setEndTime('10:30')
    setSummaryNote('')
    setEditingTask(null)
  }

  const openEdit = (task: PlannedTask) => {
    setEditingTask(task)
    setTitle(task.title)
    setCategory(task.category)
    setStartTime(task.start_time)
    setEndTime(task.end_time)
    setSummaryNote(task.summary || '')
    setIsDrawerOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !startTime || !endTime) return

    try {
      if (editingTask) {
        await updatePlan(editingTask.id, {
          title: title.trim(),
          category,
          start_time: startTime,
          end_time: endTime,
          summary: summaryNote.trim() || null,
        })
      } else {
        await createPlan({
          date: selectedDate,
          title: title.trim(),
          category,
          start_time: startTime,
          end_time: endTime,
          summary: summaryNote.trim() || null,
        })
      }
      resetForm()
      setIsDrawerOpen(false)
    } catch (err: any) {
      console.warn('Planning task save error handled:', err?.message || err)
    }
  }

  const handleSaveSummary = async (e: React.FormEvent) => {
    e.preventDefault()
    if (summaryTask) {
      try {
        await updatePlan(summaryTask.id, {
          summary: summaryNote.trim() || null,
        })
        setSummaryTask(null)
        setSummaryNote('')
      } catch (err: any) {
        console.warn('Summary note save error handled:', err?.message || err)
      }
    }
  }

  // Quick preset dates
  const setDateToToday = () => setSelectedDate(todayStr)
  const setDateToTomorrow = () => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    setSelectedDate(d.toISOString().split('T')[0])
  }

  const categoryOptions = [
    { label: 'Reading & Learning', value: 'reading' },
    { label: 'Career & Deep Work', value: 'career' },
    { label: 'Fitness & Physical', value: 'fitness' },
    { label: 'English & Speaking', value: 'english' },
    { label: 'Discipline & Habits', value: 'discipline' },
    { label: 'Mind & Meditation', value: 'mind' },
    { label: 'Finance & Admin', value: 'finance' },
    { label: 'Personal & Rest', value: 'personal' },
  ]

  const formatTimeDisplay = (t: string) => {
    if (!t) return ''
    const [hours, minutes] = t.split(':')
    const h = parseInt(hours, 10)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const formattedH = h % 12 || 12
    return `${formattedH}:${minutes} ${ampm}`
  }

  const isToday = selectedDate === todayStr

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-in fade-in duration-300">
      <PageHeader
        title="Daily Planning & Monitoring"
        description="Design your day with focused time blocks, monitor real-time execution, and record reflections"
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              resetForm()
              setIsDrawerOpen(true)
            }}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Planned Task
          </Button>
        }
      />

      {/* 1. DATE SELECTION & QUICK SWITCHER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={setDateToToday}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              isToday
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            Today
          </button>
          <button
            onClick={setDateToTomorrow}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              selectedDate !== todayStr &&
              new Date(selectedDate).getDate() === new Date(Date.now() + 86400000).getDate()
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            Tomorrow
          </button>
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium ml-2">
            <Calendar className="w-4 h-4 text-zinc-500" />
            <span>{formatLongDate(selectedDate)}</span>
          </div>
        </div>

        <div className="w-full sm:w-44">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-xs py-1.5"
          />
        </div>
      </div>

      {/* 2. REAL-TIME EXECUTION PROGRESS MONITOR */}
      <Card className="p-6 bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-indigo-950/40 border-zinc-800 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Execution Velocity</span>
            </div>
            <h3 className="text-xl font-bold text-zinc-100 font-heading">
              {isToday ? "Today's Schedule Progress" : `Plan Progress for ${selectedDate}`}
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Completing scheduled tasks increases your score in real-time
            </p>
          </div>

          <div className="flex items-baseline gap-2 bg-zinc-950/60 border border-zinc-800/80 px-4 py-2.5 rounded-2xl">
            <span className="text-3xl font-black font-heading text-zinc-100">
              {progressPercent}%
            </span>
            <span className="text-xs text-zinc-400 font-mono">
              ({completedTasks} of {totalTasks} tasks)
            </span>
          </div>
        </div>

        <ProgressBar
          value={progressPercent}
          size="lg"
          color={progressPercent === 100 ? 'emerald' : progressPercent >= 50 ? 'indigo' : 'amber'}
          showLabel
          label={`${completedTasks} of ${totalTasks} completed`}
        />
      </Card>

      {/* 3. TIME-BLOCKED SCHEDULE & MONITORING LIST */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-base font-bold text-zinc-100 font-heading flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            <span>Time-Blocked Schedule</span>
          </h3>
          <span className="text-xs text-zinc-400 font-mono">
            {totalTasks} {totalTasks === 1 ? 'task scheduled' : 'tasks scheduled'}
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-3 py-6">
            <div className="h-16 bg-zinc-800/40 rounded-2xl animate-pulse" />
            <div className="h-16 bg-zinc-800/40 rounded-2xl animate-pulse" />
          </div>
        ) : tasks.length === 0 ? (
          <EmptyState
            icon={<Clock className="w-8 h-8 text-indigo-400" />}
            title="No tasks planned for this day"
            description="Take 2 minutes to plan your day: allocate time blocks for reading, deep work, or workouts."
            actionLabel="Schedule Your First Task"
            onAction={() => {
              resetForm()
              setIsDrawerOpen(true)
            }}
          />
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <Card
                key={task.id}
                className={`p-5 bg-zinc-900/80 border-zinc-800/90 transition-all duration-200 ${
                  task.completed
                    ? 'border-emerald-500/30 bg-zinc-900/95 shadow-sm'
                    : 'hover:border-zinc-700'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left: Checkbox & Task details */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className="pt-0.5">
                      <Checkbox
                        checked={task.completed}
                        onChange={(c) => toggleTask(task.id, c)}
                      />
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Time pill */}
                        <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-lg bg-zinc-950/80 border border-zinc-800 text-indigo-300 flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-indigo-400" />
                          {formatTimeDisplay(task.start_time)} – {formatTimeDisplay(task.end_time)}
                        </span>

                        {/* Category pill */}
                        <Badge variant="default" size="sm">
                          {task.category}
                        </Badge>

                        {task.completed && (
                          <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Completed
                          </span>
                        )}
                      </div>

                      <h4
                        className={`text-base font-bold tracking-tight block truncate ${
                          task.completed
                            ? 'line-through text-zinc-400 opacity-80'
                            : 'text-zinc-100'
                        }`}
                      >
                        {task.title}
                      </h4>

                      {/* Summary reflection note if present */}
                      {task.summary && (
                        <div className="mt-2 p-3 rounded-xl bg-zinc-950/50 border border-zinc-800/70 text-xs text-zinc-300 leading-relaxed flex items-start gap-2">
                          <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-zinc-400 block text-[10px] uppercase tracking-wider">
                              Execution Summary
                            </span>
                            <span>{task.summary}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-zinc-800/60">
                    <button
                      onClick={() => {
                        setSummaryTask(task)
                        setSummaryNote(task.summary || '')
                      }}
                      className="px-2.5 py-1 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-800 transition-colors flex items-center gap-1.5"
                      title="Write summary or execution reflection"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>{task.summary ? 'Edit Summary' : '+ Summary'}</span>
                    </button>

                    <button
                      onClick={() => openEdit(task)}
                      className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                      title="Edit Plan"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setDeletingTaskId(task.id)}
                      className="p-1.5 rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                      title="Delete Task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Right-Side Slide-Over Drawer: Add / Edit Plan */}
      <Modal
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false)
          resetForm()
        }}
        title={editingTask ? 'Edit Scheduled Task' : 'Plan Daily Task'}
        description="Assign a time block and category to anchor your focus"
        position="right"
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="What will you do? (Task Title)"
            placeholder="e.g. Book reading, System design deep work, Gym workout"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
          />

          <Select
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={categoryOptions}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
            <Input
              label="End Time"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </div>

          <Textarea
            label="Execution Summary or Notes (Optional)"
            placeholder="Record what you plan to accomplish during this block, or write your post-session reflection..."
            rows={3}
            value={summaryNote}
            onChange={(e) => setSummaryNote(e.target.value)}
          />

          <div className="flex justify-end gap-2.5 pt-4 border-t border-zinc-800">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsDrawerOpen(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              {editingTask ? 'Save Changes' : 'Schedule Task'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Task Summary Note Modal */}
      <Modal
        isOpen={Boolean(summaryTask)}
        onClose={() => setSummaryTask(null)}
        title={`Summary: ${summaryTask?.title}`}
        description="Write what you accomplished or noted during this session"
        position="right"
        maxWidth="md"
      >
        <form onSubmit={handleSaveSummary} className="space-y-4">
          <Textarea
            label="Execution Summary & Reflection"
            placeholder="e.g. Read 25 pages of Chapter 4 on Distributed Transactions. Understood two-phase commit."
            rows={6}
            value={summaryNote}
            onChange={(e) => setSummaryNote(e.target.value)}
            required
            autoFocus
          />

          <div className="flex justify-end gap-2.5 pt-4 border-t border-zinc-800">
            <Button type="button" variant="ghost" size="sm" onClick={() => setSummaryTask(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Summary
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deletingTaskId)}
        onClose={() => setDeletingTaskId(null)}
        onConfirm={async () => {
          if (deletingTaskId) {
            await deletePlan(deletingTaskId)
            setDeletingTaskId(null)
          }
        }}
        title="Remove Scheduled Task"
        message="Are you sure you want to remove this task from your daily plan?"
        confirmText="Remove"
      />
    </div>
  )
}
