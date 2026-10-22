import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { Brand } from '../brand/Brand'
import { useAuth } from '../../context/AuthContext'
export function SessionStatus() {
  const { sessionError, retrySession } = useAuth()
  return (
    <div className="session-screen life">
      <div className="session-card">
        <Brand />
        {sessionError ? (
          <>
            <h1>Let’s reconnect.</h1>
            <p role="alert">{sessionError}</p>
            <button className="btn" onClick={retrySession}>
              Try again
            </button>
            <Link to="/login">Go to sign in</Link>
          </>
        ) : (
          <p role="status">
            <Loader2 size={18} className="auth-spinner" /> Restoring your
            session…
          </p>
        )}
      </div>
    </div>
  )
}
