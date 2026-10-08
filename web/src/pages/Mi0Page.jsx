import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { tools } from '../data/catalog'

export function Mi0Page({ user, onLogout, onExplore, onOpenMicroapp, openAdvancedRequested }) {
  const [workspaces, setWorkspaces] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    api('/workspaces', { signal: controller.signal })
      .then((data) => {
        setWorkspaces(data.workspaces || [])
        setActiveId(data.workspaces?.[0]?.id || null)
        if (openAdvancedRequested && data.workspaces?.[0]) onOpenMicroapp('sorteos-avanzado', data.workspaces[0])
      })
      .catch((err) => { if (!controller.signal.aborted) setError(err.message) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [onOpenMicroapp, openAdvancedRequested])

  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeId) || workspaces[0]
  const modules = activeWorkspace?.modules || []

  return (
    <div className="console-shell">
      <aside className={menuOpen ? 'console-sidebar open' : 'console-sidebar'}>
        <div className="console-logo">mi<span>0</span><small>.app</small></div>

        <div className="console-space-block">
          <small>ESPACIO</small>
          {workspaces.length > 1 ? (
            <select value={activeId || ''} onChange={(e) => setActiveId(e.target.value)}>
              {workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
            </select>
          ) : (
            <strong>{activeWorkspace?.name || 'Mi espacio'}</strong>
          )}
        </div>

        <nav className="console-nav">
          <button className="active" type="button" onClick={() => setMenuOpen(false)}>⌂ <span>Inicio</span></button>
          <button type="button" onClick={() => setMenuOpen(false)}>▦ <span>Mis microapps</span></button>
          <button type="button" onClick={onExplore}>＋ <span>Explorar microapps</span></button>
        </nav>

        <div className="console-account">
          <div className="console-avatar">{user.name?.[0]?.toUpperCase()}</div>
          <div><strong>{user.name} {user.lastName}</strong><small>{user.email}</small></div>
          <button type="button" onClick={onLogout}>Salir</button>
        </div>
      </aside>

      <main className="console-main">
        <header className="console-topbar">
          <button className="console-menu-button" type="button" onClick={() => setMenuOpen(!menuOpen)}>☰</button>
          <span>{activeWorkspace?.name || 'Mi espacio'}</span>
          <div className="console-avatar small">{user.name?.[0]?.toUpperCase()}</div>
        </header>

        <section className="console-content">
          {loading ? (
            <p className="console-status">Cargando tu espacio…</p>
          ) : error ? (
            <div className="console-empty"><h2>No pudimos cargar tu espacio</h2><p>{error}</p></div>
          ) : !activeWorkspace ? (
            <div className="console-empty"><h2>No tienes espacios activos</h2><p>Tu cuenta necesita un espacio activo para usar Sorteos Avanzado.</p></div>
          ) : (
            <>
              <div className="console-welcome">
                <span>MI0</span>
                <h1>Hola, {user.name}</h1>
                <p>{activeWorkspace?.type === 'PERSONAL' && activeWorkspace?.name === 'Mi espacio' && activeWorkspace?.role === 'OWNER' ? 'Este es tu espacio personal.' : 'Estás en ' + activeWorkspace?.name + '.'}</p>
              </div>

              <div className="console-section-heading">
                <div><h2>Mis microapps</h2><p>Las herramientas de este espacio aparecerán aquí.</p></div>
                <button type="button" onClick={onExplore}>Explorar microapps →</button>
              </div>

              {modules.length ? <div className="console-app-grid">
                {modules.map(module => {
                  const tool = tools.find(item => item.code === module.code)
                  return <article key={module.id} className="console-app-card">
                    <div>{tool?.icon || '0_'}</div><h3>{module.name}</h3><p>{module.description || tool?.description}</p>
                    {tool?.available && <button className="primary-button" type="button" onClick={() => onOpenMicroapp(module.code, activeWorkspace)}>Abrir →</button>}
                  </article>
                })}
              </div> : <div className="console-empty"><h3>Este espacio aún no tiene microapps</h3><p>Explora las herramientas disponibles para empezar.</p></div>}
            </>
          )}
        </section>
      </main>

      {menuOpen && <button className="console-overlay" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)} />}
    </div>
  )
}
