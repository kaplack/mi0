import { useEffect, useRef, useState } from 'react'

export function AdminModuleIcon({ api, module, className = '' }) {
  const [src, setSrc] = useState('')
  useEffect(() => {
    if (!module.iconUrl) return
    let active = true, url
    api(`/admin/modules/${module.id}/icon`, { responseType: 'blob' }).then(blob => {
      if (active) { url = URL.createObjectURL(blob); setSrc(url) }
    }).catch(() => { if (active) setSrc('') })
    return () => { active = false; if (url) URL.revokeObjectURL(url) }
  }, [api, module.id, module.iconUrl])
  return <span className={`admin-module-icon ${className}`} aria-hidden="true">{module.iconUrl && src ? <img src={src} alt="" /> : module.code === 'mi-turno' ? '◷' : module.code?.startsWith('sorteos') ? '★' : '▦'}</span>
}

export function IconSettings({ api, module, onChange }) {
  const [selected, setSelected] = useState(null)
  const picker = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  useEffect(() => () => { if (selected) URL.revokeObjectURL(selected.url) }, [selected])
  async function choose(file) {
    if (!file) return
    setError(''); setMessage(''); setBusy(true)
    let bitmap
    try {
      if (!['image/png','image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) throw new Error('Elige un PNG o WebP de hasta 2 MB.')
      bitmap = await createImageBitmap(file)
      if (bitmap.width !== bitmap.height) throw new Error('El icono debe ser cuadrado. Elige una imagen con el mismo ancho y alto.')
      const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512
      canvas.getContext('2d').drawImage(bitmap,0,0,512,512)
      const blob = await new Promise(resolve => canvas.toBlob(resolve,'image/png'))
      if (!blob) throw new Error('No se pudo preparar la imagen. Elige otra.')
      setSelected({ blob, url: URL.createObjectURL(blob) })
    } catch (err) { setError(err.message || 'No se pudo abrir la imagen.') }
    finally { bitmap?.close(); setBusy(false) }
  }
  async function perform(action, success) {
    setBusy(true); setError(''); setMessage('')
    try { await action(); await onChange(); setSelected(null); setMessage(success) } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return <section className="icon-settings" aria-labelledby="icon-settings-title">
    <h2 id="icon-settings-title">Icono de la microapp</h2><p>Se muestra en el catálogo y en la ficha pública. Imagen cuadrada, idealmente de 512 × 512 px.</p>
    <div className="icon-settings-row">{selected ? <span className="admin-module-icon icon-large"><img src={selected.url} alt="Vista previa del nuevo icono" /></span> : <AdminModuleIcon api={api} module={module} className="icon-large" />}
      <div className="icon-picker"><input ref={picker} hidden aria-label="Seleccionar icono" type="file" accept="image/png,image/webp" disabled={busy} onChange={event => { const file = event.target.files[0]; event.target.value = ''; void choose(file) }} />
        <button className="icon-select-button" type="button" disabled={busy} onClick={() => picker.current.click()}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8" cy="8" r="1.5" /><path d="m3 17 5-5 4 4 3-3 6 6" /></svg>{busy ? 'Procesando…' : module.iconUrl || selected ? 'Cambiar imagen' : 'Elegir imagen'}</button>
        <small>PNG o WebP · Hasta 2 MB</small>
      </div>
    </div>
    {error && <p className="error" role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    <div className="icon-settings-actions">{selected && <><button type="button" disabled={busy} onClick={() => perform(() => api(`/admin/modules/${module.id}/icon`, { method: 'PUT', headers: { 'Content-Type': 'image/png' }, body: selected.blob }), 'Icono guardado.')}>{busy ? 'Guardando…' : 'Guardar icono'}</button><button type="button" className="secondary" disabled={busy} onClick={() => setSelected(null)}>Cancelar</button></>}
      {module.iconUrl && !selected && <button type="button" className="secondary" disabled={busy} onClick={() => perform(() => api(`/admin/modules/${module.id}/icon`, { method: 'DELETE' }), 'Icono eliminado. Se usará el icono predeterminado.')}>Quitar icono</button>}
    </div>
  </section>
}
