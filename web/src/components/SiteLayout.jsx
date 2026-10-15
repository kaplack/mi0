import { useState } from 'react'
import { Logo } from './Logo'

export function SiteHeader({ user, onLogin, onRegister, onOpenMi0, onLogout, about = false, howItWorks = false }) {
  const [menuOpen, setMenuOpen] = useState(false)
  return <header className="site-header">
    <Logo />
    <nav id="site-navigation" aria-label="Navegación principal" className={menuOpen ? 'main-nav open' : 'main-nav'}>
      <a className={about || howItWorks ? undefined : 'active'} href="/#herramientas">Herramientas</a>
      <a className={howItWorks ? 'active' : undefined} aria-current={howItWorks ? 'page' : undefined} href="/como-funciona">Cómo funciona</a>
      <a className={about ? 'active' : undefined} aria-current={about ? 'page' : undefined} href="/quienes-somos">Quiénes somos</a>
      <div className="mobile-auth-actions">
        {user ? <>
          <button type="button" onClick={() => { onOpenMi0(); setMenuOpen(false) }}>Mi0</button>
          <button type="button" onClick={() => { onLogout(); setMenuOpen(false) }}>Salir</button>
        </> : <>
          <button type="button" onClick={() => { onLogin(); setMenuOpen(false) }}>Iniciar sesión</button>
          <button className="mobile-create-account" type="button" onClick={() => { onRegister(); setMenuOpen(false) }}>Crear cuenta</button>
        </>}
      </div>
    </nav>
    <div className="header-actions">
      {user ? <>
        <button className="secondary-button" onClick={onOpenMi0}>Mi0</button>
        <button className="secondary-button" onClick={onLogout}>Salir</button>
      </> : <>
        <button className="secondary-button" onClick={onLogin}>Iniciar sesión</button>
        <button className="primary-button" onClick={onRegister}>Crear cuenta</button>
      </>}
    </div>
    <button type="button" className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-controls="site-navigation" aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}>{menuOpen ? '×' : '☰'}</button>
  </header>
}

export function SiteFooter() {
  return <footer id="acerca" className="site-footer">
    <Logo /><p>Pequeñas herramientas para grandes ideas.</p>
    <a href="/como-funciona">Cómo funciona</a>
    <a href="/quienes-somos">Quiénes somos</a>
    <span>© {new Date().getFullYear()} mi0.app</span>
  </footer>
}
