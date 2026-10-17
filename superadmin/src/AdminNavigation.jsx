import { useEffect, useRef, useState } from 'react'

import { sections } from './adminSections'

function Icon({ name }) {
  const paths = {
    home: <><path d="m3 10 9-7 9 7v10H3Z" /><path d="M9 20v-7h6v7" /></>,
    users: <><circle cx="9" cy="8" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5" /></>,
    store: <><path d="M4 10v11h16V10M3 4h18l1 6a3 3 0 0 1-5 2 3 3 0 0 1-5 0 3 3 0 0 1-5 0 3 3 0 0 1-5-2ZM9 21v-6h6v6" /></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    tag: <><path d="M3 3h9l9 9-9 9-9-9Z" /><circle cx="8" cy="8" r="1" /></>,
    document: <><path d="M5 3h10l4 4v14H5ZM14 3v5h5M8 12h8M8 16h6" /></>,
    wallet: <><rect x="3" y="5" width="18" height="15" rx="2" /><path d="M3 8V5l14-3v3m-1 7h5v5h-5Z" /></>,
    more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
    collapse: <path d="m14 6-6 6 6 6" />,
  }
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

export function AdminNavigation({ section, onNavigate, pending, user, onLogout }) {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('mi0_admin_sidebar_collapsed') === 'true')
  const dialogRef = useRef(null)
  const moreRef = useRef(null)
  const primary = ['overview', 'modules', 'pending']
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)')
    const close = () => { if (media.matches) dialogRef.current?.close() }
    media.addEventListener('change', close)
    return () => media.removeEventListener('change', close)
  }, [])
  function navigate(key) {
    dialogRef.current?.close()
    onNavigate(key)
  }
  function navButton(item) {
    const count = pending[item.key]
    return <button key={item.key} type="button" className={`nav-item ${section === item.key ? 'is-active' : ''}`} aria-current={section === item.key ? 'page' : undefined} title={item.label} data-tooltip={item.label} onClick={() => navigate(item.key)}>
      <span className="nav-icon"><Icon name={item.icon} />{count > 0 && <span className="nav-badge" aria-label={`${count} pendientes`}>{count > 99 ? '99+' : count}</span>}</span><span className="nav-label">{item.label}</span>
    </button>
  }
  return <>
    <aside className={`admin-sidebar ${collapsed ? 'is-collapsed' : ''}`}>
      <div className="sidebar-brand"><div className="brand">mi<span>0</span></div><span className="sidebar-caption">SUPERADMIN</span></div>
      <button className="sidebar-toggle" type="button" aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'} aria-expanded={!collapsed} onClick={() => { setCollapsed(!collapsed); localStorage.setItem('mi0_admin_sidebar_collapsed', String(!collapsed)) }}><Icon name="collapse" /><span className="nav-label">Colapsar menú</span></button>
      <nav aria-label="Administración">{sections.map(navButton)}</nav>
      <div className="sidebar-account"><span className="nav-label">{user.name}</span><button className="text-button" onClick={onLogout}>Salir</button></div>
    </aside>
    <nav className="mobile-nav" aria-label="Navegación principal">
      {sections.filter(item => primary.includes(item.key)).map(navButton)}
      <button ref={moreRef} className={`nav-item ${!primary.includes(section) ? 'is-active' : ''}`} type="button" aria-haspopup="dialog" onClick={() => dialogRef.current.showModal()}><Icon name="more" /><span>Más</span></button>
    </nav>
    <dialog ref={dialogRef} className="menu-sheet" aria-labelledby="menu-title" onClick={event => { if (event.target === event.currentTarget) event.currentTarget.close() }} onClose={() => moreRef.current?.focus()}>
      <div className="menu-sheet-content"><div className="panel-heading"><h2 id="menu-title">Menú del superadmin</h2><button type="button" className="sheet-close" aria-label="Cerrar menú" onClick={() => dialogRef.current.close()}>×</button></div>
        <nav className="menu-grid" aria-label="Todas las secciones">{sections.map(navButton)}</nav>
        <div className="sheet-account"><span>{user.name}</span><button className="text-button" onClick={() => { dialogRef.current.close(); onLogout() }}>Salir</button></div>
      </div>
    </dialog>
  </>
}
