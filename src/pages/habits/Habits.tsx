import { HabitTracker } from '../../features/life/HabitTracker'
import { DayPicker, PageIntro, useDay } from '../../features/life/ui'
export function Habits() {
  const { date, today, setDate } = useDay()
  return (
    <>
      <PageIntro
        eyebrow="SMALL STEPS, HONEST PROGRESS"
        title="Habits"
        description="Build your routine. Record a little progress, every day."
      >
        <DayPicker date={date} today={today} onChange={setDate} />
      </PageIntro>
      <div className="habit-page">
        <HabitTracker key={date} date={date} today={today} onDate={setDate} />
      </div>
    </>
  )
}
