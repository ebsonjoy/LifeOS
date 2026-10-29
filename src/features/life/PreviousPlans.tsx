import { useRef, useState } from 'react'
import { useRecords } from './data'
import { dayLabel, shiftDay, timeLabel } from './helpers'
import { copyPlanToDate } from './progress'

export function PreviousPlans({
  date,
  today,
}: {
  date: string
  today: string
}) {
  const plans = useRecords('daily_plans')
  const [chosen, setChosen] = useState<string[]>([])
  const [added, setAdded] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const lock = useRef(false)
  const previousDate = shiftDay(date, -1)
  const previous = plans.rows
    .filter((plan) => plan.date === previousDate)
    .sort((a, b) =>
      (a.start_time || '24:00').localeCompare(b.start_time || '24:00'),
    )
  const copied = new Set([
    ...added,
    ...plans.rows
      .filter((plan) => plan.date === date)
      .map((plan) => plan.source_plan_id),
  ])
  const available = previous.filter((plan) => !copied.has(plan.id))
  const selected = available.filter((plan) => chosen.includes(plan.id))
  const disabled = saving || plans.busy || plans.isLoading || !!plans.error

  async function addSelected() {
    if (lock.current || disabled || !selected.length) return
    lock.current = true
    setSaving(true)
    setMessage('')
    let count = 0
    try {
      for (const plan of selected) {
        await plans.save(copyPlanToDate(plan, date))
        count += 1
        setAdded((ids) => [...ids, plan.id])
        setChosen((ids) => ids.filter((id) => id !== plan.id))
      }
      setMessage(
        `${count} ${count === 1 ? 'plan added' : 'plans added'} to ${dayLabel(date)}.`,
      )
    } catch {
      // useRecords reports the save error. Keep unsaved selections for retry.
      setMessage(
        `${count} added. The remaining selections could not be saved. Please try again.`,
      )
    } finally {
      const refreshed = await plans.refetch().catch(() => null)
      if (refreshed && !refreshed.error) setAdded([])
      setSaving(false)
      lock.current = false
    }
  }

  return (
    <details className="previous-plans">
      <summary>
        {date === today ? 'Yesterday’s plans' : 'Previous day’s plans'}
        {!plans.isLoading && !plans.error && <span> · {previous.length}</span>}
      </summary>
      <p className="muted">
        {dayLabel(previousDate)} → {dayLabel(date)}. Choose plans to reuse with
        the same times and fresh completion status.
      </p>
      {plans.isLoading ? (
        <p className="muted" role="status">
          Loading previous plans…
        </p>
      ) : plans.error ? (
        <p className="muted">
          Previous plans are unavailable. Use Retry above to load them.
        </p>
      ) : !previous.length ? (
        <p className="muted">No plans recorded for the previous day.</p>
      ) : (
        <>
          {!!available.length && (
            <button
              className="text-link"
              disabled={disabled}
              onClick={() =>
                setChosen(
                  selected.length === available.length
                    ? []
                    : available.map((plan) => plan.id),
                )
              }
            >
              {selected.length === available.length
                ? 'Clear selection'
                : 'Select all available'}
            </button>
          )}
          <div className="previous-plan-list">
            {previous.map((plan) => (
              <label className="previous-plan-option" key={plan.id}>
                <input
                  type="checkbox"
                  aria-label={`Reuse ${plan.title}`}
                  disabled={disabled || copied.has(plan.id)}
                  checked={copied.has(plan.id) || chosen.includes(plan.id)}
                  onChange={(event) => {
                    setMessage('')
                    setChosen((ids) =>
                      event.target.checked
                        ? [...ids, plan.id]
                        : ids.filter((id) => id !== plan.id),
                    )
                  }}
                />
                <span>
                  <strong>{plan.title}</strong>
                  <small>
                    {plan.start_time
                      ? timeLabel(plan.start_time)
                      : 'No fixed time'}
                    {plan.end_time ? ` – ${timeLabel(plan.end_time)}` : ''}
                    {plan.ends_next_day ? ' (next day)' : ''}
                  </small>
                </span>
                {copied.has(plan.id) && (
                  <small className="previous-plan-added">Added</small>
                )}
              </label>
            ))}
          </div>
          <button
            className="btn"
            disabled={disabled || !selected.length}
            onClick={() => void addSelected()}
          >
            {saving
              ? 'Adding plans…'
              : `Add selected${selected.length ? ` (${selected.length})` : ''}`}
          </button>
        </>
      )}
      {message && (
        <p className="muted" role="status">
          {message}
        </p>
      )}
    </details>
  )
}
