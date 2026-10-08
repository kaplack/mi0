import { CitaIcon } from './CitaUi'
import { citaPages } from './citaUtils'
export function CitaNavLink({ workspaceId, page, target, onNavigate, children }) {
  const path = '/mi-cita/' + workspaceId + '/' + target
  return <a href={path} aria-current={page === target ? 'page' : undefined} onClick={event => {
    if (!onNavigate || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault(); onNavigate(path)
  }}><CitaIcon name={target} /><span className="cita-menu-label">{children || citaPages[target]}</span></a>
}
export function CitaSidebar({ workspace, workspaces, page, canConfigure, isProfessional, collapsed, onCollapse, onNavigate, drawer = false }) {
  return <aside className="cita-sidebar" aria-label="Menú de Mi Cita">
    <div className="cita-sidebar-heading"><strong className="cita-menu-label">Mi Cita</strong><button type="button" className="cita-collapse" onClick={onCollapse} aria-label={drawer ? 'Cerrar menú' : collapsed ? 'Expandir menú' : 'Colapsar menú'} title={drawer ? 'Cerrar menú' : collapsed ? 'Expandir menú' : 'Colapsar menú'}>{drawer ? '✕' : <CitaIcon name="collapse" />}</button></div>
    <div className="cita-sidebar-space">
      {workspaces.length > 1 ? <label>Espacio<select value={workspace.id} onChange={event => onNavigate('/mi-cita/' + event.target.value)}>{workspaces.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label> : <><small>ESPACIO</small><strong>{workspace.name}</strong></>}
      <span>{isProfessional ? 'Profesional' : canConfigure ? 'Gestión' : 'Asistente'}</span>
    </div>
    <nav aria-label="Pantallas de Mi Cita">{Object.keys(citaPages).filter(key => isProfessional ? ['agenda', 'qr'].includes(key) : canConfigure || !['configuracion', 'qr'].includes(key)).map(key => <CitaNavLink key={key} workspaceId={workspace.id} page={page} target={key} onNavigate={onNavigate}>{isProfessional && key === 'agenda' ? 'Mi agenda' : undefined}</CitaNavLink>)}</nav>
  </aside>
}
