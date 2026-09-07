import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { repository } from '../lib/repository'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import type { FitnessLog } from '../types'

export function useFitness() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()
  const userId = user?.id || ''

  const fitnessQuery = useQuery({
    queryKey: ['fitness_logs', userId],
    queryFn: () => repository.listFitnessLogs(userId),
    enabled: Boolean(userId),
  })

  const saveMutation = useMutation({
    mutationFn: (log: Omit<FitnessLog, 'id' | 'created_at' | 'updated_at' | 'user_id'>) =>
      repository.saveFitnessLog({ ...log, user_id: userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fitness_logs', userId] })
      success('Fitness entry saved ✓')
    },
    onError: (err) => toastError('Failed to save fitness log: ' + (err as Error).message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => repository.deleteFitnessLog(userId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fitness_logs', userId] })
      success('Entry deleted')
    },
    onError: (err) => toastError('Failed to delete fitness log: ' + (err as Error).message),
  })

  const logs = fitnessQuery.data || []
  const workouts = logs.filter((l) => l.workout_completed)
  const weightLogs = logs
    .filter((l) => l.weight != null)
    .sort((a, b) => a.date.localeCompare(b.date))

  return {
    logs,
    workouts,
    weightLogs,
    isLoading: fitnessQuery.isLoading,
    saveFitnessLog: saveMutation.mutateAsync,
    deleteFitnessLog: deleteMutation.mutateAsync,
  }
}
