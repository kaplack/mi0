import { MicroappIcon } from '../components/MicroappIcon'
import { useMemo, useState } from 'react'
import { Logo } from '../components/Logo'
import { SiteHeader, SiteFooter } from '../components/SiteLayout'
import { MicroappCard } from '../components/MicroappCard'
import { useCatalog } from '../data/useCatalog'

export function HomePage({ user, onLogin, onRegister, onOpenMi0, onLogout, onOpenMicroapp }) {
  const { tools, categories: catalogCategories, loading, error } = useCatalog()
  const categories = [{ id: 'Todas', name: 'Todas' }, { id: 'Gratis', name: 'Gratis' }, ...catalogCategories]
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Todas')

  const filtered = useMemo(() => tools.filter((tool) => {
    const matchesCategory = category === 'Todas' || (category === 'Gratis' ? tool.free === true : tool.categories.some(item => item.id === category))
    const text = (tool.title + ' ' + tool.description).toLowerCase()
    return matchesCategory && text.includes(query.toLowerCase())
  }), [query, category, tools])

  return (
    <div className="app-shell">
      <SiteHeader user={user} onLogin={onLogin} onRegister={onRegister} onOpenMi0={onOpenMi0} onLogout={onLogout} />

      <main>
        <section className="hero-section">
          <div className="hero-copy">
            <span className="eyebrow">MICROAPPS</span>
            <h1>Pequeñas herramientas<br />para <span>grandes ideas.</span></h1>
            <p>Usa nuestras microapps en línea o instálalas en tu dispositivo. Herramientas simples, rápidas y siempre contigo.</p>
            <div className="hero-search"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar herramientas, por ejemplo: Sorteos..." /><button aria-label="Buscar">→</button></div>
            <div className="category-row">{categories.map((item) => <button key={item.id} className={category === item.id ? 'selected' : ''} aria-pressed={category === item.id} onClick={() => setCategory(item.id)}>{item.name}</button>)}</div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="orbit orbit-one"></div><div className="orbit orbit-two"></div><div className="brand-tile">0_</div>
            <div className="floating-tool qr">★</div>
            <div className="device-card"><div className="device-top"><Logo /></div><div className="device-title">Mis herramientas</div><div className="device-grid">{tools.slice(0, 6).map((tool) => <div key={tool.title} className={'mini-tool ' + tool.tone}><MicroappIcon url={tool.iconUrl} fallback={tool.icon} /></div>)}</div></div>
            <span className="device-note">En la web<br />y en tu dispositivo ↙</span>
          </div>
        </section>

        <section className="tools-section" id="herramientas">
          <div className="section-heading"><div><h2><span>★</span> Herramientas destacadas</h2><p>Pequeñas soluciones para problemas de todos los días.</p></div><button className="text-button" onClick={() => { setCategory('Todas'); setQuery('') }}>Ver todas →</button></div>
          <div className="content-grid">
            <div className="tools-grid">{loading ? <p role="status">Cargando herramientas…</p> : error ? <p role="alert">No pudimos cargar el catálogo. {error}</p> : filtered.length ? filtered.map((tool) => <MicroappCard key={tool.title} tool={tool} onOpen={onOpenMicroapp} />) : <p className="empty-state">No encontramos herramientas con ese criterio.</p>}</div>
            <aside className="pwa-card"><div className="mini-brand">0_</div><h2>Lleva tus herramientas siempre contigo</h2><p>Instala mi0.app como PWA en tu dispositivo.</p><ul><li>✓ Funciona sin instalación</li><li>✓ Acceso rápido</li><li>✓ Siempre actualizadas</li></ul><button className="dark-button">Cómo instalar →</button></aside>
          </div>
        </section>

      </main>

      <SiteFooter />
      <nav className="mobile-nav"><a className="active" href="#">⌂<small>Inicio</small></a><a href="#herramientas">▦<small>Explorar</small></a><a href="#herramientas">♡<small>Favoritos</small></a><a href="#acerca">⚙<small>Ajustes</small></a></nav>
    </div>
  )
}
