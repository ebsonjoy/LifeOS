import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowUpRight,
  FolderKanban,
  Plus,
  Pencil,
} from 'lucide-react'
import type { WorkProject, WorkTask, WorkTaskStatus } from '../../types'
import { useRecords } from '../../features/life/data'
import {
  DataNotice,
  Dialog,
  Empty,
  Field,
  Form,
  Panel,
  PageIntro,
  textValue,
  useToday,
  ignoreHandled,
} from '../../features/life/ui'
import { safeLink, dayLabel } from '../../features/life/helpers'
import {
  workStats,
  workTaskOutcome,
  workStatusLabels,
  workProjectDates,
  workDate,
  workLink,
  sortWorkTasks,
} from '../../features/life/works'
import { OutcomeButtons } from '../../features/life/OutcomeButtons'
import './works.css'

export function Works() {
  const projects = useRecords('work_projects'),
    tasks = useRecords('work_tasks'),
    today = useToday()
  const [params, setParams] = useSearchParams()
  const projectId = params.get('project')
  const project = projects.rows.find((p) => p.id === projectId)
  const [projectEditor, setProjectEditor] =
    useState<Partial<WorkProject> | null>(null)
  const [taskEditor, setTaskEditor] = useState<Partial<WorkTask> | null>(null)
  const [search, setSearch] = useState(''),
    [projectFilter, setProjectFilter] = useState('active')
  const [taskSearch, setTaskSearch] = useState(''),
    [taskFilter, setTaskFilter] = useState('open')
  const unavailable =
    projects.isLoading || tasks.isLoading || !!projects.error || !!tasks.error
  const activeIds = new Set(
    projects.rows.filter((p) => p.status === 'active').map((p) => p.id),
  )
  const overall = workStats(
    tasks.rows.filter((t) => activeIds.has(t.project_id)),
    today,
  )
  const projectTasks = tasks.rows.filter((t) => t.project_id === projectId)
  const stats = workStats(projectTasks, today)
  const shownProjects = projects.rows
    .filter(
      (p) =>
        (projectFilter === 'all' || p.status === projectFilter) &&
        (p.name + ' ' + p.description)
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  const shownTasks = sortWorkTasks(
    projectTasks.filter(
      (t) =>
        (taskFilter === 'all' ||
          (taskFilter === 'open'
            ? t.status !== 'completed'
            : taskFilter === 'overdue'
              ? t.status !== 'completed' && !!t.due_date && t.due_date < today
              : t.status === taskFilter)) &&
        (t.title + ' ' + t.notes)
          .toLowerCase()
          .includes(taskSearch.toLowerCase()),
    ),
  )
  const openProject = (id: string) => {
    setTaskFilter('open')
    setTaskSearch('')
    setParams({ project: id })
  }
  return (
    <>
      <PageIntro
        eyebrow="FROM IDEAS TO FINISHED WORK"
        title="Works"
        description="Projects, next steps, and a clear picture of what you’ve finished."
      >
        <button
          className="btn"
          disabled={unavailable || projects.busy}
          onClick={() =>
            setProjectEditor({ status: 'active', start_date: today })
          }
        >
          <Plus size={16} /> New project
        </button>
      </PageIntro>
      <DataNotice queries={[projects, tasks]} />
      {!unavailable && (
        <>
          {!projectId ? (
            <>
              <p className="work-small" style={{ marginBottom: 12 }}>
                A snapshot of your active projects.
              </p>
              <div className="work-metrics" aria-label="Active project summary">
                <div>
                  <span>ACTIVE PROJECTS</span>
                  <strong>{activeIds.size}</strong>
                </div>
                <div>
                  <span>OPEN TASKS</span>
                  <strong>{overall.open}</strong>
                </div>
                <div>
                  <span>COMPLETED TASKS</span>
                  <strong>{overall.completed}</strong>
                </div>
                <div>
                  <span>OVERDUE TASKS</span>
                  <strong className={overall.overdue ? 'work-late' : ''}>
                    {overall.overdue}
                  </strong>
                </div>
              </div>
              <div className="work-toolbar">
                <input
                  aria-label="Search projects"
                  placeholder="Find a project…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <select
                  aria-label="Project filter"
                  value={projectFilter}
                  onChange={(e) => setProjectFilter(e.target.value)}
                >
                  <option value="active">Active projects</option>
                  <option value="paused">Paused projects</option>
                  <option value="archived">Archived projects</option>
                  <option value="all">All projects</option>
                </select>
              </div>
              {!shownProjects.length && (
                <Panel
                  title={
                    projects.rows.length
                      ? 'No matching projects'
                      : 'Your next project starts here.'
                  }
                >
                  <Empty>
                    {projects.rows.length
                      ? 'Try another filter or search.'
                      : 'Add a work or project name, then break it into small tasks. Start with just one next step.'}
                  </Empty>
                </Panel>
              )}
              <div className="work-project-grid">
                {shownProjects.map((p) => {
                  const progress = workStats(
                    tasks.rows.filter((t) => t.project_id === p.id),
                    today,
                  )
                  return (
                    <button
                      className="work-project-card"
                      key={p.id}
                      onClick={() => openProject(p.id)}
                      aria-label={'Open project ' + p.name}
                    >
                      <div className="work-card-top">
                        <FolderKanban size={22} />
                        <span className="work-badge">
                          {p.status === 'active' &&
                          progress.total > 0 &&
                          progress.open === 0
                            ? 'All tasks complete'
                            : p.status}
                        </span>
                      </div>
                      <h2>{p.name}</h2>
                      <p>{p.description || 'One small task at a time.'}</p>
                      <div className="work-progress-label">
                        <span>
                          {progress.completed} / {progress.total} tasks complete
                        </span>
                        <strong>{progress.percent}%</strong>
                      </div>
                      <progress
                        max={100}
                        value={progress.percent}
                        aria-label={p.name + ' task completion'}
                      />
                      <div className="work-card-bottom">
                        <span>
                          {p.due_date
                            ? 'Due ' + dayLabel(p.due_date)
                            : 'No deadline'}
                        </span>
                        {progress.overdue > 0 ? (
                          <span className="work-late">
                            {progress.overdue} overdue
                          </span>
                        ) : (
                          <ArrowUpRight size={16} />
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
          ) : project ? (
            <>
              <button
                className="text-link work-back"
                onClick={() => setParams({})}
              >
                <ArrowLeft size={15} /> All projects
              </button>
              <Panel
                title={project.name}
                subtitle={
                  project.status === 'archived'
                    ? 'Archived · your tasks and history are kept.'
                    : project.status === 'paused'
                      ? 'Paused · ready when you are.'
                      : 'Choose the next small step.'
                }
                action={
                  <button
                    className="text-link"
                    onClick={() => setProjectEditor(project)}
                  >
                    <Pencil size={14} /> Edit project
                  </button>
                }
              >
                <details className="work-project-details">
                  <summary>Project details & dates</summary>
                  {project.description && (
                    <p className="work-notes">{project.description}</p>
                  )}
                  <div className="work-project-dates">
                    <span>
                      Started:{' '}
                      {project.start_date
                        ? dayLabel(project.start_date)
                        : 'Not set'}
                    </span>
                    <span>
                      Deadline:{' '}
                      {project.due_date
                        ? dayLabel(project.due_date)
                        : 'Not set'}
                    </span>
                    {safeLink(project.url) && (
                      <a
                        className="text-link"
                        href={safeLink(project.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Project link <ArrowUpRight size={14} />
                      </a>
                    )}
                  </div>
                </details>
                <div className="work-progress-label">
                  <span>
                    {stats.completed} of {stats.total} tasks complete ·{' '}
                    {stats.inProgress} in progress · {stats.incomplete}{' '}
                    incomplete
                  </span>
                  <strong>{stats.percent}%</strong>
                </div>
                <progress
                  max={100}
                  value={stats.percent}
                  aria-label="Project task completion"
                />
              </Panel>
              <section className="work-task-section" aria-label="Project tasks">
                <div className="panel-heading">
                  <div>
                    <h2>One task at a time</h2>
                    <p>
                      {stats.open} open · {stats.overdue} overdue
                    </p>
                  </div>
                  <button
                    className="btn"
                    disabled={tasks.busy || project.status === 'archived'}
                    onClick={() =>
                      setTaskEditor({
                        project_id: project.id,
                        status: 'todo',
                        priority: 'normal',
                      })
                    }
                  >
                    <Plus size={15} /> Add task
                  </button>
                </div>
                <div className="work-toolbar">
                  <input
                    aria-label="Search tasks"
                    placeholder="Find a task or note…"
                    value={taskSearch}
                    onChange={(e) => setTaskSearch(e.target.value)}
                  />
                  <select
                    aria-label="Task filter"
                    value={taskFilter}
                    onChange={(e) => setTaskFilter(e.target.value)}
                  >
                    <option value="open">Open tasks</option>
                    <option value="all">All tasks</option>
                    <option value="todo">To do</option>
                    <option value="in_progress">In progress</option>
                    <option value="completed">Completed</option>
                    <option value="incomplete">Incomplete</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
                {!shownTasks.length && (
                  <Empty>
                    {projectTasks.length
                      ? 'No tasks in this view. Choose All tasks to see the full list.'
                      : 'Add your first task. A clear, small action makes it easier to start.'}
                  </Empty>
                )}
                <div className="work-task-list">
                  {shownTasks.map((t) => (
                    <article
                      className="work-task"
                      key={t.id}
                      aria-label={t.title}
                    >
                      <div className="work-task-heading">
                        <div>
                          <div className="work-task-tags">
                            <span className={'work-badge ' + t.status}>
                              {workStatusLabels[t.status]}
                            </span>
                            <span className={'work-priority ' + t.priority}>
                              {t.priority} priority
                            </span>
                          </div>
                          <h3>{t.title}</h3>
                        </div>
                        <button
                          className="icon-btn"
                          aria-label={'Edit task ' + t.title}
                          disabled={tasks.busy || project.status === 'archived'}
                          onClick={() => setTaskEditor(t)}
                        >
                          <Pencil size={16} />
                        </button>
                      </div>
                      <div className="work-task-dates">
                        <span
                          className={
                            t.status !== 'completed' &&
                            t.due_date &&
                            t.due_date < today
                              ? 'work-late'
                              : ''
                          }
                        >
                          {t.due_date
                            ? (t.status !== 'completed' && t.due_date < today
                                ? 'Overdue · '
                                : 'Due ') + dayLabel(t.due_date)
                            : 'No deadline'}
                        </span>
                        {t.completed_on && (
                          <span>Completed {dayLabel(t.completed_on)}</span>
                        )}
                      </div>
                      {t.notes && (
                        <details className="work-task-notes">
                          <summary>Notes & next steps</summary>
                          <p className="work-notes">{t.notes}</p>
                        </details>
                      )}
                      <div className="work-task-actions">
                        <OutcomeButtons
                          label={t.title}
                          value={
                            t.status === 'completed' ||
                            t.status === 'incomplete'
                              ? t.status
                              : 'planned'
                          }
                          disabled={tasks.busy || project.status === 'archived'}
                          onChange={(status) =>
                            ignoreHandled(
                              tasks.save(
                                workTaskOutcome(
                                  t,
                                  status === 'planned' ? 'todo' : status,
                                  today,
                                ),
                              ),
                            )
                          }
                        />
                        {t.status !== 'completed' && (
                          <button
                            className="text-link"
                            disabled={
                              tasks.busy || project.status === 'archived'
                            }
                            onClick={() =>
                              ignoreHandled(
                                tasks.save(
                                  workTaskOutcome(
                                    t,
                                    t.status === 'in_progress'
                                      ? 'todo'
                                      : 'in_progress',
                                    today,
                                  ),
                                ),
                              )
                            }
                          >
                            {t.status === 'in_progress'
                              ? 'Mark as To do'
                              : 'Start task'}
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
                {project.status === 'archived' && (
                  <p className="work-small">
                    Restore this project to Active in Edit project to change its
                    tasks.
                  </p>
                )}
              </section>
            </>
          ) : (
            <Panel title="Project unavailable">
              <Empty>This project could not be found in your account.</Empty>
              <Link className="text-link" to="/works">
                Back to all projects
              </Link>
            </Panel>
          )}
        </>
      )}
      {projectEditor && (
        <Dialog
          title={projectEditor.id ? 'Edit project' : 'A new project'}
          onClose={() => setProjectEditor(null)}
        >
          <Form
            busy={projects.busy}
            submit="Save project"
            onSubmit={async (data) => {
              const name = textValue(data, 'name')
              if (!name) throw new Error('Give your project a name.')
              const saved = await projects.save({
                ...projectEditor,
                name,
                description: textValue(data, 'description'),
                status: textValue(data, 'status') as WorkProject['status'],
                ...workProjectDates(
                  textValue(data, 'start_date'),
                  textValue(data, 'due_date'),
                ),
                url: workLink(textValue(data, 'url')),
              })
              setProjectEditor(null)
              openProject(saved.id)
            }}
          >
            <Field label="Project / work name">
              <input
                name="name"
                required
                maxLength={120}
                autoFocus
                defaultValue={projectEditor.name || ''}
                placeholder="For example, personal website"
              />
            </Field>
            <Field label="What are you building or working toward?">
              <textarea
                name="description"
                rows={3}
                defaultValue={projectEditor.description || ''}
              />
            </Field>
            <div className="form-grid">
              <Field label="Start date">
                <input
                  type="date"
                  name="start_date"
                  defaultValue={projectEditor.start_date || ''}
                />
              </Field>
              <Field label="Deadline (optional)">
                <input
                  type="date"
                  name="due_date"
                  defaultValue={projectEditor.due_date || ''}
                />
              </Field>
            </div>
            <Field label="Project link (optional)">
              <input
                name="url"
                type="url"
                placeholder="https://…"
                defaultValue={projectEditor.url || ''}
              />
            </Field>
            <Field label="Project state">
              <select
                name="status"
                defaultValue={projectEditor.status || 'active'}
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="archived">Archived</option>
              </select>
            </Field>
            <p className="muted">
              Pause or archive to keep your task history. You can restore a
              project any time.
            </p>
          </Form>
        </Dialog>
      )}
      {taskEditor && (
        <Dialog
          title={taskEditor.id ? 'Edit task' : 'Your next small step'}
          onClose={() => setTaskEditor(null)}
        >
          <Form
            busy={tasks.busy}
            submit="Save task"
            onSubmit={async (data) => {
              const title = textValue(data, 'title')
              if (!title) throw new Error('Give your task a clear title.')
              const status = textValue(data, 'status') as WorkTaskStatus
              const next = workTaskOutcome(taskEditor, status, today)
              const completed_on =
                status === 'completed'
                  ? workDate(textValue(data, 'completed_on')) ||
                    next.completed_on
                  : null
              if (completed_on && completed_on > today)
                throw new Error('Completion cannot be in the future.')
              await tasks.save({
                ...next,
                title,
                notes: textValue(data, 'notes'),
                due_date: workDate(textValue(data, 'due_date')),
                priority: textValue(data, 'priority') as WorkTask['priority'],
                completed_on,
              })
              setTaskEditor(null)
              setTaskSearch('')
              if (taskFilter !== 'all' && taskFilter !== 'open')
                setTaskFilter('all')
              if (status === 'completed' && taskFilter === 'open')
                setTaskFilter('completed')
            }}
          >
            <Field label="Task title">
              <input
                name="title"
                required
                maxLength={200}
                autoFocus
                placeholder="For example, build the home page"
                defaultValue={taskEditor.title || ''}
              />
            </Field>
            <div className="form-grid">
              <Field label="Task status">
                <select
                  name="status"
                  defaultValue={taskEditor.status || 'todo'}
                >
                  {Object.entries(workStatusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Priority">
                <select
                  name="priority"
                  defaultValue={taskEditor.priority || 'normal'}
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                </select>
              </Field>
            </div>
            <Field label="Due date (optional)">
              <input
                name="due_date"
                type="date"
                defaultValue={taskEditor.due_date || ''}
              />
            </Field>
            <Field label="Notes, blockers, or next steps">
              <textarea
                name="notes"
                rows={4}
                defaultValue={taskEditor.notes || ''}
              />
            </Field>
            <details>
              <summary>Completion date</summary>
              <Field
                label="Completed on"
                hint="Used only for Complete tasks. Leave blank to use today, or keep the existing completion date."
              >
                <input
                  name="completed_on"
                  type="date"
                  max={today}
                  defaultValue={taskEditor.completed_on || ''}
                />
              </Field>
            </details>
            <p className="muted">
              Incomplete keeps the task visible. You can change its deadline and
              try again.
            </p>
          </Form>
        </Dialog>
      )}
    </>
  )
}
