import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
export function CitaQr({ clinic }) {
  const url = location.origin + '/cita/' + clinic.code
  const [image, setImage] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    let alive = true
    QRCode.toDataURL(url, { width: 800, margin: 4, errorCorrectionLevel: 'M' }).then(result => { if (alive) setImage(result) }).catch(() => { if (alive) setError('No pudimos generar el QR. Recarga la página o usa el enlace.') })
    return () => { alive = false }
  }, [url])
  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); setError('') } catch { setError('No pudimos copiar el enlace. Puedes seleccionarlo y copiarlo manualmente.') }
  }
  return <><div><h2>QR para tus pacientes</h2><p>Comparte el enlace o coloca este QR en tu consultorio.</p></div><section className="cita-qr" aria-label="QR para solicitar una cita"><h3>{clinic.name}</h3><p>Escanea para solicitar tu cita</p>{image ? <><img src={image} alt={'QR para solicitar una cita en ' + clinic.name} width="280" height="280" /><a className="cita-link-button" href={image} download={'mi-cita-' + clinic.code + '.png'}>Descargar QR</a></> : !error && <p role="status">Preparando QR…</p>}
    <a href={url} target="_blank" rel="noreferrer">{url}</a><button className="cita-secondary" onClick={copy}>{copied ? 'Enlace copiado' : 'Copiar enlace'}</button>{copied && <span role="status">Enlace copiado al portapapeles.</span>}{error && <p className="cita-error" role="alert">{error}</p>}{['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) && <p>Este enlace funciona solo en este ordenador. Para compartir con pacientes, descarga el QR desde la dirección pública del consultorio.</p>}</section></>
}
