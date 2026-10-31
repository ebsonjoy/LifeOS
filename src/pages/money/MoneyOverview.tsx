import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Panel } from '../../features/life/ui'
import { formatMoney, moneyReport } from '../../features/life/money'
import type { MoneyCurrency } from '../../types'

export function MoneyOverview({report,currency}: {report:ReturnType<typeof moneyReport>;currency:MoneyCurrency}) {
  return <div className="money-charts">
    <Panel title="Money in & out" subtitle="Recorded daily income and expenses. Transfers are excluded.">
      {report.income || report.expense ? <div className="money-chart" role="img" aria-label={`Monthly income ${formatMoney(report.income,currency)} and expenses ${formatMoney(report.expense,currency)}`}><ResponsiveContainer width="100%" height="100%"><BarChart data={report.daily} maxBarSize={12} margin={{top:12,right:8,bottom:4,left:0}}><CartesianGrid vertical={false} strokeDasharray="2 5" stroke="var(--line)" /><XAxis dataKey="label" axisLine={false} tickLine={false} minTickGap={16} tick={{fill:'var(--muted)',fontSize:11}} /><YAxis width={46} axisLine={false} tickLine={false} tick={{fill:'var(--muted)',fontSize:11}} tickFormatter={n=>Math.abs(n)>=1000 ? `${n/1000}k` : String(n)} /><Tooltip labelFormatter={(_,payload)=>payload[0]?.payload?.date || ''} formatter={value=>formatMoney(Math.round(Number(value)*100),currency)} contentStyle={{background:'var(--surface)',border:'1px solid var(--line)',borderRadius:12,color:'var(--ink)'}} cursor={{fill:'var(--soft)'}} /><Legend iconType="circle" iconSize={7} wrapperStyle={{fontSize:11,paddingTop:15}} /><Bar dataKey="income" name="Income" fill="var(--accent)" radius={[3,3,0,0]} isAnimationActive={false} /><Bar dataKey="expense" name="Expenses" fill="var(--chart-gold)" radius={[3,3,0,0]} isAnimationActive={false} /></BarChart></ResponsiveContainer></div> : <div className="money-empty">Add income or an expense to see this month’s cash flow.</div>}
    </Panel>
    <Panel title="Where your money went" subtitle="Expense categories for the selected month.">
      {report.categories.length ? <div className="money-category-list">{report.categories.map(row=><div key={row.category}><div><span>{row.category}</span><strong>{formatMoney(row.amount,currency)}</strong></div><progress max={report.expense} value={row.amount} aria-label={`${row.category}: ${Math.round(row.amount/report.expense*100)}% of expenses`} /><small>{Math.round(row.amount/report.expense*100)}% of expenses</small></div>)}</div> : <div className="money-empty">No expenses recorded in this month.</div>}
    </Panel>
  </div>
}
