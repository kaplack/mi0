import { useState } from 'react'
import { api } from '../../services/api'

export function TurnoOperation({ workspaceId, queue, tickets, canChooseCounter, assignedCounter, reload }) {
  const storageKey = 'mi0_ventanilla_' + workspaceId
  const [selected, setSelected] = useState(() => Number(localStorage.getItem(storageKey)) || 1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const counter = canChooseCounter ? (Number.isInteger(selected) && selected >= 1 && selected <= queue.counterNames.length ? selected : 1) : assignedCounter
  const current = tickets.find(ticket => ticket.status === 'CALLED' && ticket.counter === counter)
  const waiting = tickets.filter(ticket => ticket.status === 'WAITING')
  const called = tickets.filter(ticket => ticket.status === 'CALLED')
  async function act(action, body = {}) {
    setBusy(true); setError(''); setNotice('')
    try {
      const result = await api('/turnos/workspace/' + workspaceId + '/' + action, { method: 'POST', body: JSON.stringify(body) })
      if (action === 'next' && !result.ticket) setNotice('No hay personas esperando.')
      await reload()
    } catch (failure) { setError(failure.message); await reload() } finally { setBusy(false) }
  }
  if (!canChooseCounter && !assignedCounter) return <><h2>Operación</h2><p>Necesitas una ventanilla asignada para atender. Pide al administrador que la asigne a tu correo.</p></>
  return <>
    <div className="turno-operation-heading"><div><h2>Atención en ventanilla</h2><p>Gestiona el turno actual y llama al siguiente.</p></div>
      {canChooseCounter ? <label className="turno-field">Tu ventanilla<select disabled={busy} value={counter} onChange={event => {
        const value = Number(event.target.value); setSelected(value); localStorage.setItem(storageKey, value)
      }}>{queue.counterNames.map((label, index) => <option key={index} value={index + 1}>{label}</option>)}</select></label> : <div className="turno-assigned-window"><span>Tu ventanilla</span><strong>{queue.counterNames[counter - 1]}</strong></div>}
    </div>
    <div className="turno-summary"><span><strong>{waiting.length}</strong> en espera</span><span><strong>{called.length}</strong> ventanillas en atención</span></div>
    {error && <p role="alert" className="turno-error">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    <div className="turno-operation-columns">
      <section className="turno-current" aria-label="Cliente en atención">
        <span className="turno-current-window">{queue.counterNames[counter - 1]}</span>
        {current ? <>
          <p>En atención</p><div className="turno-number">{String(current.number).padStart(3, '0')}</div>
          <h3>{current.name}</h3>
          {current.documentNumber && <p className="turno-document">{current.documentType === 'DNI' ? 'DNI' : 'Carnet de extranjería'}: {current.documentNumber}</p>}
          <div className="turno-actions">
            <button disabled={busy} onClick={() => act('finish', { ticketId: current.id, action: 'SERVED' })}>Finalizar atención</button>
            <button className="turno-secondary" disabled={busy} onClick={() => act('finish', { ticketId: current.id, action: 'ABSENT' })}>Marcar ausente</button>
          </div>
        </> : <><p>Tu ventanilla está libre.</p><div className="turno-empty-number" aria-hidden="true">—</div><button disabled={busy || !waiting.length} onClick={() => act('next', { counter })}>Llamar siguiente</button></>}
      </section>
      <section className="turno-queue"><h3>Cola de espera <span>{waiting.length}</span></h3>
        <div className="turno-waiting">{waiting.length ? waiting.map(ticket => <p key={ticket.id}><strong>{String(ticket.number).padStart(3, '0')}</strong><span>{ticket.name}</span></p>) : <p className="turno-empty-queue">No hay turnos pendientes.</p>}</div>
      </section>
    </div>
    {called.length > 0 && <details className="turno-other-windows"><summary>Ver ventanillas en atención ({called.length})</summary>
      <div className="turno-calls">{called.map(ticket => <div key={ticket.id}><b>{String(ticket.number).padStart(3, '0')}</b><span className="turno-customer">{ticket.name}</span><span>{queue.counterNames[ticket.counter - 1]}</span></div>)}</div>
    </details>}
  </>
}
