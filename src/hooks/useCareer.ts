import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { repository } from '../lib/repository'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import type { JobApplication } from '../types'

export function useCareer() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()
  const userId = user?.id || ''

  const jobsQuery = useQuery({
    queryKey: ['job_applications', userId],
    queryFn: () => repository.listJobApplications(userId),
    enabled: Boolean(userId),
  })

  const createMutation = useMutation({
    mutationFn: (app: Omit<JobApplication, 'id' | 'created_at' | 'updated_at' | 'user_id'>) =>
      repository.createJobApplication({ ...app, user_id: userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job_applications', userId] })
      success('Application logged ✓')
    },
    onError: (err) => toastError('Failed to create application: ' + (err as Error).message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<JobApplication> }) =>
      repository.updateJobApplication(userId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job_applications', userId] })
      success('Application updated ✓')
    },
    onError: (err) => toastError('Failed to update application: ' + (err as Error).message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => repository.deleteJobApplication(userId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job_applications', userId] })
      success('Application deleted')
    },
    onError: (err) => toastError('Failed to delete application: ' + (err as Error).message),
  })

  const applications = jobsQuery.data || []

  // Stats
  const totalApps = applications.length
  const interviews = applications.filter((a) =>
    ['interview', 'screening', 'technical', 'offer'].includes(a.status)
  ).length
  const technicalRounds = applications.filter((a) => a.status === 'technical').length
  const offers = applications.filter((a) => a.status === 'offer').length

  return {
    applications,
    stats: {
      totalApps,
      interviews,
      technicalRounds,
      offers,
    },
    isLoading: jobsQuery.isLoading,
    createApplication: createMutation.mutateAsync,
    updateApplication: (id: string, data: Partial<JobApplication>) =>
      updateMutation.mutateAsync({ id, data }),
    deleteApplication: deleteMutation.mutateAsync,
  }
}
