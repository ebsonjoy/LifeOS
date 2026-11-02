import type { PlannedTask, PlanTemplate } from '../../types'
import { dateKey, shiftDay } from './helpers'
import { clockMinutes, minuteClock, planCategories, schedulePreset, validatePlanEdit } from './plans'

export const starterTasks: Partial<PlanTemplate>[] = [
  {title:'Wake up',category:'personal',notes:'Drink water, freshen up, and get ready for the day.'},
  {title:'Deep work',category:'work',notes:'Choose one priority, silence notifications, and focus on it.'},
  {title:'English practice',category:'english',notes:'Practise speaking, then review five new words.'},
  {title:'Read a book',category:'learning',notes:'Read 10 pages and write down three key ideas.'},
  {title:'Break',category:'personal',notes:'Step away from the screen, stretch, and drink water.'},
]
export function validateTemplate(row: Partial<PlanTemplate>) {
  if (!row.title?.trim() || row.title.length > 200) throw new Error('Enter a task name of 1–200 characters.')
  if (!planCategories.includes(row.category || '')) throw new Error('Choose a task category.')
  if (row.duration_minutes != null && (!Number.isInteger(row.duration_minutes) || row.duration_minutes < 1 || row.duration_minutes > 1440)) throw new Error('Duration must be a whole number from 1 to 1440 minutes.')
  if (row.default_start && clockMinutes(row.default_start) == null) throw new Error('Choose a valid default start time.')
  if ((row.notes || '').length > 2000) throw new Error('Keep what to do within 2000 characters.')
}
export function planFromTemplate(template: PlanTemplate, date: string): Partial<PlannedTask> {
  validateTemplate(template)
  return {date,title:template.title,category:template.category,summary:template.notes,start_time:'',end_time:'',ends_next_day:false,status:'planned',completed:false,actual_minutes:null,source_plan_id:null}
}
export interface DayDraft {
  id: string; title: string; category: string; summary: string; start: string; duration: number
}
export function draftFromTemplate(template: PlanTemplate, id: string): DayDraft {
  validateTemplate(template)
  return {id,title:template.title,category:template.category,summary:template.notes,start:'',duration:0}
}
export function sequenceDrafts(drafts: DayDraft[], start: string): DayDraft[] {
  let cursor = clockMinutes(start)
  if (cursor == null) throw new Error('Choose a valid day start time.')
  return drafts.map(draft => {
    if (!Number.isInteger(draft.duration) || draft.duration < 1 || draft.duration > 1440) throw new Error('Each task needs a duration from 1 to 1440 minutes.')
    if (cursor! >= 1440) throw new Error('This sequence starts a task after midnight. Shorten it or plan that task on the next day.')
    const result = {...draft,start:minuteClock(cursor!)}
    cursor! += draft.duration
    return result
  })
}
export function draftsToPlans(drafts: DayDraft[], date: string) {
  if (!drafts.length || drafts.length > 100) throw new Error('Choose between 1 and 100 tasks.')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || shiftDay(date,0) !== date) throw new Error('Choose a valid date.')
  return drafts.map(draft => {
    validateTemplate({title:draft.title,category:draft.category,notes:draft.summary})
    if (draft.start && clockMinutes(draft.start) == null) throw new Error('Choose a valid start time.')
    if (!Number.isInteger(draft.duration) || draft.duration < 0 || draft.duration > 1440 || (draft.start && draft.duration === 0)) throw new Error('Duration must be a whole number from 1 to 1440 minutes for a timed task.')
    if (!draft.start && draft.duration > 0) throw new Error('Choose a start time for each task with a duration, or arrange them back-to-back.')
    const timing = draft.start ? schedulePreset(draft.start,draft.duration) : {end_time:'',ends_next_day:false}
    return {id:draft.id,date,title:draft.title,category:draft.category,summary:draft.summary,start_time:draft.start,...timing,status:'planned' as const,completed:false,actual_minutes:null,source_plan_id:null}
  })
}
export function validatePlanBatch(rows: Partial<PlannedTask>[]) {
  if (!rows.length || rows.length > 100 || new Set(rows.map(r=>r.id)).size !== rows.length) throw new Error('Choose between 1 and 100 distinct plan entries.')
  for (const row of rows) {
    if (!row.id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.id)) throw new Error('Invalid plan identifier.')
    if (!row.title?.trim() || row.title.length > 200 || !planCategories.includes(row.category || '') || (row.summary || '').length > 2000) throw new Error('Check the task name, category and notes.')
    if (row.status !== 'planned' || row.completed !== false || row.actual_minutes !== null || row.source_plan_id != null) throw new Error('Library tasks must start as fresh, unreviewed plans.')
    validatePlanEdit({}, {date:row.date || '',start_time:row.start_time || '',end_time:row.end_time || '',ends_next_day:!!row.ends_next_day,status:'planned',actual_minutes:null},dateKey())
  }
}
