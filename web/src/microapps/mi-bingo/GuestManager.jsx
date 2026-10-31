import { useState } from 'react'
import { bingo, guestAccess, GUEST_KEY, pendingRecovery, randomSecret, UPGRADE_KEY } from '../../services/bingo'
import { createWorkspace } from '../../services/workspaces'
import { useBingo } from './useBingo'

export function GuestManager({ Organizer, onLogin, onNavigate, onAccount, loggedIn }) {
  const [recovery, setRecovery] = useState(pendingRecovery)
  const [access, setAccess] = useState(guestAccess)
  const [name, setName] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const state = useBingo(async () => {
    const transfer = localStorage.getItem('mi0_bingo_transfer')
    if (loggedIn && transfer && access?.adminToken) {
      const pending = JSON.parse(transfer)
      let result
      try { result = await bingo.attach(pending.code, { adminToken: access.adminToken, workspaceId: pending.workspaceId }) }
      catch (e) { if (e.name !== 'TypeError') localStorage.removeItem('mi0_bingo_transfer'); throw e }
      localStorage.removeItem('mi0_bingo_transfer'); localStorage.removeItem(GUEST_KEY); localStorage.removeItem(UPGRADE_KEY)
      onNavigate('/mi-bingo/' + result.room.workspaceId)
      return { room: null }
    }
    if (recovery?.invalid) throw new Error('El enlace privado no tiene un formato válido. Solicita uno nuevo.')
    if (recovery) {
      const result = await bingo.recover(recovery)
      const next = { code: result.room.code, adminToken: recovery.newAdminToken }
      localStorage.setItem(GUEST_KEY, JSON.stringify(next)); setAccess(next)
      sessionStorage.removeItem('mi0_bingo_recovery'); setRecovery(null)
      return result
    }
    return access?.adminToken ? bingo.guestCurrent(access.adminToken) : { room: null }
  }, 'guest-' + (access?.adminToken || '') + Boolean(recovery), Boolean(access?.code) && !recovery)
  const room = state.data?.room
  async function create(event) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const adminToken = access?.adminToken || randomSecret()
      // Store before sending so a response lost after commit can be recovered.
      localStorage.setItem(GUEST_KEY, JSON.stringify({ adminToken })); setAccess({ adminToken })
      const result = await bingo.guestCreate({ name, adminToken })
      const next = { adminToken, code: result.room.code }
      localStorage.setItem(GUEST_KEY, JSON.stringify(next)); setAccess(next); await state.reload()
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  function startAgain() {
    localStorage.removeItem(GUEST_KEY); localStorage.removeItem(UPGRADE_KEY); setAccess(null)
  }
  if (!state.data && !state.error) return <main className="bingo-manager bingo-guest"><p role="status">{recovery ? 'Recuperando tu sala…' : 'Buscando tu bingo…'}</p></main>
  if (!room) {
    return <main className="bingo-manager bingo-guest"><div className="bingo-title"><div><span className="eyebrow">SIN REGISTRO · GRATIS</span><h1>Mi Bingo</h1><p>Organiza un bingo gratis con hasta 30 cartones.</p></div></div>
      {(error || state.error) && <p className="bingo-notice is-error" role="alert">{error || state.error}<button className="secondary-button" onClick={state.reload}>Reintentar</button>{recovery && <button className="secondary-button" onClick={() => { sessionStorage.removeItem('mi0_bingo_recovery'); setRecovery(null) }}>Volver a Mi Bingo</button>}</p>}
      <section className="bingo-panel bingo-create"><h2>Que empiece la diversión</h2><p>Sin cuentas ni instalaciones. Comparte el QR y juega desde el celular.</p><form onSubmit={create}><label>Nombre del evento<input required maxLength={120} value={name} onChange={e => setName(e.target.value)} placeholder="Por ejemplo: Bingo de amigos" /></label><button className="primary-button" disabled={busy}>Crear bingo gratis</button></form><p>La sala caduca tras 24 horas sin acciones del organizador. Durante una ronda, el plazo se amplía a 7 días.</p>{loggedIn ? <button className="secondary-button" onClick={() => { localStorage.removeItem(GUEST_KEY); localStorage.removeItem(UPGRADE_KEY); onAccount() }}>Ir a mi cuenta · hasta 50 cartones</button> : <button className="secondary-button" onClick={() => onLogin('login')}>Tengo una cuenta · hasta 50 cartones</button>}</section>
    </main>
  }
  return (
    <Organizer
      key={room.code + (access?.adminToken || '')}
      code={room.code}
      adminToken={access?.adminToken}
      isGuest={true}
      guestRoom={room}
      onFinished={state.reload}
      onActivity={state.reload}
      onNavigate={onNavigate}
      loggedIn={loggedIn}
      onLogin={onLogin}
      onAccount={onAccount}
      startAgain={startAgain}
      RecoveryAccessComponent={RecoveryAccess}
      AttachRoomComponent={AttachRoom}
    />
  )
}
export function RecoveryAccess({ code, adminToken, refresh }) {
  const [url, setUrl] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false)
  async function change(revoke = false) {
    if (!confirm(revoke ? '¿Revocar el enlace privado? Ya no permitirá recuperar el bingo.' : 'Se invalidará cualquier enlace privado anterior. ¿Generar uno nuevo?')) return
    setBusy(true); setMessage('')
    try {
      const recoveryToken = revoke ? null : randomSecret()
      await bingo.recovery(code, { adminToken, recoveryToken })
      setUrl(revoke ? '' : location.origin + '/mi-bingo#recuperar=' + code + '.' + recoveryToken)
      setMessage(revoke ? 'Enlace revocado. Tu acceso actual sigue vigente.' : 'Guarda este enlace en un lugar privado.'); await refresh()
    } catch (e) { setMessage(e.message) } finally { setBusy(false) }
  }
  return (
    <details className="bingo-accordion-card bingo-recovery">
      <summary>
        <span className="bingo-accordion-summary-content">
          <span className="bingo-accordion-icon" aria-hidden="true">🔑</span>
          <span>Guardar acceso de recuperación</span>
        </span>
        <span className="bingo-accordion-chevron" aria-hidden="true">▾</span>
      </summary>
      <div className="bingo-accordion-body">
        <p>Quien tenga este enlace podrá administrar tu bingo. No lo compartas con jugadores ni lo incluyas en su QR.</p>
        <p className="bingo-help-text">Es de un solo uso. Al recuperar desde otro dispositivo se cierran los accesos anteriores. Después podrás generar otro enlace.</p>
        <div className="bingo-btn-group">
          <button type="button" className="secondary-button" disabled={busy} onClick={() => change()}>
            Generar enlace privado
          </button>
          <button type="button" className="bingo-danger" disabled={busy} onClick={() => change(true)}>
            Revocar enlace
          </button>
        </div>
        {url && (
          <div className="bingo-recovery-field">
            <label>
              <span>Enlace privado</span>
              <input readOnly value={url} onFocus={e => e.target.select()} />
            </label>
            <div>
              <button
                type="button"
                className="secondary-button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(url)
                    setMessage('Enlace privado copiado')
                  } catch {
                    setMessage('Selecciona el enlace y cópialo manualmente')
                  }
                }}
              >
                Copiar enlace privado
              </button>
            </div>
          </div>
        )}
        {message && <p className="bingo-notice" role="status">{message}</p>}
      </div>
    </details>
  )
}
export function AttachRoom({ room, adminToken, onNavigate }) {
  const state = useBingo(() => bingo.spaces(), 'attach-' + room.code, false)
  const [selected, setSelected] = useState(''), [spaceName, setSpaceName] = useState('Mi espacio'), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const spaces = state.data?.workspaces.filter(w => w.role === 'OWNER') || []
  async function attach(event) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      localStorage.setItem('mi0_bingo_transfer', JSON.stringify({ code: room.code, workspaceId: selected || spaces[0]?.id }))
      await bingo.attach(room.code, { adminToken, workspaceId: selected || spaces[0]?.id })
      localStorage.removeItem('mi0_bingo_transfer')
      localStorage.removeItem(GUEST_KEY); localStorage.removeItem(UPGRADE_KEY)
      onNavigate('/mi-bingo/' + (selected || spaces[0].id))
    } catch (e) { if (e.name !== 'TypeError') localStorage.removeItem('mi0_bingo_transfer'); setError(e.message) } finally { setBusy(false) }
  }
  async function createSpace(event) {
    event.preventDefault(); setBusy(true); setError('')
    try { const result = await createWorkspace(spaceName); setSelected(result.workspace.id); await state.reload() } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  return (
    <div className="bingo-accordion-card">
      <div className="bingo-accordion-body">
        <h4>Guarda este bingo en tu cuenta</h4>
        <p>Conserva la sala y amplía a 50 cartones gratis.</p>
        {(error || state.error) && <p className="bingo-notice is-error" role="alert">{error || state.error}</p>}
        {!state.data ? (
          <p>Cargando espacios…</p>
        ) : spaces.length ? (
          <form onSubmit={attach}>
            <label>
              <span>Mi espacio</span>
              <select value={selected || spaces[0].id} onChange={e => setSelected(e.target.value)}>
                {spaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </label>
            <div className="bingo-btn-group">
              <button type="submit" className="primary-button" disabled={busy}>
                Vincular esta sala y ampliar a 50
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={createSpace}>
            <label>
              <span>Nombre de mi espacio</span>
              <input required maxLength={120} value={spaceName} onChange={e => setSpaceName(e.target.value)} />
            </label>
            <div className="bingo-btn-group">
              <button type="submit" className="secondary-button" disabled={busy}>
                Crear mi espacio
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
