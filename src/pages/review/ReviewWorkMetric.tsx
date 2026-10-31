import { Link } from 'react-router-dom'
import { FolderKanban, ArrowUpRight } from 'lucide-react'
import { useRecords } from '../../features/life/data'
import { DataNotice } from '../../features/life/ui'

export function ReviewWorkMetric({ start, end }: { start: string; end: string }) {
  const projects = useRecords('work_projects')
  const tasks = useRecords('work_tasks')
  const completed = tasks.rows.filter(task => task.status === 'completed' && task.completed_on && task.completed_on >= start && task.completed_on <= end).length
  const active = projects.rows.filter(project => project.status === 'active').length
  const ready = !projects.isLoading && !tasks.isLoading && !projects.error && !tasks.error
  return <div className="review-work-metric">
    <Link to="/works"><div className="metric-top" aria-hidden="true"><FolderKanban size={19} /><ArrowUpRight size={16} /></div><span>TASKS COMPLETED</span><strong>{ready ? completed : '—'}</strong><small>{ready ? `${active} active projects now` : projects.isLoading || tasks.isLoading ? 'Loading project data…' : 'Project data unavailable'}</small></Link>
    {!ready && <DataNotice queries={[projects,tasks]} />}
  </div>
}
