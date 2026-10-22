import { supabase } from './supabase'
import { canQuerySupabase, getLocalData, setLocalData } from './storage'
import { getTodayString } from './dateUtils'
import type { Profile } from '../types'

export const repository = {
  async getProfile(userId: string): Promise<Profile | null> {
    if (await canQuerySupabase(userId)) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      if (error) throw error
      return data
    }

    const profiles = getLocalData<Record<string, Profile>>('profiles', {})
    return profiles[userId] || null
  },

  async upsertProfile(
    profile: Partial<Profile> & { id: string },
  ): Promise<Profile> {
    const now = new Date().toISOString()
    const existing = await repository.getProfile(profile.id)
    profile = { ...existing, ...profile }
    const fullProfile: Profile = {
      id: profile.id,
      full_name: profile.full_name || 'Member',
      avatar_url: profile.avatar_url || null,
      timezone:
        profile.timezone ||
        Intl.DateTimeFormat().resolvedOptions().timeZone ||
        'UTC',
      transformation_start_date:
        profile.transformation_start_date || getTodayString(),
      transformation_target_date:
        profile.transformation_target_date ||
        new Date(Date.now() + 1095 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
      onboarding_completed: profile.onboarding_completed ?? false,
      updated_at: now,
    }

    if (await canQuerySupabase(profile.id)) {
      const { data, error } = await supabase
        .from('profiles')
        .upsert(fullProfile)
        .select()
        .single()
      if (error) throw error
      if (data) return data
      throw new Error('The server returned no saved record.')
    }

    const profiles = getLocalData<Record<string, Profile>>('profiles', {})
    profiles[profile.id] = { ...(profiles[profile.id] || {}), ...fullProfile }
    setLocalData('profiles', profiles)
    return profiles[profile.id]
  },

}
