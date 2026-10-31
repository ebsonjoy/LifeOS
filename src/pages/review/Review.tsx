import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, BookOpen, Dumbbell, Briefcase, Focus, ArrowRight } from 'lucide-react'
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
import { ReviewSnapshot } from './ReviewSnapshot'
import { ChartTooltip } from '../../features/life/ChartTooltip'
import { ReviewDisclosure } from './ReviewDisclosure'
import { ReviewMoney } from './ReviewMoney'
import { ReviewWorkMetric } from './ReviewWorkMetric'
import '../dashboard/dashboard.css'
import './review.css'
import { shiftDay, workoutSessions } from '../../features/life/helpers'
import {
  completionSeries,
  durationLabel,
  outcomeTotals,
  planStatus,
  sectionAreas,
  timeAreas,
  timeSeries,
} from '../../features/life/progress'

const reportDate = (date: string) => new Date(date + 'T12:00:00').toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'})

export function Review() {
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
  const areaSummaries = [
    {key:'plans',name:'Plans',path:'/plans',rows:outcomes.plans.filter(r => inRange(r.date))},
    {key:'habits',name:'Habits',path:'/habits',rows:outcomes.habits.filter(r => inRange(r.date))},
    ...sectionAreas.map(area => ({...area, rows:activity.rows.filter(r => r.kind === 'section' && r.activity_key === area.key && inRange(r.date))})),
    {key:'time',name:'Time goals',path:'/plans',rows:outcomes.time.filter(r => inRange(r.date))},
    {key:'meals',name:'Meals',path:'/fitness',rows:outcomes.meals.filter(r => inRange(r.date))},
  ]
  return (
    <div className="dashboard-page review-page">
      <PageIntro
        eyebrow="STEP BACK. SEE YOUR PROGRESS."
        title="Review"
        description="Your saved progress in one view. Choose a period, then explore only the details you need."
      >
        <Link className="btn secondary" to="/dashboard">Back to dashboard <ArrowRight size={16} /></Link>
      </PageIntro>
      <div className="dashboard-toolbar">
        <div><span className="dashboard-kicker">REPORTING PERIOD</span><strong>{reportDate(start)} — {reportDate(end)}</strong></div>
        <div className="dashboard-filters">
          <label>
            Period
            <select
              aria-label="Review period"
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
              aria-label="Review end date"
              type="date"
              max={today}
              value={end}
              onChange={(e) => e.target.value && setDate(e.target.value)}
            />
          </label>
        </div>
      </div>
      <DataNotice queries={queries} />
      {!queries.some(q => q.isLoading || q.error) && (
        <>
          <div className="dashboard-section-heading dashboard-period-heading"><div><h2>Your {days}-day snapshot</h2><p>Recorded activity from {reportDate(start)} to {reportDate(end)}.</p></div></div>
          <div className="dashboard-summary">
            <Link to={'/english?date=' + end}>
              <div className="metric-top" aria-hidden="true">
                <BookOpen size={19} /><ArrowUpRight size={16} />
              </div>
              <span>ENGLISH PRACTICE</span>
              <strong>
                {durationLabel(englishRows.reduce((s, r) => s + r.minutes, 0))}
              </strong>
              <small>
                Days with sessions:{' '}
                {new Set(englishRows.map((r) => r.date)).size}
              </small>
            </Link>
            <Link to={'/fitness?date=' + end}>
              <div className="metric-top" aria-hidden="true">
                <Dumbbell size={19} /><ArrowUpRight size={16} />
              </div>
              <span>GYM SESSIONS</span>
              <strong>{workouts.length}</strong>
              <small>
                Days with workouts:{' '}
                {new Set(workouts.map((r) => r[0].date)).size}
              </small>
            </Link>
            <Link to={'/career?date=' + end}>
              <div className="metric-top" aria-hidden="true">
                <Briefcase size={19} /><ArrowUpRight size={16} />
              </div>
              <span>APPLICATIONS</span>
              <strong>{applicationRows.length}</strong>
              <small>By application date · saved roles excluded</small>
            </Link>
            <Link to={'/plans?date=' + end}>
              <div className="metric-top" aria-hidden="true">
                <Focus size={19} /><ArrowUpRight size={16} />
              </div>
              <span>DEEP WORK</span>
              <strong>
                {durationLabel(
                  timeRows.some(r => r.activity_key === 'deep_work' && r.actual_minutes != null)
                    ? timeRows.filter(r => r.activity_key === 'deep_work').reduce((sum, r) => sum + (r.actual_minutes || 0), 0)
                    : null,
                )}
              </strong>
              <small>
                Days with time recorded:{' '}
                {
                  new Set(timeRows.filter(r => r.activity_key === 'deep_work' && r.actual_minutes != null).map(r => r.date)).size
                }
              </small>
            </Link>
            <ReviewWorkMetric start={start} end={end} />
          </div>
          <div className="stack">
            <div className="equal-col review-overview">
              <ReviewSnapshot areas={areaSummaries} date={end} />
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
                      <LineChart data={timeData} margin={{top:12,right:10,bottom:8,left:0}}>
                        <CartesianGrid strokeDasharray="2 5" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={24} tickMargin={12} />
                        <YAxis tick={{ fontSize: 11 }} unit="h" tickLine={false} axisLine={false} width={36} />
                        <Tooltip content={<ChartTooltip />} cursor={{fill:'var(--soft)'}} />
                        <Legend iconType="circle" iconSize={7} wrapperStyle={{fontSize:11,paddingTop:16}} />
                        <Line isAnimationActive={false}
                          dataKey="sleep"
                          name="Sleep (h)"
                          stroke="var(--chart-purple)"
                          strokeWidth={2.5}
                          dot={{r: 2.5, strokeWidth: 0}}
                          activeDot={{r: 5, strokeWidth: 2, stroke: 'var(--surface)'}}
                          connectNulls={false}
                        />
                        <Line isAnimationActive={false}
                          dataKey="deep_work"
                          name="Deep work (h)"
                          stroke="var(--accent)"
                          strokeWidth={2.5}
                          dot={{r: 2.5, strokeWidth: 0}}
                          activeDot={{r: 5, strokeWidth: 2, stroke: 'var(--surface)'}}
                          connectNulls={false}
                        />
                        <Line isAnimationActive={false}
                          dataKey="problem_solving"
                          name="Problem solving (h)"
                          stroke="var(--chart-gold)"
                          strokeWidth={2.5}
                          dot={{r: 2.5, strokeWidth: 0}}
                          activeDot={{r: 5, strokeWidth: 2, stroke: 'var(--surface)'}}
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
                <div className="review-time-totals">{timeAreas.map(area => {
                  const logged = timeRows.filter(row => row.activity_key === area.key && row.actual_minutes != null)
                  return <div key={area.key}><span>{area.name}<small>{new Set(logged.map(row => row.date)).size} days logged</small></span><strong>{durationLabel(logged.length ? logged.reduce((sum,row) => sum + (row.actual_minutes || 0),0) : null)}</strong></div>
                })}</div>
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
            <ReviewDisclosure title="Daily outcomes" description="Plans, habits, goals and meals over time">
              <Panel
                title="Your follow-through"
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
                      <BarChart data={bars} maxBarSize={22} margin={{top:12,right:8,bottom:8,left:0}}>
                        <CartesianGrid strokeDasharray="2 5" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={24} tickMargin={12} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={32} />
                        <Tooltip content={<ChartTooltip />} cursor={{fill:'var(--soft)'}} />
                        <Legend iconType="circle" iconSize={7} wrapperStyle={{fontSize:11,paddingTop:16}} />
                        <Bar isAnimationActive={false}
                          dataKey="completed"
                          name="Complete"
                          stackId="outcomes"
                          fill="var(--review-complete)"
                        />
                        <Bar isAnimationActive={false}
                          dataKey="incomplete"
                          name="Incomplete"
                          stackId="outcomes"
                          fill="var(--review-incomplete)"
                        />
                        <Bar isAnimationActive={false}
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
            </ReviewDisclosure>
            <ReviewDisclosure title="Activity & health" description="Practice, workouts, applications and body weight">
            <div className="equal-col">
              <Panel
                title="English practice"
                subtitle="Recorded session minutes; journal entries have no measured duration."
              >
                {englishRows.length ? <VolumeChart
                  rows={activityData}
                  field="english"
                  name="Minutes"
                  color="var(--accent)"
                /> : <div className="chart-empty"><span>No English sessions recorded in this period.</span><Link className="text-link" to={'/english?date=' + end}>Log a practice session <ArrowRight size={14} /></Link></div>}
              </Panel>
              <Panel
                title="Gym & job-search activity"
                subtitle="Workout sessions and applications by their recorded dates."
              >
                {workouts.length || applicationRows.length ? <div
                  className="chart-box"
                  role="img"
                  aria-label="Daily workout and job application counts"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={activityData} maxBarSize={16} margin={{top:12,right:8,bottom:8,left:0}}>
                      <CartesianGrid strokeDasharray="2 5" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={24} tickMargin={12} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={32} />
                      <Tooltip content={<ChartTooltip />} cursor={{fill:'var(--soft)'}} />
                      <Legend iconType="circle" iconSize={7} wrapperStyle={{fontSize:11,paddingTop:16}} />
                      <Bar isAnimationActive={false} dataKey="workouts" name="Workouts" fill="var(--chart-blue)" />
                      <Bar isAnimationActive={false}
                        dataKey="applications"
                        name="Applications"
                        fill="var(--chart-gold)"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div> : <div className="chart-empty"><span>No workouts or applications recorded in this period.</span><Link className="text-link" to={'/fitness?date=' + end}>Log a workout <ArrowRight size={14} /></Link><Link className="text-link" to={'/career?date=' + end}>Manage applications <ArrowRight size={14} /></Link></div>}
              </Panel>
            </div>
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
                      <CartesianGrid strokeDasharray="2 5" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={24} tickFormatter={value => String(value).slice(5)} />
                      <YAxis
                        domain={['auto', 'auto']}
                        unit="kg"
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        width={48}
                      />
                      <Tooltip content={<ChartTooltip />} cursor={{fill:'var(--soft)'}} />
                      <Line isAnimationActive={false}
                        dataKey="weight"
                        name="Weight (kg)"
                        stroke="var(--chart-blue)"
                        strokeWidth={2.5}
                          dot={{r: 2.5, strokeWidth: 0}}
                          activeDot={{r: 5, strokeWidth: 2, stroke: 'var(--surface)'}}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
            )}
            </ReviewDisclosure>
          </div>
        </>
      )}
      <ReviewDisclosure title="Projects & work" description="Completed tasks and current project health" className="review-work-details">
        <WorkDashboard end={end} days={days} />
      </ReviewDisclosure>
      <ReviewDisclosure title="Money" description="Income, expenses and net cash flow" className="review-work-details">
        <ReviewMoney start={start} end={end} />
      </ReviewDisclosure>
    </div>
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
        <BarChart data={rows} maxBarSize={22} margin={{top:12,right:8,bottom:8,left:0}}>
          <CartesianGrid strokeDasharray="2 5" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={24} tickMargin={12} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={32} />
          <Tooltip content={<ChartTooltip />} cursor={{fill:'var(--soft)'}} />
          <Bar isAnimationActive={false} dataKey={field} name={name} fill={color} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
