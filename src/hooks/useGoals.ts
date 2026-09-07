import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { repository } from '../lib/repository'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import type { Goal } from '../types'

export function useGoals() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()
  const userId = user?.id || ''

  const goalsQuery = useQuery({
    queryKey: ['goals', userId],
    queryFn: () => repository.listGoals(userId),
    enabled: Boolean(userId),
  })

  const createMutation = useMutation({
    mutationFn: (newGoal: Omit<Goal, 'id' | 'created_at' | 'updated_at' | 'user_id'>) =>
      repository.createGoal({ ...newGoal, user_id: userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals', userId] })
      success('Goal created ✓')
    },
    onError: (err) => toastError('Failed to create goal: ' + (err as Error).message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ goalId, data }: { goalId: string; data: Partial<Goal> }) =>
      repository.updateGoal(userId, goalId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals', userId] })
      success('Goal updated ✓')
    },
    onError: (err) => toastError('Failed to update goal: ' + (err as Error).message),
  })

  const deleteMutation = useMutation({
    mutationFn: (goalId: string) => repository.deleteGoal(userId, goalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals', userId] })
      success('Goal deleted')
    },
    onError: (err) => toastError('Failed to delete goal: ' + (err as Error).message),
  })

  const goals = goalsQuery.data || []
  const activeGoals = goals.filter((g) => g.status === 'active')
  const completedGoals = goals.filter((g) => g.status === 'completed')
  const pausedGoals = goals.filter((g) => g.status === 'paused')

  return {
    goals,
    activeGoals,
    completedGoals,
    pausedGoals,
    isLoading: goalsQuery.isLoading,
    createGoal: createMutation.mutateAsync,
    updateGoal: (goalId: string, data: Partial<Goal>) =>
      updateMutation.mutateAsync({ goalId, data }),
    deleteGoal: deleteMutation.mutateAsync,
  }
}
