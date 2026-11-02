import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import type { PlannedTask } from '../../types'
import { useAuth } from '../../context/AuthContext'
import { useRecords } from '../../features/life/data'
import { addPlanBatch } from '../../features/life/records'
import { DataNotice, Dialog, Field, dayLabel } from '../../features/life/ui'
import { draftFromTemplate, draftsToPlans, sequenceDrafts } from '../../features/life/planLibrary'
import type { DayDraft } from '../../features/life/planLibrary'
import { planConflicts } from '../../features/life/plans'
import { shiftDay, timeLabel } from '../../features/life/helpers'

export function DayBuilder({date,onClose,onAdded,onLibrary}: {date:string;onClose:()=>void;onAdded:(count:number)=>void;onLibrary:()=>void}) {
  const library=useRecords('plan_templates'),plans=useRecords('daily_plans')
  const {user}=useAuth()
  const client=useQueryClient()
  const [drafts,setDrafts]=useState<DayDraft[]>([]),[search,setSearch]=useState(''),[start,setStart]=useState('06:00')
  const [error,setError]=useState(''),[busy,setBusy]=useState(false),[attempted,setAttempted]=useState(false)
  const lock=useRef(false)
  const snapshot=useRef<Partial<PlannedTask>[]|null>(null)
  const templates=[...library.rows].sort((a,b)=>a.title.localeCompare(b.title)).filter(t=>`${t.title} ${t.category} ${t.notes}`.toLowerCase().includes(search.trim().toLowerCase()))
  const unavailable=library.isLoading||plans.isLoading||!!library.error||!!plans.error
  let preview:Partial<PlannedTask>[]=[],validation=''
  if(drafts.length)try {preview=draftsToPlans(drafts,date)}catch(e){validation=(e as Error).message}
  const all=[...plans.rows,...preview] as PlannedTask[]
  const conflicts=new Set([...planConflicts(all,date),...planConflicts(all,shiftDay(date,1))])
  const overlaps=preview.filter(p=>conflicts.has(p.id!)).length
  const repeated=preview.some(p=>plans.rows.some(existing=>existing.date===date&&existing.title.toLowerCase()===p.title!.toLowerCase()))
  const edit=(id:string,patch:Partial<DayDraft>)=>setDrafts(rows=>rows.map(r=>r.id===id?{...r,...patch}:r))
  function move(index:number,offset:number){setDrafts(rows=>{const next=[...rows];[next[index],next[index+offset]]=[next[index+offset],next[index]];return next})}
  async function save(){
    if(lock.current||unavailable||!user||(!snapshot.current&&(!drafts.length||validation)))return
    lock.current=true;setBusy(true);setError('')
    const entries=snapshot.current||draftsToPlans(drafts,date)
    snapshot.current=entries;setAttempted(true)
    try{
      await addPlanBatch(user.id,entries)
      await client.invalidateQueries({queryKey:['life',user.id,'daily_plans']})
      await client.invalidateQueries({queryKey:['daily_plans',user.id]})
      onAdded(entries.length)
    }catch(e){setError((e instanceof Error?e.message:'Could not save the timetable.')+' Retry will use the same entries without duplicating plans already saved.')}
    finally{setBusy(false);lock.current=false}
  }
  return <Dialog title="Build your day" onClose={()=>{if(!lock.current)onClose()}}>
    <p className="planner-builder-intro">{dayLabel(date)} · Choose activities and instructions from your library, then set their times. Existing plans stay in place.</p>
    <DataNotice queries={[library,plans]}/>
    {!unavailable&&<>
      <fieldset disabled={busy||attempted} className="planner-builder-fields">
        <div className="planner-builder-picker"><Field label="Find a saved task"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Wake up, deep work, break…"/></Field><div className="planner-builder-options">{templates.map(task=><button type="button" className="planner-builder-option" key={task.id} disabled={drafts.length>=100} onClick={()=>setDrafts(rows=>[...rows,draftFromTemplate(task,crypto.randomUUID())])}><span><strong>{task.title}</strong><span className="planner-picker-instructions">{task.notes || 'Add instructions after choosing this task.'}</span><small>{task.category}</small></span><Plus size={16}/></button>)}</div>{!templates.length&&<p className="muted">{library.rows.length?'No matching tasks.':'Save some tasks in your library first.'}</p>}{!drafts.length&&<button type="button" className="text-link" onClick={onLibrary}>Manage task library →</button>}</div>
        <div className="planner-builder-heading"><h3>Your timetable <span>{drafts.length} tasks</span></h3><p>Adjust what to do for this day without changing your saved task. Add it again for repeated breaks or work blocks. Choose a start time and duration here, or leave both blank for Any time.</p></div>
        {!!drafts.length&&<div className="planner-builder-sequence"><Field label="Start the day at"><input type="time" value={start} onChange={e=>setStart(e.target.value)}/></Field><button type="button" className="btn secondary small" onClick={()=>{try{setDrafts(sequenceDrafts(drafts,start));setError('')}catch(e){setError((e as Error).message)}}}>Arrange back-to-back</button></div>}
        <div className="planner-builder-rows">{drafts.map((draft,index)=>{const plan=preview.find(p=>p.id===draft.id);return <div className="planner-builder-row" key={draft.id}>
          <div className="planner-builder-row-title"><span>{index+1}</span><strong>{draft.title}</strong><div><button className="icon-btn" type="button" disabled={index===0} aria-label={`Move ${draft.title} up`} onClick={()=>move(index,-1)}><ArrowUp size={14}/></button><button className="icon-btn" type="button" disabled={index===drafts.length-1} aria-label={`Move ${draft.title} down`} onClick={()=>move(index,1)}><ArrowDown size={14}/></button><button type="button" className="icon-btn" aria-label={`Remove ${draft.title}`} onClick={()=>setDrafts(rows=>rows.filter(r=>r.id!==draft.id))}><Trash2 size={14}/></button></div></div>
          <div className="planner-builder-instructions"><Field label="What to do"><textarea rows={3} maxLength={2000} aria-label={`${draft.title} what to do, item ${index+1}`} value={draft.summary} onChange={e=>edit(draft.id,{summary:e.target.value})} placeholder="Add the steps for this day…"/></Field></div>
          <div className="planner-builder-timing"><Field label="Start"><input type="time" aria-label={`${draft.title} start time, item ${index+1}`} value={draft.start} onChange={e=>edit(draft.id,{start:e.target.value})}/></Field><Field label="Minutes"><input type="number" aria-label={`${draft.title} duration, item ${index+1}`} placeholder="Choose" min={1} max={1440} step={1} value={draft.duration||''} onChange={e=>edit(draft.id,{duration:Number(e.target.value)})}/></Field><small>{plan?.end_time?`Until ${timeLabel(plan.end_time)}${plan.ends_next_day?' next day':''}`:'Any time'}{conflicts.has(draft.id)&&<span className="error-text">Overlaps another plan</span>}</small></div>
        </div>})}</div>
      </fieldset>
      {!!overlaps&&<p className="planner-editor-notice">{overlaps} selected {overlaps===1?'task overlaps':'tasks overlap'} another plan. Adjust the times, or save if intentional.</p>}
      {repeated&&<p className="planner-editor-notice">This day already has a task with the same name. Saving will add another occurrence.</p>}
      {validation&&<p className="error-text" role="alert">{validation}</p>}
      {error&&<p className="error-text" role="alert">{error}</p>}
      {!drafts.length&&<p className="muted">Choose a task above to start building your timetable.</p>}
      <div className="planner-builder-footer"><button className="btn secondary" disabled={busy} onClick={onClose}>Close</button><button className="btn" disabled={busy||!drafts.length||!!validation} onClick={()=>void save()}>{busy?'Saving timetable…':attempted?'Retry saving':`Add ${drafts.length || ''} tasks to this day`}</button></div>
    </>}
  </Dialog>
}
