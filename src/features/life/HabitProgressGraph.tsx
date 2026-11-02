import { useId, useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Habit, HabitLog } from '../../types'
import { habitGraphData, habitGraphRange } from './habits'
import type { HabitGraphPeriod } from './habits'

const dateLabel = (date: string) => new Date(date + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
const periods: { key: HabitGraphPeriod; label: string }[] = [
  { key: 'week', label: 'Week' }, { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' }, { key: 'custom', label: 'Custom' },
]

export function HabitProgressGraph({ habit, logs, end, today }: { habit: Habit; logs: HabitLog[]; end: string; today: string }) {
  const [period, setPeriod] = useState<HabitGraphPeriod>('week')
  const [custom, setCustom] = useState(() => habitGraphRange('week', end))
  const headingId = useId()
  const range = period === 'custom' ? custom : habitGraphRange(period, end)
  const result = useMemo(() => {
    try { return { data: habitGraphData(habit.id, logs, range.start, range.end, today, period === 'year'), error: '' } }
    catch (error) { return { data: null, error: (error as Error).message } }
  }, [habit.id, logs, range.start, range.end, today, period])
  const data = result.data
  const unit = habit.unit === 'check' ? 'times' : habit.unit || 'times'
  const bad = habit.habit_type === 'bad'
  const points = data?.points.map(point => ({
    ...point,
    label: new Date(point.start + 'T12:00:00').toLocaleDateString('en-IN', data.grouped ? { month: 'short', ...(range.start.slice(0, 4) !== range.end.slice(0, 4) ? { year: '2-digit' as const } : {}) } : { day: 'numeric', month: 'short' }),
    fullLabel: point.start === point.end ? dateLabel(point.start) : `${dateLabel(point.start)} – ${dateLabel(point.end)}`,
  })) || []
  return <section className="habit-progress-graph" aria-labelledby={headingId}>
    <div className="habit-graph-heading">
      <div><h4 id={headingId}>Your progress</h4><p>{period === 'week' ? 'Last 7 days' : period === 'month' ? 'Month to selected day' : period === 'year' ? 'Year to selected day' : 'Your chosen dates'}</p></div>
      <div className="habit-graph-filters" role="group" aria-label={`${habit.name} graph period`}>
        {periods.map(item => <button key={item.key} aria-pressed={period === item.key} onClick={() => setPeriod(item.key)}>{item.label}</button>)}
      </div>
    </div>
    {period === 'custom' && <div className="habit-graph-dates">
      <label>From<input aria-label={`${habit.name} graph start date`} type="date" max={today} value={custom.start} onChange={e => setCustom({ ...custom, start: e.target.value })}/></label>
      <label>To<input aria-label={`${habit.name} graph end date`} type="date" min={custom.start || undefined} max={today} value={custom.end} onChange={e => setCustom({ ...custom, end: e.target.value })}/></label>
    </div>}
    {result.error && <p className="error-text" role="alert">{result.error}</p>}
    {data && <>
      <p className="habit-graph-range">{dateLabel(range.start)} – {dateLabel(range.end)} · {data.grouped ? 'Monthly recorded totals' : 'Daily recorded counts'}</p>
      <div className="habit-graph-stats" aria-live="polite">
        <div><strong>{data.recorded}<small> / {data.days}</small></strong><span>Days logged</span></div>
        <div><strong>{data.completed}</strong><span>Days reviewed complete</span></div>
        <div><strong>{bad ? data.zeroDays : data.total}</strong><span>{bad ? 'Days with zero recorded' : `${unit} recorded`}</span></div>
      </div>
      {data.recorded ? <>
        <div className="habit-graph-canvas" aria-label={`${habit.name}: ${data.grouped ? 'monthly' : 'daily'} counts, ${data.recorded} of ${data.days} days logged. Exact values are in View graph data below.`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 16, right: 18, bottom: 6, left: 0 }} accessibilityLayer>
              <CartesianGrid stroke="var(--line)" strokeDasharray="3 5" vertical={false}/>
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--muted)' }} axisLine={false} tickLine={false} minTickGap={24} tickMargin={10}/>
              <YAxis domain={[0, 'auto']} allowDecimals={false} width={40} tick={{ fontSize: 10, fill: 'var(--muted)' }} axisLine={false} tickLine={false}/>
              <Tooltip filterNull={false} content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const point = payload[0].payload as typeof points[number]
                return <div className="habit-graph-tooltip"><strong>{point.fullLabel}</strong><span>{point.value === null ? 'Not logged' : `${point.value} ${unit} recorded`}</span><small>{point.recorded}/{point.days} days logged · {point.completed} reviewed complete</small></div>
              }}/>
              <Line type="linear" dataKey="value" name={unit} stroke="var(--habit-color)" strokeWidth={2.5} connectNulls={false} isAnimationActive={false} dot={{ r: 3, strokeWidth: 2, fill: 'var(--surface)' }} activeDot={{ r: 5, stroke: 'var(--surface)', strokeWidth: 2 }}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="habit-graph-encouragement">{data.completed > 0 ? `${data.completed} ${data.completed === 1 ? 'day' : 'days'} you marked complete. Give yourself credit for that effort.` : `You’ve checked in on ${data.recorded} ${data.recorded === 1 ? 'day' : 'days'}. Every honest check-in is a step toward understanding your routine.`}</p>
      </> : <div className="habit-graph-empty">No entries in this range yet. Your first logged count will start the graph.</div>}
      <p className="habit-caption">{bad ? 'Lower counts align with your reduction goal. ' : ''}Gaps mean not logged; 0 means you recorded none.{data.grouped && ' Monthly totals include only logged days; compare them alongside logging coverage.'}</p>
      {!!data.recorded && <details className="habit-graph-data"><summary>View graph data</summary><div className="habit-graph-table"><table><caption>{habit.name} · {dateLabel(range.start)} – {dateLabel(range.end)}</caption><thead><tr><th scope="col">Period</th><th scope="col">{unit} recorded</th><th scope="col">Days logged</th></tr></thead><tbody>{points.map(point => <tr key={point.start}><th scope="row">{point.fullLabel}</th><td>{point.value ?? 'Not logged'}</td><td>{point.recorded}/{point.days}</td></tr>)}</tbody></table></div></details>}
    </>}
  </section>
}
