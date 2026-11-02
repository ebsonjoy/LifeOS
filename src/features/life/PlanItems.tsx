import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Pencil, Trash2 } from 'lucide-react'
import type { PlannedTask } from '../../types'
import { useRecords } from './data'
import { Dialog, Field, Form, ignoreHandled, textValue } from './ui'
import { shiftDay, timeLabel } from './helpers'
import {
  copyPlanToDate,
  durationLabel,
  planOutcome,
  planStatus,
} from './progress'
import { PlanInstructions } from './PlanInstructions'
import { OutcomeButtons } from './OutcomeButtons'

export function PlanItems({
  rows,
  today,
  onEdit,
}: {
  rows: PlannedTask[]
  today: string
  onEdit?: (task: PlannedTask) => void
}) {
  const tasks = useRecords('daily_plans')
  const [copy, setCopy] = useState<PlannedTask | null>(null)
  const [deleting, setDeleting] = useState<PlannedTask | null>(null)
  const [copiedDate, setCopiedDate] = useState('')
  return (
    <>
      <div className="plan-items">
        {rows.map((task) => {
          const status = planStatus(task)
          return (
            <article
              className={'plan-item ' + status}
              key={task.id}
              aria-label={task.title}
            >
              <div className="plan-item-top">
                <div>
                  <span className={'outcome-tag ' + status}>
                    {status === 'planned'
                      ? 'Planned'
                      : status === 'completed'
                        ? 'Complete'
                        : 'Incomplete'}
                  </span>
                  <h3>{task.title}</h3>
                  <p className="plan-item-time">
                    <span>Time · </span>{task.start_time
                      ? `${timeLabel(task.start_time)}${task.end_time ? ' – ' + timeLabel(task.end_time) : ''}${task.ends_next_day ? ' (next day)' : ''}`
                      : 'Any time'}
                    {task.actual_minutes != null
                      ? ' · Actual ' + durationLabel(task.actual_minutes)
                      : ''}
                  </p>
                  <PlanInstructions text={task.summary}/>
                  {task.source_plan_id && (
                    <small>A new attempt copied from an earlier plan.</small>
                  )}
                </div>
                {onEdit && (
                  <div className="plan-edit-actions">
                    <button
                      className="icon-btn"
                      disabled={tasks.busy}
                      aria-label={'Edit ' + task.title}
                      onClick={() => onEdit(task)}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="icon-btn"
                      disabled={tasks.busy}
                      aria-label={'Delete ' + task.title}
                      onClick={() => setDeleting(task)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
              <div className="plan-item-bottom">
                <OutcomeButtons
                  label={task.title}
                  value={status}
                  disabled={task.date > today || tasks.busy || !!tasks.error}
                  onChange={(value) =>
                    ignoreHandled(tasks.save(planOutcome(task, value)))
                  }
                />
                {status === 'incomplete' && (
                  <button
                    className="text-link"
                    disabled={tasks.busy}
                    onClick={() => {
                      setCopiedDate('')
                      setCopy(task)
                    }}
                  >
                    Try another day <ArrowRight size={13} />
                  </button>
                )}
                {!onEdit && (
                  <Link className="text-link" to={'/plans?date=' + task.date}>
                    Details
                  </Link>
                )}
              </div>
            </article>
          )
        })}
      </div>
      {copy && (
        <Dialog title="Give it another day" onClose={() => setCopy(null)}>
          <p className="muted">
            “{copy.title}” stays incomplete on {copy.date}. A separate planned
            attempt will be added to the date you choose.
          </p>
          <Form
            busy={tasks.busy}
            submit="Copy plan"
            onSubmit={async (data) => {
              const date = textValue(data, 'date')
              const row = await tasks.save(copyPlanToDate(copy, date))
              setCopiedDate(row.date)
            }}
          >
            <Field label="Try on">
              <input
                type="date"
                name="date"
                required
                min={shiftDay(copy.date, 1)}
                defaultValue={shiftDay(
                  copy.date > today ? copy.date : today,
                  1,
                )}
              />
            </Field>
          </Form>
          {copiedDate && (
            <p className="copy-result" role="status">
              Plan ready for {copiedDate}. Repeating this action won’t create
              duplicates or reset that attempt.{' '}
              <Link
                to={'/plans?date=' + copiedDate}
                onClick={() => setCopy(null)}
              >
                Open that day
              </Link>
            </p>
          )}
        </Dialog>
      )}
      {deleting && (
        <Dialog title="Remove this plan?" onClose={() => setDeleting(null)}>
          <Form
            submit="Remove plan"
            busy={tasks.busy}
            onSubmit={async () => {
              await tasks.remove(deleting.id)
              setDeleting(null)
            }}
          >
            <p>
              This removes this entry and its outcome from reports. To keep its
              history, mark it incomplete instead.
            </p>
          </Form>
        </Dialog>
      )}
    </>
  )
}
