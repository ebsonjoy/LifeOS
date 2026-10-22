import type { Session, SupabaseClient } from '@supabase/supabase-js'

// Auth events win over an older startup read. Callbacks remain synchronous;
// profile/database requests belong in a separate React effect.
export function observeSession(
  auth: SupabaseClient['auth'],
  onSession: (session: Session | null) => void,
  onError: (error: unknown) => void,
  timeoutMs = 15000,
) {
  let active = true
  let revision = 0
  const initialRevision = revision
  const timer = setTimeout(() => {
    if (active && revision === initialRevision)
      onError(
        new Error(
          'Session check is taking too long. Check your connection and try again.',
        ),
      )
  }, timeoutMs)
  const {
    data: { subscription },
  } = auth.onAuthStateChange((event, session) => {
    if (!active) return
    // getSession handles initialization errors; don't let a late initial event
    // replace a newer sign-in/sign-out event.
    if (event === 'INITIAL_SESSION') return
    revision++
    clearTimeout(timer)
    onSession(session)
  })
  void auth
    .getSession()
    .then(({ data, error }) => {
      if (!active || revision !== initialRevision) return
      clearTimeout(timer)
      if (error) onError(error)
      else onSession(data.session)
    })
    .catch((error: unknown) => {
      clearTimeout(timer)
      if (active && revision === initialRevision) onError(error)
    })
  return () => {
    active = false
    clearTimeout(timer)
    subscription.unsubscribe()
  }
}

export function requestGuard() {
  let version = 0
  return {
    invalidate: () => {
      version++
    },
    begin: () => {
      const current = ++version
      return () => current === version
    },
  }
}

export function safeReturnPath(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\')
  )
    return '/today'
  const path = value.split(/[?#]/)[0]
  return ['/today', '/english', '/fitness', '/career', '/settings'].includes(
    path,
  )
    ? value
    : '/today'
}

export function parseLocalUser(raw: string | null) {
  if (!raw) return null
  const value: unknown = JSON.parse(raw)
  if (
    !value ||
    typeof value !== 'object' ||
    !('id' in value) ||
    typeof value.id !== 'string' ||
    !value.id ||
    !('email' in value) ||
    typeof value.email !== 'string'
  )
    throw new Error(
      'The saved browser session could not be read. Open your local workspace again.',
    )
  return { id: value.id, email: value.email }
}
