import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
export function CatalogShare({ catalog }) {
  const isMenu = catalog.presentation === 'MENU'
  const label = isMenu ? 'carta' : 'catálogo'
  const url = location.origin + catalog.publicPath
  const [image, setImage] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  useEffect(() => { let alive = true; QRCode.toDataURL(url, { width: 800, margin: 4 }).then(value => { if (alive) setImage(value) }).catch(() => { if (alive) setError('No pudimos generar el QR. Recarga la página.') }); return () => { alive = false } }, [url])
  return <section className="cq-share"><span className="cq-eyebrow">SIEMPRE EL MISMO QR</span><h2>{isMenu ? 'Tu carta, lista para compartir' : 'Tu catálogo, listo para compartir'}</h2><p>Actualiza productos y precios sin cambiar el enlace ni volver a imprimir el QR.</p>
    {!catalog.published && <p className="cq-warning">Tu {label} está sin publicar. Usa «Publicar» en Mi negocio para que tus clientes puedan verlo.</p>}
    {image ? <img src={image} alt={(isMenu ? 'QR de la carta de ' : 'QR del catálogo de ') + catalog.name} width="260" height="260" /> : <p role="status">Generando QR…</p>}
    <label>Enlace de tu {label}<input readOnly value={url} onFocus={e => e.target.select()} /></label>
    <div className="cq-actions"><button className="primary-button" onClick={async () => { try { await navigator.clipboard.writeText(url); setNotice('Enlace copiado.'); setError('') } catch { setError('Selecciona el enlace y cópialo manualmente.') } }}>Copiar enlace</button>{image && <a className="secondary-button" href={image} download={(isMenu ? 'carta-' : 'catalogo-') + catalog.code + '.png'}>Descargar QR</a>}{catalog.published && <a className="secondary-button" href={url} target="_blank" rel="noreferrer">Abrir {label} ↗</a>}</div>
    {notice && <p role="status">{notice}</p>}{error && <p role="alert" className="cq-error">{error}</p>}
    {['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) && <p className="cq-local-note">Estás en localhost: este enlace y QR funcionan en esta computadora. Para escanear desde un celular necesitaremos una dirección accesible desde ese dispositivo.</p>}
  </section>
}
