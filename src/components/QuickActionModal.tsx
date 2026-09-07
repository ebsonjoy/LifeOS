import { useState } from 'react'
import { Modal, Input, Textarea, Select, Button } from './ui'
import { useHabits } from '../hooks/useHabits'
import { useGoals } from '../hooks/useGoals'
import { useFinance } from '../hooks/useFinance'
import { useCareer } from '../hooks/useCareer'
import { useJournal } from '../hooks/useJournal'
import { usePlanning } from '../hooks/usePlanning'
import { getTodayString } from '../lib/dateUtils'
import type { HabitCategory } from '../types'
import { CheckSquare, Target, DollarSign, Briefcase, BookOpen, Clock } from 'lucide-react'

export interface QuickActionModalProps {
  isOpen: boolean
  onClose: () => void
  initialTab?: 'plan' | 'habit' | 'goal' | 'expense' | 'job' | 'journal'
}

export function QuickActionModal({ isOpen, onClose, initialTab = 'plan' }: QuickActionModalProps) {
  const [tab, setTab] = useState<'plan' | 'habit' | 'goal' | 'expense' | 'job' | 'journal'>(initialTab)

  // Submissions
  const { createHabit } = useHabits()
  const { createGoal } = useGoals()
  const { addExpense } = useFinance()
  const { createApplication } = useCareer()
  const { createEntry } = useJournal()
  const { createPlan } = usePlanning()

  // Form states
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Plan task form
  const [planTitle, setPlanTitle] = useState('')
  const [planCategory, setPlanCategory] = useState('reading')
  const [planStartTime, setPlanStartTime] = useState('10:00')
  const [planEndTime, setPlanEndTime] = useState('10:30')

  // Habit form
  const [habitName, setHabitName] = useState('')
  const [habitCategory, setHabitCategory] = useState<HabitCategory>('career')
  const [habitFrequency, setHabitFrequency] = useState<'daily' | 'weekly'>('daily')

  // Goal form
  const [goalTitle, setGoalTitle] = useState('')
  const [goalCategory, setGoalCategory] = useState<HabitCategory>('career')
  const [goalTargetDate, setGoalTargetDate] = useState('')

  // Expense form
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseCategory, setExpenseCategory] = useState('General')
  const [expenseDesc, setExpenseDesc] = useState('')

  // Job form
  const [jobCompany, setJobCompany] = useState('')
  const [jobRole, setJobRole] = useState('')
  const [jobStatus, setJobStatus] = useState<'saved' | 'applied' | 'interview'>('applied')

  // Journal form
  const [journalTitle, setJournalTitle] = useState('')
  const [journalContent, setJournalContent] = useState('')
  const [journalMood, setJournalMood] = useState('4')

  const resetForms = () => {
    setPlanTitle('')
    setPlanCategory('reading')
    setPlanStartTime('10:00')
    setPlanEndTime('10:30')
    setHabitName('')
    setGoalTitle('')
    setGoalTargetDate('')
    setExpenseAmount('')
    setExpenseDesc('')
    setJobCompany('')
    setJobRole('')
    setJournalTitle('')
    setJournalContent('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      if (tab === 'plan' && planTitle.trim()) {
        await createPlan({
          title: planTitle.trim(),
          category: planCategory,
          start_time: planStartTime,
          end_time: planEndTime,
        })
      } else if (tab === 'habit' && habitName.trim()) {
        await createHabit({
          name: habitName.trim(),
          category: habitCategory,
          frequency: habitFrequency,
          target_value: 1,
          unit: 'times',
          color: '#6366f1',
          is_active: true,
        })
      } else if (tab === 'goal' && goalTitle.trim()) {
        await createGoal({
          title: goalTitle.trim(),
          category: goalCategory,
          target_date: goalTargetDate || null,
          progress: 0,
          status: 'active',
        })
      } else if (tab === 'expense' && expenseAmount) {
        await addExpense({
          amount: parseFloat(expenseAmount),
          category: expenseCategory,
          description: expenseDesc || null,
          expense_date: getTodayString(),
        })
      } else if (tab === 'job' && jobCompany.trim() && jobRole.trim()) {
        await createApplication({
          company: jobCompany.trim(),
          role: jobRole.trim(),
          status: jobStatus,
          applied_date: getTodayString(),
        })
      } else if (tab === 'journal' && journalTitle.trim() && journalContent.trim()) {
        await createEntry({
          title: journalTitle.trim(),
          content: journalContent.trim(),
          entry_date: getTodayString(),
          mood: parseInt(journalMood, 10),
        })
      }
      resetForms()
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Quick Action" maxWidth="md">
      {/* Navigation tabs */}
      <div className="flex border-b border-zinc-800 pb-3 mb-5 gap-1.5 overflow-x-auto">
        {[
          { id: 'plan', label: 'Plan Task', icon: <Clock className="w-3.5 h-3.5" /> },
          { id: 'habit', label: 'Habit', icon: <CheckSquare className="w-3.5 h-3.5" /> },
          { id: 'goal', label: 'Goal', icon: <Target className="w-3.5 h-3.5" /> },
          { id: 'expense', label: 'Expense', icon: <DollarSign className="w-3.5 h-3.5" /> },
          { id: 'job', label: 'Job App', icon: <Briefcase className="w-3.5 h-3.5" /> },
          { id: 'journal', label: 'Journal', icon: <BookOpen className="w-3.5 h-3.5" /> },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id as any)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              tab === t.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {tab === 'plan' && (
          <>
            <Input
              label="Task Title"
              placeholder="e.g. Book reading, System design sprint"
              value={planTitle}
              onChange={(e) => setPlanTitle(e.target.value)}
              required
              autoFocus
            />
            <Select
              label="Category"
              value={planCategory}
              onChange={(e) => setPlanCategory(e.target.value)}
              options={categoryOptions}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Start Time"
                type="time"
                value={planStartTime}
                onChange={(e) => setPlanStartTime(e.target.value)}
                required
              />
              <Input
                label="End Time"
                type="time"
                value={planEndTime}
                onChange={(e) => setPlanEndTime(e.target.value)}
                required
              />
            </div>
          </>
        )}
        {tab === 'habit' && (
          <>
            <Input
              label="Habit Name"
              placeholder="e.g. Read 20 pages"
              value={habitName}
              onChange={(e) => setHabitName(e.target.value)}
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Category"
                value={habitCategory}
                onChange={(e) => setHabitCategory(e.target.value as HabitCategory)}
                options={categoryOptions}
              />
              <Select
                label="Frequency"
                value={habitFrequency}
                onChange={(e) => setHabitFrequency(e.target.value as any)}
                options={[
                  { label: 'Daily', value: 'daily' },
                  { label: 'Weekly', value: 'weekly' },
                ]}
              />
            </div>
          </>
        )}

        {tab === 'goal' && (
          <>
            <Input
              label="Goal Title"
              placeholder="e.g. Reach C2 Level in English"
              value={goalTitle}
              onChange={(e) => setGoalTitle(e.target.value)}
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Category"
                value={goalCategory}
                onChange={(e) => setGoalCategory(e.target.value as HabitCategory)}
                options={categoryOptions}
              />
              <Input
                label="Target Date"
                type="date"
                value={goalTargetDate}
                onChange={(e) => setGoalTargetDate(e.target.value)}
              />
            </div>
          </>
        )}

        {tab === 'expense' && (
          <>
            <Input
              label="Amount"
              type="number"
              step="any"
              placeholder="e.g. 450"
              value={expenseAmount}
              onChange={(e) => setExpenseAmount(e.target.value)}
              required
            />
            <Input
              label="Category"
              placeholder="e.g. Food, Books, Transport"
              value={expenseCategory}
              onChange={(e) => setExpenseCategory(e.target.value)}
              required
            />
            <Input
              label="Description (Optional)"
              placeholder="e.g. Technical system design book"
              value={expenseDesc}
              onChange={(e) => setExpenseDesc(e.target.value)}
            />
          </>
        )}

        {tab === 'job' && (
          <>
            <Input
              label="Company"
              placeholder="e.g. Stripe, OpenAI"
              value={jobCompany}
              onChange={(e) => setJobCompany(e.target.value)}
              required
            />
            <Input
              label="Role"
              placeholder="e.g. Senior Software Engineer"
              value={jobRole}
              onChange={(e) => setJobRole(e.target.value)}
              required
            />
            <Select
              label="Status"
              value={jobStatus}
              onChange={(e) => setJobStatus(e.target.value as any)}
              options={[
                { label: 'Applied', value: 'applied' },
                { label: 'Saved', value: 'saved' },
                { label: 'Interview', value: 'interview' },
              ]}
            />
          </>
        )}

        {tab === 'journal' && (
          <>
            <Input
              label="Entry Title"
              placeholder="e.g. Evening Reflection"
              value={journalTitle}
              onChange={(e) => setJournalTitle(e.target.value)}
              required
            />
            <Textarea
              label="Reflection"
              placeholder="What did you learn or conquer today?"
              rows={4}
              value={journalContent}
              onChange={(e) => setJournalContent(e.target.value)}
              required
            />
            <Select
              label="Mood"
              value={journalMood}
              onChange={(e) => setJournalMood(e.target.value)}
              options={[
                { label: '5 - Excellent / Peak Flow', value: '5' },
                { label: '4 - Good / Consistent', value: '4' },
                { label: '3 - Average / Normal', value: '3' },
                { label: '2 - Challenging', value: '2' },
                { label: '1 - Difficult', value: '1' },
              ]}
            />
          </>
        )}

        <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-zinc-800">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  )
}
