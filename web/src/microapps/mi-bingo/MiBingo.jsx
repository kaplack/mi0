import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { Logo } from '../../components/Logo'
import { TOKEN_KEY } from '../../services/api'
import { bingo, playerToken } from '../../services/bingo'
import { useBingo } from './useBingo'
import './MiBingo.css'
import { GuestManager, RecoveryAccess, AttachRoom } from './GuestManager'
import { guestAccess, UPGRADE_KEY } from '../../services/bingo'

const prettyDate = value => value ? new Date(value).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' }) : ''
const patterns = {
  ONE:      'Una línea horizontal',
  TWO:      'Dos líneas horizontales',
  FULL:     'Cartón lleno',
  LETTER_X: 'Letra X',
  LETTER_L: 'Letra L',
  LETTER_T: 'Letra T',
  LETTER_H: 'Letra H',
  LETTER_O: 'Letra O',
}
// Índices (0-24, orden fila-columna) que deben estar marcados para cada patrón de letra.
// Para ONE/TWO/FULL se genera la máscara dinámicamente solo a efectos del preview.
const PATTERN_PREVIEW = {
  ONE:      new Set([0, 1, 2, 3, 4]),
  TWO:      new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]),
  FULL:     new Set(Array.from({ length: 25 }, (_, i) => i)),
  LETTER_X: new Set([0, 4, 6, 8, 12, 16, 18, 20, 24]),
  LETTER_L: new Set([0, 5, 10, 15, 20, 21, 22, 23, 24]),
  LETTER_T: new Set([0, 1, 2, 3, 4, 7, 12, 17, 22]),
  LETTER_H: new Set([0, 4, 5, 9, 10, 11, 12, 13, 14, 15, 19, 20, 24]),
  LETTER_O: new Set([0, 1, 2, 3, 4, 5, 9, 10, 14, 15, 19, 20, 21, 22, 23, 24]),
}
function PatternPreview({ pattern }) {
  const mask = PATTERN_PREVIEW[pattern]
  if (!mask) return null
  return (
    <div className="bingo-pattern-preview" aria-hidden="true">
      {Array.from({ length: 25 }, (_, i) => (
        <span key={i} className={mask.has(i) ? 'on' : ''} />
      ))}
    </div>
  )
}
const statuses = { WAITING: 'Esperando jugadores', PLAYING: 'Jugando', BETWEEN: 'Entre rondas', FINISHED: 'Sala finalizada' }
const ballLabel = n => n ? 'BINGO'[Math.floor((n - 1) / 15)] + '-' + n : '—'
function Notice({ children, error }) { return children && <p className={'bingo-notice' + (error ? ' is-error' : '')} role={error ? 'alert' : 'status'}>{children}</p> }
function BallBoard({ round }) {
  return <div className="bingo-board" aria-label="Bolillas sorteadas">{Array.from({ length: 5 }, (_, c) => <div className="bingo-ball-column" key={c}><strong>{'BINGO'[c]}</strong>{Array.from({ length: 15 }, (_, i) => c * 15 + i + 1).map(n => <span key={n} className={round?.balls.includes(n) ? 'drawn' : ''} aria-label={ballLabel(n) + (round?.balls.includes(n) ? ', sorteada' : ', pendiente')}>{n}</span>)}</div>)}</div>
}
function RoundInfo({ room, publicDisplay = false }) {
  const round = room.rounds.at(-1)
  const last = round?.balls.at(-1)
  return <>
    <div className="bingo-round-title"><span className="eyebrow">{round ? 'RONDA ' + round.number : 'TU PRÓXIMA PARTIDA'}</span><span className="bingo-status">{round?.status === 'RESOLVING' ? 'Resolviendo bingo' : statuses[room.status]}</span></div>
    <div className="bingo-current" aria-live="polite"><small>ÚLTIMA BOLILLA</small><strong key={last}>{ballLabel(last)}</strong><span>{round?.balls.length || 0} de 75 bolillas</span></div>
    <div className="bingo-pattern"><strong>{patterns[round?.pattern] || 'El organizador iniciará la ronda'}</strong>{round?.prize && <span>Premio: {round.prize}</span>}</div>
    {round?.winners.length > 0 && <Notice>¡BINGO! {round.winners.map(w => w.name).join(', ')}{round.status === 'RESOLVING' ? '. Sorteo detenido: aún puedes reclamar tu bingo.' : '. ¡Felicitaciones!'}</Notice>}
    {room.status === 'FINISHED' && <Notice>El evento terminó. Gracias por jugar.</Notice>}
    {round?.status === 'CANCELLED' && <Notice>Ronda cerrada sin ganadores.</Notice>}
    {publicDisplay && <BallBoard round={round} />}
  </>
}
function Share({ code }) {
  const url = location.origin + '/bingo/' + code
  const [qr, setQr] = useState(''), [notice, setNotice] = useState('')
  useEffect(() => { let live = true; QRCode.toDataURL(url, { width: 240, margin: 2 }).then(value => { if (live) setQr(value) }).catch(() => { if (live) setNotice('No pudimos generar el QR. Comparte el enlace.') }); return () => { live = false } }, [url])
  return <div className="bingo-share">{qr && <img src={qr} alt="QR para unirse a la sala" />}<div><h3>Todos listos para jugar</h3><p>Escanea el QR, escribe tu nombre y recibe tu cartón.</p><a className="bingo-url" href={url} target="_blank" rel="noreferrer">{url}</a><button className="secondary-button" onClick={async () => { try { await navigator.clipboard.writeText(url); setNotice('Enlace copiado') } catch { setNotice('Selecciona el enlace para copiarlo') } }}>Copiar enlace</button><Notice>{notice}</Notice></div></div>
}
export function MiBingo({ code, publicDisplay, workspaceId, onNavigate, onLogin }) {
  return <div className={'bingo' + (publicDisplay ? ' bingo-display' : '')}><header className="bingo-header"><Logo /><span>Mi Bingo</span>{!code && <a href="/">← Volver a mi0</a>}</header>{code ? publicDisplay ? <PublicDisplay code={code} /> : <Player key={code} code={code} /> : <Manager workspaceId={workspaceId} onNavigate={onNavigate} onLogin={onLogin} />}</div>
}
function ConfettiParticles() {
  const pieces = [
    { left: '10%', delay: '0s', bg: '#00e5a8', size: '12px' },
    { left: '20%', delay: '0.4s', bg: '#6366f1', size: '10px' },
    { left: '30%', delay: '0.1s', bg: '#f59e0b', size: '14px' },
    { left: '40%', delay: '0.6s', bg: '#ec4899', size: '11px' },
    { left: '50%', delay: '0.2s', bg: '#10b981', size: '13px' },
    { left: '60%', delay: '0.5s', bg: '#8b5cf6', size: '10px' },
    { left: '70%', delay: '0.3s', bg: '#06b6d4', size: '12px' },
    { left: '80%', delay: '0.7s', bg: '#f43f5e', size: '14px' },
    { left: '90%', delay: '0.2s', bg: '#00e5a8', size: '11px' },
    { left: '15%', delay: '0.8s', bg: '#f59e0b', size: '9px' },
    { left: '45%', delay: '1s', bg: '#6366f1', size: '12px' },
    { left: '75%', delay: '0.9s', bg: '#10b981', size: '13px' },
    { left: '85%', delay: '0.4s', bg: '#ec4899', size: '10px' },
  ]
  return (
    <div className="bingo-confetti-wrap" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="bingo-confetti-item"
          style={{
            left: p.left,
            animationDelay: p.delay,
            backgroundColor: p.bg,
            width: p.size,
            height: p.size,
          }}
        />
      ))}
    </div>
  )
}

