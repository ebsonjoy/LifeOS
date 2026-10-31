import { useRecords } from '../../features/life/data'
import { DataNotice, Field, Form, Panel, textValue } from '../../features/life/ui'

export function PlanNotes({ date }: { date: string }) {
  const daily = useRecords('daily_logs')
  const note = daily.rows.find(row => row.date === date)
  return (
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
  )
}
