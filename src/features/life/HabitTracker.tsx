import { useRef, useState } from 'react'
import { Check, Minus, Plus, Pencil, Leaf, TrendingDown } from 'lucide-react'
import type { Habit, HabitLog } from '../../types'
import { useRecords } from './data'
import {
  DataNotice,
  Dialog,
  Empty,
  Field,
  Form,
  Panel,
  dayLabel,
  ignoreHandled,
  textValue,
} from './ui'
import { shiftDay } from './helpers'
import {
  habitCount,
  habitPeriod,
  habitTarget,
  habitWindow,
  habitSummary,
  prepareHabit,
  validateHabitCount,
  isAlcoholHabit,
} from './habits'
import './habits.css'
import { OutcomeButtons } from './OutcomeButtons'

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
  const [showAll, setShowAll] = useState(false)
  const [editor, setEditor] = useState<Partial<Habit> | null>(null)
  const [entry, setEntry] = useState<{ habit: Habit; log?: HabitLog } | null>(
    null,
  )
  const [saving, setSaving] = useState(false)
  const lock = useRef(false)
  const active = habits.rows.filter((h) => h.is_active)
  const unavailable =
    habits.isLoading || logs.isLoading || !!habits.error || !!logs.error
  const busy = saving || habits.busy || logs.busy
  const disabled = unavailable || busy || date > today
  async function record(habit: Habit, value: number, note?: string) {
    if (lock.current || disabled || !habit.is_active) return
    validateHabitCount(value)
    lock.current = true
    setSaving(true)
    try {
      const existing = logs.rows.find(
        (l) => l.habit_id === habit.id && l.date === date,
      )
      await logs.save({
        ...existing,
        habit_id: habit.id,
        date,
        value,
        completed: value > 0,
        outcome:
          existing && habitCount(existing) === value
            ? existing.outcome
            : 'planned',
        note: note ?? existing?.note ?? '',
      })
      // Keep controls locked until the saved count has reached the query cache.
      await logs.refetch()
    } finally {
      lock.current = false
      setSaving(false)
    }
  }
  return (
    <>
      <Panel
        className="habit-panel"
        title="Habits, one step at a time"
        subtitle="Build what helps. Reduce what holds you back."
        action={
          <button
            className="text-link"
            disabled={unavailable || busy}
            onClick={() => setManage(true)}
          >
            Manage
          </button>
        }
      >
        <DataNotice queries={[habits, logs]} />
        <div className="habit-legend">
          <span>
            <Leaf size={13} /> Good · build
          </span>
          <span>
            <TrendingDown size={13} /> Bad · reduce
          </span>
        </div>
        {!unavailable && !active.length && (
          <Empty>
            Start with one habit to build or one to reduce. Small steps are
            enough.
          </Empty>
        )}
        <div className="habit-grid">
          {(showAll ? active : active.slice(0, 2)).map((habit) => {
            const log = logs.rows.find(
              (l) => l.habit_id === habit.id && l.date === date,
            )
            const count = habitCount(log)
            const bad = habit.habit_type === 'bad'
            const window = habitWindow(habit, date)
            const progress = habitSummary(habit, logs.rows, date, window.days)
            const target = habitTarget(habit)
            const unit =
              habit.unit === 'check' ? 'times' : habit.unit || 'times'
            return (
              <article
                className={'habit-card ' + (bad ? 'habit-bad' : 'habit-good')}
                key={habit.id}
                aria-label={habit.name}
              >
                <div className="habit-card-heading">
                  <div>
                    <span className="habit-kind">
                      {bad ? <TrendingDown size={12} /> : <Leaf size={12} />}
                      {bad ? 'Bad habit · reduce' : 'Good habit · build'}
                    </span>
                    <h3>{habit.name}</h3>
                  </div>
                  <button
                    className="icon-btn"
                    aria-label={'Edit habit ' + habit.name}
                    disabled={busy || unavailable}
                    onClick={() => setEditor(habit)}
                  >
                    <Pencil size={14} />
                  </button>
                </div>
                <p className="habit-goal">
                  {bad ? 'Aim for at most' : 'Aim for at least'}{' '}
                  <strong>
                    {target} {unit}
                  </strong>{' '}
                  · {window.label.toLowerCase()}
                </p>
                <div className="habit-count-row">
                  <div className="habit-count" aria-live="polite">
                    <strong>{count === null ? '—' : count}</strong>
                    <span>
                      {count === null ? 'Not logged' : `${unit} recorded`}
                    </span>
                  </div>
                  <div className="habit-counter-actions">
                    <button
                      className="icon-btn"
                      disabled={disabled || !count}
                      aria-label={'Undo one for ' + habit.name}
                      onClick={() =>
                        ignoreHandled(
                          record(habit, Math.max(0, (count || 0) - 1)),
                        )
                      }
                    >
                      <Minus size={16} />
                    </button>
                    <button
                      className="btn habit-log-one"
                      disabled={disabled || (count ?? 0) >= 9999}
                      aria-label={'Log one for ' + habit.name}
                      onClick={() =>
                        ignoreHandled(record(habit, (count || 0) + 1))
                      }
                    >
                      <Check size={16} /> +1
                    </button>
                  </div>
                </div>
                {count !== null && count > 0 && (
                  <div className="habit-ticks" aria-hidden="true">
                    {Array.from(
                      { length: Math.min(Math.floor(count), 6) },
                      (_, i) => (
                        <span key={i}>
                          <Check size={12} />
                        </span>
                      ),
                    )}
                    {count > 6 && <small>+{count - 6}</small>}
                    <small>One tick per occurrence</small>
                  </div>
                )}
                <div className="habit-entry-actions">
                  <button
                    className="text-link"
                    disabled={disabled}
                    onClick={() => ignoreHandled(record(habit, 0))}
                  >
                    {count === 0 ? '✓ Zero recorded' : 'None this day · 0'}
                  </button>
                  <button
                    className="text-link"
                    disabled={disabled}
                    onClick={() => setEntry({ habit, log })}
                  >
                    Set count / note
                  </button>
                </div>
                {date > today ? (
                  <p className="habit-caption">
                    You can log this day when it arrives.
                  </p>
                ) : (
                  <p className="habit-caption">
                    {window.days > 1 && (
                      <>
                        {progress.total} {unit} logged ·{' '}
                      </>
                    )}
                    {progress.recorded === 0
                      ? 'No entries yet.'
                      : bad
                        ? progress.total > target
                          ? 'Above your current limit. Keep logging honestly.'
                          : 'Within your current limit so far.'
                        : progress.total >= target
                          ? 'Your current target is reached.'
                          : `${Math.max(0, target - progress.total)} more toward your current target.`}
                    {progress.recorded < window.days &&
                      ` ${window.days - progress.recorded} ${window.days - progress.recorded === 1 ? 'day not' : 'days not'} logged.`}
                  </p>
                )}
                {log?.note && <p className="habit-day-note">{log.note}</p>}
                <div className="habit-outcome">
                  <p className="habit-caption">
                    Day review{!log ? ' · record a count first' : ''}
                  </p>
                  <OutcomeButtons
                    label={habit.name}
                    value={log?.outcome}
                    disabled={disabled || !log}
                    onChange={(outcome) =>
                      ignoreHandled(logs.save({ ...log!, outcome }))
                    }
                  />
                </div>
                <HabitHistory
                  habit={habit}
                  logs={logs.rows}
                  end={date > today ? today : date}
                  onDate={onDate}
                />
              </article>
            )
          })}
        </div>
        <div className="habit-bottom-actions">
          <button
            className="text-link"
            disabled={unavailable || busy}
            onClick={() => setEditor({ habit_type: 'good' })}
          >
            <Plus size={14} /> Add habit
          </button>
          {active.length > 2 && (
            <button className="text-link" onClick={() => setShowAll(!showAll)}>
              {showAll ? 'Show fewer' : `Show all ${active.length}`}
            </button>
          )}
        </div>
        <p className="habit-footnote">
          Zero means you recorded none. A dash means you haven’t logged that
          day.
        </p>
      </Panel>
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
                  {habit.habit_type === 'bad' ? 'Bad · reduce' : 'Good · build'}{' '}
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
          title={editor.id ? 'Adjust your habit' : 'Start with a small step'}
          onClose={() => setEditor(null)}
        >
          <Form
            busy={habits.busy}
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
            }}
          >
            <Field label="Habit">
              <input
                name="name"
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
                <option value="good">Good habit · build more</option>
                <option value="bad">Bad habit · reduce</option>
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
              label="What does one tick count?"
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
              label="My small plan (optional)"
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
            onSubmit={async (data) => {
              await record(
                entry.habit,
                Number(data.get('count')),
                textValue(data, 'note'),
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
  onDate,
}: {
  habit: Habit
  logs: HabitLog[]
  end: string
  onDate: (date: string) => void
}) {
  const current = habitSummary(habit, logs, end, 7)
  const previous = habitSummary(habit, logs, shiftDay(end, -7), 7)
  const bad = habit.habit_type === 'bad'
  const complete = current.recorded === 7 && previous.recorded === 7
  const difference = current.total - previous.total
  return (
    <details className="habit-history">
      <summary>
        Progress & history <span>{current.total} logged in 7 days</span>
      </summary>
      {habit.description && (
        <p className="habit-plan">
          <strong>My plan</strong>
          <br />
          {habit.description}
        </p>
      )}
      <p className="habit-caption">
        7 days ending{' '}
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
      <div className="habit-comparison">
        <div>
          <span>Last 7 days</span>
          <strong>{current.total}</strong>
          <small>{current.recorded}/7 days logged</small>
        </div>
        <div>
          <span>Previous 7 days</span>
          <strong>{previous.total}</strong>
          <small>{previous.recorded}/7 days logged</small>
        </div>
      </div>
      <p className="habit-caption">
        {complete
          ? difference === 0
            ? 'The total is unchanged from the previous 7 days.'
            : `${Math.abs(difference)} ${difference < 0 ? 'fewer' : 'more'} recorded than the previous 7 days.${(bad ? difference < 0 : difference > 0) ? ' Moving in your chosen direction.' : ' A change in your count, not a reset of your progress.'}`
          : 'These are recorded totals. Log missing days before comparing progress.'}
      </p>
      <p className="habit-caption">
        {current.occurrenceDays} {current.occurrenceDays === 1 ? 'day' : 'days'}{' '}
        with occurrences · {current.zeroDays} recorded zero{' '}
        {current.zeroDays === 1 ? 'day' : 'days'}
      </p>
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
