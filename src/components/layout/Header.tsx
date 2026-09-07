import { useState } from 'react'
import { Plus, Sun, Moon, Laptop, Menu } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { formatLongDate } from '../../lib/dateUtils'
import { QuickActionModal } from '../QuickActionModal'
import { Button } from '../ui'

export function Header({ onOpenMobileMenu }: { onOpenMobileMenu: () => void }) {
  const { profile } = useAuth()
  const { theme, setTheme, isDark } = useTheme()
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false)

  const cycleTheme = () => {
    if (theme === 'dark') setTheme('light')
    else if (theme === 'light') setTheme('system')
    else setTheme('dark')
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'Dev'

  return (
    <>
      <header className="h-16 px-4 sm:px-8 border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur-md flex items-center justify-between sticky top-0 z-20">
        {/* Left: Mobile menu trigger + Header title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileMenu}
            className="md:hidden p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 focus:outline-none"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="hidden sm:flex flex-col">
            <span className="text-xs font-medium text-zinc-400">
              {formatLongDate()}
            </span>
            <span className="text-sm font-semibold text-zinc-100 font-heading">
              Welcome back, {firstName}
            </span>
          </div>

          <div className="sm:hidden font-bold text-base text-zinc-100 font-heading">
            LifeOS
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5">
          {/* Quick Action Button */}
          <Button
            size="sm"
            variant="primary"
            onClick={() => setIsQuickActionOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            <span className="hidden sm:inline">Quick Action</span>
            <span className="sm:hidden">Log</span>
          </Button>

          {/* Theme Toggle Button */}
          <button
            onClick={cycleTheme}
            className="p-2 rounded-xl border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            title={`Current theme: ${theme}. Click to toggle.`}
            aria-label="Toggle theme"
          >
            {theme === 'system' ? (
              <Laptop className="w-4 h-4" />
            ) : isDark ? (
              <Moon className="w-4 h-4" />
            ) : (
              <Sun className="w-4 h-4 text-amber-500" />
            )}
          </button>

          {/* Profile Badge */}
          <div className="flex items-center gap-2 pl-2 border-l border-zinc-800">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center font-bold text-xs shadow-inner">
              {firstName.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      {/* Quick Action Modal */}
      <QuickActionModal
        isOpen={isQuickActionOpen}
        onClose={() => setIsQuickActionOpen(false)}
      />
    </>
  )
}
