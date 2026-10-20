import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { Logo } from '../../components/Logo'
import { TOKEN_KEY } from '../../services/api'
import { bingo, playerToken } from '../../services/bingo'
import { useBingo } from './useBingo'
import './MiBingo.css'

const patterns = { ONE: 'Una línea horizontal', TWO: 'Dos líneas horizontales', FULL: 'Cartón lleno' }
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
  return <div className={'bingo' + (publicDisplay ? ' bingo-display' : '')}><header className="bingo-header"><a href="/"><Logo /></a><span>Mi Bingo</span>{!code && <a href="/">← Volver a mi0</a>}</header>{code ? publicDisplay ? <PublicDisplay code={code} /> : <Player key={code} code={code} /> : <Manager workspaceId={workspaceId} onNavigate={onNavigate} onLogin={onLogin} />}</div>
}
function PublicDisplay({ code }) {
  const state = useBingo(() => bingo.state(code), code)
  return <main className="bingo-public-screen"><Notice error>{state.error && 'Conexión interrumpida: ' + state.error}</Notice>{state.data ? <><h1>{state.data.room.name}</h1><RoundInfo room={state.data.room} publicDisplay /><p>mi0.app · Mi Bingo</p></> : <p role="status">Cargando sala…</p>}</main>
}
function Player({ code }) {
  const [identity] = useState(() => playerToken(code))
  const [joined, setJoined] = useState(() => localStorage.getItem('mi0_bingo_joined_' + code) === 'yes')
  const state = useBingo(() => bingo.state(code, joined ? identity : null), code + joined)
  const [name, setName] = useState(''), [busy, setBusy] = useState(false), [message, setMessage] = useState('')
  const room = state.data?.room, p = state.data?.participant, round = room?.rounds.at(-1)
  async function join(event) {
    event.preventDefault(); setBusy(true); setMessage('')
    try { await bingo.join(code, { name, token: identity }); localStorage.setItem('mi0_bingo_joined_' + code, 'yes'); setJoined(true) }
    catch (e) { setMessage(e.message) } finally { setBusy(false) }
  }
  async function claim() {
    setBusy(true)
    try { const result = await bingo.claim(code, { token: identity, roundId: round.id }); setMessage(result.message); await state.reload() }
    catch (e) { setMessage(e.message) } finally { setBusy(false) }
  }
  return <main className="bingo-player"><Notice error>{state.error && 'No pudimos sincronizar: ' + state.error}</Notice>{!room ? <p role="status">Cargando sala…</p> : <><h1>{room.name}</h1>{!p ? <section className="bingo-panel"><span className="eyebrow">BIENVENIDO A MI BINGO</span><h2>Tu cartón te espera</h2><p>Juega desde aquí. Conserva este navegador para recuperar tu cartón.</p>{joined ? <p>Reintentando recuperar tu cartón…</p> : <form onSubmit={join}><label>Tu nombre<input required maxLength={80} value={name} onChange={e => setName(e.target.value)} autoComplete="given-name" /></label><button className="primary-button" disabled={busy || !['WAITING', 'BETWEEN'].includes(room.status)}>Recibir mi cartón</button><p>{statuses[room.status]}</p></form>}</section> : <section className="bingo-panel"><div className="bingo-player-name">Hola, <strong>{p.name}</strong></div><RoundInfo room={room} /><PlayingCard key={round?.id || 'waiting'} card={p.card} storageKey={'mi0_bingo_marks_' + p.id + '_' + (round?.id || 'waiting')} disabled={room.status !== 'PLAYING' || !['ACTIVE', 'RESOLVING'].includes(round?.status)} /><p className="bingo-help">Toca un número para marcarlo o desmarcarlo.</p><button className="primary-button bingo-claim" disabled={busy || room.status !== 'PLAYING' || !['ACTIVE', 'RESOLVING'].includes(round?.status)} onClick={claim}>¡BINGO!</button>{room.status === 'BETWEEN' && <Notice>Espera la próxima ronda. Conservarás los números de tu cartón.</Notice>}</section>}<Notice>{message}</Notice></>}</main>
}
function PlayingCard({ card, storageKey, disabled }) {
  const [marks, setMarks] = useState(() => { try { const saved = JSON.parse(localStorage.getItem(storageKey) || '[]'); return Array.isArray(saved) ? saved : [] } catch { return [] } })
  function toggle(n) { const next = marks.includes(n) ? marks.filter(x => x !== n) : [...marks, n]; setMarks(next); localStorage.setItem(storageKey, JSON.stringify(next)) }
  return <div className="bingo-card">{'BINGO'.split('').map(letter => <strong key={letter}>{letter}</strong>)}{card.map((n, i) => <button key={i} disabled={!n || disabled} aria-label={n ? String(n) : 'Centro libre'} aria-pressed={!n || marks.includes(n)} className={!n || marks.includes(n) ? 'marked' : ''} onClick={() => toggle(n)}>{n || <span>★<small>LIBRE</small></span>}</button>)}</div>
}
function Manager({ workspaceId, onNavigate, onLogin }) {
  const loggedIn = Boolean(localStorage.getItem(TOKEN_KEY))
  const state = useBingo(() => loggedIn ? bingo.spaces() : Promise.resolve({ workspaces: [] }), loggedIn, false)
  const spaces = state.data?.workspaces.filter(w => w.role === 'OWNER') || []
  const workspace = spaces.find(w => w.id === workspaceId) || (!workspaceId ? spaces[0] : null)
  if (!loggedIn) return <main className="bingo-player bingo-panel"><h1>Mi Bingo</h1><p>Inicia sesión para organizar tu evento. Los jugadores no necesitan cuenta.</p><button className="primary-button" onClick={onLogin}>Iniciar sesión</button></main>
  return <main className="bingo-manager"><Notice error>{state.error}</Notice>{!state.data ? <p>Cargando espacios…</p> : !workspace ? <section className="bingo-panel"><h1>Mi Bingo</h1><p>Necesitas un espacio propio para organizar una sala.</p><a href="/">Ir a mis espacios →</a></section> : <Workspace key={workspace.id} workspace={workspace} spaces={spaces} onNavigate={onNavigate} />}</main>
}
function Workspace({ workspace, spaces, onNavigate }) {
  const state = useBingo(() => bingo.list(workspace.id), workspace.id, false)
  const [selected, setSelected] = useState(null), [name, setName] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const [collapsed, setCollapsed] = useState(false), [menu, setMenu] = useState(false), [tab, setTab] = useState('game')
  const rooms = state.data?.rooms || [], current = selected || rooms.find(r => r.status !== 'FINISHED')?.code
  async function create(e) {
    e.preventDefault(); setBusy(true); setError('')
    try { const data = await bingo.create({ name, workspaceId: workspace.id }); setSelected(data.room.code); setName(''); await state.reload() }
    catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  async function finished() { await state.reload(); setSelected(null) }
  return <div className={'bingo-layout' + (collapsed ? ' collapsed' : '')}><aside className={'bingo-sidebar' + (menu ? ' open' : '')}><button className="secondary-button" aria-label="Colapsar menú" onClick={() => setCollapsed(!collapsed)}>☰</button>{(!collapsed || menu) && <><span className="eyebrow">MI BINGO</span><h2>{workspace.name}</h2><label>Espacio<select value={workspace.id} onChange={e => onNavigate('/mi-bingo/' + e.target.value)}>{spaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label><nav><button onClick={() => { setTab('game'); setMenu(false) }}>▦ Partida</button><button onClick={() => { setTab('share'); setMenu(false) }}>▧ Compartir QR</button><button onClick={() => { setSelected(null); setTab('history'); setMenu(false); state.reload() }}>◷ Historial</button></nav><a href="/">← Volver a mi0</a></>}</aside><section className="bingo-content"><div className="bingo-title"><div><span className="eyebrow">JUEGA Y COMPARTE</span><h1>Mi Bingo</h1><p>Una sala, muchos cartones y un gran momento.</p></div><button className="secondary-button bingo-menu" aria-label="Abrir menú" onClick={() => setMenu(!menu)}>☰</button></div><Notice error>{error || state.error}</Notice>{tab === 'history' ? <section className="bingo-panel"><h2>Tus salas</h2>{rooms.length ? rooms.map(room => <button className="bingo-history-row" key={room.id} onClick={() => { setSelected(room.code); setTab('game') }}><strong>{room.name}</strong><span>{statuses[room.status]} · {room.rounds.length} rondas →</span></button>) : <p>Aún no has creado salas.</p>}<button className="secondary-button" onClick={() => { setSelected(null); setTab('game') }}>Volver a la partida</button></section> : current ? <Organizer key={current} code={current} tab={tab} onFinished={finished} /> : <section className="bingo-panel bingo-create"><span className="bingo-create-icon">▦</span><h2>Que empiece la diversión</h2><p>Crea tu sala y comparte el QR. Cada jugador recibirá un cartón único.</p><form onSubmit={create}><label>Nombre del evento<input required maxLength={120} placeholder="Por ejemplo: Bingo de amigos" value={name} onChange={e => setName(e.target.value)} /></label><button disabled={busy} className="primary-button">Crear sala →</button></form></section>}</section><nav className="bingo-bottom" aria-label="Navegación de Bingo"><button onClick={() => setTab('game')}>▦<span>Partida</span></button><button onClick={() => setTab('share')}>▧<span>QR</span></button><button onClick={() => { setTab('history'); state.reload() }}>◷<span>Historial</span></button></nav></div>
}
function Organizer({ code, tab, onFinished }) {
  const state = useBingo(() => bingo.info(code), code)
  const [pattern, setPattern] = useState('ONE'), [prize, setPrize] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const [sound, setSound] = useState(false)
  const audio = useRef(null), lastPlayed = useRef(null)
  const room = state.data?.room, round = room?.rounds.at(-1), last = round?.balls.at(-1)
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
    try { await bingo.action(code, kind, body); await state.reload(); if (kind === 'finish') onFinished() }
    catch (e) { setError(e.message); await state.reload() } finally { setBusy(false) }
  }
  if (!room) return <><Notice error>{state.error}</Notice><p>Cargando sala…</p></>
  return <><div className="bingo-room-heading"><h2>{room.name}</h2><a className="secondary-button" href={'/bingo/' + code + '/pantalla'} target="_blank" rel="noreferrer">Pantalla pública ↗</a></div><Notice error>{error || (state.error && 'Sincronización pendiente: ' + state.error)}</Notice>{tab === 'share' ? <section className="bingo-panel"><Share code={code} /></section> : <div className="bingo-organizer-grid"><section className="bingo-panel"><RoundInfo room={room} />{room.status !== 'FINISHED' && <div className="bingo-controls">{['WAITING', 'BETWEEN'].includes(room.status) ? <><label>Modalidad<select value={pattern} onChange={e => setPattern(e.target.value)}>{Object.entries(patterns).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label><label>Premio (opcional)<input maxLength={120} value={prize} onChange={e => setPrize(e.target.value)} placeholder="¿Qué se lleva el ganador?" /></label><button className="primary-button" disabled={busy || !room.participantCount} onClick={() => action('start', { pattern, prize })}>Iniciar nueva ronda →</button></> : <><button className="primary-button bingo-draw" disabled={busy || !!state.error || round?.status !== 'ACTIVE' || round.balls.length === 75} onClick={() => action('draw', { roundId: round.id, expectedCount: round.balls.length })}>Sacar bolilla</button>{round?.status === 'RESOLVING' && <p>Da tiempo a los demás jugadores para reclamar antes de cerrar.</p>}<button className="secondary-button" disabled={busy} onClick={() => action('close')}>{round?.winners.length ? 'Cerrar reclamaciones y confirmar' : 'Cerrar ronda sin ganadores'}</button></>}<button className="bingo-sound" aria-pressed={sound} onClick={async () => { try { if (!audio.current) audio.current = new AudioContext(); await audio.current.resume(); setSound(!sound) } catch { setError('Este navegador no permite reproducir el sonido') } }}>Sonido: {sound ? 'activado' : 'desactivado'}</button></div>}<BallBoard round={round} /><details><summary>Orden de salida</summary><p>{round?.balls.map(ballLabel).join(' · ') || 'Todavía no hay bolillas sorteadas.'}</p></details></section><div className="bingo-side-panels"><section className="bingo-panel"><h3>{room.participantCount} participantes</h3><details><summary>Ver inscritos</summary><ul>{state.data.participants.map(p => <li key={p.id}>{p.name}</li>)}</ul></details></section><section className="bingo-panel"><Share code={code} /></section>{room.rounds.length > 0 && <section className="bingo-panel"><h3>Rondas del evento</h3>{room.rounds.map(r => <p key={r.id}>#{r.number} · {patterns[r.pattern]}<br /><small>{r.winners.map(w => w.name).join(', ') || (r.status === 'CANCELLED' ? 'Sin ganadores' : 'En curso')}{r.prize && ' · ' + r.prize}</small></p>)}</section>}{room.status !== 'FINISHED' && <button className="bingo-danger" disabled={busy} onClick={() => action('finish')}>Finalizar sala</button>}</div></div>}</>
}
