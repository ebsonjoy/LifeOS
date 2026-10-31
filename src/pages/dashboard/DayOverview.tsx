import { Link } from 'react-router-dom'
import { ArrowRight, CalendarDays, CheckCheck, Plus } from 'lucide-react'
import type { PlannedTask } from '../../types'
import { dayLabel, timeLabel } from '../../features/life/helpers'
import { plannerSummary, sortPlans } from '../../features/life/plans'
import { durationLabel, planStatus } from '../../features/life/progress'

export function DayOverview({ rows, date, today }: { rows: PlannedTask[]; date: string; today: string }) {
  const summary = plannerSummary(rows, date)
  const pending = sortPlans(rows.filter(task => task.date === date && planStatus(task) === 'planned'))
  const path = '/plans?date=' + date
  return <section className="dashboard-day" aria-labelledby="dashboard-day-title">
    <div className="dashboard-day-summary">
      <span className="dashboard-kicker"><CalendarDays size={15} />{date === today ? 'TODAY AT A GLANCE' : dayLabel(date)}</span>
      <h2 id="dashboard-day-title">{summary.total === 0 ? 'Make room for your day.' : summary.open ? `${summary.open} ${summary.open === 1 ? 'plan' : 'plans'} still to do.` : 'Your day, reviewed.'}</h2>
      <p>{summary.total === 0 ? 'Start with one thing you want to get done. Add a time when you’re ready.' : `${summary.complete} of ${summary.total} plans complete · ${summary.untimed} without a fixed time`}</p>
      <progress value={summary.complete} max={summary.total || 1} aria-label={`${summary.complete} of ${summary.total} plans complete`} />
      <dl><div><dt>Scheduled</dt><dd>{durationLabel(summary.scheduled)}</dd></div><div><dt>Actual task time</dt><dd>{durationLabel(summary.actual)}</dd></div></dl>
      <Link className="btn" to={path}>{summary.total ? 'Open planner' : 'Plan your day'}<ArrowRight size={15} /></Link>
    </div>
    <div className="dashboard-day-agenda">
      <div className="dashboard-section-heading"><h3>{date === today ? 'On your list today' : 'On this day’s list'}</h3><Link className="text-link" to={path}>Manage plans <ArrowRight size={14} /></Link></div>
      {pending.length ? <>
        <ul>{pending.slice(0, 3).map(task => <li key={task.id}><Link to={path + (task.start_time ? '#timetable' : '')}><span className="dashboard-agenda-time">{task.start_time ? timeLabel(task.start_time) : 'Any time'}</span><span className="dashboard-agenda-copy"><strong>{task.title}</strong><small>{task.category}{task.end_time ? ` · until ${timeLabel(task.end_time)}${task.ends_next_day ? ' next day' : ''}` : ''}</small></span><ArrowRight size={15} /></Link></li>)}</ul>
        {pending.length > 3 && <Link className="text-link dashboard-more" to={path}>View all {pending.length} open plans <ArrowRight size={14} /></Link>}
      </> : <div className="dashboard-day-empty">{summary.total ? <CheckCheck size={25} /> : <Plus size={25} />}<strong>{summary.total ? 'No unreviewed plans left.' : 'A clear space to get started.'}</strong><p>{summary.total ? 'Review your day or copy an incomplete task for another attempt in Plans.' : 'Your tasks will appear here once you add them in Plans.'}</p></div>}
    </div>
  </section>
}
