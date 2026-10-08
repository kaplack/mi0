import { useState } from 'react'
import { api } from '../../services/api'

export function TurnoSettings({ workspaceId, queue, onSaved }) {
  const [name, setName] = useState(queue?.name || '')
  const [documentMode, setDocumentMode] = useState(queue?.documentMode && queue.documentMode !== 'NONE' ? 'REQUIRED' : 'NONE')
  const [counterNames, setCounterNames] = useState(queue?.counterNames || ['Ventanilla 1'])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  async function save(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('')
    try {
      const result = await api(queue ? '/turnos/workspace/' + workspaceId + '/settings' : '/turnos/setup', {
        method: queue ? 'PATCH' : 'POST', body: JSON.stringify({ workspaceId, name, documentMode, counterNames }),
      })
      onSaved(result.queue); setNotice('Configuración guardada.')
    } catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }
  function resize(count) {
    if (!Number.isInteger(count) || count < 1 || count > 99) return
    setCounterNames(previous => Array.from({ length: count }, (_, index) => previous[index] || 'Ventanilla ' + (index + 1)))
  }
  return <>
    <h2>Configuración del negocio</h2>
    <form className="turno-form" onSubmit={save}>
      <label>Nombre del negocio<input required maxLength={120} value={name} onChange={event => setName(event.target.value)} /></label>
      <div className="turno-client-settings" role="group" aria-labelledby="turno-client-settings-label">
        <span id="turno-client-settings-label" className="turno-setting-label">Datos del cliente</span>
        <label className="turno-checkbox"><input type="checkbox" aria-describedby="turno-document-hint" checked={documentMode === 'REQUIRED'} onChange={event => setDocumentMode(event.target.checked ? 'REQUIRED' : 'NONE')} />Solicitar documento de identidad</label>
        <p id="turno-document-hint" className="turno-setting-hint">{documentMode === 'REQUIRED' ? 'Nombre y documento obligatorios. Admite DNI o carnet de extranjería; el documento solo lo ve el personal autorizado.' : 'El nombre del cliente es obligatorio siempre.'}</p>
      </div>
      <div className="turno-client-settings" role="group" aria-labelledby="turno-windows-label"><span id="turno-windows-label" className="turno-setting-label">Ventanillas de atención</span>
        <label>Cantidad de ventanillas<input type="number" min="1" max="99" required value={counterNames.length} onChange={event => resize(Number(event.target.value))} /></label>
        <div className="turno-window-fields">{counterNames.map((label, index) => <label key={index}>Ventanilla {index + 1}<input required maxLength={60} value={label} onChange={event => setCounterNames(previous => previous.map((value, position) => position === index ? event.target.value : value))} /></label>)}</div>
      </div>
      {error && <p role="alert" className="turno-error">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <button disabled={busy}>{busy ? 'Guardando…' : queue ? 'Guardar configuración' : 'Crear negocio y cola'}</button>
    </form>
  </>
}
