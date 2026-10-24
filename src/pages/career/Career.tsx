import { useState } from 'react'
import {
  Plus,
  ExternalLink,
  Pencil,
  Trash2,
  Briefcase,
  ArrowRight,
  Search,
  Sparkles,
  MapPin,
  CalendarDays,
} from 'lucide-react'
import { useRecords } from '../../features/life/data'
import { safeLink } from '../../features/life/helpers'
import {
  DataNotice,
  Dialog,
  Empty,
  Field,
  Form,
  textValue,
  useToday,
} from '../../features/life/ui'
import type { JobApplication, JobApplicationStatus } from '../../types'
import {
  jobStatuses as statuses,
  isOpenJob,
  matchesJob,
  nextJobAction,
} from '../../features/life/jobSearch'
import { SearchToolkit } from './SearchToolkit'
import './career.css'
export function Career() {
  const jobs = useRecords('job_applications'),
    today = useToday()
  const [view, setView] = useState<'applications' | 'toolkit'>('applications')
  const [filter, setFilter] = useState('active'),
    [search, setSearch] = useState(''),
    [editor, setEditor] = useState<Partial<JobApplication> | null>(null),
    [deleting, setDeleting] = useState<string | null>(null)
  const active = jobs.rows.filter(isOpenJob)
  const actions = active
    .map((job) => ({ job, action: nextJobAction(job, today) }))
    .filter((item) => item.action !== null)
    .sort((a, b) => a.action!.date.localeCompare(b.action!.date))
  const due = actions.filter((item) => item.action!.date <= today)
  const filtered = jobs.rows
    .filter((j) => matchesJob(j, filter, search))
    .sort(
      (a, b) =>
        (b.applied_date || '').localeCompare(a.applied_date || '') ||
        b.updated_at.localeCompare(a.updated_at),
    )
  const shortDate = (date: string) =>
    new Date(date + 'T12:00:00').toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    })
  return (
    <>
      <section className="jobs-hero">
        <div className="jobs-hero-copy">
          <span className="eyebrow">YOUR NEXT CHAPTER</span>
          <h1>
            A little focus.
            <br />
            Your next opportunity.
          </h1>
          <p>A home for your applications, search ideas, and next steps.</p>
          <button
            className="btn"
            disabled={jobs.isLoading || !!jobs.error}
            onClick={() => setEditor({ status: 'saved', applied_date: today })}
          >
            <Plus size={16} /> Add application
          </button>
        </div>
        <div className="jobs-hero-summary" aria-label="Application overview">
          <div>
            <span>IN PLAY</span>
            <strong>
              {jobs.isLoading || jobs.error ? '—' : active.length}
            </strong>
            <p>Open opportunities</p>
          </div>
          <div>
            <span>ON YOUR RADAR</span>
            <strong>{jobs.isLoading || jobs.error ? '—' : due.length}</strong>
            <p>Actions due</p>
          </div>
          <div>
            <span>GETTING CLOSER</span>
            <strong>
              {jobs.isLoading || jobs.error
                ? '—'
                : active.filter((j) =>
                    ['interview', 'technical'].includes(j.status),
                  ).length}
            </strong>
            <p>At interview stage</p>
          </div>
        </div>
      </section>
      <div className="jobs-view-switch" role="group" aria-label="Jobs views">
        <button
          aria-pressed={view === 'applications'}
          className={view === 'applications' ? 'selected' : ''}
          onClick={() => setView('applications')}
        >
          <Briefcase size={16} /> Applications <span>{jobs.rows.length}</span>
        </button>
        <button
          aria-pressed={view === 'toolkit'}
          className={view === 'toolkit' ? 'selected' : ''}
          onClick={() => setView('toolkit')}
        >
          <Sparkles size={16} /> Search toolkit
        </button>
      </div>
      {view === 'toolkit' ? (
        <SearchToolkit />
      ) : (
        <>
          <DataNotice queries={[jobs]} />
          <section className="jobs-next">
            <div className="jobs-section-heading">
              <div>
                <span className="eyebrow">ONE STEP AT A TIME</span>
                <h2>What’s next?</h2>
                <p>Your earliest follow-ups and upcoming interviews.</p>
              </div>
              <button className="text-link" onClick={() => setView('toolkit')}>
                Open search toolkit <ArrowRight size={14} />
              </button>
            </div>
            {actions.length ? (
              <div className="jobs-action-grid">
                {actions.slice(0, 3).map(({ job, action }) => (
                  <button
                    key={job.id}
                    className={
                      'jobs-action ' + (action!.date <= today ? 'due' : '')
                    }
                    onClick={() => setEditor(job)}
                  >
                    <span className="jobs-action-time">
                      <CalendarDays size={13} />
                      {action!.date < today
                        ? 'Overdue'
                        : action!.date === today
                          ? 'Today'
                          : shortDate(action!.date)}
                    </span>
                    <strong>
                      {action!.label} · {job.company}
                    </strong>
                    <span>{job.role}</span>
                    <span className="jobs-action-open">
                      Review next step <ArrowRight size={13} />
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="jobs-action-empty">
                <CalendarDays size={21} />
                <p>
                  {jobs.rows.length
                    ? 'You have no follow-ups or interviews scheduled. Add a next step to an application when you’re ready.'
                    : 'Save your first opportunity, or collect a few search ideas in your toolkit.'}
                </p>
              </div>
            )}
          </section>
          <div className="jobs-section-heading">
            <div>
              <h2>Your applications</h2>
              <p>A clear view of where every conversation stands.</p>
            </div>
            <span className="jobs-result-count">
              {filtered.length}{' '}
              {filtered.length === 1 ? 'opportunity' : 'opportunities'}
            </span>
          </div>
          <div className="section-row" style={{ flexWrap: 'wrap' }}>
            <div className="skill-tabs" style={{ margin: 0 }}>
              {['active', 'saved', 'applied', 'interview', 'offer', 'all'].map(
                (s) => (
                  <button
                    key={s}
                    className={'chip ' + (filter === s ? 'active' : '')}
                    aria-pressed={filter === s}
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
            <label className="jobs-search">
              <Search size={16} />
              <input
                aria-label="Search jobs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Company, role, location…"
              />
            </label>
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
                <article className="job-card premium-job-card" key={j.id}>
                  <div className="session-heading">
                    <div className="job-company">
                      <span className="job-monogram" aria-hidden="true">
                        {j.company.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="company">{j.company}</span>
                    </div>
                    <span
                      className={
                        'pill ' +
                        (['rejected', 'withdrawn'].includes(j.status)
                          ? 'warm'
                          : '')
                      }
                    >
                      {statuses[j.status]}
                    </span>
                  </div>
                  <h3>{j.role}</h3>
                  {j.location && (
                    <p className="job-location">
                      <MapPin size={13} />
                      {j.location}
                    </p>
                  )}
                  {j.salary && <p className="job-compensation">{j.salary}</p>}
                  <div className="job-dates">
                    <p>
                      {j.status === 'saved' ? 'Saved' : 'Application date'} ·{' '}
                      {j.applied_date}
                    </p>
                    {j.follow_up_date && isOpenJob(j) && (
                      <p
                        style={{
                          color:
                            j.follow_up_date <= today
                              ? 'var(--accent)'
                              : undefined,
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
                        style={{
                          whiteSpace: 'pre-wrap',
                          overflowWrap: 'anywhere',
                        }}
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
                      <button
                        className="text-link"
                        onClick={() => setEditor(j)}
                      >
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
        </>
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
                salary: textValue(data, 'salary') || null,
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
            <Field label="Salary or range (optional)">
              <input
                name="salary"
                defaultValue={editor.salary || ''}
                placeholder="As listed in the role"
              />
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
            busy={jobs.busy}
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
