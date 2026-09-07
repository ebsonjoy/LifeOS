import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { repository } from '../lib/repository'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { getTodayString } from '../lib/dateUtils'
import type { DailyLog } from '../types'

export function useDailyLog(date: string = getTodayString()) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()
  const userId = user?.id || ''

  const logQuery = useQuery({
    queryKey: ['daily_log', userId, date],
    queryFn: () => repository.getDailyLog(userId, date),
    enabled: Boolean(userId && date),
  })

  const saveMutation = useMutation({
    mutationFn: (data: Partial<DailyLog>) =>
      repository.saveDailyLog({
        user_id: userId,
        date,
        mood: data.mood ?? null,
        daily_score: data.daily_score ?? null,
        screen_time_minutes: data.screen_time_minutes ?? null,
        journal: data.journal ?? null,
        journal_corrected: data.journal_corrected ?? null,
        accomplishments: data.accomplishments ?? null,
        went_wrong: data.went_wrong ?? null,
        improve_tomorrow: data.improve_tomorrow ?? null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily_log', userId, date] })
      queryClient.invalidateQueries({ queryKey: ['daily_logs', userId] })
      success('Daily review saved ✓')
    },
    onError: (err) => toastError('Failed to save daily log: ' + (err as Error).message),
  })

  return {
    dailyLog: logQuery.data,
    isLoading: logQuery.isLoading,
    saveDailyLog: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
  }
}
