import { useState } from 'react'
import { Plus, Briefcase, ExternalLink, Edit2, Trash2, Building, DollarSign } from 'lucide-react'
import { useCareer } from '../../hooks/useCareer'
import { useGoals } from '../../hooks/useGoals'
import { getTodayString } from '../../lib/dateUtils'
import {
  PageHeader,
  Button,
  Card,
  Modal,
  Input,
  Select,
  Textarea,
  StatCard,
  ConfirmDialog,
  Badge,
  EmptyState,
} from '../../components/ui'
import type { JobApplication, JobApplicationStatus } from '../../types'

export function Career() {
  const {
    applications,
    stats,
    createApplication,
    updateApplication,
    deleteApplication,
    isLoading,
  } = useCareer()

  const { goals } = useGoals()
  const careerGoals = goals.filter((g) => g.category === 'career')

  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingJob, setEditingJob] = useState<JobApplication | null>(null)
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null)

  // Form states
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [location, setLocation] = useState('')
  const [salary, setSalary] = useState('')
  const [jobUrl, setJobUrl] = useState('')
  const [status, setStatus] = useState<JobApplicationStatus>('applied')
  const [appliedDate, setAppliedDate] = useState(getTodayString())
  const [notes, setNotes] = useState('')

  const resetForm = () => {
    setCompany('')
    setRole('')
    setLocation('')
    setSalary('')
    setJobUrl('')
    setStatus('applied')
    setAppliedDate(getTodayString())
    setNotes('')
    setEditingJob(null)
  }

  const openEdit = (job: JobApplication) => {
    setEditingJob(job)
    setCompany(job.company)
    setRole(job.role)
    setLocation(job.location || '')
    setSalary(job.salary || '')
    setJobUrl(job.job_url || '')
    setStatus(job.status)
    setAppliedDate(job.applied_date)
    setNotes(job.notes || '')
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editingJob) {
      await updateApplication(editingJob.id, {
        company: company.trim(),
        role: role.trim(),
        location: location.trim() || null,
        salary: salary.trim() || null,
        job_url: jobUrl.trim() || null,
        status,
        applied_date: appliedDate,
        notes: notes.trim() || null,
      })
    } else {
      await createApplication({
        company: company.trim(),
        role: role.trim(),
        location: location.trim() || null,
        salary: salary.trim() || null,
        job_url: jobUrl.trim() || null,
        status,
        applied_date: appliedDate,
        notes: notes.trim() || null,
      })
    }
    resetForm()
    setIsModalOpen(false)
  }

  const filteredApps = applications.filter((a) => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false
    return true
  })

  const statusOptions = [
    { label: 'Saved', value: 'saved' },
    { label: 'Applied', value: 'applied' },
    { label: 'Screening', value: 'screening' },
    { label: 'Interview', value: 'interview' },
    { label: 'Technical Round', value: 'technical' },
    { label: 'Offer Received', value: 'offer' },
    { label: 'Rejected', value: 'rejected' },
    { label: 'Withdrawn', value: 'withdrawn' },
  ]

  const getStatusBadge = (st: JobApplicationStatus) => {
    switch (st) {
      case 'offer':
        return <Badge variant="success">Offer</Badge>
      case 'interview':
      case 'technical':
        return <Badge variant="info">{st}</Badge>
      case 'screening':
        return <Badge variant="warning">Screening</Badge>
      case 'rejected':
        return <Badge variant="danger">Rejected</Badge>
      case 'saved':
        return <Badge variant="default">Saved</Badge>
      default:
        return <Badge variant="default">Applied</Badge>
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-in fade-in duration-300">
      <PageHeader
        title="Career & Opportunities"
        description="Professional growth pipeline, strategic targets, and interview tracker"
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              resetForm()
              setIsModalOpen(true)
            }}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Job Application
          </Button>
        }
      />

      {/* 1. CAREER PIPELINE STATS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total Applications"
          value={stats.totalApps}
          icon={<Briefcase className="w-5 h-5 text-indigo-400" />}
          subValue="Pipeline volume"
        />
        <StatCard
          label="Interviews / Screens"
          value={stats.interviews}
          icon={<Building className="w-5 h-5 text-sky-400" />}
          subValue="Active dialogues"
        />
        <StatCard
          label="Technical Rounds"
          value={stats.technicalRounds}
          icon={<Building className="w-5 h-5 text-purple-400" />}
          subValue="Deep evaluations"
        />
        <StatCard
          label="Offers"
          value={stats.offers}
          icon={<DollarSign className="w-5 h-5 text-emerald-400" />}
          subValue="Offers on table"
        />
      </div>

      {/* 2. CAREER GOALS SECTION */}
      {careerGoals.length > 0 && (
        <Card className="p-5 bg-zinc-900/60 border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3">
            Active Career Goals
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {careerGoals.map((g) => (
              <div
                key={g.id}
                className="p-3.5 rounded-xl bg-zinc-950/40 border border-zinc-800/80 flex flex-col justify-between"
              >
                <div>
                  <h4 className="text-sm font-semibold text-zinc-100">{g.title}</h4>
                  {g.description && <p className="text-xs text-zinc-400 mt-1">{g.description}</p>}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-zinc-400">
                  <span>Target: {g.target_date || 'Ongoing'}</span>
                  <span className="font-mono text-indigo-400 font-semibold">{g.progress}%</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 3. JOB APPLICATIONS TABLE */}
      <Card className="p-5 bg-zinc-900/80 border-zinc-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800">
          <div>
            <h3 className="text-base font-bold text-zinc-100 font-heading">Application Pipeline</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Track interview stages and response times</p>
          </div>

          {/* Status filter tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
              }`}
            >
              All
            </button>
            {statusOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  statusFilter === opt.value
                    ? 'bg-indigo-600 text-white'
                    : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table Content */}
        {isLoading ? (
          <div className="py-8 space-y-3">
            <div className="h-10 bg-zinc-800/40 rounded-xl animate-pulse" />
            <div className="h-10 bg-zinc-800/40 rounded-xl animate-pulse" />
          </div>
        ) : filteredApps.length === 0 ? (
          <EmptyState
            icon={<Briefcase className="w-7 h-7" />}
            title="No applications in this category"
            description="Log your job applications to keep your career pipeline active and structured."
            actionLabel="Add Job Application"
            onAction={() => {
              resetForm()
              setIsModalOpen(true)
            }}
          />
        ) : (
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead className="text-xs uppercase text-zinc-500 font-semibold border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-3">Company & Role</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Applied Date</th>
                  <th className="py-3 px-3">Salary / Loc</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-medium">
                {filteredApps.map((app) => (
                  <tr key={app.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-100">{app.company}</span>
                        {app.job_url && (
                          <a
                            href={app.job_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-zinc-500 hover:text-indigo-400"
                            title="Open posting"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                      <span className="text-xs text-zinc-400 block">{app.role}</span>
                    </td>
                    <td className="py-3 px-3">{getStatusBadge(app.status)}</td>
                    <td className="py-3 px-3 text-xs font-mono text-zinc-400">
                      {app.applied_date}
                    </td>
                    <td className="py-3 px-3 text-xs text-zinc-400">
                      <div>{app.salary || '—'}</div>
                      <div className="text-[11px] text-zinc-500">{app.location || 'Remote'}</div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(app)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingJobId(app.id)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-800"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Application Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          resetForm()
        }}
        title={editingJob ? 'Edit Application' : 'Log Job Application'}
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Company Name"
              placeholder="e.g. Stripe, Linear"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              required
              autoFocus
            />
            <Input
              label="Role"
              placeholder="e.g. Senior Backend Engineer"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Pipeline Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as JobApplicationStatus)}
              options={statusOptions}
            />
            <Input
              label="Applied Date"
              type="date"
              value={appliedDate}
              onChange={(e) => setAppliedDate(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Salary / Comp (Optional)"
              placeholder="e.g. $180k - $220k"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
            />
            <Input
              label="Location (Optional)"
              placeholder="e.g. Remote, San Francisco"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <Input
            label="Job Posting URL"
            type="url"
            placeholder="https://..."
            value={jobUrl}
            onChange={(e) => setJobUrl(e.target.value)}
          />

          <Textarea
            label="Interview Notes / Next Steps"
            placeholder="Points to prepare, recruiter details, system design topics..."
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="flex justify-end gap-2.5 pt-4 border-t border-zinc-800">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsModalOpen(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              {editingJob ? 'Save Changes' : 'Add Application'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deletingJobId)}
        onClose={() => setDeletingJobId(null)}
        onConfirm={async () => {
          if (deletingJobId) {
            await deleteApplication(deletingJobId)
            setDeletingJobId(null)
          }
        }}
        title="Delete Application"
        message="Are you sure you want to delete this job application record?"
        confirmText="Delete"
      />
    </div>
  )
}
