import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Input, Button, Card } from '../../components/ui'
import { Zap, ArrowRight, ShieldCheck } from 'lucide-react'

export function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err?.message || 'Invalid email or credentials. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Quick Demo Access helper
  const handleQuickDemo = async () => {
    setIsLoading(true)
    try {
      await login('dev@lifeos.app', 'password123')
      navigate('/dashboard')
    } catch (err: any) {
      setError(err?.message || 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-950 text-zinc-100">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-xl shadow-indigo-600/30 mb-3">
            <Zap className="w-6 h-6 fill-white" />
          </div>
          <h1 className="text-2xl font-bold font-heading text-zinc-100">Welcome to LifeOS</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Track your 3-year transformation across career, habits, and discipline
          </p>
        </div>

        <Card className="p-6 sm:p-8 bg-zinc-900/80 border-zinc-800 shadow-2xl">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
                {error}
              </div>
            )}

            <Input
              label="Email address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="mt-2 w-full"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-zinc-800/80 flex flex-col gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleQuickDemo}
              disabled={isLoading}
              leftIcon={<ShieldCheck className="w-4 h-4 text-emerald-400" />}
              className="w-full justify-center"
            >
              One-Click Demo Workspace
            </Button>

            <div className="text-center text-xs text-zinc-400">
              Don't have an account?{' '}
              <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-semibold underline-offset-4 hover:underline">
                Create an account
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
