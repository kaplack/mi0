import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { catalogPreviewImage } from '../../services/qrCatalog'

function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    if (!src.startsWith('data:') && !src.startsWith('blob:')) {
      img.crossOrigin = 'anonymous'
    }
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Image failed to load'))
    img.src = src
  })
}

async function generateBrandedQr(url, logoUrl) {
  const qrCanvas = document.createElement('canvas')
  qrCanvas.width = 800
  qrCanvas.height = 800

  // 1. Draw QR code with High error correction (30% redundancy)
  await QRCode.toCanvas(qrCanvas, url, {
    width: 800,
    margin: 3,
    errorCorrectionLevel: 'H',
    color: {
      dark: '#111827',
      light: '#ffffff'
    }
  })

  const ctx = qrCanvas.getContext('2d')
  if (!ctx) return qrCanvas.toDataURL('image/png')

  // Badge dimensions (center ~23% of 800px)
  const badgeSize = 184
  const badgeX = (800 - badgeSize) / 2
  const badgeY = (800 - badgeSize) / 2
  const badgeRadius = 32

  // 2. Draw outer white protective badge with soft shadow
  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, 0.14)'
  ctx.shadowBlur = 18
  ctx.shadowOffsetY = 4
  drawRoundedRect(ctx, badgeX, badgeY, badgeSize, badgeSize, badgeRadius)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.restore()

  // Crisp white border
  drawRoundedRect(ctx, badgeX, badgeY, badgeSize, badgeSize, badgeRadius)
  ctx.lineWidth = 6
  ctx.strokeStyle = '#ffffff'
  ctx.stroke()

  // Inner tile dimensions
  const innerPadding = 10
  const innerX = badgeX + innerPadding
  const innerY = badgeY + innerPadding
  const innerSize = badgeSize - innerPadding * 2
  const innerRadius = 24

  let customLogoLoaded = false
  if (logoUrl) {
    try {
      let resolvedSrc = logoUrl
      try {
        resolvedSrc = await catalogPreviewImage(logoUrl)
      } catch {
        // fallback to direct url
      }
      const img = await loadImage(resolvedSrc)
      if (img.naturalWidth && img.naturalHeight) {
        ctx.save()
        drawRoundedRect(ctx, innerX, innerY, innerSize, innerSize, innerRadius)
        ctx.clip()

        ctx.fillStyle = '#ffffff'
        ctx.fillRect(innerX, innerY, innerSize, innerSize)

        const aspect = img.naturalWidth / img.naturalHeight
        let dw = innerSize - 8
        let dh = innerSize - 8
        let dx = innerX + 4
        let dy = innerY + 4
        if (aspect > 1) {
          dh = dw / aspect
          dy = innerY + 4 + (innerSize - 8 - dh) / 2
        } else {
          dw = dh * aspect
          dx = innerX + 4 + (innerSize - 8 - dw) / 2
        }
        ctx.drawImage(img, dx, dy, dw, dh)
        ctx.restore()
        customLogoLoaded = true
      }
    } catch {
      customLogoLoaded = false
    }
  }

  // 3. Fallback: Draw signature mi0.app badge
  if (!customLogoLoaded) {
    ctx.save()
    drawRoundedRect(ctx, innerX, innerY, innerSize, innerSize, innerRadius)
    ctx.fillStyle = '#111827' // dark modern tile
    ctx.fill()

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = '800 62px "Space Grotesk", system-ui, -apple-system, sans-serif'
    ctx.fillStyle = '#00e5a8' // signature emerald mint
    ctx.fillText('0_', 400, 386)

    ctx.font = '700 16px "Space Grotesk", system-ui, -apple-system, sans-serif'
    ctx.fillStyle = '#cbd5e1'
    ctx.fillText('mi0.app', 400, 434)
    ctx.restore()
  }

  return qrCanvas.toDataURL('image/png')
}

export function CatalogShare({ catalog, onNavigate }) {
  const isMenu = catalog.presentation === 'MENU'
  const label = isMenu ? 'carta' : 'catálogo'
  const url = location.origin + catalog.publicPath
  const [image, setImage] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [generating, setGenerating] = useState(true)

  useEffect(() => {
    let alive = true
    setGenerating(true)
    generateBrandedQr(url, catalog.logoUrl)
      .then(value => {
        if (alive) {
          setImage(value)
          setGenerating(false)
        }
      })
      .catch(() => {
        if (alive) {
          setError('No pudimos generar el QR. Recarga la página.')
          setGenerating(false)
        }
      })
    return () => {
      alive = false
    }
  }, [url, catalog.logoUrl])

  return (
    <section className="cq-share">
      <span className="cq-eyebrow">SIEMPRE EL MISMO QR</span>
      <h2>{isMenu ? 'Tu carta, lista para compartir' : 'Tu catálogo, listo para compartir'}</h2>
      <p>Actualiza productos y precios sin cambiar el enlace ni volver a imprimir el QR.</p>

      {!catalog.published && (
        <p className="cq-warning">
          Tu {label} está sin publicar. Usa «Publicar» en Mi negocio para que tus clientes puedan verlo.
        </p>
      )}

      {image ? (
        <img
          src={image}
          alt={(isMenu ? 'QR de la carta de ' : 'QR del catálogo de ') + catalog.name}
          width="260"
          height="260"
          className="cq-qr-preview-img"
        />
      ) : (
        <p role="status">{generating ? 'Generando QR con logo…' : 'Cargando…'}</p>
      )}

      {catalog.logoUrl ? (
        <p className="cq-qr-custom-note">
          ✓ Código QR personalizado con el logo de tu negocio.
        </p>
      ) : (
        <p className="cq-qr-custom-note">
          💡 <strong>¿Quieres tu propio logo en el QR?</strong> Súbelo en{' '}
          <button
            type="button"
            className="cq-text-link"
            onClick={() => onNavigate && onNavigate('settings', 'negocio')}
          >
            Mi negocio
          </button>{' '}
          y se actualizará automáticamente.
        </p>
      )}

      <label>
        Enlace de tu {label}
        <input readOnly value={url} onFocus={e => e.target.select()} />
      </label>

      <div className="cq-actions">
        <button
          className="primary-button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url)
              setNotice('Enlace copiado.')
              setError('')
            } catch {
              setError('Selecciona el enlace y cópialo manualmente.')
            }
          }}
        >
          Copiar enlace
        </button>
        {image && (
          <a
            className="secondary-button"
            href={image}
            download={(isMenu ? 'carta-' : 'catalogo-') + catalog.code + '.png'}
          >
            Descargar QR
          </a>
        )}
        {catalog.published && (
          <a className="secondary-button" href={url} target="_blank" rel="noreferrer">
            Abrir {label} ↗
          </a>
        )}
      </div>

      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert" className="cq-error">{error}</p>}

      {['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) && (
        <p className="cq-local-note">
          Estás en localhost: este enlace y QR funcionan en esta computadora. Para escanear desde un celular necesitaremos
          una dirección accesible desde ese dispositivo.
        </p>
      )}
    </section>
  )
}
