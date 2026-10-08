import { useEffect, useState } from 'react'
import { Logo } from '../../components/Logo'
import { AuthPage } from '../../pages/AuthPage'
import { TOKEN_KEY } from '../../services/api'
import { citaService } from '../../services/citas'
import './MiCita.css'
export function CitaInvitation({ token }) {
  const [invitation, setInvitation] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authMode, setAuthMode] = useState('login')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const result = await citaService.invitation(token, { signal: controller.signal })
        if (controller.signal.aborted) return
        setInvitation(result)
        if (localStorage.getItem(TOKEN_KEY)) {
          try { const account = await citaService.currentAccount({ signal: controller.signal }); if (!controller.signal.aborted) setUser(account.user) }
          catch { if (!controller.signal.aborted) localStorage.removeItem(TOKEN_KEY) }
        }
      } catch (failure) { if (!controller.signal.aborted) setError(failure.message) }
      finally { if (!controller.signal.aborted) setLoading(false) }
    }
    load()
    return () => controller.abort()
  }, [token])
  async function accept() {
    setBusy(true); setError('')
    try { const result = await citaService.acceptInvitation(token); location.href = '/mi-cita/' + result.workspaceId + '/agenda' }
    catch (failure) { setError(failure.message); setBusy(false) }
  }
  async function changeAccount() {
    try { await citaService.logout() } catch { /* Permit a new local sign-in. */ }
    localStorage.removeItem(TOKEN_KEY); setUser(null); setError('')
  }
  if (!loading && invitation && !user) return <AuthPage mode={authMode} onModeChange={setAuthMode} onAuthenticated={setUser} onClose={() => { location.href = '/' }} initialEmail={invitation.email} description={invitation.name + ' te invita a consultar tu agenda como ' + invitation.professionalName + '. Ingresa o crea tu cuenta con ' + invitation.email + '.'} />
  return <div className="cita"><header className="cita-header"><Logo /><a className="cita-back" href="/">← Volver a Mi0</a></header><main className="cita-public-main"><section className="cita-panel"><h1>Invitación a Mi Cita</h1>
    {loading ? <p role="status">Cargando invitación…</p> : invitation && <><h2>{invitation.name}</h2><p>Profesional: <strong>{invitation.professionalName}</strong></p><p>Cuenta: {user?.email}</p>
      {user?.email?.toLowerCase() === invitation.email ? <><p>Podrás consultar, confirmar y cancelar únicamente tus citas, y compartir tu QR y enlace.</p><button disabled={busy} onClick={accept}>{busy ? 'Aceptando…' : 'Aceptar invitación'}</button></> : <><p>Esta invitación es para {invitation.email}. Cambia de cuenta para aceptarla.</p><button className="cita-secondary" onClick={changeAccount}>Cambiar de cuenta</button></>}
    </>}{error && <p className="cita-error" role="alert">{error}</p>}</section></main></div>
}
