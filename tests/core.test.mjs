import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import path from 'node:path'

// Execute the real TypeScript modules in an isolated context, with only the
// network boundary replaced. No browser or real account data is touched.
async function modules(cloud = false, cloudError = null) {
  const items = new Map()
  const localStorage = {
    getItem: (k) => items.get(k) ?? null,
    setItem: (k, v) => items.set(k, v),
    removeItem: (k) => items.delete(k),
  }
  let remoteData = null
  const client = {
    auth: {
      getSession: async () => ({
        data: { session: { user: { id: 'user-1' } } },
        error: null,
      }),
    },
    from: () => {
      const builder = {
        then: (resolve) => resolve({ data: remoteData, error: cloudError }),
      }
      for (const key of [
        'select',
        'eq',
        'order',
        'single',
        'maybeSingle',
        'upsert',
        'insert',
        'update',
        'delete',
      ])
        builder[key] = () => builder
      return builder
    },
  }
  const context = vm.createContext({
    console,
    localStorage,
    crypto: globalThis.crypto,
    Date,
    Map,
    Set,
    Intl,
    Error,
    URL,
    setTimeout,
    clearTimeout,
  })
  const cache = new Map()
  const network = new vm.SyntheticModule(
    ['supabase', 'isSupabaseConfigured'],
    function () {
      this.setExport('supabase', client)
      this.setExport('isSupabaseConfigured', cloud)
    },
    { context },
  )
  async function load(filename) {
    filename = path.resolve(filename)
    if (cache.has(filename)) return cache.get(filename)
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText
    const module = new vm.SourceTextModule(code, {
      context,
      identifier: filename,
    })
    cache.set(filename, module)
    await module.link(async (spec, ref) =>
      spec.endsWith('/supabase')
        ? network
        : load(path.resolve(path.dirname(ref.identifier), spec + '.ts')),
    )
    return module
  }
  const auth = await load('src/lib/authSession.ts')
  await auth.evaluate()
  const repository = await load('src/lib/repository.ts')
  await repository.evaluate()
  const helpers = await load('src/features/life/helpers.ts')
  await helpers.evaluate()
  const records = await load('src/features/life/records.ts')
  await records.evaluate()
  const storage = cache.get(path.resolve('src/lib/storage.ts'))
  return {
    auth: auth.namespace,
    repository: repository.namespace.repository,
    records: records.namespace,
    helpers: helpers.namespace,
    storage: storage.namespace,
    items,
    localStorage,
    client,
    setRemote: (value) => {
      remoteData = value
    },
  }
}

