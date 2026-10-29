import { useState } from 'react'
import { Plus, Pencil } from 'lucide-react'
import type { DailyActivity } from '../../types'
import { useRecords } from './data'
import {
  DataNotice,
  Dialog,
  Field,
  Form,
  Panel,
  ignoreHandled,
  textValue,
} from './ui'
import {
  defaultActivity,
  durationLabel,
  hoursToMinutes,
  timeAreas,
} from './progress'
import { OutcomeButtons } from './OutcomeButtons'

export function TimeTracking({ date, today }: { date: string; today: string }) {
  const activity = useRecords('daily_activity')
  const [editor, setEditor] = useState<Partial<DailyActivity> | null>(null)
  const custom = [
    ...new Map(
      activity.rows
        .filter(
          (r) =>
            r.kind === 'time' &&
            !timeAreas.some((a) => a.key === r.activity_key),
        )
        .map((r) => [r.activity_key, { key: r.activity_key, name: r.name }]),
    ).values(),
  ]
  const areas = [...timeAreas, ...custom]
  const unavailable = activity.busy || activity.isLoading || !!activity.error
  return (
    <Panel
      title="Where your time went"
      subtitle="Plan your hours, then record what actually happened."
      action={
        <button
          className="text-link"
          disabled={unavailable}
          onClick={() =>
            setEditor(
              defaultActivity(
                date,
                'custom_' + crypto.randomUUID(),
                '',
                'time',
              ),
            )
          }
        >
          <Plus size={14} /> Add activity
        </button>
      }
    >
      <DataNotice queries={[activity]} />
      <div className="time-cards">
        {areas.map((area) => {
          const row = activity.rows.find(
            (r) => r.date === date && r.activity_key === area.key,
          )
          return (
            <article
              className="time-card"
              key={area.key}
              aria-label={area.name + ' time'}
            >
              <div className="section-row">
                <h3>{area.name}</h3>
                <button
                  className="icon-btn"
                  disabled={unavailable}
                  aria-label={'Edit ' + area.name + ' time'}
                  onClick={() =>
                    setEditor(
                      row || defaultActivity(date, area.key, area.name, 'time'),
                    )
                  }
                >
                  <Pencil size={14} />
                </button>
              </div>
              <div className="time-values">
                <div>
                  <span>Planned</span>
                  <strong>
                    {row?.planned_minutes == null
                      ? 'Not set'
                      : durationLabel(row.planned_minutes)}
                  </strong>
                </div>
                <div>
                  <span>Actual</span>
                  <strong>{durationLabel(row?.actual_minutes)}</strong>
                </div>
              </div>
              <OutcomeButtons
                label={area.name}
                value={row?.status}
                disabled={date > today || unavailable}
                onChange={(status) =>
                  ignoreHandled(
                    activity.save({
                      ...defaultActivity(date, area.key, area.name, 'time'),
                      ...row,
                      status,
                    }),
                  )
                }
              />
              {row?.note && <p className="muted">{row.note}</p>}
            </article>
          )
        })}
      </div>
      <p className="report-note">
        Sleep belongs to the day you woke up. Blank actual time means unlogged;
        enter 0 for none. Avoid counting the same time in two categories.
        Completion is your review, not an automatic judgement of your hours.
      </p>
      {editor && (
        <Dialog title="Plan & record your time" onClose={() => setEditor(null)}>
          <Form
            busy={activity.busy}
            onSubmit={async (data) => {
              const name = textValue(data, 'name')
              if (!name) throw new Error('Give this activity a name.')
              const planned = hoursToMinutes(textValue(data, 'planned'))
              const actual =
                date > today
                  ? (editor.actual_minutes ?? null)
                  : hoursToMinutes(textValue(data, 'actual'))
              await activity.save({
                ...editor,
                name,
                date,
                kind: 'time',
                planned_minutes: planned,
                actual_minutes: actual,
                note: textValue(data, 'note'),
              })
              setEditor(null)
            }}
          >
            <Field label="Activity">
              <input
                name="name"
                required
                maxLength={100}
                defaultValue={editor.name}
                readOnly={!editor.activity_key?.startsWith('custom_')}
              />
            </Field>
            <div className="form-grid">
              <Field label="Planned hours">
                <input
                  name="planned"
                  type="number"
                  min={0}
                  max={24}
                  step="any"
                  defaultValue={
                    editor.planned_minutes == null
                      ? ''
                      : editor.planned_minutes / 60
                  }
                  placeholder="e.g. 2"
                />
              </Field>
              <Field label="Actual hours">
                <input
                  name="actual"
                  type="number"
                  min={0}
                  max={24}
                  step="any"
                  disabled={date > today}
                  defaultValue={
                    editor.actual_minutes == null
                      ? ''
                      : editor.actual_minutes / 60
                  }
                  placeholder="e.g. 1.5"
                />
              </Field>
            </div>
            <Field label="Note (optional)">
              <textarea
                name="note"
                rows={2}
                maxLength={2000}
                defaultValue={editor.note || ''}
              />
            </Field>
            <p className="muted">
              {date > today
                ? 'Actual time can be recorded when the day arrives.'
                : 'Use decimals for part-hours: 1.5 = 1 hour 30 minutes.'}
            </p>
          </Form>
        </Dialog>
      )}
    </Panel>
  )
}
