import { useEffect, useRef, useState } from 'react'
import { Logo } from '../../components/Logo'
import { api, TOKEN_KEY } from '../../services/api'
import { useTurnoData } from './useTurnoData'
import { TurnoClient } from './TurnoClient'
import { TurnoDisplay } from './TurnoDisplay'
import { TurnoSettings } from './TurnoSettings'
import { TurnoOperation } from './TurnoOperation'
import { TurnoSidebar, TurnoIcon } from './TurnoSidebar'
import { TurnoDashboard } from './TurnoDashboard'
import { TurnoOperators } from './TurnoOperators'
import { QueueQr } from './QueueQr'
import './MiTurno.css'

export function MiTurno({ code, publicDisplay = false, workspaceId, page = 'operacion', onBack, onLogin, onNavigate }) {
  return <div className={'turno' + (publicDisplay ? ' turno-monitor' : '')}>
    <header className="turno-header"><Logo />
      {!code && (onBack ? <button className="turno-back" onClick={onBack}>← Volver a Inicio</button> : <a className="turno-back" href="/">← Volver a Inicio</a>)}
    </header>
    {code ? <main className="turno-public-main">{publicDisplay ? <TurnoDisplay key={code} code={code} /> : <TurnoClient key={code} code={code} />}</main>
      : <TurnoManager workspaceId={workspaceId} page={page} onNavigate={onNavigate} onLogin={onLogin} />}
  </div>
}
function TurnoManager({ workspaceId, page, onLogin, onNavigate }) {
  const [workspaces, setWorkspaces] = useState(null)
  const [error, setError] = useState('')
  const loggedIn = Boolean(localStorage.getItem(TOKEN_KEY))
  useEffect(() => {
    if (!loggedIn) return
    const controller = new AbortController()
    api('/workspaces', { signal: controller.signal }).then(result => setWorkspaces(result.workspaces || []))
      .catch(failure => { if (!controller.signal.aborted) setError(failure.message) })
    return () => controller.abort()
  }, [loggedIn])
  if (!loggedIn) return <main className="turno-public-main"><section className="turno-panel"><h1>Mi Turno</h1><p>Inicia sesión para configurar el negocio y atender turnos.</p><button onClick={onLogin}>Iniciar sesión</button></section></main>
  if (error) return <main className="turno-public-main"><section className="turno-panel"><p role="alert">{error}</p><button onClick={onLogin}>Volver a iniciar sesión</button></section></main>
  if (!workspaces) return <main className="turno-public-main"><section className="turno-panel"><p>Cargando espacios…</p></section></main>
  const workspace = workspaces.find(item => item.id === workspaceId) || (!workspaceId ? workspaces[0] : null)
  if (!workspace) return <main className="turno-public-main"><section className="turno-panel"><p>No tienes acceso a este espacio activo.</p></section></main>
  return <TurnoWorkspace key={workspace.id} workspace={workspace} workspaces={workspaces} page={page} onNavigate={onNavigate} />
}
function TurnoWorkspace({ workspace, workspaces, page, onNavigate }) {
  const state = useTurnoData('/turnos/workspace/' + workspace.id)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('mi0_turno_sidebar') === 'collapsed')
  const [menuOpen, setMenuOpen] = useState(false)
  const [smallScreen, setSmallScreen] = useState(() => window.matchMedia('(max-width: 760px)').matches)
  useEffect(() => {
    const media = window.matchMedia('(max-width: 760px)')
    const update = () => { setSmallScreen(media.matches); if (!media.matches) setMenuOpen(false) }
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  const drawerRef = useRef(null)
  useEffect(() => {
    const drawer = drawerRef.current
    if (!drawer) return
    if (menuOpen && !drawer.open) drawer.showModal()
    else if (!menuOpen && drawer.open) drawer.close()
  }, [menuOpen])
  const canConfigure = ['OWNER', 'ADMIN'].includes(state.data?.role || workspace.role)
  const queue = state.data?.queue
  const title = { operacion: 'Operación', configuracion: 'Configuración', qr: 'QR y cartel', operadores: 'Operadores', dashboard: 'Dashboard' }[page] || 'Operación'
  function toggleSidebar() {
    setCollapsed(previous => { localStorage.setItem('mi0_turno_sidebar', previous ? 'expanded' : 'collapsed'); return !previous })
  }
  function navigate(event, path) {
    if (!onNavigate || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault(); onNavigate(path)
  }
  return <main className={'turno-workspace turno-role-layout' + (!canConfigure && smallScreen ? ' turno-operator-workspace' : '')}>
    <section className="turno-intro"><span className="turno-kicker">{queue?.name || workspace.name}</span><h1>Mi Turno</h1><p>Una atención organizada, un turno a la vez.</p>
      {canConfigure && smallScreen && <button className="turno-admin-menu-toggle turno-secondary" type="button" aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={menuOpen} aria-controls="turno-admin-drawer" onClick={() => setMenuOpen(previous => !previous)}>{menuOpen ? '✕' : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>}</button>}
    </section>
    {canConfigure && <dialog id="turno-admin-drawer" ref={drawerRef} className="turno-admin-drawer" aria-label="Menú de administración" onCancel={() => setMenuOpen(false)} onClose={() => setMenuOpen(false)}>
      <TurnoSidebar workspace={workspace} workspaces={workspaces} queue={queue} page={page} canConfigure collapsed={false} onCollapse={() => setMenuOpen(false)} drawer reload={state.reload} onNavigate={onNavigate ? path => { setMenuOpen(false); onNavigate(path) } : undefined} />
    </dialog>}
    <div className={'turno-layout' + (smallScreen ? ' turno-role-content' : '') + (!smallScreen && collapsed ? ' is-collapsed' : '')}>
      {!smallScreen && <div className="turno-sidebar-area"><TurnoSidebar workspace={workspace} workspaces={workspaces} queue={queue} page={page} canConfigure={canConfigure} collapsed={collapsed} onCollapse={toggleSidebar} reload={state.reload} onNavigate={onNavigate} /></div>}
      <section className="turno-panel turno-content" aria-label={title}>
        <div className="turno-content-heading"><span className="turno-eyebrow">MI TURNO / {title.toUpperCase()}</span></div>
        {state.error && <p role="alert" className="turno-error">{state.error}</p>}
        {!state.data ? <p>Cargando negocio…</p> : page === 'configuracion' ? canConfigure ?
          <TurnoSettings key={queue?.id || 'new'} workspaceId={workspace.id} queue={queue} onSaved={saved => state.replace({ ...state.data, queue: saved })} />
          : <p>Solo el propietario o administrador puede configurar el negocio.</p>
          : page === 'dashboard' ? canConfigure && queue ? <TurnoDashboard workspaceId={workspace.id} /> : <p>{canConfigure ? 'Configura primero tu negocio.' : 'El Dashboard es exclusivo para administradores.'}</p>
          : page === 'operadores' ? canConfigure && queue ? <TurnoOperators workspaceId={workspace.id} queue={queue} /> : <p>{canConfigure ? 'Configura primero tu negocio.' : 'Solo el administrador puede gestionar operadores.'}</p>
          : page === 'qr' ? queue ? <><h2>QR para los clientes</h2><p>Descarga el QR y colócalo en la zona de atención.</p><QueueQr url={location.origin + '/turno/' + queue.code} name={queue.name} code={queue.code} /></>
          : <p>El negocio todavía no está configurado.</p>
          : queue ? <TurnoOperation workspaceId={workspace.id} queue={queue} tickets={state.data.tickets} canChooseCounter={canConfigure} assignedCounter={state.data.assignedCounter} reload={state.reload} />
          : <><h2>Empecemos con tu negocio</h2><p>El negocio todavía no está configurado.</p>{canConfigure ? <a href={'/mi-turno/' + workspace.id + '/configuracion'}>Configurar Mi Turno →</a> : <p>Pide al administrador que configure las ventanillas.</p>}</>}
      </section>
    </div>
    {!canConfigure && smallScreen && <nav className="turno-operator-nav" aria-label="Navegación del operador">
      <a href={'/mi-turno/' + workspace.id + '/operacion'} aria-current={page === 'operacion' ? 'page' : undefined} onClick={event => navigate(event, '/mi-turno/' + workspace.id + '/operacion')}><TurnoIcon name="operation" /><span>Operación</span></a>
      {queue && <><a href={'/mi-turno/' + workspace.id + '/qr'} aria-current={page === 'qr' ? 'page' : undefined} onClick={event => navigate(event, '/mi-turno/' + workspace.id + '/qr')}><TurnoIcon name="qr" /><span>QR y cartel</span></a>
      <a href={'/turno/' + queue.code + '/pantalla'} target="_blank" rel="noreferrer" aria-label="Pantalla pública, abrir en otra pestaña"><TurnoIcon name="display" /><span>Pantalla pública ↗</span></a></>}
    </nav>}
  </main>
}
