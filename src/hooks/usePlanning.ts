import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { repository } from '../lib/repository'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { getTodayString } from '../lib/dateUtils'
import type { PlannedTask } from '../types'

export function usePlanning(date: string = getTodayString()) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()
  const userId = user?.id || ''

  // Query: Daily plans for the date
  const plansQuery = useQuery({
    queryKey: ['daily_plans', userId, date],
    queryFn: () => repository.listDailyPlans(userId, date),
    enabled: Boolean(userId && date),
  })

  // Toggle completion mutation (optimistic updates for smooth progress changes)
  const toggleTaskMutation = useMutation({
    mutationFn: async ({ taskId, completed }: { taskId: string; completed: boolean }) => {
      return repository.updateDailyPlan(userId, taskId, { completed })
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['daily_plans', userId, date] })
      if (updated.completed) {
        success('Task completed! Progress increased ✓')
      } else {
        success('Task unchecked. Progress updated.')
      }
    },
    onError: (err) => toastError('Failed to update task: ' + (err as Error).message),
  })

  // Create plan task mutation
  const createPlanMutation = useMutation({
    mutationFn: (
      plan: Omit<PlannedTask, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'date' | 'completed'> & {
        date?: string
        completed?: boolean
      }
    ) =>
      repository.createDailyPlan({
        ...plan,
        date: plan.date || date,
        user_id: userId,
        completed: plan.completed ?? false,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily_plans', userId] })
      success('Scheduled task added ✓')
    },
    onError: (err) => toastError('Failed to create task: ' + (err as Error).message),
  })

  // Update plan task mutation (e.g. summary note, times, title)
  const updatePlanMutation = useMutation({
    mutationFn: ({ taskId, updates }: { taskId: string; updates: Partial<PlannedTask> }) =>
      repository.updateDailyPlan(userId, taskId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily_plans', userId, date] })
      success('Plan updated ✓')
    },
    onError: (err) => toastError('Failed to update task: ' + (err as Error).message),
  })

  // Delete plan task mutation
  const deletePlanMutation = useMutation({
    mutationFn: (taskId: string) => repository.deleteDailyPlan(userId, taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily_plans', userId, date] })
      success('Task removed')
    },
    onError: (err) => toastError('Failed to delete task: ' + (err as Error).message),
  })

  const tasks = plansQuery.data || []
  const totalTasks = tasks.length
  const completedTasks = tasks.filter((t) => t.completed).length
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  return {
    tasks,
    totalTasks,
    completedTasks,
    progressPercent,
    isLoading: plansQuery.isLoading,
    toggleTask: (taskId: string, completed: boolean) =>
      toggleTaskMutation.mutate({ taskId, completed }),
    createPlan: createPlanMutation.mutateAsync,
    updatePlan: (taskId: string, updates: Partial<PlannedTask>) =>
      updatePlanMutation.mutateAsync({ taskId, updates }),
    deletePlan: deletePlanMutation.mutateAsync,
    isSubmitting:
      toggleTaskMutation.isPending ||
      createPlanMutation.isPending ||
      updatePlanMutation.isPending ||
      deletePlanMutation.isPending,
  }
}
