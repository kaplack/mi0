import { useRef, useState } from 'react'
import { useCitaResource, useCitaMutation } from './useCitaData'
import { CitaStatus } from './CitaUi'
import { dateLabel } from './citaUtils'
export function CitaPublic({ code }) {
  const state = useCitaResource('/citas/public/' + code)
  const [receipt, setReceipt] = useState(null)
  if (receipt) return <CitaReceipt code={code} submitted={receipt} clinic={state.data} onNew={() => { setReceipt(null); state.reload() }} />
  if (!state.data) return <section className="cita-panel"><h1>Mi Cita</h1>{state.error ? <><p className="cita-error" role="alert">{state.error}</p><button onClick={state.reload}>Reintentar</button></> : <p role="status">Cargando consultorio…</p>}</section>
  return <BookingForm key={code} code={code} clinic={state.data} onReceipt={setReceipt} reloadClinic={state.reload} />
}
function BookingForm({ code, clinic, onReceipt, reloadClinic }) {
  const [professionalId, setProfessional] = useState('')
  const [date, setDate] = useState(clinic.today)
  const [chosen, setChosen] = useState(null)
  const [patientName, setName] = useState('')
  const [phone, setPhone] = useState('+51 ')
  const [dni, setDni] = useState('')
  const [website, setWebsite] = useState('')
  const submission = useRef(null)
  const { mutate, busy, error } = useCitaMutation()
  const availability = useCitaResource(professionalId && date ? '/citas/public/' + code + '/availability?' + new URLSearchParams({ professionalId, date }) : null, 30000)
  const professional = clinic.professionals.find(p => p.id === professionalId)
  const horizon = new Date(Date.parse(clinic.today + 'T12:00:00Z') + 180 * 86400000).toISOString().slice(0, 10)
  const currentChosen = chosen && availability.data?.slots.find(slot => slot.startsAt === chosen.startsAt)
  async function submit(event) {
    event.preventDefault()
    if (!currentChosen || busy) return
    const body = { professionalId, startsAt: currentChosen.startsAt, patientName, phone, ...(clinic.requireDni ? { dni } : {}), website }
    const fingerprint = JSON.stringify(body)
    if (submission.current?.fingerprint !== fingerprint) submission.current = { fingerprint, key: crypto.randomUUID() }
    const result = await mutate('request', code, { ...body, requestKey: submission.current.key })
    if (result) onReceipt({ ...result.receipt, requestKey: submission.current.key, professionalName: professional.name })
    else { availability.reload(); reloadClinic() }
  }
  return <section className="cita-panel cita-booking"><span className="cita-kicker">MI CITA</span><h1>{clinic.name}</h1><p>Solicita tu cita en pocos pasos. El consultorio la confirmará contigo.</p>
    {!clinic.professionals.length ? <div className="cita-empty"><h2>Aún no hay profesionales disponibles</h2><p>Contacta al consultorio para conocer sus próximos horarios de atención.</p></div> : <form className="cita-form" onSubmit={submit}>
      <fieldset disabled={busy}><legend>1. Elige profesional y horario</legend><label>Profesional<select required value={professionalId} onChange={e => { setProfessional(e.target.value); setChosen(null) }}><option value="">Selecciona un profesional</option>{clinic.professionals.map(p => <option key={p.id} value={p.id}>{p.name} · {p.specialty}</option>)}</select></label>
        {professional && <><label>Fecha<input type="date" required min={clinic.today} max={horizon} value={date} onChange={e => { setDate(e.target.value); setChosen(null) }} /></label><small>{professional.durationMinutes} minutos por cita · {clinic.timezone}</small>
          {availability.error && <p role="alert" className="cita-error">{availability.error} <button type="button" className="cita-secondary" onClick={availability.reload}>Reintentar</button></p>}
          {!availability.data ? !availability.error && <p role="status">Buscando horarios disponibles…</p> : !availability.data.slots.length ? <p className="cita-empty" role="status">No hay horarios disponibles este día. Prueba otra fecha.</p> : <div className="cita-slots" role="group" aria-label="Horarios disponibles">{availability.data.slots.map(slot => <button type="button" key={slot.startsAt} className={currentChosen?.startsAt === slot.startsAt ? 'cita-slot is-selected' : 'cita-slot cita-secondary'} aria-pressed={currentChosen?.startsAt === slot.startsAt} onClick={() => setChosen(slot)}>{slot.label}</button>)}</div>}
          {chosen && availability.data && !currentChosen && <p className="cita-error" role="alert">Este horario ya no está disponible. Selecciona otro.</p>}
        </>}
      </fieldset>
      {currentChosen && <fieldset disabled={busy}><legend>2. Tus datos</legend><p className="cita-notice">{professional.name} · {dateLabel(currentChosen.startsAt, clinic.timezone)}</p>
        <label>Nombre completo<input required autoComplete="name" maxLength="120" value={patientName} onChange={e => setName(e.target.value)} /></label>
        <label>Teléfono con código de país<input type="tel" required autoComplete="tel" maxLength="30" placeholder="+51 987 654 321" value={phone} onChange={e => setPhone(e.target.value)} /></label>
        {clinic.requireDni && <label>DNI<input required inputMode="numeric" pattern="[0-9]{8}" minLength="8" maxLength="8" title="Ingresa ocho dígitos" value={dni} onChange={e => setDni(e.target.value.replace(/\D/g, ''))} /></label>}
        <div className="cita-honeypot" aria-hidden="true"><label>Sitio web<input tabIndex="-1" autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} /></label></div>
        <p className="cita-privacy">{clinic.name} usará tu nombre y teléfono{clinic.requireDni ? ' y DNI' : ''} para gestionar y confirmar esta cita. Solo el personal autorizado del consultorio puede consultarlos.</p>
      </fieldset>}
      {error && <p className="cita-error" role="alert">{error}</p>}
      <button disabled={busy || !currentChosen}>{busy ? 'Enviando solicitud…' : 'Solicitar cita'}</button>
    </form>}
  </section>
}
function CitaReceipt({ code, submitted, clinic, onNew }) {
  const state = useCitaResource('/citas/public/' + code + '/receipt', 15000, { method: 'POST', body: JSON.stringify({ requestKey: submitted.requestKey }) })
  const receipt = state.data?.receipt || submitted
  const messages = {
    PENDING: 'Recibimos tu solicitud. El consultorio se comunicará contigo para confirmar tu cita.',
    CONFIRMED: 'El consultorio confirmó tu cita. Te esperamos en el horario indicado.',
    CANCELLED: 'El consultorio canceló esta cita. Puedes solicitar otro horario o comunicarte con el personal.',
    EXPIRED: 'La solicitud venció sin confirmación y el horario quedó disponible. Puedes solicitar una nueva cita.',
  }
  return <section className="cita-panel cita-receipt"><span className="cita-kicker">{clinic?.name || 'MI CITA'}</span><h1>{receipt.status === 'PENDING' ? 'Solicitud recibida' : receipt.status === 'CONFIRMED' ? 'Cita confirmada' : 'Estado de tu solicitud'}</h1><CitaStatus status={receipt.status} /><p role="status">{messages[receipt.status]}</p><div className="cita-card"><h2>{submitted.professionalName}</h2><p>{dateLabel(receipt.startsAt, clinic?.timezone || 'America/Lima')}</p>{receipt.status === 'PENDING' && <small>Si no se confirma, vence el {dateLabel(receipt.expiresAt, clinic?.timezone || 'America/Lima')}.</small>}</div>{state.error && <p className="cita-error" role="alert">No pudimos actualizar el estado. {state.error}</p>}<button className="cita-secondary" onClick={state.reload}>Actualizar estado</button>{['CANCELLED', 'EXPIRED'].includes(receipt.status) && <button onClick={onNew}>Solicitar otra cita</button>}</section>
}
