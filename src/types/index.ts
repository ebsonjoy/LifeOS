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
export type ProgressStatus = 'planned' | 'completed' | 'incomplete'

export type MoneyCurrency = 'INR' | 'USD' | 'EUR' | 'GBP'
export interface MoneyAccount {
  id: string; user_id: string; name: string; kind: 'cash' | 'bank' | 'wallet'; currency: MoneyCurrency;
  opening_minor: number; opening_date: string; archived: boolean; created_at: string; updated_at: string
}
export interface MoneyTransaction {
  id: string; user_id: string; account_id: string; to_account_id: string | null;
  kind: 'income' | 'expense' | 'transfer'; amount_minor: number; date: string;
  category: string; description: string; created_at: string; updated_at: string
}
export interface MoneyBudget {
  id: string; user_id: string; month: string; currency: MoneyCurrency; category: string;
  limit_minor: number; created_at: string; updated_at: string
}

export interface WorkProject {
  id: string
  user_id: string
  name: string
  description: string
  status: 'active' | 'paused' | 'archived'
  start_date: string | null
  due_date: string | null
  url: string | null
  created_at: string
  updated_at: string
}
export type WorkTaskStatus = 'todo' | 'in_progress' | 'completed' | 'incomplete'
export interface WorkTask {
  id: string
  user_id: string
  project_id: string
  title: string
  notes: string
  status: WorkTaskStatus
  priority: 'low' | 'normal' | 'high'
  due_date: string | null
  completed_on: string | null
  created_at: string
  updated_at: string
}

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
  habit_type?: 'good' | 'bad'
  period_days?: 1 | 2 | 3 | 7 | null
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
  outcome?: ProgressStatus | null
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
  follow_up_date?: string | null
  interview_date?: string | null
  created_at: string
  updated_at: string
}

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'legs'
  | 'shoulders'
  | 'arms'
  | 'core'
  | 'full_body'
  | 'cardio'

export interface FitnessLog {
  id: string
  user_id: string
  date: string // YYYY-MM-DD
  exercises?: ExerciseSet[]
  workout_completed: boolean
  workout_type?: string | null // e.g. "Push Day", "Strength Training"
  muscle_group?: MuscleGroup | string | null
  exercise_name?: string | null
  weight_lifted?: number | null // in kg
  sets?: number | null
  reps?: number | null
  duration_minutes: number
  notes?: string | null
  weight?: number | null // body weight in kg
  height?: number | null // body height in cm
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
  status?: ProgressStatus | null
  actual_minutes?: number | null
  source_plan_id?: string | null
  ends_next_day?: boolean
  summary?: string | null
  created_at?: string
  updated_at?: string
}


export interface ExerciseSet {
  id: string
  name: string
  sets: number
  reps: number
  weight: number
}
export type EnglishSkill = 'speaking' | 'listening' | 'reading' | 'writing'
export interface EnglishSession {
  id: string
  user_id: string
  date: string
  skill: EnglishSkill
  minutes: number
  topic: string
  writing: string
  correction: string
  vocabulary: string
  created_at: string
  updated_at: string
}
export interface MealPlan {
  id: string
  user_id: string
  date: string
  slot: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'
  meal: string
  status: 'planned' | 'followed' | 'changed' | 'incomplete'
  note: string
  created_at: string
  updated_at: string
}
export interface WorkoutRoutine {
  id: string
  user_id: string
  weekday: number
  name: string
  is_rest: boolean
  start_time: string
  end_time: string
  exercises: ExerciseSet[]
  created_at: string
  updated_at: string
}

export interface JobSearchResource {
  id: string
  user_id: string
  kind: 'keyword' | 'platform' | 'note'
  title: string
  content: string
  url: string | null
  is_pinned: boolean
  created_at: string
  updated_at: string
}

export interface DailyActivity {
  id: string
  user_id: string
  date: string
  activity_key: string
  name: string
  kind: 'section' | 'time'
  status: ProgressStatus
  planned_minutes: number | null
  actual_minutes: number | null
  note: string
  created_at: string
  updated_at: string
}
