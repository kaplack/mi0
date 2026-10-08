import { useTurnoData } from './useTurnoData'

export function TurnoDisplay({ code }) {
  const { data, error } = useTurnoData('/turnos/public/' + encodeURIComponent(code))
  return <section className="turno-panel turno-display">
    <h1>{data?.name || 'Mi Turno'}</h1>
    <p>Turnos llamados · Acércate a tu ventanilla</p>
    {error && <p role="alert" className="turno-error">{error}</p>}
    {!data ? <p>Cargando turnos…</p> : <div className="turno-calls">
      {data.called.length ? data.called.map(ticket => <div key={ticket.number}>
        <b>{String(ticket.number).padStart(3, '0')}</b>
        <span>{data.counterNames[ticket.counter - 1] || 'Ventanilla ' + ticket.counter}</span>
      </div>) : <p>Aún no hay turnos llamados.</p>}
    </div>}
    {data && <p>{data.waiting} personas esperando</p>}
  </section>
}
