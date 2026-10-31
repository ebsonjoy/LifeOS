import type { ReactNode } from 'react'
import { CalendarDays, CheckCircle2, Clock3, AlertCircle, ArrowUpRight } from 'lucide-react'
import type { WorkProject, WorkTask } from '../../types'
import { Panel, Empty } from '../../features/life/ui'
import { dateKey, dayLabel, safeLink } from '../../features/life/helpers'
import { projectHealth, workColumns, workStats, sortWorkTasks } from '../../features/life/works'

export function ProjectMonitor({ project, tasks, today, onOpenTask }: {
  project: WorkProject; tasks: WorkTask[]; today: string; onOpenTask: (task: WorkTask) => void
}) {
  const stats = workStats(tasks, today)
  const health = projectHealth(project, tasks, today)
  const deadlines = sortWorkTasks(tasks.filter((task) => task.status !== 'completed' && task.due_date)).slice(0, 5)
  const recent = [...tasks].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 5)
  return (
    <div className="project-monitor">
      <div className="monitor-metrics">
        <div><SquareMetric icon={<CheckCircle2 size={18} />} label="Completion" value={stats.percent + '%'} detail={`${stats.completed} of ${stats.total} tasks done`} /></div>
        <div><SquareMetric icon={<Clock3 size={18} />} label="In progress" value={stats.inProgress} detail="Tasks currently being worked on" /></div>
        <div><SquareMetric icon={<AlertCircle size={18} />} label="Overdue" value={stats.overdue} detail="Open tasks past their due date" /></div>
        <div><SquareMetric icon={<CalendarDays size={18} />} label="Project deadline" value={project.due_date ? dayLabel(project.due_date) : 'Not set'} detail={health.label} /></div>
      </div>
      <div className="equal-col">
        <Panel title="Project progress" subtitle="A live snapshot of every task in this project.">
          <div className="monitor-completion"><strong>{stats.percent}<small>%</small></strong><span>{stats.total ? `${stats.open} tasks left to finish` : 'Create a task to start tracking progress'}</span></div>
          <div className="monitor-distribution" role="img" aria-label={workColumns.map(({status,label}) => `${label}: ${tasks.filter(t => t.status === status).length}`).join(', ')}>
            {workColumns.map(({status}) => <span key={status} className={status} style={{width: `${stats.total ? tasks.filter(t => t.status === status).length / stats.total * 100 : 0}%`}} />)}
          </div>
          <div className="monitor-legend">{workColumns.map(({status,label}) => <div key={status}><span className={'monitor-dot ' + status} />{label}<strong>{tasks.filter(t => t.status === status).length}</strong></div>)}</div>
          <p className="work-small">Completion measures tasks marked Done. Needs attention contains tasks previously marked incomplete.</p>
        </Panel>
        <Panel title="Project brief" subtitle="The goal, dates, and current state.">
          <span className={'project-health ' + health.tone}>{health.label}</span>
          <p className="project-brief-copy">{project.description || 'Add a description in project settings to capture the goal and scope.'}</p>
          <dl className="project-facts"><div><dt>State</dt><dd>{project.status}</dd></div><div><dt>Start date</dt><dd>{project.start_date ? dayLabel(project.start_date) : 'Not set'}</dd></div><div><dt>Deadline</dt><dd>{project.due_date ? dayLabel(project.due_date) : 'Not set'}</dd></div></dl>
          {safeLink(project.url) && <a className="text-link" href={safeLink(project.url)} target="_blank" rel="noopener noreferrer">Open project link <ArrowUpRight size={14} /></a>}
          <p className="work-small">Health reflects recorded deadlines and task statuses, not a delivery forecast.</p>
        </Panel>
        <Panel title="Deadlines to watch" subtitle="Open tasks, earliest due date first.">
          {!deadlines.length && <Empty>No open tasks with deadlines.</Empty>}
          {deadlines.map(task => <button key={task.id} className="monitor-task-row" onClick={() => onOpenTask(task)}><span><strong>{task.title}</strong><small>{task.priority} priority</small></span><span className={task.due_date! < today ? 'work-late' : ''}>{task.due_date! < today ? 'Overdue · ' : ''}{dayLabel(task.due_date!)}</span></button>)}
        </Panel>
        <Panel title="Recently updated" subtitle="Latest saved tasks, including status and note changes.">
          {!recent.length && <Empty>Your task updates will appear here.</Empty>}
          {recent.map(task => <button key={task.id} className="monitor-task-row" onClick={() => onOpenTask(task)}><span><strong>{task.title}</strong><small>Updated {dayLabel(dateKey(new Date(task.updated_at)))}</small></span><span className={'work-badge ' + task.status}>{workColumns.find(c => c.status === task.status)?.label}</span></button>)}
        </Panel>
      </div>
    </div>
  )
}

function SquareMetric({icon, label, value, detail}: {icon: ReactNode; label: string; value: string | number; detail: string}) {
  return <><div className="monitor-metric-label">{icon}<span>{label}</span></div><strong>{value}</strong><p>{detail}</p></>
}
