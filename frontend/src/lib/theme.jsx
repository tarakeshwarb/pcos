import { createContext, useContext, useEffect } from 'react'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  useEffect(() => {
    localStorage.setItem('pcos_theme', 'light')
    const root = document.documentElement
    root.classList.add('light')
    root.classList.remove('dark')
  }, [])

  return (
    <ThemeContext.Provider value={{ theme: 'light', setTheme: () => {}, toggleTheme: () => {}, isDark: false }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    return { theme: 'light', isDark: false, toggleTheme: () => {} }
  }
  return ctx
}
