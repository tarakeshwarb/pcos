import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, useNavigate } from 'react-router-dom'
import { ThemeProvider } from './lib/theme.jsx'
import App from './App.jsx'
import './index.css'

// Enforce pure light mode and solid white background permanently across entire site
document.documentElement.classList.remove('dark')
document.documentElement.classList.add('light')
document.documentElement.style.backgroundColor = '#ffffff'
if (document.body) {
  document.body.style.backgroundColor = '#ffffff'
}
try {
  localStorage.setItem('pcos_theme', 'light')
} catch {}

function HashRedirect() {
  const navigate = useNavigate()
  useEffect(() => {
    if (window.location.hash && window.location.hash.startsWith('#/')) {
      const path = window.location.hash.slice(1)
      window.history.replaceState(null, '', path)
      navigate(path, { replace: true })
    }
  }, [navigate])
  return null
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <HashRedirect />
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>,
)
