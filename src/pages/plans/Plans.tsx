import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import type { PlannedTask } from '../../types'
import { useRecords } from '../../features/life/data'
import {
  DataNotice,
  DayPicker,
  Dialog,
  Field,
  Form,
  Panel,
  PageIntro,
  dayLabel,
  textValue,
  useDay,
} from '../../features/life/ui'
import { shiftDay } from '../../features/life/helpers'
import {
  plannedDuration,
  planStatus,
  hoursToMinutes,
} from '../../features/life/progress'
import { PlanItems } from '../../features/life/PlanItems'
import { TimeTracking } from '../../features/life/TimeTracking'
import { Timetable } from '../../features/life/Timetable'
import { PreviousPlans } from '../../features/life/PreviousPlans'

export function Plans() {
  const day = useDay()
  return <PlansContent key={day.date} {...day} />
}
function PlansContent({
  date,
  today,
  setDate,
}: {
  date: string
  today: string
  setDate: (date: string) => void
}) {
  const tasks = useRecords('daily_plans'),
    daily = useRecords('daily_logs')
  const [editor, setEditor] = useState<Partial<PlannedTask> | null>(null)
  const selected = tasks.rows
    .filter((t) => t.date === date)
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
  const note = daily.rows.find((r) => r.date === date)
  const pastIncomplete = tasks.rows
    .filter((r) => r.date < date && planStatus(r) === 'incomplete')
    .sort((a, b) => b.date.localeCompare(a.date))
  const unavailable = tasks.isLoading || !!tasks.error || tasks.busy
  return (
    <>
      <PageIntro
        eyebrow="MAKE ROOM FOR WHAT MATTERS"
        title="Plans"
        description="Plan your day, record your time, and give unfinished work another chance."
      >
        <DayPicker date={date} today={today} onChange={setDate} />
      </PageIntro>
      <DataNotice queries={[tasks]} />
      <div className="report-toolbar">
        <span>{dayLabel(date)}</span>
        <Link className="text-link" to={'/plans?date=' + shiftDay(today, 1)}>
          Plan tomorrow →
        </Link>
        <Link className="text-link" to={'/today?date=' + date}>
          View day report →
        </Link>
      </div>
      <div className="two-col plans-layout">
        <div className="stack">
          {selected.some((r) => !r.start_time) && (
            <Panel
              title="Your plans"
              subtitle="Keep your priorities small. Timed plans appear in the timetable below."
              action={
                <button
                  className="text-link"
                  disabled={unavailable}
                  onClick={() => setEditor({ date, category: 'personal' })}
                >
                  <Plus size={14} /> Add plan
                </button>
              }
            >
              <PlanItems
                rows={selected.filter((r) => !r.start_time)}
                today={today}
                onEdit={setEditor}
              />
            </Panel>
          )}
          <Timetable
            rows={selected}
            reusePlans={<PreviousPlans key={date} date={date} today={today} />}
            busy={unavailable}
            onEdit={(task) => setEditor({ ...task, date })}
            renderPlan={(task) => (
              <PlanItems rows={[task]} today={today} onEdit={setEditor} />
            )}
          />
          {!!pastIncomplete.length && (
            <Panel
              title="Earlier unfinished plans"
              subtitle="Keep the original outcome. Copy only what you still want to do."
            >
              <details>
                <summary>
                  {pastIncomplete.length} incomplete{' '}
                  {pastIncomplete.length === 1 ? 'plan' : 'plans'} to review
                </summary>
                {pastIncomplete.map((task) => (
                  <div key={task.id}>
                    <p className="date-caption">{task.date}</p>
                    <PlanItems rows={[task]} today={today} />
                  </div>
                ))}
              </details>
            </Panel>
          )}
        </div>
        <div className="stack">
          <TimeTracking date={date} today={today} />
          <Panel
            title="Daily notes"
            subtitle="Keep your reflections and your next small step here."
          >
            <DataNotice queries={[daily]} />
            {!daily.isLoading && !daily.error && (
              <Form
                key={note?.id || date}
                busy={daily.busy}
                submit="Save notes"
                onSubmit={async (data) => {
                  await daily.save({
                    ...note,
                    date,
                    accomplishments: textValue(data, 'accomplishments'),
                    improve_tomorrow: textValue(data, 'improve_tomorrow'),
                    journal: textValue(data, 'journal'),
                  })
                }}
              >
                <Field label="What I did / want to do">
                  <textarea
                    name="accomplishments"
                    rows={2}
                    defaultValue={note?.accomplishments || ''}
                  />
                </Field>
                <Field label="One thing for tomorrow">
                  <input
                    name="improve_tomorrow"
                    defaultValue={note?.improve_tomorrow || ''}
                  />
                </Field>
                <details>
                  <summary>My English journal</summary>
                  <Field label="Write a few sentences">
                    <textarea
                      name="journal"
                      rows={3}
                      defaultValue={note?.journal || ''}
                    />
                  </Field>
                </details>
              </Form>
            )}
          </Panel>
        </div>
      </div>
      {editor && (
        <Dialog
          title={editor.id ? 'Edit your plan' : 'One thing that matters'}
          onClose={() => setEditor(null)}
        >
          <Form
            busy={tasks.busy}
            onSubmit={async (data) => {
              const title = textValue(data, 'title')
              if (!title) throw new Error('Give your plan a name.')
              const start = textValue(data, 'start'),
                end = textValue(data, 'end'),
                nextDay = data.get('nextDay') === 'on'
              plannedDuration(start, end, nextDay)
              const actual =
                date > today
                  ? (editor.actual_minutes ?? null)
                  : hoursToMinutes(textValue(data, 'actual'))
              await tasks.save({
                ...editor,
                date,
                title,
                category: editor.category || 'personal',
                start_time: start,
                end_time: end,
                ends_next_day: nextDay,
                status:
                  editor.status || (editor.completed ? 'completed' : 'planned'),
                completed: editor.status
                  ? editor.status === 'completed'
                  : editor.completed || false,
                actual_minutes: actual,
                summary: textValue(data, 'summary'),
              })
              setEditor(null)
            }}
          >
            <Field label="Plan">
              <input
                name="title"
                required
                maxLength={200}
                defaultValue={editor.title || ''}
                placeholder="e.g. Solve two problems"
              />
            </Field>
            <div className="form-grid">
              <Field label="Start time (optional)">
                <input
                  name="start"
                  type="time"
                  defaultValue={editor.start_time || ''}
                />
              </Field>
              <Field label="End time (optional)">
                <input
                  name="end"
                  type="time"
                  defaultValue={editor.end_time || ''}
                />
              </Field>
            </div>
            <label className="check-status">
              <input
                name="nextDay"
                type="checkbox"
                defaultChecked={editor.ends_next_day || false}
              />{' '}
              Ends the next day
            </label>
            <Field label="Actual hours (optional)">
              <input
                name="actual"
                type="number"
                step="any"
                min={0}
                max={24}
                disabled={date > today}
                defaultValue={
                  editor.actual_minutes == null
                    ? ''
                    : editor.actual_minutes / 60
                }
              />
            </Field>
            <Field label="Note or link (optional)">
              <textarea
                name="summary"
                rows={2}
                maxLength={2000}
                defaultValue={editor.summary || ''}
              />
            </Field>
            <p className="muted">
              {dayLabel(date)}. Scheduled times trigger in-app reminders.
              Planned time is never treated as actual time.
            </p>
          </Form>
        </Dialog>
      )}
    </>
  )
}
