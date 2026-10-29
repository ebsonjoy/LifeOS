import { useRecords } from './data'
import { DataNotice, ignoreHandled } from './ui'
import { defaultActivity } from './progress'
import { OutcomeButtons } from './OutcomeButtons'

export function DailyReview({
  date,
  today,
  area,
  name,
}: {
  date: string
  today: string
  area: string
  name: string
}) {
  const activity = useRecords('daily_activity')
  const row = activity.rows.find(
    (r) => r.date === date && r.activity_key === area,
  )
  return (
    <section className="daily-review" aria-label={name + ' daily review'}>
      <div>
        <strong>{name} · daily goal</strong>
        <p>
          {row?.status === 'completed'
            ? 'Marked complete.'
            : row?.status === 'incomplete'
              ? 'Marked incomplete. You can try again another day.'
              : 'How did your goal go? Logged activity and this review are separate.'}
        </p>
      </div>
      <OutcomeButtons
        label={name + ' daily goal'}
        value={row?.status}
        disabled={
          date > today ||
          activity.busy ||
          activity.isLoading ||
          !!activity.error
        }
        onChange={(status) =>
          ignoreHandled(
            activity.save({
              ...defaultActivity(date, area, name, 'section'),
              ...row,
              status,
            }),
          )
        }
      />
      <DataNotice queries={[activity]} />
    </section>
  )
}
