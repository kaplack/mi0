import { useState } from 'react'
import { api } from '../../services/api'
import { useTurnoData } from './useTurnoData'

export function TurnoOperators({ workspaceId, queue }) {
  const base = '/turnos/workspace/' + workspaceId
  const state = useTurnoData(base + '/operators')
  const [email, setEmail] = useState('')
  const [counter, setCounter] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [link, setLink] = useState('')
  const [removeId, setRemoveId] = useState('')
  const normalizedEmail = email.trim().toLowerCase()
  const available = state.data ? queue.counterNames.map((label, index) => ({ label, number: index + 1 })).filter(window =>
    !state.data.operators.some(operator => operator.counter === window.number && operator.user.email.toLowerCase() !== normalizedEmail) &&
    !state.data.invitations.some(invite => invite.counter === window.number && invite.email !== normalizedEmail && new Date(invite.expiresAt) > new Date())
  ) : []
  const selectedCounter = available.some(window => window.number === counter) ? counter : available[0]?.number
  async function assign(address = email, windowNumber = selectedCounter) {
    setBusy(true); setError(''); setNotice(''); setLink('')
    try {
      const result = await api(base + '/operators', { method: 'POST', body: JSON.stringify({ email: address, counter: windowNumber }) })
      if (result.kind === 'INVITED') {
        setLink(location.origin + '/mi-turno/invitacion/' + result.token)
        setNotice('Invitación creada. Comparte el enlace con ' + address + '. Vence en 7 días.')
      } else setNotice('Ventanilla asignada. El operador ya pertenece al negocio.')
      setEmail(''); await state.reload()
    } catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }
  async function remove(path) {
    setBusy(true); setError(''); setNotice(''); setLink('')
    try {
      await api(base + path, { method: 'DELETE' })
      setRemoveId(''); setNotice('Acceso actualizado.'); await state.reload()
    } catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(link); setNotice('Enlace copiado.') }
    catch { setNotice('Selecciona el enlace y cópialo manualmente.') }
  }
  return <>
    <h2>Operadores y ventanillas</h2>
    <p className="turno-setting-hint">Asigna una ventanilla por correo. Si la persona aún no pertenece al negocio, recibirá acceso al aceptar el enlace de invitación con ese correo.</p>
    <form className="turno-form" onSubmit={event => { event.preventDefault(); assign() }}>
      <div className="turno-window-fields">
        <label>Correo del operador<input type="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} /></label>
        <label>Ventanilla asignada<select disabled={busy || !available.length} value={selectedCounter || ''} onChange={event => setCounter(Number(event.target.value))}>{!available.length && <option value="">Sin ventanillas disponibles</option>}{available.map(window => <option key={window.number} value={window.number}>{window.label}</option>)}</select></label>
      </div>
      <button disabled={busy || !selectedCounter}>{busy ? 'Guardando…' : 'Asignar o invitar operador'}</button>
    </form>
    {(error || state.error) && <p className="turno-error" role="alert">{error || state.error}</p>}
    {notice && <p role="status">{notice}</p>}
    {link && <div className="turno-invite-share">
      <label>Enlace para compartir<input readOnly value={link} onFocus={event => event.target.select()} /></label>
      <button className="turno-secondary" onClick={copy}>Copiar enlace</button>
      <p className="turno-setting-hint">No se envía un correo automáticamente. Comparte este enlace solo con el operador invitado.</p>
    </div>}
    <h3>Operadores asignados</h3>
    {!state.data ? <p>Cargando operadores…</p> : <>
      {state.data.operators.length === 0 && <p className="turno-setting-hint">Todavía no hay operadores asignados.</p>}
      {state.data.operators.map(operator => <div className="turno-operator-row" key={operator.userId}>
        <div><strong>{operator.user.name} {operator.user.lastName}</strong><span>{operator.user.email}</span><small>{queue.counterNames[operator.counter - 1]}</small></div>
        <div className="turno-row-actions">
          <button className="turno-secondary" disabled={busy} onClick={() => { setEmail(operator.user.email); setCounter(operator.counter); setNotice('Selecciona la nueva ventanilla y guarda la asignación.') }}>Reasignar</button>
          {removeId === operator.userId ? <><button className="turno-secondary" disabled={busy} onClick={() => remove('/operators/' + operator.userId)}>Confirmar quitar acceso</button><button className="turno-secondary" disabled={busy} onClick={() => setRemoveId('')}>Cancelar</button></>
            : <button className="turno-secondary" disabled={busy} onClick={() => setRemoveId(operator.userId)}>Quitar acceso</button>}
        </div>
      </div>)}
      <h3>Invitaciones pendientes</h3>
      {state.data.invitations.length === 0 && <p className="turno-setting-hint">No hay invitaciones pendientes.</p>}
      {state.data.invitations.map(invite => <div className="turno-operator-row" key={invite.id}>
        <div><strong>{invite.email}</strong><span>{queue.counterNames[invite.counter - 1]}</span><small>{new Date(invite.expiresAt) <= new Date() ? 'Vencida' : 'Pendiente de aceptación'}</small></div>
        <div className="turno-row-actions"><button className="turno-secondary" disabled={busy} onClick={() => assign(invite.email, invite.counter)}>Generar nuevo enlace</button><button className="turno-secondary" disabled={busy} onClick={() => remove('/invitations/' + invite.id)}>Cancelar invitación</button></div>
      </div>)}
    </>}
  </>
}
