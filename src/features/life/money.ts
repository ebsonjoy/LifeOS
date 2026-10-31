import type { MoneyAccount, MoneyBudget, MoneyCurrency, MoneyTransaction } from '../../types'
import { dateKey, shiftDay } from './helpers'

export const currencies: MoneyCurrency[] = ['INR', 'USD', 'EUR', 'GBP']
export const expenseCategories = ['Food & groceries', 'Transport', 'Housing', 'Bills & utilities', 'Shopping', 'Health', 'Education', 'Entertainment', 'Family', 'Other']
export const incomeCategories = ['Salary', 'Freelance', 'Business', 'Gift', 'Refund', 'Other income']
export const moneyLimit = 1000000000000
export function parseMoney(value: string, signed = false) {
  const text = value.trim()
  if (!(signed ? /^-?\d+(\.\d{1,2})?$/ : /^\d+(\.\d{1,2})?$/).test(text)) throw new Error('Enter an amount with up to two decimal places, without commas.')
  const [whole, fraction = ''] = text.replace('-', '').split('.')
  const amount = (Number(whole) * 100 + Number(fraction.padEnd(2, '0'))) * (text.startsWith('-') ? -1 : 1)
  if (!Number.isSafeInteger(amount) || Math.abs(amount) > moneyLimit) throw new Error('This amount is too large.')
  return amount
}
export const amountInput = (minor: number) => (minor / 100).toFixed(2)
export const formatMoney = (minor: number, currency: MoneyCurrency = 'INR') => new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-GB', {style:'currency',currency,minimumFractionDigits:2}).format(minor / 100)
const validDate = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) && shiftDay(date, 0) === date
function validAmount(amount: number, positive = true) {
  if (!Number.isSafeInteger(amount) || Math.abs(amount) > moneyLimit || (positive && amount <= 0)) throw new Error(positive ? 'Enter a positive amount.' : 'Enter a valid opening balance.')
}
export function validateAccount(row: MoneyAccount, original?: MoneyAccount, transactions: MoneyTransaction[] = [], today = dateKey()) {
  if (!row.name?.trim() || row.name.length > 80) throw new Error('Account name must contain 1–80 characters.')
  if (!['cash','bank','wallet'].includes(row.kind) || !currencies.includes(row.currency)) throw new Error('Choose an account type and currency.')
  validAmount(row.opening_minor, false)
  if (!validDate(row.opening_date) || row.opening_date > today) throw new Error('Choose an opening date on or before today.')
  if (original && transactions.some(t => t.account_id === row.id || t.to_account_id === row.id) && (row.currency !== original.currency || row.opening_minor !== original.opening_minor || row.opening_date !== original.opening_date)) throw new Error('Opening balance, date and currency are locked once transactions exist. Correct the transaction history instead.')
}
export function validateTransaction(row: MoneyTransaction, accounts: MoneyAccount[], original?: MoneyTransaction, today = dateKey()) {
  validAmount(row.amount_minor)
  if (!['income','expense','transfer'].includes(row.kind)) throw new Error('Choose a transaction type.')
  if (!validDate(row.date) || row.date > today) throw new Error('Choose a transaction date on or before today.')
  const account = accounts.find(a => a.id === row.account_id)
  if (!account) throw new Error('Choose an account in your workspace.')
  if (account.archived && original?.account_id !== account.id) throw new Error('Restore this account before adding transactions.')
  if (row.date < account.opening_date) throw new Error('Transaction date cannot be before the account opening date.')
  if (row.kind === 'transfer') {
    if (row.category) throw new Error('Transfers do not use an income or expense category.')
    const target = accounts.find(a => a.id === row.to_account_id)
    if (!target || target.id === account.id) throw new Error('Choose a different destination account.')
    if (target.currency !== account.currency) throw new Error('Transfers require accounts with the same currency.')
    if (target.archived && original?.to_account_id !== target.id) throw new Error('Restore the destination account first.')
    if (row.date < target.opening_date) throw new Error('Transfer date cannot be before either account opening date.')
  } else if (row.to_account_id || !(row.kind === 'income' ? incomeCategories : expenseCategories).includes(row.category)) throw new Error('Choose a valid category for this transaction.')
  if ((row.description || '').length > 500) throw new Error('Keep the description within 500 characters.')
}
export function validateBudget(row: MoneyBudget) {
  validAmount(row.limit_minor)
  if (!currencies.includes(row.currency) || !expenseCategories.includes(row.category) || !validDate(row.month) || !row.month.endsWith('-01')) throw new Error('Choose a valid month, currency and expense category.')
}
export function accountBalance(account: MoneyAccount, transactions: MoneyTransaction[], through = dateKey()) {
  if (through < account.opening_date) return 0
  return transactions.filter(t => t.date <= through).reduce((balance,t) => balance + (t.account_id === account.id ? (t.kind === 'income' ? t.amount_minor : -t.amount_minor) : t.to_account_id === account.id && t.kind === 'transfer' ? t.amount_minor : 0), account.opening_minor)
}
export function moneyReport(accounts: MoneyAccount[], transactions: MoneyTransaction[], currency: MoneyCurrency, month: string, today = dateKey()) {
  const ids = new Set(accounts.filter(a => a.currency === currency).map(a => a.id))
  const rows = transactions.filter(t => ids.has(t.account_id) && t.date.startsWith(month) && t.date <= today)
  const income = rows.filter(t => t.kind === 'income').reduce((sum,t) => sum + t.amount_minor,0)
  const expense = rows.filter(t => t.kind === 'expense').reduce((sum,t) => sum + t.amount_minor,0)
  const categories = expenseCategories.map(category => ({category,amount:rows.filter(t => t.kind === 'expense' && t.category === category).reduce((sum,t) => sum + t.amount_minor,0)})).filter(r => r.amount > 0).sort((a,b) => b.amount - a.amount)
  const days = new Date(Number(month.slice(0,4)), Number(month.slice(5,7)), 0).getDate()
  const daily = Array.from({length:days},(_,i) => {
    const date = `${month}-${String(i+1).padStart(2,'0')}`
    const entries = rows.filter(t => t.date === date)
    return {date,label:String(i+1),income:date > today ? null : entries.filter(t => t.kind === 'income').reduce((s,t)=>s+t.amount_minor,0)/100,expense:date > today ? null : entries.filter(t => t.kind === 'expense').reduce((s,t)=>s+t.amount_minor,0)/100}
  })
  return {rows,income,expense,net:income-expense,categories,daily,balance:accounts.filter(a => a.currency === currency).reduce((sum,a) => sum + accountBalance(a,transactions,today),0)}
}
export function moneyCsv(rows: MoneyTransaction[], accounts: MoneyAccount[]) {
  const cell = (value: string) => '"' + (/^[=+\-@\t\r]/.test(value) ? "'" + value : value).replaceAll('"','""') + '"'
  const lines = rows.map(t => {const a = accounts.find(a => a.id === t.account_id); return [t.date,t.kind,a?.name || '',accounts.find(a => a.id === t.to_account_id)?.name || '',a?.currency || '',amountInput(t.amount_minor),t.category,t.description]})
  return [['Date','Type','Account','To account','Currency','Amount','Category','Description'],...lines].map(row => row.map(cell).join(',')).join('\r\n')
}
