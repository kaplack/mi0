import { useEffect, useState } from 'react'
import { catalogImageUrl, catalogPreviewImage } from '../../services/qrCatalog'
export function CatalogImage({ url, alt, preview = false, ...props }) {
  const [blob, setBlob] = useState(null)
  useEffect(() => {
    if (!preview || !url) return
    const controller = new AbortController()
    let objectUrl
    catalogPreviewImage(url, controller.signal).then(value => { objectUrl = value; if (!controller.signal.aborted) setBlob({ url, value }); else URL.revokeObjectURL(value) }).catch(() => {})
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [url, preview])
  const src = preview ? blob && blob.url === url ? blob.value : null : url ? catalogImageUrl(url) : null
  return src ? <img src={src} alt={alt} {...props} /> : <div className="cq-image-placeholder" role="img" aria-label={alt || 'Sin foto'}>▧</div>
}
