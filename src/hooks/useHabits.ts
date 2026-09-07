import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { repository } from '../lib/repository'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { getTodayString } from '../lib/dateUtils'
import type { Habit } from '../types'

export function useHabits(dateRange?: { startDate?: string; endDate?: string }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()
  const userId = user?.id || ''

  // Query: All active habits
  const habitsQuery = useQuery({
    queryKey: ['habits', userId],
    queryFn: () => repository.listHabits(userId),
    enabled: Boolean(userId),
  })

  // Query: Habit logs
  const logsQuery = useQuery({
    queryKey: ['habit_logs', userId, dateRange?.startDate, dateRange?.endDate],
    queryFn: () => repository.listHabitLogs(userId, dateRange?.startDate, dateRange?.endDate),
    enabled: Boolean(userId),
  })

  // Toggle habit log mutation (instant optimistic updates)
  const toggleMutation = useMutation({
    mutationFn: async ({
      habitId,
      date,
      completed,
      value = 1,
    }: {
      habitId: string
      date: string
      completed: boolean
      value?: number
    }) => {
      return repository.toggleHabitLog(userId, habitId, date, completed, value)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['habit_logs', userId] })
      queryClient.invalidateQueries({ queryKey: ['daily_log', userId, variables.date] })
      queryClient.invalidateQueries({ queryKey: ['daily_logs', userId] })
      if (variables.completed) {
        success('Habit completed ✓')
      }
    },
    onError: (err) => {
      toastError('Failed to update habit: ' + (err as Error).message)
    },
  })

  // Create habit mutation
  const createMutation = useMutation({
    mutationFn: (newHabit: Omit<Habit, 'id' | 'created_at' | 'updated_at' | 'user_id'>) =>
      repository.createHabit({ ...newHabit, user_id: userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits', userId] })
      success('Habit created ✓')
    },
    onError: (err) => toastError('Failed to create habit: ' + (err as Error).message),
  })

  // Update habit mutation
  const updateMutation = useMutation({
    mutationFn: ({ habitId, data }: { habitId: string; data: Partial<Habit> }) =>
      repository.updateHabit(userId, habitId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits', userId] })
      success('Habit updated ✓')
    },
    onError: (err) => toastError('Failed to update habit: ' + (err as Error).message),
  })

  // Delete habit mutation
  const deleteMutation = useMutation({
    mutationFn: (habitId: string) => repository.deleteHabit(userId, habitId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits', userId] })
      queryClient.invalidateQueries({ queryKey: ['habit_logs', userId] })
      success('Habit deleted')
    },
    onError: (err) => toastError('Failed to delete habit: ' + (err as Error).message),
  })

  // Helpers
  const habits = habitsQuery.data || []
  const logs = logsQuery.data || []
  const todayStr = getTodayString()

  const todayLogsMap = new Map<string, boolean>()
  logs
    .filter((l) => l.date === todayStr)
    .forEach((l) => todayLogsMap.set(l.habit_id, l.completed))

  const activeHabits = habits.filter((h) => h.is_active)
  const todayCompletedCount = activeHabits.filter((h) => todayLogsMap.get(h.id)).length
  const todayScore =
    activeHabits.length > 0 ? Math.round((todayCompletedCount / activeHabits.length) * 100) : 0

  return {
    habits,
    activeHabits,
    logs,
    todayLogsMap,
    todayCompletedCount,
    todayScore,
    isLoading: habitsQuery.isLoading || logsQuery.isLoading,
    toggleHabit: (habitId: string, completed: boolean, date: string = todayStr, value: number = 1) =>
      toggleMutation.mutate({ habitId, date, completed, value }),
    createHabit: createMutation.mutateAsync,
    updateHabit: (habitId: string, data: Partial<Habit>) =>
      updateMutation.mutateAsync({ habitId, data }),
    deleteHabit: deleteMutation.mutateAsync,
    isSubmitting:
      toggleMutation.isPending ||
      createMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending,
  }
}
