import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import {
  listRecords,
  saveRecord,
  removeRecord,
  SchemaUpdateRequired,
} from './records'
import type { Records, Table } from './records'
export { listRecords } from './records'
export type { Table } from './records'

export function useRecords<K extends Table>(
  table: K,
  refetchInterval?: number,
) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { error: showError } = useToast()
  const userId = user?.id || ''
  const query = useQuery({
    queryKey: ['life', userId, table],
    queryFn: () => listRecords(table, userId),
    enabled: !!userId,
    refetchInterval,
    retry: (attempt, error) =>
      !(error instanceof SchemaUpdateRequired) && attempt < 1,
  })
  const changed = () => {
    void queryClient.invalidateQueries({ queryKey: ['life', userId, table] })
    void queryClient.invalidateQueries({ queryKey: [table, userId] })
  }
  const save = useMutation({
    mutationFn: (row: Partial<Records[K]>) => saveRecord(table, userId, row),
    onSuccess: changed,
    onError: (e: Error) => showError(e.message),
  })
  const remove = useMutation({
    mutationFn: (id: string) => removeRecord(table, userId, id),
    onSuccess: changed,
    onError: (e: Error) => showError(e.message),
  })
  return {
    ...query,
    rows: query.data || [],
    save: save.mutateAsync,
    remove: remove.mutateAsync,
    busy: save.isPending || remove.isPending,
  }
}
