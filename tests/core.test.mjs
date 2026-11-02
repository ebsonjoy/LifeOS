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
  const workoutNames = await load('src/features/life/workoutNames.ts')
  await workoutNames.evaluate()
  const jobSearch = await load('src/features/life/jobSearch.ts')
  await jobSearch.evaluate()
  const helpers = await load('src/features/life/helpers.ts')
  await helpers.evaluate()
  const habits = await load('src/features/life/habits.ts')
  await habits.evaluate()
  const progress = await load('src/features/life/progress.ts')
  await progress.evaluate()
  const library = await load('src/features/life/planLibrary.ts')
  await library.evaluate()
  const planner = await load('src/features/life/plans.ts')
  await planner.evaluate()
  const money = await load('src/features/life/money.ts')
  await money.evaluate()
  const works = await load('src/features/life/works.ts')
  await works.evaluate()
  const records = await load('src/features/life/records.ts')
  await records.evaluate()
  const storage = cache.get(path.resolve('src/lib/storage.ts'))
  return {
    auth: auth.namespace,
    repository: repository.namespace.repository,
    records: records.namespace,
    helpers: helpers.namespace,
    habits: habits.namespace,
    progress: progress.namespace,
    works: works.namespace,
    planner: planner.namespace,
    library: library.namespace,
    money: money.namespace,
    workoutNames: workoutNames.namespace,
    jobSearch: jobSearch.namespace,
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

test('saved workout and exercise choices combine legacy logs and routines without duplicate names', async () => {
  const { workoutNames: w } = await modules()
  const logs = [
    {
      date: '2026-10-01',
      workout_type: ' pull  day ',
      exercise_name: 'Dumbbell row',
      exercises: undefined,
    },
    {
      date: '2026-10-24',
      workout_type: 'Pull day',
      exercises: [{ name: 'dumbbell  row' }, { name: 'Pull-up' }],
    },
    { date: '2026-10-24', workout_type: null, weight: 70, exercises: [] },
  ]
  const routines = [
    {
      name: 'Leg day',
      is_rest: false,
      exercises: [{ name: 'Squat' }, { name: ' ' }],
    },
    { name: 'Rest day', is_rest: true, exercises: [] },
  ]
  const original = JSON.stringify(logs)
  const result = w.workoutNameOptions(logs, routines)
  assert.deepEqual(Array.from(result.workouts), ['Pull day', 'Leg day'])
  assert.deepEqual(Array.from(result.exercises), [
    'dumbbell row',
    'Pull-up',
    'Squat',
  ])
  assert.equal(
    JSON.stringify(logs),
    original,
    'suggestions must not rewrite existing records',
  )
  assert.equal(w.workoutNameOptions([], []).workouts.length, 0)
})


test('job resources validate web links, preserve search URLs, and copy the right text', async () => {
  const { jobSearch: j } = await modules()
  const base = { kind:'platform', title:'  Saved search  ', content:' notes ', url:'https://example.com/jobs?q=frontend%20developer&remote=1', is_pinned:true }
  const resource = j.prepareJobResource(base)
  assert.equal(resource.title, 'Saved search')
  assert.equal(resource.content, 'notes')
  assert.equal(resource.url, base.url)
  assert.equal(j.resourceCopyText(resource), base.url)
  for (const url of ['javascript:alert(1)', 'data:text/html,test', '', 'not a url']) assert.throws(() => j.prepareJobResource({...base,url}))
  assert.throws(() => j.prepareJobResource({...base,title:' '}))
  assert.throws(() => j.prepareJobResource({...base,kind:'unknown'}))
  const keyword = j.prepareJobResource({...base,kind:'keyword',title:'"frontend" AND React',url:''})
  assert.equal(j.resourceCopyText(keyword), '"frontend" AND React')
  assert.equal(keyword.url, null)
  assert.equal(j.resourceCopyText({...keyword,kind:'note',content:'My intro'}), 'My intro')
})

test('toolkit resources persist, can be edited/deleted, and remain account-scoped', async () => {
  const { records: r } = await modules()
  const saved = await r.saveRecord('job_search_resources','user-1',{kind:'keyword',title:'React developer',content:'Remote',url:null,is_pinned:false})
  const updated = await r.saveRecord('job_search_resources','user-1',{id:saved.id,is_pinned:true})
  assert.equal(updated.title,'React developer')
  assert.equal(updated.is_pinned,true)
  assert.equal((await r.listRecords('job_search_resources','user-2')).length,0)
  await r.removeRecord('job_search_resources','user-1',saved.id)
  assert.equal((await r.listRecords('job_search_resources','user-1')).length,0)
})

test('toolkit setup errors point to its additive migration', async () => {
  const { records: r } = await modules(true,{code:'PGRST205',message:'table missing'})
  await assert.rejects(r.listRecords('job_search_resources','user-1'), /20261024_job_search_resources.sql/)
})

test('job views include technical interviews and sort pinned resources first', async () => {
  const { jobSearch: j } = await modules()
  const job = {company:'Example', role:'Engineer',location:'Remote',notes:'Referral',status:'technical',follow_up_date:'2026-10-23',interview_date:'2026-10-26'}
  assert.equal(j.matchesJob(job,'interview',' remote '),true)
  assert.equal(j.matchesJob(job,'saved',''),false)
  assert.equal(j.matchesJob({...job,status:'withdrawn'},'active',''),false)
  assert.equal(j.nextJobAction(job,'2026-10-24').date,'2026-10-23')
  assert.equal(j.nextJobAction({...job,status:'rejected'},'2026-10-24'),null)
  assert.equal(j.nextJobAction({...job,follow_up_date:null,interview_date:'2026-10-20'},'2026-10-24'),null)
  const resources = [{id:'new',title:'Remote role',content:'',is_pinned:false,updated_at:'2026-10-24'},{id:'pinned',title:'Old role',content:'Remote',is_pinned:true,updated_at:'2026-10-20'}]
  assert.deepEqual(Array.from(j.sortedResources(resources,'remote'), (r) => r.id),['pinned','new'])
  assert.equal(resources[0].id,'new')
})

test('habit counts distinguish missing days, explicit zeros, and legacy unchecked logs', async () => {
  const { habits: h } = await modules()
  assert.equal(h.habitCount(), null)
  assert.equal(h.habitCount({completed:false, value:1}), 0)
  assert.equal(h.habitCount({completed:true, value:null}), 1)
  assert.equal(h.habitCount({completed:true, value:4}), 4)
  const habit = {id:'h', frequency:'daily'}
  const logs = [
    {habit_id:'h',date:'2026-10-25',completed:true,value:4},
    {habit_id:'h',date:'2026-10-26',completed:false,value:0},
    {habit_id:'other',date:'2026-10-27',completed:true,value:100},
    {habit_id:'h',date:'2026-10-28',completed:true,value:100},
  ]
  const summary = h.habitSummary(habit,logs,'2026-10-27',7)
  assert.equal(summary.total,4)
  assert.equal(summary.recorded,2)
  assert.equal(summary.zeroDays,1)
  assert.equal(summary.occurrenceDays,1)
  assert.equal(summary.days[6].value,null)
})

test('habit periods respect rolling days, Monday boundaries, and old weekly habits', async () => {
  const { habits: h } = await modules()
  assert.equal(h.habitWindow({frequency:'weekly'},'2026-10-25').start,'2026-10-19')
  assert.equal(h.habitWindow({frequency:'weekly'},'2026-10-26').days,1)
  assert.equal(h.habitWindow({period_days:3},'2027-01-01').start,'2026-12-30')
  assert.equal(h.habitWindow({period_days:2},'2026-11-01').start,'2026-10-31')
  assert.equal(h.habitPeriod({frequency:'daily'}),1)
  assert.equal(h.habitTarget({target_value:null}),1)
})

test('habit goals validate whole counts and allow a zero maximum only for reduction', async () => {
  const { habits: h } = await modules()
  const base = {name:'  Scrolling  ',habit_type:'bad',period_days:3,target_value:1,unit:' sessions ',description:' A short walk instead '}
  const goal = h.prepareHabit(base)
  assert.equal(goal.name,'Scrolling')
  assert.equal(goal.unit,'sessions')
  assert.equal(goal.period_days,3)
  assert.equal(h.prepareHabit({...base,target_value:0}).target_value,0)
  assert.throws(() => h.prepareHabit({...base,habit_type:'good',target_value:0}))
  assert.throws(() => h.prepareHabit({...base,period_days:4}))
  assert.throws(() => h.prepareHabit({...base,habit_type:'unknown'}))
  for (const value of [-1,1.5,NaN,Infinity,10000]) assert.throws(() => h.validateHabitCount(value))
})

test('daily count corrections and zero entries preserve other days and notes', async () => {
  const { records:r, habits:h } = await modules()
  const habit = await r.saveRecord('habits','user-1',{name:'Scrolling',habit_type:'bad',period_days:3,target_value:1,is_active:true})
  await r.saveRecord('habit_logs','user-1',{habit_id:habit.id,date:'2026-10-25',completed:true,value:4,note:'After work'})
  await r.saveRecord('habit_logs','user-1',{habit_id:habit.id,date:'2026-10-26',completed:true,value:2})
  const corrected = await r.saveRecord('habit_logs','user-1',{habit_id:habit.id,date:'2026-10-25',completed:true,value:3})
  assert.equal(corrected.note,'After work')
  await r.saveRecord('habit_logs','user-1',{habit_id:habit.id,date:'2026-10-27',completed:false,value:0})
  const logs = await r.listRecords('habit_logs','user-1')
  assert.equal(logs.length,3)
  assert.equal(h.habitSummary(habit,logs,'2026-10-27',3).total,5)
  assert.equal(h.habitSummary(habit,logs,'2026-10-27',3).recorded,3)
  await r.saveRecord('habits','user-1',{id:habit.id,target_value:0,is_active:false})
  assert.equal((await r.listRecords('habit_logs','user-1')).length,3)
  assert.equal((await r.listRecords('habit_logs','user-2')).length,0)
})

test('missing habit columns provide the correct additive migration', async () => {
  const { records:r } = await modules(true,{code:'PGRST204',message:'column missing'})
  await assert.rejects(r.saveRecord('habits','user-1',{name:'Reading',habit_type:'good'}),/20261027_habit_counts.sql/)
})

test('plan outcomes preserve legacy completion and stop reminders for incomplete work', async () => {
  const {progress:p,helpers:h}=await modules()
  const old={id:'p',date:'2026-10-27',title:'Read',start_time:'09:00',end_time:'10:00',completed:true}
  assert.equal(p.planStatus(old),'completed')
  const incomplete=p.planOutcome(old,'incomplete')
  assert.equal(incomplete.completed,false)
  assert.equal(incomplete.status,'incomplete')
  assert.equal(h.scheduleAt([incomplete],new Date(2026,9,27,10,0)).due.length,0)
  assert.equal(h.scheduleAt([p.planOutcome(old,'planned')],new Date(2026,9,27,10,0)).due.length,1)
})

test('retrying a plan preserves original outcomes and cannot reset or duplicate an existing attempt', async () => {
  const {progress:p,records:r}=await modules()
  const original=await r.saveRecord('daily_plans','user-1',{date:'2026-10-27',title:'Solve problems',category:'personal',start_time:'09:00',end_time:'10:00',status:'incomplete',completed:false,actual_minutes:30})
  const draft=p.copyPlanToDate(original,'2026-10-28')
  assert.equal(draft.status,'planned')
  assert.equal(draft.actual_minutes,null)
  assert.equal(draft.source_plan_id,original.id)
  assert.throws(()=>p.copyPlanToDate(original,'2026-10-27'))
  assert.throws(()=>p.copyPlanToDate(original,'2026-02-30'))
  const first=await r.saveRecord('daily_plans','user-1',draft)
  await r.saveRecord('daily_plans','user-1',p.planOutcome(first,'completed'))
  const repeated=await r.saveRecord('daily_plans','user-1',draft)
  assert.equal(repeated.id,first.id)
  assert.equal(repeated.status,'completed')
  const rows=await r.listRecords('daily_plans','user-1')
  assert.equal(rows.length,2)
  assert.equal(rows.find((x)=>x.id===original.id).status,'incomplete')
  assert.equal(rows.find((x)=>x.id===original.id).actual_minutes,30)
})

test('cloud plan copies use conflict-safe inserts and retrieve an existing attempt unchanged', async()=>{
  const {records:r,client}=await modules(true)
  let upsertOptions
  const existing={id:'existing',date:'2026-10-28',status:'completed'}
  client.from=()=>{
    const chain={select:()=>chain,eq:()=>chain,upsert:(_row,options)=>{upsertOptions=options;return chain},maybeSingle:async()=>({data:null,error:null}),single:async()=>({data:existing,error:null})}
    return chain
  }
  const result=await r.saveRecord('daily_plans','user-1',{date:'2026-10-28',source_plan_id:'original',title:'Read',status:'planned'})
  assert.equal(upsertOptions.ignoreDuplicates,true)
  assert.equal(upsertOptions.onConflict,'user_id,date,source_plan_id')
  assert.equal(result.status,'completed')
})

test('completion charts count explicit outcomes without treating missing entries as failures',async()=>{
  const {progress:p}=await modules()
  const rows=[{date:'2026-12-31',status:'completed'},{date:'2027-01-01',status:'incomplete'},{date:'2027-01-01',status:'planned'}]
  const totals=p.outcomeTotals(rows)
  assert.equal(totals.rate,50)
  assert.equal(totals.pending,1)
  assert.equal(p.outcomeTotals([{status:'planned'}]).rate,null)
  const series=p.completionSeries(rows,'2027-01-01',3)
  assert.equal(series[0].date,'2026-12-30')
  assert.equal(series[0].incomplete,0)
  assert.equal(series[1].completed,1)
  assert.equal(series[2].incomplete,1)
})

test('time conversion distinguishes zero from unlogged, validates overnight intervals, and keeps chart gaps',async()=>{
  const {progress:p}=await modules()
  assert.equal(p.hoursToMinutes(''),null)
  assert.equal(p.hoursToMinutes('0'),0)
  assert.equal(p.hoursToMinutes('1.5'),90)
  assert.equal(p.durationLabel(90),'1h 30m')
  for(const invalid of ['-1','25','abc','Infinity'])assert.throws(()=>p.hoursToMinutes(invalid))
  assert.equal(p.plannedDuration('22:00','06:00',true),480)
  assert.throws(()=>p.plannedDuration('22:00','06:00',false))
  assert.throws(()=>p.plannedDuration('09:00','10:00',true))
  const rows=[{date:'2026-10-27',activity_key:'deep_work',kind:'time',actual_minutes:0},{date:'2026-10-27',activity_key:'sleep',kind:'time',actual_minutes:450}]
  const series=p.timeSeries(rows,'2026-10-27',2)
  assert.equal(series[0].deep_work,null)
  assert.equal(series[1].deep_work,0)
  assert.equal(series[1].sleep,7.5)
  assert.equal(series[1].problem_solving,null)
})

test('daily activity upserts by day and activity and remains isolated by account',async()=>{
  const {records:r,progress:p,auth}=await modules()
  const saved=await r.saveRecord('daily_activity','user-1',{...p.defaultActivity('2026-10-27','sleep','Sleep','time'),actual_minutes:450})
  const updated=await r.saveRecord('daily_activity','user-1',{date:'2026-10-27',activity_key:'sleep',status:'incomplete'})
  assert.equal(updated.id,saved.id)
  assert.equal(updated.actual_minutes,450)
  await r.saveRecord('daily_activity','user-1',p.defaultActivity('2026-10-27','english','English','section'))
  await r.saveRecord('daily_activity','user-1',p.defaultActivity('2026-10-28','sleep','Sleep','time'))
  assert.equal((await r.listRecords('daily_activity','user-1')).length,3)
  assert.equal((await r.listRecords('daily_activity','user-2')).length,0)
  for(const route of ['/dashboard','/review?date=2026-10-27','/money','/plans?date=2026-10-27#timetable','/habits'])assert.equal(auth.safeReturnPath(route),route)
})


test('work progress separates open, incomplete, overdue and completed tasks', async () => {
  const { works: w } = await modules()
  const tasks = [
    { id: 'a', status: 'todo', due_date: '2026-10-27', priority: 'normal', created_at: '1' },
    { id: 'b', status: 'completed', due_date: '2026-10-26', priority: 'high', created_at: '2' },
    { id: 'c', status: 'incomplete', due_date: '2026-10-28', priority: 'high', created_at: '3' },
    { id: 'd', status: 'in_progress', due_date: null, priority: 'normal', created_at: '4' },
  ]
  const stats = w.workStats(tasks, '2026-10-28')
  assert.equal(stats.total, 4)
  assert.equal(stats.completed, 1)
  assert.equal(stats.open, 3)
  assert.equal(stats.percent, 25)
  assert.equal(stats.overdue, 1)
  assert.equal(stats.incomplete, 1)
  assert.equal(stats.inProgress, 1)
  assert.equal(w.workStats([], '2026-10-28').percent, 0)
  assert.equal(w.sortWorkTasks(tasks).map(t => t.id).join(','), 'a,c,d,b')
  assert.equal(tasks[1].id, 'b')
})

test('work completion dates survive edits and reset only when reopened', async () => {
  const { works: w } = await modules()
  const task = { title: 'Ship home page', notes: 'Keep this note', status: 'todo', completed_on: null }
  const done = w.workTaskOutcome(task, 'completed', '2026-10-28')
  assert.equal(done.completed_on, '2026-10-28')
  assert.equal(w.workTaskOutcome(done, 'completed', '2026-10-29').completed_on, '2026-10-28')
  const reopened = w.workTaskOutcome(done, 'incomplete', '2026-10-29')
  assert.equal(reopened.completed_on, null)
  assert.equal(reopened.notes, 'Keep this note')
  assert.equal(w.workTaskOutcome(reopened, 'completed', '2026-10-30').completed_on, '2026-10-30')
  assert.equal(task.status, 'todo')
})

test('work dates and links reject invalid deadlines and unsafe protocols', async () => {
  const { works: w } = await modules()
  assert.equal(w.workDate(''), null)
  assert.equal(w.workDate('2028-02-29'), '2028-02-29')
  assert.throws(() => w.workDate('2026-02-30'))
  assert.throws(() => w.workProjectDates('2026-10-28', '2026-10-27'))
  assert.equal(w.workProjectDates('', '2026-10-28').due_date, '2026-10-28')
  assert.equal(w.workLink(''), null)
  assert.equal(w.workLink('https://example.com/project?q=1'), 'https://example.com/project?q=1')
  assert.throws(() => w.workLink('javascript:alert(1)'))
})

test('local works preserve archived history and reject tasks for another account project', async () => {
  const { records: r, works: w, auth } = await modules()
  const project = await r.saveRecord('work_projects', 'user-1', { name: 'Website', status: 'active', description: 'My portfolio' })
  const task = await r.saveRecord('work_tasks', 'user-1', { project_id: project.id, title: 'Home page', status: 'todo', priority: 'high', notes: 'Draft first', due_date: '2026-10-28', completed_on: null })
  await r.saveRecord('work_tasks', 'user-1', w.workTaskOutcome(task, 'completed', '2026-10-28'))
  await r.saveRecord('work_projects', 'user-1', { ...project, status: 'archived' })
  const saved = (await r.listRecords('work_tasks', 'user-1'))[0]
  assert.equal(saved.completed_on, '2026-10-28')
  assert.equal(saved.notes, 'Draft first')
  assert.equal((await r.listRecords('work_tasks', 'user-2')).length, 0)
  await assert.rejects(r.saveRecord('work_tasks', 'user-2', { project_id: project.id, title: 'Wrong owner' }), /Choose a project/)
  await assert.rejects(r.saveRecord('work_tasks', 'user-1', { project_id: 'missing', title: 'No parent' }), /Choose a project/)
  assert.equal(auth.safeReturnPath('/works?project=example'), '/works?project=example')
})

test('missing Works schema identifies the additive migration', async () => {
  const { records: r } = await modules(true, {code: 'PGRST205', message: 'missing'})
  await assert.rejects(r.listRecords('work_projects', 'user-1'), /20261028_works.sql/)
  await assert.rejects(r.listRecords('work_tasks', 'user-1'), /20261028_works.sql/)
})

test('reusing completed and untimed plans preserves schedules and resets only the new day', async () => {
  const {progress:p,records:r}=await modules()
  const original=await r.saveRecord('daily_plans','user-1',{date:'2026-10-31',title:'Evening reading',category:'personal',start_time:'23:00',end_time:'00:30',ends_next_day:true,summary:'Read the next chapter',status:'completed',completed:true,actual_minutes:90})
  const draft=p.copyPlanToDate(original,'2026-11-01')
  assert.equal(draft.start_time,'23:00')
  assert.equal(draft.end_time,'00:30')
  assert.equal(draft.ends_next_day,true)
  assert.equal(draft.summary,original.summary)
  assert.equal(draft.completed,false)
  assert.equal(draft.status,'planned')
  assert.equal(draft.actual_minutes,null)
  const next=await r.saveRecord('daily_plans','user-1',draft)
  const following=await r.saveRecord('daily_plans','user-1',p.copyPlanToDate(next,'2026-11-02'))
  assert.equal(following.source_plan_id,next.id)
  const rows=await r.listRecords('daily_plans','user-1')
  assert.equal(rows.find(row=>row.id===original.id).status,'completed')
  assert.equal(rows.find(row=>row.id===original.id).actual_minutes,90)
  const untimed=p.copyPlanToDate({...original,start_time:'',end_time:'',ends_next_day:false},'2026-11-01')
  assert.equal(untimed.start_time,'')
  assert.equal(untimed.end_time,'')
})

test('project board filters combine text, priority and status without losing completed work', async () => {
  const { works: w } = await modules()
  const tasks = [
    { id: 'alpha', title: 'Design home page', notes: 'Mobile layout', status: 'todo', priority: 'high', due_date: '2026-10-29', created_at: '1' },
    { id: 'beta', title: 'Build API', notes: 'Mobile client', status: 'in_progress', priority: 'normal', due_date: '2026-10-30', created_at: '2' },
    { id: 'gamma', title: 'Release', notes: '', status: 'completed', priority: 'high', due_date: '2026-10-28', created_at: '3' },
    { id: 'delta', title: 'Review copy', notes: 'Follow up', status: 'incomplete', priority: 'low', due_date: null, created_at: '4' },
  ]
  const filter = (changes = {}) => w.filterWorkTasks(tasks, { search: '', status: 'all', priority: 'all', ...changes }, '2026-10-30').map(t => t.id).join(',')
  assert.equal(filter({ search: ' MOBILE ', priority: 'high' }), 'alpha')
  assert.equal(filter({ search: 'GAMMA' }), 'gamma')
  assert.equal(filter({ status: 'overdue' }), 'alpha')
  assert.equal(filter({ status: 'completed' }), 'gamma')
  assert.equal(filter({ status: 'incomplete' }), 'delta')
  assert.equal(filter({ status: 'open', priority: 'high' }), 'alpha')
  assert.equal(filter({ search: 'not found' }), '')
  assert.equal(filter().split(',').length, 4)
  assert.equal(tasks[0].id, 'alpha')
})

test('project monitor distinguishes an empty plan, overdue work, finished tasks and archived projects', async () => {
  const { works: w } = await modules()
  const project = { status: 'active', due_date: null }
  const task = { status: 'todo', due_date: '2026-10-31' }
  const health = (p, tasks) => w.projectHealth(p, tasks, '2026-10-30').label
  assert.equal(health(project, []), 'Ready to plan')
  assert.equal(health(project, [task]), 'On track')
  assert.equal(health(project, [{ ...task, due_date: '2026-10-29' }]), 'Needs attention')
  assert.equal(health(project, [{ ...task, status: 'incomplete' }]), 'Needs attention')
  assert.equal(health({ ...project, due_date: '2026-10-29' }, []), 'Past deadline')
  assert.equal(health({ ...project, due_date: '2026-10-29' }, [{ ...task, status: 'completed' }]), 'All tasks done')
  assert.equal(health({ ...project, status: 'paused' }, [task]), 'Paused')
  assert.equal(health({ ...project, status: 'archived' }, [{ ...task, status: 'completed' }]), 'Archived')
})

test('board status moves persist notes and dates and clear completion when reopened', async () => {
  const { records: r, works: w } = await modules()
  const project = await r.saveRecord('work_projects', 'user-1', { name: 'Board project', status: 'active', description: '' })
  let task = await r.saveRecord('work_tasks', 'user-1', { project_id: project.id, title: 'Deliver feature', notes: 'Keep these details', status: 'todo', priority: 'high', due_date: '2026-11-02', completed_on: null })
  for (const status of ['in_progress', 'incomplete', 'completed', 'todo']) {
    task = await r.saveRecord('work_tasks', 'user-1', w.workTaskOutcome(task, status, '2026-10-30'))
    const saved = (await r.listRecords('work_tasks', 'user-1'))[0]
    assert.equal(saved.status, status)
    assert.equal(saved.completed_on, status === 'completed' ? '2026-10-30' : null)
    assert.equal(saved.notes, 'Keep these details')
    assert.equal(saved.priority, 'high')
    assert.equal(saved.due_date, '2026-11-02')
    assert.equal(saved.project_id, project.id)
  }
  assert.equal((await r.listRecords('work_tasks', 'user-2')).length, 0)
})

test('planner counts occupied time once and finds usable gaps between overlapping blocks', async () => {
  const { planner: p } = await modules()
  const date = '2026-10-30'
  const base = {date,title:'Task',category:'personal',status:'planned',completed:false,actual_minutes:null}
  const rows = [
    {...base,id:'a',start_time:'09:00',end_time:'11:00'},
    {...base,id:'b',start_time:'10:00',end_time:'12:00',actual_minutes:45},
    {...base,id:'c',start_time:'12:00',end_time:'13:00',status:'completed',completed:true,actual_minutes:0},
    {...base,id:'d',start_time:'',end_time:''},
    {...base,id:'e',start_time:'14:00',end_time:''},
  ]
  assert.equal([...p.planConflicts(rows,date)].sort().join(','),'a,b')
  assert.equal(p.plannerSummary(rows,date).scheduled,240)
  assert.equal(p.plannerSummary(rows,date).actual,45)
  assert.equal(p.plannerSummary(rows,date).untimed,1)
  assert.equal(p.plannerSummary(rows,date).complete,1)
  assert.equal(p.plannerSummary(rows,date).open,4)
  assert.equal(p.availableGaps(rows,date).map(g => `${g.start}-${g.end}`).join(','),'480-540,780-1320')
  assert.equal(p.plannerSummary([],date).actual,null)
})

test('planner clips overnight tasks and detects conflicts with previous-day carryover', async () => {
  const { planner:p } = await modules()
  const rows = [
    {id:'night',date:'2026-10-29',start_time:'23:00',end_time:'02:00',ends_next_day:true},
    {id:'early',date:'2026-10-30',start_time:'01:00',end_time:'03:00'},
    {id:'late',date:'2026-10-30',start_time:'23:30',end_time:'00:30',ends_next_day:true},
  ]
  assert.equal(p.plannerSummary(rows,'2026-10-29').scheduled,60)
  assert.equal(p.plannerSummary(rows,'2026-10-30').scheduled,210)
  assert.equal(p.plannerSummary(rows,'2026-10-31').scheduled,30)
  assert.equal([...p.planConflicts(rows,'2026-10-30')].sort().join(','),'early,night')
  assert.equal(p.dayIntervals(rows,'2026-10-30').filter(i=>i.carryover).length,1)
  assert.equal(p.schedulePreset('23:30',60).end_time,'00:30')
  assert.equal(p.schedulePreset('23:30',60).ends_next_day,true)
  assert.equal(p.schedulePreset('23:00',60).ends_next_day,true)
  assert.equal(p.schedulePreset('09:00',30).ends_next_day,false)
  assert.throws(()=>p.schedulePreset('',30))
})

test('planner validates rescheduling while protecting past outcomes and actual time', async () => {
  const {planner:p} = await modules()
  const original = {id:'a',date:'2026-10-30',status:'planned',actual_minutes:null}
  const next = {date:'2026-10-31',start_time:'09:00',end_time:'10:00',ends_next_day:false,status:'planned',actual_minutes:null}
  assert.doesNotThrow(()=>p.validatePlanEdit(original,next,'2026-10-30'))
  assert.throws(()=>p.validatePlanEdit({...original,status:'completed'},next,'2026-10-30'),/history/)
  assert.throws(()=>p.validatePlanEdit({...original,actual_minutes:0},next,'2026-10-30'),/history/)
  assert.throws(()=>p.validatePlanEdit({}, {...next,status:'completed'},'2026-10-30'),/Future/)
  assert.throws(()=>p.validatePlanEdit({}, {...next,actual_minutes:0},'2026-10-30'),/Future/)
  assert.throws(()=>p.validatePlanEdit({}, {...next,date:'2026-02-30'},'2026-10-30'),/valid date/)
  assert.throws(()=>p.validatePlanEdit({}, {...next,start_time:'',end_time:'' ,ends_next_day:true},'2026-10-30'),/overnight/)
  assert.throws(()=>p.validatePlanEdit({}, {...next,start_time:'10:00',end_time:'09:00'},'2026-10-30'),/end must follow/)
  assert.doesNotThrow(()=>p.validatePlanEdit({...original,status:'completed'}, {...next,date:original.date,status:'completed',actual_minutes:60},'2026-10-30'))
})

test('planner prevents rescheduling copied tasks over existing attempts', async () => {
  const {planner:p} = await modules()
  const original = {id:'copy-a',source_plan_id:'source',date:'2026-10-30',status:'planned',actual_minutes:null}
  const next = {date:'2026-10-31',start_time:'09:00',end_time:'10:00',ends_next_day:false,status:'planned',actual_minutes:null}
  const existing = {...original,id:'copy-b',date:next.date,status:'completed',actual_minutes:60}
  assert.throws(()=>p.validatePlanEdit(original,next,'2026-10-30',[original,existing]),/already has an attempt/)
  assert.doesNotThrow(()=>p.validatePlanEdit(original,next,'2026-10-30',[original,{...existing,source_plan_id:'other'}]))
  assert.doesNotThrow(()=>p.validatePlanEdit(original,{...next,date:original.date},'2026-10-30',[original,existing]))
})

test('planner reschedules a pending task without duplicating it or changing other records', async () => {
  const {records:r,planner:p} = await modules()
  const original = await r.saveRecord('daily_plans','user-1',{date:'2026-10-30',title:'Prepare a talk',category:'work',start_time:'',end_time:'',ends_next_day:false,status:'planned',completed:false,actual_minutes:null,summary:'Keep notes'})
  const next = {...original,date:'2026-10-31',start_time:'11:00',end_time:'12:00'}
  p.validatePlanEdit(original,next,'2026-10-30')
  await r.saveRecord('daily_plans','user-1',next)
  const rows = await r.listRecords('daily_plans','user-1')
  assert.equal(rows.length,1)
  assert.equal(rows[0].id,original.id)
  assert.equal(rows[0].date,'2026-10-31')
  assert.equal(rows[0].summary,'Keep notes')
  assert.equal((await r.listRecords('daily_plans','user-2')).length,0)
})


test('money parses exact minor units and rejects fractional cents, invalid and unsafe amounts', async () => {
  const {money:m} = await modules()
  assert.equal(m.parseMoney('0.29'),29)
  assert.equal(m.parseMoney('100.01'),10001)
  assert.equal(m.parseMoney('-25.50',true),-2550)
  for(const value of ['','1.001','1e3','1,000','NaN','-1','10000000001']) assert.throws(()=>m.parseMoney(value))
  assert.equal(m.formatMoney(123456,'INR'),'₹1,234.56')
})

test('money transfers are atomic records, preserve total balances and never inflate cash flow', async () => {
  const {records:r,money:m} = await modules()
  const cash = await r.saveRecord('money_accounts','user-1',{name:'Cash',kind:'cash',currency:'INR',opening_minor:10000,opening_date:'2026-01-01',archived:false})
  const bank = await r.saveRecord('money_accounts','user-1',{name:'Bank',kind:'bank',currency:'INR',opening_minor:20000,opening_date:'2026-01-01',archived:false})
  const transfer = await r.saveRecord('money_transactions','user-1',{account_id:bank.id,to_account_id:cash.id,kind:'transfer',amount_minor:5000,date:'2026-01-02',category:'',description:'ATM'})
  let rows = await r.listRecords('money_transactions','user-1')
  assert.equal(rows.length,1)
  assert.equal(m.accountBalance(cash,rows,'2026-01-31'),15000)
  assert.equal(m.accountBalance(bank,rows,'2026-01-31'),15000)
  let report=m.moneyReport([cash,bank],rows,'INR','2026-01','2026-01-31')
  assert.equal(report.income,0);assert.equal(report.expense,0);assert.equal(report.balance,30000)
  await r.saveRecord('money_transactions','user-1',{...transfer,amount_minor:2000})
  rows=await r.listRecords('money_transactions','user-1')
  assert.equal(m.accountBalance(cash,rows,'2026-01-31'),12000)
  await r.removeRecord('money_transactions','user-1',transfer.id)
  rows=await r.listRecords('money_transactions','user-1')
  assert.equal(m.accountBalance(cash,rows,'2026-01-31'),10000)
})

test('money rejects cross-owner, cross-currency, same-account, future and pre-opening transactions', async () => {
  const {records:r,money:m} = await modules()
  const a=await r.saveRecord('money_accounts','user-1',{name:'INR',kind:'cash',currency:'INR',opening_minor:0,opening_date:'2026-01-02',archived:false})
  const b=await r.saveRecord('money_accounts','user-1',{name:'USD',kind:'bank',currency:'USD',opening_minor:0,opening_date:'2026-01-02',archived:false})
  const tx={account_id:a.id,to_account_id:null,kind:'expense',amount_minor:100,date:'2026-01-03',category:'Food & groceries',description:''}
  await assert.rejects(r.saveRecord('money_transactions','user-2',tx),/workspace/)
  await assert.rejects(r.saveRecord('money_transactions','user-1',{...tx,kind:'transfer',category:'',to_account_id:b.id}),/same currency/)
  await assert.rejects(r.saveRecord('money_transactions','user-1',{...tx,kind:'transfer',category:'',to_account_id:a.id}),/different/)
  assert.throws(()=>m.validateTransaction({...tx,date:'2026-01-01'},[a,b],undefined,'2026-01-04'),/opening/)
  assert.throws(()=>m.validateTransaction({...tx,date:'2026-01-05'},[a,b],undefined,'2026-01-04'),/before today/)
  assert.throws(()=>m.validateTransaction({...tx,amount_minor:0},[a,b],undefined,'2026-01-04'),/positive/)
  assert.throws(()=>m.validateTransaction({...tx,category:'Salary'},[a,b],undefined,'2026-01-04'),/category/)
  assert.equal((await r.listRecords('money_transactions','user-1')).length,0)
})

test('money history locks opening balances and archive preserves totals while stopping new entries', async () => {
  const {records:r,money:m} = await modules()
  const a=await r.saveRecord('money_accounts','user-1',{name:'Cash',kind:'cash',currency:'INR',opening_minor:10000,opening_date:'2026-01-01',archived:false})
  const tx=await r.saveRecord('money_transactions','user-1',{account_id:a.id,to_account_id:null,kind:'expense',amount_minor:1000,date:'2026-01-02',category:'Transport',description:''})
  await assert.rejects(r.saveRecord('money_accounts','user-1',{...a,opening_minor:0}),/locked/)
  await assert.rejects(r.saveRecord('money_accounts','user-1',{...a,currency:'USD'}),/locked/)
  const archived=await r.saveRecord('money_accounts','user-1',{...a,archived:true})
  await assert.rejects(r.saveRecord('money_transactions','user-1',{...tx,id:undefined}),/Restore/)
  await r.saveRecord('money_transactions','user-1',{...tx,amount_minor:2000})
  assert.equal(m.moneyReport([archived],await r.listRecords('money_transactions','user-1'),'INR','2026-01','2026-01-31').balance,8000)
  await assert.rejects(r.removeRecord('money_accounts','user-1',a.id),/Archive/)
})

test('money month reports separate currencies, preserve cents and distinguish future days', async () => {
  const {money:m} = await modules()
  const accounts=[{id:'a',currency:'INR',opening_minor:100,opening_date:'2026-01-01'},{id:'b',currency:'USD',opening_minor:10000,opening_date:'2026-01-01'}]
  const rows=[{id:'1',account_id:'a',kind:'income',amount_minor:1000,date:'2026-01-02',category:'Salary'},{id:'2',account_id:'a',kind:'expense',amount_minor:29,date:'2026-01-02',category:'Transport'},{id:'3',account_id:'b',kind:'expense',amount_minor:5000,date:'2026-01-02',category:'Transport'},{id:'4',account_id:'a',kind:'expense',amount_minor:50,date:'2025-12-31',category:'Transport'}]
  const report=m.moneyReport(accounts,rows,'INR','2026-01','2026-01-03')
  assert.equal(report.income,1000);assert.equal(report.expense,29);assert.equal(report.net,971)
  assert.equal(report.categories.length,1);assert.equal(report.categories[0].amount,29)
  assert.equal(report.daily[1].expense,0.29);assert.equal(report.daily[2].expense,0);assert.equal(report.daily[3].expense,null)
  assert.equal(m.moneyReport(accounts,[], 'INR','2024-02','2024-02-29').daily.length,29)
})

test('money budget upserts are month, currency and category scoped and account isolated', async () => {
  const {records:r} = await modules()
  const budget={month:'2026-01-01',currency:'INR',category:'Transport',limit_minor:10000}
  const first=await r.saveRecord('money_budgets','user-1',budget)
  const updated=await r.saveRecord('money_budgets','user-1',{...budget,limit_minor:20000})
  assert.equal(first.id,updated.id)
  await r.saveRecord('money_budgets','user-1',{...budget,month:'2026-02-01'})
  await r.saveRecord('money_budgets','user-1',{...budget,currency:'USD'})
  assert.equal((await r.listRecords('money_budgets','user-1')).length,3)
  assert.equal((await r.listRecords('money_budgets','user-2')).length,0)
  await assert.rejects(r.saveRecord('money_budgets','user-1',{...budget,limit_minor:-1}),/positive/)
  await assert.rejects(r.saveRecord('money_budgets','user-1',{...budget,month:'2026-02-30'}),/valid month/)
})

test('money CSV quotes descriptions and neutralises spreadsheet formulas', async () => {
  const {money:m} = await modules()
  const csv=m.moneyCsv([{date:'2026-01-02',kind:'expense',account_id:'a',amount_minor:29,category:'Transport',description:'=SUM(1,2) "x"'}],[{id:'a',name:'Cash',currency:'INR'}])
  assert.ok(csv.includes('"0.29"'))
  assert.ok(csv.includes(`"'=SUM(1,2) ""x"""`))
})

test('missing money schema explains the additive migration without falling back to local data', async () => {
  const {records:r} = await modules(true,{code:'PGRST205',message:'missing'})
  await assert.rejects(r.listRecords('money_accounts','user-1'),/20261030_money.sql/)
})


test('failed cloud money saves do not create local entries or partial transfers', async () => {
  const {records:r,client,items} = await modules(true)
  const accounts=[{id:'a',user_id:'user-1',name:'Cash',currency:'INR',opening_date:'2026-01-01',opening_minor:0,archived:false},{id:'b',user_id:'user-1',name:'Bank',currency:'INR',opening_date:'2026-01-01',opening_minor:0,archived:false}]
  let writes=0
  client.from=(table)=>{
    let writing=false
    const builder={then:resolve=>resolve(writing ? {data:null,error:{code:'XX000',message:'Save unavailable'}} : {data:table==='money_accounts'?accounts:[],error:null})}
    for(const method of ['select','eq','single']) builder[method]=()=>builder
    builder.upsert=()=>{writing=true;writes++;return builder}
    return builder
  }
  await assert.rejects(r.saveRecord('money_transactions','user-1',{account_id:'a',to_account_id:'b',kind:'transfer',amount_minor:500,date:'2026-01-02',category:'',description:''}),/Save unavailable/)
  assert.equal(writes,1)
  assert.equal(items.size,0)
})


test('task library validates reusable definitions and preserves planned snapshots on edit or deletion', async () => {
  const {records:r,library:l} = await modules()
  const template=await r.saveRecord('plan_templates','user-1',{title:'Deep work',category:'work',duration_minutes:90,default_start:'23:30',notes:'No distractions'})
  const plan=l.planFromTemplate(template,'2026-11-01')
  assert.equal(plan.start_time,'');assert.equal(plan.end_time,'');assert.equal(plan.ends_next_day,false)
  const scheduled={...plan,start_time:'23:30',end_time:'01:00',ends_next_day:true}
  assert.equal(plan.actual_minutes,null);assert.equal(plan.status,'planned');assert.equal(plan.id,undefined)
  const saved=await r.saveRecord('daily_plans','user-1',scheduled)
  await r.saveRecord('plan_templates','user-1',{...template,title:'Focus',duration_minutes:45,notes:'New instructions'})
  await r.removeRecord('plan_templates','user-1',template.id)
  const rows=await r.listRecords('daily_plans','user-1')
  assert.equal(rows[0].id,saved.id);assert.equal(rows[0].title,'Deep work');assert.equal(rows[0].end_time,'01:00');assert.equal(rows[0].summary,'No distractions')
  assert.equal((await r.listRecords('plan_templates','user-2')).length,0)
  for(const patch of [{title:' '},{duration_minutes:0},{duration_minutes:1.5},{duration_minutes:1441},{default_start:'24:00'},{category:'bad'}]) assert.throws(()=>l.validateTemplate({...template,...patch}))
})

test('day builder sequences tasks, allows repeated breaks, and handles midnight explicitly', async () => {
  const {library:l} = await modules()
  const template={title:'Break',category:'personal',duration_minutes:15,default_start:'',notes:''}
  const drafts=[l.draftFromTemplate(template,crypto.randomUUID()),l.draftFromTemplate(template,crypto.randomUUID())]
  drafts.forEach(draft=>{draft.duration=15})
  const arranged=l.sequenceDrafts(drafts,'23:30')
  assert.equal(arranged[0].start,'23:30');assert.equal(arranged[1].start,'23:45')
  const plans=l.draftsToPlans(arranged,'2026-11-01')
  assert.equal(plans[1].end_time,'00:00');assert.equal(plans[1].ends_next_day,true)
  assert.notEqual(plans[0].id,plans[1].id)
  assert.equal(drafts[0].start,'')
  assert.throws(()=>l.sequenceDrafts(drafts,'23:50'),/after midnight/)
  assert.throws(()=>l.draftsToPlans(drafts,'2026-02-30'),/valid date/)
  assert.throws(()=>l.draftsToPlans([{...drafts[0],start:'08:00',duration:0}],'2026-11-01'),/Duration/)
  assert.equal(l.draftsToPlans(drafts.map(d=>({...d,duration:0})),'2026-11-01')[0].start_time,'')
})

test('day batch saves all plans once, preserves reviewed entries on retry, and remains account scoped', async () => {
  const {records:r,library:l} = await modules()
  const template={title:'Read',category:'learning',duration_minutes:30,default_start:'08:00',notes:'Book'}
  const drafts=[l.draftFromTemplate(template,crypto.randomUUID()),l.draftFromTemplate(template,crypto.randomUUID())]
  drafts[0].summary='Read chapter 2.\nWrite three key ideas.'
  const rows=l.draftsToPlans(drafts,'2026-11-01')
  assert.equal(template.notes,'Book');assert.equal(drafts[1].summary,'Book')
  await r.addPlanBatch('user-1',rows)
  const saved=await r.listRecords('daily_plans','user-1')
  assert.equal(saved[0].summary,'Read chapter 2.\nWrite three key ideas.');assert.equal(saved[1].summary,'Book')
  await r.saveRecord('daily_plans','user-1',{...saved[0],status:'completed',completed:true,actual_minutes:25})
  await r.addPlanBatch('user-1',rows)
  const repeated=await r.listRecords('daily_plans','user-1')
  assert.equal(repeated.length,2);assert.equal(repeated[0].status,'completed');assert.equal(repeated[0].actual_minutes,25)
  assert.equal((await r.listRecords('daily_plans','user-2')).length,0)
  await assert.rejects(r.addPlanBatch('user-1',[...rows,{...rows[0],id:crypto.randomUUID(),title:''}]),/task name/)
  assert.equal((await r.listRecords('daily_plans','user-1')).length,2)
  await assert.rejects(r.addPlanBatch('user-1',[rows[0],rows[0]]),/distinct/)
})

test('day batch uses one cloud request with conflict-safe retry and never falls back after failure', async () => {
  const {records:r,library:l,client,items} = await modules(true)
  const rows=l.draftsToPlans([l.draftFromTemplate({title:'Wake up',category:'personal',duration_minutes:15,default_start:'06:00',notes:''},crypto.randomUUID())],'2026-11-01')
  let writes=0
  client.from=(table)=>({upsert:(data,options)=>{writes++;assert.equal(table,'daily_plans');assert.equal(data.length,1);assert.equal(data[0].user_id,'user-1');assert.equal(options.ignoreDuplicates,true);assert.equal(options.onConflict,'id');return Promise.resolve({error:{message:'Network unavailable'}})}})
  await assert.rejects(r.addPlanBatch('user-1',rows),/Network unavailable/)
  assert.equal(writes,1);assert.equal(items.size,0)
})

test('task library missing schema points to its migration without blocking daily plans', async () => {
  const {records:r}=await modules(true,{code:'PGRST205',message:'missing'})
  await assert.rejects(r.listRecords('plan_templates','user-1'),/20261031_plan_templates.sql/)
})


test('saved tasks need no schedule and can be reused across days with independent times', async () => {
  const {records:r,library:l} = await modules()
  const task=await r.saveRecord('plan_templates','user-1',{title:'English practice',category:'english',notes:'Read aloud and review vocabulary.'})
  const first=l.draftFromTemplate(task,crypto.randomUUID())
  const second=l.draftFromTemplate({...task,default_start:'06:00',duration_minutes:90},crypto.randomUUID())
  assert.equal(first.start,'');assert.equal(first.duration,0)
  assert.equal(second.start,'');assert.equal(second.duration,0)
  first.start='08:00';first.duration=30
  second.start='18:00';second.duration=45
  await r.addPlanBatch('user-1',l.draftsToPlans([first],'2026-11-01'))
  await r.addPlanBatch('user-1',l.draftsToPlans([second],'2026-11-02'))
  const plans=await r.listRecords('daily_plans','user-1')
  assert.equal(plans[0].start_time,'08:00');assert.equal(plans[0].end_time,'08:30')
  assert.equal(plans[1].date,'2026-11-02');assert.equal(plans[1].start_time,'18:00');assert.equal(plans[1].end_time,'18:45')
  assert.equal(plans[1].summary,task.notes)
  assert.equal(JSON.stringify(await r.listRecords('plan_templates','user-1')),JSON.stringify([task]))
  assert.throws(()=>l.draftsToPlans([{...first,start:''}],'2026-11-01'),/Choose a start time/)
})

test('habit daily entries save counts and reviews together while preserving zero and reset rules', async () => {
  const { habits:h, records:r } = await modules()
  const zero=h.prepareHabitEntry('habit-1','2026-11-02',undefined,0,'No occurrences','completed')
  const saved=await r.saveRecord('habit_logs','user-1',zero)
  assert.equal(h.habitCount(saved),0)
  assert.equal(saved.completed,false)
  assert.equal(saved.outcome,'completed')
  const same=h.prepareHabitEntry('habit-1','2026-11-02',saved,0)
  assert.equal(same.outcome,'completed')
  assert.equal(same.note,'No occurrences')
  const changed=h.prepareHabitEntry('habit-1','2026-11-02',saved,1)
  assert.equal(changed.outcome,'planned')
  assert.equal(changed.id,saved.id)
  const reviewed=h.prepareHabitEntry('habit-1','2026-11-02',saved,2,'Updated count','incomplete')
  await r.saveRecord('habit_logs','user-1',reviewed)
  const rows=await r.listRecords('habit_logs','user-1')
  assert.equal(rows.length,1)
  assert.equal(rows[0].value,2)
  assert.equal(rows[0].outcome,'incomplete')
  assert.equal(rows[0].note,'Updated count')
  assert.equal((await r.listRecords('habit_logs','user-2')).length,0)
  assert.throws(()=>h.prepareHabitEntry('habit-1','2026-11-02',saved,-1),/whole count/)
  assert.throws(()=>h.prepareHabitEntry('habit-1','2026-11-02',saved,1,'','invalid'),/valid day review/)
})

test('habit graph ranges handle calendar boundaries, leap days and custom validation', async () => {
  const { habits:h }=await modules()
  assert.equal(h.habitGraphRange('week','2026-01-02').start,'2025-12-27')
  assert.equal(h.habitGraphRange('month','2024-02-29').start,'2024-02-01')
  assert.equal(h.habitGraphRange('year','2026-11-02').start,'2026-01-01')
  assert.equal(h.habitGraphData('h',[],'2024-02-01','2024-02-29','2026-11-02').days,29)
  for (const [start,end] of [['2026-02-30','2026-03-02'],['','2026-11-02'],['2026-11-02','2026-11-01'],['2026-11-01','2026-11-03'],['2000-01-01','2026-11-02']]) {
    assert.throws(()=>h.habitGraphData('h',[],start,end,'2026-11-02'))
  }
})

test('habit graphs preserve missing versus zero, isolate habits, and count only explicit completed reviews', async () => {
  const { habits:h }=await modules()
  const logs=[
    {habit_id:'h',date:'2026-10-30',completed:true,value:3,outcome:'planned'},
    {habit_id:'h',date:'2026-10-31',completed:false,value:1,outcome:'completed'},
    {habit_id:'h',date:'2026-11-02',completed:true,value:2,outcome:'incomplete'},
    {habit_id:'other',date:'2026-11-01',completed:true,value:999,outcome:'completed'},
    {habit_id:'h',date:'2026-11-03',completed:true,value:999,outcome:'completed'},
  ]
  const graph=h.habitGraphData('h',logs,'2026-10-30','2026-11-02','2026-11-02')
  assert.equal(graph.total,5);assert.equal(graph.recorded,3);assert.equal(graph.completed,1);assert.equal(graph.zeroDays,1)
  assert.equal(graph.points[1].value,0);assert.equal(graph.points[2].value,null)
  assert.equal(graph.points.length,4);assert.equal(graph.grouped,false)
  const single=h.habitGraphData('h',logs,'2026-10-31','2026-10-31','2026-11-02')
  assert.equal(single.days,1);assert.equal(single.recorded,1);assert.equal(single.total,0)
})

test('year and long custom habit graphs aggregate monthly with exact logging coverage and empty months', async () => {
  const { habits:h }=await modules()
  const logs=[
    {habit_id:'h',date:'2026-01-10',completed:true,value:4,outcome:'completed'},
    {habit_id:'h',date:'2026-01-11',completed:true,value:3,outcome:'completed'},
    {habit_id:'h',date:'2026-03-01',completed:false,value:0,outcome:'completed'},
  ]
  const graph=h.habitGraphData('h',logs,'2026-01-01','2026-03-02','2026-11-02',true)
  assert.equal(graph.points.length,3)
  assert.equal(graph.points[0].value,7);assert.equal(graph.points[0].days,31);assert.equal(graph.points[0].recorded,2)
  assert.equal(graph.points[1].value,null);assert.equal(graph.points[1].days,28)
  assert.equal(graph.points[2].value,0);assert.equal(graph.points[2].days,2);assert.equal(graph.points[2].recorded,1)
  assert.equal(graph.completed,3)
  assert.equal(h.habitGraphData('h',logs,'2025-12-31','2026-03-04','2026-11-02').grouped,true)
})
