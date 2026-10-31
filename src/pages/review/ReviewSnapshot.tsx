import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import type { ProgressStatus } from '../../types'
import { outcomeTotals } from '../../features/life/progress'
import { Panel } from '../../features/life/ui'

export type ReviewArea = { key: string; name: string; path: string; rows: { status: ProgressStatus }[] }

export function ReviewSnapshot({ areas, date }: { areas: ReviewArea[]; date: string }) {
  return <Panel title="Every area, at a glance" subtitle="Bars show all entries. Rates use reviewed entries only.">
    <div className="review-legend" aria-hidden="true"><span><i className="complete" />Complete</span><span><i className="incomplete" />Incomplete</span><span><i className="pending" />Not reviewed</span></div>
    <div className="review-area-list">
      {areas.map(area => {
        const totals = outcomeTotals(area.rows)
        const count = area.rows.length
        return <Link className="review-area-row" key={area.key} to={area.path + '?date=' + date}>
          <div className="review-area-label"><strong>{area.name}</strong><span>{totals.rate == null ? '—' : totals.rate + '%'}<ArrowUpRight size={13} /></span></div>
          <div className="review-stacked-bar" role="img" aria-label={`${area.name}: ${totals.completed} complete, ${totals.incomplete} incomplete, ${totals.pending} not reviewed${count ? '' : ', no entries'}`}>
            {!!count && <><span className="complete" style={{width: `${totals.completed / count * 100}%`}} /><span className="incomplete" style={{width: `${totals.incomplete / count * 100}%`}} /><span className="pending" style={{width: `${totals.pending / count * 100}%`}} /></>}
          </div>
          <small>{count ? `${totals.completed} complete · ${totals.incomplete} incomplete · ${totals.pending} not reviewed` : 'No entries in this period'}</small>
        </Link>
      })}
    </div>
    <p className="review-footnote">Areas stay separate. Missing entries are not failures. English, Gym and Job search show your daily goal reviews.</p>
  </Panel>
}
