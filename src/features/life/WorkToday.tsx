import { Link } from 'react-router-dom'
import { useRecords } from './data'
import { DataNotice, Empty, Panel } from './ui'
import { sortWorkTasks, workStatusLabels } from './works'

export function WorkToday({ date }: { date: string }) {
  const projects = useRecords('work_projects'),
    tasks = useRecords('work_tasks')
  const active = projects.rows.filter((p) => p.status === 'active')
  const due = sortWorkTasks(
    tasks.rows.filter(
      (t) =>
        active.some((p) => p.id === t.project_id) &&
        t.status !== 'completed' &&
        t.due_date &&
        t.due_date <= date,
    ),
  )
  return (
    <Panel
      title="Work that needs attention"
      subtitle="Current open tasks in active projects, due by this date."
    >
      <DataNotice queries={[projects, tasks]} />
      {!projects.isLoading &&
        !tasks.isLoading &&
        !projects.error &&
        !tasks.error && (
          <>
            {!due.length && <Empty>No work tasks due by this date.</Empty>}
            {due.slice(0, 4).map((t) => (
              <div className="session-row" key={t.id}>
                <Link
                  className="text-link"
                  to={'/works?project=' + t.project_id}
                >
                  {t.title}
                </Link>
                <p>
                  {active.find((p) => p.id === t.project_id)?.name} ·{' '}
                  {workStatusLabels[t.status]} · Due {t.due_date}
                </p>
              </div>
            ))}
            {due.length > 4 && (
              <p className="muted">
                {due.length - 4} more tasks need attention.
              </p>
            )}
            <Link className="text-link view-all" to="/works">
              Open Works →
            </Link>
          </>
        )}
    </Panel>
  )
}
