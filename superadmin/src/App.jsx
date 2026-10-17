import { useEffect, useRef, useState } from 'react'
import { DashboardPayments } from './DashboardPayments'
import { Publications } from './Publications'
import { PublicProfile } from './PublicProfile'
import { Catalog } from './Catalog'
import { ModuleTabs } from './ModuleTabs'
import { Microapps } from './Microapps'
import { AdminNavigation } from './AdminNavigation'
import { sections } from './adminSections'
import './App.css'

const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
const TOKEN_KEY = 'mi0_superadmin_token'
async function api(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY)
  const response = await fetch(`${API_URL}/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  })
  const data = options.responseType === 'blob' && response.ok ? await response.blob() : await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || 'Ocurrió un error')
  return data
}

function App() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [summary, setSummary] = useState(null)
  const [section, setSection] = useState('overview')
  const [items, setItems] = useState([])
  const [dataLoading, setDataLoading] = useState(false)
  const [pending, setPending] = useState({})
  const [managedModule, setManagedModule] = useState(null)
  const [moduleTab, setModuleTab] = useState('settings')
  const requestId = useRef(0)
  const headingRef = useRef(null)
  function focusHeading() {
    window.scrollTo({ top: 0 })
    requestAnimationFrame(() => headingRef.current?.focus())
  }
  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return
    api('/auth/me').then(({ user }) => {
      if (user.role === 'SUPERADMIN') setUser(user)
      else localStorage.removeItem(TOKEN_KEY)
    }).catch(() => localStorage.removeItem(TOKEN_KEY)).finally(() => setChecking(false))
  }, [])
  useEffect(() => {
    if (user?.role !== 'SUPERADMIN') return
    const controller = new AbortController()
    api('/admin/summary', { signal: controller.signal }).then(data => setSummary(data.summary)).catch(err => { if (!controller.signal.aborted) setError(err.message) })
    return () => controller.abort()
  }, [user])
  async function handleLogin(event) {
    event.preventDefault(); setError(''); setLoading(true)
    const form = new FormData(event.currentTarget)
    try {
      const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email: form.get('email'), password: form.get('password') }) })
      if (data.user.role !== 'SUPERADMIN') { setError('Esta cuenta no tiene acceso al Superadmin.'); return }
      localStorage.setItem(TOKEN_KEY, data.token); setUser(data.user)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }
  async function openSection(nextSection) {
    const currentRequest = ++requestId.current
    setItems([]); setSection(nextSection); setManagedModule(null); setError(''); focusHeading()
    if (!['users', 'businesses'].includes(nextSection)) { setDataLoading(false); return }
    setDataLoading(true)
    try {
      const data = await api(`/admin/${nextSection}`)
      if (requestId.current === currentRequest) setItems(data[nextSection] || [])
    } catch (err) { if (requestId.current === currentRequest) setError(err.message) }
    finally { if (requestId.current === currentRequest) setDataLoading(false) }
  }
  async function handleLogout() {
    try { await api('/auth/logout', { method: 'POST' }) } catch { /* Clear the local session even if it has expired. */ }
    localStorage.removeItem(TOKEN_KEY); requestId.current += 1
    setUser(null); setSummary(null); setSection('overview'); setItems([]); setError(''); setDataLoading(false); setPending({}); setManagedModule(null)
  }
  if (checking) return <main className="shell"><p>Comprobando sesión…</p></main>
  if (!user) return <main className="shell"><section className="card">
    <div className="brand">mi<span>0</span></div><p className="eyebrow">SUPERADMIN</p><h1>Iniciar sesión</h1><p className="intro">Administración de mi0.app</p>
    <form onSubmit={handleLogin}>
      <label>Correo<input name="email" type="email" autoComplete="email" required /></label>
      <label>Contraseña<input name="password" type="password" autoComplete="current-password" required /></label>
      {error && <p className="error" role="alert">{error}</p>}
      <button type="submit" disabled={loading}>{loading ? 'Ingresando…' : 'Ingresar'}</button>
    </form>
  </section></main>
  const cards = [
    { key: 'users', label: 'Usuarios', value: summary?.users },
    { key: 'businesses', label: 'Negocios', value: summary?.businesses },
    { key: 'modules', label: 'Microapps', value: summary?.modules },
  ]
  const pendingTotal = pending.publications != null && pending.payments != null ? pending.publications + pending.payments : null
  return <div className="admin-shell">
    <AdminNavigation section={section} onNavigate={openSection} pending={{ pending: pendingTotal }} user={user} onLogout={handleLogout} />
    <main className="admin-main">
      <header className="admin-header"><div className="brand">mi<span>0</span></div><div><span className="admin-name">{user.name}</span><button className="text-button" type="button" onClick={handleLogout}>Salir</button></div></header>
      <section className="dashboard">
        <p className="eyebrow">SUPERADMIN</p><h1 ref={headingRef} tabIndex={-1}>{managedModule?.name || sections.find(item => item.key === section)?.label}</h1>
        {section === 'overview' && <>
          <div className="dashboard-grid">{cards.map(card => <button className="metric-card" key={card.key} onClick={() => openSection(card.key)}><span>{card.label}</span><strong>{card.value ?? '—'}</strong></button>)}</div>
          <div className="overview-pending">
            <button className="metric-card" onClick={() => openSection('pending')}><span>Sorteos Avanzado · Publicaciones</span><strong>{pending.publications ?? '—'}</strong><small>Revisar solicitudes →</small></button>
            <button className="metric-card" onClick={() => openSection('pending')}><span>Mi Turno · Pagos de Dashboard</span><strong>{pending.payments ?? '—'}</strong><small>Revisar pagos →</small></button>
          </div>
        </>}
        {error && <p className="error" role="alert">{error}</p>}
        {section === 'categories' && <Catalog api={api} />}
        {section === 'modules' && !managedModule && <Microapps api={api} pending={pending} onManage={module => { setManagedModule(module); setModuleTab(module.code === 'sorteos-avanzado' ? 'publications' : module.code === 'mi-turno' ? 'payments' : 'settings'); focusHeading() }} />}
        {section === 'modules' && managedModule && <>
          <button className="back-button" type="button" onClick={() => { setManagedModule(null); focusHeading() }}>← Volver a Microapps</button>
          <p className="section-description">{managedModule.description}</p>
          <p className="module-status">{managedModule.active ? 'Activa en el catálogo' : 'Desactivada para nuevas activaciones'}</p>
          <ModuleTabs activeTab={moduleTab} onChange={setModuleTab} tabs={[
            ...(managedModule.code === 'sorteos-avanzado' ? [{ key: 'publications', label: 'Publicaciones', count: pending.publications }] : []),
            ...(managedModule.code === 'mi-turno' ? [{ key: 'payments', label: 'Pagos de Dashboard', count: pending.payments }] : []),
            { key: 'profile', label: 'Ficha pública' },
            { key: 'settings', label: 'Configuración' },
          ]} />
          <div id="module-panel-profile" role="tabpanel" aria-labelledby="module-tab-profile" tabIndex={0} hidden={moduleTab !== 'profile'}>
            <PublicProfile key={managedModule.id} api={api} moduleId={managedModule.id} onSaved={profile => setManagedModule(previous => ({ ...previous, description: profile.description }))} />
          </div>
          <div id="module-panel-settings" role="tabpanel" aria-labelledby="module-tab-settings" tabIndex={0} hidden={moduleTab !== 'settings'}>
            <Catalog key={managedModule.id} api={api} moduleId={managedModule.id} />
          </div>
        </>}
        {section === 'pending' && <p className="section-description">Solicitudes de servicios adicionales de todas las microapps. Revisa cada pago dentro de su servicio.</p>}
        <div className="service-panels">
          <div id="module-panel-publications" role={managedModule?.code === 'sorteos-avanzado' ? 'tabpanel' : undefined} aria-labelledby={managedModule?.code === 'sorteos-avanzado' ? 'module-tab-publications' : undefined} tabIndex={managedModule?.code === 'sorteos-avanzado' ? 0 : undefined} hidden={section !== 'pending' && !(section === 'modules' && managedModule?.code === 'sorteos-avanzado' && moduleTab === 'publications')}>
            <p className="service-owner">Sorteos Avanzado · Publicación de resultados</p>
            <Publications api={api} onCountChange={count => setPending(previous => previous.publications === count ? previous : { ...previous, publications: count })} />
          </div>
          <div id="module-panel-payments" role={managedModule?.code === 'mi-turno' ? 'tabpanel' : undefined} aria-labelledby={managedModule?.code === 'mi-turno' ? 'module-tab-payments' : undefined} tabIndex={managedModule?.code === 'mi-turno' ? 0 : undefined} hidden={section !== 'pending' && !(section === 'modules' && managedModule?.code === 'mi-turno' && moduleTab === 'payments')}>
            <p className="service-owner">Mi Turno · Dashboard del negocio</p>
            <DashboardPayments api={api} onCountChange={count => setPending(previous => previous.payments === count ? previous : { ...previous, payments: count })} />
          </div>
        </div>
        {['users', 'businesses'].includes(section) && <section className="data-panel">
          <div className="panel-heading"><h2>{cards.find(card => card.key === section)?.label}</h2><button className="text-button" type="button" disabled={dataLoading} onClick={() => openSection(section)}>Actualizar</button></div>
          {dataLoading ? <p role="status">Cargando…</p> : <div className="item-list">
            {!items.length && <p className="empty">Todavía no hay registros.</p>}
            {section === 'users' && items.map(item => <article className="list-row" key={item.id}><div><strong>{item.name} {item.lastName}</strong><small>{item.email}</small></div><span>{item.role} · {item.status}</span></article>)}
            {section === 'businesses' && items.map(item => <article className="list-row" key={item.id}><div><strong>{item.name}</strong><small>{item.slug}</small></div><span>{item.modules.filter(entry => entry.active).length} microapps · {item.status}</span></article>)}
          </div>}
        </section>}
      </section>
    </main>
  </div>
}
export default App
