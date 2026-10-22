import { supabase } from '../../lib/supabase'
import { canQuerySupabase, getLocalData, setLocalData } from '../../lib/storage'
import type {
  DailyLog,
  EnglishSession,
  FitnessLog,
  Habit,
  HabitLog,
  JobApplication,
  MealPlan,
  PlannedTask,
  WorkoutRoutine,
} from '../../types'

export class SchemaUpdateRequired extends Error {
  constructor() { super('Database update needed: run supabase/migrations/20261021_focus_cleanup.sql in your Supabase SQL editor, then click Retry.'); this.name = 'SchemaUpdateRequired' }
}

export interface Records {
  daily_logs: DailyLog
  daily_plans: PlannedTask
  habits: Habit
  habit_logs: HabitLog
  fitness_logs: FitnessLog
  job_applications: JobApplication
  english_sessions: EnglishSession
  meal_plans: MealPlan
  workout_routines: WorkoutRoutine
}
export type Table = keyof Records
const keys: Record<Table, string> = {
  daily_logs: 'daily_logs_',
  daily_plans: 'plans_',
  habits: 'habits_',
  habit_logs: 'habit_logs_',
  fitness_logs: 'fitness_',
  job_applications: 'jobs_',
  english_sessions: 'english_',
  meal_plans: 'meals_',
  workout_routines: 'routines_',
}
export async function listRecords<K extends Table>(
  table: K,
  userId: string,
): Promise<Records[K][]> {
  if (await canQuerySupabase(userId)) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('user_id', userId)
    if (error) {
      if (['42P01', 'PGRST205', '42703', 'PGRST204'].includes(error.code)) throw new SchemaUpdateRequired()
      throw new Error(error.message)
    }
    return data as Records[K][]
  }
  return getLocalData<Records[K][]>(keys[table] + userId, [])
}
export async function saveRecord<K extends Table>(
  table: K,
  userId: string,
  input: Partial<Records[K]> & { id?: string },
): Promise<Records[K]> {
  const now = new Date().toISOString()
  const row = {
    ...input,
    user_id: userId,
    id: input.id || crypto.randomUUID(),
    updated_at: now,
  }
  // habit_logs has no updated_at in the original schema.
  if (table === 'habit_logs') delete (row as Record<string, unknown>).updated_at
  if (await canQuerySupabase(userId)) {
    const conflict =
      table === 'daily_logs'
        ? 'user_id,date'
        : table === 'habit_logs'
          ? 'user_id,habit_id,date'
          : table === 'workout_routines'
            ? 'user_id,weekday'
            : 'id'
    // Let Postgres use its id default for new records keyed by date or weekday.
    if (conflict !== 'id' && !input.id)
      delete (row as Record<string, unknown>).id
    const { data, error } = await supabase
      .from(table)
      .upsert(row, { onConflict: conflict })
      .select()
      .single()
    if (error) {
      if (['42P01', 'PGRST205', '42703', 'PGRST204', '42P10'].includes(error.code)) throw new SchemaUpdateRequired()
      throw new Error(error.message)
    }
    return data as Records[K]
  }
  const rows = await listRecords(table, userId)
  const i = rows.findIndex(
    (r) =>
      r.id === row.id ||
      (table === 'daily_logs' &&
        (r as DailyLog).date === (input as Partial<DailyLog>).date) ||
      (table === 'habit_logs' &&
        (r as HabitLog).date === (input as Partial<HabitLog>).date &&
        (r as HabitLog).habit_id === (input as Partial<HabitLog>).habit_id) ||
      (table === 'workout_routines' &&
        (r as WorkoutRoutine).weekday ===
          (input as Partial<WorkoutRoutine>).weekday),
  )
  if (input.id && i < 0) throw new Error('This record no longer exists. Refresh and try again.')
  const saved = {
    created_at: now,
    ...(i >= 0 ? rows[i] : {}),
    ...row,
    id: i >= 0 ? rows[i].id : row.id,
  } as Records[K]
  if (i >= 0) rows[i] = saved
  else rows.push(saved)
  setLocalData(keys[table] + userId, rows)
  return saved
}
export async function removeRecord(table: Table, userId: string, id: string) {
  if (await canQuerySupabase(userId)) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('user_id', userId)
      .eq('id', id)
    if (error) throw new Error(error.message)
    return
  }
  setLocalData(
    keys[table] + userId,
    (await listRecords(table, userId)).filter((r) => r.id !== id),
  )
}
