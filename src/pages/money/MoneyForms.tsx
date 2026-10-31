import { useState } from 'react'
import type { MoneyAccount, MoneyBudget, MoneyCurrency, MoneyTransaction } from '../../types'
import { Dialog, Field, Form, textValue } from '../../features/life/ui'
import { amountInput, currencies, expenseCategories, incomeCategories, parseMoney } from '../../features/life/money'

export function AccountEditor({ account, locked, today, busy, onClose, onSave }: {account:Partial<MoneyAccount>; locked:boolean; today:string; busy:boolean; onClose:()=>void; onSave:(row:Partial<MoneyAccount>)=>Promise<void>}) {
  return <Dialog title={account.id ? 'Edit account' : 'Add an account'} onClose={onClose}><Form busy={busy} onCancel={onClose} submit="Save account" onSubmit={async data => {
    await onSave({...account,name:textValue(data,'name'),kind:textValue(data,'kind') as MoneyAccount['kind'],currency:locked ? account.currency : textValue(data,'currency') as MoneyCurrency,opening_minor:locked ? account.opening_minor : parseMoney(textValue(data,'opening'),true),opening_date:locked ? account.opening_date : textValue(data,'date'),archived:account.archived || false})
  }}>
    <Field label="Account name"><input autoFocus required name="name" maxLength={80} defaultValue={account.name || ''} placeholder="Cash in hand, Main bank, Wallet…" /></Field>
    <div className="form-grid"><Field label="Account type"><select name="kind" defaultValue={account.kind || 'cash'}><option value="cash">Cash</option><option value="bank">Bank account</option><option value="wallet">Digital wallet</option></select></Field><Field label="Currency"><select name="currency" defaultValue={account.currency || 'INR'} disabled={locked}>{currencies.map(c=><option key={c}>{c}</option>)}</select></Field></div>
    <Field label="Opening balance" hint="Balance before the transactions you’ll record. Use a negative amount for an overdrawn account."><input name="opening" inputMode="decimal" required readOnly={locked} defaultValue={amountInput(account.opening_minor || 0)} /></Field>
    <Field label="Track from"><input name="date" type="date" required max={today} readOnly={locked} defaultValue={account.opening_date || today} /></Field>
    <p className="muted">{locked ? 'Opening details are locked because this account has transactions. You can still rename or archive it.' : 'The opening balance is not counted as income. Record transactions from this date onward; don’t enter transactions already included in the opening balance.'}</p>
  </Form></Dialog>
}

export function TransactionEditor({ transaction, accounts, today, busy, onClose, onSave }: {transaction:Partial<MoneyTransaction>;accounts:MoneyAccount[];today:string;busy:boolean;onClose:()=>void;onSave:(row:Partial<MoneyTransaction>)=>Promise<void>}) {
  const [kind,setKind] = useState(transaction.kind || 'expense')
  const [accountId,setAccountId] = useState(transaction.account_id || accounts.find(a=>!a.archived)?.id || '')
  const account = accounts.find(a=>a.id===accountId)
  const sources = accounts.filter(a=>!a.archived || a.id===transaction.account_id)
  const targets = accounts.filter(a=>a.id!==accountId && a.currency===account?.currency && (!a.archived || a.id===transaction.to_account_id))
  return <Dialog title={transaction.id ? 'Edit transaction' : 'Add a transaction'} onClose={onClose}><Form busy={busy} onCancel={onClose} submit="Save transaction" onSubmit={async data=>{
    await onSave({...transaction,kind,account_id:accountId,to_account_id:kind==='transfer' ? textValue(data,'to') : null,amount_minor:parseMoney(textValue(data,'amount')),date:textValue(data,'date'),category:kind==='transfer' ? '' : textValue(data,'category'),description:textValue(data,'description')})
  }}>
    <div className="money-type-switch" aria-label="Transaction type">{(['expense','income','transfer'] as const).map(type=><button type="button" key={type} aria-pressed={kind===type} onClick={()=>setKind(type)}>{type}</button>)}</div>
    <div className="form-grid"><Field label={`Amount (${account?.currency || 'INR'})`}><input autoFocus name="amount" inputMode="decimal" required placeholder="0.00" defaultValue={transaction.amount_minor ? amountInput(transaction.amount_minor) : ''} /></Field><Field label="Date"><input name="date" type="date" required min={account?.opening_date} max={today} defaultValue={transaction.date || today} /></Field></div>
    <Field label={kind==='transfer' ? 'From account' : 'Account'}><select required value={accountId} onChange={e=>setAccountId(e.target.value)}><option value="" disabled>Choose an account</option>{sources.map(a=><option value={a.id} key={a.id}>{a.name} · {a.currency}{a.archived?' (archived)':''}</option>)}</select></Field>
    {kind==='transfer' ? <><Field label="To account"><select key={accountId} name="to" required defaultValue={transaction.to_account_id || ''}><option value="" disabled>Choose a destination</option>{targets.map(a=><option value={a.id} key={a.id}>{a.name}</option>)}</select></Field><p className="muted">A transfer moves money between accounts in the same currency. It does not count as income or an expense. Record any transfer fee separately as an expense.</p>{!targets.length && <p className="error-text">Add another active account in {account?.currency || 'the same currency'} to transfer money.</p>}</> : <Field label="Category"><select key={kind} name="category" required defaultValue={transaction.kind===kind ? transaction.category : undefined}>{(kind==='income'?incomeCategories:expenseCategories).map(c=><option key={c}>{c}</option>)}</select></Field>}
    <Field label="Description (optional)"><textarea name="description" rows={3} maxLength={500} defaultValue={transaction.description || ''} placeholder="What was this for?" /></Field>
    <p className="muted">Record completed transactions only. Changes immediately update your tracked balances.</p>
  </Form></Dialog>
}

export function BudgetEditor({ budget, month, currency, busy, onClose, onSave }: {budget:Partial<MoneyBudget>;month:string;currency:MoneyCurrency;busy:boolean;onClose:()=>void;onSave:(row:Partial<MoneyBudget>)=>Promise<void>}) {
  return <Dialog title={budget.id ? 'Edit budget' : 'Set a monthly budget'} onClose={onClose}><Form busy={busy} submit="Save budget" onCancel={onClose} onSubmit={async data=>{
    await onSave({...budget,month:month+'-01',currency,category:budget.id ? budget.category : textValue(data,'category'),limit_minor:parseMoney(textValue(data,'amount'))})
  }}><p className="muted">{month} · {currency} · across all your accounts in this currency.</p><Field label="Expense category"><select name="category" disabled={!!budget.id} defaultValue={budget.category || expenseCategories[0]}>{expenseCategories.map(c=><option key={c}>{c}</option>)}</select></Field><Field label={`Monthly limit (${currency})`}><input autoFocus name="amount" inputMode="decimal" required defaultValue={budget.limit_minor ? amountInput(budget.limit_minor) : ''} placeholder="0.00" /></Field><p className="muted">Saving an existing category updates its limit for this month. Transfers are excluded. Budgets do not roll over automatically.</p></Form></Dialog>
}