test('local dates roll across month/year boundaries without UTC conversion', async () => {
  const { helpers: h } = await modules()
  assert.equal(h.shiftDay('2026-10-31', 1), '2026-11-01')
  assert.equal(h.shiftDay('2026-12-31', 1), '2027-01-01')
  assert.equal(h.shiftDay('2024-02-28', 1), '2024-02-29')
  assert.equal(h.shiftDay('2026-10-21', 1), '2026-10-22')
})
test('weekly habits stay completed for their week, but reset on Monday', async () => {
  const { helpers: h } = await modules()
  const habit = { id: 'h', frequency: 'weekly' }
  const logs = [{ habit_id: 'h', date: '2026-10-19', completed: true }]
  assert.equal(h.habitDone(habit, logs, '2026-10-25'), true)
  assert.equal(h.habitDone(habit, logs, '2026-10-26'), false)
  assert.equal(
    h.habitDone({ ...habit, frequency: 'daily' }, logs, '2026-10-20'),
    false,
  )
  assert.equal(
    h.habitDone(habit, [{ ...logs[0], date: '2026-10-23' }], '2026-10-21'),
    false,
  )
})
test('old exercise records group into sessions; new sessions stay distinct', async () => {
  const { helpers: h } = await modules()
  const logs = [
    {
      id: 'a',
      date: '2026-10-21',
      workout_type: 'Push',
      workout_completed: true,
    },
    {
      id: 'b',
      date: '2026-10-21',
      workout_type: 'Push',
      workout_completed: true,
    },
    {
      id: 'c',
      date: '2026-10-21',
      workout_type: 'Evening',
      workout_completed: true,
      exercises: [],
    },
    { id: 'd', date: '2026-10-21', workout_completed: false, weight: 80 },
  ]
  assert.equal(h.workoutSessions(logs).length, 2)
  assert.equal(h.workoutSessions(logs)[0].length, 2)
})
test('unsafe job links are rejected', async () => {
  const { helpers: h } = await modules()
  assert.equal(h.safeLink('javascript:alert(1)'), undefined)
  assert.equal(h.safeLink('data:text/html,hello'), undefined)
  assert.equal(h.safeLink('https://example.com/job'), 'https://example.com/job')
})
test('profile edits preserve onboarding state and dates', async () => {
  const { repository: r } = await modules()
  await r.upsertProfile({
    id: 'user-1',
    full_name: 'Original',
    onboarding_completed: true,
    transformation_start_date: '2026-01-01',
    transformation_target_date: '2029-01-01',
  })
  const updated = await r.upsertProfile({ id: 'user-1', full_name: 'Changed' })
  assert.equal(updated.onboarding_completed, true)
  assert.equal(updated.transformation_start_date, '2026-01-01')
  assert.equal(updated.transformation_target_date, '2029-01-01')
})
test('cloud write errors propagate and never save a local success', async () => {
  const { records: r, items } = await modules(true, {
    message: 'Network unavailable',
  })
  await assert.rejects(
    r.saveRecord('daily_plans', 'user-1', {
      date: '2026-10-21',
      title: 'Important',
      category: 'personal',
      start_time: '',
      end_time: '',
      completed: false,
    }),
    (e) => e.message === 'Network unavailable',
  )
  assert.equal(items.size, 0)
})
test('missing local tasks fail instead of fabricating a new record', async () => {
  const { records: r, items } = await modules()
  await assert.rejects(
    r.saveRecord('daily_plans', 'user-1', { id: 'missing', completed: true }),
    /no longer exists/,
  )
  assert.equal(items.size, 0)
})
test('local storage failures propagate; corrupted data is not silently replaced', async () => {
  const { storage: s, localStorage, items } = await modules()
  items.set('lifeos_local_test', 'not json')
  assert.throws(() => s.getLocalData('test', []), /could not be read/)
  localStorage.setItem = () => {
    throw new Error('Quota exceeded')
  }
  assert.throws(() => s.setLocalData('test', []), /Could not save/)
  assert.equal(items.get('lifeos_local_test'), 'not json')
})
test('a missing cloud daily log does not expose stale browser fallback data', async () => {
  const { records: r, items, setRemote } = await modules(true)
  setRemote([])
  items.set(
    'lifeos_local_daily_logs_user-1',
    JSON.stringify([{ date: '2026-10-21', journal: 'local only' }]),
  )
  assert.equal((await r.listRecords('daily_logs', 'user-1')).length, 0)
})

