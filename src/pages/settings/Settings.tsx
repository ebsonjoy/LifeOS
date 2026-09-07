import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User,
  Compass,
  Palette,
  LogOut,
  Sparkles,
  Database,
  Save,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useToast } from '../../context/ToastContext'
import { seedSampleData, clearUserData } from '../../lib/seed'
import {
  PageHeader,
  Button,
  Card,
  Input,
  ConfirmDialog,
} from '../../components/ui'

export function Settings() {
  const navigate = useNavigate()
  const { profile, updateProfile, logout, user } = useAuth()
  const { theme, setTheme } = useTheme()
  const { success, error: toastError } = useToast()

  // Profile Form
  const [fullName, setFullName] = useState('')
  const [timezone, setTimezone] = useState('')

  // Transformation Form
  const [startDate, setStartDate] = useState('2026-09-05')
  const [targetDate, setTargetDate] = useState('2029-09-05')

  const [isSaving, setIsSaving] = useState(false)
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false)
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false)

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '')
      setTimezone(profile.timezone || 'UTC')
      if (profile.transformation_start_date) {
        setStartDate(profile.transformation_start_date)
      }
      if (profile.transformation_target_date) {
        setTargetDate(profile.transformation_target_date)
      }
    }
  }, [profile])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      await updateProfile({
        full_name: fullName.trim(),
        timezone,
        transformation_start_date: startDate,
        transformation_target_date: targetDate,
      })
      success('Settings updated successfully ✓')
    } catch (err: any) {
      toastError(err?.message || 'Failed to update settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleLoadSampleData = async () => {
    if (!user) return
    setIsSaving(true)
    try {
      await seedSampleData(user.id)
      success('Sample demo data seeded ✓')
      window.location.reload()
    } catch (err: any) {
      toastError('Failed to load sample data')
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetData = async () => {
    if (!user) return
    setIsSaving(true)
    try {
      clearUserData(user.id)
      success('All local workspace data reset.')
      window.location.reload()
    } catch (err: any) {
      toastError('Failed to reset data')
    } finally {
      setIsSaving(false)
      setIsResetConfirmOpen(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 animate-in fade-in duration-300">
      <PageHeader
        title="System Settings"
        description="Configure your transformation horizons, profile, and visual appearance"
      />

      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* 1. PROFILE SECTION */}
        <Card className="p-6 bg-zinc-900/80 border-zinc-800">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-zinc-800/80">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-100 font-heading">
                Profile Information
              </h3>
              <p className="text-xs text-zinc-400">Personalize your identity across LifeOS</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <Input
              label="Timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              helperText="Determines daily cutoff and date calculations"
              required
            />
          </div>
        </Card>

        {/* 2. TRANSFORMATION HORIZON */}
        <Card className="p-6 bg-zinc-900/80 border-zinc-800">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-zinc-800/80">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-100 font-heading">
                3-Year Transformation Dates
              </h3>
              <p className="text-xs text-zinc-400">
                Adjusting these dynamically recalibrates your Day count across the dashboard
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Start Date (Day 1)"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
            <Input
              label="Target Date (Day 1095)"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              required
            />
          </div>
        </Card>

        {/* 3. APPEARANCE */}
        <Card className="p-6 bg-zinc-900/80 border-zinc-800">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-zinc-800/80">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-100 font-heading">
                Interface Appearance
              </h3>
              <p className="text-xs text-zinc-400">Choose your preferred visual theme</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'dark', label: 'Dark Mode (Default)' },
              { id: 'light', label: 'Light Mode' },
              { id: 'system', label: 'System Match' },
            ].map((th) => (
              <button
                key={th.id}
                type="button"
                onClick={() => setTheme(th.id as any)}
                className={`p-3 rounded-xl border text-xs font-semibold transition-all text-center ${
                  theme === th.id
                    ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/50 shadow-sm'
                    : 'bg-zinc-950/40 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {th.label}
              </button>
            ))}
          </div>
        </Card>

        {/* Save button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isSaving}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Save Configuration
          </Button>
        </div>
      </form>

      {/* 4. WORKSPACE & DEVELOPER DATA UTILITIES */}
      <Card className="p-6 bg-zinc-900/60 border-zinc-800 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-zinc-800/80">
          <div className="p-2.5 rounded-xl bg-zinc-800 text-zinc-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-100 font-heading">
              Data & Test Utilities
            </h3>
            <p className="text-xs text-zinc-400">
              Optional utilities for testing dashboard visualizations
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <div>
            <h4 className="text-sm font-semibold text-zinc-200">Seed Demo Data</h4>
            <p className="text-xs text-zinc-400">
              Pre-populates sample habits, 7-day logs, goals, and finances for testing
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleLoadSampleData}
            leftIcon={<Sparkles className="w-4 h-4 text-amber-400" />}
          >
            Load Sample Data
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-zinc-800/60">
          <div>
            <h4 className="text-sm font-semibold text-zinc-200">Reset Local Workspace</h4>
            <p className="text-xs text-zinc-400">
              Clears all local records to test fresh new-user empty states
            </p>
          </div>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => setIsResetConfirmOpen(true)}
          >
            Reset Workspace
          </Button>
        </div>
      </Card>

      {/* 5. ACCOUNT LOGOUT */}
      <Card className="p-6 bg-zinc-900/60 border-zinc-800 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-zinc-200 font-heading">Sign Out</h3>
          <p className="text-xs text-zinc-400">
            Signed in as <span className="text-zinc-300 font-mono">{user?.email}</span>
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsLogoutConfirmOpen(true)}
          leftIcon={<LogOut className="w-4 h-4 text-rose-400" />}
        >
          Sign Out
        </Button>
      </Card>

      {/* Logout Dialog */}
      <ConfirmDialog
        isOpen={isLogoutConfirmOpen}
        onClose={() => setIsLogoutConfirmOpen(false)}
        onConfirm={handleLogout}
        title="Sign Out"
        message="Are you sure you want to sign out of LifeOS?"
        confirmText="Sign Out"
        isDestructive={false}
      />

      {/* Reset Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleResetData}
        title="Reset All Local Workspace Data"
        message="This will clear all local habits, logs, goals, journal entries, and finances. Are you sure?"
        confirmText="Reset All Data"
      />
    </div>
  )
}
