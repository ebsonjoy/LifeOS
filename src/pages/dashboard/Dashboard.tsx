import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from 'recharts'
import type { ProgressStatus } from '../../types'
import { useRecords } from '../../features/life/data'
import { WorkDashboard } from '../../features/life/WorkDashboard'
import { DataNotice, Panel, PageIntro, useDay } from '../../features/life/ui'
import { shiftDay, workoutSessions } from '../../features/life/helpers'
import {
  completionSeries,
  durationLabel,
  outcomeTotals,
  planStatus,
  sectionAreas,
  timeSeries,
} from '../../features/life/progress'

export function Dashboard() {
  const { date, today, setDate } = useDay(),
    end = date > today ? today : date
  const [days, setDays] = useState(14),
    [view, setView] = useState('plans')
  const plans = useRecords('daily_plans'),
    activity = useRecords('daily_activity'),
    habitLogs = useRecords('habit_logs'),
    english = useRecords('english_sessions'),
    fitness = useRecords('fitness_logs'),
    jobs = useRecords('job_applications'),
    meals = useRecords('meal_plans')
  const queries = [plans, activity, habitLogs, english, fitness, jobs, meals]
  const start = shiftDay(end, 1 - days),
    inRange = (d: string) => d >= start && d <= end
  const outcomes: Record<string, { date: string; status: ProgressStatus }[]> = {
    plans: plans.rows.map((r) => ({ date: r.date, status: planStatus(r) })),
    habits: habitLogs.rows.map((r) => ({
      date: r.date,
      status: r.outcome || 'planned',
    })),
    reviews: activity.rows
      .filter((r) => r.kind === 'section')
      .map((r) => ({ date: r.date, status: r.status })),
    time: activity.rows
      .filter((r) => r.kind === 'time')
      .map((r) => ({ date: r.date, status: r.status })),
    meals: meals.rows.map((r) => ({
      date: r.date,
      status:
        r.status === 'incomplete'
          ? 'incomplete'
          : r.status === 'planned'
            ? 'planned'
            : 'completed',
    })),
  }
  const selected = outcomes[view].filter((r) => inRange(r.date)),
    totals = outcomeTotals(selected)
  const bars = completionSeries(selected, end, days)
  const timeData = timeSeries(activity.rows, end, days)
  const englishRows = english.rows.filter((r) => inRange(r.date))
  const workouts = workoutSessions(fitness.rows.filter((r) => inRange(r.date)))
  const applicationRows = jobs.rows.filter(
    (r) => r.status !== 'saved' && inRange(r.applied_date),
  )
  const activityData = bars.map((day) => ({
    date: day.date,
    label: day.label,
    english: englishRows
      .filter((r) => r.date === day.date)
      .reduce((sum, r) => sum + r.minutes, 0),
    workouts: workouts.filter((session) => session[0].date === day.date).length,
    applications: applicationRows.filter((r) => r.applied_date === day.date)
      .length,
  }))
  const weightData = fitness.rows
    .filter((r) => inRange(r.date) && r.weight != null && r.weight > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => ({ date: r.date, weight: r.weight }))
  const timeRows = activity.rows.filter(
    (r) => r.kind === 'time' && inRange(r.date),
  )
  return (
    <>
      <PageIntro
        eyebrow="YOUR PROGRESS, OVER TIME"
        title="Dashboard"
        description="Honest outcomes and recorded activity. Every graph uses your saved entries."
      >
        <div className="dashboard-filters">
          <label>
            Period
            <select
              aria-label="Dashboard period"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
            </select>
          </label>
          <label>
            Ending
            <input
              aria-label="Dashboard end date"
              type="date"
              max={today}
              value={end}
              onChange={(e) => e.target.value && setDate(e.target.value)}
            />
          </label>
        </div>
      </PageIntro>
      <DataNotice queries={queries} />
      {!queries.some((q) => q.isLoading || q.error) && (
        <>
          <div className="dashboard-summary">
            <Link to="/english">
              <span>ENGLISH PRACTICE</span>
              <strong>
                {durationLabel(englishRows.reduce((s, r) => s + r.minutes, 0))}
              </strong>
              <small>
                Days with sessions:{' '}
                {new Set(englishRows.map((r) => r.date)).size}
              </small>
            </Link>
            <Link to="/fitness">
              <span>GYM SESSIONS</span>
              <strong>{workouts.length}</strong>
              <small>
                Days with workouts:{' '}
                {new Set(workouts.map((r) => r[0].date)).size}
              </small>
            </Link>
            <Link to="/career">
              <span>APPLICATIONS</span>
              <strong>{applicationRows.length}</strong>
              <small>By application date · saved roles excluded</small>
            </Link>
            <Link to="/plans">
              <span>DEEP WORK</span>
              <strong>
                {durationLabel(
                  timeRows
                    .filter((r) => r.activity_key === 'deep_work')
                    .reduce((s, r) => s + (r.actual_minutes || 0), 0),
                )}
              </strong>
              <small>
                Days with time recorded:{' '}
                {
                  timeRows.filter(
                    (r) =>
                      r.activity_key === 'deep_work' &&
                      r.actual_minutes != null,
                  ).length
                }
              </small>
            </Link>
          </div>
          <div className="stack">
            <div className="equal-col dashboard-overview">
              <Panel
                title="Complete, incomplete, and still open"
                subtitle="Choose one kind of record at a time, so the same work isn’t counted twice."
              >
                <div className="skill-tabs dashboard-tabs">
                  {[
                    ['plans', 'Plans'],
                    ['habits', 'Habits'],
                    ['reviews', 'Section reviews'],
                    ['time', 'Time goals'],
                    ['meals', 'Meals'],
                  ].map(([key, label]) => (
                    <button
                      className={'chip ' + (view === key ? 'active' : '')}
                      aria-pressed={view === key}
                      key={key}
                      onClick={() => setView(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="outcome-summary">
                  <span>
                    <b>{totals.completed}</b> complete
                  </span>
                  <span>
                    <b>{totals.incomplete}</b> incomplete
                  </span>
                  <span>
                    <b>{totals.pending}</b> not reviewed
                  </span>
                  <span>
                    <b>{totals.rate == null ? '—' : totals.rate + '%'}</b> of
                    reviewed entries complete
                  </span>
                </div>
                {selected.length ? (
                  <div
                    className="chart-box"
                    role="img"
                    aria-label={`${view}: ${totals.completed} complete, ${totals.incomplete} incomplete, ${totals.pending} not reviewed from ${start} to ${end}`}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={bars}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Legend />
                        <Bar
                          dataKey="completed"
                          name="Complete"
                          stackId="outcomes"
                          fill="var(--success)"
                        />
                        <Bar
                          dataKey="incomplete"
                          name="Incomplete"
                          stackId="outcomes"
                          fill="var(--danger)"
                        />
                        <Bar
                          dataKey="planned"
                          name="Not reviewed"
                          stackId="outcomes"
                          fill="var(--chart-neutral)"
                          radius={[3, 3, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="chart-empty">
                    No {view === 'reviews' ? 'section reviews' : view} recorded
                    in this period yet. Your graph will appear as you log.
                  </div>
                )}
                <p className="report-note">
                  Missing entries are not failures. Completion % includes only
                  complete + incomplete entries. Habit ticks count occurrences;
                  only your explicit day reviews count here. Meal changes count
                  as recorded meals, not adherence to the original menu.
                </p>
                <details className="report-details">
                  <summary>View exact daily counts</summary>
                  <div className="report-table-wrap">
                    <table className="report-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Complete</th>
                          <th>Incomplete</th>
                          <th>Not reviewed</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bars.map((r) => (
                          <tr key={r.date}>
                            <td>{r.date}</td>
                            <td>{r.completed}</td>
                            <td>{r.incomplete}</td>
                            <td>{r.planned}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </Panel>
              <Panel
                title="Your time, day by day"
                subtitle="Actual hours for sleep, deep work, and problem solving. Gaps mean not logged."
              >
                {timeRows.some(
                  (r) =>
                    ['sleep', 'deep_work', 'problem_solving'].includes(
                      r.activity_key,
                    ) && r.actual_minutes != null,
                ) ? (
                  <div
                    className="chart-box"
                    role="img"
                    aria-label="Daily recorded hours for sleep, deep work, and problem solving"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={timeData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} unit="h" />
                        <Tooltip />
                        <Legend />
                        <Line
                          dataKey="sleep"
                          name="Sleep (h)"
                          stroke="var(--chart-purple)"
                          strokeWidth={2}
                          connectNulls={false}
                        />
                        <Line
                          dataKey="deep_work"
                          name="Deep work (h)"
                          stroke="var(--accent)"
                          strokeWidth={2}
                          connectNulls={false}
                        />
                        <Line
                          dataKey="problem_solving"
                          name="Problem solving (h)"
                          stroke="var(--chart-gold)"
                          strokeWidth={2}
                          connectNulls={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="chart-empty">
                    Record actual hours in Plans to start this graph.
                  </div>
                )}
                <details className="report-details">
                  <summary>Time records, including custom activities</summary>
                  <div className="report-table-wrap">
                    <table className="report-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Activity</th>
                          <th>Planned</th>
                          <th>Actual</th>
                          <th>Review</th>
                        </tr>
                      </thead>
                      <tbody>
                        {timeRows
                          .sort((a, b) => b.date.localeCompare(a.date))
                          .map((r) => (
                            <tr key={r.id}>
                              <td>{r.date}</td>
                              <td>{r.name}</td>
                              <td>{durationLabel(r.planned_minutes)}</td>
                              <td>{durationLabel(r.actual_minutes)}</td>
                              <td>
                                {r.status === 'planned'
                                  ? 'Not reviewed'
                                  : r.status}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </Panel>
            </div>
            <div className="equal-col">
              <Panel
                title="English practice"
                subtitle="Recorded session minutes; journal entries have no measured duration."
              >
                <VolumeChart
                  rows={activityData}
                  field="english"
                  name="Minutes"
                  color="var(--accent)"
                />
              </Panel>
              <Panel
                title="Gym & job-search activity"
                subtitle="Workout sessions and applications by their recorded dates."
              >
                <div
                  className="chart-box"
                  role="img"
                  aria-label="Daily workout and job application counts"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={activityData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="workouts" name="Workouts" fill="var(--chart-blue)" />
                      <Bar
                        dataKey="applications"
                        name="Applications"
                        fill="var(--chart-gold)"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
            </div>
            <WorkDashboard end={end} days={days} />
            <Panel
              title="Each area, in perspective"
              subtitle="Daily goal reviews are independent of session counts and time totals."
            >
              <div className="area-progress-grid">
                {sectionAreas.map((area) => {
                  const result = outcomeTotals(
                    activity.rows.filter(
                      (r) => r.activity_key === area.key && inRange(r.date),
                    ),
                  )
                  return (
                    <Link
                      key={area.key}
                      className="area-progress"
                      to={area.path}
                    >
                      <strong>{area.name}</strong>
                      <span>
                        {result.completed} complete · {result.incomplete}{' '}
                        incomplete
                      </span>
                      <small>
                        {result.pending} not reviewed ·{' '}
                        {result.rate == null
                          ? 'No reviewed days yet'
                          : result.rate + '% of reviewed days complete'}
                      </small>
                    </Link>
                  )
                })}
              </div>
            </Panel>
            {!!weightData.length && (
              <Panel
                title="Body-weight history"
                subtitle="Your recorded measurements, without treating weight changes as success or failure."
              >
                <div
                  className="chart-box"
                  role="img"
                  aria-label="Recorded body weight in kilograms"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weightData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis
                        domain={['auto', 'auto']}
                        unit="kg"
                        tick={{ fontSize: 10 }}
                      />
                      <Tooltip />
                      <Line
                        dataKey="weight"
                        name="Weight (kg)"
                        stroke="var(--chart-blue)"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
            )}
          </div>
        </>
      )}
    </>
  )
}
function VolumeChart({
  rows,
  field,
  name,
  color,
}: {
  rows: Record<string, string | number>[]
  field: string
  name: string
  color: string
}) {
  return (
    <div
      className="chart-box"
      role="img"
      aria-label={'Daily recorded ' + name.toLowerCase()}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
          <Tooltip />
          <Bar dataKey={field} name={name} fill={color} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
