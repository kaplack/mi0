import { useEffect, useState } from 'react'
import { AdminModuleIcon } from './IconSettings'

export function Microapps({ api, pending, onManage }) {
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(null)
  const [message, setMessage] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    api('/admin/modules', { signal: controller.signal }).then(data => setModules(data.modules))
      .catch(err => { if (!controller.signal.aborted) setError(err.message) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [api])
  async function toggle(module) {
    if (module.active && !window.confirm(`¿Desactivar ${module.name}? Se ocultará del catálogo y no admitirá nuevas activaciones. Los negocios que ya la usan conservarán el acceso.`)) return
    setBusy(module.id); setError(''); setMessage('')
    try {
      const data = await api(`/admin/modules/${module.id}/status`, { method: 'PATCH', body: JSON.stringify({ active: !module.active }) })
      setModules(previous => previous.map(item => item.id === module.id ? data.module : item))
      setMessage(`${module.name}: ${data.module.active ? 'activada' : 'desactivada'}.`)
    } catch (err) { setError(err.message) }
    finally { setBusy(null) }
  }
  return <>
    <p className="section-description">Administra cada microapp y sus servicios adicionales. Desactivar conserva el acceso de los negocios que ya la usan.</p>
    {error && <p className="error" role="alert">{error}</p>}
    {message && <p role="status">{message}</p>}
    {loading ? <p role="status">Cargando microapps…</p> : <div className="microapp-grid">
      {!modules.length && !error && <p>No hay microapps registradas.</p>}
      {modules.map(module => {
        const count = module.code === 'sorteos-avanzado' ? pending.publications : module.code === 'mi-turno' ? pending.payments : null
        return <article className="microapp-card" key={module.id}>
          <div className="microapp-card-heading"><AdminModuleIcon api={api} module={module} /><h2>{module.name}</h2><span className={`module-status ${module.active ? 'is-enabled' : ''}`}>{module.active ? 'Activa' : 'Desactivada'}</span></div>
          <p>{module.description || 'Microapp de mi0.app'}</p>
          {count != null && <span className="module-pending">{count} {count === 1 ? 'solicitud pendiente' : 'solicitudes pendientes'}</span>}
          <div className="microapp-card-actions"><button type="button" onClick={() => onManage(module)}>Gestionar<span className="sr-only"> {module.name}</span></button><button type="button" className="secondary" disabled={busy !== null} onClick={() => toggle(module)}>{busy === module.id ? 'Guardando…' : module.active ? 'Desactivar' : 'Activar'}<span className="sr-only"> {module.name}</span></button></div>
        </article>
      })}
    </div>}
  </>
}
