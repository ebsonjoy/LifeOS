import { HabitTracker } from '../../features/life/HabitTracker'
import { DayPicker, PageIntro, useDay } from '../../features/life/ui'
export function Habits() {
  const { date, today, setDate } = useDay()
  return (
    <>
      <PageIntro
        eyebrow="SMALL STEPS, HONEST PROGRESS"
        title="Habits"
        description="Record your counts and review the day as complete or incomplete."
      >
        <DayPicker date={date} today={today} onChange={setDate} />
      </PageIntro>
      <div className="habit-page">
        <HabitTracker key={date} date={date} today={today} onDate={setDate} />
      </div>
    </>
  )
}
