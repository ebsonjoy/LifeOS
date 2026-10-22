import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Dumbbell,
  Plus,
  Pencil,
  Trash2,
  Moon,
  Briefcase,
} from 'lucide-react'
import { useRecords } from '../../features/life/data'
import {
  shiftDay,
  recommendedSkill,
  habitDone,
  workoutSessions,
} from '../../features/life/helpers'
import {
  DataNotice,
  DayPicker,
  Dialog,
  Empty,
  Field,
  Form,
  Panel,
  PageIntro,
  dayLabel,
  ignoreHandled,
  textValue,
  useDay,
} from '../../features/life/ui'
import type { Habit, PlannedTask } from '../../types'
import { Timetable } from '../../features/life/Timetable'

export function Today() {
  const { date, today, setDate } = useDay()
  return <TodayContent key={date} date={date} today={today} setDate={setDate} />
}
function TodayContent({
  date,
  today,
  setDate,
}: {
  date: string
  today: string
  setDate: (d: string) => void
}) {
  const tasks = useRecords('daily_plans'),
    english = useRecords('english_sessions'),
    fitness = useRecords('fitness_logs')
  const habits = useRecords('habits'),
    habitLogs = useRecords('habit_logs'),
    daily = useRecords('daily_logs')
  const jobs = useRecords('job_applications'),
    routines = useRecords('workout_routines'),
    meals = useRecords('meal_plans')
  const [taskEditor, setTaskEditor] = useState<Partial<PlannedTask> | null>(
    null,
  )
  const [manageHabits, setManageHabits] = useState(false)
  const [habitEditor, setHabitEditor] = useState<Partial<Habit> | null>(null)
  const [deleteTask, setDeleteTask] = useState<string | null>(null)
  const selectedTasks = tasks.rows
    .filter((t) => t.date === date && t.category !== 'schedule')
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
  const review = daily.rows.find((l) => l.date === date)
  const practice = english.rows.filter((s) => s.date === date)
  const englishDone = practice.length > 0 || !!review?.journal?.trim()
  const sessions = workoutSessions(fitness.rows.filter((w) => w.date === date))
  const weekday = new Date(date + 'T12:00:00').getDay()
  const routine = routines.rows.find((r) => r.weekday === weekday)
  const rest = routine?.is_rest ?? weekday === 0
  const extras = habits.rows.filter(
    (h) => !['english', 'fitness'].includes(h.category),
  )
  const activeHabits = extras.filter((h) => h.is_active)
  const dueJobs = jobs.rows.filter(
    (j) =>
      !['rejected', 'withdrawn'].includes(j.status) &&
      ((j.follow_up_date && j.follow_up_date <= date) ||
        j.interview_date === date),
  )
  const future = date > today
  const weekStart = shiftDay(today, -6)
  const englishDates = new Set([
    ...english.rows
      .filter((s) => s.date >= weekStart && s.date <= today)
      .map((s) => s.date),
    ...daily.rows
      .filter(
        (s) => s.date >= weekStart && s.date <= today && s.journal?.trim(),
      )
      .map((s) => s.date),
  ])
  const weeklyWorkouts = workoutSessions(
    fitness.rows.filter((s) => s.date >= weekStart && s.date <= today),
  ).length
  const selectedMeals = meals.rows.filter((m) => m.date === date)
  async function toggleHabit(h: Habit) {
    const done = habitDone(h, habitLogs.rows, date)
    const existing = habitLogs.rows
      .filter(
        (l) =>
          l.habit_id === h.id &&
          l.completed &&
          (h.frequency === 'daily'
            ? l.date === date
            : l.date <= date &&
              l.date >= shiftDay(date, -(weekday === 0 ? 6 : weekday - 1))),
      )
      .sort((a, b) => b.date.localeCompare(a.date))[0]
    await habitLogs.save(
      done && existing
        ? { ...existing, completed: false }
        : { habit_id: h.id, date, completed: true, value: 1 },
    )
  }
  return (
    <>
      <PageIntro
        eyebrow="YOUR DAILY SPACE"
        title={
          future
            ? 'Make room for tomorrow.'
            : date < today
              ? 'A day to look back on.'
              : 'A little better, every day.'
        }
        description={
          future
            ? 'A small plan is enough. Choose what matters.'
            : 'English first. A few priorities. One day at a time.'
        }
      >
        <DayPicker date={date} today={today} onChange={setDate} />
      </PageIntro>
      <DataNotice
        queries={[
          tasks,
          english,
          fitness,
          habits,
          habitLogs,
          daily,
          jobs,
          routines,
          meals,
        ]}
      />
      <div className="date-caption">{dayLabel(date)}</div>
      <div className="two-col">
        <div className="stack">
          <section className="feature-card">
            <div>
              <div className="eyebrow">01 / YOUR FIRST PRIORITY</div>
              <h2>
                {englishDone
                  ? 'You made time for English.'
                  : 'Find your voice.'}
              </h2>
              <p>
                {englishDone
                  ? `${practice.reduce((s, p) => s + p.minutes, 0) || 'Writing'}${practice.length ? ' minutes practiced' : ' saved'}. Every small session counts.`
                  : `A little ${recommendedSkill(date)} practice today. Choose a short session or take your time.`}
              </p>
              <Link className="btn" to={'/english?date=' + date}>
                {englishDone
                  ? 'View your practice'
                  : future
                    ? 'See practice plan'
                    : 'Practice English'}
                <ArrowRight size={14} />
              </Link>
            </div>
            <div className="feature-art">
              <BookOpen size={39} />
            </div>
          </section>
          <Panel
            title="Your priorities"
            subtitle="Keep it to three things that matter."
            action={
              <span className="pill">
                {selectedTasks.filter((t) => t.completed).length} /{' '}
                {selectedTasks.length} done
              </span>
            }
          >
            {!selectedTasks.length && (
              <Empty>
                What would make this a good day?
                <br />
                Add your first priority below.
              </Empty>
            )}
            {selectedTasks.map((t) => (
              <div
                className={'task-row ' + (t.completed ? 'done' : '')}
                key={t.id}
              >
                <input
                  aria-label={'Complete ' + t.title}
                  type="checkbox"
                  disabled={tasks.busy || future}
                  checked={t.completed}
                  onChange={() =>
                    ignoreHandled(tasks.save({ ...t, completed: !t.completed }))
                  }
                />
                <div className="task-main">
                  <strong>{t.title}</strong>
                  {(t.start_time || t.summary) && (
                    <p>
                      {t.start_time &&
                        `${t.start_time}${t.end_time ? ' – ' + t.end_time : ''}`}
                      {t.summary && ` · ${t.summary}`}
                    </p>
                  )}
                </div>
                <button
                  className="icon-btn"
                  aria-label={'Edit ' + t.title}
                  onClick={() => setTaskEditor(t)}
                >
                  <Pencil size={13} />
                </button>
                <button
                  className="icon-btn"
                  aria-label={'Delete ' + t.title}
                  onClick={() => setDeleteTask(t.id)}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            <button
              className="text-link view-all"
              disabled={
                selectedTasks.length >= 3 || tasks.isLoading || !!tasks.error
              }
              onClick={() => setTaskEditor({ date })}
            >
              <Plus size={14} />
              {selectedTasks.length >= 3
                ? 'Your three priorities are set'
                : 'Add a priority'}
            </button>
          </Panel>
          <Timetable
            rows={tasks.rows.filter((t) => t.date === date)}
            busy={tasks.busy || tasks.isLoading || !!tasks.error}
            future={future}
            onEdit={(task) => setTaskEditor({ ...task, date })}
            onToggle={(task) =>
              ignoreHandled(tasks.save({ ...task, completed: !task.completed }))
            }
            onRemove={setDeleteTask}
          />
          <Panel
            title="Small habits"
            subtitle="Two small commitments. Plenty of room to grow."
            action={
              <button
                className="text-link"
                onClick={() => setManageHabits(true)}
              >
                Manage
              </button>
            }
          >
            {!activeHabits.length && (
              <Empty>
                Choose up to two habits you want to build.
                <br />
                English and gym are already tracked for you.
              </Empty>
            )}
            {activeHabits.slice(0, 2).map((h) => (
              <div className="task-row" key={h.id}>
                <input
                  type="checkbox"
                  checked={habitDone(h, habitLogs.rows, date)}
                  disabled={future || habitLogs.busy}
                  aria-label={h.name}
                  onChange={() => ignoreHandled(toggleHabit(h))}
                />
                <div className="task-main">
                  <strong>{h.name}</strong>
                  <p>
                    {h.frequency === 'weekly'
                      ? 'Once this week'
                      : 'A little each day'}
                  </p>
                </div>
              </div>
            ))}
            {activeHabits.length > 2 && (
              <button
                className="text-link view-all"
                onClick={() => setManageHabits(true)}
              >
                View {activeHabits.length - 2} more existing habits
              </button>
            )}
          </Panel>
          <Panel
            title={future ? 'A note for tomorrow' : 'Close the day'}
            subtitle={
              future
                ? 'Leave yourself a gentle starting point.'
                : 'What did you do, build, or learn? A few lines are enough.'
            }
            action={<Moon size={17} />}
          >
            {!daily.isLoading && !daily.error && (
              <Form
                key={review?.id || date}
                submit={future ? 'Save tomorrow’s note' : 'Save my day'}
                busy={daily.busy}
                onSubmit={async (data) => {
                  await daily.save({
                    ...review,
                    date,
                    accomplishments: textValue(data, 'accomplishments'),
                    improve_tomorrow: textValue(data, 'improve_tomorrow'),
                    journal: future
                      ? review?.journal
                      : textValue(data, 'journal'),
                  })
                }}
              >
                <Field
                  label={
                    future ? 'What would help tomorrow?' : 'What I did today'
                  }
                >
                  <textarea
                    name="accomplishments"
                    rows={2}
                    placeholder={
                      future
                        ? 'Start with one small thing…'
                        : 'Worked on my project, practiced a conversation…'
                    }
                    defaultValue={review?.accomplishments || ''}
                  />
                </Field>
                {!future && (
                  <details>
                    <summary>Write a few sentences in English</summary>
                    <Field
                      label="My English journal"
                      hint="This also counts as today’s writing practice."
                    >
                      <textarea
                        name="journal"
                        rows={3}
                        defaultValue={review?.journal || ''}
                        placeholder="Today I learned…"
                      />
                    </Field>
                  </details>
                )}
                <Field
                  label={
                    future ? 'A reminder for myself' : 'One thing for tomorrow'
                  }
                >
                  <input
                    name="improve_tomorrow"
                    defaultValue={review?.improve_tomorrow || ''}
                    placeholder="Keep it small and specific"
                  />
                </Field>
              </Form>
            )}
          </Panel>
        </div>
        <div className="stack">
          <Panel
            title="Move & nourish"
            subtitle={
              routine?.name ||
              (rest ? 'A day to recover' : 'Your evening gym session')
            }
            action={<Dumbbell size={18} />}
          >
            <div className="check-status">
              {sessions.length ? (
                <CheckCircle2 size={19} />
              ) : (
                <span className="pill warm">
                  {rest
                    ? 'REST DAY'
                    : `${routine?.start_time || '18:00'} – ${routine?.end_time || '20:00'}`}
                </span>
              )}
              {sessions.length > 0 && <span>Workout logged</span>}
            </div>
            <p className="muted" style={{ marginTop: 14 }}>
              {rest
                ? 'Rest is part of your routine.'
                : routine?.exercises.length
                  ? `${routine.exercises.length} ${routine.exercises.length === 1 ? 'exercise' : 'exercises'} in your plan.`
                  : 'Set up your routine, then record your session.'}
            </p>
            <Link className="text-link view-all" to={'/fitness?date=' + date}>
              {sessions.length
                ? 'View workout'
                : rest
                  ? 'View gym & food'
                  : 'Open gym'}
              <ArrowRight size={13} />
            </Link>
            <div
              style={{
                borderTop: '1px solid var(--line)',
                marginTop: 18,
                paddingTop: 16,
              }}
            >
              <div className="eyebrow">ON THE MENU</div>
              {selectedMeals.length ? (
                selectedMeals.map((m) => (
                  <div className="meal-row" key={m.id}>
                    <span className="meal-label">{m.slot}</span>
                    <span className="meal-body">{m.meal}</span>
                    {m.status !== 'planned' && <Check size={13} />}
                  </div>
                ))
              ) : (
                <p className="muted" style={{ marginTop: 9 }}>
                  A little planning makes meals easier.
                </p>
              )}
              <Link
                className="text-link view-all"
                to={'/fitness?date=' + date + '#meals'}
              >
                Plan meals <ArrowRight size={13} />
              </Link>
            </div>
          </Panel>
          <Panel
            title="Your next opportunity"
            subtitle="Follow-ups and interviews"
            action={<Briefcase size={17} />}
          >
            {dueJobs.length ? (
              dueJobs.map((j) => (
                <div className="session-row" key={j.id}>
                  <strong>{j.company}</strong>
                  <p>{j.role}</p>
                  <p>
                    {j.interview_date === date
                      ? 'Interview today'
                      : `Follow up · ${j.follow_up_date}`}
                  </p>
                  <Link className="text-link" to="/career">
                    Open application <ArrowRight size={12} />
                  </Link>
                </div>
              ))
            ) : (
              <p className="muted">
                No follow-ups due. Add a job-search priority when you want to
                make time for it.
              </p>
            )}
            <Link className="text-link view-all" to="/career">
              View jobs <ArrowRight size={13} />
            </Link>
          </Panel>
          <Panel title="Little steps add up" subtitle="Your last seven days">
            <div className="week-dots">
              {Array.from({ length: 7 }, (_, i) => shiftDay(today, i - 6)).map(
                (d) => (
                  <div
                    key={d}
                    className={
                      'week-dot ' +
                      (englishDates.has(d) ? 'completed ' : '') +
                      (d === today ? 'current' : '')
                    }
                  >
                    <span>
                      {englishDates.has(d) ? (
                        <Check size={12} />
                      ) : (
                        new Date(d + 'T12:00:00').getDate()
                      )}
                    </span>
                    {new Date(d + 'T12:00:00').toLocaleDateString('en', {
                      weekday: 'short',
                    })}
                  </div>
                ),
              )}
            </div>
            <p className="muted">
              English on{' '}
              <strong>
                {englishDates.size} {englishDates.size === 1 ? 'day' : 'days'}
              </strong>{' '}
              ·{' '}
              <strong>
                {weeklyWorkouts} gym{' '}
                {weeklyWorkouts === 1 ? 'session' : 'sessions'}
              </strong>
            </p>
            <p className="muted" style={{ marginTop: 12 }}>
              Missed a day? You can start again today.
            </p>
          </Panel>
          <button
            className="btn secondary"
            onClick={() => setDate(shiftDay(today, 1))}
          >
            Plan tomorrow <ArrowRight size={14} />
          </button>
        </div>
      </div>
      {taskEditor && (
        <Dialog
          title={
            taskEditor.category === 'schedule'
              ? taskEditor.id
                ? 'Edit scheduled plan'
                : 'Plan a time in your day'
              : taskEditor.id
                ? 'Edit priority'
                : 'One thing that matters'
          }
          onClose={() => setTaskEditor(null)}
        >
          <Form
            busy={tasks.busy}
            onSubmit={async (data) => {
              const title = textValue(data, 'title')
              if (!title) throw new Error('Give this priority a name.')
              const start = textValue(data, 'start'),
                end = textValue(data, 'end')
              if (taskEditor.category === 'schedule' && !start)
                throw new Error('Choose a start time for your plan.')
              if (end && (!start || end <= start))
                throw new Error('Choose an end time after the start time.')
              await tasks.save({
                ...taskEditor,
                date,
                title,
                category: taskEditor.category || 'personal',
                start_time: start,
                end_time: end,
                completed: taskEditor.completed || false,
                summary: textValue(data, 'summary'),
              })
              setTaskEditor(null)
            }}
          >
            <Field
              label={taskEditor.category === 'schedule' ? 'Plan' : 'Priority'}
            >
              <input
                autoFocus
                required
                name="title"
                defaultValue={taskEditor.title}
                placeholder={
                  taskEditor.category === 'schedule'
                    ? 'Read a book'
                    : 'Apply for one role'
                }
                maxLength={200}
              />
            </Field>
            <div className="form-grid">
              <Field
                label={
                  taskEditor.category === 'schedule'
                    ? 'Start time'
                    : 'Start time (optional)'
                }
              >
                <input
                  type="time"
                  name="start"
                  required={taskEditor.category === 'schedule'}
                  defaultValue={taskEditor.start_time}
                />
              </Field>
              <Field label="End time (optional)">
                <input
                  type="time"
                  name="end"
                  defaultValue={taskEditor.end_time}
                />
              </Field>
            </div>
            <p className="muted">
              Plan for {dayLabel(date)}. At the start time, a reminder appears
              in the header while the app is open. Times follow your device.
            </p>
            <Field label="Note or project link (optional)">
              <input name="summary" defaultValue={taskEditor.summary || ''} />
            </Field>
          </Form>
        </Dialog>
      )}
      {deleteTask && (
        <Dialog title="Remove this plan?" onClose={() => setDeleteTask(null)}>
          <Form
            submit="Remove plan"
            onCancel={() => setDeleteTask(null)}
            onSubmit={async () => {
              await tasks.remove(deleteTask)
              setDeleteTask(null)
            }}
          >
            <p className="muted">This removes only the selected task.</p>
          </Form>
        </Dialog>
      )}
      {manageHabits && (
        <Dialog
          title="Make a little room for habits"
          onClose={() => setManageHabits(false)}
        >
          <p className="muted">
            Keep two active extras. Your older habits are preserved here; pause
            any you don’t need.
          </p>
          {extras.map((h) => (
            <div className="task-row" key={h.id}>
              <input
                aria-label={'Complete ' + h.name}
                type="checkbox"
                checked={habitDone(h, habitLogs.rows, date)}
                disabled={future || habitLogs.busy || !h.is_active}
                onChange={() => ignoreHandled(toggleHabit(h))}
              />
              <div className="task-main">
                <strong>{h.name}</strong>
                <p>
                  {h.frequency} · {h.is_active ? 'Active' : 'Paused'}
                </p>
              </div>
              <button
                className="text-link"
                disabled={
                  habits.busy || (!h.is_active && activeHabits.length >= 2)
                }
                onClick={() =>
                  ignoreHandled(habits.save({ ...h, is_active: !h.is_active }))
                }
              >
                {h.is_active ? 'Pause' : 'Resume'}
              </button>
              <button
                className="icon-btn"
                aria-label={'Edit ' + h.name}
                onClick={() => {
                  setManageHabits(false)
                  setHabitEditor(h)
                }}
              >
                <Pencil size={13} />
              </button>
            </div>
          ))}
          <button
            className="btn view-all"
            disabled={activeHabits.length >= 2}
            onClick={() => {
              setManageHabits(false)
              setHabitEditor({})
            }}
          >
            <Plus size={14} />
            Add a habit
          </button>
        </Dialog>
      )}
      {habitEditor && (
        <Dialog
          title={habitEditor.id ? 'Edit habit' : 'Start small'}
          onClose={() => setHabitEditor(null)}
        >
          <Form
            onSubmit={async (data) => {
              const name = textValue(data, 'name')
              if (!name) throw new Error('Give your habit a name.')
              await habits.save({
                ...habitEditor,
                name,
                frequency: textValue(data, 'frequency') as Habit['frequency'],
                category: habitEditor.category || 'personal',
                target_value: 1,
                unit: 'check',
                color: '#3e6b50',
                is_active: habitEditor.is_active ?? true,
              })
              setHabitEditor(null)
            }}
          >
            <Field label="Habit">
              <input
                name="name"
                required
                maxLength={100}
                defaultValue={habitEditor.name}
                placeholder="Read for 10 minutes"
              />
            </Field>
            <Field label="Repeat">
              <select
                name="frequency"
                defaultValue={habitEditor.frequency || 'daily'}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Once a week</option>
              </select>
            </Field>
          </Form>
        </Dialog>
      )}
    </>
  )
}
