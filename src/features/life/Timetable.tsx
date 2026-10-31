import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Plus, CalendarClock } from 'lucide-react'
import type { ReactNode } from 'react'
import type { PlannedTask } from '../../types'
import { dateKey, timeLabel } from './helpers'
import { availableGaps, clockMinutes, dayIntervals, minuteClock, planConflicts, sortPlans } from './plans'
import { durationLabel, planStatus } from './progress'

export function Timetable({ rows, date, busy, onAdd, renderPlan }: {
  rows: PlannedTask[]; date: string; busy: boolean;
  onAdd: (start?: string, end?: string) => void
  renderPlan: (task: PlannedTask, conflict: boolean, now: boolean) => ReactNode
}) {
  const [showGaps, setShowGaps] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const section = useRef<HTMLElement>(null)
  const location = useLocation()
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(timer)
  }, [])
  useEffect(() => {
    if (location.hash === '#timetable') section.current?.scrollIntoView({ block: 'start' })
  }, [location.key, location.hash])
  const timed = sortPlans(rows.filter(task => task.date === date && clockMinutes(task.start_time) != null))
  const carryover = dayIntervals(rows, date).filter(interval => interval.carryover)
  const conflicts = planConflicts(rows, date)
  const currentMinute = now.getHours() * 60 + now.getMinutes()
  const gaps = showGaps ? availableGaps(rows, date) : []
  const entries = [
    ...timed.map(task => ({ time: clockMinutes(task.start_time)!, key: task.id, task, gap: null })),
    ...gaps.map(gap => ({ time: gap.start, key: 'gap-' + gap.start, task: null, gap })),
  ].sort((a, b) => a.time - b.time)
  return (
    <section ref={section} id="timetable" className="planner-agenda timetable-anchor" aria-label="Daily agenda">
      <div className="planner-section-heading"><div><h2>Your schedule</h2><p>{timed.length} timed {timed.length === 1 ? 'plan' : 'plans'} · each task appears once</p></div><label className="planner-gap-toggle"><input type="checkbox" checked={showGaps} onChange={event => setShowGaps(event.target.checked)} />Show free time</label></div>
      {showGaps && <p className="planner-hint">Free time is shown from 8 AM to 10 PM. Plans outside these hours stay visible; reminders without an end time do not reserve a block.</p>}
      {carryover.map(({task, end}) => <div className="planner-carryover" key={task.id}><CalendarClock size={17} /><span><strong>{task.title}</strong>From the previous day · until {timeLabel(minuteClock(end))}</span><Link className="text-link" to={'/plans?date=' + task.date}>View plan</Link></div>)}
      {!timed.length && !showGaps && <div className="planner-empty"><CalendarClock size={28} /><h3>Make a little room for your day</h3><p>Add a timed plan, or keep tasks in “Any time” until you’re ready to schedule them.</p><button className="btn secondary" disabled={busy} onClick={() => onAdd('09:00', '10:00')}><Plus size={15} /> Schedule a task</button></div>}
      <div className="planner-timeline">
        {entries.map(({key,task,gap,time}) => <div className={'planner-time-row' + (gap ? ' is-gap' : '')} key={key}>
          <div className="planner-time-label"><time>{timeLabel(minuteClock(time))}</time><span className="planner-time-dot" /></div>
          {task ? renderPlan(task, conflicts.has(task.id), date === dateKey(now) && planStatus(task) === 'planned' && time <= currentMinute && (task.ends_next_day || (clockMinutes(task.end_time) ?? time + 1) > currentMinute)) : gap && <button className="planner-free-slot" disabled={busy} onClick={() => onAdd(minuteClock(gap.start), minuteClock(Math.min(gap.start + 60, gap.end)))}><Plus size={14} /><span>{durationLabel(gap.end - gap.start)} available <small>until {timeLabel(minuteClock(gap.end))}</small></span><span>Plan here</span></button>}
        </div>)}
      </div>
    </section>
  )
}
