import { useState } from 'react'
import { useCitaMutation } from './useCitaData'
export function CitaSettings({ workspaceId, clinic, workspaceName, reload }) {
  const [name, setName] = useState(clinic?.name || workspaceName)
  const [timezone, setTimezone] = useState(clinic?.timezone || 'America/Lima')
  const [requireDni, setRequireDni] = useState(clinic?.requireDni || false)
  const [expirationHours, setExpirationHours] = useState(clinic?.expirationHours || '')
  const [message, setMessage] = useState('')
  const { mutate, busy, error } = useCitaMutation()
  async function save(event) {
    event.preventDefault(); setMessage('')
    const result = await mutate('saveSettings', workspaceId, { name, timezone, requireDni, expirationHours: expirationHours ? Number(expirationHours) : null })
    if (result) { setMessage('Configuración guardada. Ya puedes agregar profesionales y compartir tu QR.'); reload() }
  }
  return <><div><h2>Configuración del consultorio</h2><p>Los ajustes se aplican a nuevas solicitudes.</p></div>
    <form className="cita-form" onSubmit={save}>
      <label>Nombre del consultorio<input required maxLength="120" value={name} onChange={e => setName(e.target.value)} /></label>
      <label>Zona horaria<select value={timezone} onChange={e => setTimezone(e.target.value)}>{[...new Set(['America/Lima', 'America/Bogota', 'America/Santiago', 'America/Mexico_City', timezone])].map(zone => <option key={zone}>{zone}</option>)}</select></label>
      <fieldset><legend>Confirmación de solicitudes</legend><label>Modo de confirmación<select value={expirationHours} onChange={e => setExpirationHours(e.target.value)}><option value="">Manual</option>{[2, 6, 12, 24].map(hours => <option key={hours} value={hours}>Vencimiento automático: {hours} horas</option>)}</select></label><p>El personal confirma o cancela cada solicitud. Las pendientes vencen al comenzar la cita o al cumplirse el plazo, lo que ocurra primero, y liberan el horario.</p></fieldset>
      <fieldset><legend>Datos del paciente</legend><label className="cita-toggle"><input type="checkbox" role="switch" checked={requireDni} onChange={e => setRequireDni(e.target.checked)} /><span>Solicitar DNI al reservar</span></label><p>Actívalo si necesitas identificar al paciente mediante su DNI. Será obligatorio y deberá tener ocho dígitos.</p></fieldset>
      {error && <p role="alert" className="cita-error">{error}</p>}{message && <p role="status" className="cita-notice">{message}</p>}
      <button disabled={busy}>{busy ? 'Guardando…' : clinic ? 'Guardar configuración' : 'Configurar Mi Cita'}</button>
    </form></>
}
