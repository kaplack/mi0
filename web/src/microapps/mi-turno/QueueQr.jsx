import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

function titleLines(context, text, maxWidth) {
  const lines = []
  let line = ''
  for (const word of text.split(/\s+/)) {
    for (const part of splitWord(context, word, maxWidth)) {
      const candidate = line ? line + ' ' + part : part
      if (context.measureText(candidate).width > maxWidth && line) { lines.push(line); line = part }
      else line = candidate
    }
  }
  if (line) lines.push(line)
  return lines
}
function splitWord(context, word, maxWidth) {
  const parts = []
  let part = ''
  for (const character of word) {
    if (part && context.measureText(part + character).width > maxWidth) { parts.push(part); part = '' }
    part += character
  }
  if (part) parts.push(part)
  return parts
}
async function printablePoster(url, name) {
  await document.fonts.ready
  const qr = document.createElement('canvas')
  await QRCode.toCanvas(qr, url, { width: 1200, margin: 4, errorCorrectionLevel: 'M' })
  const canvas = document.createElement('canvas')
  canvas.width = 1600
  canvas.height = 2000
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas unavailable')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillStyle = '#1f2937'
  let size = 80
  let lines
  do {
    context.font = `700 ${size}px "Space Grotesk", sans-serif`
    lines = titleLines(context, name.trim().toLocaleUpperCase('es-PE'), 1360)
    if (lines.length <= 3) break
    size -= 4
  } while (size >= 32)
  lines.forEach((line, index) => context.fillText(line, 800, 220 + (index - (lines.length - 1) / 2) * size * 1.2))
  context.font = '400 48px "Space Grotesk", sans-serif'
  context.fillText('Escanea para tomar un turno', 800, 420)
  context.drawImage(qr, 200, 520)
  context.fillStyle = '#6b7280'
  context.font = '400 36px "Space Grotesk", sans-serif'
  context.fillText('powered by mi0.app', 800, 1860)
  return canvas.toDataURL('image/png')
}

export function QueueQr({ url, name, code }) {
  const [poster, setPoster] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let alive = true
    printablePoster(url, name)
      .then(image => { if (alive) { setPoster({ image, url, name }); setError('') } })
      .catch(() => { if (alive) setError('No pudimos generar el cartel. Usa el enlace o recarga la página.') })
    return () => { alive = false }
  }, [url, name])
  const image = poster?.url === url && poster?.name === name ? poster.image : ''
  const localOnly = ['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname)
  return <section className="turno-qr" aria-label="QR para tomar un turno">
    {image ? <><img className="turno-poster" src={image} alt={`QR para tomar un turno en ${name}`} width="280" height="350" />
      <a className="turno-download" href={image} download={`mi-turno-${code}.png`}>Descargar QR para imprimir</a></> : !error && <p role="status">Preparando cartel…</p>}
    {error && <p role="alert">{error}</p>}
    <a href={url} target="_blank" rel="noreferrer">{url}</a>
    {localOnly && <p>Este QR apunta a localhost y solo funciona en este ordenador. Para el cartel de la oficina, descárgalo desde la dirección pública del negocio.</p>}
  </section>
}
