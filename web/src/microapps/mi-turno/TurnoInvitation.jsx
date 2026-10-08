import { useEffect, useState } from 'react'
import { Logo } from '../../components/Logo'
import { AuthPage } from '../../pages/AuthPage'
import { api, TOKEN_KEY } from '../../services/api'
import './MiTurno.css'

export function TurnoInvitation({ token }) {
  const [invitation, setInvitation] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authMode, setAuthMode] = useState('login')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const base = '/turnos/invitations/' + encodeURIComponent(token)
  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const result = await api(base, { signal: controller.signal })
        if (controller.signal.aborted) return
        setInvitation(result)
        if (localStorage.getItem(TOKEN_KEY)) {
          try {
            const account = await api('/auth/me', { signal: controller.signal })
            if (!controller.signal.aborted) setUser(account.user)
          } catch { if (!controller.signal.aborted) localStorage.removeItem(TOKEN_KEY) }
        }
      } catch (failure) { if (!controller.signal.aborted) setError(failure.message) }
      finally { if (!controller.signal.aborted) setLoading(false) }
    }
    load()
    return () => controller.abort()
  }, [base])
  async function accept() {
    setBusy(true); setError('')
    try {
      const result = await api(base + '/accept', { method: 'POST' })
      location.href = '/mi-turno/' + result.workspaceId + '/operacion'
    } catch (failure) { setError(failure.message); setBusy(false) }
  }
  async function changeAccount() {
    try { await api('/auth/logout', { method: 'POST' }) } catch { /* Allow signing in again locally. */ }
    localStorage.removeItem(TOKEN_KEY); setUser(null); setError('')
  }
  if (!loading && invitation && !user) return <AuthPage mode={authMode} onModeChange={setAuthMode} onAuthenticated={setUser} onClose={() => { location.href = '/' }} initialEmail={invitation.email} description={invitation.name + ' te invita a atender en ' + invitation.counterName + '. Ingresa con ' + invitation.email + ' o crea tu cuenta con ese correo.'} />
  const correctAccount = user?.email?.toLowerCase() === invitation?.email
  return <div className="turno"><header className="turno-header"><Logo /><a className="turno-back" href="/">← Volver a Mi0</a></header>
    <main className="turno-public-main"><section className="turno-panel">
      <h1>Invitación a Mi Turno</h1>
      {loading ? <p>Cargando invitación…</p> : invitation && <>
        <h2>{invitation.name}</h2><p>Ventanilla: <strong>{invitation.counterName}</strong></p>
        <p>Cuenta: {user?.email}</p>
        {correctAccount ? <><p>Al aceptar, podrás atender únicamente tu ventanilla asignada.</p><button disabled={busy} onClick={accept}>{busy ? 'Aceptando…' : 'Aceptar invitación'}</button></>
          : <><p>Esta invitación es para {invitation.email}. Cambia de cuenta para aceptarla.</p><button className="turno-secondary" onClick={changeAccount}>Cambiar de cuenta</button></>}
      </>}
      {error && <p className="turno-error" role="alert">{error}</p>}
    </section></main>
  </div>
}
