import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react'
import type { ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { repository } from '../lib/repository'
import { getTodayString } from '../lib/dateUtils'
import type { User, Profile } from '../types'
interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  profileError: string | null
  login: (email: string, password?: string) => Promise<void>
  register: (
    email: string,
    password?: string,
    fullName?: string,
  ) => Promise<void>
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
  updateProfile: (data: Partial<Profile>) => Promise<Profile>
  isConfigured: boolean
}
const AuthContext = createContext<AuthContextType | undefined>(undefined)
const LOCAL_USER_KEY = 'lifeos_auth_user'
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [profile, setProfile] = useState<Profile | null>(null),
    [loading, setLoading] = useState(true),
    [profileError, setProfileError] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const fetchProfile = useCallback(async (id: string, name?: string) => {
    try {
      setProfileError(null)
      let p = await repository.getProfile(id)
      if (!p)
        p = await repository.upsertProfile({
          id,
          full_name: name || 'Your space',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          transformation_start_date: getTodayString(),
          transformation_target_date: '2029-10-21',
          onboarding_completed: true,
        })
      setProfile(p)
    } catch (e) {
      setProfileError(
        e instanceof Error ? e.message : 'Could not load your profile.',
      )
      setProfile(null)
    }
  }, [])
  useEffect(() => {
    let alive = true
    if (isSupabaseConfigured) {
      // Keep async database calls outside the auth callback's session lock.
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!alive) return
        if (session?.user) {
          setUser({ id: session.user.id, email: session.user.email || '' })
        } else {
          setUser(null)
          setProfile(null)
        }
        setLoading(false)
      })
      void supabase.auth.getSession().then(({ data, error }) => {
        if (!alive) return
        if (error) setProfileError(error.message)
        setUser(
          data.session?.user
            ? { id: data.session.user.id, email: data.session.user.email || '' }
            : null,
        )
        setLoading(false)
      })
      return () => {
        alive = false
        subscription.unsubscribe()
      }
    }
    try {
      const raw = localStorage.getItem(LOCAL_USER_KEY)
      const u: User = raw
        ? JSON.parse(raw)
        : { id: 'dev-user-lifeos', email: 'local@lifeos.app' }
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(u))
      setUser(u)
    } catch {
      setProfileError(
        'Could not open browser storage. Allow storage and reload.',
      )
    } finally {
      setLoading(false)
    }
    return () => {
      alive = false
    }
  }, [])
  const userId = user?.id
  useEffect(() => {
    if (userId) void fetchProfile(userId)
  }, [userId, fetchProfile])
  const login = async (email: string, password?: string) => {
    if (isSupabaseConfigured) {
      if (!password) throw new Error('Enter your password.')
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      if (data.user)
        setUser({ id: data.user.id, email: data.user.email || email })
    } else {
      const raw = localStorage.getItem(LOCAL_USER_KEY)
      const u: User = raw
        ? { ...JSON.parse(raw), email }
        : { id: 'dev-user-lifeos', email }
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(u))
      setUser(u)
    }
  }
  const register = async (
    email: string,
    password?: string,
    fullName?: string,
  ) => {
    if (isSupabaseConfigured) {
      if (!password) throw new Error('Enter a password.')
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      })
      if (error) throw error
      if (!data.session)
        throw new Error(
          'Account created. Check your email to confirm it, then sign in.',
        )
      setUser({ id: data.session.user.id, email })
    } else {
      const u = { id: crypto.randomUUID(), email }
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(u))
      setUser(u)
      await fetchProfile(u.id, fullName)
    }
  }
  const logout = async () => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } else localStorage.removeItem(LOCAL_USER_KEY)
    setUser(null)
    setProfile(null)
    queryClient.clear()
  }
  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id)
  }
  const updateProfile = async (data: Partial<Profile>) => {
    if (!user) throw new Error('Sign in first.')
    const updated = await repository.upsertProfile({ ...data, id: user.id })
    setProfile(updated)
    return updated
  }
  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        profileError,
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
  const value = useContext(AuthContext)
  if (!value) throw new Error('AuthProvider is missing')
  return value
}
