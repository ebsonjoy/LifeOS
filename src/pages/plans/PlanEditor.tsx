import { useState } from 'react'
import type { PlannedTask, ProgressStatus } from '../../types'
import { DataNotice, Dialog, Field, Form, textValue } from '../../features/life/ui'
import { useRecords } from '../../features/life/data'
import { planCategories, planConflicts, schedulePreset, validatePlanEdit } from '../../features/life/plans'
import { durationLabel, plannedDuration } from '../../features/life/progress'
import { shiftDay } from '../../features/life/helpers'

export function PlanEditor({ task, rows, today, busy, onClose, onSave }: {
  task: Partial<PlannedTask>; rows: PlannedTask[]; today: string; busy: boolean;
  onClose: () => void; onSave: (task: Partial<PlannedTask>) => Promise<void>
}) {
  const library = useRecords('plan_templates')
  const [librarySearch,setLibrarySearch] = useState('')
  const [title,setTitle] = useState(task.title || '')
  const [category,setCategory] = useState(task.category || 'personal')
  const [notes,setNotes] = useState(task.summary || '')
  const [templateDuration,setTemplateDuration] = useState<number|null>(null)
  const [date, setDate] = useState(task.date || today)
  const [scheduled, setScheduled] = useState(!!task.start_time)
  const [start, setStart] = useState(task.start_time || '')
  const [end, setEnd] = useState(task.end_time || '')
  const [nextDay, setNextDay] = useState(task.ends_next_day || false)
  const [status, setStatus] = useState<ProgressStatus>(task.status || (task.completed ? 'completed' : 'planned'))
  const [actual, setActual] = useState(task.actual_minutes == null ? '' : String(task.actual_minutes))
  const reviewed = !!task.id && ((task.status || (task.completed ? 'completed' : 'planned')) !== 'planned' || task.actual_minutes != null)
  let duration: number | null = null, timeError = ''
  if (scheduled && (start || end)) {
    try { duration = plannedDuration(start, end, nextDay) } catch (error) { timeError = (error as Error).message }
  }
  const draft = { ...task, id: task.id || '__draft__', date, start_time: scheduled ? start : '', end_time: scheduled ? end : '', ends_next_day: scheduled && nextDay } as PlannedTask
  const others = [...rows.filter(row => row.id !== task.id), draft]
  const overlaps = !timeError && (planConflicts(others, date).has(draft.id) || (nextDay && planConflicts(others, shiftDay(date, 1)).has(draft.id)))
  return (
    <Dialog title={task.id ? 'Edit plan' : 'Create a plan'} onClose={onClose}>
      <Form busy={busy} submit={task.id ? 'Save changes' : 'Create plan'} onCancel={onClose} onSubmit={async data => {
        const title = textValue(data, 'title')
        if (!title) throw new Error('Give your plan a name.')
        if (scheduled && !start) throw new Error('Choose a start time or select Any time.')
        const minutes = actual.trim() ? Number(actual) : null
        if (minutes != null && (!Number.isInteger(minutes) || minutes < 0 || minutes > 1440)) throw new Error('Actual time must be a whole number from 0 to 1440 minutes.')
        const next = {
          date, start_time: scheduled ? start : '', end_time: scheduled ? end : '',
          ends_next_day: scheduled && nextDay, status, actual_minutes: minutes,
        }
        validatePlanEdit(task, next, today, rows)
        await onSave({ ...task, ...next, title, completed: status === 'completed', category: textValue(data, 'category'), summary: textValue(data, 'summary') })
      }}>
        {!task.id && <div className="planner-editor-library">
          <Field label="Choose a saved task (optional)"><input value={librarySearch} onChange={e=>setLibrarySearch(e.target.value)} placeholder="Search activities or what to do…" disabled={library.isLoading||!!library.error}/></Field>
          {library.isLoading && <p className="muted">Loading task library…</p>}
          {library.error && <DataNotice queries={[library]}/>}
          {!library.isLoading&&!library.error&&<>
            <div className="planner-builder-options">{[...library.rows].sort((a,b)=>a.title.localeCompare(b.title)).filter(t=>`${t.title} ${t.notes} ${t.category}`.toLowerCase().includes(librarySearch.trim().toLowerCase())).map(template=><button type="button" className="planner-builder-option" key={template.id} onClick={()=>{
              setTitle(template.title);setCategory(template.category);setNotes(template.notes)
            }}><span><strong>{template.title}</strong><span className="planner-picker-instructions">{template.notes || 'No instructions yet'}</span><small>{template.category}</small></span></button>)}</div>
            <p className="muted">{!library.rows.length?'Save reusable tasks in the Task library tab, or enter a custom activity below.':'Choose an activity above or enter your own below. Changes here apply only to this plan.'}</p>
          </>}
        </div>}
        <Field label="Activity / task"><input name="title" required maxLength={200} autoFocus value={title} onChange={e=>setTitle(e.target.value)} placeholder="What would you like to get done?" /></Field>
        <Field label="What to do"><textarea name="summary" rows={4} maxLength={2000} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="e.g. Practise speaking for 15 minutes, then review five new words." /></Field>
        <div className="form-grid">
          <Field label="Date" hint={reviewed ? 'Recorded history stays on this day. Use Copy for a new attempt.' : 'Change the date to reschedule this task.'}><input type="date" required value={date} readOnly={reviewed} onChange={event => setDate(event.target.value)} /></Field>
          <Field label="Category"><select name="category" value={category} onChange={e=>setCategory(e.target.value)}>{[...new Set([...planCategories, ...(task.category ? [task.category] : [])])].map(category => <option key={category} value={category}>{category}</option>)}</select></Field>
        </div>
        <fieldset className="planner-schedule-fields">
          <legend>When will you do it?</legend>
          <div className="planner-schedule-switch"><button type="button" aria-pressed={!scheduled} onClick={() => setScheduled(false)}>Any time</button><button type="button" aria-pressed={scheduled} onClick={() => setScheduled(true)}>Set a time</button></div>
          {scheduled ? <>
            <div className="form-grid"><Field label="Start time"><input type="time" required value={start} onChange={event => {setStart(event.target.value);if(templateDuration&&event.target.value){const timing=schedulePreset(event.target.value,templateDuration);setEnd(timing.end_time);setNextDay(timing.ends_next_day)}}} /></Field><Field label="End time (optional)"><input type="time" value={end} onChange={event => {setEnd(event.target.value);setTemplateDuration(null)}} /></Field></div>
            <div className="planner-duration-presets" aria-label="Duration shortcuts">{[15,30,60,90,120].map(minutes => <button className="chip" type="button" disabled={!start} key={minutes} onClick={() => { setTemplateDuration(minutes); const preset = schedulePreset(start, minutes); setEnd(preset.end_time); setNextDay(preset.ends_next_day) }}>{durationLabel(minutes)}</button>)}</div>
            <label className="check-status"><input type="checkbox" checked={nextDay} onChange={event => setNextDay(event.target.checked)} />Ends the next day</label>
            {timeError ? <p className="error-text">{timeError}</p> : <p className="muted">{duration == null ? 'Add an end time to reserve a block, or leave it blank for a reminder.' : durationLabel(duration) + ' planned'}</p>}
            {overlaps && <p className="planner-editor-notice" role="status">This time overlaps another plan. Adjust the time, or save if the overlap is intentional.</p>}
          </> : <p className="muted">Keep this task in Any time. You can schedule it later.</p>}
        </fieldset>
        <div className="form-grid">
          <Field label="Outcome"><select value={status} disabled={date > today} onChange={event => setStatus(event.target.value as ProgressStatus)}><option value="planned">To do</option><option value="completed">Complete</option><option value="incomplete">Incomplete</option></select></Field>
          <Field label="Actual minutes" hint="Blank means unlogged; 0 means no time spent."><input type="number" min={0} max={1440} step={1} disabled={date > today} value={actual} onChange={event => setActual(event.target.value)} placeholder="e.g. 45" /></Field>
        </div>
        {date > today && <p className="muted">Outcomes and actual time can be recorded when this day arrives. Plans with recorded history cannot be moved into the future.</p>}
      </Form>
    </Dialog>
  )
}
