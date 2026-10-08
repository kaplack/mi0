import { useState } from 'react'
import { useCitaMutation } from './useCitaData'
export function CitaProfessionalInvite({ workspaceId, professional, accessData, reload }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [link, setLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState('')
  const [confirmRemove, setConfirmRemove] = useState(false)
  const { mutate, busy, error } = useCitaMutation()
  const assignment = accessData?.assignments.find(a => a.professionalId === professional.id)
  const invitation = accessData?.invitations.find(a => a.professionalId === professional.id)
  async function invite(event) {
    event.preventDefault()
    const result = await mutate('inviteProfessional', workspaceId, professional.id, email)
    if (result) { setLink(location.origin + '/mi-cita/invitacion/' + result.token); setCopied(false); reload() }
  }
  async function remove() {
    const result = await mutate('revokeProfessional', workspaceId, professional.id)
    if (result) { setConfirmRemove(false); setOpen(false); setLink(''); reload() }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(link); setCopied(true); setCopyError('') }
    catch { setCopyError('Selecciona el enlace para copiarlo manualmente.') }
  }
  return <div className="cita-professional-invite">
    {assignment ? <><p>Acceso profesional: <strong>{assignment.user.email}</strong></p>{!confirmRemove ? <button className="cita-secondary" onClick={() => setConfirmRemove(true)}>Retirar acceso</button> : <><p>Esta cuenta dejará de acceder a Mi Cita. Sus citas se conservarán.</p><div className="cita-actions"><button className="cita-danger" disabled={busy} onClick={remove}>Sí, retirar acceso</button><button className="cita-secondary" disabled={busy} onClick={() => setConfirmRemove(false)}>Conservar acceso</button></div></>}</>
      : <>{invitation && <><p>Invitación para {invitation.email} · {new Date(invitation.expiresAt) <= new Date() ? 'Vencida' : 'Pendiente de aceptación'}</p><button className="cita-secondary" disabled={busy} onClick={remove}>Cancelar invitación</button></>}{professional.active && <button className="cita-secondary" onClick={() => { setOpen(!open); setEmail(invitation?.email || '') }}>{open ? 'Cerrar invitación' : invitation ? 'Generar nuevo enlace' : 'Invitar a ver su agenda'}</button>}</>}
    {open && !assignment && <form className="cita-form" onSubmit={invite}><label>Correo del profesional<input type="email" required maxLength="254" value={email} onChange={e => setEmail(e.target.value)} /></label><small>Debe aceptar con este correo. El enlace vence en 7 días; un nuevo enlace reemplaza el anterior.</small><button disabled={busy}>{busy ? 'Generando…' : 'Generar invitación'}</button></form>}
    {link && <div className="cita-invitation-share"><label>Enlace de invitación<input readOnly value={link} onFocus={e => e.target.select()} /></label><button className="cita-secondary" onClick={copy}>{copied ? 'Enlace copiado' : 'Copiar invitación'}</button><small>No enviamos correos automáticamente. Comparte este enlace con el profesional.</small>{copied && <span role="status">Invitación copiada.</span>}{copyError && <p role="alert">{copyError}</p>}</div>}
    {error && <p className="cita-error" role="alert">{error}</p>}
  </div>
}
