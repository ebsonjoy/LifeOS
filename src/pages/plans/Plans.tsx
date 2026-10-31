import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, CalendarDays, ListChecks, Clock3, Copy, Search, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import type { PlannedTask, ProgressStatus } from '../../types'
import { useRecords } from '../../features/life/data'
import { DataNotice, DayPicker, Dialog, Empty, Field, Form, PageIntro, dayLabel, textValue, useDay } from '../../features/life/ui'
import { shiftDay } from '../../features/life/helpers'
import { copyPlanToDate, durationLabel, planOutcome, planStatus } from '../../features/life/progress'
import { clockMinutes, planConflicts, plannerSummary, sortPlans } from '../../features/life/plans'
import { TimeTracking } from '../../features/life/TimeTracking'
import { Timetable } from '../../features/life/Timetable'
import { PreviousPlans } from '../../features/life/PreviousPlans'
import { PlannerTask } from './PlannerTask'
import { PlanEditor } from './PlanEditor'
import { PlanNotes } from './PlanNotes'
import './plans.css'

export function Plans() {
  const day = useDay()
  return <PlansContent key={day.date} {...day} />
}
function PlansContent({ date, today, setDate }: { date: string; today: string; setDate: (date: string) => void }) {
  const tasks = useRecords('daily_plans')
  const [editor, setEditor] = useState<Partial<PlannedTask> | null>(null)
  const [copy, setCopy] = useState<PlannedTask | null>(null)
  const [deleting, setDeleting] = useState<PlannedTask | null>(null)
  const [reuse, setReuse] = useState(false)
  const [view, setView] = useState<'schedule' | 'list' | 'time'>('schedule')
  const [quickTitle, setQuickTitle] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [message, setMessage] = useState('')
  const [copiedDate, setCopiedDate] = useState('')
  const [saving, setSaving] = useState(false)
  const lock = useRef(false)
  const quickInput = useRef<HTMLInputElement>(null)
  const selected = sortPlans(tasks.rows.filter(task => task.date === date))
  const untimed = selected.filter(task => clockMinutes(task.start_time) == null)
  const summary = plannerSummary(tasks.rows, date)
  const conflicts = planConflicts(tasks.rows, date)
  const unavailable = tasks.isLoading || !!tasks.error || tasks.busy || saving
  const weekday = new Date(date + 'T12:00:00').getDay()
  const monday = shiftDay(date, -(weekday === 0 ? 6 : weekday - 1))
  const week = Array.from({length:7}, (_, i) => shiftDay(monday,i))
  const pastIncomplete = sortPlans(tasks.rows.filter(task => task.date < date && planStatus(task) === 'incomplete')).sort((a,b) => b.date.localeCompare(a.date))
  const filtered = selected.filter(task =>
    (filter === 'all' || (filter === 'untimed' ? clockMinutes(task.start_time) == null : planStatus(task) === filter)) &&
    `${task.title} ${task.summary || ''} ${task.category}`.toLowerCase().includes(search.trim().toLowerCase()))
  const add = (start = '', end = '') => setEditor({date, category:'personal', start_time:start, end_time:end, status:'planned', completed:false})
  async function changeStatus(task: PlannedTask, status: ProgressStatus) {
    if (unavailable || lock.current || task.date > today) return
    lock.current = true
    setSaving(true)
    try { await tasks.save(planOutcome(task,status)); setMessage(`${task.title}: ${status === 'planned' ? 'To do' : status}.`) }
    catch { setMessage('Could not update this plan. Please try again.') }
    finally { lock.current = false; setSaving(false) }
  }
  const actions = {
    onEdit: (task: PlannedTask) => setEditor(task),
    onCopy: (task: PlannedTask) => {setCopy(task);setCopiedDate('')},
    onDelete: (task: PlannedTask) => setDeleting(task),
    onStatus: (task: PlannedTask, status: ProgressStatus) => {void changeStatus(task,status)},
  }
  const renderTask = (task: PlannedTask, conflict = false, now = false) => <PlannerTask key={task.id} task={task} today={today} busy={unavailable} conflict={conflict} now={now} actions={actions} />
  return <>
    <PageIntro eyebrow="A LITTLE STRUCTURE. MORE ROOM TO FOCUS." title="Plans" description="Shape your day, keep tasks in one place, and make room for what matters.">
      <button className="btn" disabled={unavailable} onClick={() => add()}><Plus size={16} />New plan</button>
    </PageIntro>
    <div className="planner-date-bar"><DayPicker date={date} today={today} onChange={setDate} /><button className="btn secondary" disabled={unavailable} onClick={() => setReuse(true)}><Copy size={14} />Reuse plans</button></div>
    <nav className="planner-week" aria-label="Choose a day">
      <button className="icon-btn" aria-label="Previous week" onClick={() => setDate(shiftDay(date,-7))}><ChevronLeft size={18} /></button>
      {week.map(day => { const count = tasks.rows.filter(task => task.date === day).length; const d = new Date(day+'T12:00:00'); return <button key={day} className={(day === date ? 'selected ' : '') + (day === today ? 'is-today' : '')} aria-current={day === date ? 'date' : undefined} aria-label={`${dayLabel(day)}, ${count} plans${day === today ? ', today' : ''}`} onClick={() => setDate(day)}><span>{d.toLocaleDateString('en-IN',{weekday:'short'})}</span><strong>{d.getDate()}</strong><small>{tasks.isLoading || tasks.error ? '—' : count ? `${count} plans` : 'No plans'}</small></button> })}
      <button className="icon-btn" aria-label="Next week" onClick={() => setDate(shiftDay(date,7))}><ChevronRight size={18} /></button>
    </nav>
    <DataNotice queries={[tasks]} />
    {!tasks.isLoading && !tasks.error && <>
      <div className="planner-summary" aria-label="Day summary">
        <div><span>Tasks complete</span><strong>{summary.complete}<small> / {summary.total}</small></strong><progress value={summary.complete} max={summary.total || 1} aria-label="Completed plans" /></div>
        <div><span>Scheduled time</span><strong>{durationLabel(summary.scheduled)}</strong><small>Overlaps counted once · includes overnight carryover</small></div>
        <div><span>Actual task time</span><strong>{durationLabel(summary.actual)}</strong><small>From your recorded task minutes</small></div>
        <div><span>Still to do</span><strong>{summary.open}</strong><small>{summary.untimed} without a fixed time</small></div>
      </div>
      <div className="planner-view-bar"><nav aria-label="Planner views">{([{key:'schedule',label:'Schedule',Icon:CalendarDays},{key:'list',label:'All tasks',Icon:ListChecks},{key:'time',label:'Time & notes',Icon:Clock3}] as const).map(({key,label,Icon}) => <button key={key} aria-pressed={view === key} className={view === key ? 'selected' : ''} onClick={() => setView(key)}><Icon size={16} />{label}</button>)}</nav><span>{dayLabel(date)}</span></div>
      <p className="planner-save-message" role="status">{message}</p>
      {view !== 'time' && <form className="planner-quick-add" onSubmit={async event => {
        event.preventDefault()
        if (unavailable || lock.current || !quickTitle.trim()) return
        lock.current = true; setSaving(true)
        try {
          await tasks.save({date,title:quickTitle.trim(),category:'personal',start_time:'',end_time:'',ends_next_day:false,status:'planned',completed:false,actual_minutes:null,summary:''})
          setQuickTitle('');setMessage('Added to Any time. Open the task to add a schedule or details.')
          setSearch('');setFilter('all');quickInput.current?.focus()
        } catch {setMessage('Could not add the task. Your text is kept so you can try again.')}
        finally {lock.current = false;setSaving(false)}
      }}><Plus size={18} /><input ref={quickInput} aria-label="Quick add a task" maxLength={200} required placeholder="Add a task… schedule it when you’re ready" value={quickTitle} onChange={event => setQuickTitle(event.target.value)} /><button className="btn" disabled={unavailable || !quickTitle.trim()}>Add task</button></form>}
      {view === 'schedule' && <div className="planner-layout">
        <Timetable rows={tasks.rows} date={date} busy={unavailable} onAdd={add} renderPlan={renderTask} />
        <aside className="planner-sidebar">
          <section className="planner-anytime" aria-label="Any time tasks"><div className="planner-section-heading"><div><h2>Any time <span>{untimed.length}</span></h2><p>Tasks that don’t need a time slot yet.</p></div><button className="icon-btn" aria-label="Add an untimed task" disabled={unavailable} onClick={() => add()}><Plus size={16} /></button></div>
            {untimed.length ? <div className="planner-task-stack">{untimed.map(task => renderTask(task))}</div> : <Empty>No unscheduled tasks. Quick-add one above or create a new plan.</Empty>}
          </section>
          <div className="planner-tip"><CalendarDays size={18} /><div><strong>A flexible day is a good plan.</strong><p>Start with a few tasks. Use “Show free time” to find a slot, and click any task title to adjust it.</p><Link to={'/today?date=' + date}>View your day report <ArrowRight size={13} /></Link></div></div>
          {!!pastIncomplete.length && <section className="planner-revisit"><h2>Pick up where you left off</h2><p>{pastIncomplete.length} earlier incomplete plans. Copy an attempt to preserve its history.</p>{pastIncomplete.slice(0,3).map(task => <div key={task.id}><span><strong>{task.title}</strong><small>{dayLabel(task.date)}</small></span><button className="text-link" disabled={unavailable} onClick={() => actions.onCopy(task)}>Copy <Copy size={13} /></button></div>)}{pastIncomplete.length > 3 && <button className="text-link" onClick={() => setReuse(true)}>View all unfinished plans</button>}</section>}
        </aside>
      </div>}
      {view === 'list' && <section className="planner-all-tasks" aria-label="All daily tasks">
        <div className="planner-list-toolbar"><label><Search size={16} /><input aria-label="Search plans" placeholder="Search tasks, notes, categories…" value={search} onChange={event => setSearch(event.target.value)} /></label><select aria-label="Filter plans" value={filter} onChange={event => setFilter(event.target.value)}><option value="all">All tasks</option><option value="planned">To do</option><option value="completed">Complete</option><option value="incomplete">Incomplete</option><option value="untimed">Any time</option></select><span>{filtered.length} of {selected.length}</span></div>
        {filtered.length ? <div className="planner-task-stack">{filtered.map(task => renderTask(task, conflicts.has(task.id)))}</div> : <Empty>{selected.length ? 'No matching tasks.' : 'No tasks yet. Add your first task above.'}{(search || filter !== 'all') && <button className="text-link" onClick={() => {setSearch('');setFilter('all')}}>Clear filters</button>}</Empty>}
      </section>}
      {view === 'time' && <div className="planner-reflection"><TimeTracking date={date} today={today} /><PlanNotes date={date} /></div>}
    </>}
    {editor && <PlanEditor task={editor} rows={tasks.rows} today={today} busy={tasks.busy} onClose={() => setEditor(null)} onSave={async task => {
      await tasks.save(task)
      setEditor(null);setMessage('Plan saved.');setSearch('');setFilter('all')
      if (task.date && task.date !== date) setDate(task.date)
    }} />}
    {reuse && <Dialog title="Reuse your plans" onClose={() => setReuse(false)}><PreviousPlans date={date} today={today} /><div className="planner-reuse-history"><h3>Earlier incomplete plans</h3><p className="muted">Copy a plan to a later day without changing the original outcome.</p>{pastIncomplete.length ? pastIncomplete.map(task => <div className="planner-reuse-row" key={task.id}><span><strong>{task.title}</strong><small>{dayLabel(task.date)}</small></span><button className="btn secondary small" onClick={() => {setReuse(false);actions.onCopy(task)}}>Copy</button></div>) : <Empty>No earlier incomplete plans.</Empty>}</div></Dialog>}
    {copy && <Dialog title="Copy to another day" onClose={() => setCopy(null)}><Form busy={tasks.busy} submit="Copy plan" onCancel={() => setCopy(null)} onSubmit={async data => {
      const saved = await tasks.save(copyPlanToDate(copy,textValue(data,'date')))
      setCopiedDate(saved.date)
    }}><p className="muted">“{copy.title}” stays on {dayLabel(copy.date)}. The new attempt starts as To do, with no actual time recorded.</p><Field label="Copy to"><input name="date" type="date" required min={shiftDay(copy.date,1)} defaultValue={date > copy.date ? date : shiftDay(copy.date > today ? copy.date : today,1)} /></Field></Form>{copiedDate && <p className="copy-result" role="status">Plan ready. Repeating this action won’t duplicate or reset it.<Link to={'/plans?date='+copiedDate} onClick={() => setCopy(null)}>Open {dayLabel(copiedDate)}</Link></p>}</Dialog>}
    {deleting && <Dialog title="Delete this plan?" onClose={() => setDeleting(null)}><Form busy={tasks.busy} submit="Delete plan" onCancel={() => setDeleting(null)} onSubmit={async () => {await tasks.remove(deleting.id);setDeleting(null);setMessage('Plan deleted.')}}><p className="muted">“{deleting.title}” and its recorded outcome will be removed. Mark it incomplete instead if you want to keep its history.</p></Form></Dialog>}
  </>
}
