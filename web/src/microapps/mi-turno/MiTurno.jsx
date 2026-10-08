import { useEffect, useState } from 'react'
import { Logo } from '../../components/Logo'
import { api, TOKEN_KEY } from '../../services/api'
import { useTurnoData } from './useTurnoData'
import { TurnoClient } from './TurnoClient'
import { TurnoDisplay } from './TurnoDisplay'
import { TurnoSettings } from './TurnoSettings'
import { TurnoOperation } from './TurnoOperation'
import { TurnoSidebar } from './TurnoSidebar'
import { TurnoOperators } from './TurnoOperators'
import { QueueQr } from './QueueQr'
import './MiTurno.css'

export function MiTurno({ code, publicDisplay = false, workspaceId, page = 'operacion', onBack, onLogin, onNavigate }) {
  return <div className={'turno' + (publicDisplay ? ' turno-monitor' : '')}>
    <header className="turno-header"><Logo />
      {!code && (onBack ? <button className="turno-back" onClick={onBack}>← Volver a Mi0</button> : <a className="turno-back" href="/">← Volver a Mi0</a>)}
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
  const [mobileOpen, setMobileOpen] = useState(false)
  const canConfigure = ['OWNER', 'ADMIN'].includes(state.data?.role || workspace.role)
  const queue = state.data?.queue
  const title = { operacion: 'Operación', configuracion: 'Configuración', qr: 'QR y cartel', operadores: 'Operadores' }[page] || 'Operación'
  function toggle() {
    setCollapsed(previous => { localStorage.setItem('mi0_turno_sidebar', previous ? 'expanded' : 'collapsed'); return !previous })
  }
  return <main className="turno-workspace">
    <section className="turno-intro"><span className="turno-kicker">{queue?.name || workspace.name}</span><h1>Mi Turno</h1><p>Una atención organizada, un turno a la vez.</p></section>
    <button className="turno-mobile-toggle turno-secondary" onClick={() => setMobileOpen(previous => !previous)} aria-expanded={mobileOpen} aria-controls="turno-sidebar-area">{mobileOpen ? 'Cerrar menú' : '☰ Menú de Mi Turno'}</button>
    <div className={'turno-layout' + (collapsed ? ' is-collapsed' : '') + (mobileOpen ? ' is-mobile-open' : '')}>
      <div id="turno-sidebar-area" className="turno-sidebar-area">
        <TurnoSidebar workspace={workspace} workspaces={workspaces} queue={queue} page={page} canConfigure={canConfigure} collapsed={collapsed} onCollapse={toggle} reload={state.reload} onNavigate={onNavigate ? path => { setMobileOpen(false); onNavigate(path) } : undefined} />
      </div>
      <section className="turno-panel turno-content" aria-label={title}>
        <div className="turno-content-heading"><span className="turno-eyebrow">MI TURNO / {title.toUpperCase()}</span></div>
        {state.error && <p role="alert" className="turno-error">{state.error}</p>}
        {!state.data ? <p>Cargando negocio…</p> : page === 'configuracion' ? canConfigure ?
          <TurnoSettings key={queue?.id || 'new'} workspaceId={workspace.id} queue={queue} onSaved={saved => state.replace({ ...state.data, queue: saved })} />
          : <p>Solo el propietario o administrador puede configurar el negocio.</p>
          : page === 'operadores' ? canConfigure && queue ? <TurnoOperators workspaceId={workspace.id} queue={queue} /> : <p>{canConfigure ? 'Configura primero tu negocio.' : 'Solo el administrador puede gestionar operadores.'}</p>
          : page === 'qr' ? queue ? <><h2>QR para los clientes</h2><p>Descarga el QR y colócalo en la zona de atención.</p><QueueQr url={location.origin + '/turno/' + queue.code} name={queue.name} code={queue.code} /></>
          : <p>El negocio todavía no está configurado.</p>
          : queue ? <TurnoOperation workspaceId={workspace.id} queue={queue} tickets={state.data.tickets} canChooseCounter={canConfigure} assignedCounter={state.data.assignedCounter} reload={state.reload} />
          : <><h2>Empecemos con tu negocio</h2><p>El negocio todavía no está configurado.</p>{canConfigure ? <a href={'/mi-turno/' + workspace.id + '/configuracion'}>Configurar Mi Turno →</a> : <p>Pide al administrador que configure las ventanillas.</p>}</>}
      </section>
    </div>
  </main>
}
