import { useEffect, useRef, useState } from 'react'
import { Logo } from '../../components/Logo'
import { TOKEN_KEY } from '../../services/api'
import { useCitaResource } from './useCitaData'
import { CitaPublic } from './CitaPublic'
import { CitaSidebar, CitaNavLink } from './CitaSidebar'
import { citaPages } from './citaUtils'
import { CitaIcon } from './CitaUi'
import { CitaSettings } from './CitaSettings'
import { CitaProfessionals } from './CitaProfessionals'
import { CitaAgenda } from './CitaAgenda'
import { CitaQr } from './CitaQr'
import './MiCita.css'
export function MiCita({ code, workspaceId, page, onBack, onLogin, onNavigate }) {
  return <div className="cita"><header className="cita-header"><Logo />{!code && (onBack ? <button className="cita-back" onClick={onBack}>← Volver a Mi0</button> : <a className="cita-back" href="/">← Volver a Mi0</a>)}</header>
    {code ? <main className="cita-public-main"><CitaPublic key={code} code={code} /></main> : <CitaManager workspaceId={workspaceId} page={page} onLogin={onLogin} onNavigate={onNavigate} />}
  </div>
}
function CitaManager({ workspaceId, page, onLogin, onNavigate }) {
  const loggedIn = Boolean(localStorage.getItem(TOKEN_KEY))
  const state = useCitaResource(loggedIn ? '/workspaces' : null)
  if (!loggedIn) return <main className="cita-public-main"><section className="cita-panel"><h1>Mi Cita</h1><p>Inicia sesión para configurar tu consultorio y gestionar las citas.</p><button onClick={onLogin}>Iniciar sesión</button></section></main>
  if (!state.data) return <main className="cita-public-main"><section className="cita-panel">{state.error ? <><p className="cita-error" role="alert">{state.error}</p><button onClick={state.reload}>Reintentar</button><button className="cita-secondary" onClick={onLogin}>Iniciar sesión</button></> : <p role="status">Cargando espacios…</p>}</section></main>
  const workspaces = state.data.workspaces || []
  const workspace = workspaces.find(w => w.id === workspaceId) || (!workspaceId ? workspaces[0] : null)
  if (!workspace) return <main className="cita-public-main"><section className="cita-panel"><h1>Mi Cita</h1><p>No tienes acceso a este espacio activo.</p><a href="/">Volver a Mi0</a></section></main>
  return <CitaWorkspace key={workspace.id} workspace={workspace} workspaces={workspaces} requestedPage={page} onNavigate={onNavigate} />
}
function CitaWorkspace({ workspace, workspaces, requestedPage, onNavigate }) {
  const state = useCitaResource('/citas/workspace/' + workspace.id)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('mi0_cita_sidebar') === 'collapsed')
  const [smallScreen, setSmallScreen] = useState(() => matchMedia('(max-width: 760px)').matches)
  const [menuOpen, setMenuOpen] = useState(false)
  const drawerRef = useRef(null)
  useEffect(() => {
    const media = matchMedia('(max-width: 760px)')
    const update = () => { setSmallScreen(media.matches); if (!media.matches) setMenuOpen(false) }
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    const drawer = drawerRef.current
    if (!drawer) return
    if (menuOpen && !drawer.open) drawer.showModal()
    else if (!menuOpen && drawer.open) drawer.close()
  }, [menuOpen])
  const isProfessional = state.data?.accessRole === 'PROFESSIONAL'
  const canConfigure = state.data?.accessRole === 'MANAGEMENT'
  const page = requestedPage || 'agenda'
  const clinic = state.data?.clinic
  function navigate(path) { setMenuOpen(false); if (onNavigate) onNavigate(path); else location.href = path }
  function toggleCollapse() { setCollapsed(value => { localStorage.setItem('mi0_cita_sidebar', value ? 'expanded' : 'collapsed'); return !value }) }
  const sidebarProps = { workspace, workspaces, page, canConfigure, isProfessional, onNavigate: navigate }
  return <main className={'cita-workspace' + (!canConfigure && smallScreen ? ' cita-assistant-workspace' : '')}>
    <section className="cita-intro"><span className="cita-kicker">{clinic?.name || workspace.name}</span><h1>Mi Cita</h1><p>Tu agenda organizada, una cita a la vez.</p>{canConfigure && smallScreen && <button className="cita-admin-menu-toggle cita-secondary" aria-label="Abrir menú" aria-expanded={menuOpen} aria-controls="cita-admin-drawer" onClick={() => setMenuOpen(true)}><CitaIcon name="menu" /></button>}</section>
    {canConfigure && <dialog id="cita-admin-drawer" className="cita-admin-drawer" ref={drawerRef} aria-label="Menú de administración" onCancel={() => setMenuOpen(false)} onClose={() => setMenuOpen(false)}><CitaSidebar {...sidebarProps} drawer collapsed={false} onCollapse={() => setMenuOpen(false)} /></dialog>}
    <div className={'cita-layout' + (smallScreen ? ' cita-mobile-layout' : collapsed ? ' is-collapsed' : '')}>{!smallScreen && <div className="cita-sidebar-area"><CitaSidebar {...sidebarProps} collapsed={collapsed} onCollapse={toggleCollapse} /></div>}
      <section className="cita-panel cita-content" aria-label={citaPages[page]}><span className="cita-eyebrow">MI CITA / {citaPages[page]?.toUpperCase()}</span>
        {state.error && <p className="cita-error" role="alert">{state.error} <button onClick={state.reload}>Reintentar</button></p>}
        {!state.data ? !state.error && <p role="status">Cargando consultorio…</p> : ['configuracion', 'profesionales'].includes(page) && !canConfigure ? <p>Esta sección está disponible únicamente para el personal de gestión.</p>
          : page === 'configuracion' ? <CitaSettings key={clinic?.id || 'new'} workspaceId={workspace.id} clinic={clinic} workspaceName={workspace.name} reload={state.reload} />
          : !clinic ? <div className="cita-empty"><h2>Empecemos con tu consultorio</h2><p>Mi Cita todavía no está configurada.</p>{canConfigure ? <CitaNavLink workspaceId={workspace.id} page={page} target="configuracion" onNavigate={navigate}>Configurar Mi Cita →</CitaNavLink> : <p>Pide al administrador que configure el consultorio.</p>}</div>
          : page === 'profesionales' ? <CitaProfessionals workspaceId={workspace.id} clinic={clinic} professionals={state.data.professionals} today={state.data.today} canConfigure={canConfigure} reload={state.reload} />
          : page === 'qr' ? <CitaQr clinic={clinic} professional={isProfessional ? state.data.professionals[0] : null} />
          : <CitaAgenda key={page} workspaceId={workspace.id} clinic={clinic} professionals={state.data.professionals} ownProfessional={isProfessional ? state.data.professionals[0] : null} pending={page === 'pendientes'} today={state.data.today} />}
      </section>
    </div>
    {!canConfigure && smallScreen && <nav className="cita-assistant-nav" aria-label={isProfessional ? 'Navegación del profesional' : 'Navegación de la asistente'}>{(isProfessional ? ['agenda', 'qr'] : ['agenda', 'pendientes', 'profesionales']).map(target => <CitaNavLink key={target} workspaceId={workspace.id} page={page} target={target} onNavigate={navigate}>{isProfessional && target === 'agenda' ? 'Mi agenda' : undefined}</CitaNavLink>)}</nav>}
  </main>
}
