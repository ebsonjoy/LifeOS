import React, { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light' | 'system'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  isDark: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('lifeos_theme') as Theme | null
    return saved || 'dark' // Default theme is dark as requested
  })

  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    const root = document.documentElement
    localStorage.setItem('lifeos_theme', theme)

    const applyDark = () => {
      root.classList.add('dark')
      root.classList.remove('light')
      setIsDark(true)
    }

    const applyLight = () => {
      root.classList.remove('dark')
      root.classList.add('light')
      setIsDark(false)
    }

    if (theme === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: dark)')
      if (media.matches) applyDark()
      else applyLight()

      const listener = (e: MediaQueryListEvent) => {
        if (e.matches) applyDark()
        else applyLight()
      }
      media.addEventListener('change', listener)
      return () => media.removeEventListener('change', listener)
    } else if (theme === 'light') {
      applyLight()
    } else {
      applyDark()
    }
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within a ThemeProvider')
  return context
}
