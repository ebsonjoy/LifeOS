import { useState } from 'react'
import { Plus, ExternalLink, Pencil, Trash2, Briefcase } from 'lucide-react'
import { useRecords } from '../../features/life/data'
import { safeLink } from '../../features/life/helpers'
import {
  DataNotice,
  Dialog,
  Empty,
  Field,
  Form,
  PageIntro,
  textValue,
  useToday,
} from '../../features/life/ui'
import type { JobApplication, JobApplicationStatus } from '../../types'
const statuses: Record<JobApplicationStatus, string> = {
  saved: 'Saved',
  applied: 'Applied',
  screening: 'Screening',
  interview: 'Interview',
  technical: 'Technical interview',
  offer: 'Offer',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
}
export function Career() {
  const jobs = useRecords('job_applications'),
    today = useToday()
  const [filter, setFilter] = useState('active'),
    [search, setSearch] = useState(''),
    [editor, setEditor] = useState<Partial<JobApplication> | null>(null),
    [deleting, setDeleting] = useState<string | null>(null)
  const active = jobs.rows.filter(
    (j) => !['rejected', 'withdrawn'].includes(j.status),
  )
  const due = active.filter(
    (j) =>
      (j.follow_up_date && j.follow_up_date <= today) ||
      j.interview_date === today,
  )
  const filtered = jobs.rows
    .filter(
      (j) =>
        (filter === 'all' ||
          (filter === 'active' &&
            !['rejected', 'withdrawn'].includes(j.status)) ||
          filter === j.status) &&
        `${j.company} ${j.role}`.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => (b.applied_date || '').localeCompare(a.applied_date || ''))
  return (
    <>
      <PageIntro
        eyebrow="YOUR NEXT CHAPTER"
        title="Make your next move."
        description="Keep track of opportunities, conversations, and what comes next."
      >
        <button
          className="btn"
          disabled={jobs.isLoading || !!jobs.error}
          onClick={() => setEditor({ status: 'saved', applied_date: today })}
        >
          <Plus size={15} />
          Add a job
        </button>
      </PageIntro>
      <DataNotice queries={[jobs]} />
      <div className="summary-strip">
        <div className="summary-item">
          <span className="eyebrow">OPEN OPPORTUNITIES</span>
          <strong>{active.length}</strong>
          <p>Saved, applied, and in progress</p>
        </div>
        <div className="summary-item">
          <span className="eyebrow">NEXT ACTIONS</span>
          <strong>{due.length}</strong>
          <p>Follow-ups due or interviews today</p>
        </div>
        <div className="summary-item">
          <span className="eyebrow">INTERVIEWS</span>
          <strong>
            {
              active.filter((j) =>
                ['interview', 'technical'].includes(j.status),
              ).length
            }
          </strong>
          <p>Currently at interview stage</p>
        </div>
      </div>
      <div className="section-row" style={{ flexWrap: 'wrap' }}>
        <div className="skill-tabs" style={{ margin: 0 }}>
          {['active', 'saved', 'applied', 'interview', 'offer', 'all'].map(
            (s) => (
              <button
                key={s}
                className={'chip ' + (filter === s ? 'active' : '')}
                onClick={() => setFilter(s)}
              >
                {s === 'active'
                  ? 'Open'
                  : s === 'all'
                    ? 'All entries'
                    : statuses[s as JobApplicationStatus]}
              </button>
            ),
          )}
        </div>
        <input
          aria-label="Search jobs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search company or role…"
        />
      </div>
      {!filtered.length ? (
        <Empty>
          <Briefcase size={26} style={{ margin: '0 auto 12px' }} />
          {jobs.rows.length
            ? 'No jobs match this view.'
            : 'Found a role you like? Save it here and choose your next step.'}
        </Empty>
      ) : (
        <div className="job-grid">
          {filtered.map((j) => (
            <article className="job-card" key={j.id}>
              <div className="session-heading">
                <span className="company">{j.company}</span>
                <span
                  className={
                    'pill ' +
                    (['rejected', 'withdrawn'].includes(j.status) ? 'warm' : '')
                  }
                >
                  {statuses[j.status]}
                </span>
              </div>
              <h3>{j.role}</h3>
              {j.location && <p className="muted">{j.location}</p>}
              <div className="job-dates">
                <p>
                  {j.status === 'saved' ? 'Saved' : 'Application date'} ·{' '}
                  {j.applied_date}
                </p>
                {j.follow_up_date && (
                  <p
                    style={{
                      color:
                        j.follow_up_date <= today ? 'var(--accent)' : undefined,
                    }}
                  >
                    Follow up · {j.follow_up_date}
                    {j.follow_up_date < today ? ' · Overdue' : ''}
                  </p>
                )}
                {j.interview_date && <p>Interview · {j.interview_date}</p>}
              </div>
              {j.notes && (
                <details>
                  <summary>Notes</summary>
                  <p
                    className="muted"
                    style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
                  >
                    {j.notes}
                  </p>
                </details>
              )}
              <footer>
                <div>
                  {safeLink(j.job_url) && (
                    <a
                      className="text-link"
                      href={safeLink(j.job_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View role <ExternalLink size={12} />
                    </a>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 7 }}>
                  <button className="text-link" onClick={() => setEditor(j)}>
                    <Pencil size={12} />
                    Update
                  </button>
                  <button
                    className="icon-btn"
                    aria-label={'Delete ' + j.company + ' application'}
                    onClick={() => setDeleting(j.id)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </footer>
            </article>
          ))}
        </div>
      )}
      {editor && (
        <Dialog
          title={editor.id ? 'Update your application' : 'Save an opportunity'}
          onClose={() => setEditor(null)}
        >
          <Form
            busy={jobs.busy}
            onSubmit={async (data) => {
              const company = textValue(data, 'company'),
                role = textValue(data, 'role'),
                url = textValue(data, 'url')
              if (!company || !role)
                throw new Error('Enter the company and role.')
              if (url && !safeLink(url))
                throw new Error('Use a full http:// or https:// job link.')
              await jobs.save({
                ...editor,
                company,
                role,
                job_url: url || null,
                status: textValue(data, 'status') as JobApplicationStatus,
                applied_date: textValue(data, 'applied'),
                location: textValue(data, 'location'),
                notes: textValue(data, 'notes'),
                follow_up_date: textValue(data, 'followup') || null,
                interview_date: textValue(data, 'interview') || null,
              })
              setEditor(null)
            }}
          >
            <div className="form-grid">
              <Field label="Company">
                <input
                  autoFocus
                  required
                  name="company"
                  defaultValue={editor.company}
                />
              </Field>
              <Field label="Role">
                <input required name="role" defaultValue={editor.role} />
              </Field>
            </div>
            <Field label="Job link (optional)">
              <input
                type="url"
                name="url"
                placeholder="https://…"
                defaultValue={editor.job_url || ''}
              />
            </Field>
            <div className="form-grid">
              <Field label="Status">
                <select name="status" defaultValue={editor.status}>
                  {Object.entries(statuses).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Saved / application date">
                <input
                  required
                  type="date"
                  name="applied"
                  max={today}
                  defaultValue={editor.applied_date}
                />
              </Field>
            </div>
            <div className="form-grid">
              <Field label="Next follow-up (optional)">
                <input
                  type="date"
                  name="followup"
                  defaultValue={editor.follow_up_date || ''}
                />
              </Field>
              <Field label="Interview date (optional)">
                <input
                  type="date"
                  name="interview"
                  defaultValue={editor.interview_date || ''}
                />
              </Field>
            </div>
            <Field label="Location (optional)">
              <input name="location" defaultValue={editor.location || ''} />
            </Field>
            <Field label="Notes">
              <textarea
                name="notes"
                rows={3}
                placeholder="Next step, contact, interview preparation…"
                defaultValue={editor.notes || ''}
              />
            </Field>
            <p className="muted">
              Follow-ups and interviews appear in Today. Clear or move a
              follow-up date after taking action.
            </p>
          </Form>
        </Dialog>
      )}
      {deleting && (
        <Dialog
          title="Delete this application?"
          onClose={() => setDeleting(null)}
        >
          <Form
            submit="Delete application"
            onCancel={() => setDeleting(null)}
            onSubmit={async () => {
              await jobs.remove(deleting)
              setDeleting(null)
            }}
          >
            <p className="muted">
              This removes the selected job and its notes.
            </p>
          </Form>
        </Dialog>
      )}
    </>
  )
}
