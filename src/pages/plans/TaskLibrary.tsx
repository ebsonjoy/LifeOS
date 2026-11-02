import { useState } from 'react'
import { Plus, Pencil, Trash2, Search, CalendarPlus } from 'lucide-react'
import type { PlannedTask, PlanTemplate } from '../../types'
import { useRecords } from '../../features/life/data'
import { DataNotice, Dialog, Empty, Field, Form, textValue } from '../../features/life/ui'
import { planCategories } from '../../features/life/plans'
import { starterTasks, planFromTemplate } from '../../features/life/planLibrary'

export function TaskLibrary({date,onUse,onBuild}: {date:string;onUse:(task:Partial<PlannedTask>)=>void;onBuild:()=>void}) {
  const library = useRecords('plan_templates')
  const [search,setSearch] = useState('')
  const [editing,setEditing] = useState<Partial<PlanTemplate>|null>(null)
  const [deleting,setDeleting] = useState<PlanTemplate|null>(null)
  const [message,setMessage] = useState('')
  const rows = [...library.rows].sort((a,b)=>a.title.localeCompare(b.title)).filter(t=>`${t.title} ${t.category} ${t.notes}`.toLowerCase().includes(search.trim().toLowerCase()))
  const unavailable=library.isLoading||!!library.error||library.busy
  return <section className="planner-library" aria-label="Saved task library">
    <div className="planner-section-heading"><div><h2>Task library</h2><p>Your reusable list of activities and instructions. Choose a date and time when you plan a day.</p></div><div className="planner-library-actions"><button className="btn secondary" disabled={unavailable||!library.rows.length} onClick={onBuild}><CalendarPlus size={15}/>Build day</button><button className="btn" disabled={unavailable} onClick={()=>setEditing({category:'personal',notes:''})}><Plus size={15}/>Save a task</button></div></div>
    <DataNotice queries={[library]}/>
    <p className="planner-save-message" role="status">{message}</p>
    {!library.isLoading&&!library.error&&<>
      <div className="planner-library-starters"><span>Start with an example:</span>{starterTasks.map(task=><button className="chip" key={task.title} disabled={library.busy} onClick={()=>setEditing(task)}><Plus size={12}/>{task.title}</button>)}</div>
      <label className="planner-library-search"><Search size={16}/><input aria-label="Search saved tasks" placeholder="Search your task library…" value={search} onChange={e=>setSearch(e.target.value)}/><span>{rows.length} tasks</span></label>
      {rows.length ? <div className="planner-library-table-wrap"><table className="planner-library-table"><thead><tr><th>Activity / task</th><th>What to do</th><th>Category</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{rows.map(task=><tr key={task.id}><td data-label="Activity / task"><strong>{task.title}</strong></td><td data-label="What to do" className="planner-library-instructions">{task.notes || <span className="muted">No instructions yet</span>}</td><td data-label="Category">{task.category}</td><td><div className="planner-library-actions"><button className="btn secondary small" disabled={library.busy} onClick={()=>onUse(planFromTemplate(task,date))}>Use task</button><button className="icon-btn" disabled={library.busy} aria-label={`Edit saved task ${task.title}`} onClick={()=>setEditing(task)}><Pencil size={14}/></button><button className="icon-btn" disabled={library.busy} aria-label={`Delete saved task ${task.title}`} onClick={()=>setDeleting(task)}><Trash2 size={14}/></button></div></td></tr>)}</tbody></table></div> : <Empty>{library.rows.length?'No saved tasks match your search.':'Your library is empty. Save your own task or customise one of the examples above.'}</Empty>}
      <p className="planner-library-hint">Library tasks are reusable starting points. Editing or deleting one leaves existing daily plans and their outcomes unchanged.</p>
    </>}
    {editing&&<Dialog title={editing.id?'Edit saved task':'Save a reusable task'} onClose={()=>setEditing(null)}><Form busy={library.busy} submit="Save to library" onCancel={()=>setEditing(null)} onSubmit={async data=>{await library.save({...editing,title:textValue(data,'title'),category:textValue(data,'category'),notes:textValue(data,'notes')});setEditing(null);setSearch('');setMessage('Task saved to your library. Use it once or add it to a full day.')}}>
      <Field label="Activity / task"><input autoFocus required maxLength={200} name="title" defaultValue={editing.title||''} placeholder="e.g. Deep work"/></Field>
      <Field label="What to do" hint="Optional instructions copied into your daily plan. You can adjust them for each day."><textarea name="notes" rows={4} maxLength={2000} defaultValue={editing.notes||''} placeholder="e.g. Read 10 pages and write down three key ideas."/></Field>
      <Field label="Category"><select name="category" defaultValue={editing.category||'personal'}>{planCategories.map(c=><option key={c}>{c}</option>)}</select></Field>
    </Form></Dialog>}
    {deleting&&<Dialog title="Delete saved task?" onClose={()=>setDeleting(null)}><Form busy={library.busy} submit="Delete from library" onCancel={()=>setDeleting(null)} onSubmit={async()=>{await library.remove(deleting.id);setDeleting(null);setMessage('Removed from the library. Existing daily plans are unchanged.')}}><p>Remove “{deleting.title}” from your library? Plans already created from it will stay in your timetable.</p></Form></Dialog>}
  </section>
}
