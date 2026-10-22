import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Check } from 'lucide-react'
import { useRecords } from '../../features/life/data'
import { dateKey, scheduleAt, timeLabel } from '../../features/life/helpers'
import { ignoreHandled } from '../../features/life/ui'

export function DailyHeader({ children }: { children: ReactNode }) {
  const [now, setNow] = useState(() => new Date())
  const tasks = useRecords('daily_plans', 60000)
  useEffect(() => {
    const tick = () => setNow(new Date())
    const timer = window.setInterval(tick, 1000)
    window.addEventListener('focus', tick)
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', tick)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [])
  const { due, next } = scheduleAt(tasks.rows, now)
  const task = due.at(-1) || next
  const href = `/today?date=${dateKey(now)}#timetable`
  return (
    <header className="life-header">
      <div className="top-bar">
        {children}
        <div
          className="header-clock"
          title={`Device time · ${Intl.DateTimeFormat().resolvedOptions().timeZone}`}
        >
          <time dateTime={now.toISOString()} aria-label="Current local time">
            {now.toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: true,
            })}
          </time>
          <span>
            {now.toLocaleDateString('en-IN', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
            })}
          </span>
        </div>
      </div>
      <div className={'header-reminder ' + (due.length ? 'is-due' : '')}>
        <Bell size={16} aria-hidden="true" />
        <div
          className="reminder-copy"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {tasks.error ? (
            <span>
              Reminders unavailable.{' '}
              <Link to={href}>Open timetable to retry</Link>
            </span>
          ) : tasks.isLoading ? (
            <span>Loading your timetable…</span>
          ) : task ? (
            <>
              <strong>
                {due.length ? 'Time for' : 'Up next'}: {task.title}
              </strong>
              <span>
                {timeLabel(task.start_time)}
                {task.end_time ? ` – ${timeLabel(task.end_time)}` : ''}
                {due.length > 1 ? ` · ${due.length - 1} more due` : ''}
              </span>
            </>
          ) : (
            <span>
              No more timed plans today.{' '}
              <Link to={`/today?date=${dateKey(now)}#timetable`}>
                View your day
              </Link>
            </span>
          )}
        </div>
        {task && !tasks.error && (
          <div className="reminder-actions">
            {due.length > 0 && (
              <button
                className="btn secondary"
                disabled={tasks.busy}
                onClick={() =>
                  ignoreHandled(tasks.save({ ...task, completed: true }))
                }
                aria-label={`Mark ${task.title} done`}
              >
                <Check size={14} /> Done
              </button>
            )}
            <Link className="text-link" to={href}>
              View
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
