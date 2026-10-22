import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, X, Loader2, AlertCircle } from 'lucide-react'
import { dateKey, dayLabel, shiftDay } from './helpers'

export function useToday() {
  const [today, setToday] = useState(dateKey)
  useEffect(() => {
    const update = () => setToday(dateKey())
    const timer = setInterval(update, 30000)
    window.addEventListener('focus', update)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', update)
    }
  }, [])
  return today
}
export function useDay() {
  const [params, setParams] = useSearchParams()
  const today = useToday()
  const requested = params.get('date') || ''
  const valid =
    /^\d{4}-\d{2}-\d{2}$/.test(requested) &&
    dateKey(new Date(requested + 'T12:00:00')) === requested
  const date = valid ? requested : today
  return {
    date,
    today,
    setDate: (value: string) =>
      setParams(value === today ? {} : { date: value }),
  }
}
export function DayPicker({
  date,
  today,
  onChange,
}: {
  date: string
  today: string
  onChange: (date: string) => void
}) {
  return (
    <div className="day-picker">
      <button
        className="icon-btn"
        aria-label="Previous day"
        onClick={() => onChange(shiftDay(date, -1))}
      >
        <ArrowLeft size={16} />
      </button>
      <input
        aria-label="Selected date"
        type="date"
        value={date}
        onChange={(e) => e.target.value && onChange(e.target.value)}
      />
      <button
        className="icon-btn"
        aria-label="Next day"
        onClick={() => onChange(shiftDay(date, 1))}
      >
        <ArrowRight size={16} />
      </button>
      <button
        className={date === today ? 'chip active' : 'chip'}
        onClick={() => onChange(today)}
      >
        Today
      </button>
      <button
        className={date === shiftDay(today, 1) ? 'chip active' : 'chip'}
        onClick={() => onChange(shiftDay(today, 1))}
      >
        Tomorrow
      </button>
    </div>
  )
}
export function PageIntro({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  children?: ReactNode
}) {
  return (
    <header className="page-intro">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </header>
  )
}
export function Panel({
  title,
  subtitle,
  action,
  children,
  className = '',
}: {
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={'panel ' + className}>
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty-note">{children}</div>
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: ReactNode
  hint?: string
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  )
}
export function Dialog({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const node = ref.current
    node?.showModal()
    const prior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      node?.close()
      document.body.style.overflow = prior
    }
  }, [])
  return (
    <dialog
      ref={ref}
      className="life-dialog"
      aria-labelledby={titleId}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="dialog-inner">
        <div className="panel-heading">
          <h2 id={titleId}>{title}</h2>
          <button className="icon-btn" aria-label="Close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  )
}
export function Form({
  children,
  onSubmit,
  busy,
  submit = 'Save',
  onCancel,
}: {
  children: ReactNode
  onSubmit: (data: FormData) => Promise<unknown>
  busy?: boolean
  submit?: string
  onCancel?: () => void
}) {
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  async function handle(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (working || busy) return
    const data = new FormData(e.currentTarget)
    setWorking(true)
    setError('')
    setSaved(false)
    try {
      await onSubmit(data)
      setSaved(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save. Try again.')
    } finally {
      setWorking(false)
    }
  }
  return (
    <form className="form-stack" onSubmit={handle}>
      {children}
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
      <div className="form-actions">
        {saved && (
          <span role="status" className="muted">
            Saved
          </span>
        )}
        {onCancel && (
          <button type="button" className="btn secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button className="btn" disabled={busy || working} type="submit">
          {(busy || working) && <Loader2 size={16} className="animate-spin" />}
          {busy || working ? 'Saving…' : submit}
        </button>
      </div>
    </form>
  )
}
export function DataNotice({
  queries,
}: {
  queries: { isLoading: boolean; error: Error | null; refetch: () => unknown }[]
}) {
  const errors = queries.filter((q) => q.error)
  if (errors.length)
    return (
      <div className="data-notice" role="alert">
        <AlertCircle size={18} />
        <div>
          <strong>Some records could not load.</strong>
          <p>{errors[0].error?.message}</p>
        </div>
        <button
          className="btn secondary"
          onClick={() => errors.forEach((q) => q.refetch())}
        >
          Retry
        </button>
      </div>
    )
  if (queries.some((q) => q.isLoading))
    return (
      <p className="muted" role="status">
        Loading your records…
      </p>
    )
  return null
}
export const textValue = (data: FormData, key: string) =>
  String(data.get(key) || '').trim()
export const numberValue = (data: FormData, key: string) =>
  Number(data.get(key) || 0)
export const ignoreHandled = (promise: Promise<unknown>) => {
  void promise.catch(() => {})
}
export { dayLabel }
