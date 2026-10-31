import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, Dumbbell, Briefcase, Leaf } from 'lucide-react'
import { useRecords } from '../../features/life/data'
import {
  DataNotice,
  DayPicker,
  Empty,
  Panel,
  PageIntro,
  useDay,
} from '../../features/life/ui'
import { shiftDay, workoutSessions } from '../../features/life/helpers'
import {
  durationLabel,
  planStatus,
  sectionAreas,
  timeAreas,
} from '../../features/life/progress'
import { PlanItems } from '../../features/life/PlanItems'
import { habitCount } from '../../features/life/habits'
import { WorkToday } from '../../features/life/WorkToday'

export function Today() {
  const { date, today, setDate } = useDay()
  const plans = useRecords('daily_plans'),
    activity = useRecords('daily_activity'),
    habits = useRecords('habits'),
    logs = useRecords('habit_logs')
  const english = useRecords('english_sessions'),
    fitness = useRecords('fitness_logs'),
    jobs = useRecords('job_applications'),
    daily = useRecords('daily_logs'),
    routines = useRecords('workout_routines')
  const selected = plans.rows
    .filter((r) => r.date === date)
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
  const dueJobs = jobs.rows.filter(
    (r) =>
      !['rejected', 'withdrawn'].includes(r.status) &&
      ((r.follow_up_date && r.follow_up_date <= date) ||
        r.interview_date === date),
  )
  const activeHabits = habits.rows.filter((r) => r.is_active)
  const reviewedHabits = logs.rows.filter(
    (r) =>
      r.date === date &&
      activeHabits.some((h) => h.id === r.habit_id) &&
      r.outcome &&
      r.outcome !== 'planned',
  )
  const completed = selected.filter((r) => planStatus(r) === 'completed').length
  const incomplete = selected.filter(
    (r) => planStatus(r) === 'incomplete',
  ).length
  const review = daily.rows.find((r) => r.date === date)
  const weekday = new Date(date + 'T12:00:00').getDay()
  const routine = routines.rows.find((r) => r.weekday === weekday)
  const rest = routine?.is_rest ?? weekday === 0
  const queries = [
    plans,
    activity,
    habits,
    logs,
    english,
    fitness,
    jobs,
    daily,
    routines,
  ]
  return (
    <>
      <PageIntro
        eyebrow="JUST THIS DAY"
        title={date === today ? 'Today' : 'Daily report'}
        description="Your tasks, reminders, and daily progress."
      >
        <DayPicker date={date} today={today} onChange={setDate} />
      </PageIntro>
      <DataNotice queries={queries} />
      {!queries.some((q) => q.isLoading || q.error) && (
        <>
          <div className="two-col today-layout">
            <div className="stack">
              <Panel
                title="What needs doing"
                action={
                  <Link className="text-link" to={'/plans?date=' + date}>
                    Open plans <ArrowRight size={14} />
                  </Link>
                }
              >
                <div className="today-counts" aria-label="Plan summary">
                  <span>
                    <strong>{selected.length - completed - incomplete}</strong>{' '}
                    to review
                  </span>
                  <span>
                    <strong>{completed}</strong> complete
                  </span>
                  <span>
                    <strong>{incomplete}</strong> incomplete
                  </span>
                </div>
                {!selected.length && (
                  <Empty>
                    No plans yet.{' '}
                    <Link className="text-link" to={'/plans?date=' + date}>
                      Choose a few things for this day.
                    </Link>
                  </Empty>
                )}
                <PlanItems
                  rows={selected.filter((r) => planStatus(r) !== 'completed')}
                  today={today}
                />
                {!!completed && (
                  <details className="report-details">
                    <summary>
                      {completed} completed {completed === 1 ? 'plan' : 'plans'}
                    </summary>
                    <PlanItems
                      rows={selected.filter(
                        (r) => planStatus(r) === 'completed',
                      )}
                      today={today}
                    />
                  </details>
                )}
              </Panel>
              <WorkToday date={date} />
            </div>
            <div className="stack">
              <Panel
                title="Your focus areas"
                subtitle="Activity is evidence of effort. Your daily review records whether you finished your goal."
              >
                {sectionAreas.map((area, i) => {
                  const row = activity.rows.find(
                    (r) => r.date === date && r.activity_key === area.key,
                  )
                  const Icon = [BookOpen, Dumbbell, Briefcase][i]
                  const detail =
                    area.key === 'english'
                      ? `${english.rows.filter((r) => r.date === date).reduce((s, r) => s + r.minutes, 0)} minutes logged${review?.journal?.trim() ? ' · journal saved' : ''}`
                      : area.key === 'gym'
                        ? `${workoutSessions(fitness.rows.filter((r) => r.date === date)).length} workouts logged · ${rest ? 'Rest day planned' : routine?.name || 'Gym 18:00–20:00'}`
                        : `${dueJobs.length} follow-ups / interviews need attention`
                  return (
                    <Link
                      className="report-area"
                      to={area.path + '?date=' + date}
                      key={area.key}
                    >
                      <Icon size={20} />
                      <div>
                        <strong>{area.name}</strong>
                        <p>{detail}</p>
                      </div>
                      <span
                        className={'outcome-tag ' + (row?.status || 'planned')}
                      >
                        {row?.status === 'completed'
                          ? 'Complete'
                          : row?.status === 'incomplete'
                            ? 'Incomplete'
                            : 'Not reviewed'}
                      </span>
                      <ArrowRight size={14} />
                    </Link>
                  )
                })}
                <Link className="report-area" to={'/habits?date=' + date}>
                  <Leaf size={20} />
                  <div>
                    <strong>Habits</strong>
                    <p>
                      {reviewedHabits.length} of {activeHabits.length} active
                      habits reviewed ·{' '}
                      {
                        logs.rows.filter(
                          (l) =>
                            l.date === date &&
                            activeHabits.some((h) => h.id === l.habit_id) &&
                            habitCount(l) !== null,
                        ).length
                      }{' '}
                      counts recorded
                    </p>
                  </div>
                  <ArrowRight size={14} />
                </Link>
              </Panel>
              <Panel
                title="Time report"
                subtitle="Actual hours you recorded, not scheduled estimates."
              >
                {timeAreas.map((area) => {
                  const row = activity.rows.find(
                    (r) => r.date === date && r.activity_key === area.key,
                  )
                  return (
                    <div className="report-time-row" key={area.key}>
                      <span>{area.name}</span>
                      <strong>{durationLabel(row?.actual_minutes)}</strong>
                    </div>
                  )
                })}
                <Link className="text-link view-all" to={'/plans?date=' + date}>
                  Record time →
                </Link>
              </Panel>
              {!!dueJobs.length && (
                <Panel title="Job-search reminders">
                  {dueJobs.slice(0, 4).map((job) => (
                    <div className="session-row" key={job.id}>
                      <strong>{job.company}</strong>
                      <p>
                        {job.role} ·{' '}
                        {job.interview_date === date
                          ? 'Interview'
                          : 'Follow up'}
                      </p>
                    </div>
                  ))}
                  <Link className="text-link" to={'/career?date=' + date}>
                    Review applications →
                  </Link>
                </Panel>
              )}
              {(review?.accomplishments || review?.improve_tomorrow) && (
                <Panel title="Your notes">
                  <p className="report-note-text">{review.accomplishments}</p>
                  {review.improve_tomorrow && (
                    <p className="report-note-text">
                      <strong>Next step</strong>
                      <br />
                      {review.improve_tomorrow}
                    </p>
                  )}
                  <Link
                    className="text-link view-all"
                    to={'/plans?date=' + date}
                  >
                    Edit in Plans →
                  </Link>
                </Panel>
              )}
              <Link
                className="btn secondary"
                to={'/plans?date=' + shiftDay(today, 1)}
              >
                Plan tomorrow <ArrowRight size={14} />
              </Link>
              <Link className="text-link" to={'/review?date=' + date}>
                Review your progress →
              </Link>
            </div>
          </div>
        </>
      )}
    </>
  )
}
