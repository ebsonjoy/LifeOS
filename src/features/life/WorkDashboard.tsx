import { Link } from 'react-router-dom'
import { ArrowRight, FolderKanban } from 'lucide-react'
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
import { DataNotice, Panel, useToday } from './ui'
import { shiftDay } from './helpers'
import { ChartTooltip } from './ChartTooltip'
import { projectHealth, workStats } from './works'

export function WorkDashboard({ end, days }: { end: string; days: number }) {
  const today = useToday()
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
  const activeTasks = tasks.rows.filter(task => active.some(project => project.id === task.project_id))
  const current = workStats(activeTasks, today)
  return (
    <Panel
      title="Your work, moving forward"
      subtitle="Current projects at a glance, with completed work for your selected period."
      action={<Link className="text-link" to="/works">Open Works <ArrowRight size={14} /></Link>}
    >
      <DataNotice queries={[projects, tasks]} />
      {!projects.isLoading &&
        !tasks.isLoading &&
        !projects.error &&
        !tasks.error && (
          <>
            <div className="dashboard-work-metrics">
              <div><span>Completed in period</span><strong>{completed.length}</strong></div>
              <div><span>Active projects now</span><strong>{active.length}</strong></div>
              <div><span>In progress now</span><strong>{current.inProgress}</strong></div>
              <div><span>Overdue tasks now</span><strong>{current.overdue}</strong></div>
            </div>
            <div className="dashboard-work-layout">
            <div>
            <h3 className="dashboard-work-heading">Completed work · last {days} days ending {end}</h3>
            {completed.length ?
            <div
              className="chart-box"
              role="img"
              aria-label={`${completed.length} work tasks completed from ${start} to ${end}`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} maxBarSize={22} margin={{top:12,right:8,bottom:8,left:0}}>
                  <CartesianGrid strokeDasharray="2 5" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={24} tickMargin={12} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={32} />
                  <Tooltip content={<ChartTooltip />} cursor={{fill:'var(--soft)'}} />
                  <Bar isAnimationActive={false}
                    dataKey="completed"
                    name="Completed tasks"
                    fill="var(--accent)"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div> : <div className="chart-empty">No completed work recorded in this period. Finish a task in Works to start this chart.</div>}
            <details className="report-details">
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
            </div>
            <div className="dashboard-project-list">
              <h3 className="dashboard-work-heading">Active projects · current status</h3>
              {active.length ? active.slice(0, 4).map(project => {
                const projectTasks = tasks.rows.filter(task => task.project_id === project.id)
                const stats = workStats(projectTasks, today)
                const health = projectHealth(project, projectTasks, today)
                return <Link className="dashboard-project-row" key={project.id} to={'/works?project=' + project.id}>
                  <div><strong>{project.name}</strong><ArrowRight size={15} /></div>
                  <span className={'dashboard-project-health ' + health.tone}>{health.label}</span>
                  <progress value={stats.completed} max={stats.total || 1} aria-label={`${project.name}: ${stats.completed} of ${stats.total} tasks complete`} />
                  <small>{stats.completed} of {stats.total} complete · {stats.open} open</small>
                </Link>
              }) : <div className="dashboard-day-empty"><FolderKanban size={25} /><strong>No active projects yet.</strong><p>Create a project in Works or resume a paused project to see it here.</p></div>}
              <Link className="text-link view-all" to="/works">{active.length > 4 ? `View all ${active.length} active projects` : 'Manage your projects'} <ArrowRight size={14} /></Link>
            </div>
            </div>
          </>
        )}
    </Panel>
  )
}
