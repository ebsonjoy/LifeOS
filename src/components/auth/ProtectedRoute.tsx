import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { SessionStatus } from './SessionStatus'
export function ProtectedRoute() {
  const { user, loading, sessionError } = useAuth()
  const location = useLocation()
  if (loading || sessionError) return <SessionStatus />
  if (!user)
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search + location.hash }}
      />
    )
  return <Outlet />
}
