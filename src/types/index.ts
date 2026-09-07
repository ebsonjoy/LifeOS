// ==============================================================================
// LifeOS Types & Domain Models
// ==============================================================================

export type HabitCategory =
  | 'career'
  | 'fitness'
  | 'mind'
  | 'english'
  | 'learning'
  | 'finance'
  | 'discipline'
  | 'personal'

export type HabitFrequency = 'daily' | 'weekly'

export interface Profile {
  id: string
  full_name: string
  avatar_url?: string | null
  timezone: string
  transformation_start_date: string // YYYY-MM-DD
  transformation_target_date: string // YYYY-MM-DD
  onboarding_completed: boolean
  created_at?: string
  updated_at?: string
}

export interface Habit {
  id: string
  user_id: string
  name: string
  description?: string | null
  category: HabitCategory
  frequency: HabitFrequency
  target_value: number
  unit: string
  color: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface HabitLog {
  id: string
  user_id: string
  habit_id: string
  date: string // YYYY-MM-DD
  completed: boolean
  value: number
  note?: string | null
  created_at: string
}

export interface DailyLog {
  id: string
  user_id: string
  date: string // YYYY-MM-DD
  mood?: number | null // 1-5
  daily_score?: number | null // 0-100
  screen_time_minutes?: number | null // total daily screen time in minutes
  journal?: string | null // original draft journal
  journal_corrected?: string | null // corrected / polished english version
  accomplishments?: string | null
  went_wrong?: string | null
  improve_tomorrow?: string | null
  created_at?: string
  updated_at?: string
}

export type GoalStatus = 'active' | 'completed' | 'paused'

export interface Goal {
  id: string
  user_id: string
  title: string
  description?: string | null
  category: HabitCategory
  target_date?: string | null // YYYY-MM-DD
  progress: number // 0-100
  status: GoalStatus
  created_at: string
  updated_at: string
}

export interface JournalEntry {
  id: string
  user_id: string
  entry_date: string // YYYY-MM-DD
  title: string
  content: string
  mood?: number | null // 1-5
  created_at: string
  updated_at: string
}

export interface Expense {
  id: string
  user_id: string
  amount: number
  category: string
  description?: string | null
  expense_date: string // YYYY-MM-DD
  created_at: string
}

export interface Income {
  id: string
  user_id: string
  amount: number
  source: string
  income_date: string // YYYY-MM-DD
  created_at: string
}

export type JobApplicationStatus =
  | 'saved'
  | 'applied'
  | 'screening'
  | 'interview'
  | 'technical'
  | 'offer'
  | 'rejected'
  | 'withdrawn'

export interface JobApplication {
  id: string
  user_id: string
  company: string
  role: string
  location?: string | null
  salary?: string | null
  job_url?: string | null
  status: JobApplicationStatus
  applied_date: string // YYYY-MM-DD
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface FitnessLog {
  id: string
  user_id: string
  date: string // YYYY-MM-DD
  workout_completed: boolean
  workout_type?: string | null
  duration_minutes: number
  notes?: string | null
  weight?: number | null
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  email: string
}

export interface PlannedTask {
  id: string
  user_id: string
  date: string // YYYY-MM-DD
  title: string
  category: string
  start_time: string // e.g. "10:00"
  end_time: string   // e.g. "10:30"
  completed: boolean
  summary?: string | null
  created_at?: string
  updated_at?: string
}
