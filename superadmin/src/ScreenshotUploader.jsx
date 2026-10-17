import { useRef, useState } from 'react'

export function ScreenshotUploader({ remaining, onSelect }) {
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const input = useRef(null)
  function select(files) {
    const valid = [], issues = []
    for (const file of files) {
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { issues.push(`${file.name}: usa PNG, JPEG o WebP.`); continue }
      if (!file.size || file.size > 5 * 1024 * 1024) { issues.push(`${file.name}: el máximo es 5 MB.`); continue }
      if (valid.length >= remaining) { issues.push('Puedes tener hasta 8 capturas por microapp.'); break }
      valid.push(file)
    }
    setError(issues.join(' ')); if (valid.length) onSelect(valid)
  }
  return <div className="capture-uploader">
    <input ref={input} className="sr-only" tabIndex={-1} type="file" aria-label="Subir captura" multiple accept="image/png,image/jpeg,image/webp" disabled={!remaining} onChange={event => { select(Array.from(event.target.files)); event.target.value = '' }} />
    <button type="button" className={`capture-dropzone ${dragging ? 'is-dragging' : ''}`} disabled={!remaining} onClick={() => input.current.click()} onDragOver={event => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); select(Array.from(event.dataTransfer.files)) }}>
      <span className="capture-upload-icon" aria-hidden="true"><svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5" /></svg></span>
      <strong>{!remaining ? 'Galería completa' : 'Seleccionar fotos'}</strong>
      <span>{!remaining ? 'Quita una captura para agregar otra.' : 'Elige fotos y agrega sus descripciones'}</span>
      {remaining > 0 && <small>PNG, JPEG o WebP · Máximo 5 MB cada una</small>}
    </button>
    {error && <p className="error" role="alert">{error}</p>}
  </div>
}
