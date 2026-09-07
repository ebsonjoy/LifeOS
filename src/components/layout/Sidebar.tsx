import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  CalendarCheck,
  CheckSquare,
  Target,
  BarChart3,
  Briefcase,
  Wallet,
  Dumbbell,
  BookOpen,
  Settings,
  Flame,
  Zap,
  Clock,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getTransformationStats } from '../../lib/dateUtils'

export function Sidebar() {
  const { profile } = useAuth()

  const startDate = profile?.transformation_start_date || '2026-09-05'
  const targetDate = profile?.transformation_target_date || '2029-09-05'
  const { currentDay, totalDays, progressPercent } = getTransformationStats(startDate, targetDate)

  const mainNav = [
    { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { to: '/today', label: 'Today', icon: <CalendarCheck className="w-4 h-4" /> },
    { to: '/planning', label: 'Planning', icon: <Clock className="w-4 h-4" /> },
    { to: '/habits', label: 'Habits', icon: <CheckSquare className="w-4 h-4" /> },
    { to: '/goals', label: 'Goals', icon: <Target className="w-4 h-4" /> },
    { to: '/analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
  ]

  const areaNav = [
    { to: '/career', label: 'Career', icon: <Briefcase className="w-4 h-4" /> },
    { to: '/finance', label: 'Finance', icon: <Wallet className="w-4 h-4" /> },
    { to: '/fitness', label: 'Fitness', icon: <Dumbbell className="w-4 h-4" /> },
    { to: '/journal', label: 'Journal', icon: <BookOpen className="w-4 h-4" /> },
  ]

  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 h-screen sticky top-0 border-r border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl select-none z-30">
      {/* Brand Header */}
      <div className="p-5 pb-4 border-b border-zinc-800/60 flex items-center justify-between">
        <NavLink to="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-600/30 group-hover:scale-105 transition-transform">
            <Zap className="w-4 h-4 fill-white" />
          </div>
          <div>
            <span className="text-base font-bold text-zinc-100 font-heading tracking-tight block">
              LifeOS
            </span>
            <span className="text-[10px] uppercase font-semibold tracking-wider text-indigo-400">
              Transformation
            </span>
          </div>
        </NavLink>
      </div>

      {/* 3-Year Progress Snippet in Sidebar */}
      <div className="px-4 py-3 mx-3 my-2 rounded-xl bg-zinc-900/70 border border-zinc-800/80 flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-zinc-300 flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            Day {currentDay} / {totalDays}
          </span>
          <span className="font-mono text-zinc-400 text-[11px]">{progressPercent}%</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(1, progressPercent))}%` }}
          />
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-6">
        <div>
          <div className="px-3 pb-2 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
            Overview
          </div>
          <nav className="space-y-1">
            {mainNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-indigo-600/15 text-indigo-300 font-semibold border border-indigo-500/20 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60'
                  }`
                }
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div>
          <div className="px-3 pb-2 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
            Life Areas
          </div>
          <nav className="space-y-1">
            {areaNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-indigo-600/15 text-indigo-300 font-semibold border border-indigo-500/20 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60'
                  }`
                }
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      {/* Footer / Settings link */}
      <div className="p-3 border-t border-zinc-800/80 space-y-1">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
              isActive
                ? 'bg-indigo-600/15 text-indigo-300 font-semibold border border-indigo-500/20'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60'
            }`
          }
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </NavLink>
      </div>
    </aside>
  )
}