function PublicDisplay({ code }) {
  const state = useBingo(() => bingo.state(code), code)
  const [showQr, setShowQr] = useState(false)
  const [dismissedKey, setDismissedKey] = useState('')
  const [qrUrl, setQrUrl] = useState('')
  const joinUrl = location.origin + '/bingo/' + code

  const round = state.data?.room?.rounds?.at(-1)
  const winners = round?.winners || []
  const hasWinners = winners.length > 0
  const winnerKey = hasWinners ? winners.map(w => w.id || w.name).join(',') + '-' + round?.number : ''
  const isWinnerModalOpen = hasWinners && dismissedKey !== winnerKey

  useEffect(() => {
    let active = true
    QRCode.toDataURL(joinUrl, { width: 360, margin: 2 }).then(res => {
      if (active) setQrUrl(res)
    }).catch(() => {})
    return () => { active = false }
  }, [joinUrl])

  return (
    <main className="bingo-public-screen">
      <Notice error>{state.error && 'Conexión interrumpida: ' + state.error}</Notice>
      {state.data ? (
        <>
          <div className="bingo-public-topbar">
            <div className="bingo-public-title-area">
              <h1>{state.data.room.name}</h1>
            </div>
            <button
              type="button"
              className="primary-button bingo-public-qr-fab"
              onClick={() => setShowQr(true)}
              title="Mostrar código QR para unirse"
            >
              <span className="bingo-qr-icon">📱</span>
              <span className="bingo-qr-label">Unirse con QR</span>
            </button>
          </div>

          <RoundInfo room={state.data.room} publicDisplay />
          <p>mi0.app · Mi Bingo</p>

          {/* CELEBRACIÓN HERO MODAL AL CANTAR BINGO */}
          {isWinnerModalOpen && (
            <div className="bingo-modal-overlay bingo-celebration-overlay" onClick={() => setDismissedKey(winnerKey)}>
              <ConfettiParticles />
              <div className="bingo-celebration-card" onClick={e => e.stopPropagation()}>
                <button
                  type="button"
                  className="bingo-modal-close"
                  onClick={() => setDismissedKey(winnerKey)}
                  aria-label="Minimizar celebración y ver tablero"
                >
                  ✕
                </button>

                <div className="bingo-celebration-badge">
                  <span>🎉 ¡BINGO CANTADO! 🏆</span>
                </div>

                <div className="bingo-celebration-names">
                  {winners.map(w => (
                    <h2 key={w.id || w.name} className="bingo-winner-name">
                      {w.name}
                    </h2>
                  ))}
                </div>

                <p className="bingo-celebration-meta">
                  Ronda #{round.number} · <strong>{patterns[round.pattern]}</strong>
                  {round.prize && <span className="bingo-celebration-prize">🎁 Premio: {round.prize}</span>}
                </p>

                {round.balls?.length > 0 && (
                  <div className="bingo-winning-ball-pill">
                    <span>Bolilla ganadora:</span>
                    <strong>{ballLabel(round.balls.at(-1))}</strong>
                  </div>
                )}

                <button
                  type="button"
                  className="secondary-button bingo-celebration-back-btn"
                  onClick={() => setDismissedKey(winnerKey)}
                >
                  Ver tablero completo
                </button>
              </div>
            </div>
          )}

          {showQr && (
            <div className="bingo-modal-overlay" onClick={() => setShowQr(false)}>
              <div className="bingo-modal-card" onClick={e => e.stopPropagation()}>
                <button
                  type="button"
                  className="bingo-modal-close"
                  onClick={() => setShowQr(false)}
                  aria-label="Cerrar modal"
                >
                  ✕
                </button>
                <span className="eyebrow">ÚNETE AL BINGO</span>
                <h2>Escanea para recibir tu cartón</h2>
                <p>Apunta con la cámara de tu celular para entrar a la sala y jugar en vivo.</p>
                {qrUrl ? (
                  <div className="bingo-modal-qr-wrap">
                    <img src={qrUrl} alt={'Código QR para unirse a ' + state.data.room.name} />
                  </div>
                ) : (
                  <p>Generando código QR…</p>
                )}
                <div className="bingo-modal-url">
                  <strong>{joinUrl}</strong>
                </div>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowQr(false)}
                >
                  Volver a la pantalla
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <p role="status">Cargando sala…</p>
      )}
    </main>
  )
}
function Player({ code }) {
  const [identity] = useState(() => playerToken(code))
  const [joined, setJoined] = useState(() => localStorage.getItem('mi0_bingo_joined_' + code) === 'yes')
  const state = useBingo(() => bingo.state(code, joined ? identity : null), code + joined)
  const [name, setName] = useState(''), [cardCount, setCardCount] = useState(1), [busy, setBusy] = useState(false), [message, setMessage] = useState('')
  const [activeCardIdx, setActiveCardIdx] = useState(0)
  const touchStartRef = useRef({ x: 0, y: 0 })

  const room = state.data?.room, p = state.data?.participant, round = room?.rounds.at(-1), last = round?.balls.at(-1)
  const firstName = p?.name?.trim()?.split(/\s+/)?.[0] || p?.name || 'Jugador'
  const cards = (Array.isArray(p?.cards) && p.cards.length > 0) ? p.cards : (p?.card ? [p.card] : [])
  const totalCards = cards.length

  async function join(event) {
    event.preventDefault(); setBusy(true); setMessage('')
    try {
      await bingo.join(code, { name, token: identity, cardCount })
      localStorage.setItem('mi0_bingo_joined_' + code, 'yes')
      setJoined(true)
    }
    catch (e) { setMessage(e.message) } finally { setBusy(false) }
  }

  async function claim() {
    setBusy(true)
    try {
      const result = await bingo.claim(code, { token: identity, roundId: round.id })
      setMessage(result.message)
      await state.reload()
    }
    catch (e) { setMessage(e.message) } finally { setBusy(false) }
  }

  const handleTouchStart = e => {
    const touch = e.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
  }

  const handleTouchEnd = e => {
    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - touchStartRef.current.x
    const deltaY = touch.clientY - touchStartRef.current.y
    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0 && activeCardIdx < totalCards - 1) {
        setActiveCardIdx(i => i + 1)
      } else if (deltaX > 0 && activeCardIdx > 0) {
        setActiveCardIdx(i => i - 1)
      }
    }
  }

  if (!room) return <main className="bingo-player"><Notice error>{state.error}</Notice><p role="status">Cargando sala…</p></main>

  if (!p) {
    return (
      <main className="bingo-player">
        <h1>{room.name}</h1>
        <section className="bingo-panel">
          <span className="eyebrow">BIENVENIDO A MI BINGO</span>
          <h2>Tu cartón te espera</h2>
          <p>Juega desde aquí. Conserva este navegador para recuperar tus cartones.</p>
          {joined ? (
            <p>Reintentando recuperar tu cartón…</p>
          ) : (
            <form onSubmit={join}>
              <label>Tu nombre
                <input required maxLength={80} value={name} onChange={e => setName(e.target.value)} autoComplete="given-name" placeholder="Ej: Jesenia" />
              </label>

              <div className="bingo-count-selector-label">
                <span>¿Cuántos cartones deseas? <small>(Gratis)</small></span>
                <div className="bingo-card-count-selector" role="radiogroup" aria-label="Cantidad de cartones">
                  {[1, 2, 3].map(num => (
                    <button
                      key={num}
                      type="button"
                      className={'bingo-count-option' + (cardCount === num ? ' selected' : '')}
                      onClick={() => setCardCount(num)}
                    >
                      {num} {num === 1 ? 'cartón' : 'cartones'}
                    </button>
                  ))}
                </div>
              </div>

              <button className="primary-button" disabled={busy || !['WAITING', 'BETWEEN'].includes(room.status)}>
                {cardCount === 1 ? 'Recibir mi cartón' : 'Recibir mis ' + cardCount + ' cartones'}
              </button>
              <p>{statuses[room.status]}</p>
            </form>
          )}
        </section>
        <Notice>{message}</Notice>
      </main>
    )
  }

  return (
    <main className="bingo-player bingo-player-gaming">
      <Notice error>{state.error && 'No pudimos sincronizar: ' + state.error}</Notice>

      <div className="bingo-player-compact-bar">
        <div className="bingo-player-ball-chip" aria-live="polite">
          <span className="bingo-chip-eyebrow">ÚLTIMA</span>
          <strong key={last}>{ballLabel(last)}</strong>
        </div>
        <div className="bingo-player-game-meta">
          <div className="bingo-meta-top">
            <strong className="bingo-room-mini-title" title={room.name}>{room.name}</strong>
            <span className="bingo-player-name-tag" title={p.name}>👤 {firstName}{totalCards > 1 ? ' · C' + (activeCardIdx + 1) + '/' + totalCards : ''}</span>
          </div>
          <div className="bingo-meta-bottom">
            <span className="eyebrow">{round ? 'Ronda ' + round.number : 'Próxima'}</span>
            <span className="bingo-meta-pattern">
              {patterns[round?.pattern] || 'En espera'}
              {round?.prize && <span> · {round.prize}</span>}
            </span>
          </div>
        </div>
      </div>

      {round?.winners.length > 0 && (
        <Notice>¡BINGO! {round.winners.map(w => w.name).join(', ')}{round.status === 'RESOLVING' ? '. Sorteo detenido.' : '. ¡Felicitaciones!'}</Notice>
      )}
      {room.status === 'FINISHED' && <Notice>El evento terminó. Gracias por jugar.</Notice>}
      {round?.status === 'CANCELLED' && <Notice>Ronda cerrada sin ganadores.</Notice>}
      {room.status === 'BETWEEN' && <Notice>Espera la próxima ronda. Conservarás los números de tus cartones.</Notice>}
      {message && <Notice>{message}</Notice>}

      <section className="bingo-panel bingo-player-card-panel">
        {totalCards > 1 && (
          <div className="bingo-card-nav-row">
            {activeCardIdx > 0 ? (
              <button
                type="button"
                className="bingo-card-nav-pill prev"
                onClick={() => setActiveCardIdx(i => i - 1)}
                aria-label={'Ver cartón ' + activeCardIdx}
              >
                ‹ {activeCardIdx}
              </button>
            ) : <span className="bingo-card-nav-spacer" />}
            <span className="bingo-card-nav-dots" aria-label={'Cartón ' + (activeCardIdx + 1) + ' de ' + totalCards}>
              {cards.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={'bingo-dot' + (i === activeCardIdx ? ' active' : '')}
                  onClick={() => setActiveCardIdx(i)}
                  aria-label={'Ir al cartón ' + (i + 1)}
                />
              ))}
            </span>
            {activeCardIdx < totalCards - 1 ? (
              <button
                type="button"
                className="bingo-card-nav-pill next"
                onClick={() => setActiveCardIdx(i => i + 1)}
                aria-label={'Ver cartón ' + (activeCardIdx + 2)}
              >
                {activeCardIdx + 2} ›
              </button>
            ) : <span className="bingo-card-nav-spacer" />}
          </div>
        )}

        <div
          className="bingo-card-swipe-area"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <PlayingCard
            key={(round?.id || 'waiting') + '_' + activeCardIdx}
            card={cards[activeCardIdx]}
            storageKey={activeCardIdx === 0 ? ('mi0_bingo_marks_' + p.id + '_' + (round?.id || 'waiting')) : ('mi0_bingo_marks_' + p.id + '_c' + activeCardIdx + '_' + (round?.id || 'waiting'))}
            disabled={room.status !== 'PLAYING' || !['ACTIVE', 'RESOLVING'].includes(round?.status)}
          />
        </div>

        <button
          type="button"
          className="primary-button bingo-claim-btn"
          disabled={busy || room.status !== 'PLAYING' || !['ACTIVE', 'RESOLVING'].includes(round?.status)}
          onClick={claim}
        >
          ¡BINGO!
        </button>
      </section>
    </main>
  )
}
function PlayingCard({ card, storageKey, disabled }) {
  const [marks, setMarks] = useState(() => { try { const saved = JSON.parse(localStorage.getItem(storageKey) || '[]'); return Array.isArray(saved) ? saved : [] } catch { return [] } })
  function toggle(n) { const next = marks.includes(n) ? marks.filter(x => x !== n) : [...marks, n]; setMarks(next); localStorage.setItem(storageKey, JSON.stringify(next)) }
  return <div className="bingo-card">{'BINGO'.split('').map(letter => <strong key={letter}>{letter}</strong>)}{card.map((n, i) => <button key={i} disabled={!n || disabled} aria-label={n ? String(n) : 'Centro libre'} aria-pressed={!n || marks.includes(n)} className={!n || marks.includes(n) ? 'marked' : ''} onClick={() => toggle(n)}>{n || <span>★<small>LIBRE</small></span>}</button>)}</div>
}
function Manager({ workspaceId, onNavigate, onLogin }) {
  const [accountMode, setAccountMode] = useState(false)
  const loggedIn = Boolean(localStorage.getItem(TOKEN_KEY))
  const state = useBingo(() => loggedIn ? bingo.spaces() : Promise.resolve({ workspaces: [] }), loggedIn, false)
  const spaces = state.data?.workspaces.filter(w => w.role === 'OWNER') || []
  const workspace = spaces.find(w => w.id === workspaceId) || (!workspaceId ? spaces[0] : null)
  if (!workspaceId && !accountMode && (!loggedIn || guestAccess()?.code || localStorage.getItem(UPGRADE_KEY) || location.hash || sessionStorage.getItem('mi0_bingo_recovery'))) {
    return <GuestManager Organizer={Organizer} onLogin={onLogin} onNavigate={onNavigate} onAccount={() => setAccountMode(true)} loggedIn={loggedIn} />
  }
  if (!loggedIn) return <GuestManager Organizer={Organizer} onLogin={onLogin} onNavigate={onNavigate} loggedIn={false} />
  return <main className="bingo-manager"><Notice error>{state.error}</Notice>{!state.data ? <p>Cargando espacios…</p> : !workspace ? <section className="bingo-panel"><h1>Mi Bingo</h1><p>Necesitas un espacio propio para organizar una sala.</p><a href="/">Ir a mis espacios →</a></section> : <Workspace key={workspace.id} workspace={workspace} spaces={spaces} onNavigate={onNavigate} />}</main>
}
function Workspace({ workspace, spaces, onNavigate }) {
  const state = useBingo(() => bingo.list(workspace.id), workspace.id, false)
  const [selected, setSelected] = useState(null), [name, setName] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const rooms = state.data?.rooms || [], current = selected || rooms.find(r => r.status !== 'FINISHED')?.code
  async function create(e) {
    e.preventDefault(); setBusy(true); setError('')
    try { const data = await bingo.create({ name, workspaceId: workspace.id }); setSelected(data.room.code); setName(''); await state.reload() }
    catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  async function finished() { await state.reload(); setSelected(null) }

  if (current) {
    return (
      <Organizer
        key={current}
        code={current}
        workspace={workspace}
        spaces={spaces}
        onNavigate={onNavigate}
        onFinished={finished}
        isGuest={false}
      />
    )
  }

  return (
    <div className="bingo-layout">
      <div className="bingo-sidebar-area">
        <aside className="bingo-sidebar" aria-label="Menú de Mi Bingo">
          <div className="bingo-sidebar-heading">
            <strong className="bingo-menu-label">Mi Bingo</strong>
          </div>
          <div className="bingo-sidebar-context">
            <small className="eyebrow">MI ESPACIO</small>
            <strong>{workspace.name}</strong>
            {spaces.length > 1 && (
              <label>Espacio
                <select value={workspace.id} onChange={e => onNavigate?.('/mi-bingo/' + e.target.value)}>
                  {spaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </label>
            )}
          </div>
          <nav aria-label="Pantallas de Mi Bingo">
            <button type="button" aria-current="page"><span className="bingo-nav-icon">▦</span><span className="bingo-menu-label">Salas</span></button>
          </nav>
          <div className="bingo-sidebar-footer">
            <a href="/">← Volver a mi0</a>
          </div>
        </aside>
      </div>
      <section className="bingo-content">
        <div className="bingo-title">
          <div><span className="eyebrow">JUEGA Y COMPARTE</span><h1>Mi Bingo</h1><p>Una sala, muchos cartones y un gran momento.</p></div>
        </div>
        <Notice error>{error || state.error}</Notice>
        <section className="bingo-panel bingo-create">
          <span className="bingo-create-icon">▦</span>
          <h2>Que empiece la diversión</h2>
          <p>Hasta 50 cartones gratis. Comparte el QR y cada jugador recibirá un cartón único.</p>
          <form onSubmit={create}>
            <label>Nombre del evento
              <input required maxLength={120} placeholder="Por ejemplo: Bingo de amigos" value={name} onChange={e => setName(e.target.value)} />
            </label>
            <button disabled={busy} className="primary-button">Crear sala →</button>
          </form>
        </section>
        {rooms.length > 0 && (
          <section className="bingo-panel">
            <h2>Tus salas</h2>
            {rooms.map(room => (
              <button className="bingo-history-row" key={room.id} onClick={() => setSelected(room.code)}>
                <strong>{room.name}</strong>
                <span>{statuses[room.status]} · {room.rounds.length} rondas →</span>
              </button>
            ))}
          </section>
        )}
      </section>
    </div>
  )
}
export function Organizer({
  code,
  tab: initialTab,
  onFinished,
  adminToken,
  onActivity,
  isGuest = false,
  guestRoom,
  workspace,
  spaces = [],
  onNavigate,
  loggedIn,
  onLogin,
  startAgain,
  RecoveryAccessComponent = RecoveryAccess,
  AttachRoomComponent = AttachRoom
}) {
  const state = useBingo(() => adminToken ? bingo.guestInfo(code, adminToken) : bingo.info(code), code + (adminToken || ''))
  const [tab, setTab] = useState(initialTab || 'game')
  const [gameTab, setGameTab] = useState('setup')
  const [moreMenu, setMoreMenu] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [pattern, setPattern] = useState('ONE'), [prize, setPrize] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const [sound, setSound] = useState(false)
  const audio = useRef(null), lastPlayed = useRef(null)

  const room = state.data?.room || guestRoom
  const round = room?.rounds.at(-1), last = round?.balls.at(-1)

  useEffect(() => {
    if (sound && last && lastPlayed.current !== last && audio.current) {
      const ctx = audio.current, tone = ctx.createOscillator(), volume = ctx.createGain()
      tone.connect(volume); volume.connect(ctx.destination); volume.gain.setValueAtTime(0.04, ctx.currentTime); volume.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + .2); tone.frequency.value = 660; tone.start(); tone.stop(ctx.currentTime + .2)
    }
    lastPlayed.current = last
  }, [last, sound])
  useEffect(() => () => { audio.current?.close() }, [])

  async function action(kind, body) {
    if (busy) return
    if (['close', 'finish'].includes(kind) && !confirm(kind === 'finish' ? '¿Finalizar la sala? Se cerrará la ronda y no se podrá seguir jugando.' : round?.winners.length ? '¿Cerrar reclamaciones y confirmar estos ganadores?' : '¿Cerrar esta ronda sin ganadores?')) return
    setBusy(true); setError('')
    try {
      if (adminToken) await bingo.guestAction(code, kind, { ...body, adminToken }); else await bingo.action(code, kind, body)
      await state.reload()
      await onActivity?.()
      if (kind === 'finish') onFinished?.()
    }
    catch (e) { setError(e.message); await state.reload() } finally { setBusy(false) }
  }

  function upgrade(mode) {
    if (room) localStorage.setItem(UPGRADE_KEY, room.code)
    onLogin?.(mode)
  }

  if (!room) return <><Notice error>{state.error}</Notice><p role="status">Cargando sala…</p></>

  return (
    <div className={'bingo-layout' + (collapsed ? ' collapsed' : '')}>
      <div className="bingo-sidebar-area">
        <aside className="bingo-sidebar" aria-label="Menú de Mi Bingo">
          <div className="bingo-sidebar-heading">
            <strong className="bingo-menu-label">Mi Bingo</strong>
            <button
              type="button"
              className="bingo-collapse"
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
              title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
            >
              {collapsed ? '▶' : '◀'}
            </button>
          </div>

          {isGuest ? (
            <div className="bingo-sidebar-context bingo-guest-access">
              <small className="eyebrow">SALA TEMPORAL</small>
              <strong>{room.name}</strong>
              <h3>Participantes: {room.participantCount} / {room.participantLimit}</h3>
              <p>{room.status === 'FINISHED' ? 'Finalizada' : 'Expira: ' + prettyDate(room.expiresAt)}</p>
            </div>
          ) : (
            <div className="bingo-sidebar-context">
              <small className="eyebrow">MI ESPACIO</small>
              <strong>{workspace?.name}</strong>
              {spaces.length > 1 && (
                <label>Espacio
                  <select value={workspace.id} onChange={e => onNavigate?.('/mi-bingo/' + e.target.value)}>
                    {spaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </label>
              )}
              <h3>Participantes: {room.participantCount} / {room.participantLimit}</h3>
            </div>
          )}

          <nav aria-label="Pantallas de Mi Bingo">
            <button
              type="button"
              aria-current={tab === 'game' ? 'page' : undefined}
              onClick={() => setTab('game')}
            >
              <span className="bingo-nav-icon">▦</span>
              <span className="bingo-menu-label">Partida en vivo</span>
            </button>
            <button
              type="button"
              aria-current={tab === 'participants' ? 'page' : undefined}
              onClick={() => setTab('participants')}
            >
              <span className="bingo-nav-icon">👥</span>
              <span className="bingo-menu-label">Participantes y QR ({room.participantCount})</span>
            </button>
            <button
              type="button"
              aria-current={tab === 'history' ? 'page' : undefined}
              onClick={() => setTab('history')}
            >
              <span className="bingo-nav-icon">◷</span>
              <span className="bingo-menu-label">Historial rondas</span>
            </button>
            <a
              className="bingo-sidebar-external-link"
              href={'/bingo/' + code + '/pantalla'}
              target="_blank"
              rel="noreferrer"
            >
              <span className="bingo-nav-icon">🖥️</span>
              <span className="bingo-menu-label">Pantalla pública ↗</span>
            </a>
            <button
              type="button"
              aria-current={tab === 'settings' ? 'page' : undefined}
              onClick={() => setTab('settings')}
            >
              <span className="bingo-nav-icon">⚙️</span>
              <span className="bingo-menu-label">Configuración</span>
            </button>
          </nav>

          <div className="bingo-sidebar-footer">
            <a href="/">← Volver a mi0</a>
          </div>
        </aside>
      </div>

      <section className="bingo-content">
        <div className="bingo-room-heading">
          <div>
            <h2>{room.name}</h2>
            <h3 className="bingo-participant-heading">Participantes: {room.participantCount} / {room.participantLimit}</h3>
          </div>
        </div>

        <Notice error>{error || (state.error && 'Sincronización pendiente: ' + state.error)}</Notice>

        {tab === 'game' && (
          <div className="bingo-game-container">
            <div className="bingo-subtabs-nav" role="tablist" aria-label="Secciones de la partida">
              <button
                type="button"
                role="tab"
                aria-selected={gameTab === 'setup'}
                className={'bingo-subtab-btn' + (gameTab === 'setup' ? ' is-active' : '')}
                onClick={() => setGameTab('setup')}
              >
                <span>Configurar ronda</span>
                {['WAITING', 'BETWEEN'].includes(room.status) && <span className="bingo-subtab-dot" aria-label="Pendiente de iniciar" />}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={gameTab === 'board'}
                className={'bingo-subtab-btn' + (gameTab === 'board' ? ' is-active' : '')}
                onClick={() => setGameTab('board')}
              >
                <span>Tablero y Bolillas</span>
              </button>
            </div>

            {gameTab === 'board' && (
              <section className="bingo-panel bingo-board-panel">
                <div className="bingo-board-hero">
                  <div className="bingo-hero-ball-box" aria-live="polite">
                    <small>ÚLTIMA BOLILLA</small>
                    <strong key={last}>{ballLabel(last)}</strong>
                    <span>{round?.balls.length || 0} de 75 bolillas</span>
                  </div>

                  <div className="bingo-hero-info-box">
                    <div className="bingo-round-title">
                      <span className="eyebrow">{round ? 'RONDA ' + round.number : 'PRÓXIMA RONDA'}</span>
                      <span className="bingo-status">{round?.status === 'RESOLVING' ? 'Resolviendo bingo' : statuses[room.status]}</span>
                    </div>

                    <div className="bingo-pattern-badge">
                      <strong>Modalidad:</strong> {patterns[round?.pattern] || 'Por configurar'}
                      {round?.prize && <span> · Premio: {round.prize}</span>}
                    </div>

                    {round?.winners.length > 0 && <Notice>¡BINGO! {round.winners.map(w => w.name).join(', ')}{round.status === 'RESOLVING' ? '. Sorteo detenido.' : '. ¡Felicitaciones!'}</Notice>}
                    {room.status === 'FINISHED' && <Notice>El evento terminó. Gracias por jugar.</Notice>}
                    {round?.status === 'CANCELLED' && <Notice>Ronda cerrada sin ganadores.</Notice>}

                    {room.status === 'PLAYING' ? (
                      <div className="bingo-hero-actions">
                        <button
                          type="button"
                          className="primary-button bingo-draw"
                          disabled={busy || !!state.error || round?.status !== 'ACTIVE' || round.balls.length === 75}
                          onClick={() => action('draw', { roundId: round.id, expectedCount: round.balls.length })}
                        >
                          <span className="bingo-btn-full">Sacar bolilla</span>
                          <span className="bingo-btn-compact">+ Bolilla</span>
                        </button>
                        <button
                          type="button"
                          className="secondary-button bingo-close-round-btn"
                          disabled={busy}
                          onClick={() => action('close')}
                          title={round?.winners.length ? 'Cerrar reclamaciones y confirmar ganadores' : 'Cerrar ronda sin ganadores'}
                        >
                          <span className="bingo-btn-full">
                            {round?.winners.length ? 'Cerrar reclamaciones y confirmar' : 'Cerrar ronda sin ganadores'}
                          </span>
                          <span className="bingo-btn-compact">
                            {round?.winners.length ? '✓ Confirmar' : '✕ Cerrar'}
                          </span>
                        </button>
                      </div>
                    ) : (
                      <div className="bingo-hero-actions">
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => setGameTab('setup')}
                        >
                          ⚙️ Ir a configurar e iniciar ronda
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bingo-board-wrap">
                  <BallBoard round={round} />
                </div>

                <details className="bingo-history-details">
                  <summary>Orden de salida ({round?.balls.length || 0})</summary>
                  <p>{round?.balls.map(ballLabel).join(' · ') || 'Todavía no hay bolillas sorteadas en esta ronda.'}</p>
                </details>
              </section>
            )}

            {gameTab === 'setup' && (
              <section className="bingo-panel bingo-setup-panel">
                <h3>Configuración de la ronda</h3>
                <p>Define la modalidad de victoria y premio antes de cantar las bolillas.</p>

                {room.status !== 'FINISHED' && (
                  <div className="bingo-controls">
                    {['WAITING', 'BETWEEN'].includes(room.status) ? (
                      <>
                        <label>Modalidad de victoria
                          <select value={pattern} onChange={e => setPattern(e.target.value)}>
                            {Object.entries(patterns).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                          </select>
                        </label>
                        <PatternPreview pattern={pattern} />
                        <label>Premio (opcional)
                          <input maxLength={120} value={prize} onChange={e => setPrize(e.target.value)} placeholder="¿Qué se lleva el ganador?" />
                        </label>
                        <button className="primary-button" disabled={busy || !room.participantCount} onClick={async () => { await action('start', { pattern, prize }); setGameTab('board'); }}>
                          Iniciar nueva ronda →
                        </button>
                      </>
                    ) : (
                      <div className="bingo-notice">
                        <p>Hay una ronda en curso (Ronda #{round?.number} · {patterns[round?.pattern]}). Cierra la ronda actual en la pestaña "Tablero" para poder configurar la siguiente.</p>
                        <button type="button" className="secondary-button" onClick={() => setGameTab('board')}>
                          Volver al tablero de juego
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}
          </div>
        )}

        {tab === 'participants' && (
          <div className="bingo-participants-view">
            <section className="bingo-panel bingo-share-panel">
              <Share code={code} />
            </section>

            <section className="bingo-panel">
              <div className="bingo-participants-header">
                <h3>Jugadores conectados ({room.participantCount} / {room.participantLimit})</h3>
                <small className="bingo-help">Se actualiza en tiempo real conforme se unen.</small>
              </div>
              {state.data?.participants?.length ? (
                <ul className="bingo-participants-list">
                  {state.data.participants.map((p, idx) => (
                    <li key={p.id}><span>#{idx + 1}</span><strong>{p.name}</strong></li>
                  ))}
                </ul>
              ) : (
                <p className="bingo-empty-text">Aún no se han unido participantes. Comparte el código QR superior para empezar.</p>
              )}
            </section>
          </div>
        )}

        {tab === 'history' && (
          <section className="bingo-panel">
            <h3>Rondas del evento</h3>
            {room.rounds.length > 0 ? (
              <div className="bingo-rounds-history">
                {room.rounds.map(r => (
                  <div key={r.id} className="bingo-round-item">
                    <h4>Ronda #{r.number} · {patterns[r.pattern]}</h4>
                    <p>
                      <strong>Ganadores:</strong> {r.winners.map(w => w.name).join(', ') || (r.status === 'CANCELLED' ? 'Sin ganadores' : 'En curso')}
                      {r.prize && <span> · Premio: {r.prize}</span>}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p>Todavía no se han jugado rondas en esta sala.</p>
            )}
          </section>
        )}

        {tab === 'settings' && (
          <div className="bingo-settings-view">
            <section className="bingo-panel">
              <h3>Preferencias de la mesa</h3>
              <p>Configura las ayudas visuales y sonoras durante el sorteo.</p>
              <div className="bingo-setting-row">
                <div>
                  <strong>Sonido de bolillas</strong>
                  <small>Emite un tono breve cada vez que sale una bolilla nueva.</small>
                </div>
                <button
                  type="button"
                  className="secondary-button"
                  aria-pressed={sound}
                  onClick={async () => {
                    try {
                      const AudioContextClass = window.AudioContext || window.webkitAudioContext
                      if (!audio.current) audio.current = new AudioContextClass()
                      await audio.current.resume()
                      setSound(!sound)
                    } catch { setError('Este navegador no permite reproducir sonido') }
                  }}
                >
                  {sound ? '🔊 Sonido activado' : '🔇 Sonido desactivado'}
                </button>
              </div>
            </section>

            {isGuest ? (
              <>
                <section className="bingo-panel">
                  <h3>Enlace privado de recuperación</h3>
                  <p>Guarda este enlace privado para recuperar la administración de la sala si cambias de dispositivo o navegador.</p>
                  {RecoveryAccessComponent && <RecoveryAccessComponent code={room.code} adminToken={adminToken} refresh={state.reload} />}
                </section>

                <section className="bingo-panel">
                  <h3>Capacidad y cuenta</h3>
                  <p>Tu sala temporal tiene un límite de 30 cartones. Crea tu cuenta o inicia sesión para ampliar a 50 cartones gratis.</p>
                  {!loggedIn ? (
                    <details className="bingo-upgrade" open={room.participantCount >= 30 || undefined}>
                      <summary>¿Necesitas más cartones? Amplía a 50 gratis</summary>
                      <p>{room.participantCount >= 30 ? 'Tu sala alcanzó los 30 cartones. Crea tu cuenta gratuita y continúa con hasta 50 en esta misma sala.' : 'Regístrate o inicia sesión y conserva este bingo en tu cuenta.'}</p>
                      <button className="secondary-button" onClick={() => upgrade('register')}>Ampliar a 50 gratis</button>
                      <button className="bingo-sound" onClick={() => upgrade('login')}>Ya tengo una cuenta</button>
                    </details>
                  ) : (
                    AttachRoomComponent && <AttachRoomComponent room={room} adminToken={adminToken} onNavigate={onNavigate} />
                  )}
                  {room.status === 'FINISHED' && (
                    <button className="secondary-button" onClick={startAgain}>Crear otro bingo</button>
                  )}
                </section>
              </>
            ) : (
              <section className="bingo-panel">
                <h3>Espacio de trabajo</h3>
                <p>Esta sala está guardada en tu cuenta bajo el espacio <strong>{workspace?.name}</strong>.</p>
                <div className="bingo-setting-row">
                  <div>
                    <strong>Capacidad ampliada</strong>
                    <small>Hasta 50 cartones activos y almacenamiento permanente.</small>
                  </div>
                  <span className="bingo-badge-pill">50 cartones</span>
                </div>
              </section>
            )}

            {room.status !== 'FINISHED' && (
              <section className="bingo-panel bingo-danger-panel">
                <h3>Zona de peligro</h3>
                <p>Finalizar la sala terminará la partida y las rondas activas. No se podrá seguir jugando.</p>
                <button
                  type="button"
                  className="bingo-danger"
                  disabled={busy}
                  onClick={() => action('finish')}
                >
                  Finalizar sala
                </button>
              </section>
            )}
          </div>
        )}
      </section>

      <nav className="bingo-bottom" aria-label="Navegación de Bingo">
        <button type="button" aria-current={tab === 'game' ? 'page' : undefined} onClick={() => { setTab('game'); setMoreMenu(false) }}>
          <span className="bingo-nav-icon">▦</span><span>Partida</span>
        </button>
        <button type="button" aria-current={tab === 'participants' ? 'page' : undefined} onClick={() => { setTab('participants'); setMoreMenu(false) }}>
          <span className="bingo-nav-icon">👥</span><span>Jugadores</span>
        </button>
        <button type="button" aria-current={tab === 'history' ? 'page' : undefined} onClick={() => { setTab('history'); setMoreMenu(false) }}>
          <span className="bingo-nav-icon">◷</span><span>Historial</span>
        </button>
        <button
          type="button"
          aria-expanded={moreMenu}
          aria-haspopup="dialog"
          className={moreMenu || tab === 'settings' ? 'is-active-more' : ''}
          onClick={() => setMoreMenu(!moreMenu)}
        >
          <span className="bingo-nav-icon">⋯</span><span>Más</span>
        </button>
      </nav>

      {moreMenu && (
        <div className="bingo-bottom-sheet-overlay" onClick={() => setMoreMenu(false)}>
          <div className="bingo-bottom-sheet" onClick={e => e.stopPropagation()} role="dialog" aria-label="Menú de opciones adicionales">
            <div className="bingo-sheet-header">
              <span className="bingo-sheet-handle" aria-hidden="true" />
              <strong>Más opciones</strong>
            </div>
            <div className="bingo-sheet-links">
              <a
                className="bingo-sheet-item"
                href={'/bingo/' + code + '/pantalla'}
                target="_blank"
                rel="noreferrer"
                onClick={() => setMoreMenu(false)}
              >
                <span className="bingo-sheet-icon">🖥️</span>
                <div>
                  <strong>Pantalla pública ↗</strong>
                  <small>Proyecta la sala para que todos la vean</small>
                </div>
              </a>
              <button
                type="button"
                className={'bingo-sheet-item' + (tab === 'settings' ? ' is-selected' : '')}
                onClick={() => { setTab('settings'); setMoreMenu(false) }}
              >
                <span className="bingo-sheet-icon">⚙️</span>
                <div>
                  <strong>Configuración y Ajustes</strong>
                  <small>Sonido, enlace privado, cuenta y fin de sala</small>
                </div>
              </button>
              <a
                className="bingo-sheet-item"
                href="/"
                onClick={() => setMoreMenu(false)}
              >
                <span className="bingo-sheet-icon">🏠</span>
                <div>
                  <strong>Volver a mi0</strong>
                  <small>Ir a la página principal</small>
                </div>
              </a>
            </div>
            <button
              type="button"
              className="secondary-button bingo-sheet-close"
              onClick={() => setMoreMenu(false)}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
