import { useState } from 'react'
import {
  Plus,
  Dumbbell,
  ArrowRight,
  Pencil,
  Trash2,
  Copy,
  Scale,
  Utensils,
} from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'
import { useAuth } from '../../context/AuthContext'
import { listRecords, useRecords } from '../../features/life/data'
import { shiftDay, workoutSessions } from '../../features/life/helpers'
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
  numberValue,
  textValue,
  useDay,
} from '../../features/life/ui'
import type {
  ExerciseSet,
  FitnessLog,
  MealPlan,
  WorkoutRoutine,
} from '../../types'
const dayNames = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]
const slots: MealPlan['slot'][] = ['Breakfast', 'Lunch', 'Dinner', 'Snack']
const blankExercise = (): ExerciseSet => ({
  id: crypto.randomUUID(),
  name: '',
  sets: 3,
  reps: 10,
  weight: 0,
})
function oldExercises(row: FitnessLog): ExerciseSet[] {
  return (
    row.exercises ||
    (row.exercise_name
      ? [
          {
            id: row.id,
            name: row.exercise_name,
            sets: row.sets || 1,
            reps: row.reps || 1,
            weight: row.weight_lifted || 0,
          },
        ]
      : [])
  )
}
function ExerciseEditor({
  rows,
  onChange,
}: {
  rows: ExerciseSet[]
  onChange: (rows: ExerciseSet[]) => void
}) {
  const edit = (id: string, key: keyof ExerciseSet, value: string | number) =>
    onChange(rows.map((r) => (r.id === id ? { ...r, [key]: value } : r)))
  return (
    <div>
      {rows.map((r) => (
        <div key={r.id} className="exercise-row">
          <Field label="Exercise">
            <input
              aria-label="Exercise name"
              required
              value={r.name}
              onChange={(e) => edit(r.id, 'name', e.target.value)}
              placeholder="Exercise name"
            />
          </Field>
          <Field label="Sets">
            <input
              type="number"
              required
              min={1}
              max={100}
              value={r.sets}
              onChange={(e) => edit(r.id, 'sets', Number(e.target.value))}
            />
          </Field>
          <Field label="Reps">
            <input
              type="number"
              required
              min={1}
              max={500}
              value={r.reps}
              onChange={(e) => edit(r.id, 'reps', Number(e.target.value))}
            />
          </Field>
          <Field label="Kg">
            <input
              type="number"
              required
              min={0}
              max={1000}
              step="0.5"
              value={r.weight}
              onChange={(e) => edit(r.id, 'weight', Number(e.target.value))}
            />
          </Field>
          <button
            type="button"
            className="icon-btn"
            aria-label={'Remove ' + (r.name || 'exercise')}
            onClick={() => onChange(rows.filter((x) => x.id !== r.id))}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="text-link"
        onClick={() => onChange([...rows, blankExercise()])}
      >
        <Plus size={14} />
        Add exercise
      </button>
    </div>
  )
}
export function Fitness() {
  const day = useDay()
  return <FitnessContent key={day.date} {...day} />
}
function FitnessContent({
  date,
  today,
  setDate,
}: {
  date: string
  today: string
  setDate: (d: string) => void
}) {
  const fitness = useRecords('fitness_logs'),
    routines = useRecords('workout_routines'),
    meals = useRecords('meal_plans')
  const { user } = useAuth()
  const weekday = new Date(date + 'T12:00:00').getDay()
  const [routineDay, setRoutineDay] = useState(weekday)
  const [workoutEditor, setWorkoutEditor] =
    useState<Partial<FitnessLog> | null>(null)
  const [routineEditor, setRoutineEditor] =
    useState<Partial<WorkoutRoutine> | null>(null)
  const [measurementEditor, setMeasurementEditor] =
    useState<Partial<FitnessLog> | null>(null)
  const [mealEditor, setMealEditor] = useState<Partial<MealPlan> | null>(null)
  const [exercises, setExercises] = useState<ExerciseSet[]>([])
  const [restEdit, setRestEdit] = useState(false)
  const [deletion, setDeletion] = useState<{
    table: 'fitness' | 'meals'
    id: string
  } | null>(null)
  const [copying, setCopying] = useState(false),
    [copyMessage, setCopyMessage] = useState('')
  const [exerciseName, setExerciseName] = useState('')
  const routine = routines.rows.find((r) => r.weekday === routineDay)
  const todayRoutine = routines.rows.find((r) => r.weekday === weekday)
  const rest = todayRoutine?.is_rest ?? weekday === 0
  const todayWorkouts = workoutSessions(
    fitness.rows.filter((w) => w.date === date),
  )
  const allSessions = workoutSessions(fitness.rows)
  const measurements = fitness.rows
    .filter((r) => r.weight != null || r.height != null)
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        b.created_at.localeCompare(a.created_at),
    )
  const latestWeight = measurements.find(
    (m) => m.date <= today && m.weight != null,
  )?.weight
  const latestHeight = measurements.find(
    (m) => m.date <= today && m.height != null,
  )?.height
  const weights = measurements
    .filter((m) => m.weight != null && m.date <= today)
    .slice()
    .reverse()
  const selectedMeals = meals.rows
    .filter((m) => m.date === date)
    .sort((a, b) => slots.indexOf(a.slot) - slots.indexOf(b.slot))
  const mealOptions = [
    ...new Set(['2 eggs', 'Bananas', ...meals.rows.map((m) => m.meal)]),
  ]
  const strength = fitness.rows
    .filter((r) => r.workout_completed)
    .flatMap((r) =>
      oldExercises(r).map((e) => ({ ...e, date: r.date, sessionId: r.id })),
    )
  const exerciseNames = [...new Set(strength.map((e) => e.name))].sort()
  const selectedExercise = exerciseName || exerciseNames[0] || ''
  const previous = (name: string) =>
    strength
      .filter(
        (e) =>
          e.name.toLowerCase().trim() === name.toLowerCase().trim() &&
          e.date < date,
      )
      .sort((a, b) => b.date.localeCompare(a.date))[0]
  const startWorkout = () => {
    setExercises(
      (todayRoutine?.exercises || []).map((e) => ({
        ...e,
        id: crypto.randomUUID(),
      })),
    )
    setWorkoutEditor({
      date,
      workout_type: todayRoutine?.name || 'Evening workout',
      duration_minutes: 0,
    })
  }
  const editRoutine = () => {
    setExercises(routine?.exercises || [])
    setRestEdit(routine?.is_rest ?? routineDay === 0)
    setRoutineEditor(
      routine || {
        weekday: routineDay,
        name: routineDay === 0 ? 'Rest day' : 'Evening workout',
        is_rest: routineDay === 0,
        start_time: '18:00',
        end_time: '20:00',
      },
    )
  }
  const checkedExercises = () => {
    if (
      exercises.some(
        (e) => !e.name.trim() || e.sets < 1 || e.reps < 1 || e.weight < 0,
      )
    )
      throw new Error('Complete each exercise name, sets, reps, and weight.')
    return exercises.map((e) => ({ ...e, name: e.name.trim() }))
  }
  return (
    <>
      <PageIntro
        eyebrow="BUILD STRENGTH, FIND BALANCE"
        title="Show up for yourself."
        description="Your training, meals, and measurements. All in one place."
      >
        <DayPicker date={date} today={today} onChange={setDate} />
      </PageIntro>
      <DataNotice queries={[fitness, routines, meals]} />
      <div className="summary-strip">
        <div className="summary-item">
          <span className="eyebrow">GYM THIS WEEK</span>
          <strong>
            {
              allSessions.filter(
                (g) => g[0].date >= shiftDay(today, -6) && g[0].date <= today,
              ).length
            }
            <span className="muted">
              {' '}
              {allSessions.filter(
                (g) => g[0].date >= shiftDay(today, -6) && g[0].date <= today,
              ).length === 1
                ? 'session'
                : 'sessions'}
            </span>
          </strong>
          <p>Last seven days</p>
        </div>
        <div className="summary-item">
          <span className="eyebrow">LATEST WEIGHT</span>
          <strong>
            {latestWeight ?? '—'}
            <span className="muted"> kg</span>
          </strong>
          <p>Your most recent measurement</p>
        </div>
        <div className="summary-item">
          <span className="eyebrow">LATEST HEIGHT</span>
          <strong>
            {latestHeight ?? '—'}
            <span className="muted"> cm</span>
          </strong>
          <p>Update whenever you measure</p>
        </div>
      </div>
      <div className="two-col">
        <div className="stack">
          <section className="feature-card">
            <div>
              <div className="eyebrow">
                {dayNames[weekday].toUpperCase()} /{' '}
                {rest
                  ? 'REST DAY'
                  : `${todayRoutine?.start_time || '18:00'} – ${todayRoutine?.end_time || '20:00'}`}
              </div>
              <h2>
                {todayRoutine?.name ||
                  (rest ? 'Time to recharge.' : 'Your evening session.')}
              </h2>
              <p>
                {todayWorkouts.length
                  ? 'Your workout is saved and checked off in Today.'
                  : rest
                    ? 'Give yourself space to recover. Your next session is waiting.'
                    : 'Follow your routine and record what you actually did.'}
              </p>
              <button
                className="btn"
                disabled={
                  date > today ||
                  fitness.busy ||
                  fitness.isLoading ||
                  !!fitness.error
                }
                onClick={startWorkout}
              >
                <Plus size={14} />
                Log a workout
              </button>
            </div>
            <div className="feature-art">
              <Dumbbell size={39} />
            </div>
          </section>
          <Panel
            title="Your weekly routine"
            subtitle="Monday–Saturday evenings. Edit any day to suit your schedule."
            action={
              <button
                className="text-link"
                disabled={routines.isLoading || !!routines.error}
                onClick={editRoutine}
              >
                <Pencil size={13} />
                Edit day
              </button>
            }
          >
            <div className="routine-days">
              {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                <button
                  className={'chip ' + (routineDay === d ? 'active' : '')}
                  key={d}
                  onClick={() => setRoutineDay(d)}
                >
                  {dayNames[d].slice(0, 3)}
                </button>
              ))}
            </div>
            <h3 style={{ fontSize: 14, marginBottom: 12 }}>
              {routine?.name ||
                (routineDay === 0 ? 'Rest day' : 'Add your workout plan')}
            </h3>
            {routine?.exercises.length ? (
              routine.exercises.map((e) => {
                const last = previous(e.name)
                return (
                  <div className="task-row" key={e.id}>
                    <div className="task-main">
                      <strong>{e.name}</strong>
                      <p>
                        {e.sets} sets × {e.reps} reps · {e.weight} kg
                        {last &&
                          ` · Last time: ${last.weight} kg × ${last.reps}`}
                      </p>
                    </div>
                  </div>
                )
              })
            ) : (
              <Empty>
                {(routine?.is_rest ?? routineDay === 0)
                  ? 'Rest is part of the plan.'
                  : 'Add exercises you want to follow. You can change them as you learn.'}
              </Empty>
            )}
          </Panel>
          <Panel title="Workout log" subtitle={dayLabel(date)}>
            {!todayWorkouts.length && (
              <Empty>No workout logged for this date.</Empty>
            )}
            {todayWorkouts.map((group) => (
              <article key={group[0].id} className="session-row">
                <div className="session-heading">
                  <strong>{group[0].workout_type || 'Workout'}</strong>
                  <span className="pill">
                    {Math.max(...group.map((g) => g.duration_minutes))} min
                  </span>
                </div>
                {group.map((row) => (
                  <div key={row.id}>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Exercise</th>
                            <th>Sets × reps</th>
                            <th>Weight</th>
                          </tr>
                        </thead>
                        <tbody>
                          {oldExercises(row).map((e) => (
                            <tr key={e.id}>
                              <td>{e.name}</td>
                              <td>
                                {e.sets} × {e.reps}
                              </td>
                              <td>{e.weight} kg</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {row.notes && <p style={{ marginTop: 8 }}>{row.notes}</p>}
                    <div className="form-actions">
                      <button
                        className="text-link"
                        onClick={() => {
                          setExercises(oldExercises(row))
                          setWorkoutEditor(row)
                        }}
                      >
                        Edit {group.length > 1 ? 'entry' : 'workout'}
                      </button>
                      <button
                        className="icon-btn"
                        aria-label="Delete workout entry"
                        onClick={() =>
                          setDeletion({ table: 'fitness', id: row.id })
                        }
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </article>
            ))}
          </Panel>
          <Panel
            title="Strength over time"
            subtitle="Compare the same exercise, including its sets and reps."
          >
            {exerciseNames.length ? (
              <>
                <Field label="Exercise">
                  <select
                    value={selectedExercise}
                    onChange={(e) => setExerciseName(e.target.value)}
                  >
                    {exerciseNames.map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                </Field>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Sets × reps</th>
                        <th>Weight</th>
                      </tr>
                    </thead>
                    <tbody>
                      {strength
                        .filter((e) => e.name === selectedExercise)
                        .sort((a, b) => b.date.localeCompare(a.date))
                        .slice(0, 12)
                        .map((e, i) => (
                          <tr key={e.sessionId + e.id + i}>
                            <td>
                              <button
                                className="text-link"
                                onClick={() => setDate(e.date)}
                              >
                                {e.date}
                              </button>
                            </td>
                            <td>
                              {e.sets} × {e.reps}
                            </td>
                            <td>{e.weight} kg</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <Empty>
                Your exercise history will appear after your first workout.
              </Empty>
            )}
          </Panel>
        </div>
        <div className="stack">
          <div id="meals">
            <Panel
              title="A little meal planning"
              subtitle={dayLabel(date)}
              action={<Utensils size={17} />}
            >
              {!selectedMeals.length && (
                <Empty>
                  Plan meals you actually enjoy.
                  <br />
                  Save them once and reuse them.
                </Empty>
              )}
              {selectedMeals.map((m) => (
                <div className="meal-row" key={m.id}>
                  <span className="meal-label">{m.slot}</span>
                  <div className="meal-body">
                    {m.meal}
                    {m.note && <small>{m.note}</small>}
                    <select
                      aria-label={m.meal + ' status'}
                      value={m.status}
                      disabled={date > today || meals.busy}
                      style={{ marginTop: 7, fontSize: 10, padding: 5 }}
                      onChange={(e) =>
                        ignoreHandled(
                          meals.save({
                            ...m,
                            status: e.target.value as MealPlan['status'],
                          }),
                        )
                      }
                    >
                      <option value="planned">Planned</option>
                      <option value="followed">Followed plan</option>
                      <option value="changed">Changed meal</option>
                    </select>
                  </div>
                  <button
                    className="icon-btn"
                    aria-label={'Edit ' + m.meal}
                    onClick={() => setMealEditor(m)}
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    className="icon-btn"
                    aria-label={'Delete ' + m.meal}
                    onClick={() => setDeletion({ table: 'meals', id: m.id })}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              <button
                className="text-link view-all"
                disabled={meals.isLoading || !!meals.error}
                onClick={() =>
                  setMealEditor({ date, slot: 'Breakfast', status: 'planned' })
                }
              >
                <Plus size={14} />
                Add a meal
              </button>
              {selectedMeals.length > 0 && (
                <div style={{ marginTop: 18 }}>
                  <button
                    className="btn secondary small"
                    disabled={copying || meals.busy}
                    onClick={async () => {
                      setCopying(true)
                      setCopyMessage('')
                      try {
                        const all = await listRecords('meal_plans', user!.id)
                        const target = shiftDay(date, 1)
                        for (const m of selectedMeals) {
                          if (
                            !all.some(
                              (x) =>
                                x.date === target &&
                                x.slot === m.slot &&
                                x.meal === m.meal,
                            )
                          )
                            await meals.save({
                              date: target,
                              slot: m.slot,
                              meal: m.meal,
                              status: 'planned',
                              note: m.note,
                            })
                        }
                        setCopyMessage('Meals copied to ' + target)
                      } catch {
                        setCopyMessage(
                          'Could not copy all meals. Retry to copy the remaining meals.',
                        )
                      } finally {
                        setCopying(false)
                      }
                    }}
                  >
                    <Copy size={12} />
                    {copying ? 'Copying…' : 'Copy meals to next day'}
                  </button>
                  {copyMessage && (
                    <p className="muted" role="status" style={{ marginTop: 8 }}>
                      {copyMessage}
                    </p>
                  )}
                </div>
              )}
            </Panel>
          </div>
          <Panel
            title="Body measurements"
            subtitle="Keep a record of your weight and height."
            action={<Scale size={17} />}
          >
            <button
              className="btn secondary"
              disabled={date > today || fitness.isLoading || !!fitness.error}
              onClick={() => setMeasurementEditor({ date })}
            >
              <Plus size={14} />
              Add measurement
            </button>
            {weights.length > 1 ? (
              <div
                className="progress-chart"
                role="img"
                aria-label="Body weight trend in kilograms"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={weights.map((w) => ({
                      date: w.date,
                      weight: w.weight,
                    }))}
                    margin={{ top: 25, right: 10, left: -22, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d) => d.slice(5)}
                      tick={{ fontSize: 9, fill: 'var(--muted)' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={['auto', 'auto']}
                      tick={{ fontSize: 9, fill: 'var(--muted)' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--surface)',
                        borderColor: 'var(--line)',
                        borderRadius: 8,
                        color: 'var(--ink)',
                        fontSize: 11,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="var(--accent)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="muted" style={{ marginTop: 15 }}>
                Add two weight entries to see your trend.
              </p>
            )}
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Kg</th>
                    <th>Cm</th>
                    <th>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {measurements.slice(0, 12).map((m) => (
                    <tr key={m.id}>
                      <td>{m.date}</td>
                      <td>{m.weight ?? '—'}</td>
                      <td>{m.height ?? '—'}</td>
                      <td>
                        <button
                          className="icon-btn"
                          aria-label={'Edit measurement ' + m.date}
                          onClick={() => setMeasurementEditor(m)}
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          className="icon-btn"
                          aria-label={'Delete measurement ' + m.date}
                          onClick={() =>
                            setDeletion({ table: 'fitness', id: m.id })
                          }
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
          <Panel title="Past sessions">
            <div className="stack">
              {[...new Set(allSessions.map((g) => g[0].date))]
                .slice(0, 10)
                .map((d) => (
                  <button
                    key={d}
                    className="text-link"
                    onClick={() => setDate(d)}
                  >
                    {dayLabel(d)}
                    <ArrowRight size={12} />
                  </button>
                ))}
              {!allSessions.length && (
                <p className="muted">Your training history will grow here.</p>
              )}
            </div>
          </Panel>
        </div>
      </div>
      {workoutEditor && (
        <Dialog
          title={workoutEditor.id ? 'Edit workout' : 'Log your workout'}
          onClose={() => setWorkoutEditor(null)}
        >
          <Form
            busy={fitness.busy}
            onSubmit={async (data) => {
              const list = checkedExercises()
              if (!list.length) throw new Error('Add at least one exercise.')
              await fitness.save({
                ...workoutEditor,
                date: workoutEditor.date || date,
                workout_completed: true,
                workout_type: textValue(data, 'name'),
                duration_minutes: numberValue(data, 'duration'),
                exercises: list,
                notes: textValue(data, 'notes'),
              })
              setWorkoutEditor(null)
            }}
          >
            <Field label="Workout name">
              <input
                required
                name="name"
                defaultValue={workoutEditor.workout_type || 'Evening workout'}
              />
            </Field>
            <ExerciseEditor rows={exercises} onChange={setExercises} />
            <Field label="Duration in minutes">
              <input
                type="number"
                name="duration"
                min={1}
                max={1440}
                required
                defaultValue={workoutEditor.duration_minutes || 60}
              />
            </Field>
            <Field label="Notes (optional)">
              <textarea
                rows={2}
                name="notes"
                defaultValue={workoutEditor.notes || ''}
                placeholder="How did it feel?"
              />
            </Field>
          </Form>
        </Dialog>
      )}
      {routineEditor && (
        <Dialog
          title={'Plan ' + dayNames[routineEditor.weekday ?? 0]}
          onClose={() => setRoutineEditor(null)}
        >
          <Form
            busy={routines.busy}
            onSubmit={async (data) => {
              const start = textValue(data, 'start'),
                end = textValue(data, 'end')
              if (!restEdit && end <= start)
                throw new Error('End time must be after start time.')
              await routines.save({
                ...routineEditor,
                name: textValue(data, 'name'),
                is_rest: restEdit,
                start_time: start || '18:00',
                end_time: end || '20:00',
                exercises: restEdit ? [] : checkedExercises(),
              })
              setRoutineEditor(null)
            }}
          >
            <Field label="Name">
              <input name="name" required defaultValue={routineEditor.name} />
            </Field>
            <label className="check-status">
              <input
                type="checkbox"
                checked={restEdit}
                onChange={(e) => setRestEdit(e.target.checked)}
              />
              Rest day
            </label>
            {!restEdit && (
              <>
                <div className="form-grid">
                  <Field label="Start">
                    <input
                      required
                      type="time"
                      name="start"
                      defaultValue={routineEditor.start_time}
                    />
                  </Field>
                  <Field label="End">
                    <input
                      required
                      type="time"
                      name="end"
                      defaultValue={routineEditor.end_time}
                    />
                  </Field>
                </div>
                <ExerciseEditor rows={exercises} onChange={setExercises} />
              </>
            )}
          </Form>
        </Dialog>
      )}
      {measurementEditor && (
        <Dialog
          title={
            measurementEditor.id ? 'Edit measurement' : 'Record a measurement'
          }
          onClose={() => setMeasurementEditor(null)}
        >
          <Form
            onSubmit={async (data) => {
              const weight = textValue(data, 'weight')
                  ? numberValue(data, 'weight')
                  : null,
                height = textValue(data, 'height')
                  ? numberValue(data, 'height')
                  : null
              if (weight === null && height === null)
                throw new Error('Enter your weight or height.')
              await fitness.save({
                ...measurementEditor,
                date: textValue(data, 'date'),
                workout_completed: measurementEditor.workout_completed || false,
                duration_minutes: measurementEditor.duration_minutes || 0,
                weight,
                height,
              })
              setMeasurementEditor(null)
            }}
          >
            <Field label="Date">
              <input
                type="date"
                name="date"
                required
                max={today}
                defaultValue={measurementEditor.date}
              />
            </Field>
            <div className="form-grid">
              <Field label="Body weight (kg)">
                <input
                  name="weight"
                  type="number"
                  min={1}
                  max={500}
                  step="0.1"
                  defaultValue={measurementEditor.weight ?? ''}
                />
              </Field>
              <Field label="Height (cm)">
                <input
                  name="height"
                  type="number"
                  min={30}
                  max={300}
                  step="0.1"
                  defaultValue={measurementEditor.height ?? ''}
                />
              </Field>
            </div>
            <p className="muted">
              Either measurement is enough. Record your actual measurements.
            </p>
          </Form>
        </Dialog>
      )}
      {mealEditor && (
        <Dialog
          title={mealEditor.id ? 'Edit meal' : 'Plan a meal'}
          onClose={() => setMealEditor(null)}
        >
          <Form
            onSubmit={async (data) => {
              const meal = textValue(data, 'meal')
              if (!meal) throw new Error('Enter a meal.')
              await meals.save({
                ...mealEditor,
                date,
                slot: textValue(data, 'slot') as MealPlan['slot'],
                meal,
                status: mealEditor.status || 'planned',
                note: textValue(data, 'note'),
              })
              setMealEditor(null)
            }}
          >
            <Field label="Meal time">
              <select name="slot" defaultValue={mealEditor.slot}>
                {slots.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field
              label="What are you having?"
              hint="Choose a previous meal or type a new one."
            >
              <input
                name="meal"
                list="saved-meals"
                required
                defaultValue={mealEditor.meal}
                placeholder="Rice, vegetables, and…"
              />
              <datalist id="saved-meals">
                {mealOptions.map((m) => (
                  <option value={m} key={m} />
                ))}
              </datalist>
            </Field>
            <Field label="Portion, preparation, or changes (optional)">
              <textarea rows={2} name="note" defaultValue={mealEditor.note} />
            </Field>
          </Form>
        </Dialog>
      )}
      {deletion && (
        <Dialog title="Remove this entry?" onClose={() => setDeletion(null)}>
          <Form
            submit="Remove entry"
            onCancel={() => setDeletion(null)}
            onSubmit={async () => {
              await (deletion.table === 'fitness' ? fitness : meals).remove(
                deletion.id,
              )
              setDeletion(null)
            }}
          >
            <p className="muted">Only the selected entry will be removed.</p>
          </Form>
        </Dialog>
      )}
    </>
  )
}
