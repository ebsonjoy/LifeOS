import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { PageTitle } from './components/layout/PageTitle'
import { WorkspaceLoading } from './components/ui/LoadingState'
const AppLayout = lazy(() =>
  import('./components/layout/AppLayout').then((m) => ({
    default: m.AppLayout,
  })),
)

// Pages
const Login = lazy(() =>
  import('./pages/auth/Login').then((m) => ({ default: m.Login })),
)
const Register = lazy(() =>
  import('./pages/auth/Register').then((m) => ({ default: m.Register })),
)
const English = lazy(() =>
  import('./pages/english/English').then((m) => ({ default: m.English })),
)
import './features/life/life.css'
import './features/life/progress.css'
import './features/life/compact.css'
const Dashboard = lazy(() =>
  import('./pages/dashboard/Dashboard').then((m) => ({ default: m.Dashboard })),
)
const Plans = lazy(() =>
  import('./pages/plans/Plans').then((m) => ({ default: m.Plans })),
)
const Works = lazy(() =>
  import('./pages/works/Works').then((m) => ({ default: m.Works })),
)
const Habits = lazy(() =>
  import('./pages/habits/Habits').then((m) => ({ default: m.Habits })),
)
const Today = lazy(() =>
  import('./pages/today/Today').then((m) => ({ default: m.Today })),
)
const Career = lazy(() =>
  import('./pages/career/Career').then((m) => ({ default: m.Career })),
)
const Fitness = lazy(() =>
  import('./pages/fitness/Fitness').then((m) => ({ default: m.Fitness })),
)
const Settings = lazy(() =>
  import('./pages/settings/Settings').then((m) => ({ default: m.Settings })),
)

// TanStack Query Client instance with sensible caching defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 15, // Refresh when returning to the app
      refetchOnWindowFocus: true,
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
              <PageTitle />
              <Suspense fallback={<WorkspaceLoading />}>
                <Routes>
                  {/* Public Auth Routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />

                  {/* Protected Routes */}
                  <Route element={<ProtectedRoute />}>
                    <Route
                      path="/onboarding"
                      element={<Navigate to="/today" replace />}
                    />

                    {/* Authenticated Dashboard Shell Layout */}
                    <Route element={<AppLayout />}>
                      <Route
                        path="/"
                        element={<Navigate to="/dashboard" replace />}
                      />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/plans" element={<Plans />} />
                      <Route path="/works" element={<Works />} />
                      <Route path="/habits" element={<Habits />} />
                      <Route path="/english" element={<English />} />
                      <Route path="/today" element={<Today />} />
                      <Route path="/career" element={<Career />} />
                      <Route path="/fitness" element={<Fitness />} />
                      <Route path="/settings" element={<Settings />} />
                    </Route>
                  </Route>

                  {/* Catch-all redirect */}
                  <Route path="*" element={<Navigate to="/today" replace />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
