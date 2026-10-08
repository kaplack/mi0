import { useState } from 'react'
import { api } from '../../services/api'
import { useTurnoData } from './useTurnoData'

export function TurnoClient({ code }) {
  const storageKey = 'mi0_turno_' + code
  const [key, setKey] = useState(() => localStorage.getItem(storageKey) || '')
  const [name, setName] = useState('')
  const [documentType, setDocumentType] = useState('DNI')
  const [documentNumber, setDocumentNumber] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const base = '/turnos/public/' + encodeURIComponent(code)
  const queue = useTurnoData(base)
  const mine = useTurnoData(key ? base + '/mine?key=' + encodeURIComponent(key) : null)
  async function join(event) {
    event.preventDefault()
    setBusy(true); setError('')
    try {
      const clientKey = key || Array.from(crypto.getRandomValues(new Uint8Array(16)), value => value.toString(16).padStart(2, '0')).join('')
      localStorage.setItem(storageKey, clientKey)
      await api(base + '/join', { method: 'POST', body: JSON.stringify({ name, key: clientKey, documentType, documentNumber }) })
      setKey(clientKey)
      setName(''); setDocumentNumber('')
      // The new key mounts its poll; an existing key can refresh immediately.
      if (key) await mine.reload()
      await queue.reload()
    } catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }
  const ticket = mine.data?.ticket
  const waitingForMine = key && !mine.data && !mine.error
  return <section className="turno-panel">
    <h1>{queue.data?.name || 'Mi Turno'}</h1>
    {(error || queue.error || mine.error) && <p role="alert" className="turno-error">{error || queue.error || mine.error}</p>}
    {!queue.data || waitingForMine ? <p>Cargando tu turno…</p> : ticket ? <>
      <p role="status">{ticket.status === 'CALLED' ? '¡Es tu turno!' : 'Tu turno es'}</p>
      <div className="turno-number">{String(ticket.number).padStart(3, '0')}</div>
      <h2>{ticket.status === 'CALLED' ? 'Dirígete a ' + (queue.data.counterNames[ticket.counter - 1] || 'Ventanilla ' + ticket.counter) : 'Personas delante: ' + mine.data.ahead}</h2>
      <p>Esta página se actualiza automáticamente.</p>
    </> : <>
      {mine.data?.lastStatus === 'EXPIRED' && <p role="status">Tu turno venció al cerrar la jornada. Toma un nuevo turno.</p>}
      {mine.data?.lastStatus === 'SERVED' && <p role="status">Tu atención ha finalizado. Puedes tomar otro turno si lo necesitas.</p>}
      {mine.data?.lastStatus === 'ABSENT' && <p role="status">Tu turno fue marcado como ausente. Puedes tomar un nuevo turno.</p>}
      <form className="turno-form" onSubmit={join}>
        <label>Nombre (obligatorio)<input required maxLength={80} autoComplete="name" value={name} onChange={event => setName(event.target.value)} /></label>
        {queue.data.documentMode !== 'NONE' && <fieldset>
          <legend>Documento de identidad (obligatorio)</legend>
          <label>Tipo de documento<select value={documentType} onChange={event => { setDocumentType(event.target.value); setDocumentNumber('') }}>
            <option value="DNI">DNI</option><option value="CE">Carnet de extranjería</option>
          </select></label>
          <label>Número de documento<input required maxLength={documentType === 'DNI' ? 8 : 20} inputMode={documentType === 'DNI' ? 'numeric' : 'text'} pattern={documentType === 'DNI' ? '[0-9]{8}' : '[A-Za-z0-9]{3,20}'} value={documentNumber} onChange={event => setDocumentNumber(event.target.value)} /></label>
          <p>El negocio solicita este dato para identificarte durante la atención. No aparece en el monitor público.</p>
        </fieldset>}
        <button disabled={busy || !name.trim()}>{busy ? 'Tomando turno…' : 'Tomar mi turno'}</button>
      </form>
      <p>Tu turno es válido hasta que el negocio cierre la jornada.</p>
    </>}
  </section>
}
