import { useEffect, useState } from 'react'
import { listWorkspaces } from '../services/workspaces'
import { ExploreMicroapps } from '../components/ExploreMicroapps'
import { tools } from '../data/catalog'
export function Mi0Page({ user, onLogout, onOpenMicroapp, openAdvancedRequested }) {
  const [workspaces, setWorkspaces] = useState([])
  const [view, setView] = useState(openAdvancedRequested ? 'propias' : 'inicio')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    listWorkspaces({ signal: controller.signal }).then(data => { if (!controller.signal.aborted) setWorkspaces(data.workspaces || []) })
      .catch(failure => { if (!controller.signal.aborted) setError(failure.message) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [])
  const personalView = view === 'propias'
  const exploreView = view === 'explorar'
  const spaces = workspaces.filter(w => !personalView || w.role === 'OWNER').slice().sort((a,b) => Number(!a.modules.length) - Number(!b.modules.length))
  function navigate(next) { setView(next); setMenuOpen(false) }
  return <div className="console-shell">
    <aside className={'console-sidebar' + (menuOpen ? ' open' : '')}>
      <div className="console-logo">mi<span>0</span><small>.app</small></div>
      <nav className="console-nav" aria-label="Navegación de Mi0">
        <button className={view === 'inicio' ? 'active' : ''} aria-current={view === 'inicio' ? 'page' : undefined} onClick={() => navigate('inicio')}><span aria-hidden="true">⌂</span><span>Inicio</span></button>
        <button className={personalView ? 'active' : ''} aria-current={personalView ? 'page' : undefined} onClick={() => navigate('propias')}><span aria-hidden="true">▦</span><span>Mis microapps</span></button>
        <button className={exploreView ? 'active' : ''} aria-current={exploreView ? 'page' : undefined} onClick={() => navigate('explorar')}><span aria-hidden="true">＋</span><span>Explorar microapps</span></button>
      </nav>
      <div className="console-account"><div className="console-avatar">{user.name?.[0]?.toUpperCase()}</div><div><strong>{user.name} {user.lastName}</strong><small>{user.email}</small></div><button onClick={onLogout}>Salir</button></div>
    </aside>
    <main className="console-main">
      <header className="console-topbar"><button className="console-menu-button" aria-label="Abrir menú" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>☰</button><span>{exploreView ? 'Explorar microapps' : personalView ? 'Mis microapps' : 'Inicio'}</span><div className="console-avatar small">{user.name?.[0]?.toUpperCase()}</div></header>
      <section className="console-content">
        <div className="console-welcome"><span>MI0</span><h1>{exploreView ? 'Explorar microapps' : personalView ? 'Mis microapps' : 'Hola, ' + user.name}</h1><p>{exploreView ? 'Encuentra herramientas para ti y tu negocio.' : personalView ? 'Las herramientas de tus espacios personales y negocios propios.' : 'Tus espacios y los negocios que te invitaron, en un solo lugar.'}</p></div>
        {loading ? <p role="status" className="console-status">Cargando espacios…</p> : error ? <div className="console-empty" role="alert"><h2>No pudimos cargar tus espacios</h2><p>{error}</p></div> : exploreView ? <ExploreMicroapps workspaces={workspaces} onWorkspacesChange={setWorkspaces} onOpen={onOpenMicroapp} /> : <>
          <div className="console-section-heading"><div><h2>{openAdvancedRequested ? 'Elige dónde usar Sorteos Avanzado' : personalView ? 'Tus espacios propios' : 'Tus espacios'}</h2></div><button onClick={() => navigate('explorar')}>Explorar microapps →</button></div>
          {spaces.length ? <div className="console-spaces-grid">{spaces.map(space => <article className="console-space-card" key={space.id} aria-label={space.name}>
            <div className="console-space-heading"><h3>{space.name}</h3><span>{space.accessLabel || (space.role === 'OWNER' ? 'Propietario' : 'Acceso invitado')}</span></div>
            {space.modules.length ? <div className="console-shortcuts">{space.modules.map(module => {
              const tool = tools.find(item => item.code === module.code)
              return <button key={module.id} className="console-shortcut" disabled={!tool?.available} onClick={() => onOpenMicroapp(module.code, space)} aria-label={'Abrir ' + module.name + ' en ' + space.name}><span className="console-shortcut-icon" aria-hidden="true">{tool?.icon || '0_'}</span><span>{module.name}</span></button>
            })}</div> : <p className="console-space-empty">Aún no tiene microapps.</p>}
            {openAdvancedRequested && space.role === 'OWNER' && <button className="primary-button" onClick={() => onOpenMicroapp('sorteos-avanzado', space)}>Usar Sorteos Avanzado aquí</button>}
          </article>)}</div> : <div className="console-empty"><h3>{personalView ? 'No tienes espacios propios' : 'No tienes espacios activos'}</h3><p>Los espacios disponibles aparecerán aquí.</p></div>}
        </>}
      </section>
    </main>
    {menuOpen && <button className="console-overlay" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)} />}
  </div>
}
