import { supabase, isSupabaseConfigured } from './supabase'
import type {
  Profile,
  Habit,
  HabitLog,
  DailyLog,
  Goal,
  JournalEntry,
  Expense,
  Income,
  JobApplication,
  FitnessLog,
  PlannedTask,
} from '../types'

// Local storage key prefix
const STORAGE_PREFIX = 'lifeos_local_'

function getLocalData<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key)
    return raw ? JSON.parse(raw) : fallback
  } catch (err) {
    console.error(`Error reading ${key} from localStorage`, err)
    return fallback
  }
}

function setLocalData<T>(key: string, data: T): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data))
  } catch (err) {
    console.error(`Error saving ${key} to localStorage`, err)
  }
}

/**
 * Checks if there is a currently active and valid Supabase authentication session.
 * If user is unauthenticated or has a local demo ID (e.g. 'dev-user-lifeos'), returns false
 * so operations gracefully use local workspace storage without triggering Supabase 403/42501 RLS errors.
 */
async function canQuerySupabase(userId?: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false
  if (!userId || userId === 'dev-user-lifeos' || !userId.includes('-') || userId.length < 20) {
    return false
  }
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return false
    if (session.user.id !== userId) return false
    return true
  } catch {
    return false
  }
}

export const repository = {
  // --------------------------------------------------------------------------
  // PROFILES
  // --------------------------------------------------------------------------
  async getProfile(userId: string): Promise<Profile | null> {
    if (await canQuerySupabase(userId)) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()
        if (!error && data) return data
      } catch (err) {
        console.warn('Supabase getProfile failed, fallback to local:', err)
      }
    }

    const profiles = getLocalData<Record<string, Profile>>('profiles', {})
    return profiles[userId] || null
  },

  async upsertProfile(profile: Partial<Profile> & { id: string }): Promise<Profile> {
    const now = new Date().toISOString()
    const fullProfile: Profile = {
      id: profile.id,
      full_name: profile.full_name || 'Member',
      avatar_url: profile.avatar_url || null,
      timezone: profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      transformation_start_date: profile.transformation_start_date || new Date().toISOString().split('T')[0],
      transformation_target_date:
        profile.transformation_target_date ||
        new Date(Date.now() + 1095 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      onboarding_completed: profile.onboarding_completed ?? false,
      updated_at: now,
    }

    if (await canQuerySupabase(profile.id)) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .upsert(fullProfile)
          .select()
          .single()
        if (!error && data) return data
      } catch (err) {
        console.warn('Supabase upsertProfile failed, fallback to local:', err)
      }
    }

    const profiles = getLocalData<Record<string, Profile>>('profiles', {})
    profiles[profile.id] = { ...(profiles[profile.id] || {}), ...fullProfile }
    setLocalData('profiles', profiles)
    return profiles[profile.id]
  },

  // --------------------------------------------------------------------------
  // HABITS
  // --------------------------------------------------------------------------
  async listHabits(userId: string): Promise<Habit[]> {
    if (await canQuerySupabase(userId)) {
      try {
        const { data, error } = await supabase
          .from('habits')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: true })
        if (!error && data) return data
      } catch (err) {
        console.warn('Supabase listHabits failed, fallback to local:', err)
      }
    }

    const habits = getLocalData<Habit[]>('habits_' + userId, [])
    return habits
  },

  async createHabit(habit: Omit<Habit, 'id' | 'created_at' | 'updated_at'>): Promise<Habit> {
    const now = new Date().toISOString()
    if (await canQuerySupabase(habit.user_id)) {
      try {
        const { data, error } = await supabase
          .from('habits')
          .insert({ ...habit, updated_at: now })
          .select()
          .single()
        if (!error && data) return data
      } catch (err) {
        console.warn('Supabase createHabit failed, fallback to local:', err)
      }
    }

    const habits = getLocalData<Habit[]>('habits_' + habit.user_id, [])
    const newHabit: Habit = {
      ...habit,
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now,
    }
    habits.push(newHabit)
    setLocalData('habits_' + habit.user_id, habits)
    return newHabit
  },

  async updateHabit(userId: string, habitId: string, updates: Partial<Habit>): Promise<Habit> {
    const now = new Date().toISOString()
    if (await canQuerySupabase(userId)) {
      try {
        const { data, error } = await supabase
          .from('habits')
          .update({ ...updates, updated_at: now })
          .eq('id', habitId)
          .eq('user_id', userId)
          .select()
          .single()
        if (!error && data) return data
      } catch (err) {
        console.warn('Supabase updateHabit failed, fallback to local:', err)
      }
    }

    const habits = getLocalData<Habit[]>('habits_' + userId, [])
    const index = habits.findIndex((h) => h.id === habitId)
    if (index === -1) throw new Error('Habit not found')
    habits[index] = { ...habits[index], ...updates, updated_at: now }
    setLocalData('habits_' + userId, habits)
    return habits[index]
  },

  async deleteHabit(userId: string, habitId: string): Promise<void> {
    if (await canQuerySupabase(userId)) {
      try {
        const { error } = await supabase
          .from('habits')
          .delete()
          .eq('id', habitId)
          .eq('user_id', userId)
        if (!error) return
      } catch (err) {
        console.warn('Supabase deleteHabit failed, fallback to local:', err)
      }
    }

    let habits = getLocalData<Habit[]>('habits_' + userId, [])
    habits = habits.filter((h) => h.id !== habitId)
    setLocalData('habits_' + userId, habits)

    let logs = getLocalData<HabitLog[]>('habit_logs_' + userId, [])
    logs = logs.filter((l) => l.habit_id !== habitId)
    setLocalData('habit_logs_' + userId, logs)
  },

  // --------------------------------------------------------------------------
  // HABIT LOGS
  // --------------------------------------------------------------------------
  async listHabitLogs(userId: string, startDate?: string, endDate?: string): Promise<HabitLog[]> {
    if (await canQuerySupabase(userId)) {
      try {
        let query = supabase.from('habit_logs').select('*').eq('user_id', userId)
        if (startDate) query = query.gte('date', startDate)
        if (endDate) query = query.lte('date', endDate)
        const { data, error } = await query
        if (!error && data) return data
      } catch (err) {
        console.warn('Supabase listHabitLogs failed, fallback to local:', err)
      }
    }

    const logs = getLocalData<HabitLog[]>('habit_logs_' + userId, [])
    return logs.filter((log) => {
      if (startDate && log.date < startDate) return false
      if (endDate && log.date > endDate) return false
      return true
    })
  },

  async toggleHabitLog(
    userId: string,
    habitId: string,
    date: string,
    completed: boolean,
    value: number = 1
  ): Promise<HabitLog> {
    const now = new Date().toISOString()
    if (await canQuerySupabase(userId)) {
      try {
        const { data, error } = await supabase
          .from('habit_logs')
          .upsert(
            {
              user_id: userId,
              habit_id: habitId,
              date,
              completed,
              value,
            },
            { onConflict: 'user_id,habit_id,date' }
          )
          .select()
          .single()
        if (!error && data) return data
      } catch (err) {
        console.warn('Supabase toggleHabitLog failed, fallback to local:', err)
      }
    }

    const logs = getLocalData<HabitLog[]>('habit_logs_' + userId, [])
    const index = logs.findIndex((l) => l.habit_id === habitId && l.date === date)
    if (index >= 0) {
      logs[index] = { ...logs[index], completed, value }
      setLocalData('habit_logs_' + userId, logs)
      return logs[index]
    } else {
      const newLog: HabitLog = {
        id: crypto.randomUUID(),
        user_id: userId,
        habit_id: habitId,
        date,
        completed,
        value,
        created_at: now,
      }
      logs.push(newLog)
      setLocalData('habit_logs_' + userId, logs)
      return newLog
    }
  },

  // --------------------------------------------------------------------------
  // DAILY LOGS
  // --------------------------------------------------------------------------
  async getDailyLog(userId: string, date: string): Promise<DailyLog | null> {
    if (await canQuerySupabase(userId)) {
      try {
        const { data, error } = await supabase
          .from('daily_logs')
          .select('*')
          .eq('user_id', userId)
          .eq('date', date)
          .single()
        if (!error && data) return data
      } catch (err) {
        console.warn('Supabase getDailyLog failed, fallback to local:', err)
      }
    }

    const logs = getLocalData<DailyLog[]>('daily_logs_' + userId, [])
    return logs.find((l) => l.date === date) || null
  },

  async listDailyLogs(userId: string, startDate?: string, endDate?: string): Promise<DailyLog[]> {
    if (await canQuerySupabase(userId)) {
      try {
        let query = supabase.from('daily_logs').select('*').eq('user_id', userId).order('date', { ascending: true })
        if (startDate) query = query.gte('date', startDate)
        if (endDate) query = query.lte('date', endDate)
        const { data, error } = await query
        if (!error && data) return data
      } catch (err) {
        console.warn('Supabase listDailyLogs failed, fallback to local:', err)
      }
    }

    const logs = getLocalData<DailyLog[]>('daily_logs_' + userId, [])
    return logs.filter((log) => {
      if (startDate && log.date < startDate) return false
      if (endDate && log.date > endDate) return false
      return true
    })
  },

  async saveDailyLog(log: Omit<DailyLog, 'id' | 'created_at' | 'updated_at'>): Promise<DailyLog> {
    const now = new Date().toISOString()
    if (await canQuerySupabase(log.user_id)) {
      try {
        const { data, error } = await supabase
          .from('daily_logs')
          .upsert(
            { ...log, updated_at: now },
            { onConflict: 'user_id,date' }
          )
          .select()
          .single()
        if (!error && data) return data
      } catch (err) {
        console.warn('Supabase saveDailyLog failed, fallback to local:', err)
      }
    }

    const logs = getLocalData<DailyLog[]>('daily_logs_' + log.user_id, [])
    const index = logs.findIndex((l) => l.date === log.date)
    if (index >= 0) {
      logs[index] = { ...logs[index], ...log, updated_at: now }
      setLocalData('daily_logs_' + log.user_id, logs)
      return logs[index]
    } else {
      const newLog: DailyLog = {
        ...log,
        id: crypto.randomUUID(),
        created_at: now,
        updated_at: now,
      }
      logs.push(newLog)
      setLocalData('daily_logs_' + log.user_id, logs)
      return newLog
    }
  },

  // --------------------------------------------------------------------------
  // GOALS
  // --------------------------------------------------------------------------
  async listGoals(userId: string): Promise<Goal[]> {
    if (await canQuerySupabase(userId)) {
      try {
        const { data, error } = await supabase
          .from('goals')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
        if (!error && data) return data
      } catch (err) {
        console.warn('Supabase listGoals failed, fallback to local:', err)
      }
    }

    return getLocalData<Goal[]>('goals_' + userId, [])
  },

  async createGoal(goal: Omit<Goal, 'id' | 'created_at' | 'updated_at'>): Promise<Goal> {
    const now = new Date().toISOString()
    if (await canQuerySupabase(goal.user_id)) {
      try {
        const { data, error } = await supabase
          .from('goals')
          .insert({ ...goal, updated_at: now })
          .select()
          .single()
        if (!error && data) return data
      } catch (err) {
        console.warn('Supabase createGoal failed, fallback to local:', err)
      }
    }

    const goals = getLocalData<Goal[]>('goals_' + goal.user_id, [])
    const newGoal: Goal = {
      ...goal,
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now,
    }
    goals.unshift(newGoal)
    setLocalData('goals_' + goal.user_id, goals)
    return newGoal
  },

  async updateGoal(userId: string, goalId: string, updates: Partial<Goal>): Promise<Goal> {
    const now = new Date().toISOString()
    if (await canQuerySupabase(userId)) {
      try {
        const { data, error } = await supabase
          .from('goals')
          .update({ ...updates, updated_at: now })
          .eq('id', goalId)
          .eq('user_id', userId)
          .select()
          .single()
        if (!error && data) return data
      } catch (err) {
        console.warn('Supabase updateGoal failed, fallback to local:', err)
      }
    }

    const goals = getLocalData<Goal[]>('goals_' + userId, [])
    const index = goals.findIndex((g) => g.id === goalId)
    if (index === -1) throw new Error('Goal not found')
    goals[index] = { ...goals[index], ...updates, updated_at: now }
    setLocalData('goals_' + userId, goals)
    return goals[index]
  },

  async deleteGoal(userId: string, goalId: string): Promise<void> {
    if (await canQuerySupabase(userId)) {
      try {
        const { error } = await supabase
          .from('goals')
          .delete()
          .eq('id', goalId)
          .eq('user_id', userId)
        if (!error) return
      } catch (err) {
        console.warn('Supabase deleteGoal failed, fallback to local:', err)
      }
    }

    let goals = getLocalData<Goal[]>('goals_' + userId, [])
    goals = goals.filter((g) => g.id !== goalId)
    setLocalData('goals_' + userId, goals)
  },

  // --------------------------------------------------------------------------
  // JOURNAL ENTRIES
  // --------------------------------------------------------------------------
  async listJournalEntries(userId: string): Promise<JournalEntry[]> {
    if (await canQuerySupabase(userId)) {
      try {
        const { data, error } = await supabase
          .from('journal_entries')
          .select('*')
          .eq('user_id', userId)
          .order('entry_date', { ascending: false })
        if (!error && data) return data
      } catch (err) {
        console.warn('Supabase listJournalEntries failed, fallback to local:', err)
      }
    }

    return getLocalData<JournalEntry[]>('journal_' + userId, [])
  },

  async createJournalEntry(
    entry: Omit<JournalEntry, 'id' | 'created_at' | 'updated_at'>
  ): Promise<JournalEntry> {
    const now = new Date().toISOString()
    if (await canQuerySupabase(entry.user_id)) {
      try {
        const { data, error } = await supabase
          .from('journal_entries')
          .insert({ ...entry, updated_at: now })
          .select()
          .single()
        if (!error && data) return data
      } catch (err) {
        console.warn('Supabase createJournalEntry failed, fallback to local:', err)
      }
    }

    const entries = getLocalData<JournalEntry[]>('journal_' + entry.user_id, [])
    const newEntry: JournalEntry = {
      ...entry,
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now,
    }
    entries.unshift(newEntry)
    setLocalData('journal_' + entry.user_id, entries)
    return newEntry
  },

  async updateJournalEntry(
    userId: string,
    id: string,
    updates: Partial<JournalEntry>
  ): Promise<JournalEntry> {
    const now = new Date().toISOString()
    if (await canQuerySupabase(userId)) {
      try {
        const { data, error } = await supabase
          .from('journal_entries')
          .update({ ...updates, updated_at: now })
          .eq('id', id)
          .eq('user_id', userId)
          .select()
          .single()
        if (!error && data) return data
      } catch (err) {
        console.warn('Supabase updateJournalEntry failed, fallback to local:', err)
      }
    }

    const entries = getLocalData<JournalEntry[]>('journal_' + userId, [])
    const index = entries.findIndex((e) => e.id === id)
    if (index === -1) throw new Error('Entry not found')
    entries[index] = { ...entries[index], ...updates, updated_at: now }
    setLocalData('journal_' + userId, entries)
    return entries[index]
  },

  async deleteJournalEntry(userId: string, id: string): Promise<void> {
    if (await canQuerySupabase(userId)) {
      try {
        const { error } = await supabase
          .from('journal_entries')
          .delete()
          .eq('id', id)
          .eq('user_id', userId)
        if (!error) return
      } catch (err) {
        console.warn('Supabase deleteJournalEntry failed, fallback to local:', err)
      }
    }

    let entries = getLocalData<JournalEntry[]>('journal_' + userId, [])
    entries = entries.filter((e) => e.id !== id)
    setLocalData('journal_' + userId, entries)
  },

  // --------------------------------------------------------------------------
  // FINANCE: INCOME & EXPENSES
  // --------------------------------------------------------------------------
  async listFinances(userId: string): Promise<{ incomes: Income[]; expenses: Expense[] }> {
    if (await canQuerySupabase(userId)) {
      try {
        const [incRes, expRes] = await Promise.all([
          supabase.from('income').select('*').eq('user_id', userId).order('income_date', { ascending: false }),
          supabase.from('expenses').select('*').eq('user_id', userId).order('expense_date', { ascending: false }),
        ])
        if (!incRes.error && !expRes.error) {
          return { incomes: incRes.data || [], expenses: expRes.data || [] }
        }
      } catch (err) {
        console.warn('Supabase listFinances failed, fallback to local:', err)
      }
    }

    return {
      incomes: getLocalData<Income[]>('income_' + userId, []),
      expenses: getLocalData<Expense[]>('expenses_' + userId, []),
    }
  },

  async addIncome(income: Omit<Income, 'id' | 'created_at'>): Promise<Income> {
    const now = new Date().toISOString()
    if (await canQuerySupabase(income.user_id)) {
      try {
        const { data, error } = await supabase
          .from('income')
          .insert(income)
          .select()
          .single()
        if (!error && data) return data
      } catch (err) {
        console.warn('Supabase addIncome failed, fallback to local:', err)
      }
    }

    const incomes = getLocalData<Income[]>('income_' + income.user_id, [])
    const newInc: Income = {
      ...income,
      id: crypto.randomUUID(),
      created_at: now,
    }
    incomes.unshift(newInc)
    setLocalData('income_' + income.user_id, incomes)
    return newInc
  },

  async deleteIncome(userId: string, id: string): Promise<void> {
    if (await canQuerySupabase(userId)) {
      try {
        const { error } = await supabase.from('income').delete().eq('id', id).eq('user_id', userId)
        if (!error) return
      } catch (err) {
        console.warn('Supabase deleteIncome failed, fallback to local:', err)
      }
    }
    let incomes = getLocalData<Income[]>('income_' + userId, [])
    incomes = incomes.filter((i) => i.id !== id)
    setLocalData('income_' + userId, incomes)
  },

  async addExpense(expense: Omit<Expense, 'id' | 'created_at'>): Promise<Expense> {
    const now = new Date().toISOString()
    if (await canQuerySupabase(expense.user_id)) {
      try {
        const { data, error } = await supabase
          .from('expenses')
          .insert(expense)
          .select()
          .single()
        if (!error && data) return data
      } catch (err) {
        console.warn('Supabase addExpense failed, fallback to local:', err)
      }
    }

    const expenses = getLocalData<Expense[]>('expenses_' + expense.user_id, [])
    const newExp: Expense = {
      ...expense,
      id: crypto.randomUUID(),
      created_at: now,
    }
    expenses.unshift(newExp)
    setLocalData('expenses_' + expense.user_id, expenses)
    return newExp
  },

  async deleteExpense(userId: string, id: string): Promise<void> {
    if (await canQuerySupabase(userId)) {
      try {
        const { error } = await supabase.from('expenses').delete().eq('id', id).eq('user_id', userId)
        if (!error) return
      } catch (err) {
        console.warn('Supabase deleteExpense failed, fallback to local:', err)
      }
    }
    let expenses = getLocalData<Expense[]>('expenses_' + userId, [])
    expenses = expenses.filter((e) => e.id !== id)
    setLocalData('expenses_' + userId, expenses)
  },

  // --------------------------------------------------------------------------
  // CAREER / JOB APPLICATIONS
  // --------------------------------------------------------------------------
  async listJobApplications(userId: string): Promise<JobApplication[]> {
    if (await canQuerySupabase(userId)) {
      try {
        const { data, error } = await supabase
          .from('job_applications')
          .select('*')
          .eq('user_id', userId)
          .order('applied_date', { ascending: false })
        if (!error && data) return data
      } catch (err) {
        console.warn('Supabase listJobApplications failed, fallback to local:', err)
      }
    }

    return getLocalData<JobApplication[]>('jobs_' + userId, [])
  },

  async createJobApplication(
    app: Omit<JobApplication, 'id' | 'created_at' | 'updated_at' | 'user_id'> & { user_id: string }
  ): Promise<JobApplication> {
    const now = new Date().toISOString()
    if (await canQuerySupabase(app.user_id)) {
      try {
        const { data, error } = await supabase
          .from('job_applications')
          .insert({ ...app, updated_at: now })
          .select()
          .single()
        if (!error && data) return data
      } catch (err) {
        console.warn('Supabase createJobApplication failed, fallback to local:', err)
      }
    }

    const apps = getLocalData<JobApplication[]>('jobs_' + app.user_id, [])
    const newApp: JobApplication = {
      ...app,
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now,
    }
    apps.unshift(newApp)
    setLocalData('jobs_' + app.user_id, apps)
    return newApp
  },

  async updateJobApplication(
    userId: string,
    id: string,
    updates: Partial<JobApplication>
  ): Promise<JobApplication> {
    const now = new Date().toISOString()
    if (await canQuerySupabase(userId)) {
      try {
        const { data, error } = await supabase
          .from('job_applications')
          .update({ ...updates, updated_at: now })
          .eq('id', id)
          .eq('user_id', userId)
          .select()
          .single()
        if (!error && data) return data
      } catch (err) {
        console.warn('Supabase updateJobApplication failed, fallback to local:', err)
      }
    }

    const apps = getLocalData<JobApplication[]>('jobs_' + userId, [])
    const index = apps.findIndex((a) => a.id === id)
    if (index === -1) throw new Error('Application not found')
    apps[index] = { ...apps[index], ...updates, updated_at: now }
    setLocalData('jobs_' + userId, apps)
    return apps[index]
  },

  async deleteJobApplication(userId: string, id: string): Promise<void> {
    if (await canQuerySupabase(userId)) {
      try {
        const { error } = await supabase
          .from('job_applications')
          .delete()
          .eq('id', id)
          .eq('user_id', userId)
        if (!error) return
      } catch (err) {
        console.warn('Supabase deleteJobApplication failed, fallback to local:', err)
      }
    }

    let apps = getLocalData<JobApplication[]>('jobs_' + userId, [])
    apps = apps.filter((a) => a.id !== id)
    setLocalData('jobs_' + userId, apps)
  },

  // --------------------------------------------------------------------------
  // FITNESS LOGS
  // --------------------------------------------------------------------------
  async listFitnessLogs(userId: string): Promise<FitnessLog[]> {
    if (await canQuerySupabase(userId)) {
      try {
        const { data, error } = await supabase
          .from('fitness_logs')
          .select('*')
          .eq('user_id', userId)
          .order('date', { ascending: false })
        if (!error && data) return data
      } catch (err) {
        console.warn('Supabase listFitnessLogs failed, fallback to local:', err)
      }
    }

    return getLocalData<FitnessLog[]>('fitness_' + userId, [])
  },

  async saveFitnessLog(log: Omit<FitnessLog, 'id' | 'created_at' | 'updated_at'>): Promise<FitnessLog> {
    const now = new Date().toISOString()
    if (await canQuerySupabase(log.user_id)) {
      try {
        const { data, error } = await supabase
          .from('fitness_logs')
          .insert({ ...log, updated_at: now })
          .select()
          .single()
        if (!error && data) return data
      } catch (err) {
        console.warn('Supabase saveFitnessLog failed, fallback to local:', err)
      }
    }

    const logs = getLocalData<FitnessLog[]>('fitness_' + log.user_id, [])
    const newLog: FitnessLog = {
      ...log,
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now,
    }
    logs.unshift(newLog)
    setLocalData('fitness_' + log.user_id, logs)
    return newLog
  },

  async deleteFitnessLog(userId: string, id: string): Promise<void> {
    if (await canQuerySupabase(userId)) {
      try {
        const { error } = await supabase
          .from('fitness_logs')
          .delete()
          .eq('id', id)
          .eq('user_id', userId)
        if (!error) return
      } catch (err) {
        console.warn('Supabase deleteFitnessLog failed, fallback to local:', err)
      }
    }

    let logs = getLocalData<FitnessLog[]>('fitness_' + userId, [])
    logs = logs.filter((l) => l.id !== id)
    setLocalData('fitness_' + userId, logs)
  },

  // --------------------------------------------------------------------------
  // DAILY PLANS / TIME-BLOCK TASKS
  // --------------------------------------------------------------------------
  async listDailyPlans(userId: string, date: string): Promise<PlannedTask[]> {
    if (await canQuerySupabase(userId)) {
      try {
        const { data, error } = await supabase
          .from('daily_plans')
          .select('*')
          .eq('user_id', userId)
          .eq('date', date)
          .order('start_time', { ascending: true })
        if (!error && data) return data
      } catch (err) {
        console.warn('Supabase listDailyPlans failed, fallback to local:', err)
      }
    }

    const plans = getLocalData<PlannedTask[]>('plans_' + userId, [])
    return plans
      .filter((p) => p.date === date)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
  },

  async createDailyPlan(
    plan: Omit<PlannedTask, 'id' | 'created_at' | 'updated_at'>
  ): Promise<PlannedTask> {
    const now = new Date().toISOString()
    if (await canQuerySupabase(plan.user_id)) {
      try {
        const { data, error } = await supabase
          .from('daily_plans')
          .insert({ ...plan, updated_at: now })
          .select()
          .single()
        if (!error && data) return data
        console.warn('Supabase createDailyPlan notice:', error?.message)
      } catch (err) {
        console.warn('Supabase createDailyPlan exception, fallback to local workspace:', err)
      }
    }

    const plans = getLocalData<PlannedTask[]>('plans_' + plan.user_id, [])
    const newPlan: PlannedTask = {
      ...plan,
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now,
    }
    plans.push(newPlan)
    setLocalData('plans_' + plan.user_id, plans)
    return newPlan
  },

  async updateDailyPlan(
    userId: string,
    id: string,
    updates: Partial<PlannedTask>
  ): Promise<PlannedTask> {
    const now = new Date().toISOString()
    if (await canQuerySupabase(userId)) {
      try {
        const { data, error } = await supabase
          .from('daily_plans')
          .update({ ...updates, updated_at: now })
          .eq('id', id)
          .eq('user_id', userId)
          .select()
          .single()
        if (!error && data) return data
      } catch (err) {
        console.warn('Supabase updateDailyPlan failed, fallback to local:', err)
      }
    }

    const plans = getLocalData<PlannedTask[]>('plans_' + userId, [])
    const index = plans.findIndex((p) => p.id === id)
    if (index === -1) {
      const fallbackTask: PlannedTask = {
        id,
        user_id: userId,
        date: new Date().toISOString().split('T')[0],
        title: 'Task',
        category: 'routine',
        start_time: '09:00',
        end_time: '10:00',
        completed: false,
        summary: null,
        created_at: now,
        updated_at: now,
        ...updates,
      }
      plans.push(fallbackTask)
      setLocalData('plans_' + userId, plans)
      return fallbackTask
    }
    plans[index] = { ...plans[index], ...updates, updated_at: now }
    setLocalData('plans_' + userId, plans)
    return plans[index]
  },

  async deleteDailyPlan(userId: string, id: string): Promise<void> {
    if (await canQuerySupabase(userId)) {
      try {
        const { error } = await supabase
          .from('daily_plans')
          .delete()
          .eq('id', id)
          .eq('user_id', userId)
        if (!error) return
      } catch (err) {
        console.warn('Supabase deleteDailyPlan failed, fallback to local:', err)
      }
    }

    let plans = getLocalData<PlannedTask[]>('plans_' + userId, [])
    plans = plans.filter((p) => p.id !== id)
    setLocalData('plans_' + userId, plans)
  },
}
