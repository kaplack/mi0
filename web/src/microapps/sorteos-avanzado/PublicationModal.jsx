import { useEffect, useRef } from 'react'
export function PublicationModal({ config, reference, onReferenceChange, onSubmit, onClose, busy, error, publication }) {
  const dialogRef = useRef(null)
  useEffect(() => {
    const dialog = dialogRef.current
    const previousOverflow = document.body.style.overflow
    const previousFocus = document.activeElement
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    return () => { dialog.close(); document.body.style.overflow = previousOverflow; if (previousFocus?.isConnected) previousFocus.focus() }
  }, [])
  return <dialog ref={dialogRef} className="advanced-modal" aria-labelledby="publication-title"
    onCancel={event => { event.preventDefault(); if (!busy) onClose() }}>
    <div className="advanced-modal-heading"><h2 id="publication-title">Publicar resultados — S/4.90</h2><button className="advanced-secondary" type="button" aria-label="Cerrar publicación" disabled={busy} onClick={onClose}>×</button></div>
    <p>Comparte premios y ganadores mediante un enlace público. Los demás participantes y tus datos de cuenta permanecen privados.</p>
    {publication?.status === 'REJECTED' && <p className="advanced-error">Solicitud rechazada: {publication.rejectionReason}. Revisa el número de operación antes de enviar una nueva solicitud.</p>}
    {error && <p className="advanced-error" role="alert">{error}</p>}
    {config?.enabled ? <form onSubmit={onSubmit}>
      <p>Yapea <strong>S/4.90</strong> al <strong>{config.yapePhone}</strong><br />Beneficiario: <strong>{config.yapeName}</strong></p>
      <p className="advanced-muted">La publicación requiere verificación manual. El enlace estará disponible después de la aprobación.</p>
      <label>Número de operación Yape<input value={reference} onChange={event => onReferenceChange(event.target.value)} minLength={4} maxLength={40} pattern="[a-zA-Z0-9-]{4,40}" required disabled={busy} autoFocus /></label>
      <button className="raffle-draw" disabled={busy}>{busy ? 'Enviando…' : 'Ya pagué: solicitar publicación'}</button>
    </form> : <p>La publicación por Yape estará disponible próximamente. Tus resultados ya están guardados.</p>}
  </dialog>
}
