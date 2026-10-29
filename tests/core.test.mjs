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
  for(const route of ['/dashboard','/plans?date=2026-10-27#timetable','/habits'])assert.equal(auth.safeReturnPath(route),route)
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
