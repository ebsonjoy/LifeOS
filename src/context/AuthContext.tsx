import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react'
import type { ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { repository } from '../lib/repository'
import {
  observeSession,
  parseLocalUser,
  requestGuard,
} from '../lib/authSession'
import type { User, Profile } from '../types'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  sessionError: string | null
  profileError: string | null
  login: (email: string, password: string) => Promise<void>
  register: (
    email: string,
    password: string,
    fullName: string,
  ) => Promise<{ needsConfirmation: boolean }>
  continueLocal: () => void
  retrySession: () => void
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
  updateProfile: (data: Partial<Profile>) => Promise<Profile>
  isConfigured: boolean
}
const AuthContext = createContext<AuthContextType | undefined>(undefined)
const LOCAL_USER_KEY = 'lifeos_auth_user'
const LAST_LOCAL_USER_KEY = 'lifeos_last_local_user'
const message = (e: unknown) =>
  e instanceof Error
    ? e.message
    : 'Could not connect. Check your connection and try again.'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const currentUser = useRef<User | null>(null)
  const profileRequests = useRef(requestGuard())
  const queryClient = useQueryClient()

  const acceptUser = useCallback(
    (next: User | null) => {
      if (currentUser.current?.id !== next?.id) {
        profileRequests.current.invalidate()
        queryClient.clear()
        setProfile(null)
        setProfileError(null)
      }
      currentUser.current = next
      setUser((previous) =>
        previous?.id === next?.id && previous?.email === next?.email
          ? previous
          : next,
      )
      setSessionError(null)
      setLoading(false)
    },
    [queryClient],
  )

  const fetchProfile = useCallback(async (id: string) => {
    const isLatest = profileRequests.current.begin()
    setProfileError(null)
    try {
      let saved = await repository.getProfile(id)
      if (!isLatest() || currentUser.current?.id !== id) return
      if (!saved)
        saved = await repository.upsertProfile({
          id,
          full_name: 'Your space',
          onboarding_completed: true,
        })
      if (isLatest() && currentUser.current?.id === id) setProfile(saved)
    } catch (error) {
      if (isLatest() && currentUser.current?.id === id) {
        setProfileError(message(error))
        setProfile(null)
      }
    }
  }, [])

  useEffect(() => {
    const fail = (error: unknown) => {
      setSessionError(message(error))
      setLoading(false)
    }
    if (isSupabaseConfigured) {
      const stop = observeSession(
        supabase.auth,
        (session) => {
          acceptUser(
            session?.user
              ? { id: session.user.id, email: session.user.email || '' }
              : null,
          )
        },
        fail,
      )
      return () => {
        stop()
        profileRequests.current.invalidate()
      }
    }
    const read = () => {
      try {
        acceptUser(parseLocalUser(localStorage.getItem(LOCAL_USER_KEY)))
      } catch (error) {
        acceptUser(null)
        fail(error)
      }
    }
    read()
    const sync = (event: StorageEvent) => {
      if (
        event.storageArea === localStorage &&
        (event.key === LOCAL_USER_KEY || event.key === null)
      )
        read()
    }
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('storage', sync)
      profileRequests.current.invalidate()
    }
  }, [acceptUser, attempt])

  const userId = user?.id
  useEffect(() => {
    if (userId) void fetchProfile(userId)
    return () => profileRequests.current.invalidate()
  }, [userId, fetchProfile, attempt])

  const login = async (email: string, password: string) => {
    if (!isSupabaseConfigured)
      throw new Error('Use Open local workspace on this browser.')
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (error) throw error
    if (!data.session)
      throw new Error('Sign-in did not create a session. Please try again.')
    // onAuthStateChange is the single source of user/session state.
  }
  const register = async (
    email: string,
    password: string,
    fullName: string,
  ) => {
    if (!isSupabaseConfigured)
      throw new Error('Cloud accounts require a configured Supabase project.')
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim() },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    })
    if (error) throw error
    return { needsConfirmation: !data.session }
  }
  const continueLocal = () => {
    if (isSupabaseConfigured) return
    const saved = parseLocalUser(localStorage.getItem(LAST_LOCAL_USER_KEY)) ||
      parseLocalUser(localStorage.getItem(LOCAL_USER_KEY)) || {
        id: 'dev-user-lifeos',
        email: 'local@lifeos.app',
      }
    localStorage.setItem(LAST_LOCAL_USER_KEY, JSON.stringify(saved))
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(saved))
    acceptUser(saved)
  }
  const logout = async () => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.signOut({ scope: 'local' })
      if (error) throw error
    } else {
      if (currentUser.current)
        localStorage.setItem(
          LAST_LOCAL_USER_KEY,
          JSON.stringify(currentUser.current),
        )
      localStorage.removeItem(LOCAL_USER_KEY)
      acceptUser(null)
    }
  }
  const updateProfile = async (data: Partial<Profile>) => {
    const id = currentUser.current?.id
    if (!id) throw new Error('Sign in first.')
    const isLatest = profileRequests.current.begin()
    const updated = await repository.upsertProfile({ ...data, id })
    if (isLatest() && currentUser.current?.id === id) setProfile(updated)
    return updated
  }
  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        sessionError,
        profileError,
        login,
        register,
        continueLocal,
        retrySession: () => {
          setLoading(true)
          setSessionError(null)
          setAttempt((n) => n + 1)
        },
        logout,
        refreshProfile: async () => {
          if (currentUser.current) await fetchProfile(currentUser.current.id)
        },
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
