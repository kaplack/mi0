import { useEffect, useState } from 'react'
import './App.css'
import { AuthPage } from './pages/AuthPage'
import { HomePage } from './pages/HomePage'
import { Mi0Page } from './pages/Mi0Page'\nimport { Sorteos } from './microapps/sorteos/Sorteos'
import { api, TOKEN_KEY } from './services/api'

function App() {
  const [authMode, setAuthMode] = useState(null)
  const [user, setUser] = useState(null)
  const [consoleOpen, setConsoleOpen] = useState(true)
  const [consoleRefresh] = useState(0)\n  const [activeMicroapp, setActiveMicroapp] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) return

    api('/auth/me')
      .then((data) => {
        setUser(data.user)
        setConsoleOpen(true)
      })
      .catch(() => localStorage.removeItem(TOKEN_KEY))
  }, [])

  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST' })
    } catch {
      // The local session must still be cleared if the API is unavailable.
    }
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
    setConsoleOpen(false)
  }

  if (activeMicroapp === 'sorteos') {
    return <Sorteos onBack={() => setActiveMicroapp(null)} />
  }

  if (authMode) {
    return (
      <AuthPage
        mode={authMode}
        onModeChange={setAuthMode}
        onAuthenticated={(nextUser) => {
          setUser(nextUser)
          setConsoleOpen(true)
          setAuthMode(null)
        }}
        onClose={() => setAuthMode(null)}
      />
    )
  }

  if (user && consoleOpen) {
    return (
      <Mi0Page
        key={consoleRefresh}
        user={user}
        onLogout={logout}
        onExplore={() => setConsoleOpen(false)}
      />
    )
  }

  return (
    <HomePage
      user={user}
      onLogin={() => setAuthMode('login')}
      onRegister={() => setAuthMode('register')}
      onOpenMi0={() => setConsoleOpen(true)}
      onLogout={logout}
      onOpenMicroapp={setActiveMicroapp}
    />
  )
}

export default App
