import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Pencil, Trash2, ReceiptText } from 'lucide-react'
import type { MoneyCurrency, MoneyTransaction } from '../../types'
import { formatMoney } from '../../features/life/money'

export function MoneyLedger({ rows, currency, busy, accountName, onEdit, onDelete, filtered = false }: {
  rows: MoneyTransaction[]
  currency: MoneyCurrency
  busy: boolean
  accountName: (id: string | null) => string
  onEdit: (row: MoneyTransaction) => void
  onDelete: (row: MoneyTransaction) => void
  filtered?: boolean
}) {
  if (!rows.length) return <div className="money-empty"><ReceiptText size={26}/><strong>{filtered ? 'No matching transactions' : 'A fresh start for this month'}</strong><span>{filtered ? 'Try another search, account, or transaction type.' : 'Record your first income or expense to start your activity list.'}</span></div>
  return <div className="money-ledger"><table><caption className="sr-only">Recorded transactions in {currency}</caption><thead><tr><th scope="col">Transaction</th><th scope="col">Date</th><th scope="col">Account</th><th scope="col">Amount</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>{rows.map(t => {
    const title = t.description || (t.kind === 'transfer' ? 'Account transfer' : t.category)
    return <tr key={t.id}>
      <td className="money-entry-cell"><div className="money-entry"><span className={'money-entry-icon ' + t.kind}>{t.kind === 'income' ? <ArrowDownLeft size={17}/> : t.kind === 'expense' ? <ArrowUpRight size={17}/> : <ArrowLeftRight size={17}/>}</span><div><strong>{title}</strong><small>{t.kind === 'transfer' ? 'Transfer' : `${t.category} · ${t.kind === 'income' ? 'Income' : 'Expense'}`}</small></div></div></td>
      <td className="money-entry-date"><time dateTime={t.date}>{new Date(t.date + 'T12:00:00').toLocaleDateString('en-IN', {day:'numeric', month:'short'})}</time></td>
      <td className="money-entry-account">{accountName(t.account_id)}{t.to_account_id && <small>→ {accountName(t.to_account_id)}</small>}</td>
      <td className={'money-entry-amount ' + t.kind}>{t.kind === 'income' ? '+' : t.kind === 'expense' ? '−' : ''}{formatMoney(t.amount_minor, currency)}</td>
      <td className="money-entry-actions"><div className="money-row-actions"><button className="icon-btn" disabled={busy} aria-label={`Edit ${title} on ${t.date}`} onClick={() => onEdit(t)}><Pencil size={14}/></button><button className="icon-btn" disabled={busy} aria-label={`Delete ${title} on ${t.date}`} onClick={() => onDelete(t)}><Trash2 size={14}/></button></div></td>
    </tr>
  })}</tbody></table></div>
}
