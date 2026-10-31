import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { MoneyCurrency } from '../../types'
import { useRecords } from '../../features/life/data'
import { DataNotice, Panel } from '../../features/life/ui'
import { currencies, formatMoney } from '../../features/life/money'

export function ReviewMoney({start,end}: {start:string;end:string}) {
  const accounts=useRecords('money_accounts'),transactions=useRecords('money_transactions')
  const [currency,setCurrency]=useState<MoneyCurrency>('INR')
  const ids=new Set(accounts.rows.filter(a=>a.currency===currency).map(a=>a.id))
  const rows=transactions.rows.filter(t=>ids.has(t.account_id)&&t.date>=start&&t.date<=end)
  const income=rows.filter(t=>t.kind==='income').reduce((s,t)=>s+t.amount_minor,0)
  const expense=rows.filter(t=>t.kind==='expense').reduce((s,t)=>s+t.amount_minor,0)
  const ready=!accounts.isLoading&&!transactions.isLoading&&!accounts.error&&!transactions.error
  return <Panel title="Money in perspective" subtitle={`${start} to ${end} · transfers and opening balances excluded.`} action={<select aria-label="Money review currency" value={currency} onChange={e=>setCurrency(e.target.value as MoneyCurrency)}>{currencies.map(c=><option key={c}>{c}</option>)}</select>}>
    <DataNotice queries={[accounts,transactions]}/>
    {ready && <><div className="review-money-totals"><div><span>Income</span><strong>{formatMoney(income,currency)}</strong></div><div><span>Expenses</span><strong>{formatMoney(expense,currency)}</strong></div><div><span>Net cash flow</span><strong>{formatMoney(income-expense,currency)}</strong></div></div><p className="review-footnote">{rows.length} recorded transactions in {currency}. Open Money to manage accounts, compare category budgets, and view monthly spending.</p></>}
    <Link className="text-link" to="/money">Open Money →</Link>
  </Panel>
}
