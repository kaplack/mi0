import { useEffect, useRef, useState } from 'react'
import { getPublicQrCatalog } from '../../services/qrCatalog'
import { PublicCatalogMobile } from './PublicCatalogMobile'
import { SocialIcon } from './SocialIcon'
import { socialPlatform, socialNetworks } from './socialNetworks'
import { WhatsAppIcon } from './WhatsAppIcon'
import { CatalogImage } from './CatalogUi'
import { money } from './catalogUtils'
import './CatalogQr.css'
function ProductDetail({ product, catalog, onClose }) {
  const dialog = useRef(null)
  useEffect(() => { const d = dialog.current; d.showModal(); return () => d.close() }, [])
  return <dialog className="cq cq-dialog" ref={dialog} aria-labelledby="cq-detail-title" onCancel={onClose}><header><h2 id="cq-detail-title">{product.name}</h2><button aria-label="Cerrar detalle" onClick={onClose}>×</button></header><div className="cq-gallery">{product.images.length ? product.images.map((image, i) => <CatalogImage key={image.id} url={image.url} alt={product.name + ' · Foto ' + (i + 1)} />) : <CatalogImage alt={product.name} />}</div><p className="cq-detail-price">{money(product.priceCents, catalog.currency)}</p><p className="cq-description">{product.description}</p>{product.status === 'SOLD_OUT' ? <p className="cq-badge sold_out">Agotado</p> : catalog.whatsapp && <a className="primary-button cq-whatsapp-contact" aria-label="Consultar por WhatsApp" title="Consultar por WhatsApp" target="_blank" rel="noreferrer" href={'https://wa.me/' + catalog.whatsapp + '?text=' + encodeURIComponent('Hola, quisiera consultar por ' + product.name + ' (' + money(product.priceCents, catalog.currency) + ').')}><WhatsAppIcon/><span className="cq-whatsapp-label">Consultar por WhatsApp</span></a>}</dialog>
}
export function PublicCatalog({ code, slug }) {
  const [state, setState] = useState({ data: null, error: '' })
  const [category, setCategory] = useState('')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const resultsRef=useRef(null)
  useEffect(() => { const controller = new AbortController(); getPublicQrCatalog(code, { signal: controller.signal }, slug).then(data => { if (!controller.signal.aborted) setState({ data, error: '' }) }).catch(e => { if (!controller.signal.aborted) setState({ data: null, error: e.message }) }); return () => controller.abort() }, [code, slug])
  if (state.error) return <main className="cq cq-public"><div className="cq-empty"><h1>Catálogo no disponible</h1><p role="alert">{state.error}</p><a href="/">Ir a mi0.app</a></div></main>
  if (!state.data) return <main className="cq cq-public"><p role="status">Cargando catálogo…</p></main>
  const { catalog, categories, products } = state.data
  const isMenu = catalog.presentation === 'MENU'
  const visible = products.filter(p => (!category || p.categoryId === category) && (p.name + ' ' + p.description).toLocaleLowerCase().includes(query.toLocaleLowerCase()))
  return <main className="cq cq-public cq-public-full"><header className={'cq-store-header'+(catalog.bannerUrl?' cq-has-banner':'')}>{catalog.bannerUrl&&<CatalogImage className="cq-store-banner" url={catalog.bannerUrl} alt={'Portada de '+catalog.name}/> }<div className="cq-store-identity">{catalog.logoUrl && <CatalogImage url={catalog.logoUrl} alt={'Logo de ' + catalog.name} width="88" height="88" />}<span className="cq-eyebrow">{isMenu ? 'CARTA' : 'CATÁLOGO'}</span><h1>{catalog.name}</h1><p className="cq-description">{catalog.description}</p>{catalog.socialLinks.length>0&&<nav className="cq-social-links cq-banner-socials" aria-label="Redes sociales del negocio">{catalog.socialLinks.map((link,i)=>{const platform=socialPlatform(link);const label=socialNetworks.find(n=>n.id===platform)?.name || link.label;return <a key={i} href={link.url} aria-label={label} data-tooltip={label} target="_blank" rel="noreferrer"><SocialIcon platform={platform}/></a>})}</nav>}</div></header>
    <section ref={resultsRef} className="cq-store-content"><div className="cq-desktop-discovery"><label className="cq-search">{isMenu ? 'Buscar en la carta' : 'Buscar en el catálogo'}<input type="search" placeholder="¿Qué estás buscando?" value={query} onChange={e => setQuery(e.target.value)} /></label><nav className="cq-category-pills" aria-label="Categorías de productos"><button aria-pressed={!category} onClick={() => setCategory('')}>Todos</button>{categories.map(c => <button key={c.id} aria-pressed={category === c.id} onClick={() => setCategory(c.id)}>{c.name}</button>)}</nav></div><div className="cq-mobile-active-filters">{category&&<button type="button" onClick={()=>setCategory('')} aria-label="Quitar filtro de categoría">{categories.find(c=>c.id===category)?.name} ×</button>}{query&&<button type="button" onClick={()=>setQuery('')} aria-label="Quitar búsqueda">“{query}” ×</button>}</div><p className="cq-result-count" aria-live="polite">{visible.length} {visible.length === 1 ? 'producto' : 'productos'}</p>
    {visible.length ? <div className="cq-store-grid">{visible.map(product => <button className="cq-store-product" key={product.id} onClick={() => setSelected(product)} aria-label={'Ver ' + product.name}><div className="cq-product-photo"><CatalogImage url={product.images[0]?.url} alt={product.name} loading="lazy" />{product.status === 'SOLD_OUT' && <span className="cq-badge sold_out">Agotado</span>}</div><div className="cq-product-copy"><h2>{product.name}</h2><p>{product.description}</p><strong>{money(product.priceCents, catalog.currency)}</strong><span>Ver detalle →</span></div></button>)}</div> : <div className="cq-empty"><h2>{products.length ? 'No encontramos productos' : 'Pronto encontrarás nuestros productos aquí'}</h2><p>{products.length ? 'Prueba otra búsqueda o categoría.' : 'Estamos preparando nuestro catálogo.'}</p></div>}
    </section>{catalog.whatsapp && <a className="cq-whatsapp" aria-label="Consultar por WhatsApp" title="Consultar por WhatsApp" target="_blank" rel="noreferrer" href={'https://wa.me/' + catalog.whatsapp}><WhatsAppIcon/><span className="cq-whatsapp-label">Consultar por WhatsApp</span></a>}<footer className="cq-store-footer">{isMenu ? 'Carta creada con' : 'Catálogo creado con'} <a href="/">mi0.app</a></footer>
    <PublicCatalogMobile query={query} onQuery={setQuery} categories={categories} category={category} onCategory={setCategory} whatsapp={catalog.whatsapp} resultsRef={resultsRef}/>
    {selected && <ProductDetail product={selected} catalog={catalog} onClose={() => setSelected(null)} />}
  </main>
}
