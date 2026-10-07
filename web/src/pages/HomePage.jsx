import { useMemo, useState } from 'react'
import { Logo } from '../components/Logo'
import { MicroappCard } from '../components/MicroappCard'
import { categories, tools } from '../data/catalog'

export function HomePage({ user, onLogin, onRegister, onOpenMi0, onLogout, onMicroappAdded }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Todas')
  const [menuOpen, setMenuOpen] = useState(false)

  const filtered = useMemo(() => tools.filter((tool) => {
    const matchesCategory = category === 'Todas' || tool.category === category
    const text = (tool.title + ' ' + tool.description).toLowerCase()
    return matchesCategory && text.includes(query.toLowerCase())
  }), [query, category])

  return (
    <div className="app-shell">
      <header className="site-header">
        <Logo />
        <nav className={menuOpen ? 'main-nav open' : 'main-nav'}>
          <a className="active" href="#herramientas">Herramientas</a>
          <a href="#como-funciona">Cómo funciona</a>
          <a href="#acerca">Acerca de</a>
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
        <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menú">☰</button>
      </header>

      <main>
        <section className="hero-section">
          <div className="hero-copy">
            <span className="eyebrow">MICROAPPS</span>
            <h1>Pequeñas herramientas<br />para <span>grandes ideas.</span></h1>
            <p>Usa nuestras microapps en línea o instálalas en tu dispositivo. Herramientas simples, rápidas y siempre contigo.</p>
            <div className="hero-search"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar herramientas, por ejemplo: QR, notas..." /><button aria-label="Buscar">→</button></div>
            <div className="category-row">{categories.map((item) => <button key={item} className={category === item ? 'selected' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="orbit orbit-one"></div><div className="orbit orbit-two"></div><div className="brand-tile">0_</div>
            <div className="floating-tool qr">▦</div><div className="floating-tool swap">⇄</div><div className="floating-tool note">▤</div>
            <div className="device-card"><div className="device-top"><Logo /></div><div className="device-title">Mis herramientas</div><div className="device-grid">{tools.slice(0, 6).map((tool) => <div key={tool.title} className={'mini-tool ' + tool.tone}>{tool.icon}</div>)}</div></div>
            <span className="device-note">En la web<br />y en tu dispositivo ↙</span>
          </div>
        </section>

        <section className="tools-section" id="herramientas">
          <div className="section-heading"><div><h2><span>★</span> Herramientas destacadas</h2><p>Pequeñas soluciones para problemas de todos los días.</p></div><button className="text-button" onClick={() => { setCategory('Todas'); setQuery('') }}>Ver todas →</button></div>
          <div className="content-grid">
            <div className="tools-grid">{filtered.length ? filtered.map((tool) => <MicroappCard key={tool.title} tool={tool} user={user} onAdded={onMicroappAdded} />) : <p className="empty-state">No encontramos herramientas con ese criterio.</p>}</div>
            <aside className="pwa-card"><div className="mini-brand">0_</div><h2>Lleva tus herramientas siempre contigo</h2><p>Instala mi0.app como PWA en tu dispositivo.</p><ul><li>✓ Funciona sin instalación</li><li>✓ Acceso rápido</li><li>✓ Siempre actualizadas</li></ul><button className="dark-button">Cómo instalar →</button></aside>
          </div>
        </section>

        <section className="benefits" id="como-funciona">
          <div><b>ϟ</b><h3>Sencillas de usar</h3><p>Sin configuraciones complicadas.</p></div>
          <div><b>▯</b><h3>En la web y en tu dispositivo</h3><p>Úsalas desde el navegador o instálalas como PWA.</p></div>
          <div><b>☁</b><h3>Siempre contigo</h3><p>Tus herramientas, donde las necesites.</p></div>
          <div><b>♡</b><h3>En constante crecimiento</h3><p>Nuevas herramientas todos los meses.</p></div>
        </section>
      </main>

      <footer id="acerca"><Logo /><p>Pequeñas herramientas para grandes ideas.</p><span>© 2026 mi0.app</span></footer>
      <nav className="mobile-nav"><a className="active" href="#">⌂<small>Inicio</small></a><a href="#herramientas">▦<small>Explorar</small></a><a href="#herramientas">♡<small>Favoritos</small></a><a href="#acerca">⚙<small>Ajustes</small></a></nav>
    </div>
  )
}
