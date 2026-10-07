import { useEffect, useState } from 'react'
export function Publications({ api }) {
  const [items, setItems] = useState([])
  const [revision, setRevision] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')
  const [reasons, setReasons] = useState({})
  useEffect(() => {
    const controller = new AbortController()
    api('/raffles/publications/pending', { signal: controller.signal })
      .then(data => setItems(data.publications))
      .catch(err => { if (!controller.signal.aborted) setError(err.message) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [api, revision])
  async function review(item, action) {
    setBusy(item.id); setError('')
    try {
      await api('/raffles/publications/' + item.id + '/review', { method: 'POST', body: JSON.stringify({ action, reason: reasons[item.id] || '' }) })
      setItems(previous => previous.filter(entry => entry.id !== item.id))
    } catch (err) { setError(err.message) }
    finally { setBusy(null) }
  }
  return <section className="data-panel">
    <div className="panel-heading"><h2>Publicaciones pendientes</h2><button className="text-button" type="button" disabled={loading || !!busy} onClick={() => { setLoading(true); setError(''); setRevision(value => value + 1) }}>Actualizar</button></div>
    <p className="empty">Verifica el depósito en Yape antes de aprobar. Aprobar habilita el enlace público; los ganadores permanecen iguales.</p>
    {error && <p className="error" role="alert">{error}</p>}
    {loading ? <p role="status">Cargando solicitudes…</p> : !items.length ? <p className="empty">No hay publicaciones pendientes.</p> : items.map(item => <article className="publication-row" key={item.id}>
      <h3>{item.raffle.name}</h3><p>{item.requestedBy.name} {item.requestedBy.lastName} · {item.requestedBy.email}</p>
      <p>{new Date(item.requestedAt).toLocaleString('es-PE')} · <strong>S/{(item.amountCents / 100).toFixed(2)}</strong></p>
      <p>Operación Yape: <strong>{item.reference}</strong></p>
      <div className="publication-actions"><button type="button" disabled={!!busy} onClick={() => review(item, 'approve')}>{busy === item.id ? 'Procesando…' : 'Pago verificado: aprobar'}</button>
        <label>Motivo de rechazo<input maxLength={300} value={reasons[item.id] || ''} disabled={!!busy} onChange={event => setReasons(previous => ({ ...previous, [item.id]: event.target.value }))} placeholder="Indica por qué no se pudo verificar el pago" /></label>
        <button className="secondary" type="button" disabled={!!busy || !reasons[item.id]?.trim()} onClick={() => review(item, 'reject')}>Rechazar solicitud</button>
      </div>
    </article>)}
  </section>
}
