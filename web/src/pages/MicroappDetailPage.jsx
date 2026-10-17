import { useEffect, useRef, useState } from 'react'
import { MicroappIcon } from '../components/MicroappIcon'
import { SiteHeader, SiteFooter } from '../components/SiteLayout'
import { api } from '../services/api'
import { tools } from '../data/catalog'
import './MicroappDetailPage.css'
const mediaUrl = url => `${(import.meta.env.VITE_API_URL || '').replace(/\/$/, '')}${url}`

export function MicroappDetailPage({ code, onUse, ...headerProps }) {
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)
  const [selected, setSelected] = useState(null)
  const dialog = useRef(null)
  const title = useRef(null)
  useEffect(() => {
    const controller = new AbortController()
    api(`/catalog/${encodeURIComponent(code)}`, { signal: controller.signal }).then(({ profile }) => { if (!controller.signal.aborted) setProfile(profile) })
      .catch(err => { if (!controller.signal.aborted) setError(err.message) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [code, revision])
  useEffect(() => {
    const oldTitle = document.title
    document.title = profile ? `${profile.name} | mi0.app` : 'Microapp | mi0.app'
    title.current?.focus()
    return () => { document.title = oldTitle }
  }, [profile])
  useEffect(() => {
    if (selected === null) return
    const node = dialog.current
    node.showModal()
    return () => node.close()
  }, [selected])
  const visual = tools.find(tool => tool.code === code)
  return <div className="app-shell microapp-detail-page">
    <SiteHeader {...headerProps} />
    <main className="microapp-detail-main">
      <a className="detail-back" href="/#herramientas">← Volver al catálogo</a>
      {loading ? <p role="status">Cargando microapp…</p> : error ? <div role="alert"><p>{error}</p><button className="secondary-button" onClick={() => { setLoading(true); setError(''); setRevision(value => value + 1) }}>Reintentar</button></div> : profile && <>
        <section className="detail-hero">
          <div className={'tool-icon ' + (visual?.tone || 'mint')} aria-hidden="true"><MicroappIcon url={profile.iconUrl} fallback={visual?.icon || '▦'} /></div>
          <div><span className="eyebrow">MICROAPP DE MI0</span><h1 ref={title} tabIndex={-1}>{profile.name}</h1><p>{profile.description}</p><div className="detail-tags">{profile.categories.map(category => <span key={category.id}>{category.name}</span>)}{profile.free && <span>Gratis</span>}</div></div>
          <button className="primary-button detail-use-desktop" onClick={() => onUse(code)}>Usar microapp →</button>
        </section>
        {profile.screenshots.length > 0 && <section className="detail-section" aria-labelledby="screenshots-title"><h2 id="screenshots-title">Conoce {profile.name}</h2><p>Explora sus pantallas. Toca una captura para ampliarla.</p><div className="detail-gallery">{profile.screenshots.map(image => <figure key={image.id}><button type="button" onClick={() => setSelected(image)} aria-label={`Ampliar: ${image.caption}`}><img src={mediaUrl(image.url)} alt={image.caption} loading="lazy" /></button><figcaption>{image.caption}</figcaption></figure>)}</div></section>}
        {profile.details && profile.details !== profile.description && <section className="detail-section"><h2>Acerca de esta microapp</h2><p className="detail-description">{profile.details}</p></section>}
        {profile.features.length > 0 && <section className="detail-section"><h2>Qué puedes hacer</h2><ul className="detail-features">{profile.features.map((feature, index) => <li key={index}><span aria-hidden="true">✓</span>{feature}</li>)}</ul></section>}
        <div className="detail-mobile-action"><button className="primary-button" onClick={() => onUse(code)}>Usar microapp →</button></div>
      </>}
    </main>
    <SiteFooter />
    <dialog className="detail-lightbox" ref={dialog} aria-label="Captura ampliada" onCancel={() => setSelected(null)} onClick={event => { if (event.target === event.currentTarget) setSelected(null) }}>
      <button type="button" className="secondary-button" aria-label="Cerrar captura" onClick={() => setSelected(null)}>Cerrar ×</button>
      {selected && <figure><img src={mediaUrl(selected.url)} alt={selected.caption} /><figcaption>{selected.caption}</figcaption></figure>}
    </dialog>
  </div>
}
