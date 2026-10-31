import { supabase } from '../../lib/supabase'
import { canQuerySupabase, getLocalData, setLocalData } from '../../lib/storage'
import { validateAccount, validateTransaction, validateBudget } from './money'
import type {
  DailyLog,
  DailyActivity,
  EnglishSession,
  FitnessLog,
  Habit,
  HabitLog,
  JobApplication,
  JobSearchResource,
  MealPlan,
  PlannedTask,
  WorkoutRoutine,
  WorkProject,
  WorkTask,
  MoneyAccount,
  MoneyTransaction,
  MoneyBudget,
} from '../../types'

export class SchemaUpdateRequired extends Error {
  constructor(table?: string) {
    super(
      table?.startsWith('money_')
        ? 'Money setup needed: run supabase/migrations/20261030_money.sql in your Supabase SQL Editor, then click Retry. Existing records are preserved.'
        : table === 'work_projects' || table === 'work_tasks'
        ? 'Works setup needed: run supabase/migrations/20261028_works.sql in your Supabase SQL Editor, then click Retry. Existing records are preserved.'
        : table === 'job_search_resources'
          ? 'Search toolkit setup needed: run supabase/migrations/20261024_job_search_resources.sql in your Supabase SQL Editor, then click Retry. Your applications are still available.'
          : [
                'daily_activity',
                'daily_plans',
                'habit_logs',
                'meal_plans',
              ].includes(table || '')
            ? 'Progress update needed: run supabase/migrations/20261027_dashboard_plans.sql in your Supabase SQL Editor, then retry. Existing entries are preserved.'
            : table === 'habits'
              ? 'Habit update needed: run supabase/migrations/20261027_habit_counts.sql in your Supabase SQL Editor, then retry. Existing habits and logs are preserved.'
              : 'Database update needed: run supabase/migrations/20261021_focus_cleanup.sql in your Supabase SQL editor, then click Retry.',
    )
    this.name = 'SchemaUpdateRequired'
  }
}

export interface Records {
  money_accounts: MoneyAccount
  money_transactions: MoneyTransaction
  money_budgets: MoneyBudget
  work_projects: WorkProject
  work_tasks: WorkTask
  daily_activity: DailyActivity
  daily_logs: DailyLog
  daily_plans: PlannedTask
  habits: Habit
  habit_logs: HabitLog
  fitness_logs: FitnessLog
  job_applications: JobApplication
  job_search_resources: JobSearchResource
  english_sessions: EnglishSession
  meal_plans: MealPlan
  workout_routines: WorkoutRoutine
}
export type Table = keyof Records
const keys: Record<Table, string> = {
  money_accounts: 'money_accounts_',
  money_transactions: 'money_transactions_',
  money_budgets: 'money_budgets_',
  work_projects: 'work_projects_',
  work_tasks: 'work_tasks_',
  daily_activity: 'activity_',
  daily_logs: 'daily_logs_',
  daily_plans: 'plans_',
  habits: 'habits_',
  habit_logs: 'habit_logs_',
  fitness_logs: 'fitness_',
  job_applications: 'jobs_',
  job_search_resources: 'job_resources_',
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
      if (['42P01', 'PGRST205', '42703', 'PGRST204'].includes(error.code))
        throw new SchemaUpdateRequired(table)
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
  if (table.startsWith('money_')) {
    const existing = input.id ? (await listRecords(table, userId)).find(r => r.id === input.id) : undefined
    if (input.id && !existing) throw new Error('This record no longer exists. Refresh and try again.')
    input = { ...existing, ...input }
    if (table === 'money_accounts') validateAccount(input as unknown as MoneyAccount, existing as MoneyAccount | undefined, await listRecords('money_transactions', userId))
    if (table === 'money_transactions') validateTransaction(input as unknown as MoneyTransaction, await listRecords('money_accounts', userId), existing as MoneyTransaction | undefined)
    if (table === 'money_budgets') validateBudget(input as unknown as MoneyBudget)
  }
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
      table === 'money_budgets'
        ? 'user_id,month,currency,category'
        : table === 'daily_logs'
        ? 'user_id,date'
        : table === 'daily_activity'
          ? 'user_id,date,activity_key'
          : table === 'daily_plans' &&
              (input as Partial<PlannedTask>).source_plan_id
            ? 'user_id,date,source_plan_id'
            : table === 'habit_logs'
              ? 'user_id,habit_id,date'
              : table === 'workout_routines'
                ? 'user_id,weekday'
                : 'id'
    // Let Postgres use its id default for new records keyed by date or weekday.
    if (conflict !== 'id' && !input.id)
      delete (row as Record<string, unknown>).id
    const isCopy =
      table === 'daily_plans' &&
      !!(input as Partial<PlannedTask>).source_plan_id &&
      !input.id
    const request = supabase
      .from(table)
      .upsert(row, { onConflict: conflict, ignoreDuplicates: isCopy })
      .select()
    const { data, error } = await (isCopy
      ? request.maybeSingle()
      : request.single())
    if (error) {
      if (
        ['42P01', 'PGRST205', '42703', 'PGRST204', '42P10'].includes(error.code)
      )
        throw new SchemaUpdateRequired(table)
      throw new Error(error.message)
    }
    if (isCopy && !data) {
      const existing = await supabase
        .from(table)
        .select('*')
        .eq('user_id', userId)
        .eq('date', (input as Partial<PlannedTask>).date!)
        .eq('source_plan_id', (input as Partial<PlannedTask>).source_plan_id!)
        .single()
      if (existing.error) throw new Error(existing.error.message)
      return existing.data as Records[K]
    }
    return data as Records[K]
  }
  if (table === 'work_tasks') {
    const projects = await listRecords('work_projects', userId)
    if (!projects.some((p) => p.id === (input as Partial<WorkTask>).project_id))
      throw new Error(
        'Choose a project in your workspace before saving this task.',
      )
  }
  const rows = await listRecords(table, userId)
  const i = rows.findIndex(
    (r) =>
      r.id === row.id ||
      (table === 'money_budgets' &&
        (r as MoneyBudget).month === (input as unknown as MoneyBudget).month &&
        (r as MoneyBudget).currency === (input as unknown as MoneyBudget).currency &&
        (r as MoneyBudget).category === (input as unknown as MoneyBudget).category) ||
      (table === 'daily_activity' &&
        (r as DailyActivity).date === (input as Partial<DailyActivity>).date &&
        (r as DailyActivity).activity_key ===
          (input as Partial<DailyActivity>).activity_key) ||
      (table === 'daily_plans' &&
        !!(input as Partial<PlannedTask>).source_plan_id &&
        (r as PlannedTask).date === (input as Partial<PlannedTask>).date &&
        (r as PlannedTask).source_plan_id ===
          (input as Partial<PlannedTask>).source_plan_id) ||
      (table === 'daily_logs' &&
        (r as DailyLog).date === (input as Partial<DailyLog>).date) ||
      (table === 'habit_logs' &&
        (r as HabitLog).date === (input as Partial<HabitLog>).date &&
        (r as HabitLog).habit_id === (input as Partial<HabitLog>).habit_id) ||
      (table === 'workout_routines' &&
        (r as WorkoutRoutine).weekday ===
          (input as Partial<WorkoutRoutine>).weekday),
  )
  if (input.id && i < 0)
    throw new Error('This record no longer exists. Refresh and try again.')
  if (
    table === 'daily_plans' &&
    (input as Partial<PlannedTask>).source_plan_id &&
    !input.id &&
    i >= 0
  )
    return rows[i]
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
  if (table === 'money_accounts') throw new Error('Archive an account to preserve its transaction history.')
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
