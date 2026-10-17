import { useEffect, useRef, useState } from 'react'
import { ScreenshotUploader } from './ScreenshotUploader'

function Screenshot({ api, moduleId, image }) {
  const [src, setSrc] = useState('')
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (image.localUrl) return
    let active = true, url
    api(`/admin/modules/${moduleId}/screenshots/${image.id}`, { responseType: 'blob' }).then(blob => {
      if (active) { url = URL.createObjectURL(blob); setSrc(url) }
    }).catch(() => { if (active) setFailed(true) })
    return () => { active = false; if (url) URL.revokeObjectURL(url) }
  }, [api, moduleId, image.id, image.localUrl])
  return (image.localUrl || src) ? <img src={image.localUrl || src} alt={image.caption} /> : <span className="empty">{failed ? 'No se pudo cargar la captura.' : 'Cargando captura…'}</span>
}

export function PublicProfile({ api, moduleId, onSaved }) {
  const [profile, setProfile] = useState(null)
  const [features, setFeatures] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState(false)
  const [uploadCount, setUploadCount] = useState(0)
  const uploads = useRef(new Set())
  const removed = useRef(new Set())
  const urls = useRef(new Set())
  useEffect(() => {
    const current = urls.current
    return () => { current.forEach(url => URL.revokeObjectURL(url)); current.clear() }
  }, [])
  const pendingImages = uploadCount > 0 || profile?.screenshots.some(image => image.status === 'failed')
  async function uploadImage(entry) {
    if (uploads.current.has(entry.id)) return
    uploads.current.add(entry.id); setUploadCount(uploads.current.size)
    setProfile(previous => ({ ...previous, screenshots: previous.screenshots.map(image => image.id === entry.id ? { ...image, status: 'uploading', error: '' } : image) }))
    try {
      const { profile: saved } = await api(`/admin/modules/${moduleId}/screenshots`, { method: 'POST', headers: { 'Content-Type': entry.file.type, 'X-Upload-Id': entry.id }, body: entry.file })
      if (removed.current.has(entry.id)) {
        await api(`/admin/modules/${moduleId}/screenshots/${entry.id}`, { method: 'DELETE' }).catch(() => {})
      } else {
        const uploaded = saved.screenshots.find(image => image.id === entry.id)
        if (!uploaded) throw new Error('No se pudo confirmar la carga. Reintenta.')
        setProfile(previous => ({ ...previous, screenshots: previous.screenshots.map(image => image.id === entry.id ? { ...image, published: false, status: 'ready', error: '' } : image) }))
      }
    } catch (err) {
      if (removed.current.has(entry.id)) await api(`/admin/modules/${moduleId}/screenshots/${entry.id}`, { method: 'DELETE' }).catch(() => {})
      else setProfile(previous => ({ ...previous, screenshots: previous.screenshots.map(image => image.id === entry.id ? { ...image, status: 'failed', error: err.message } : image) }))
    } finally { uploads.current.delete(entry.id); setUploadCount(uploads.current.size) }
  }
  function selectImages(files) {
    setMessage('')
    const entries = files.map(file => {
      const localUrl = URL.createObjectURL(file); urls.current.add(localUrl)
      return { id: crypto.randomUUID(), caption: `Captura de ${profile.name}`, file, localUrl, published: false, status: 'uploading' }
    })
    setProfile(previous => ({ ...previous, screenshots: [...previous.screenshots, ...entries] }))
    entries.forEach(entry => { void uploadImage(entry) })
  }
  function removeImage(image) {
    removed.current.add(image.id)
    setMessage(''); setProfile(previous => ({ ...previous, screenshots: previous.screenshots.filter(entry => entry.id !== image.id) }))
    if (image.localUrl) { URL.revokeObjectURL(image.localUrl); urls.current.delete(image.localUrl) }
    if (!image.published && !uploads.current.has(image.id)) void api(`/admin/modules/${moduleId}/screenshots/${image.id}`, { method: 'DELETE' }).catch(() => {})
  }
  useEffect(() => {
    const controller = new AbortController()
    api(`/admin/modules/${moduleId}/profile`, { signal: controller.signal }).then(({ profile }) => { setProfile(profile); setFeatures(profile.features.join('\n')) }).catch(err => { if (!controller.signal.aborted) setError(err.message) })
    return () => controller.abort()
  }, [api, moduleId])
  async function perform(action, success) {
    setBusy(true); setError(''); setMessage('')
    try { await action(); setMessage(success) } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  function move(index, offset) {
    setProfile(previous => {
      const screenshots = [...previous.screenshots]
      ;[screenshots[index], screenshots[index + offset]] = [screenshots[index + offset], screenshots[index]]
      return { ...previous, screenshots }
    })
  }
  return <section className="data-panel profile-editor">
    <div className="panel-heading"><h2>Ficha pública</h2>{profile && <button type="button" className="text-button" disabled={busy} onClick={() => setPreview(!preview)}>{preview ? 'Editar ficha' : 'Vista previa'}</button>}</div>
    <p className="empty">Edita tu ficha y guarda para publicar los cambios. Usa imágenes con datos de ejemplo.</p>
    {error && <p className="error" role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    {!profile ? !error && <p role="status">Cargando ficha…</p> : preview ? <div className="profile-preview">
      <h3>{profile.name}</h3><p>{profile.description}</p><p className="profile-body">{profile.details}</p>
      <ul>{features.split('\n').filter(line => line.trim()).map((line, i) => <li key={i}>{line}</li>)}</ul>
      <div className="profile-preview-gallery">{profile.screenshots.map(image => <figure key={image.id}><Screenshot api={api} moduleId={moduleId} image={image} /><figcaption>{image.caption}</figcaption></figure>)}</div>
      <p className="empty">Vista previa de los cambios actuales.</p>
    </div> : <form onSubmit={event => {
      event.preventDefault()
      if (pendingImages) return
      perform(async () => {
        const { profile: saved } = await api(`/admin/modules/${moduleId}/profile`, { method: 'PUT', body: JSON.stringify({ description: profile.description, details: profile.details, features: features.split('\n').map(line => line.trim()).filter(Boolean), screenshots: profile.screenshots.map(({ id, caption }) => ({ id, caption })) }) })
        setProfile(saved); setFeatures(saved.features.join('\n')); onSaved?.(saved)
      }, 'Ficha pública guardada.')
    }}>
      <fieldset disabled={busy}>
        <label>Descripción breve<input required maxLength={300} value={profile.description} onChange={event => setProfile({ ...profile, description: event.target.value })} /></label>
        <label htmlFor="profile-details">Descripción completa</label><textarea id="profile-details" rows={7} maxLength={12000} value={profile.details} onChange={event => setProfile({ ...profile, details: event.target.value })} />
        <label htmlFor="profile-features">Funciones principales</label><textarea id="profile-features" rows={5} value={features} onChange={event => setFeatures(event.target.value)} aria-describedby="features-hint" />
        <small id="features-hint">Una función por línea. Hasta 20 funciones de 200 caracteres.</small>
        <section className="capture-manager" aria-labelledby="captures-title">
          <div className="capture-heading"><div><h3 id="captures-title">Capturas de pantalla</h3><p>Muéstrales cómo se ve tu microapp.</p></div><span className="capture-counter">{profile.screenshots.length}/8</span></div>
          <ScreenshotUploader remaining={Math.max(0, 8 - profile.screenshots.length)} onSelect={selectImages} />
          <p className="capture-hint">Las fotos, descripciones y el orden se publican juntos al guardar.</p>
          {!profile.screenshots.length && <p className="capture-empty">Tu galería está vacía. Agrega la primera captura para mostrar tu microapp en acción.</p>}
          <div className="profile-images">{profile.screenshots.map((image, index) => <article className="profile-image" key={image.id}>
            <div className="capture-thumbnail"><Screenshot api={api} moduleId={moduleId} image={image} /><span className="capture-position">{index + 1}</span></div>
            <div className="capture-info"><span className="capture-order-label">{index === 0 ? 'Primera en la galería' : `Captura ${index + 1}`}</span>
              <label>Descripción de captura {index + 1}<input required maxLength={180} value={image.caption} onChange={event => setProfile({ ...profile, screenshots: profile.screenshots.map(entry => entry.id === image.id ? { ...entry, caption: event.target.value } : entry) })} /></label>
              {image.status === 'uploading' && <span className="capture-upload-status" role="status">Subiendo… Puedes escribir la descripción.</span>}
              {image.status === 'failed' && <div className="capture-upload-error"><span role="alert">{image.error}</span><button type="button" className="secondary" onClick={() => uploadImage(image)}>Reintentar<span className="sr-only"> captura {index + 1}</span></button></div>}
            </div>
            <div className="profile-image-actions"><span>Ordenar</span><button type="button" className="secondary" disabled={!index} title="Mover antes" aria-label={`Mover captura ${index + 1} antes`} onClick={() => move(index, -1)}>←</button><button type="button" className="secondary" disabled={index === profile.screenshots.length - 1} title="Mover después" aria-label={`Mover captura ${index + 1} después`} onClick={() => move(index, 1)}>→</button><button type="button" className="secondary capture-delete" title="Eliminar captura" aria-label={`Eliminar captura ${index + 1}`} onClick={() => removeImage(image)}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" /></svg></button></div>
          </article>)}</div>
        </section>
        {pendingImages && <p className="capture-hint">{uploadCount > 0 ? 'Terminando de cargar las fotos… Puedes seguir editando.' : 'Reintenta o quita las fotos que no se pudieron cargar para guardar.'}</p>}
        <button type="submit" disabled={pendingImages}>{busy ? 'Procesando…' : 'Guardar ficha pública'}</button>
      </fieldset>
    </form>}
  </section>
}