test('daily records update by date without losing existing fields or creating duplicates', async () => {
  const { records: r } = await modules()
  const first = await r.saveRecord('daily_logs', 'user-1', {
    date: '2026-10-21',
    journal: 'My original writing',
    accomplishments: 'Built my app',
  })
  const second = await r.saveRecord('daily_logs', 'user-1', {
    date: '2026-10-21',
    journal_corrected: 'My revised writing',
  })
  assert.equal(second.id, first.id)
  assert.equal(second.journal, 'My original writing')
  assert.equal((await r.listRecords('daily_logs', 'user-1')).length, 1)
})
test('multi-exercise workouts are stored as one session', async () => {
  const { records: r } = await modules()
  const saved = await r.saveRecord('fitness_logs', 'user-1', {
    date: '2026-10-21',
    workout_completed: true,
    exercises: [
      { name: 'Row', sets: 3, reps: 10, weight: 10 },
      { name: 'Press', sets: 3, reps: 8, weight: 15 },
    ],
  })
  assert.equal(saved.exercises.length, 2)
  assert.equal((await r.listRecords('fitness_logs', 'user-1')).length, 1)
})
test('missing schema has a specific actionable error', async () => {
  const { records: r, items } = await modules(true, {
    code: 'PGRST205',
    message: 'Table not found',
  })
  await assert.rejects(
    r.listRecords('english_sessions', 'user-1'),
    (e) =>
      e.name === 'SchemaUpdateRequired' &&
      e.message.includes('20261021_focus_cleanup.sql'),
  )
  assert.equal(items.size, 0)
})
test('expired cloud sessions cannot fall back to local writes', async () => {
  const { records: r, client, items } = await modules(true)
  client.auth.getSession = async () => ({
    data: { session: null },
    error: null,
  })
  await assert.rejects(
    r.saveRecord('meal_plans', 'user-1', { meal: 'Lunch' }),
    /session expired/,
  )
  assert.equal(items.size, 0)
})

test('scheduled plans become due on the correct local day and minute', async () => {
  const { helpers: h } = await modules()
  const tasks = [
    {
      id: 'read',
      title: 'Read a book',
      date: '2026-10-23',
      start_time: '09:00',
      end_time: '09:30',
      completed: false,
    },
    {
      id: 'later',
      title: 'Gym',
      date: '2026-10-23',
      start_time: '18:00',
      completed: false,
    },
    {
      id: 'done',
      title: 'Finished',
      date: '2026-10-23',
      start_time: '08:00',
      completed: true,
    },
    {
      id: 'untimed',
      title: 'Priority',
      date: '2026-10-23',
      start_time: '',
      completed: false,
    },
    {
      id: 'bad',
      title: 'Invalid time',
      date: '2026-10-23',
      start_time: '25:00',
      completed: false,
    },
  ]
  assert.equal(h.scheduleAt(tasks, new Date(2026, 9, 22, 9)).due.length, 0)
  const before = h.scheduleAt(tasks, new Date(2026, 9, 23, 8, 59, 59))
  assert.equal(before.due.length, 0)
  assert.equal(before.next.id, 'read')
  const atStart = h.scheduleAt(tasks, new Date(2026, 9, 23, 9, 0, 0))
  assert.equal(atStart.due[0].id, 'read')
  assert.equal(atStart.next.id, 'later')
  assert.equal(
    h.scheduleAt(tasks, new Date(2026, 9, 23, 10)).due[0].id,
    'read',
    'remains due when returning after the end time',
  )
  tasks[0].completed = true
  assert.equal(h.scheduleAt(tasks, new Date(2026, 9, 23, 10)).due.length, 0)
  assert.equal(h.scheduleAt(tasks, new Date(2026, 9, 24, 0)).due.length, 0)
  assert.equal(h.timeLabel('00:00'), '12:00 AM')
  assert.equal(h.timeLabel('12:00'), '12:00 PM')
  assert.equal(h.timeLabel('21:05'), '9:05 PM')
})

test('timetable plans save alongside priorities and retain tomorrow dates', async () => {
  const { records: r } = await modules()
  const saved = await r.saveRecord('daily_plans', 'user-1', {
    title: 'Read books',
    date: '2026-10-23',
    category: 'schedule',
    start_time: '09:00',
    end_time: '09:30',
    completed: false,
  })
  const loaded = await r.listRecords('daily_plans', 'user-1')
  assert.equal(loaded[0].id, saved.id)
  assert.equal(loaded[0].date, '2026-10-23')
  assert.equal(loaded[0].start_time, '09:00')
  assert.equal(loaded[0].category, 'schedule')
})

