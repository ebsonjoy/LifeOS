import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, ChartNoAxesCombined, FolderKanban, Leaf } from 'lucide-react'
import { useRecords } from '../../features/life/data'
import { DataNotice, DayPicker, PageIntro, useDay } from '../../features/life/ui'
import { DayOverview } from './DayOverview'
import './dashboard.css'

export function Dashboard() {
  const { date, today, setDate } = useDay()
  const plans = useRecords('daily_plans')
  return <div className="dashboard-page">
    <PageIntro eyebrow="A LITTLE FOCUS FOR YOUR DAY" title="Dashboard" description="See what’s on your list and choose where to start.">
      <Link className="btn secondary" to={'/review?date=' + date}><ChartNoAxesCombined size={16} />Review progress</Link>
    </PageIntro>
    <div className="dashboard-day-picker"><DayPicker date={date} today={today} onChange={setDate} /></div>
    <DataNotice queries={[plans]} />
    {!plans.isLoading && !plans.error && <DayOverview rows={plans.rows} date={date} today={today} />}
    <nav className="dashboard-shortcuts" aria-label="Continue your day">
      {[{path:'/habits',label:'Habits',hint:'Keep your daily rhythm',Icon:Leaf},{path:'/works',label:'Projects',hint:'Pick up your work',Icon:FolderKanban},{path:'/english',label:'English',hint:'Make time to practise',Icon:BookOpen}].map(({path,label,hint,Icon}) => <Link key={path} to={path + '?date=' + date}><Icon size={20} /><span><strong>{label}</strong><small>{hint}</small></span><ArrowRight size={16} /></Link>)}
    </nav>
    <Link className="dashboard-review-link" to={'/review?date=' + date}><span className="dashboard-review-icon"><ChartNoAxesCombined size={24} /></span><span><strong>The bigger picture, in Review.</strong><small>See your plans, habits, activity, time and project progress together.</small></span><ArrowRight size={20} /></Link>
  </div>
}
