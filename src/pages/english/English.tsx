import { useEffect, useRef, useState } from 'react'
import {
  BookOpen,
  Headphones,
  Mic,
  PenLine,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Square,
  Pencil,
  Trash2,
} from 'lucide-react'
import { useRecords } from '../../features/life/data'
import { recommendedSkill, shiftDay, skills } from '../../features/life/helpers'
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
  numberValue,
  textValue,
  useDay,
} from '../../features/life/ui'
import type { EnglishSession, EnglishSkill } from '../../types'
const icons = {
  speaking: Mic,
  listening: Headphones,
  reading: BookOpen,
  writing: PenLine,
}
const lessons = [
  {
    title: 'A small change',
    passage:
      'Last month, Maya decided to walk to work twice a week. At first, she worried about arriving late, so she left home fifteen minutes earlier. She soon noticed a small café on her route and began greeting the owner each morning. Walking did not change her whole life, but it gave her a quieter start to the day. Now she keeps comfortable shoes near the door, ready for her next walk.',
    questions: [
      'Why did Maya leave home earlier?',
      'What made her mornings more enjoyable?',
      'Describe one small change you would like to make.',
    ],
    answers:
      'She wanted to avoid arriving late. A quieter start and greeting the café owner helped make the walk enjoyable.',
    speaking:
      'Describe a small change you have made. What was difficult at first? How did it feel later?',
    writing:
      'Write a short message to a friend about one habit you are trying to build. Explain why it matters to you.',
  },
  {
    title: 'Explaining your work',
    passage:
      'Arun built a simple tool to keep track of his job applications. Before using it, he saved links in different places and sometimes forgot to follow up. His new tool shows the company, the role, and the next action for each application. He asked a friend to try it and discovered that the buttons were difficult to use on a phone. After making them larger, he tested the tool again. The second version was easier to use.',
    questions: [
      'What problem did Arun want to solve?',
      'What did his friend help him discover?',
      'How would you explain your latest project to a friend?',
    ],
    answers:
      'He wanted to organise applications and remember follow-ups. His friend found that the buttons were difficult to use on a phone.',
    speaking:
      'Explain a project you built as if you were talking to someone outside your field. Describe the problem, your solution, and your next step.',
    writing:
      'Write a short introduction to yourself for a potential colleague. Include what you do, what you are learning, and one project you enjoyed.',
  },
  {
    title: 'Making plans together',
    passage:
      'Leena and Sam wanted to cook dinner together on Saturday. Sam suggested a complicated recipe, but Leena only had an hour before her evening class. They chose a simpler meal and divided the work. Sam bought the vegetables while Leena prepared the kitchen. They finished on time and saved enough food for lunch the next day. They agreed that planning a little earlier would make their next dinner even easier.',
    questions: [
      'Why did they choose a simpler recipe?',
      'How did they divide the work?',
      'What would you do differently next time?',
    ],
    answers:
      'Leena had only an hour before class. Sam bought vegetables while Leena prepared the kitchen.',
    speaking:
      'Imagine inviting a friend to dinner. Explain the time, the food, and what you need them to bring.',
    writing:
      'Write a polite message changing a plan. Explain the reason and suggest a new time.',
  },
  {
    title: 'Asking for help',
    passage:
      'During her first week in a new team, Noor did not understand an instruction in a meeting. She was worried about interrupting, but she decided to ask for an example. Her colleague explained the task using a recent project. Noor repeated the main points in her own words to check her understanding. Later, another new colleague thanked her because they had been confused too. Asking one clear question helped both of them move forward.',
    questions: [
      'What did Noor ask for?',
      'How did she check her understanding?',
      'What could you say when you do not understand something?',
    ],
    answers:
      'She asked for an example. She repeated the main points in her own words.',
    speaking:
      'Practice asking a colleague to explain something again. Then summarise what you understood.',
    writing:
      'Write a message asking for help with a task. Say what you have tried and what you need to understand.',
  },
]
function PracticeTimer() {
  const [seconds, setSeconds] = useState(0),
    [running, setRunning] = useState(false)
  const started = useRef(0),
    elapsed = useRef(0)
  useEffect(() => {
    if (!running) return
    started.current = Date.now()
    const timer = setInterval(
      () =>
        setSeconds(
          elapsed.current + Math.floor((Date.now() - started.current) / 1000),
        ),
      500,
    )
    return () => clearInterval(timer)
  }, [running])
  return (
    <div className="day-picker">
      <span className="pill">
        {String(Math.floor(seconds / 60)).padStart(2, '0')}:
        {String(seconds % 60).padStart(2, '0')}
      </span>
      <button
        className="icon-btn"
        aria-label={running ? 'Pause practice timer' : 'Start practice timer'}
        onClick={() => {
          if (running) elapsed.current = seconds
          setRunning(!running)
        }}
      >
        {running ? <Pause size={15} /> : <Play size={15} />}
      </button>
      <button
        className="icon-btn"
        aria-label="Reset practice timer"
        onClick={() => {
          setRunning(false)
          elapsed.current = 0
          setSeconds(0)
        }}
      >
        <RotateCcw size={14} />
      </button>
    </div>
  )
}
function Listen({ passage }: { passage: string }) {
  const [speaking, setSpeaking] = useState(false)
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
  useEffect(
    () => () => {
      if (supported) window.speechSynthesis.cancel()
    },
    [passage, supported],
  )
  return (
    <div className="stack">
      {supported ? (
        <button
          type="button"
          className="btn secondary"
          onClick={() => {
            window.speechSynthesis.cancel()
            if (speaking) {
              setSpeaking(false)
              return
            }
            const utterance = new SpeechSynthesisUtterance(passage)
            utterance.lang = 'en-GB'
            utterance.rate = 0.85
            utterance.onend = () => setSpeaking(false)
            utterance.onerror = () => setSpeaking(false)
            setSpeaking(true)
            window.speechSynthesis.speak(utterance)
          }}
        >
          {speaking ? <Square size={15} /> : <Volume2 size={15} />}{' '}
          {speaking ? 'Stop listening' : 'Listen to the passage'}
        </button>
      ) : (
        <p className="muted">
          Audio isn’t supported in this browser. Read the transcript aloud or
          use another browser.
        </p>
      )}
      <details>
        <summary>Show transcript</summary>
        <p style={{ fontSize: 14, lineHeight: 1.9 }}>{passage}</p>
      </details>
      <small className="muted">Audio uses your browser’s English voice.</small>
    </div>
  )
}
function SessionFields({
  row,
  skill,
  topic,
}: {
  row?: EnglishSession
  skill: EnglishSkill
  topic: string
}) {
  return (
    <>
      <div className="form-grid">
        <Field label="Skill">
          <select name="skill" defaultValue={row?.skill || skill}>
            {skills.map((s) => (
              <option key={s} value={s}>
                {s[0].toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Minutes practiced">
          <input
            name="minutes"
            type="number"
            required
            min={1}
            max={1440}
            defaultValue={row?.minutes || 10}
          />
        </Field>
      </div>
      <Field label="What did you practice?">
        <input
          required
          maxLength={200}
          name="topic"
          defaultValue={row?.topic || topic}
        />
      </Field>
      <Field label="My writing or practice notes">
        <textarea
          name="writing"
          rows={4}
          placeholder="Write in your own words. Mistakes are part of learning."
          defaultValue={row?.writing}
        />
      </Field>
      <details open={!!(row?.correction || row?.vocabulary)}>
        <summary>Corrections & words to remember</summary>
        <div className="stack">
          <Field
            label="Corrected version"
            hint="Paste feedback from a teacher or language tool, or add your own revision."
          >
            <textarea
              name="correction"
              rows={3}
              defaultValue={row?.correction}
            />
          </Field>
          <Field label="Useful words, phrases, or mistakes to revisit">
            <textarea
              name="vocabulary"
              rows={2}
              defaultValue={row?.vocabulary}
              placeholder="Could you give me an example?"
            />
          </Field>
        </div>
      </details>
    </>
  )
}

export function English() {
  const day = useDay()
  return <EnglishContent key={day.date} {...day} />
}
function EnglishContent({
  date,
  today,
  setDate,
}: {
  date: string
  today: string
  setDate: (d: string) => void
}) {
  const english = useRecords('english_sessions'),
    daily = useRecords('daily_logs')
  const [skill, setSkill] = useState<EnglishSkill>(recommendedSkill(date))
  const [editing, setEditing] = useState<EnglishSession | null>(null),
    [deleting, setDeleting] = useState<string | null>(null)
  const [formVersion, setFormVersion] = useState(0)
  const lesson =
    lessons[
      ((Math.floor(new Date(date + 'T12:00:00Z').getTime() / 86400000 / 4) %
        lessons.length) +
        lessons.length) %
        lessons.length
    ]
  const Icon = icons[skill]
  const week = english.rows.filter(
    (s) => s.date >= shiftDay(today, -6) && s.date <= today,
  )
  const days = new Set([
    ...week.map((s) => s.date),
    ...daily.rows
      .filter(
        (d) =>
          d.date >= shiftDay(today, -6) && d.date <= today && d.journal?.trim(),
      )
      .map((d) => d.date),
  ])
  const selected = english.rows
    .filter((s) => s.date === date)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
  const journal = daily.rows.find((d) => d.date === date && d.journal?.trim())
  const future = date > today
  const save = async (data: FormData, row?: EnglishSession) => {
    const topic = textValue(data, 'topic')
    if (!topic) throw new Error('Describe your practice.')
    await english.save({
      ...row,
      date,
      skill: textValue(data, 'skill') as EnglishSkill,
      minutes: numberValue(data, 'minutes'),
      topic,
      writing: textValue(data, 'writing'),
      correction: textValue(data, 'correction'),
      vocabulary: textValue(data, 'vocabulary'),
    })
  }
  return (
    <>
      <PageIntro
        eyebrow="YOUR FIRST PRIORITY"
        title="Find your voice."
        description="Real conversations. Clearer writing. A little practice every day."
      >
        <DayPicker date={date} today={today} onChange={setDate} />
      </PageIntro>
      <DataNotice queries={[english, daily]} />
      <div className="summary-strip">
        <div className="summary-item">
          <span className="eyebrow">PRACTICE DAYS</span>
          <strong>
            {days.size}
            <span className="muted"> / 7</span>
          </strong>
          <p>In the last seven days</p>
        </div>
        <div className="summary-item">
          <span className="eyebrow">TIME INVESTED</span>
          <strong>
            {week.reduce((n, s) => n + s.minutes, 0)}
            <span className="muted"> min</span>
          </strong>
          <p>Recorded practice this week</p>
        </div>
        <div className="summary-item">
          <span className="eyebrow">SKILLS EXPLORED</span>
          <strong>
            {
              new Set([
                ...week.map((s) => s.skill),
                ...(daily.rows.some(
                  (d) =>
                    d.date >= shiftDay(today, -6) &&
                    d.date <= today &&
                    d.journal?.trim(),
                )
                  ? ['writing']
                  : []),
              ]).size
            }
            <span className="muted"> / 4</span>
          </strong>
          <p>Speaking, listening, reading, writing</p>
        </div>
      </div>
      <div className="two-col">
        <div className="stack">
          <Panel
            title={future ? 'Your next practice' : 'A small session for today'}
            subtitle="Try ten minutes. Even five is a useful start."
            action={<PracticeTimer />}
          >
            <div className="skill-tabs">
              {skills.map((s) => {
                const SkillIcon = icons[s]
                return (
                  <button
                    key={s}
                    className={'chip ' + (skill === s ? 'active' : '')}
                    onClick={() => setSkill(s)}
                  >
                    <SkillIcon size={14} />
                    {s}
                  </button>
                )
              })}
            </div>
            <div className="eyebrow" style={{ marginBottom: 9 }}>
              {lesson.title}
            </div>
            <h3
              style={{
                fontSize: 19,
                fontFamily: 'Georgia',
                marginBottom: 18,
                display: 'flex',
                gap: 10,
                alignItems: 'center',
              }}
            >
              <Icon size={20} />
              {skill === 'speaking'
                ? 'Say it in your own words'
                : skill === 'listening'
                  ? 'Listen, then tell the story'
                  : skill === 'reading'
                    ? 'Read for meaning'
                    : 'Make yourself understood'}
            </h3>
            {skill === 'listening' ? (
              <Listen passage={lesson.passage} />
            ) : (
              <p style={{ lineHeight: 1.9, fontSize: 14 }}>
                {skill === 'reading'
                  ? lesson.passage
                  : skill === 'writing'
                    ? lesson.writing
                    : lesson.speaking}
              </p>
            )}
            {['reading', 'listening'].includes(skill) ? (
              <>
                <ol
                  style={{
                    paddingLeft: 20,
                    marginTop: 20,
                    fontSize: 12,
                    lineHeight: 2,
                  }}
                >
                  {lesson.questions.map((q) => (
                    <li key={q}>{q}</li>
                  ))}
                </ol>
                <details>
                  <summary>Check your understanding</summary>
                  <p className="muted">{lesson.answers}</p>
                </details>
              </>
            ) : (
              <p className="muted" style={{ marginTop: 20 }}>
                {skill === 'speaking'
                  ? 'Speak for one minute. Repeat once, using simpler and clearer sentences.'
                  : 'Aim for a short paragraph. Read it aloud, then revise one sentence.'}
              </p>
            )}
          </Panel>
          <Panel title="Save your practice" subtitle={dayLabel(date)}>
            {future ? (
              <Empty>
                This is your practice plan. Log the session after you’ve done
                it.
              </Empty>
            ) : (
              <Form
                key={skill + formVersion}
                busy={english.busy || english.isLoading || !!english.error}
                submit="Save practice"
                onSubmit={async (data) => {
                  await save(data)
                  setFormVersion((v) => v + 1)
                }}
              >
                <SessionFields skill={skill} topic={lesson.title} />
              </Form>
            )}
          </Panel>
        </div>
        <div className="stack">
          <Panel
            title="Your practice on this day"
            subtitle="Everything here also updates Today."
          >
            {!selected.length && !journal && (
              <Empty>Your first session will appear here.</Empty>
            )}
            {selected.map((s) => (
              <article className="session-row" key={s.id}>
                <div className="session-heading">
                  <span className="pill">
                    {s.skill} · {s.minutes} min
                  </span>
                  <div>
                    <button
                      className="icon-btn"
                      aria-label={'Edit ' + s.topic}
                      onClick={() => setEditing(s)}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      className="icon-btn"
                      aria-label={'Delete ' + s.topic}
                      onClick={() => setDeleting(s.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <strong>{s.topic}</strong>
                {s.writing && <p>{s.writing}</p>}
                {s.correction && (
                  <div className="record-note">
                    <small>My revision / saved feedback</small>
                    <p>{s.correction}</p>
                  </div>
                )}
                {s.vocabulary && (
                  <div className="record-note">
                    <small>Remember this</small>
                    <p>{s.vocabulary}</p>
                  </div>
                )}
              </article>
            ))}
            {journal && (
              <article className="session-row">
                <span className="pill">Writing · daily journal</span>
                <p style={{ marginTop: 10 }}>{journal.journal}</p>
                {journal.journal_corrected && (
                  <div className="record-note">
                    <small>Saved correction</small>
                    <p>{journal.journal_corrected}</p>
                  </div>
                )}
                <details>
                  <summary>Add or edit a correction</summary>
                  <Form
                    onSubmit={async (data) => {
                      await daily.save({
                        ...journal,
                        journal_corrected: textValue(data, 'correction'),
                      })
                    }}
                  >
                    <Field label="Corrected writing">
                      <textarea
                        rows={3}
                        name="correction"
                        defaultValue={journal.journal_corrected || ''}
                      />
                    </Field>
                  </Form>
                </details>
              </article>
            )}
          </Panel>
          <Panel
            title="Words worth keeping"
            subtitle="Recent phrases and corrections to revisit"
          >
            {english.rows
              .filter((s) => s.vocabulary && s.date <= today)
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 5)
              .map((s) => (
                <div className="session-row" key={s.id}>
                  <span className="eyebrow">{s.date}</span>
                  <p>{s.vocabulary}</p>
                </div>
              ))}
            {!english.rows.some((s) => s.vocabulary) && (
              <Empty>
                Save useful phrases after a session.
                <br />
                Use one in your next conversation.
              </Empty>
            )}
          </Panel>
          <Panel title="Your practice history">
            <div className="stack">
              {[
                ...new Set([
                  ...english.rows.map((s) => s.date),
                  ...daily.rows
                    .filter((d) => d.journal?.trim())
                    .map((d) => d.date),
                ]),
              ]
                .sort()
                .reverse()
                .slice(0, 14)
                .map((d) => (
                  <button
                    key={d}
                    className="text-link"
                    onClick={() => setDate(d)}
                  >
                    {dayLabel(d)}
                  </button>
                ))}
              {!english.rows.length &&
                !daily.rows.some((d) => d.journal?.trim()) && (
                  <p className="muted">
                    Choose any date above to revisit your progress.
                  </p>
                )}
            </div>
          </Panel>
        </div>
      </div>
      {editing && (
        <Dialog title="Edit practice" onClose={() => setEditing(null)}>
          <Form
            onSubmit={async (data) => {
              await save(data, editing)
              setEditing(null)
            }}
          >
            <SessionFields row={editing} skill={skill} topic={lesson.title} />
          </Form>
        </Dialog>
      )}
      {deleting && (
        <Dialog
          title="Delete this practice entry?"
          onClose={() => setDeleting(null)}
        >
          <Form
            submit="Delete entry"
            onCancel={() => setDeleting(null)}
            onSubmit={async () => {
              await english.remove(deleting)
              setDeleting(null)
            }}
          >
            <p className="muted">This removes only the selected session.</p>
          </Form>
        </Dialog>
      )}
    </>
  )
}
