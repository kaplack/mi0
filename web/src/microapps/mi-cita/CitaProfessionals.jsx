import { useState } from 'react'
import { useCitaMutation, useCitaResource } from './useCitaData'
import { weekdays, minuteLabel, timeMinute } from './citaUtils'
export function CitaProfessionals({ workspaceId, clinic, professionals, canConfigure, today, reload }) {
  const [editing, setEditing] = useState(null)
  const [notice, setNotice] = useState('')
  return <><div className="cita-heading"><div><h2>Profesionales</h2><p>{canConfigure ? 'Organiza sus días, horarios y duración de cita.' : 'Consulta los horarios disponibles de cada profesional.'}</p></div>{canConfigure && editing === null && <button onClick={() => { setNotice(''); setEditing('new') }}>Agregar profesional</button>}</div>
    {notice && <p role="status" className="cita-notice">{notice}</p>}
    {editing !== null && canConfigure ? <ProfessionalForm key={editing} workspaceId={workspaceId} professional={professionals.find(p => p.id === editing)} onCancel={() => setEditing(null)} onSaved={result => { setEditing(null); setNotice(result.futureAppointments ? `Cambios guardados. Hay ${result.futureAppointments} citas futuras que conservan su horario. Revísalas en Agenda si es necesario.` : 'Profesional guardado.'); reload() }} />
      : professionals.length ? <div className="cita-professionals">{professionals.map(professional => <article key={professional.id} className="cita-card"><div className="cita-heading"><div><h3>{professional.name}</h3><p>{professional.specialty} · {professional.durationMinutes} min</p></div><span className="cita-tag">{professional.active ? 'Activo' : 'Inactivo'}</span></div>
        <ul className="cita-schedule-summary">{professional.schedules.map(row => <li key={row.id || row.weekday + '-' + row.startMinute}>{weekdays[row.weekday]} <strong>{minuteLabel(row.startMinute)}–{minuteLabel(row.endMinute)}</strong></li>)}</ul>
        {!professional.schedules.length && <p>No tiene horarios configurados.</p>}
        {canConfigure ? <button className="cita-secondary" onClick={() => { setNotice(''); setEditing(professional.id) }}>Editar {professional.name}</button> : professional.active && <ProfessionalAvailability code={clinic.code} professional={professional} today={today} />}
      </article>)}</div> : <div className="cita-empty"><h3>Aún no hay profesionales</h3><p>{canConfigure ? 'Agrega el primer profesional y sus horarios para recibir solicitudes.' : 'Pide al administrador que agregue profesionales y horarios.'}</p></div>}
  </>
}
function ProfessionalAvailability({ code, professional, today }) {
  const [date, setDate] = useState(today)
  const state = useCitaResource('/citas/public/' + code + '/availability?professionalId=' + professional.id + '&date=' + date)
  return <div className="cita-availability"><label>Fecha para {professional.name}<input type="date" required min={today} value={date} onChange={e => { if (e.target.value) setDate(e.target.value) }} /></label>{state.error ? <p className="cita-error" role="alert">{state.error}</p> : !state.data ? <p role="status">Cargando disponibilidad…</p> : <p>{state.data.slots.length ? 'Disponible: ' + state.data.slots.map(slot => slot.label).join(', ') : 'Sin horarios disponibles para este día.'}</p>}</div>
}
function ProfessionalForm({ workspaceId, professional, onSaved, onCancel }) {
  const [name, setName] = useState(professional?.name || '')
  const [specialty, setSpecialty] = useState(professional?.specialty || '')
  const [durationMinutes, setDuration] = useState(professional?.durationMinutes || 30)
  const [active, setActive] = useState(professional?.active ?? true)
  const [schedules, setSchedules] = useState(professional?.schedules || [{ weekday: 1, startMinute: 540, endMinute: 780 }])
  const { mutate, busy, error } = useCitaMutation()
  function updateRow(index, field, value) { setSchedules(rows => rows.map((row, i) => i === index ? { ...row, [field]: value } : row)) }
  async function save(event) {
    event.preventDefault()
    const result = await mutate('saveProfessional', workspaceId, professional?.id, { name, specialty, durationMinutes: Number(durationMinutes), active, schedules: schedules.map(({ weekday, startMinute, endMinute }) => ({ weekday, startMinute, endMinute })) })
    if (result) onSaved(result)
  }
  return <form className="cita-form" onSubmit={save}><h3>{professional ? 'Editar profesional' : 'Nuevo profesional'}</h3>
    <label>Nombre del profesional<input required maxLength="120" value={name} onChange={e => setName(e.target.value)} /></label>
    <label>Especialidad<input required maxLength="120" value={specialty} onChange={e => setSpecialty(e.target.value)} /></label>
    <label>Duración de la cita (minutos)<input type="number" required min="10" max="240" value={durationMinutes} onChange={e => setDuration(e.target.value)} /></label>
    <label className="cita-toggle"><input type="checkbox" role="switch" checked={active} onChange={e => setActive(e.target.checked)} /><span>Profesional activo para nuevas reservas</span></label>
    <fieldset><legend>Días y horarios de atención</legend><p>Agrega bloques semanales. Puedes separar mañana y tarde. No se admiten horarios que se solapen.</p>
      {schedules.map((row, i) => <div className="cita-schedule-row" key={i}><label>Día {i + 1}<select value={row.weekday} onChange={e => updateRow(i, 'weekday', Number(e.target.value))}>{weekdays.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label><label>Desde {i + 1}<input type="time" required value={minuteLabel(row.startMinute)} onChange={e => updateRow(i, 'startMinute', timeMinute(e.target.value))} /></label><label>Hasta {i + 1}<input type="time" required value={row.endMinute === 1440 ? '23:59' : minuteLabel(row.endMinute)} onChange={e => updateRow(i, 'endMinute', timeMinute(e.target.value))} /></label><button type="button" className="cita-secondary" aria-label={'Quitar bloque ' + (i + 1)} onClick={() => setSchedules(rows => rows.filter((_, index) => index !== i))}>Quitar</button></div>)}
      <button type="button" className="cita-secondary" disabled={schedules.length >= 28} onClick={() => setSchedules(rows => [...rows, { weekday: rows.length ? (rows.at(-1).weekday + 1) % 7 : 1, startMinute: 540, endMinute: 780 }])}>Agregar bloque de atención</button>
    </fieldset>
    {professional && <p className="cita-notice">Los cambios de horario y la desactivación conservan las citas existentes. Revisa la agenda antes de avisar a tus pacientes.</p>}
    {error && <p role="alert" className="cita-error">{error}</p>}
    <div className="cita-actions"><button disabled={busy}>{busy ? 'Guardando…' : 'Guardar profesional'}</button><button type="button" className="cita-secondary" disabled={busy} onClick={onCancel}>Cancelar edición</button></div>
  </form>
}
