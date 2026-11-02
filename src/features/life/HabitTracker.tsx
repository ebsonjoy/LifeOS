import { useRef, useState } from 'react'
import { Check, Minus, Plus, Pencil, Leaf, TriangleAlert, Search, Settings2 } from 'lucide-react'
import type { Habit, HabitLog, ProgressStatus } from '../../types'
import { useRecords } from './data'
import {
  DataNotice,
  Dialog,
  Empty,
  Field,
  Form,
  dayLabel,
  ignoreHandled,
  textValue,
} from './ui'
import {
  habitCount,
  habitPeriod,
  habitTarget,
  habitWindow,
  habitSummary,
  prepareHabit,
  prepareHabitEntry,
  isAlcoholHabit,
} from './habits'
import './habits.css'
import { OutcomeButtons } from './OutcomeButtons'
import { HabitProgressGraph } from './HabitProgressGraph'

export function HabitTracker({
  date,
  today,
  onDate,
}: {
  date: string
  today: string
  onDate: (date: string) => void
}) {
  const habits = useRecords('habits'),
    logs = useRecords('habit_logs')
  const [manage, setManage] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed'>('all')
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [editor, setEditor] = useState<Partial<Habit> | null>(null)
  const [entry, setEntry] = useState<{ habit: Habit; log?: HabitLog } | null>(
    null,
  )
  const [saving, setSaving] = useState(false)
  const lock = useRef(false)
  const active = habits.rows.filter((h) => h.is_active)
  const dailyLogs = new Map(logs.rows.filter(l => l.date === date).map(l => [l.habit_id, l]))
  const isReviewed = (id: string) => ['completed', 'incomplete'].includes(dailyLogs.get(id)?.outcome || '')
  const reviewed = active.filter(h => isReviewed(h.id)).length
  const logged = active.filter(h => habitCount(dailyLogs.get(h.id)) !== null).length
  const visible = active.filter(h =>
    `${h.name} ${h.description || ''}`.toLowerCase().includes(search.trim().toLowerCase()) &&
    (filter === 'all' || (filter === 'reviewed' ? isReviewed(h.id) : !isReviewed(h.id))),
  )
  const paused = habits.rows.length - active.length
  const unavailable =
    habits.isLoading || logs.isLoading || !!habits.error || !!logs.error
  const busy = saving || habits.busy || logs.busy
  const disabled = unavailable || busy || date > today
  async function record(habit: Habit, value: number, note?: string, outcome?: ProgressStatus) {
    if (lock.current || disabled || !habit.is_active) return
    lock.current = true
    setSaving(true)
    try {
      const existing = logs.rows.find(
        (l) => l.habit_id === habit.id && l.date === date,
      )
      await logs.save(prepareHabitEntry(habit.id, date, existing, value, note, outcome))
      // Keep controls locked until the saved count has reached the query cache.
      await logs.refetch()
    } finally {
      lock.current = false
      setSaving(false)
    }
  }
  return (
    <>
      <section className="habit-workspace" aria-label="Habit tracking and daily review">
        <div className="habit-toolbar">
          <div><span className="habit-eyebrow">DAILY CHECK-IN</span><h2>{date === today ? 'Today’s habits' : dayLabel(date)}</h2><p>Log what you did, then review how the day went.</p></div>
          <div className="habit-toolbar-actions">
            <button className="btn secondary" disabled={unavailable || busy} onClick={() => setManage(true)}><Settings2 size={15}/>Manage{paused > 0 ? ` · ${paused} paused` : ''}</button>
            <button className="btn" disabled={unavailable || busy} onClick={() => setEditor({ habit_type: 'good' })}><Plus size={16}/>Add habit</button>
          </div>
        </div>
        <DataNotice queries={[habits, logs]} />
        {message && <p className="habit-feedback" role="status">{message}</p>}
        {!unavailable && <>
          {!!active.length && <>
            <div className="habit-overview" aria-label="Selected day summary">
              <div><span>Active habits</span><strong>{active.length}</strong><small>In your routine</small></div>
              <div><span>Counts logged</span><strong>{logged}<small> / {active.length}</small></strong><small>Including recorded zeros</small></div>
              <div><span>Day reviews</span><strong>{reviewed}<small> / {active.length}</small></strong><small>{active.length - reviewed ? `${active.length - reviewed} still to review` : 'All reviews recorded'}</small></div>
            </div>
            {date > today && <p className="habit-future-note">You’re viewing a future day. You can manage habits now and record progress when the day arrives.</p>}
            <div className="habit-list-toolbar">
              <div className="habit-filters" role="group" aria-label="Filter daily reviews">
                <button aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>All habits <span>{active.length}</span></button>
                <button aria-pressed={filter === 'pending'} onClick={() => setFilter('pending')}>To review <span>{active.length - reviewed}</span></button>
                <button aria-pressed={filter === 'reviewed'} onClick={() => setFilter('reviewed')}>Reviewed <span>{reviewed}</span></button>
              </div>
              <label className="habit-search"><Search size={15}/><input aria-label="Search habits" placeholder="Search habits…" value={search} onChange={e => setSearch(e.target.value)}/></label>
            </div>
          </>}
          {!active.length ? <div className="habit-empty"><Leaf size={30}/><h3>{paused ? 'Your habits are paused' : 'Make room for one small habit'}</h3><p>{paused ? 'Resume a habit to start logging again, or add a new one.' : 'Choose something to build or reduce. Give it a simple target and check in each day.'}</p><button className="btn" onClick={() => paused ? setManage(true) : setEditor({habit_type:'good'})} disabled={busy}>{paused ? 'Manage paused habits' : 'Add your first habit'}</button></div> : <>
            {!visible.length && <Empty>{search ? 'No habits match your search.' : filter === 'pending' ? 'All daily reviews are recorded.' : 'No reviews recorded yet.'}<button className="text-link" onClick={() => {setSearch('');setFilter('all')}}>Show all habits</button></Empty>}
            <div className="habit-list">
              {visible.map(habit => {
                const log = dailyLogs.get(habit.id)
                const count = habitCount(log)
                const bad = habit.habit_type === 'bad'
                const window = habitWindow(habit, date)
                const progress = habitSummary(habit, logs.rows, date, window.days)
                const target = habitTarget(habit)
                const unit = habit.unit === 'check' ? 'times' : habit.unit || 'times'
                const status = log?.outcome || 'planned'
                return <article className={'habit-row ' + (bad ? 'habit-bad' : 'habit-good')} key={habit.id} aria-label={habit.name}>
                  <div className="habit-row-main">
                    <div className="habit-identity">
                      <div className="habit-row-heading"><span className="habit-kind">{bad ? <TriangleAlert size={13}/> : <Leaf size={13}/>}{bad ? 'Bad habit · Reduce' : 'Build'}</span><button className="icon-btn" aria-label={'Edit habit ' + habit.name} disabled={busy} onClick={() => setEditor(habit)}><Pencil size={14}/></button></div>
                      <h3>{habit.name}</h3>
                      <p className="habit-goal">{bad ? 'At most' : 'At least'} <strong>{target} {unit}</strong> · {window.label.toLowerCase()}</p>
                      <p className="habit-period-status">{progress.recorded === 0 ? 'No counts logged in this period.' : `${progress.total} ${unit} logged${window.days > 1 ? ` · ${progress.recorded}/${window.days} days recorded` : ''}`}</p>
                    </div>
                    <div className="habit-log-area">
                      <span className="habit-section-label">1. Log this day</span>
                      <div className="habit-count-row"><div className="habit-count" aria-live="polite"><strong>{count === null ? '—' : count}</strong><span>{count === null ? 'Not logged' : unit}</span></div><div className="habit-counter-actions"><button className="icon-btn" disabled={disabled || !count} aria-label={'Undo one for ' + habit.name} onClick={() => ignoreHandled(record(habit, Math.max(0, (count || 0) - 1)))}><Minus size={15}/></button><button className="btn habit-log-one" disabled={disabled || (count ?? 0) >= 9999} aria-label={'Log one for ' + habit.name} onClick={() => ignoreHandled(record(habit, (count || 0) + 1))}><Plus size={15}/>1</button></div></div>
                      <div className="habit-entry-actions"><button className="text-link" disabled={disabled || count === 0} aria-label={'Record zero for ' + habit.name} onClick={() => ignoreHandled(record(habit, 0))}>{count === 0 ? <><Check size={12}/>Zero recorded</> : 'Record zero'}</button><button className="text-link" disabled={disabled} aria-label={'Set count and note for ' + habit.name} onClick={() => setEntry({habit, log})}>Set count & note</button></div>
                    </div>
                    <div className="habit-review-area">
                      <span className="habit-section-label">2. Review this day</span>
                      <p className={'habit-review-status ' + status}>{status === 'completed' ? 'Complete' : status === 'incomplete' ? 'Incomplete' : 'Not reviewed'}</p>
                      <OutcomeButtons label={habit.name} value={log?.outcome} disabled={disabled || !log} onChange={outcome => ignoreHandled(logs.save({...log!, outcome}))}/>
                      {!log && <small>Log a count or zero to review.</small>}
                    </div>
                  </div>
                  {log?.note && <p className="habit-day-note"><strong>Day note</strong> {log.note}</p>}
                  <HabitHistory habit={habit} logs={logs.rows} end={date > today ? today : date} today={today} onDate={onDate}/>
                </article>
              })}
            </div>
            <p className="habit-footnote">0 means none recorded. — means not logged. Changing a count clears its review so you can review it again.</p>
          </>}
        </>}
      </section>
      {manage && (
        <Dialog title="Your habits" onClose={() => setManage(false)}>
          <p className="muted">
            Focus on a few at a time. Pausing keeps all your history.
          </p>
          {habits.rows.map((habit) => (
            <div className="habit-manage-row" key={habit.id}>
              <div>
                <strong>{habit.name}</strong>
                <p className="muted">
                  {habit.habit_type === 'bad' ? 'Reduce' : 'Build'}{' '}
                  · {habit.is_active ? 'Active' : 'Paused'}
                </p>
              </div>
              <button
                className="text-link"
                disabled={busy}
                onClick={() =>
                  ignoreHandled(
                    habits.save({ ...habit, is_active: !habit.is_active }),
                  )
                }
              >
                {habit.is_active ? 'Pause' : 'Resume'}
              </button>
              <button
                className="icon-btn"
                aria-label={'Edit habit ' + habit.name}
                disabled={busy}
                onClick={() => {
                  setManage(false)
                  setEditor(habit)
                }}
              >
                <Pencil size={14} />
              </button>
            </div>
          ))}
          <button
            className="btn view-all"
            disabled={busy}
            onClick={() => {
              setManage(false)
              setEditor({ habit_type: 'good' })
            }}
          >
            <Plus size={14} /> Add habit
          </button>
        </Dialog>
      )}
      {editor && (
        <Dialog
          title={editor.id ? 'Edit habit' : 'Add a habit'}
          onClose={() => setEditor(null)}
        >
          <Form
            busy={habits.busy}
            submit={editor.id ? 'Save changes' : 'Add habit'}
            onCancel={() => setEditor(null)}
            onSubmit={async (data) => {
              const fields = prepareHabit({
                name: textValue(data, 'name'),
                habit_type: editor.habit_type || 'good',
                period_days: Number(data.get('period')),
                target_value: Number(data.get('target')),
                unit: textValue(data, 'unit'),
                description: textValue(data, 'description'),
              })
              await habits.save({
                ...editor,
                ...fields,
                category: editor.category || 'personal',
                is_active: editor.is_active ?? true,
              })
              setEditor(null)
              setSearch('');setFilter('all')
              setMessage(editor.id ? 'Habit updated.' : 'Habit added. You can log your first count below.')
            }}
          >
            <Field label="Habit">
              <input
                name="name"
                autoFocus
                required
                maxLength={100}
                value={editor.name || ''}
                onChange={(e) => setEditor({ ...editor, name: e.target.value })}
                placeholder="e.g. Reading or late-night scrolling"
              />
            </Field>
            <Field label="Habit type">
              <select
                value={editor.habit_type || 'good'}
                onChange={(e) =>
                  setEditor({
                    ...editor,
                    habit_type: e.target.value as 'good' | 'bad',
                  })
                }
              >
                <option value="good">Build a habit</option>
                <option value="bad">Reduce a habit</option>
              </select>
            </Field>
            <div className="form-grid">
              <Field
                label={
                  editor.habit_type === 'bad'
                    ? 'Maximum count'
                    : 'Minimum count'
                }
              >
                <input
                  name="target"
                  type="number"
                  min={editor.habit_type === 'bad' ? 0 : 1}
                  max={9999}
                  step={1}
                  required
                  defaultValue={habitTarget(editor)}
                />
              </Field>
              <Field label="Target period">
                <select name="period" defaultValue={habitPeriod(editor)}>
                  <option value="1">Each day</option>
                  <option value="2">Every 2 days (rolling)</option>
                  <option value="3">Every 3 days (rolling)</option>
                  <option value="7">Each week (Mon–Sun)</option>
                </select>
              </Field>
            </div>
            <Field
              label="Count in"
              hint="Use the same measure each time, such as sessions, cups, or times."
            >
              <input
                name="unit"
                maxLength={24}
                defaultValue={
                  editor.unit === 'check' ? 'times' : editor.unit || 'times'
                }
              />
            </Field>
            <Field
              label="Your plan (optional)"
              hint="A trigger to watch for, or something helpful to do instead."
            >
              <textarea
                name="description"
                rows={3}
                maxLength={2000}
                defaultValue={editor.description || ''}
                placeholder="After dinner, put my phone aside and read one page."
              />
            </Field>
            <p className="muted">
              Choose a realistic target and adjust it when you’re ready. Your
              counts stay unchanged; progress uses your current target.
            </p>
            {editor.habit_type === 'bad' &&
              isAlcoholHabit(editor.name || '') && <AlcoholNote />}
          </Form>
        </Dialog>
      )}
      {entry && (
        <Dialog
          title={entry.habit.name + ' · daily entry'}
          onClose={() => setEntry(null)}
        >
          <p className="muted">{dayLabel(date)}</p>
          <Form
            busy={busy}
            submit="Save daily entry"
            onCancel={() => setEntry(null)}
            onSubmit={async (data) => {
              await record(
                entry.habit,
                Number(data.get('count')),
                textValue(data, 'note'),
                (textValue(data, 'outcome') || undefined) as ProgressStatus | undefined,
              )
              setEntry(null)
            }}
          >
            <Field label="Count for this day">
              <input
                name="count"
                type="number"
                required
                min={0}
                max={9999}
                step={1}
                defaultValue={habitCount(entry.log) ?? 0}
              />
            </Field>
            <Field label="Day review" hint="Record your count and review together, or leave the review for later."><select name="outcome" defaultValue=""><option value="">{entry.log?.outcome && entry.log.outcome !== 'planned' ? 'Keep review if count is unchanged' : 'Review later'}</option><option value="planned">Clear review / review later</option><option value="completed">Complete</option><option value="incomplete">Incomplete</option></select></Field>
            <Field label="What helped or triggered it? (optional)">
              <textarea
                name="note"
                rows={3}
                maxLength={2000}
                defaultValue={entry.log?.note || ''}
              />
            </Field>
            <p className="muted">
              Saving 0 explicitly records a day with no occurrences.
            </p>
          </Form>
        </Dialog>
      )}
    </>
  )
}

