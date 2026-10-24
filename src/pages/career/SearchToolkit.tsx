import { useEffect, useRef, useState } from 'react'
import {
  ArrowUpRight,
  Check,
  Copy,
  FileText,
  Globe2,
  Hash,
  Pencil,
  Pin,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { useRecords } from '../../features/life/data'
import {
  DataNotice,
  Dialog,
  Field,
  Form,
  textValue,
  ignoreHandled,
} from '../../features/life/ui'
import { safeLink } from '../../features/life/helpers'
import {
  prepareJobResource,
  resourceCopyText,
  sortedResources,
} from '../../features/life/jobSearch'
import { useToast } from '../../context/ToastContext'
import type { JobSearchResource } from '../../types'
const kinds = {
  keyword: 'Search keywords',
  platform: 'Platforms & links',
  note: 'Notes & snippets',
}
const singular = { keyword: 'keyword', platform: 'platform', note: 'note' }
const icons = { keyword: Hash, platform: Globe2, note: FileText }

export function SearchToolkit() {
  const resources = useRecords('job_search_resources')
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [editor, setEditor] = useState<Partial<JobSearchResource> | null>(null)
  const [deleting, setDeleting] = useState<JobSearchResource | null>(null)
  const [copied, setCopied] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )
  const visible = sortedResources(resources.rows, query)
  const unavailable = resources.isLoading || !!resources.error || resources.busy
  async function copy(resource: JobSearchResource) {
    try {
      await navigator.clipboard.writeText(resourceCopyText(resource))
      if (timer.current) clearTimeout(timer.current)
      setCopied(resource.id)
      timer.current = setTimeout(() => setCopied(''), 2000)
    } catch {
      toast.error(
        'Could not copy automatically. Open Edit to select and copy the text.',
      )
    }
  }
  return (
    <div className="search-toolkit">
      <DataNotice queries={[resources]} />
      <div className="jobs-section-heading">
        <div>
          <h2>Your search, ready to go.</h2>
          <p>Keep the words, websites, and notes you reach for every day.</p>
        </div>
        <label className="jobs-search">
          <Search size={16} />
          <input
            aria-label="Search toolkit"
            placeholder="Find a keyword, link, or note…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      <p className="sr-only" role="status">
        {copied ? 'Copied to clipboard.' : ''}
      </p>
      <div className="toolkit-grid">
        {(Object.keys(kinds) as JobSearchResource['kind'][]).map((kind) => {
          const Icon = icons[kind]
          const entries = visible.filter((r) => r.kind === kind)
          return (
            <section className={'toolkit-panel toolkit-' + kind} key={kind}>
              <header>
                <div className="toolkit-heading">
                  <span className="toolkit-icon">
                    <Icon size={19} />
                  </span>
                  <div>
                    <h3>{kinds[kind]}</h3>
                    <p>
                      {kind === 'keyword'
                        ? 'Your role titles, skills, and search phrases.'
                        : kind === 'platform'
                          ? 'Job boards, company pages, and saved search URLs.'
                          : 'Outreach drafts, interview prep, and useful details.'}
                    </p>
                  </div>
                </div>
                <button
                  className="text-link"
                  disabled={unavailable}
                  onClick={() =>
                    setEditor({
                      kind,
                      title: '',
                      content: '',
                      url: '',
                      is_pinned: false,
                    })
                  }
                >
                  <Plus size={14} /> Add {singular[kind]}
                </button>
              </header>
              {entries.length ? (
                <div className="toolkit-entries">
                  {entries.map((resource) => {
                    const url = safeLink(resource.url)
                    return (
                      <article
                        className={
                          'toolkit-entry ' +
                          (resource.is_pinned ? 'pinned' : '')
                        }
                        key={resource.id}
                      >
                        <div className="toolkit-entry-main">
                          <div className="toolkit-entry-title">
                            {resource.is_pinned && (
                              <Pin size={12} aria-label="Pinned" />
                            )}
                            {kind === 'platform' && url ? (
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {resource.title}
                                <ArrowUpRight size={15} />
                              </a>
                            ) : (
                              <h4>{resource.title}</h4>
                            )}
                          </div>
                          {kind === 'platform' && url && (
                            <span className="toolkit-host">
                              {new URL(url).hostname}
                            </span>
                          )}
                          {resource.content &&
                            (kind === 'note' ? (
                              <details>
                                <summary>Read note</summary>
                                <p>{resource.content}</p>
                              </details>
                            ) : (
                              <p>{resource.content}</p>
                            ))}
                        </div>
                        <div className="toolkit-entry-actions">
                          <button
                            className="text-link"
                            onClick={() => void copy(resource)}
                            aria-label={`Copy ${resource.title}`}
                          >
                            {copied === resource.id ? (
                              <Check size={13} />
                            ) : (
                              <Copy size={13} />
                            )}
                            {copied === resource.id
                              ? 'Copied'
                              : kind === 'platform'
                                ? 'Copy link'
                                : 'Copy'}
                          </button>
                          <button
                            className={
                              'icon-btn ' +
                              (resource.is_pinned ? 'is-pinned' : '')
                            }
                            aria-label={`${resource.is_pinned ? 'Unpin' : 'Pin'} ${resource.title}`}
                            aria-pressed={resource.is_pinned}
                            disabled={unavailable}
                            onClick={() =>
                              ignoreHandled(
                                resources.save({
                                  ...resource,
                                  is_pinned: !resource.is_pinned,
                                }),
                              )
                            }
                          >
                            <Pin size={13} />
                          </button>
                          <button
                            className="icon-btn"
                            aria-label={`Edit ${resource.title}`}
                            disabled={unavailable}
                            onClick={() => setEditor(resource)}
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            className="icon-btn"
                            aria-label={`Delete ${resource.title}`}
                            disabled={unavailable}
                            onClick={() => setDeleting(resource)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </article>
                    )
                  })}
                </div>
              ) : (
                <div className="toolkit-empty">
                  <Icon size={25} />
                  <p>
                    {query
                      ? 'No matches in this section.'
                      : kind === 'keyword'
                        ? 'Save a phrase once. Copy it into your next search.'
                        : kind === 'platform'
                          ? 'Keep your favourite places to look for work together.'
                          : 'Give your useful notes a home.'}
                  </p>
                </div>
              )}
            </section>
          )
        })}
      </div>
      {editor && (
        <Dialog
          title={
            editor.id ? 'Edit search resource' : 'Add to your search toolkit'
          }
          onClose={() => setEditor(null)}
        >
          <Form
            busy={resources.busy}
            onSubmit={async (data) => {
              const fields = prepareJobResource({
                kind: editor.kind || 'keyword',
                title: textValue(data, 'title'),
                content: textValue(data, 'content'),
                url: textValue(data, 'url'),
                is_pinned: data.get('pinned') === 'on',
              })
              await resources.save({ ...editor, ...fields })
              setEditor(null)
            }}
          >
            <Field label="Type">
              <select
                value={editor.kind || 'keyword'}
                onChange={(e) =>
                  setEditor({
                    ...editor,
                    kind: e.target.value as JobSearchResource['kind'],
                  })
                }
              >
                {Object.entries(kinds).map(([kind, label]) => (
                  <option value={kind} key={kind}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label={
                editor.kind === 'keyword' ? 'Keyword or search phrase' : 'Name'
              }
            >
              <input
                name="title"
                required
                maxLength={200}
                defaultValue={editor.title}
                placeholder={
                  editor.kind === 'keyword'
                    ? 'e.g. Junior frontend developer'
                    : editor.kind === 'platform'
                      ? 'e.g. Company careers page'
                      : 'e.g. My introduction'
                }
              />
            </Field>
            {editor.kind === 'platform' && (
              <Field label="Platform or search URL">
                <input
                  name="url"
                  type="url"
                  required
                  value={editor.url || ''}
                  onChange={(e) =>
                    setEditor({ ...editor, url: e.target.value })
                  }
                  placeholder="https://…"
                />
                <small>
                  You can save a search URL with your filters already applied.
                </small>
              </Field>
            )}
            <Field
              label={
                editor.kind === 'note'
                  ? 'Note or reusable text'
                  : 'Notes (optional)'
              }
            >
              <textarea
                name="content"
                rows={editor.kind === 'note' ? 6 : 3}
                maxLength={10000}
                defaultValue={editor.content}
                placeholder={
                  editor.kind === 'keyword'
                    ? 'Where this search works well, location filters…'
                    : editor.kind === 'platform'
                      ? 'What you use this site for…'
                      : 'Write something you want to keep or copy again.'
                }
              />
            </Field>
            <label className="check-status">
              <input
                name="pinned"
                type="checkbox"
                defaultChecked={editor.is_pinned}
              />{' '}
              Pin to the top
            </label>
          </Form>
        </Dialog>
      )}
      {deleting && (
        <Dialog
          title="Remove this search resource?"
          onClose={() => setDeleting(null)}
        >
          <Form
            submit="Remove resource"
            busy={resources.busy}
            onCancel={() => setDeleting(null)}
            onSubmit={async () => {
              await resources.remove(deleting.id)
              setDeleting(null)
            }}
          >
            <p className="muted">
              Remove “{deleting.title}” from your toolkit? Your applications
              will stay as they are.
            </p>
          </Form>
        </Dialog>
      )}
    </div>
  )
}
