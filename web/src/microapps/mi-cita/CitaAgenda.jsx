import { useEffect, useRef, useState } from 'react'
import { useCitaResource, useCitaMutation } from './useCitaData'
import { CitaStatus } from './CitaUi'
import { dateLabel } from './citaUtils'
export function CitaAgenda({ workspaceId, clinic, professionals, pending, today }) {
  const [date, setDate] = useState(today)
  const [professionalId, setProfessionalId] = useState('')
  const [cursor, setCursor] = useState('')
  const [selected, setSelected] = useState(null)
  const [notice, setNotice] = useState('')
  const path = '/citas/workspace/' + workspaceId + '/appointments?' + new URLSearchParams({ ...(pending ? { pending: 'true' } : { date }), ...(professionalId ? { professionalId } : {}), ...(cursor ? { cursor } : {}) })
  const state = useCitaResource(path, 15000)
  function filter(setter, value) { setter(value); setCursor(''); setSelected(null) }
  return <><div className="cita-heading"><div><h2>{pending ? 'Solicitudes pendientes' : 'Agenda diaria'}</h2><p>{pending ? 'Confirma o cancela las solicitudes antes de su vencimiento.' : 'Tus citas, ordenadas por horario.'}</p></div><button className="cita-secondary" onClick={state.reload}>Actualizar</button></div>
    <div className="cita-filters">{!pending && <label>Fecha<input type="date" required value={date} onChange={e => { if (e.target.value) filter(setDate, e.target.value) }} /></label>}<label>Profesional<select value={professionalId} onChange={e => filter(setProfessionalId, e.target.value)}><option value="">Todos los profesionales</option>{professionals.map(p => <option key={p.id} value={p.id}>{p.name}{p.active ? '' : ' (inactivo)'}</option>)}</select></label></div>
    {notice && <p role="status" className="cita-notice">{notice}</p>}
    <small>Horarios del consultorio · {clinic.timezone}</small>
    {state.error && <p className="cita-error" role="alert">{state.error} <button className="cita-secondary" onClick={state.reload}>Reintentar</button></p>}
    {!state.data ? !state.error && <p role="status">Cargando citas…</p> : !state.data.appointments.length ? <div className="cita-empty"><h3>{pending ? 'No hay solicitudes pendientes' : 'No hay citas para esta fecha'}</h3><p>{pending ? 'Las nuevas solicitudes aparecerán aquí.' : 'Prueba otra fecha o cambia el filtro de profesional.'}</p></div> : <>
      <table className="cita-table"><thead><tr><th>Horario</th><th>Paciente</th><th>Profesional</th><th>Estado</th><th>Gestión</th></tr></thead><tbody>{state.data.appointments.map(a => <tr key={a.id}><td>{dateLabel(a.startsAt, clinic.timezone, pending)}</td><td>{a.patientName}</td><td>{a.professional.name}</td><td><CitaStatus status={a.status} /></td><td><button className="cita-secondary" onClick={() => setSelected(a)}>Ver detalles</button></td></tr>)}</tbody></table>
      <div className="cita-appointment-cards">{state.data.appointments.map(a => <article className="cita-card" key={a.id}><div className="cita-heading"><strong>{dateLabel(a.startsAt, clinic.timezone, pending)}</strong><CitaStatus status={a.status} /></div><h3>{a.patientName}</h3><p>{a.professional.name} · {a.professional.specialty}</p><button className="cita-secondary" onClick={() => setSelected(a)}>Ver detalles</button></article>)}</div>
    </>}
    {(cursor || state.data?.nextCursor) && <div className="cita-actions">{cursor && <button className="cita-secondary" onClick={() => setCursor('')}>Volver al inicio</button>}{state.data?.nextCursor && <button className="cita-secondary" onClick={() => setCursor(state.data.nextCursor)}>Ver siguientes citas</button>}</div>}
    {selected && <AppointmentDetails key={selected.id} appointment={state.data?.appointments.find(a => a.id === selected.id) || selected} clinic={clinic} workspaceId={workspaceId} close={() => setSelected(null)} reload={state.reload} onChanged={status => { setSelected(null); setNotice(status === 'CONFIRMED' ? 'Cita confirmada.' : 'Cita cancelada. El horario quedó disponible.') }} />}
  </>
}
function AppointmentDetails({ appointment: a, clinic, workspaceId, close, reload, onChanged }) {
  const { mutate, busy, error } = useCitaMutation()
  const [cancelConfirm, setCancelConfirm] = useState(false)
  const dialogRef = useRef(null)
  useEffect(() => { const dialog = dialogRef.current; if (dialog && !dialog.open) dialog.showModal() }, [])
  const startsFuture = new Date(a.startsAt) > new Date()
  const pendingLive = a.status === 'PENDING' && new Date(a.expiresAt) > new Date()
  const canConfirm = pendingLive && startsFuture
  const canCancel = (pendingLive || a.status === 'CONFIRMED') && startsFuture
  const text = `Hola ${a.patientName}, te contactamos de ${clinic.name} por tu solicitud con ${a.professional.name} para el ${dateLabel(a.startsAt, clinic.timezone)}. Estamos coordinando la confirmación de tu cita.`
  async function change(status) {
    const result = await mutate('updateStatus', workspaceId, a.id, status)
    reload()
    if (result) onChanged(status)
  }
  return <dialog ref={dialogRef} className="cita-details-dialog" aria-label="Detalles de la cita" onCancel={event => { if (busy) event.preventDefault(); else close() }}><section className="cita-card cita-details"><div className="cita-heading"><h3>Detalles de la cita</h3><button className="cita-secondary" onClick={close} disabled={busy}>Cerrar detalles</button></div><CitaStatus status={a.status} />
    <dl><dt>Paciente</dt><dd>{a.patientName}</dd><dt>Teléfono</dt><dd>{a.phone}</dd><dt>DNI</dt><dd>{a.dni || 'No solicitado'}</dd><dt>Profesional</dt><dd>{a.professional.name}</dd><dt>Fecha y hora</dt><dd>{dateLabel(a.startsAt, clinic.timezone)}</dd>{a.status === 'PENDING' && <><dt>Vence</dt><dd>{dateLabel(a.expiresAt, clinic.timezone)}</dd></>}</dl>
    <a className="cita-link-button cita-secondary" href={'https://wa.me/' + a.phone.replace(/\D/g, '') + '?text=' + encodeURIComponent(text)} target="_blank" rel="noreferrer">Contactar por WhatsApp ↗</a>
    {error && <p className="cita-error" role="alert">{error}</p>}
    <div className="cita-actions">{canConfirm && <button disabled={busy} onClick={() => change('CONFIRMED')}>Confirmar cita</button>}{canCancel && !cancelConfirm && <button className="cita-danger" disabled={busy} onClick={() => setCancelConfirm(true)}>Cancelar cita</button>}</div>
    {cancelConfirm && <div className="cita-cancel-confirm"><p>¿Cancelar la cita de {a.patientName}? El horario quedará disponible.</p><div className="cita-actions"><button className="cita-danger" disabled={busy} onClick={() => change('CANCELLED')}>Sí, cancelar cita</button><button className="cita-secondary" disabled={busy} onClick={() => setCancelConfirm(false)}>Volver</button></div></div>}
  </section></dialog>
}
