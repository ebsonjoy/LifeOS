import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useRecords } from './data'
import { DataNotice, Panel } from './ui'
import { shiftDay } from './helpers'
import { workStats } from './works'

export function WorkDashboard({ end, days }: { end: string; days: number }) {
  const projects = useRecords('work_projects'),
    tasks = useRecords('work_tasks')
  const start = shiftDay(end, 1 - days)
  const completed = tasks.rows.filter(
    (t) =>
      t.status === 'completed' &&
      t.completed_on &&
      t.completed_on >= start &&
      t.completed_on <= end,
  )
  const rows = Array.from({ length: days }, (_, i) => {
    const date = shiftDay(end, i - days + 1)
    return {
      date,
      label: date.slice(5),
      completed: completed.filter((t) => t.completed_on === date).length,
    }
  })
  const active = projects.rows.filter((p) => p.status === 'active')
  return (
    <Panel
      title="Your work, moving forward"
      subtitle="Completed tasks by their recorded completion date, including archived projects."
    >
      <DataNotice queries={[projects, tasks]} />
      {!projects.isLoading &&
        !tasks.isLoading &&
        !projects.error &&
        !tasks.error && (
          <>
            <p className="muted">
              {completed.length} {completed.length === 1 ? 'task' : 'tasks'}{' '}
              completed in this period · {active.length} active{' '}
              {active.length === 1 ? 'project' : 'projects'} now
            </p>
            <div
              className="chart-box"
              role="img"
              aria-label={`${completed.length} work tasks completed from ${start} to ${end}`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar
                    dataKey="completed"
                    name="Completed tasks"
                    fill="var(--success)"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <details>
              <summary>Exact daily completions</summary>
              {rows.map((r) => (
                <div className="report-time-row" key={r.date}>
                  <span>{r.date}</span>
                  <strong>{r.completed}</strong>
                </div>
              ))}
            </details>
            <p className="muted" style={{ marginTop: 16 }}>
              Reopened tasks leave this chart until completed again. This shows
              current task records, not a history of every status change.
            </p>
            {active.slice(0, 4).map((p) => {
              const stats = workStats(
                tasks.rows.filter((t) => t.project_id === p.id),
                end,
              )
              return (
                <div className="report-time-row" key={p.id}>
                  <Link className="text-link" to={'/works?project=' + p.id}>
                    {p.name}
                  </Link>
                  <span>
                    {stats.completed} / {stats.total} complete now
                  </span>
                </div>
              )
            })}
            <Link className="text-link view-all" to="/works">
              Manage your projects →
            </Link>
          </>
        )}
    </Panel>
  )
}
