import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { Panel } from '../../features/life/ui'
import { formatMoney, moneyReport } from '../../features/life/money'
import type { MoneyCurrency } from '../../types'

const categoryColors = ['var(--accent)', 'var(--success)', 'var(--chart-gold)', 'var(--chart-purple)', 'var(--danger)', 'var(--muted)']
const tooltipStyle = { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, color: 'var(--ink)', fontSize: 12 }

export function MoneyOverview({report,currency}: {report:ReturnType<typeof moneyReport>;currency:MoneyCurrency}) {
  return <div className="money-charts">
    <Panel title="Cash flow" subtitle="Daily recorded income and expenses for this month.">
      <div className="money-chart-legend"><span><i className="income"/>Income <strong>{formatMoney(report.income,currency)}</strong></span><span><i className="expense"/>Expenses <strong>{formatMoney(report.expense,currency)}</strong></span></div>
      {report.income || report.expense ? <div className="money-chart" role="img" aria-label={`Monthly income ${formatMoney(report.income,currency)} and expenses ${formatMoney(report.expense,currency)}`}><ResponsiveContainer width="100%" height="100%"><BarChart data={report.daily} maxBarSize={10} barGap={3} margin={{top:18,right:8,bottom:8,left:0}} accessibilityLayer><CartesianGrid vertical={false} strokeDasharray="3 5" stroke="var(--line)"/><XAxis dataKey="label" axisLine={false} tickLine={false} minTickGap={18} tickMargin={10} tick={{fill:'var(--muted)',fontSize:10}}/><YAxis width={48} axisLine={false} tickLine={false} tick={{fill:'var(--muted)',fontSize:10}} tickFormatter={n=>Math.abs(n)>=1000 ? `${n/1000}k` : String(n)}/><Tooltip labelFormatter={(_,payload)=>payload[0]?.payload?.date || ''} formatter={value=>formatMoney(Math.round(Number(value)*100),currency)} contentStyle={tooltipStyle} cursor={{fill:'var(--inset)'}}/><Bar dataKey="income" name="Income" fill="var(--success)" radius={[4,4,0,0]} isAnimationActive={false}/><Bar dataKey="expense" name="Expenses" fill="var(--accent)" radius={[4,4,0,0]} isAnimationActive={false}/></BarChart></ResponsiveContainer></div> : <div className="money-empty"><div className="money-empty-symbols"><ArrowDownLeft size={22}/><ArrowUpRight size={22}/></div><strong>Your cash flow starts here</strong><span>Add income or an expense to see this month take shape.</span></div>}
      <p className="money-chart-note">{currency} · Opening balances and transfers are excluded.</p>
    </Panel>
    <Panel title="Spending breakdown" subtitle="See which categories make up your expenses.">
      {report.categories.length ? <>
        <div className="money-spending-summary"><div className="money-donut" role="img" aria-label="Expense distribution by category; exact amounts are listed below"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={report.categories} dataKey="amount" nameKey="category" innerRadius={48} outerRadius={65} paddingAngle={report.categories.length>1?3:0} stroke="none" isAnimationActive={false}>{report.categories.map((row,i)=><Cell key={row.category} fill={categoryColors[i%categoryColors.length]}/>)}</Pie><Tooltip formatter={value=>formatMoney(Number(value),currency)} contentStyle={tooltipStyle}/></PieChart></ResponsiveContainer></div><div><span>Total spent</span><strong>{formatMoney(report.expense,currency)}</strong><small>{report.categories.length} expense categories</small></div></div>
        <div className="money-category-list">{report.categories.map((row,i)=><div className="money-category-row" key={row.category}><span className="money-category-dot" style={{background:categoryColors[i%categoryColors.length]}}/><span>{row.category}</span><strong>{formatMoney(row.amount,currency)}</strong><small>{Math.round(row.amount/report.expense*100)}%</small></div>)}</div>
      </> : <div className="money-empty"><strong>No expenses this month</strong><span>Once you record spending, your category breakdown will appear here.</span></div>}
    </Panel>
  </div>
}
