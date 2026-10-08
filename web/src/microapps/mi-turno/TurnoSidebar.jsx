import { useState } from 'react'
import { api } from '../../services/api'

export function TurnoIcon({ name }) {
  const paths = {
    operators: <><circle cx="9" cy="8" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M21 21v-3a6 6 0 0 0-3-5" /></>,
    operation: <><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M3 10h18M9 10v10" /></>,
    settings: <><path d="M4 6h16M4 12h16M4 18h16" /><circle cx="9" cy="6" r="2" /><circle cx="15" cy="12" r="2" /><circle cx="8" cy="18" r="2" /></>,
    qr: <><path d="M14 14h3v3h3v3h-6M20 14v-3M11 20v-5" /><rect x="3" y="3" width="6" height="6" rx="1" /><rect x="15" y="3" width="6" height="6" rx="1" /><rect x="3" y="15" width="6" height="6" rx="1" /></>,
    display: <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8M12 17v4" /></>,
    reports: <><path d="M4 20V4M4 20h17M9 16v-5M14 16V7M19 16v-8" /></>,
    collapse: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16M16 9l-3 3 3 3" /></>,
    close: <><path d="M10 4H4v16h6M14 8l4 4-4 4M8 12h10" /></>,
  }
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}
export function TurnoSidebar({ workspace, workspaces, queue, page, canConfigure, collapsed, onCollapse, reload, onNavigate }) {
  const [closing, setClosing] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const base = '/mi-turno/' + workspace.id
  async function closeDay() {
    setClosing(true); setError(''); setMessage('')
    try {
      await api('/turnos/workspace/' + workspace.id + '/close', { method: 'POST' })
      setConfirm(false); setMessage('Jornada cerrada. Los turnos pendientes vencieron.')
      await reload()
    } catch (failure) { setError(failure.message) } finally { setClosing(false) }
  }
  function item(key, label, icon) {
    return <a href={base + '/' + key} onClick={event => {
      if (!onNavigate || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      event.preventDefault(); onNavigate(base + '/' + key)
    }} aria-current={page === key ? 'page' : undefined} title={collapsed ? label : undefined}>
      <TurnoIcon name={icon} /><span className="turno-menu-label">{label}</span>
    </a>
  }
  return <aside className="turno-sidebar" aria-label="Menú de Mi Turno">
    <div className="turno-sidebar-heading"><strong className="turno-menu-label">Mi Turno</strong>
      <button className="turno-collapse" type="button" onClick={onCollapse} aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'} aria-expanded={!collapsed} title={collapsed ? 'Expandir menú' : 'Colapsar menú'}><TurnoIcon name="collapse" /></button>
    </div>
    <div className="turno-sidebar-space">
      {workspaces.length > 1 ? <label>Espacio<select disabled={closing} value={workspace.id} onChange={event => { const path = '/mi-turno/' + event.target.value + '/operacion'; if (onNavigate) onNavigate(path); else location.href = path }}>{workspaces.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        : <><small>ESPACIO</small><strong>{workspace.name}</strong></>}
      <span>{canConfigure ? 'Administrador' : 'Operador'}</span>
    </div>
    <nav aria-label="Pantallas de Mi Turno">
      {item('operacion', 'Operación', 'operation')}
      {canConfigure && item('configuracion', 'Configuración', 'settings')}
      {queue && item('qr', 'QR y cartel', 'qr')}
      {canConfigure && queue && item('operadores', 'Operadores', 'operators')}
      {canConfigure && <div className="turno-menu-pending" title="Reportes: próximamente"><TurnoIcon name="reports" /><span className="turno-menu-label">Reportes <small>Próximamente</small></span></div>}
      {queue && <a href={'/turno/' + queue.code + '/pantalla'} target="_blank" rel="noreferrer" title="Abrir pantalla pública en otra pestaña"><TurnoIcon name="display" /><span className="turno-menu-label">Pantalla pública <span aria-hidden="true">↗</span></span></a>}
    </nav>
    <div className="turno-sidebar-footer">
      {queue && canConfigure && <button className="turno-close-trigger" type="button" disabled={closing} onClick={() => setConfirm(true)} title="Cerrar jornada"><TurnoIcon name="close" /><span className="turno-menu-label">Cerrar jornada</span></button>}
      {confirm && <div className="turno-close-confirm">
        <p>¿Cerrar la jornada? Vencerán los turnos pendientes y llamados. No se puede deshacer.</p>
        <button disabled={closing} onClick={closeDay}>{closing ? 'Cerrando…' : 'Confirmar cierre'}</button>
        <button className="turno-secondary" disabled={closing} onClick={() => setConfirm(false)}>Cancelar</button>
      </div>}
      {error && <p className="turno-error" role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
    </div>
  </aside>
}
