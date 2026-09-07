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
  X,
  Zap,
  Clock,
} from 'lucide-react'

export interface MobileNavProps {
  isOpen: boolean
  onClose: () => void
}

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const allRoutes = [
    { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { to: '/today', label: 'Today', icon: <CalendarCheck className="w-5 h-5" /> },
    { to: '/planning', label: 'Planning', icon: <Clock className="w-5 h-5" /> },
    { to: '/habits', label: 'Habits', icon: <CheckSquare className="w-5 h-5" /> },
    { to: '/goals', label: 'Goals', icon: <Target className="w-5 h-5" /> },
    { to: '/analytics', label: 'Analytics', icon: <BarChart3 className="w-5 h-5" /> },
    { to: '/career', label: 'Career', icon: <Briefcase className="w-5 h-5" /> },
    { to: '/finance', label: 'Finance', icon: <Wallet className="w-5 h-5" /> },
    { to: '/fitness', label: 'Fitness', icon: <Dumbbell className="w-5 h-5" /> },
    { to: '/journal', label: 'Journal', icon: <BookOpen className="w-5 h-5" /> },
    { to: '/settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ]

  const bottomDockRoutes = [
    { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { to: '/today', label: 'Today', icon: <CalendarCheck className="w-5 h-5" /> },
    { to: '/habits', label: 'Habits', icon: <CheckSquare className="w-5 h-5" /> },
    { to: '/goals', label: 'Goals', icon: <Target className="w-5 h-5" /> },
  ]

  return (
    <>
      {/* Slide-out Mobile Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={onClose}
          />

          <div className="fixed inset-y-0 left-0 max-w-xs w-full bg-zinc-950 border-r border-zinc-800 p-6 flex flex-col justify-between z-10 shadow-2xl animate-in slide-in-from-left duration-200">
            <div>
              <div className="flex items-center justify-between pb-5 border-b border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                    <Zap className="w-4 h-4 fill-white" />
                  </div>
                  <span className="font-bold text-lg text-zinc-100 font-heading">LifeOS</span>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="mt-6 space-y-1.5 overflow-y-auto max-h-[70vh]">
                {allRoutes.map((route) => (
                  <NavLink
                    key={route.to}
                    to={route.to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/20'
                          : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
                      }`
                    }
                  >
                    {route.icon}
                    <span>{route.label}</span>
                  </NavLink>
                ))}
              </nav>
            </div>

            <div className="pt-4 border-t border-zinc-800 text-xs text-zinc-500 text-center">
              Day by day transformation
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Dock */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-zinc-950/90 backdrop-blur-lg border-t border-zinc-800/80 z-20 flex items-center justify-around px-2">
        {bottomDockRoutes.map((route) => (
          <NavLink
            key={route.to}
            to={route.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-14 py-1 gap-1 text-[10px] font-medium transition-colors ${
                isActive ? 'text-indigo-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
              }`
            }
          >
            {route.icon}
            <span>{route.label}</span>
          </NavLink>
        ))}
        <button
          onClick={() => onClose()}
          className="flex flex-col items-center justify-center w-14 py-1 gap-1 text-[10px] font-medium text-zinc-400 hover:text-zinc-200"
        >
          <BarChart3 className="w-5 h-5" />
          <span>More</span>
        </button>
      </nav>
    </>
  )
}
