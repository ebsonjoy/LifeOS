type TooltipEntry = { name?: unknown; value?: unknown; color?: string; payload?: { date?: string } }

export function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: readonly TooltipEntry[]; label?: unknown }) {
  if (!active || !payload?.length) return null
  const date = payload[0].payload?.date
  const title = date ? new Date(date + 'T12:00:00').toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric'}) : String(label ?? '')
  return <div className="review-tooltip"><strong>{title}</strong>{payload.map((entry, index) => <div key={index}><span><i style={{background:entry.color}} />{String(entry.name ?? '')}</span><b>{entry.value == null ? 'Not logged' : String(entry.value)}</b></div>)}</div>
}