function HabitHistory({
  habit,
  logs,
  end,
  today,
  onDate,
}: {
  habit: Habit
  logs: HabitLog[]
  end: string
  today: string
  onDate: (date: string) => void
}) {
  const current = habitSummary(habit, logs, end, 7)
  const bad = habit.habit_type === 'bad'
  const [open, setOpen] = useState(false)
  return (
    <details className="habit-history" onToggle={event => setOpen(event.currentTarget.open)}>
      <summary>
        Progress & history <span>{current.total} logged in 7 days</span>
      </summary>
      {open && <HabitProgressGraph habit={habit} logs={logs} end={end} today={today}/>}
      {habit.description && (
        <p className="habit-plan">
          <strong>My plan</strong>
          <br />
          {habit.description}
        </p>
      )}
      <p className="habit-caption">
        Recent entries · 7 days ending{' '}
        {new Date(end + 'T12:00:00').toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
        })}
        . Select a day to review or correct it.
      </p>
      <div className="habit-day-grid">
        {current.days.map((day) => (
          <button
            className={
              day.value === null
                ? 'unlogged'
                : day.value === 0
                  ? 'zero'
                  : 'recorded'
            }
            key={day.date}
            onClick={() => onDate(day.date)}
            aria-label={`${habit.name}, ${dayLabel(day.date)}, ${day.value === null ? 'not logged' : day.value + ' recorded'}`}
          >
            <span>
              {new Date(day.date + 'T12:00:00')
                .toLocaleDateString('en-IN', { weekday: 'short' })
                .slice(0, 2)}
            </span>
            <strong>{day.value === null ? '—' : day.value}</strong>
            <small>{Number(day.date.slice(-2))}</small>
          </button>
        ))}
      </div>
      {bad && isAlcoholHabit(habit.name) && <AlcoholNote />}
    </details>
  )
}

function AlcoholNote() {
  return (
    <p className="habit-health-note">
      For alcohol, the amount and strength matter as well as how often you
      drink. This count is a personal record, not a safe drinking limit or a
      treatment plan. If you get withdrawal symptoms when cutting down, seek
      medical help before reducing or stopping.{' '}
      <a
        href="https://www.nhs.uk/conditions/alcohol-use-disorder/"
        target="_blank"
        rel="noopener noreferrer"
      >
        NHS guidance
      </a>
    </p>
  )
}
