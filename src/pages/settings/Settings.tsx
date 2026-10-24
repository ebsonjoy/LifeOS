import { useState } from 'react'
import { Download, Cloud, HardDrive, LogOut } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useToast } from '../../context/ToastContext'
import { listRecords } from '../../features/life/data'
import type { Table } from '../../features/life/data'
import {
  Field,
  Form,
  Panel,
  PageIntro,
  Dialog,
  textValue,
} from '../../features/life/ui'
const tables: Table[] = [
  'daily_logs',
  'daily_plans',
  'habits',
  'habit_logs',
  'fitness_logs',
  'job_applications',
  'job_search_resources',
  'english_sessions',
  'meal_plans',
  'workout_routines',
]
export function Settings() {
  const { profile, user, updateProfile, isConfigured, logout, refreshProfile } =
      useAuth(),
    { theme, setTheme } = useTheme(),
    toast = useToast()
  const [exporting, setExporting] = useState(false),
    [exportError, setExportError] = useState(''),
    [signOut, setSignOut] = useState(false)
  const [exportResult, setExportResult] = useState('')
  async function exportData() {
    if (!user) return
    setExporting(true)
    setExportError('')
    setExportResult('')
    try {
      const results = await Promise.allSettled(
        tables.map((t) => listRecords(t, user.id)),
      )
      const data: Record<string, unknown> = {}
      const missing: string[] = []
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') data[tables[i]] = r.value
        else missing.push(tables[i])
      })
      const browserRecords: Record<string, unknown> = {}
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith('lifeos_local_') && key.endsWith('_' + user.id)) {
          const raw = localStorage.getItem(key)
          if (raw) browserRecords[key] = raw
        }
      }
      const backup = {
        version: 2,
        exported_at: new Date().toISOString(),
        profile,
        data,
        browserRecords,
        missing,
      }
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
          type: 'application/json',
        }),
        url = URL.createObjectURL(blob),
        a = document.createElement('a')
      a.href = url
      a.download =
        'lifeos-backup-' + new Date().toISOString().slice(0, 10) + '.json'
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      setExportResult(
        missing.length
          ? 'Partial backup downloaded. Could not export: ' +
              missing.join(', ') +
              '. Browser-only records were included.'
          : 'Backup downloaded, including your saved history.',
      )
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'Could not export data.')
    } finally {
      setExporting(false)
    }
  }
  const localCount = user
    ? Object.keys(localStorage).filter(
        (k) => k.startsWith('lifeos_local_') && k.endsWith('_' + user.id),
      ).length
    : 0
  return (
    <>
      <PageIntro
        eyebrow="MAKE IT YOURS"
        title="A space that fits you."
        description="Your profile, appearance, and saved history."
      />
      <div className="equal-col">
        <div className="stack">
          <Panel title="Your profile">
            {profile ? (
              <Form
                key={profile.id + profile.updated_at}
                onSubmit={async (data) => {
                  await updateProfile({ full_name: textValue(data, 'name') })
                  toast.success('Profile saved')
                }}
              >
                <Field label="Your name">
                  <input
                    name="name"
                    defaultValue={profile.full_name}
                    required
                    maxLength={100}
                  />
                </Field>
                <p className="muted">
                  Dates follow this device’s local time:{' '}
                  {Intl.DateTimeFormat().resolvedOptions().timeZone}.
                </p>
              </Form>
            ) : (
              <>
                <p className="muted">Your profile could not load.</p>
                <button
                  className="btn secondary"
                  onClick={() => void refreshProfile()}
                >
                  Retry profile
                </button>
              </>
            )}
          </Panel>
          <Panel title="Appearance">
            <div className="skill-tabs" style={{ margin: 0 }}>
              {(['light', 'dark', 'system'] as const).map((t) => (
                <button
                  className={'chip ' + (theme === t ? 'active' : '')}
                  key={t}
                  onClick={() => setTheme(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </Panel>
          <Panel
            title="Your account"
            action={
              isConfigured ? <Cloud size={18} /> : <HardDrive size={18} />
            }
          >
            <p className="muted">
              {isConfigured
                ? 'Sign in with the same account on your phone and laptop to access cloud records. Changes refresh when you return to the app.'
                : 'This workspace currently saves in this browser only. Cloud sync requires a configured Supabase project.'}
            </p>
            <p className="muted" style={{ marginTop: 12 }}>
              {user?.email}
            </p>
            <button
              className="text-link view-all"
              onClick={() => setSignOut(true)}
            >
              <LogOut size={14} />
              Sign out
            </button>
          </Panel>
        </div>
        <div className="stack">
          <Panel
            title="Keep a copy"
            subtitle="Export your records before moving or changing devices."
            action={<Download size={18} />}
          >
            <button
              className="btn secondary"
              disabled={exporting}
              onClick={() => void exportData()}
            >
              {exporting ? 'Preparing backup…' : 'Download my data'}
            </button>
            {exportError && (
              <p className="error-text" role="alert">
                {exportError}
              </p>
            )}
            {exportResult && (
              <p className="muted" role="status" style={{ marginTop: 12 }}>
                {exportResult}
              </p>
            )}
            {isConfigured && localCount > 0 && (
              <p className="muted" style={{ marginTop: 12 }}>
                This browser also has {localCount} saved data collections for
                this account. Your export includes these separately, so older
                browser-only entries are preserved.
              </p>
            )}
          </Panel>
          <Panel title="Cloud setup">
            <details>
              <summary>Database update & setup instructions</summary>
              <div className="stack">
                <p className="muted">
                  For an existing Supabase project, run the complete migration{' '}
                  <code>supabase/migrations/20261021_focus_cleanup.sql</code> in
                  its SQL editor. It adds the missing tables and fields, and
                  removes goals, expenses, income, and journal_entries only when
                  those retired tables are empty. Existing tracking records and
                  accounts are kept.
                </p>
                <p className="muted">
                  For the Jobs search toolkit, also run{' '}
                  <code>
                    supabase/migrations/20261024_job_search_resources.sql
                  </code>
                  . It adds private keywords, links, and notes without changing
                  your applications.
                </p>
                <p className="muted">
                  For a new project, run <code>supabase/schema.sql</code>, which
                  includes all required tables. Set VITE_SUPABASE_URL and
                  VITE_SUPABASE_ANON_KEY in the deployment environment.
                </p>
                <p className="muted">
                  Failed cloud saves are reported and never silently moved to
                  browser storage. Your public client key cannot apply database
                  migrations; use your project’s SQL editor.
                </p>
              </div>
            </details>
          </Panel>
        </div>
      </div>
      {signOut && (
        <Dialog title="Sign out?" onClose={() => setSignOut(false)}>
          <Form
            submit="Sign out"
            onCancel={() => setSignOut(false)}
            onSubmit={async () => {
              await logout()
              setSignOut(false)
            }}
          >
            <p className="muted">
              Your saved entries will stay in your account or this browser.
            </p>
          </Form>
        </Dialog>
      )}
    </>
  )
}