function authHarness() {
  let callback
  let resolve
  let reject
  let unsubscribed = false
  const auth = {
    onAuthStateChange: (fn) => {
      callback = fn
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              unsubscribed = true
            },
          },
        },
      }
    },
    getSession: () =>
      new Promise((yes, no) => {
        resolve = yes
        reject = no
      }),
  }
  return {
    auth,
    emit: (event, session) => callback(event, session),
    resolve: (session) => resolve({ data: { session }, error: null }),
    reject: (error) => reject(error),
    unsubscribed: () => unsubscribed,
  }
}
const flush = () => new Promise((resolve) => setImmediate(resolve))

test('newer auth events cannot be overwritten by a stale initial session', async () => {
  const { auth: a } = await modules()
  const h = authHarness(),
    values = [],
    errors = []
  const stop = a.observeSession(
    h.auth,
    (s) => values.push(s),
    (e) => errors.push(e),
  )
  h.emit('SIGNED_OUT', null)
  h.resolve({ user: { id: 'old-user' } })
  await flush()
  assert.deepEqual(values, [null])
  h.emit('SIGNED_IN', { user: { id: 'new-user' } })
  h.emit('TOKEN_REFRESHED', {
    user: { id: 'new-user' },
    access_token: 'renewed',
  })
  assert.equal(values.at(-1).access_token, 'renewed')
  assert.equal(errors.length, 0)
  stop()
  assert.equal(h.unsubscribed(), true)
})

test('session startup failures surface and disposed subscriptions ignore pending work', async () => {
  const { auth: a } = await modules()
  const h = authHarness(),
    values = [],
    errors = []
  const stop = a.observeSession(
    h.auth,
    (s) => values.push(s),
    (e) => errors.push(e),
  )
  h.reject(new Error('Offline'))
  await flush()
  assert.equal(errors[0].message, 'Offline')
  stop()
  h.emit('SIGNED_IN', { user: { id: 'ignored' } })
  assert.equal(values.length, 0)
  const pending = authHarness()
  const close = a.observeSession(
    pending.auth,
    (s) => values.push(s),
    (e) => errors.push(e),
  )
  close()
  pending.resolve({ user: { id: 'late' } })
  await flush()
  assert.equal(values.length, 0)
})

test('session restoration, profile invalidation, and safe return destinations', async () => {
  const { auth: a } = await modules()
  const h = authHarness(),
    values = []
  const stop = a.observeSession(
    h.auth,
    (s) => values.push(s),
    () => assert.fail('unexpected session failure'),
  )
  h.resolve({ user: { id: 'returning' } })
  await flush()
  assert.equal(values[0].user.id, 'returning')
  stop()
  const guard = a.requestGuard()
  const old = guard.begin()
  guard.invalidate() // logout/account switch/unmount
  assert.equal(old(), false)
  const current = guard.begin()
  assert.equal(current(), true)
  const newer = guard.begin()
  assert.equal(current(), false)
  assert.equal(newer(), true)
  assert.equal(
    a.safeReturnPath('/today?date=2026-10-23#timetable'),
    '/today?date=2026-10-23#timetable',
  )
  for (const path of [
    'https://evil.test',
    '//evil.test',
    '/\\evil.test',
    '/login',
    null,
  ])
    assert.equal(a.safeReturnPath(path), '/today')
  assert.equal(
    a.parseLocalUser(null),
    null,
    'logout must remain logged out on refresh',
  )
  assert.equal(
    a.parseLocalUser('{"id":"existing","email":"local@example.com"}').id,
    'existing',
  )
  assert.throws(() => a.parseLocalUser('{"id":7}'))
})

test('a stalled session check offers recovery instead of endless loading', async () => {
  const { auth: a } = await modules()
  const h = authHarness(),
    errors = [],
    sessions = []
  const stop = a.observeSession(
    h.auth,
    (s) => sessions.push(s),
    (e) => errors.push(e),
    5,
  )
  await new Promise((resolve) => setTimeout(resolve, 15))
  assert.match(errors[0].message, /taking too long/)
  h.resolve({ user: { id: 'recovered' } })
  await flush()
  assert.equal(sessions[0].user.id, 'recovered')
  stop()
})
