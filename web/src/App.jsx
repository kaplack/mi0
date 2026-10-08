import { useCallback, useEffect, useState } from 'react'
import './App.css'
import { AuthPage } from './pages/AuthPage'
import { HomePage } from './pages/HomePage'
import { Mi0Page } from './pages/Mi0Page'
import { TurnoInvitation } from './microapps/mi-turno/TurnoInvitation'
import { MiTurno } from './microapps/mi-turno/MiTurno'
import { Sorteos } from './microapps/sorteos/Sorteos'
import { SorteosAvanzado } from './microapps/sorteos-avanzado/SorteosAvanzado'
import { PublicRaffle } from './microapps/sorteos-avanzado/PublicRaffle'
import { api, TOKEN_KEY } from './services/api'

function App() {
  const [pathname, setPathname] = useState(window.location.pathname)
  const navigate = useCallback(path => {
    if (window.location.pathname !== path) window.history.pushState(null, '', path)
    setPathname(window.location.pathname)
  }, [])
  useEffect(() => {
    const update = () => setPathname(window.location.pathname)
    window.addEventListener('popstate', update)
    return () => window.removeEventListener('popstate', update)
  }, [])
  const [authMode, setAuthMode] = useState(null)
  const [user, setUser] = useState(null)
  const [consoleOpen, setConsoleOpen] = useState(true)
  const [activeMicroapp, setActiveMicroapp] = useState(null)
  const [workspace, setWorkspace] = useState(null)
  const [openAdvancedRequested, setOpenAdvancedRequested] = useState(false)
  const invitationMatch = pathname.match(/^\/mi-turno\/invitacion\/([a-f0-9]{64})\/?$/)
  const turnoMatch = pathname.match(/^\/turno\/([^/]+)\/?$/)
  const displayMatch = pathname.match(/^\/turno\/([^/]+)\/pantalla\/?$/)
  const managerMatch = pathname.match(/^\/mi-turno(?:\/([^/]+)\/(configuracion|operacion|qr|operadores))?\/?$/)
  const publicMatch = pathname.match(/^\/s\/([^/]+)\/?$/)

  useEffect(() => {
    if (window.location.pathname.startsWith('/s/')) return
    if (!localStorage.getItem(TOKEN_KEY)) return
    const controller = new AbortController()
    api('/auth/me', { signal: controller.signal }).then(data => {
      setUser(data.user); setConsoleOpen(true)
    }).catch(() => { if (!controller.signal.aborted) localStorage.removeItem(TOKEN_KEY) })
    return () => controller.abort()
  }, [])

  async function logout() {
    try { await api('/auth/logout', { method: 'POST' }) } catch { /* Clear the local session even if the API is unavailable. */ }
    localStorage.removeItem(TOKEN_KEY)
    setUser(null); setConsoleOpen(false); setActiveMicroapp(null); setWorkspace(null); setOpenAdvancedRequested(false)
  }
  const openMicroapp = useCallback((code, nextWorkspace) => {
    if (code === 'sorteos-avanzado') {
      if (user && nextWorkspace) { setWorkspace(nextWorkspace); setActiveMicroapp(code); setOpenAdvancedRequested(false) }
      else {
        setOpenAdvancedRequested(true)
        if (!user) setAuthMode('login')
        else setConsoleOpen(true)
      }
    } else if (code === 'mi-turno' && nextWorkspace) navigate('/mi-turno/' + nextWorkspace.id + '/operacion')
    else setActiveMicroapp(code)
  }, [user, navigate])

  if (authMode) return <AuthPage mode={authMode} onModeChange={setAuthMode} onAuthenticated={nextUser => {
    setUser(nextUser); setConsoleOpen(true); setAuthMode(null)
  }} onClose={() => { setAuthMode(null); setOpenAdvancedRequested(false) }} />
  if (invitationMatch) return <TurnoInvitation token={invitationMatch[1]} />
  if (displayMatch) return <MiTurno code={displayMatch[1]} publicDisplay />
  if (managerMatch) return <MiTurno workspaceId={managerMatch[1]} page={managerMatch[2]} onNavigate={navigate} onLogin={() => setAuthMode('login')} />
  if (turnoMatch) return <MiTurno code={turnoMatch[1]} />
  if (activeMicroapp === 'mi-turno') return <MiTurno onBack={() => setActiveMicroapp(null)} onLogin={() => setAuthMode('login')} />
  if (publicMatch) return <PublicRaffle code={publicMatch[1]} />
  if (activeMicroapp === 'sorteos') return <Sorteos onBack={() => setActiveMicroapp(null)} />
  if (activeMicroapp === 'sorteos-avanzado' && user && workspace) return <SorteosAvanzado workspace={workspace} onBack={() => { setActiveMicroapp(null); setConsoleOpen(true) }} />
  if (user && consoleOpen) return <Mi0Page user={user} onLogout={logout} onExplore={() => setConsoleOpen(false)}
    onOpenMicroapp={openMicroapp} openAdvancedRequested={openAdvancedRequested} />
  return <HomePage user={user} onLogin={() => setAuthMode('login')} onRegister={() => setAuthMode('register')}
    onOpenMi0={() => setConsoleOpen(true)} onLogout={logout} onOpenMicroapp={openMicroapp} />
}
export default App
