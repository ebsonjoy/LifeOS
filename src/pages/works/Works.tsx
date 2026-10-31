import { useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowUpRight,
  FolderKanban,
  Plus,
  Pencil,
  Columns3,
  List,
  ChartNoAxesCombined,
  Search,
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
} from '../../features/life/ui'
import { dayLabel } from '../../features/life/helpers'
import {
  workStats,
  workTaskOutcome,
  workStatusLabels,
  workProjectDates,
  workDate,
  workLink,
  filterWorkTasks,
  projectHealth,
  workColumns,
} from '../../features/life/works'
import { WorkBoard, WorkList } from './WorkTaskViews'
import { ProjectMonitor } from './ProjectMonitor'
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
    [taskFilter, setTaskFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [taskPreview, setTaskPreview] = useState<WorkTask | null>(null)
  const [updateMessage, setUpdateMessage] = useState('')
  const [moving, setMoving] = useState(false)
  const moveLock = useRef(false)
  const view = params.get('view') === 'overview' ? 'overview' : params.get('view') === 'list' ? 'list' : 'board'
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
  const shownTasks = filterWorkTasks(projectTasks, {
    search: taskSearch, status: taskFilter, priority: priorityFilter,
  }, today)
  const readOnly = project?.status === 'archived'
  const taskDisabled = tasks.busy || moving || !!readOnly
  const health = project ? projectHealth(project, projectTasks, today) : null
  const openProject = (id: string) => {
    setTaskFilter('all')
    setTaskSearch('')
    setPriorityFilter('all')
    setUpdateMessage('')
    setParams({ project: id, view: 'board' })
  }
  const createTask = (status: WorkTaskStatus = 'todo') => {
    if (!project || taskDisabled) return
    setTaskEditor({ project_id: project.id, status, priority: 'normal' })
  }
  const openTask = (task: WorkTask) => {
    if (readOnly) setTaskPreview(task)
    else setTaskEditor(task)
  }
  const moveTask = async (task: WorkTask, status: WorkTaskStatus) => {
    if (taskDisabled || moveLock.current || task.status === status || task.project_id !== projectId) return
    moveLock.current = true
    setMoving(true)
    setUpdateMessage('Saving task status…')
    try {
      await tasks.save(workTaskOutcome(task, status, today))
      setUpdateMessage(`${task.title} moved to ${workColumns.find(column => column.status === status)?.label}.`)
    } catch {
      // useRecords displays the save error; keep the existing task in its column.
      setUpdateMessage('Could not move task. Your previous status is unchanged. Try again.')
    } finally {
      moveLock.current = false
      setMoving(false)
    }
  }
  const taskViewProps = {
    tasks: shownTasks, today, disabled: taskDisabled,
    onEdit: openTask, onMove: (task: WorkTask, status: WorkTaskStatus) => { void moveTask(task, status) },
    onCreate: createTask,
  }
  return (
    <>
      <PageIntro
        eyebrow={project ? 'WORKS / PROJECT WORKSPACE' : 'YOUR PROJECTS, IN ONE PLACE'}
        title={project?.name || 'Works'}
        description={project ? 'Plan the work. Follow the progress. Keep the whole project in view.' : 'Create projects, organise tasks, and follow your work from idea to done.'}
      >
        {project ? (
          <button className="btn secondary" disabled={projects.busy} onClick={() => setProjectEditor(project)}><Pencil size={15} /> Project settings</button>
        ) : <button
          className="btn"
          disabled={unavailable || projects.busy}
          onClick={() =>
            setProjectEditor({ status: 'active', start_date: today })
          }
        >
          <Plus size={16} /> Create project
        </button>}
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
                  const cardHealth = projectHealth(p, tasks.rows.filter(t => t.project_id === p.id), today)
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
                      <span className={'project-health ' + cardHealth.tone}>{cardHealth.label}</span>
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
              <div className="project-command-bar">
                <div className="project-context">
                  <span className="project-symbol"><FolderKanban size={22} /></span>
                  <label className="project-switcher">Project
                    <select aria-label="Switch project" value={project.id} onChange={event => openProject(event.target.value)}>
                      {projects.rows.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                  </label>
                  <span className={'project-health ' + health!.tone}>{health!.label}</span>
                </div>
                <div className="project-mini-progress"><span><strong>{stats.completed}</strong> / {stats.total} done</span><progress max={100} value={stats.percent} aria-label="Project task completion" /><strong>{stats.percent}%</strong></div>
              </div>
              <div className="project-view-bar">
                <nav className="project-views" aria-label="Project views">
                  {([{key:'board', label:'Board', Icon:Columns3}, {key:'list', label:'List', Icon:List}, {key:'overview', label:'Overview', Icon:ChartNoAxesCombined}] as const).map(({key,label,Icon}) => (
                    <button key={key} aria-pressed={view === key} className={view === key ? 'selected' : ''} onClick={() => setParams({project:project.id,view:key})}><Icon size={16} />{label}</button>
                  ))}
                </nav>
                <button className="btn" disabled={taskDisabled} onClick={() => createTask()}><Plus size={16} /> Create task</button>
              </div>
              {readOnly && <p className="project-readonly">This project is archived. You can browse every task; restore it in Project settings to make changes.</p>}
              <p className="work-save-status" role="status" aria-live="polite">{updateMessage}</p>
              {view === 'overview' ? (
                <ProjectMonitor project={project} tasks={projectTasks} today={today} onOpenTask={openTask} />
              ) : (
                <section className="project-task-workspace" aria-label="Project tasks">
                  <div className="project-filters">
                    <label className="project-task-search"><Search size={16} aria-hidden="true" /><input aria-label="Search tasks" placeholder="Search tasks, notes, or ID…" value={taskSearch} onChange={event => setTaskSearch(event.target.value)} /></label>
                    <select aria-label="Task filter" value={taskFilter} onChange={event => setTaskFilter(event.target.value)}>
                      <option value="all">All statuses</option><option value="open">Open tasks</option><option value="overdue">Overdue</option>
                      {workColumns.map(({status,label}) => <option key={status} value={status}>{label}</option>)}
                    </select>
                    <select aria-label="Priority filter" value={priorityFilter} onChange={event => setPriorityFilter(event.target.value)}><option value="all">All priorities</option><option value="high">High priority</option><option value="normal">Normal priority</option><option value="low">Low priority</option></select>
                    {(taskSearch || taskFilter !== 'all' || priorityFilter !== 'all') && <button className="text-link" onClick={() => {setTaskSearch('');setTaskFilter('all');setPriorityFilter('all')}}>Clear filters</button>}
                    <span className="project-result-count">{shownTasks.length} of {stats.total} tasks</span>
                  </div>
                  {view === 'board' && <p className="board-help">Drag tasks between columns, or use a task’s status menu. Open a title to see details.</p>}
                  {!shownTasks.length && projectTasks.length > 0 && <div className="project-filter-empty">No tasks match these filters. Clear filters to see the whole project.</div>}
                  {view === 'board' ? <WorkBoard key={project.id} {...taskViewProps} /> : shownTasks.length ? <WorkList {...taskViewProps} /> : !projectTasks.length && <Empty>No tasks yet. Create your first task to start planning.</Empty>}
                </section>
              )}
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
          title={projectEditor.id ? 'Project settings' : 'Create a project'}
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
              await projects.refetch()
              setProjectEditor(null)
              if (!projectEditor.id) openProject(saved.id)
            }}
          >
            <Field label="Project name">
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
      {taskPreview && (
        <Dialog title={taskPreview.title} onClose={() => setTaskPreview(null)}>
          <div className="stack"><span className={'work-badge ' + taskPreview.status}>{workStatusLabels[taskPreview.status]}</span><p className="work-notes">{taskPreview.notes || 'No notes added.'}</p><p className="muted">{taskPreview.priority} priority · {taskPreview.due_date ? 'Due ' + dayLabel(taskPreview.due_date) : 'No deadline'}</p><p className="muted">This project is archived. Restore it to edit this task.</p></div>
        </Dialog>
      )}
      {taskEditor && (
        <Dialog
          title={taskEditor.id ? 'Task details' : 'Create task'}
          onClose={() => setTaskEditor(null)}
        >
          <Form
            busy={tasks.busy}
            submit="Save task"
            onSubmit={async (data) => {
              if (projects.rows.find(item => item.id === taskEditor.project_id)?.status === 'archived') throw new Error('Restore this project before changing tasks.')
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
              setTaskFilter('all')
              setPriorityFilter('all')
              setUpdateMessage(taskEditor.id ? 'Task updated.' : 'Task created.')
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
                  {workColumns.map(({ status, label }) => (
                    <option key={status} value={status}>{label}</option>
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
              Needs attention keeps incomplete work visible for another attempt.
              Marking a task Done records its completion date.
            </p>
          </Form>
        </Dialog>
      )}
    </>
  )
}
