import { useEffect, useRef, useState } from 'react'
import { api } from '../../services/api'
const dateInLima = date => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
const duration = seconds => seconds == null ? '—' : (seconds / 60).toLocaleString('es-PE', { maximumFractionDigits: 1 }) + ' min'
const expiry = value => new Date(value).toLocaleString('es-PE', { timeZone: 'America/Lima' })
function MetricIcon({ index }) {
  const paths = [
    <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h3" /></>,
    <><circle cx="9" cy="7" r="3" /><path d="M3 20v-2a6 6 0 0 1 10-4M15 17l2 2 4-5" /></>,
    <><circle cx="9" cy="7" r="3" /><path d="M3 20v-2a6 6 0 0 1 10-4M16 15l5 5M21 15l-5 5" /></>,
    <><circle cx="12" cy="12" r="9" /><path d="M12 7v5M12 16h.01" /></>,
    <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    <><circle cx="12" cy="14" r="7" /><path d="M12 10v4l2 2M9 3h6M12 3v4M18 7l2-2" /></>,
  ]
  return <svg className="turno-metric-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[index]}</svg>
}
export function TurnoDashboard({ workspaceId }) {
  const base = '/turnos/workspace/' + workspaceId + '/dashboard'
  const [subscription, setSubscription] = useState(null)
  const [report, setReport] = useState(null)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [busy, setBusy] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const dialogRef = useRef(null)
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (modalOpen && !dialog.open) dialog.showModal()
    else if (!modalOpen && dialog.open) dialog.close()
  }, [modalOpen])
  const [plan, setPlan] = useState('ANNUAL')
  const [reference, setReference] = useState('')
  const [from, setFrom] = useState(() => dateInLima(new Date(Date.now() - 29 * 86400000)))
  const [to, setTo] = useState(() => dateInLima(new Date()))
  const [range, setRange] = useState(() => ({ from, to }))
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const controller = new AbortController()
    api(base + '/subscription', { signal: controller.signal }).then(setSubscription).catch(err => { if (!controller.signal.aborted) setError(err.message) })
    return () => controller.abort()
  }, [base, revision])
  useEffect(() => {
    if (!subscription?.active) return
    const controller = new AbortController()
    api(base + '?from=' + range.from + '&to=' + range.to, { signal: controller.signal }).then(setReport)
      .catch(err => { if (!controller.signal.aborted) { setError(err.message); setReport(null) } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [base, subscription, range])
  async function pay(event) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      await api(base + '/payments', { method: 'POST', body: JSON.stringify({ plan, reference }) })
      setReference(''); setModalOpen(false); setRevision(value => value + 1)
    } catch(err) { setError(err.message) } finally { setBusy(false) }
  }
  function exportCsv() {
    const rows = [['Periodo', report.from + ' al ' + report.to], ['Zona horaria', 'America/Lima'], ['Ventanilla', 'Atendidos', 'Ausentes', 'Vencidos', 'Espera promedio (min)', 'Atención promedio (min)', 'Muestras espera', 'Muestras atención'],
      ...[{ ...report.summary, name: 'Total del negocio' }, ...report.counters].map(row => [row.name, row.served, row.absent, row.expired, row.waitAverageSeconds == null ? '' : (row.waitAverageSeconds / 60).toFixed(2), row.serviceAverageSeconds == null ? '' : (row.serviceAverageSeconds / 60).toFixed(2), row.waitSamples, row.serviceSamples]),
      [], ['Hora de registro (Lima)', 'Turnos'], ...report.hours.map(row => [row.hour + ':00', row.count])]
    const csv = '\ufeff' + rows.map(row => row.map(value => '"' + String(value).replaceAll('"', '""') + '"').join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'mi-turno-dashboard-' + report.from + '-' + report.to + '.csv'; anchor.click(); URL.revokeObjectURL(url)
  }
  if (!subscription) return <><h2>Dashboard</h2>{error ? <p className="turno-error" role="alert">{error}</p> : <p role="status">Cargando Dashboard…</p>}</>
  const pending = subscription.payment?.status === 'PENDING'
  const selectedPlan = subscription.plans.find(item => item.code === plan)
  return <>
    <h2>Dashboard</h2>
    <p>Conoce cómo funciona la atención de tu negocio.</p>
    {error && !modalOpen && <p className="turno-error" role="alert">{error}</p>}
    {subscription.preview && <p className="turno-dashboard-validity">Vista previa local · Dashboard habilitado para revisar su presentación.</p>}
    {subscription.validUntil && <p className="turno-dashboard-validity">{subscription.active ? 'Acceso vigente hasta ' : 'Tu acceso venció el '}{expiry(subscription.validUntil)}</p>}
    {!subscription.active && <section className="turno-dashboard-offer"><h3>Decide con información</h3><ul className="turno-dashboard-benefits">{['Personas atendidas, ausentes y turnos vencidos', 'Tiempo promedio de espera y atención', 'Horas de mayor demanda', 'Resultados por ventanilla', 'Filtros por fechas', 'Descarga de reportes en CSV'].map(benefit => <li key={benefit}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg><span>{benefit}</span></li>)}</ul><p>El acceso cubre este negocio y está disponible para sus administradores.</p></section>}
    {subscription.active && <>
      <form className="turno-dashboard-filters" onSubmit={event => { event.preventDefault(); setError(''); setLoading(true); setReport(null); setRange({ from, to }) }}>
        <label>Desde<input type="date" required value={from} max={to} onChange={event => setFrom(event.target.value)} /></label>
        <label>Hasta<input type="date" required value={to} min={from} onChange={event => setTo(event.target.value)} /></label>
        <button disabled={loading} type="submit">Consultar</button>
        <button className="turno-secondary" disabled={!report || loading} type="button" onClick={exportCsv}>Exportar CSV</button>
      </form>
      <p className="turno-hint">Turnos registrados en el periodo seleccionado · Hora de Lima · Hasta 366 días.</p>
      {loading ? <p role="status">Cargando estadísticas…</p> : report && <>
        <div className="turno-dashboard-metrics">{[['Turnos registrados', report.summary.total], ['Atendidos', report.summary.served], ['Ausentes', report.summary.absent], ['Vencidos', report.summary.expired], ['Espera promedio', duration(report.summary.waitAverageSeconds)], ['Atención promedio', duration(report.summary.serviceAverageSeconds)]].map(([label, value], index) => <article key={label}><div className="turno-metric-heading"><span>{label}</span><MetricIcon index={index} /></div><strong>{value}</strong></article>)}</div>
        {!report.summary.total && <p>No hay turnos registrados en este periodo.</p>}
        <ul className="turno-dashboard-chips" aria-label="Datos usados en los promedios">
          <li title="Turnos pendientes o en atención"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12M6 21h12M7 3v4l5 5-5 5v4M17 3v4l-5 5 5 5v4" /></svg>{report.summary.active} pendientes</li>
          <li title="Turnos con tiempo de espera registrado"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>{report.summary.waitSamples} esperas</li>
          <li title="Atenciones completadas con duración registrada"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="7" r="3" /><path d="M3 20v-2a6 6 0 0 1 10-4M15 17l2 2 4-5" /></svg>{report.summary.serviceSamples} atenciones</li>
        </ul>
        <p className="turno-hint">Promedios calculados con tiempos registrados.</p>
        <details className="turno-dashboard-calculation"><summary>Cómo se calcula</summary><p>La espera se mide desde que el cliente toma su turno hasta que lo llaman. La atención se mide desde el llamado hasta finalizar e incluye el tiempo para acercarse a la ventanilla. El promedio de atención considera solo turnos atendidos. Los registros sin tiempos completos se excluyen del promedio correspondiente.</p></details>
        {report.summary.serviceSamples < report.summary.served && <p className="turno-hint">Hay atenciones históricas sin tiempos completos; se excluyen del promedio.</p>}
        <h3>Demanda por hora</h3><p className="turno-hint">Cantidad de turnos tomados en cada hora del día.</p>
        <div className="turno-demand-chart" role="img" aria-label={'Turnos tomados por hora en Lima. ' + report.hours.map(row => row.hour + ':00: ' + row.count + ' turnos').join(', ')}>
          <span className="turno-demand-axis-title">Turnos</span>
          <div className="turno-demand-plot">
            <div className="turno-demand-y-axis" aria-hidden="true">{[4, 3, 2, 1, 0].map(step => <span key={step}>{step * Math.max(1, Math.ceil(Math.max(...report.hours.map(row => row.count), 1) / 4))}</span>)}</div>
            <div className="turno-demand-bars">
              <div className="turno-demand-grid" aria-hidden="true">{[0, 1, 2, 3, 4].map(line => <span key={line} />)}</div>
              {report.hours.map(row => <div className="turno-demand-column" key={row.hour}>
                <div className="turno-demand-bar" tabIndex={0} aria-label={row.hour + ':00 · ' + row.count + ' turnos'} style={{ height: (row.count / (4 * Math.max(1, Math.ceil(Math.max(...report.hours.map(item => item.count), 1) / 4)))) * 100 + '%' }}><span className="turno-demand-tooltip">{String(row.hour).padStart(2, '0')}:00 · {row.count}</span></div>
                <span className="turno-demand-hour" aria-hidden="true">{String(row.hour).padStart(2, '0')}</span>
              </div>)}
            </div>
          </div>
          <p className="turno-demand-x-title" aria-hidden="true">Hora del día</p>
        </div>
        <h3>Por ventanilla</h3>{!report.counters.length ? <p>Todavía no se han llamado turnos en este periodo.</p> : <div className="turno-dashboard-table"><table><thead><tr><th>Ventanilla</th><th>Atendidos</th><th>Ausentes</th><th>Vencidos</th><th>Espera promedio</th><th>Tiempo promedio de atención</th></tr></thead><tbody>{report.counters.map(row => <tr key={row.counter}><th scope="row">{row.name}</th><td data-label="Atendidos">{row.served}</td><td data-label="Ausentes">{row.absent}</td><td data-label="Vencidos">{row.expired}</td><td data-label="Espera promedio">{duration(row.waitAverageSeconds)}</td><td data-label="Tiempo promedio de atención">{duration(row.serviceAverageSeconds)}</td></tr>)}</tbody></table></div>}
      </>}
    </>}
    <div className="turno-dashboard-payment-trigger">
      <button type="button" onClick={() => setModalOpen(true)}>{pending ? 'Ver pago pendiente' : subscription.active ? 'Renovar acceso' : 'Contratar Dashboard'}</button>
      {pending && !modalOpen && <p role="status">Pago de S/{subscription.payment.amountCents / 100} en revisión. Referencia: {subscription.payment.reference}. <button className="turno-secondary" type="button" onClick={() => { setError(''); setRevision(value => value + 1) }}>Actualizar estado</button></p>}
    </div>
    <dialog ref={dialogRef} className="turno-dashboard-modal" aria-labelledby="dashboard-payment-title" onCancel={event => { if (busy) event.preventDefault(); else setModalOpen(false) }} onClose={() => setModalOpen(false)}>
      <div className="turno-dashboard-modal-heading"><h3 id="dashboard-payment-title">{subscription.active ? 'Renovar acceso' : 'Contratar Dashboard'}</h3><button type="button" className="turno-secondary" aria-label="Cerrar contratación" disabled={busy} onClick={() => setModalOpen(false)}>✕</button></div>
      {error && <p className="turno-error" role="alert">{error}</p>}
      <div className="turno-dashboard-plans">{subscription.plans.map(item => <label key={item.code}><input type="radio" name="dashboard-plan" value={item.code} checked={plan === item.code} disabled={busy || pending} onChange={() => setPlan(item.code)} /><span><strong>{item.label} · S/{item.amountCents / 100}</strong><small>{item.code === 'ANNUAL' ? '12 meses · Ahorra S/41 al año' : '1 mes de acceso'}</small></span></label>)}</div>
      <p className="turno-hint">Mismas funciones en ambos planes. Renovación manual, sin cargos automáticos. Si renuevas antes del vencimiento, el periodo se suma a tu acceso actual.</p>
      {pending ? modalOpen && <p role="status">Pago de S/{subscription.payment.amountCents / 100} en revisión. Referencia: {subscription.payment.reference}. El acceso se habilita al confirmar el depósito. <button className="turno-secondary" type="button" onClick={() => { setError(''); setRevision(value => value + 1) }}>Actualizar estado</button></p> : <>
        {subscription.payment?.status === 'REJECTED' && <p className="turno-error">Pago rechazado: {subscription.payment.rejectionReason}</p>}
        {subscription.paymentInstructions.enabled ? <form onSubmit={pay}><p>Yapea <strong>S/{selectedPlan.amountCents / 100}</strong> al <strong>{subscription.paymentInstructions.phone}</strong> · {subscription.paymentInstructions.name}.</p><label>Número de operación Yape<input required minLength={4} maxLength={80} value={reference} disabled={busy} onChange={event => setReference(event.target.value)} placeholder="Ingresa la referencia del depósito" /></label><button type="submit" disabled={busy}>{busy ? 'Enviando…' : 'Enviar pago para verificación'}</button></form> : <p>Los pagos aún no están habilitados. Vuelve a consultar cuando estén disponibles.</p>}
      </>}
    </dialog>
  </>
}
