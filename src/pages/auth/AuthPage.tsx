import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  Check,
  Dumbbell,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { Brand } from '../../components/brand/Brand'
import { SessionStatus } from '../../components/auth/SessionStatus'
import { safeReturnPath } from '../../lib/authSession'
import './auth.css'

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const {
    user,
    loading,
    sessionError,
    login,
    register,
    continueLocal,
    isConfigured,
    retrySession,
  } = useAuth()
  const location = useLocation()
  const destination = safeReturnPath(location.state?.from)
  const joining = mode === 'register'
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmation, setConfirmation] = useState(false)
  const pending = useRef(false)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setError('')
    try {
      if (!isConfigured) continueLocal()
      else if (joining) {
        const result = await register(email, password, name)
        setConfirmation(result.needsConfirmation)
      } else await login(email, password)
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Something went wrong. Please try again.',
      )
    } finally {
      pending.current = false
      setBusy(false)
    }
  }
  if (loading) return <SessionStatus />
  if (user) return <Navigate to={destination} replace />
  return (
    <main className="auth-page life">
      <section className="auth-story" aria-label="About LifeOS">
        <Link className="auth-brand-link" to="/login" aria-label="LifeOS home">
          <Brand tagline />
        </Link>
        <div className="auth-story-content">
          <span className="auth-eyebrow">A LITTLE SPACE FOR YOURSELF</span>
          <h1>
            Your life. <br />A little more <br />
            <em>intentional.</em>
          </h1>
          <p>
            Make time for what matters.
            <br />
            Find your rhythm, one day at a time.
          </p>
          <div className="auth-day" aria-hidden="true">
            <div className="auth-day-heading">
              <span>A DAY WITH LIFEOS</span>
              <span>Small steps ↗</span>
            </div>
            <div>
              <span className="auth-day-icon">
                <BookOpen size={18} />
              </span>
              <span>
                <strong>Find your voice</strong>
                <small>A little English, every day</small>
              </span>
              <Check size={16} />
            </div>
            <div>
              <span className="auth-day-icon">
                <Dumbbell size={18} />
              </span>
              <span>
                <strong>Show up for yourself</strong>
                <small>Train, eat well, feel stronger</small>
              </span>
              <Check size={16} />
            </div>
            <div>
              <span className="auth-day-icon">
                <ArrowRight size={18} />
              </span>
              <span>
                <strong>Make your next move</strong>
                <small>A plan for your next opportunity</small>
              </span>
              <span className="auth-day-dot" />
            </div>
          </div>
        </div>
        <p className="auth-story-footer">Your pace. Your progress.</p>
      </section>
      <section
        className="auth-form-side"
        aria-label={joining ? 'Create an account' : 'Sign in'}
      >
        <div className="auth-form-wrap">
          <span className="auth-eyebrow">
            {joining ? 'YOUR NEXT CHAPTER' : 'YOUR PERSONAL SPACE'}
          </span>
          <h2>
            {confirmation
              ? 'Check your inbox.'
              : joining
                ? 'Start with today.'
                : 'Welcome back.'}
          </h2>
          <p className="auth-description">
            {confirmation
              ? `We’ve sent a confirmation link to ${email}. Confirm your email, then come back to sign in.`
              : joining
                ? 'One place for your English, routines, and the things you want to build.'
                : 'A fresh day. A little focus. Pick up where you left off.'}
          </p>
          {sessionError && (
            <div className="auth-message" role="alert">
              {sessionError}
              <button type="button" onClick={retrySession}>
                Retry connection
              </button>
            </div>
          )}
          {confirmation ? (
            <div className="auth-confirmation" role="status">
              <Mail size={28} />
              <p>Your account is waiting for email verification.</p>
              <Link className="btn" to="/login" state={{ from: destination }}>
                Back to sign in <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} aria-busy={busy} className="auth-form">
              {error && (
                <div className="auth-message error" role="alert">
                  {error}
                </div>
              )}
              {isConfigured ? (
                <>
                  {joining && (
                    <label className="auth-field">
                      Your name
                      <input
                        name="name"
                        autoComplete="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="What should we call you?"
                        required
                        maxLength={100}
                        disabled={busy}
                      />
                    </label>
                  )}
                  <label className="auth-field">
                    Email address
                    <input
                      name="email"
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      autoCapitalize="none"
                      spellCheck={false}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      disabled={busy}
                    />
                  </label>
                  <div className="auth-field">
                    <label htmlFor="auth-password">
                      {joining ? 'Create a password' : 'Password'}
                    </label>
                    <div className="auth-password">
                      <input
                        id="auth-password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete={
                          joining ? 'new-password' : 'current-password'
                        }
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={
                          joining
                            ? 'At least 6 characters'
                            : 'Enter your password'
                        }
                        required
                        minLength={joining ? 6 : undefined}
                        disabled={busy}
                      />
                      <button
                        type="button"
                        aria-label={
                          showPassword ? 'Hide password' : 'Show password'
                        }
                        aria-pressed={showPassword}
                        onClick={() => setShowPassword((v) => !v)}
                      >
                        {showPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>
                    {joining && (
                      <small>
                        Use at least 6 characters. A longer, unique password is
                        better.
                      </small>
                    )}
                  </div>
                </>
              ) : (
                <div className="auth-local">
                  <strong>Your local workspace</strong>
                  <p>
                    This copy saves on this browser. Open it to continue your
                    existing entries. Cloud sign-in becomes available when
                    Supabase is configured.
                  </p>
                </div>
              )}
              <button type="submit" className="auth-submit" disabled={busy}>
                {busy ? (
                  <>
                    <Loader2 size={18} className="auth-spinner" />{' '}
                    {joining ? 'Creating your account…' : 'Opening your space…'}
                  </>
                ) : (
                  <>
                    {!isConfigured
                      ? 'Open local workspace'
                      : joining
                        ? 'Create account'
                        : 'Sign in to LifeOS'}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
              {isConfigured && (
                <p className="auth-session-note">
                  <LockKeyhole size={13} /> Stay signed in on this browser until
                  you sign out.
                </p>
              )}
            </form>
          )}
          {isConfigured && !confirmation && (
            <p className="auth-switch">
              {joining ? 'Already have an account?' : 'New here?'}{' '}
              <Link
                to={joining ? '/login' : '/register'}
                state={{ from: destination }}
              >
                {joining ? 'Sign in' : 'Create an account'}{' '}
                <ArrowRight size={13} />
              </Link>
            </p>
          )}
        </div>
        <p className="auth-bottom">
          English · Your day · Gym & food · Your next opportunity
        </p>
      </section>
    </main>
  )
}
