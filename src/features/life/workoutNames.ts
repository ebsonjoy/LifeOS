import type { FitnessLog, WorkoutRoutine } from '../../types'

export function workoutNameOptions(
  logs: FitnessLog[],
  routines: WorkoutRoutine[],
) {
  // Recent entries supply the spelling; case/spacing variants share one option.
  const unique = (names: (string | null | undefined)[]) => {
    const found = new Map<string, string>()
    for (const raw of names) {
      const name = raw?.trim().replace(/\s+/g, ' ')
      if (name && !found.has(name.toLocaleLowerCase()))
        found.set(name.toLocaleLowerCase(), name)
    }
    return [...found.values()]
  }
  const recentLogs = [...logs].sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      (b.updated_at || '').localeCompare(a.updated_at || ''),
  )
  const recentRoutines = routines
    .filter((r) => !r.is_rest)
    .sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))
  return {
    workouts: unique([
      ...recentLogs.map((r) => r.workout_type),
      ...recentRoutines.map((r) => r.name),
    ]),
    exercises: unique([
      ...recentLogs.flatMap((r) => [
        ...(r.exercises || []).map((e) => e.name),
        r.exercise_name,
      ]),
      ...recentRoutines.flatMap((r) => r.exercises.map((e) => e.name)),
    ]),
  }
}
