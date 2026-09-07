import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { AppLayout } from './components/layout/AppLayout'

// Pages
import { Login } from './pages/auth/Login'
import { Register } from './pages/auth/Register'
import { Onboarding } from './pages/onboarding/Onboarding'
import { Dashboard } from './pages/dashboard/Dashboard'
import { Today } from './pages/today/Today'
import { Planning } from './pages/planning/Planning'
import { Habits } from './pages/habits/Habits'
import { Goals } from './pages/goals/Goals'
import { Analytics } from './pages/analytics/Analytics'
import { Career } from './pages/career/Career'
import { Finance } from './pages/finance/Finance'
import { Fitness } from './pages/fitness/Fitness'
import { Journal } from './pages/journal/Journal'
import { Settings } from './pages/settings/Settings'

// TanStack Query Client instance with sensible caching defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                {/* Public Auth Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Protected Routes */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/onboarding" element={<Onboarding />} />

                  {/* Authenticated Dashboard Shell Layout */}
                  <Route element={<AppLayout />}>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/today" element={<Today />} />
                    <Route path="/planning" element={<Planning />} />
                    <Route path="/habits" element={<Habits />} />
                    <Route path="/goals" element={<Goals />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/career" element={<Career />} />
                    <Route path="/finance" element={<Finance />} />
                    <Route path="/fitness" element={<Fitness />} />
                    <Route path="/journal" element={<Journal />} />
                    <Route path="/settings" element={<Settings />} />
                  </Route>
                </Route>

                {/* Catch-all redirect */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
