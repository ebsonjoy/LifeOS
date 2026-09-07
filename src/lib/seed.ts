import { repository } from './repository'
import type { HabitCategory } from '../types'

export async function seedSampleData(userId: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0]
  const d = new Date()

  // 1. Initial Habits
  const sampleHabits: Array<{
    name: string
    category: HabitCategory
    frequency: 'daily' | 'weekly'
    target_value: number
    unit: string
    color: string
    description: string
  }> = [
    {
      name: 'Deep Work (2 hrs)',
      category: 'career',
      frequency: 'daily',
      target_value: 2,
      unit: 'hours',
      color: '#6366f1',
      description: 'Focused coding and systems design without distractions',
    },
    {
      name: 'Physical Workout',
      category: 'fitness',
      frequency: 'daily',
      target_value: 1,
      unit: 'session',
      color: '#10b981',
      description: 'Strength training or cardio endurance',
    },
    {
      name: 'English Speaking Practice',
      category: 'english',
      frequency: 'daily',
      target_value: 20,
      unit: 'minutes',
      color: '#f59e0b',
      description: 'Pronunciation, vocabulary, and active conversations',
    },
    {
      name: 'Reading Books',
      category: 'learning',
      frequency: 'daily',
      target_value: 20,
      unit: 'pages',
      color: '#06b6d4',
      description: 'Non-fiction, technical architecture, or philosophy',
    },
    {
      name: 'Sleep on Time (< 11:30 PM)',
      category: 'discipline',
      frequency: 'daily',
      target_value: 1,
      unit: 'check',
      color: '#8b5cf6',
      description: 'Consistent sleep schedule for optimal recovery',
    },
    {
      name: 'Screen Time Control (< 2 hrs)',
      category: 'mind',
      frequency: 'daily',
      target_value: 2,
      unit: 'hours',
      color: '#ec4899',
      description: 'No doom-scrolling, mindful digital usage',
    },
  ]

  const createdHabits = []
  for (const h of sampleHabits) {
    const habit = await repository.createHabit({
      ...h,
      user_id: userId,
      is_active: true,
    })
    createdHabits.push(habit)
  }

  // 2. Habit Logs for the past 7 days to show realistic streaks and charts
  for (let i = 6; i >= 0; i--) {
    const dateObj = new Date(d)
    dateObj.setDate(d.getDate() - i)
    const dateStr = dateObj.toISOString().split('T')[0]

    // Complete most habits to generate ~70-85% daily scores
    let completedCount = 0
    for (let hIdx = 0; hIdx < createdHabits.length; hIdx++) {
      const isCompleted = i === 0 ? hIdx < 3 : (i + hIdx) % 4 !== 0
      if (isCompleted) completedCount++
      await repository.toggleHabitLog(userId, createdHabits[hIdx].id, dateStr, isCompleted, 1)
    }

    const dailyScore = Math.round((completedCount / createdHabits.length) * 100)
    await repository.saveDailyLog({
      user_id: userId,
      date: dateStr,
      mood: 4,
      daily_score: dailyScore,
      journal: i === 0 ? 'Solid focus today. Completed deep work sprint.' : 'Consistent effort maintained.',
      accomplishments: 'Shipped backend refactor and stayed on track.',
      went_wrong: i === 2 ? 'Delayed start in morning' : 'None',
      improve_tomorrow: 'Start deep work before checking email.',
    })
  }

  // 3. Sample Goals
  await repository.createGoal({
    user_id: userId,
    title: 'Become a Senior Backend Architect',
    description: 'Master distributed systems, concurrency, and high-throughput databases',
    category: 'career',
    target_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    progress: 42,
    status: 'active',
  })

  await repository.createGoal({
    user_id: userId,
    title: 'Bench 100kg & Run 10K under 50 mins',
    description: 'Build peak functional strength and athletic cardiovascular conditioning',
    category: 'fitness',
    target_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    progress: 65,
    status: 'active',
  })

  await repository.createGoal({
    user_id: userId,
    title: 'C2 Proficient English Communication',
    description: 'Flawless presentation, executive presence, and accent clarity',
    category: 'english',
    target_date: new Date(Date.now() + 270 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    progress: 58,
    status: 'active',
  })

  // 4. Sample Finances
  await repository.addIncome({
    user_id: userId,
    amount: 140000,
    source: 'Software Engineering Salary',
    income_date: today,
  })

  await repository.addExpense({
    user_id: userId,
    amount: 32000,
    category: 'Rent & Housing',
    description: 'Apartment rent & utilities',
    expense_date: today,
  })

  await repository.addExpense({
    user_id: userId,
    amount: 12500,
    category: 'Food & Nutrition',
    description: 'Groceries and meal prep ingredients',
    expense_date: today,
  })

  // 5. Sample Career Job Applications
  await repository.createJobApplication({
    user_id: userId,
    company: 'Stripe',
    role: 'Staff Infrastructure Engineer',
    location: 'Remote',
    salary: '$220,000',
    job_url: 'https://stripe.com/jobs',
    status: 'interview',
    applied_date: today,
    notes: 'Technical system design interview scheduled for next Tuesday.',
  })

  await repository.createJobApplication({
    user_id: userId,
    company: 'Linear',
    role: 'Product Engineer',
    location: 'Remote',
    salary: '$190,000',
    job_url: 'https://linear.app/careers',
    status: 'technical',
    applied_date: today,
    notes: 'Take-home architectural assignment submitted.',
  })

  // 6. Sample Fitness
  await repository.saveFitnessLog({
    user_id: userId,
    date: today,
    workout_completed: true,
    workout_type: 'Strength: Upper Body Push',
    duration_minutes: 55,
    notes: 'Bench press 85kg 4x6, Overhead press 55kg 3x8, Triceps dips.',
    weight: 76.4,
  })

  // 7. Sample Journal
  await repository.createJournalEntry({
    user_id: userId,
    entry_date: today,
    title: 'Commitment to the 3-Year Vision',
    content:
      'Starting this transformation with clarity. Transformation is not about giant heroic leaps, but unyielding daily consistency. When tired, choose discipline over impulse.',
    mood: 5,
  })
}

export function clearUserData(userId: string): void {
  const keys = [
    'habits_' + userId,
    'habit_logs_' + userId,
    'daily_logs_' + userId,
    'goals_' + userId,
    'journal_' + userId,
    'income_' + userId,
    'expenses_' + userId,
    'jobs_' + userId,
    'fitness_' + userId,
  ]
  keys.forEach((k) => localStorage.removeItem('lifeos_local_' + k))
}
