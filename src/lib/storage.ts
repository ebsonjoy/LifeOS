import { supabase, isSupabaseConfigured } from './supabase'

export function getLocalData<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem('lifeos_local_' + key)
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    throw new Error(
      'Your saved data could not be read. Export a backup from Settings before making changes.',
    )
  }
}
export function setLocalData<T>(key: string, data: T): void {
  try {
    localStorage.setItem('lifeos_local_' + key, JSON.stringify(data))
  } catch {
    throw new Error(
      'Could not save in this browser. Free some storage and try again.',
    )
  }
}
export async function canQuerySupabase(userId?: string): Promise<boolean> {
  if (!userId) throw new Error('Sign in to access your records.')
  if (!isSupabaseConfigured) return false
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  if (data.session?.user.id !== userId)
    throw new Error('Your session expired. Please sign in again.')
  return true
}
