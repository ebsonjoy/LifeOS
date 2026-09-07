import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { repository } from '../lib/repository'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import type { JournalEntry } from '../types'

export function useJournal() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()
  const userId = user?.id || ''

  const journalQuery = useQuery({
    queryKey: ['journal', userId],
    queryFn: () => repository.listJournalEntries(userId),
    enabled: Boolean(userId),
  })

  const createMutation = useMutation({
    mutationFn: (entry: Omit<JournalEntry, 'id' | 'created_at' | 'updated_at' | 'user_id'>) =>
      repository.createJournalEntry({ ...entry, user_id: userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal', userId] })
      success('Journal entry written ✓')
    },
    onError: (err) => toastError('Failed to save entry: ' + (err as Error).message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<JournalEntry> }) =>
      repository.updateJournalEntry(userId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal', userId] })
      success('Journal entry updated ✓')
    },
    onError: (err) => toastError('Failed to update entry: ' + (err as Error).message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => repository.deleteJournalEntry(userId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal', userId] })
      success('Journal entry deleted')
    },
    onError: (err) => toastError('Failed to delete entry: ' + (err as Error).message),
  })

  const entries = journalQuery.data || []

  return {
    entries,
    isLoading: journalQuery.isLoading,
    createEntry: createMutation.mutateAsync,
    updateEntry: (id: string, data: Partial<JournalEntry>) =>
      updateMutation.mutateAsync({ id, data }),
    deleteEntry: deleteMutation.mutateAsync,
  }
}
