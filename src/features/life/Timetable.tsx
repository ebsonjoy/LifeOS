import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import type { PlannedTask } from '../../types'
import { timeLabel } from './helpers'
import { Panel } from './ui'

export function Timetable({
  rows,
  busy,
  future,
  onEdit,
  onToggle,
  onRemove,
}: {
  rows: PlannedTask[]
  busy: boolean
  future: boolean
  onEdit: (task: Partial<PlannedTask>) => void
  onToggle: (task: PlannedTask) => void
  onRemove: (id: string) => void
}) {
  const [showEmpty, setShowEmpty] = useState(true)
  const section = useRef<HTMLElement>(null)
  const location = useLocation()
  useEffect(() => {
    if (location.hash === '#timetable')
      section.current?.scrollIntoView({ block: 'start' })
  }, [location.key, location.hash])
  const timed = rows
    .filter((t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t.start_time))
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
  const hours = [
    ...new Set([
      ...Array.from({ length: 15 }, (_, i) => i + 8),
      ...timed.map((t) => Number(t.start_time.slice(0, 2))),
    ]),
  ].sort((a, b) => a - b)
  const add = (hour = 8) =>
    onEdit({
      category: 'schedule',
      start_time: `${String(hour).padStart(2, '0')}:00`,
      end_time: hour < 23 ? `${String(hour + 1).padStart(2, '0')}:00` : '',
    })
  return (
    <section ref={section} id="timetable" className="timetable-anchor">
      <Panel
        title="Your daily timetable"
        subtitle="Start at 8 AM. Give each plan a little space."
        action={
          <button className="text-link" disabled={busy} onClick={() => add()}>
            <Plus size={14} /> Add plan
          </button>
        }
      >
        <div className="timetable-intro">
          <p className="muted">
            Timed priorities appear here too. Header reminders stay visible
            until you mark a task done or the day ends.
          </p>
          <label>
            <input
              type="checkbox"
              checked={showEmpty}
              onChange={(e) => setShowEmpty(e.target.checked)}
            />{' '}
            Show empty hours
          </label>
        </div>
        {!showEmpty && !timed.length && (
          <p className="muted">No timed plans yet. Add one to begin.</p>
        )}
        <div className="timetable-grid">
          {hours.map((hour) => {
            const entries = timed.filter(
              (t) => Number(t.start_time.slice(0, 2)) === hour,
            )
            const hourTime = `${String(hour).padStart(2, '0')}:00`
            const continuing = timed.filter(
              (t) => t.start_time < hourTime && t.end_time > hourTime,
            )
            if (!showEmpty && !entries.length && !continuing.length) return null
            return (
              <div className="timetable-hour" key={hour}>
                <span className="hour-label">
                  {timeLabel(`${String(hour).padStart(2, '0')}:00`)}
                </span>
                <div className="hour-plans">
                  {continuing.map((t) => (
                    <button
                      className="continuing-plan"
                      key={t.id}
                      onClick={() => onEdit(t)}
                    >
                      {t.completed ? 'Completed' : 'Continues'} · {t.title} ·
                      until {timeLabel(t.end_time)}
                    </button>
                  ))}
                  {entries.map((t) => (
                    <div
                      className={
                        'schedule-entry ' + (t.completed ? 'done' : '')
                      }
                      key={t.id}
                    >
                      <input
                        type="checkbox"
                        aria-label={`Complete scheduled ${t.title}`}
                        checked={t.completed}
                        disabled={busy || future}
                        onChange={() => onToggle(t)}
                      />
                      <button
                        className="schedule-title"
                        onClick={() => onEdit(t)}
                      >
                        <strong>{t.title}</strong>
                        <span>
                          {timeLabel(t.start_time)}
                          {t.end_time && ` – ${timeLabel(t.end_time)}`}
                          {t.category !== 'schedule' ? ' · Priority' : ''}
                        </span>
                        {t.summary && <span>{t.summary}</span>}
                      </button>
                      <button
                        className="icon-btn"
                        aria-label={`Edit scheduled ${t.title}`}
                        onClick={() => onEdit(t)}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        className="icon-btn"
                        aria-label={`Delete scheduled ${t.title}`}
                        onClick={() => onRemove(t.id)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                  {!entries.length && !continuing.length && (
                    <button
                      className="empty-hour"
                      disabled={busy}
                      onClick={() => add(hour)}
                      aria-label={`Add plan at ${timeLabel(`${String(hour).padStart(2, '0')}:00`)}`}
                    >
                      <Plus size={12} /> Plan this time
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Panel>
    </section>
  )
}
