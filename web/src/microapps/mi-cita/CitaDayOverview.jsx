import { useId } from 'react'
export function CitaDayOverview({ range, onRangeChange, resource, selectedDate, onSelectDay }) {
  const titleId = useId()
  const weekday = new Intl.DateTimeFormat('es-PE', { weekday: 'short', timeZone: 'UTC' })
  const month = new Intl.DateTimeFormat('es-PE', { month: 'short', timeZone: 'UTC' })
  const fullDate = new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
  return <section className="cita-day-overview" aria-labelledby={titleId}>
    <div className="cita-heading"><h3 id={titleId}>Citas de los próximos días</h3><div className="cita-range-switch" role="group" aria-label="Rango de agenda">{[7, 30].map(days => <button key={days} type="button" className={range === days ? '' : 'cita-secondary'} aria-pressed={range === days} onClick={() => onRangeChange(days)}>Próximos {days} días</button>)}</div></div>
    {resource.error && <p className="cita-error" role="alert">No pudimos cargar el resumen. {resource.error} <button className="cita-secondary" onClick={resource.reload}>Reintentar</button></p>}
    {!resource.data ? !resource.error && <p role="status">Cargando días con citas…</p> : <>
      <div className="cita-days-grid" role="group" aria-label={'Días de los próximos ' + range + ' días'}>{resource.data.days.map(day => {
        const calendarDate = new Date(day.date + 'T12:00:00Z')
        const state = day.confirmed ? 'confirmed' : day.pending ? 'pending' : 'empty'
        const label = `${fullDate.format(calendarDate)}: ${day.confirmed} ${day.confirmed === 1 ? 'confirmada' : 'confirmadas'}, ${day.pending} ${day.pending === 1 ? 'pendiente' : 'pendientes'}`
        return <button key={day.date} type="button" className={'cita-day cita-day-' + state + (selectedDate === day.date ? ' is-selected' : '')} aria-label={label} title={label} aria-pressed={selectedDate === day.date} aria-current={day.date === resource.data.today ? 'date' : undefined} onClick={() => onSelectDay(day.date)}>
          <span className="cita-day-weekday">{day.date === resource.data.today ? 'Hoy' : weekday.format(calendarDate)}</span>
          <span className="cita-day-date"><strong>{calendarDate.getUTCDate()}</strong><span>{month.format(calendarDate)}</span></span>
          <span className="cita-day-count">{day.total ? day.total + (day.total === 1 ? ' cita' : ' citas') : '\u00a0'}</span>
          {day.confirmed > 0 && day.pending > 0 && <span className="cita-day-pending-dot" aria-hidden="true" />}
        </button>
      })}</div>
      <div className="cita-days-legend"><span><i className="cita-legend-confirmed" />Confirmadas</span><span><i className="cita-legend-pending" />Pendientes</span><span><i className="cita-legend-empty" />Sin citas</span></div>
    </>}
    <small>Los días sin citas no indican disponibilidad de atención.</small>
  </section>
}
