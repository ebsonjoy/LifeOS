import { useState, useMemo } from 'react'
import { Plus, Wallet, ArrowDownRight, ArrowUpRight, Percent, Trash2 } from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'
import { useFinance } from '../../hooks/useFinance'
import { getTodayString } from '../../lib/dateUtils'
import {
  PageHeader,
  Button,
  Card,
  Modal,
  Input,
  StatCard,
  ConfirmDialog,
  Badge,
  EmptyState,
} from '../../components/ui'

export function Finance() {
  const {
    incomes,
    expenses,
    monthIncomes,
    monthExpenses,
    totalIncome,
    totalExpense,
    netSavings,
    savingsRate,
    addIncome,
    deleteIncome,
    addExpense,
    deleteExpense,
    isLoading,
  } = useFinance()

  const [activeTab, setActiveTab] = useState<'expenses' | 'income'>('expenses')
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false)
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false)
  const [deletingItem, setDeletingItem] = useState<{ id: string; type: 'income' | 'expense' } | null>(
    null
  )

  // Income form
  const [incAmount, setIncAmount] = useState('')
  const [incSource, setIncSource] = useState('')
  const [incDate, setIncDate] = useState(getTodayString())

  // Expense form
  const [expAmount, setExpAmount] = useState('')
  const [expCategory, setExpCategory] = useState('')
  const [expDesc, setExpDesc] = useState('')
  const [expDate, setExpDate] = useState(getTodayString())

  const handleAddIncome = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!incAmount || !incSource) return
    await addIncome({
      amount: parseFloat(incAmount),
      source: incSource.trim(),
      income_date: incDate,
    })
    setIncAmount('')
    setIncSource('')
    setIsIncomeModalOpen(false)
  }

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!expAmount || !expCategory) return
    await addExpense({
      amount: parseFloat(expAmount),
      category: expCategory.trim(),
      description: expDesc.trim() || null,
      expense_date: expDate,
    })
    setExpAmount('')
    setExpCategory('')
    setExpDesc('')
    setIsExpenseModalOpen(false)
  }

  // Monthly breakdown chart data
  const chartData = useMemo(() => {
    return [
      { name: 'Income', amount: totalIncome, fill: '#10b981' },
      { name: 'Expenses', amount: totalExpense, fill: '#f43f5e' },
      { name: 'Savings', amount: Math.max(0, netSavings), fill: '#6366f1' },
    ]
  }, [totalIncome, totalExpense, netSavings])

  const formatCurrency = (val: number) => {
    return '$' + val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-in fade-in duration-300">
      <PageHeader
        title="Personal Finances"
        description="Cashflow, monthly burn rate, and capital accumulation for life autonomy"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsIncomeModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4 text-emerald-400" />}
            >
              Add Income
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsExpenseModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Log Expense
            </Button>
          </div>
        }
      />

      {/* 1. MONTHLY FINANCIAL METRICS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="This Month's Income"
          value={formatCurrency(totalIncome)}
          icon={<ArrowUpRight className="w-5 h-5 text-emerald-400" />}
          subValue={`${monthIncomes.length} inflow entries`}
        />
        <StatCard
          label="This Month's Expenses"
          value={formatCurrency(totalExpense)}
          icon={<ArrowDownRight className="w-5 h-5 text-rose-400" />}
          subValue={`${monthExpenses.length} expense entries`}
        />
        <StatCard
          label="Net Savings"
          value={formatCurrency(netSavings)}
          icon={<Wallet className="w-5 h-5 text-indigo-400" />}
          subValue={netSavings >= 0 ? 'Positive balance' : 'Deficit'}
        />
        <StatCard
          label="Savings Rate"
          value={`${savingsRate}%`}
          icon={<Percent className="w-5 h-5 text-amber-400" />}
          subValue="Target: 50%+"
        />
      </div>

      {/* 2. MONTHLY CASHFLOW VISUALIZATION */}
      <Card className="p-6 bg-zinc-900/80 border-zinc-800">
        <h3 className="text-base font-bold text-zinc-100 font-heading mb-1">
          Monthly Cashflow Comparison
        </h3>
        <p className="text-xs text-zinc-400 mb-6">
          Real-time snapshot of your income, expenses, and retained capital
        </p>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <XAxis
                dataKey="name"
                stroke="#71717a"
                fontSize={12}
                tickLine={false}
                axisLine={{ stroke: '#27272a' }}
              />
              <YAxis
                stroke="#71717a"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#27272a' }}
                tickFormatter={(val) => `$${val}`}
              />
              <Tooltip
                cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload
                    return (
                      <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-2.5 shadow-xl text-xs">
                        <p className="font-semibold text-zinc-200">{d.name}</p>
                        <p className="font-mono font-bold text-indigo-400 mt-1">
                          {formatCurrency(d.amount)}
                        </p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Bar dataKey="amount" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* 3. TRANSACTION LEDGER */}
      <Card className="p-5 bg-zinc-900/80 border-zinc-800">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('expenses')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'expenses'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Expenses ({expenses.length})
            </button>
            <button
              onClick={() => setActiveTab('income')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'income'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Income Streams ({incomes.length})
            </button>
          </div>
        </div>

        {/* Ledger List */}
        {isLoading ? (
          <div className="py-8 space-y-3">
            <div className="h-10 bg-zinc-800/40 rounded-xl animate-pulse" />
            <div className="h-10 bg-zinc-800/40 rounded-xl animate-pulse" />
          </div>
        ) : activeTab === 'expenses' ? (
          expenses.length === 0 ? (
            <EmptyState
              icon={<Wallet className="w-7 h-7" />}
              title="No expenses logged yet"
              description="Keep track of every dollar leaving your accounts."
              actionLabel="Log First Expense"
              onAction={() => setIsExpenseModalOpen(true)}
            />
          ) : (
            <div className="divide-y divide-zinc-800/60 mt-2">
              {expenses.map((exp) => (
                <div
                  key={exp.id}
                  className="flex items-center justify-between py-3 px-2 hover:bg-zinc-800/30 rounded-xl transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-zinc-100">{exp.category}</span>
                      <Badge variant="default" size="sm">
                        {exp.expense_date}
                      </Badge>
                    </div>
                    {exp.description && (
                      <p className="text-xs text-zinc-400">{exp.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="font-mono font-bold text-sm text-rose-400">
                      -{formatCurrency(Number(exp.amount))}
                    </span>
                    <button
                      onClick={() => setDeletingItem({ id: exp.id, type: 'expense' })}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : incomes.length === 0 ? (
          <EmptyState
            icon={<Wallet className="w-7 h-7" />}
            title="No income logged yet"
            description="Log paychecks, consulting, or investment returns."
            actionLabel="Add Income"
            onAction={() => setIsIncomeModalOpen(true)}
          />
        ) : (
          <div className="divide-y divide-zinc-800/60 mt-2">
            {incomes.map((inc) => (
              <div
                key={inc.id}
                className="flex items-center justify-between py-3 px-2 hover:bg-zinc-800/30 rounded-xl transition-colors"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-zinc-100">{inc.source}</span>
                    <Badge variant="default" size="sm">
                      {inc.income_date}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="font-mono font-bold text-sm text-emerald-400">
                    +{formatCurrency(Number(inc.amount))}
                  </span>
                  <button
                    onClick={() => setDeletingItem({ id: inc.id, type: 'income' })}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Income Modal */}
      <Modal
        isOpen={isIncomeModalOpen}
        onClose={() => setIsIncomeModalOpen(false)}
        title="Add Income Stream"
        maxWidth="sm"
      >
        <form onSubmit={handleAddIncome} className="space-y-4">
          <Input
            label="Amount ($)"
            type="number"
            step="any"
            placeholder="e.g. 5000"
            value={incAmount}
            onChange={(e) => setIncAmount(e.target.value)}
            required
            autoFocus
          />
          <Input
            label="Income Source"
            placeholder="e.g. Software Engineering Salary"
            value={incSource}
            onChange={(e) => setIncSource(e.target.value)}
            required
          />
          <Input
            label="Date"
            type="date"
            value={incDate}
            onChange={(e) => setIncDate(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsIncomeModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Income
            </Button>
          </div>
        </form>
      </Modal>

      {/* Expense Modal */}
      <Modal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        title="Log Expense"
        maxWidth="sm"
      >
        <form onSubmit={handleAddExpense} className="space-y-4">
          <Input
            label="Amount ($)"
            type="number"
            step="any"
            placeholder="e.g. 85"
            value={expAmount}
            onChange={(e) => setExpAmount(e.target.value)}
            required
            autoFocus
          />
          <Input
            label="Category"
            placeholder="e.g. Groceries, Gym, Software Subscriptions"
            value={expCategory}
            onChange={(e) => setExpCategory(e.target.value)}
            required
          />
          <Input
            label="Description (Optional)"
            placeholder="e.g. Healthy meal prep ingredients"
            value={expDesc}
            onChange={(e) => setExpDesc(e.target.value)}
          />
          <Input
            label="Date"
            type="date"
            value={expDate}
            onChange={(e) => setExpDate(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsExpenseModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Log Expense
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deletingItem)}
        onClose={() => setDeletingItem(null)}
        onConfirm={async () => {
          if (deletingItem) {
            if (deletingItem.type === 'income') {
              await deleteIncome(deletingItem.id)
            } else {
              await deleteExpense(deletingItem.id)
            }
            setDeletingItem(null)
          }
        }}
        title="Delete Transaction"
        message="Are you sure you want to remove this financial entry?"
        confirmText="Delete"
      />
    </div>
  )
}
