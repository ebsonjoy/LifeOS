import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { repository } from '../lib/repository'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import type { Income, Expense } from '../types'

export function useFinance() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()
  const userId = user?.id || ''

  const financeQuery = useQuery({
    queryKey: ['finances', userId],
    queryFn: () => repository.listFinances(userId),
    enabled: Boolean(userId),
  })

  const addIncomeMutation = useMutation({
    mutationFn: (income: Omit<Income, 'id' | 'created_at' | 'user_id'>) =>
      repository.addIncome({ ...income, user_id: userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finances', userId] })
      success('Income logged ✓')
    },
    onError: (err) => toastError('Failed to add income: ' + (err as Error).message),
  })

  const deleteIncomeMutation = useMutation({
    mutationFn: (id: string) => repository.deleteIncome(userId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finances', userId] })
      success('Income deleted')
    },
    onError: (err) => toastError('Failed to delete income: ' + (err as Error).message),
  })

  const addExpenseMutation = useMutation({
    mutationFn: (expense: Omit<Expense, 'id' | 'created_at' | 'user_id'>) =>
      repository.addExpense({ ...expense, user_id: userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finances', userId] })
      success('Expense logged ✓')
    },
    onError: (err) => toastError('Failed to add expense: ' + (err as Error).message),
  })

  const deleteExpenseMutation = useMutation({
    mutationFn: (id: string) => repository.deleteExpense(userId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finances', userId] })
      success('Expense deleted')
    },
    onError: (err) => toastError('Failed to delete expense: ' + (err as Error).message),
  })

  const incomes = financeQuery.data?.incomes || []
  const expenses = financeQuery.data?.expenses || []

  // Current month totals
  const currentMonthStr = new Date().toISOString().slice(0, 7) // YYYY-MM
  const monthIncomes = incomes.filter((i) => i.income_date.startsWith(currentMonthStr))
  const monthExpenses = expenses.filter((e) => e.expense_date.startsWith(currentMonthStr))

  const totalIncome = monthIncomes.reduce((acc, curr) => acc + Number(curr.amount), 0)
  const totalExpense = monthExpenses.reduce((acc, curr) => acc + Number(curr.amount), 0)
  const netSavings = totalIncome - totalExpense
  const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100) : 0

  return {
    incomes,
    expenses,
    monthIncomes,
    monthExpenses,
    totalIncome,
    totalExpense,
    netSavings,
    savingsRate: Number(savingsRate.toFixed(2)),
    isLoading: financeQuery.isLoading,
    addIncome: addIncomeMutation.mutateAsync,
    deleteIncome: deleteIncomeMutation.mutateAsync,
    addExpense: addExpenseMutation.mutateAsync,
    deleteExpense: deleteExpenseMutation.mutateAsync,
  }
}
