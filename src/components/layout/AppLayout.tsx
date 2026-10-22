import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  CalendarDays,
  BookOpen,
  Dumbbell,
  Briefcase,
  Settings,
  ArrowUpRight,
  Sprout,
  Cloud,
  HardDrive,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToday } from '../../features/life/ui'
import { DailyHeader } from './DailyHeader'
const links = [
  { to: '/today', label: 'Today', icon: CalendarDays },
  { to: '/english', label: 'English', icon: BookOpen },
  { to: '/fitness', label: 'Gym & Food', icon: Dumbbell },
  { to: '/career', label: 'Jobs', icon: Briefcase },
]
export function AppLayout() {
  const { profile, isConfigured, profileError, refreshProfile } = useAuth()
  const today = useToday()
  const location = useLocation()
  const current =
    links.find((l) => location.pathname === l.to)?.label || 'Settings'
  return (
    <div className="life">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="life-sidebar">
        <NavLink to="/today" className="brand">
          <span className="brand-mark">
            <Sprout size={23} />
          </span>
          <span>
            life<span className="brand-os">OS</span>
            <small>A little better, every day.</small>
          </span>
        </NavLink>
        <div className="nav-label">YOUR EVERYDAY</div>
        <nav aria-label="Main navigation">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                'nav-item ' + (isActive ? 'selected' : '')
              }
            >
              <Icon size={19} />
              <span>{label}</span>
              {to === '/english' && <span className="nav-dot" />}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="eyebrow">ONE DAY AT A TIME</span>
          <p>
            Small steps.
            <br />
            Room to grow.
          </p>
          <span>Start where you are today.</span>
        </div>
        <NavLink to="/settings" className="nav-item settings-link">
          <Settings size={18} />
          Settings & backup
        </NavLink>
        <div className="profile-chip">
          <span className="avatar">
            {(profile?.full_name || 'Y')[0].toUpperCase()}
          </span>
          <div>
            <strong>{profile?.full_name || 'Your space'}</strong>
            <small>
              {isConfigured ? 'Personal workspace' : 'Saved on this browser'}
            </small>
          </div>
        </div>
      </aside>
      <div className="life-main">
        <DailyHeader>
          <span className="breadcrumb">
            My space <span>/</span> <strong>{current}</strong>
          </span>
          <span
            className="storage-badge"
            title={
              isConfigured
                ? 'Records are saved to your signed-in account. Failed saves are shown.'
                : 'This browser only. Set up cloud sync to use the same data on phone and laptop.'
            }
          >
            {isConfigured ? <Cloud size={14} /> : <HardDrive size={14} />}
            <span>{isConfigured ? 'Cloud account' : 'Local storage'}</span>
          </span>
          <NavLink
            className="mobile-settings icon-btn"
            to="/settings"
            aria-label="Settings"
          >
            <Settings size={19} />
          </NavLink>
        </DailyHeader>
        <main id="main" className="page-content">
          {profileError && (
            <div className="data-notice" role="alert">
              <p>Profile unavailable: {profileError}</p>
              <button
                className="btn secondary"
                onClick={() => void refreshProfile()}
              >
                Retry
              </button>
            </div>
          )}
          <Outlet />
        </main>
        <footer className="life-footer">
          <span>Your pace. Your progress.</span>
          <NavLink to={'/today?date=' + today}>
            Back to today <ArrowUpRight size={13} />
          </NavLink>
        </footer>
      </div>
      <nav className="mobile-dock" aria-label="Mobile navigation">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to}>
            <Icon size={21} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
