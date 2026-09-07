import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { repository } from '../lib/repository'
import type { User, Profile } from '../types'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  login: (email: string, password?: string) => Promise<void>
  register: (email: string, password?: string, fullName?: string) => Promise<void>
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
  updateProfile: (data: Partial<Profile>) => Promise<Profile>
  isConfigured: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const LOCAL_USER_KEY = 'lifeos_auth_user'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (userId: string, defaultName?: string) => {
    try {
      let p = await repository.getProfile(userId)
      if (!p) {
        // Create initial profile if absent
        p = await repository.upsertProfile({
          id: userId,
          full_name: defaultName || 'Dev',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
          transformation_start_date: new Date().toISOString().split('T')[0],
          transformation_target_date: new Date(Date.now() + 1095 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
          onboarding_completed: false,
        })
      }
      setProfile(p)
    } catch (err) {
      console.error('Failed to load profile', err)
    }
  }, [])

  // Initialize auth state
  useEffect(() => {
    async function initAuth() {
      setLoading(true)
      if (isSupabaseConfigured) {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.user) {
            const u: User = { id: session.user.id, email: session.user.email || '' }
            setUser(u)
            await fetchProfile(u.id, session.user.user_metadata?.full_name)
          } else {
            setUser(null)
            setProfile(null)
          }
        } catch (err) {
          console.error('Supabase getSession error:', err)
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (_event, session) => {
            if (session?.user) {
              const u: User = { id: session.user.id, email: session.user.email || '' }
              setUser(u)
              await fetchProfile(u.id, session.user.user_metadata?.full_name)
            } else {
              setUser(null)
              setProfile(null)
            }
          }
        )

        setLoading(false)
        return () => subscription.unsubscribe()
      } else {
        // Local mode session persistence
        const raw = localStorage.getItem(LOCAL_USER_KEY)
        if (raw) {
          try {
            const parsedUser = JSON.parse(raw) as User
            setUser(parsedUser)
            await fetchProfile(parsedUser.id)
          } catch {
            localStorage.removeItem(LOCAL_USER_KEY)
          }
        } else {
          // Provide default dev user for quick local inspection
          const defaultDevUser: User = { id: 'dev-user-lifeos', email: 'dev@lifeos.app' }
          localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(defaultDevUser))
          setUser(defaultDevUser)
          await fetchProfile(defaultDevUser.id, 'Dev')
        }
        setLoading(false)
      }
    }

    initAuth()
  }, [fetchProfile])

  const login = async (email: string, password?: string) => {
    setLoading(true)
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password: password || 'password123',
        })
        if (error) throw error
        if (data.user) {
          const u: User = { id: data.user.id, email: data.user.email || '' }
          setUser(u)
          await fetchProfile(u.id, data.user.user_metadata?.full_name)
        }
      } else {
        // Local session login
        const existing = localStorage.getItem(LOCAL_USER_KEY)
        let localUser: User
        if (existing) {
          localUser = JSON.parse(existing)
          localUser.email = email
        } else {
          localUser = { id: 'dev-user-lifeos', email }
        }
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(localUser))
        setUser(localUser)
        await fetchProfile(localUser.id)
      }
    } finally {
      setLoading(false)
    }
  }

  const register = async (email: string, password?: string, fullName?: string) => {
    setLoading(true)
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: password || 'password123',
          options: {
            data: { full_name: fullName || 'Dev' },
          },
        })
        if (error) throw error
        if (data.user) {
          const u: User = { id: data.user.id, email: data.user.email || '' }
          setUser(u)
          await fetchProfile(u.id, fullName)
        }
      } else {
        const newId = crypto.randomUUID()
        const newUser: User = { id: newId, email }
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(newUser))
        setUser(newUser)
        const p = await repository.upsertProfile({
          id: newId,
          full_name: fullName || 'Dev',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
          transformation_start_date: new Date().toISOString().split('T')[0],
          transformation_target_date: new Date(Date.now() + 1095 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
          onboarding_completed: false,
        })
        setProfile(p)
      }
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    setLoading(true)
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut()
      } else {
        localStorage.removeItem(LOCAL_USER_KEY)
      }
      setUser(null)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id)
    }
  }

  const updateProfile = async (data: Partial<Profile>): Promise<Profile> => {
    if (!user) throw new Error('Not logged in')
    const updated = await repository.upsertProfile({ ...data, id: user.id })
    setProfile(updated)
    return updated
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        login,
        register,
        logout,
        refreshProfile,
        updateProfile,
        isConfigured: isSupabaseConfigured,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
