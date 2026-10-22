import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const titles: Record<string, string> = {
  '/login': 'Sign in',
  '/register': 'Create account',
  '/today': 'Today',
  '/english': 'English',
  '/fitness': 'Gym & Food',
  '/career': 'Jobs',
  '/settings': 'Settings',
}
export function PageTitle() {
  const { pathname } = useLocation()
  useEffect(() => {
    document.title = `${titles[pathname] || 'Your personal space'} · LifeOS`
  }, [pathname])
  return null
}
