import type { JobApplication, JobSearchResource } from '../../types'
import { safeLink } from './helpers'

export const jobStatuses = {
  saved: 'Saved',
  applied: 'Applied',
  screening: 'Screening',
  interview: 'Interview',
  technical: 'Technical interview',
  offer: 'Offer',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
}
export function isOpenJob(job: JobApplication) {
  return !['rejected', 'withdrawn'].includes(job.status)
}
export function matchesJob(
  job: JobApplication,
  filter: string,
  search: string,
) {
  const statusMatches =
    filter === 'all' ||
    (filter === 'active' && isOpenJob(job)) ||
    (filter === 'interview' &&
      ['interview', 'technical'].includes(job.status)) ||
    filter === job.status
  return (
    statusMatches &&
    `${job.company} ${job.role} ${job.location || ''} ${job.notes || ''}`
      .toLocaleLowerCase()
      .includes(search.trim().toLocaleLowerCase())
  )
}
export function nextJobAction(job: JobApplication, today: string) {
  if (!isOpenJob(job)) return null
  const actions = [
    ...(job.follow_up_date
      ? [{ date: job.follow_up_date, label: 'Follow up' }]
      : []),
    ...(job.interview_date && job.interview_date >= today
      ? [{ date: job.interview_date, label: 'Interview' }]
      : []),
  ]
  return actions.sort((a, b) => a.date.localeCompare(b.date))[0] || null
}
export function prepareJobResource(input: {
  kind: string
  title: string
  content: string
  url: string
  is_pinned: boolean
}) {
  if (!['keyword', 'platform', 'note'].includes(input.kind))
    throw new Error('Choose a resource type.')
  const title = input.title.trim()
  if (!title || title.length > 200)
    throw new Error('Use a title between 1 and 200 characters.')
  const url = input.kind === 'platform' ? safeLink(input.url.trim()) : null
  if (input.kind === 'platform' && !url)
    throw new Error('Enter a full http:// or https:// platform or search link.')
  return {
    kind: input.kind as JobSearchResource['kind'],
    title,
    content: input.content.trim(),
    url: url || null,
    is_pinned: input.is_pinned,
  }
}
export function resourceCopyText(resource: JobSearchResource) {
  return resource.kind === 'platform'
    ? resource.url || ''
    : resource.kind === 'note'
      ? resource.content || resource.title
      : resource.title
}
export function sortedResources(resources: JobSearchResource[], query = '') {
  const search = query.trim().toLocaleLowerCase()
  return resources
    .filter((r) =>
      `${r.title} ${r.content} ${r.url || ''}`
        .toLocaleLowerCase()
        .includes(search),
    )
    .sort(
      (a, b) =>
        Number(b.is_pinned) - Number(a.is_pinned) ||
        b.updated_at.localeCompare(a.updated_at) ||
        a.title.localeCompare(b.title),
    )
}
