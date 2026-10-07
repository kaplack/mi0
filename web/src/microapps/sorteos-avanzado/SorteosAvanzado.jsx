import { useCallback, useState } from 'react'
import { Logo } from '../../components/Logo'
import { useRaffles } from './useRaffles'
import { RaffleReveal } from './RaffleReveal'
import '../sorteos/Sorteos.css'
import './SorteosAvanzado.css'
const names = text => text.split(/\n|,/).map(name => name.trim()).filter(Boolean)
const date = value => new Date(value).toLocaleString('es-PE')
export function SorteosAvanzado({ workspace, onBack }) {
  const store = useRaffles(workspace.id)
  const [selectedId, setSelectedId] = useState(null)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [text, setText] = useState('')
  const [prizes, setPrizes] = useState([''])
  const [reference, setReference] = useState('')
  const [reveal, setReveal] = useState(null)
  const [copied, setCopied] = useState(false)
  const finishReveal = useCallback(() => setReveal(null), [])
  const selected = store.raffles.find(item => item.id === selectedId)
  const writable = ['OWNER', 'ADMIN'].includes(workspace.role)
  const participants = names(text)
  const duplicate = new Set(participants.map(item => item.normalize('NFC').toLocaleLowerCase('es'))).size !== participants.length
  const valid = name.trim() && participants.length >= 2 && participants.length <= 1000 && !duplicate && prizes.every(item => item.trim()) && participants.length >= prizes.length
  function edit(raffle) {
    setSelectedId(raffle?.id || null); setName(raffle?.name || '')
    setText(raffle?.participants.map(item => item.name).join('\n') || '')
    setPrizes(raffle?.prizes.map(item => item.name) || [''])
    setEditing(true); setReference(''); store.setError('')
  }
  async function save(event) {
    event.preventDefault()
    const raffle = await store.save({ name, participants, prizes }, selectedId)
    if (raffle) { setSelectedId(raffle.id); setEditing(false) }
  }
  async function draw() {
    const raffle = await store.draw(selected.id)
    if (raffle) setReveal(raffle)
  }
  async function publish(event) {
    event.preventDefault()
    if (await store.publish(selected.id, reference)) setReference('')
  }
  const shareUrl = selected?.publicCode ? window.location.origin + '/s/' + selected.publicCode : ''
  async function copyLink() {
    try { await navigator.clipboard.writeText(shareUrl); setCopied(true) }
    catch { store.setError('No se pudo copiar. Puedes seleccionar el enlace y copiarlo manualmente.') }
  }
  return <div className="raffle-shell">
    <header className="raffle-header"><Logo /><button type="button" onClick={onBack} disabled={!!reveal || store.busy}>← Volver a Mi0</button></header>
    <main className="advanced-main">
      <section className="raffle-intro"><span className="raffle-kicker">{workspace.name}</span><h1>Sorteos Avanzado</h1><p>Varios premios. Un ganador por premio. Resultados guardados.</p></section>
      {store.error && <p className="advanced-error" role="alert">{store.error}</p>}
      {store.loading ? <p role="status">Cargando tus sorteos…</p> : <div className="advanced-layout">
        <aside className="raffle-card advanced-list">
          <h2>Mis sorteos</h2>
          {writable && <button className="raffle-draw" type="button" disabled={store.busy || !!reveal} onClick={() => edit(null)}>Crear sorteo</button>}
          {!store.raffles.length && <p className="advanced-muted">Aquí aparecerán tus sorteos guardados.</p>}
          {store.raffles.map(item => <button key={item.id} className={'advanced-list-item' + (selectedId === item.id ? ' selected' : '')} disabled={store.busy || !!reveal} onClick={() => { setSelectedId(item.id); setEditing(false); setReference(''); setCopied(false); store.setError('') }}>
            <strong>{item.name}</strong><small>{item.status === 'DRAFT' ? 'Borrador' : item.publicCode ? 'Publicado' : 'Realizado'} · {item.prizes.length} premios</small>
          </button>)}
        </aside>
        <section className="raffle-card advanced-detail">
          {reveal ? <RaffleReveal raffle={reveal} onDone={finishReveal} /> : editing ? <form onSubmit={save}>
            <h2>{selectedId ? 'Editar borrador' : 'Crear sorteo'}</h2>
            <label>Nombre del sorteo<input value={name} onChange={event => setName(event.target.value)} maxLength={120} required disabled={store.busy} placeholder="Sorteo de aniversario" /></label>
            <label>Participantes<textarea value={text} onChange={event => setText(event.target.value)} disabled={store.busy} placeholder={'Ana Pérez\nCarlos Ruiz\nLucía Díaz'} /></label>
            <small className="advanced-muted">{participants.length} participantes · Máximo 1000. Una persona por línea o separada por coma.</small>
            {duplicate && <p className="advanced-error">Hay nombres repetidos. Añade un apellido o identificador para distinguirlos.</p>}
            <fieldset disabled={store.busy}><legend>Premios</legend>{prizes.map((prize, index) => <div className="advanced-prize-row" key={index}>
              <label className="advanced-prize-label">Premio {index + 1}<input value={prize} onChange={event => setPrizes(previous => previous.map((value, i) => i === index ? event.target.value : value))} maxLength={120} placeholder="Pizza familiar" required /></label>
              {prizes.length > 1 && <button type="button" className="advanced-secondary" aria-label={'Eliminar premio ' + (index + 1)} onClick={() => setPrizes(previous => previous.filter((_, i) => i !== index))}>×</button>}
            </div>)}
            <button type="button" className="advanced-secondary" disabled={prizes.length >= 50} onClick={() => setPrizes(previous => [...previous, ''])}>＋ Agregar premio</button></fieldset>
            <p className="advanced-muted">Cada participante puede ganar una sola vez. Necesitas al menos dos participantes y uno por cada premio.</p>
            <button className="raffle-draw" disabled={!valid || store.busy}>{store.busy ? 'Guardando…' : 'Guardar sorteo'}</button>
            <button className="advanced-secondary" type="button" disabled={store.busy} onClick={() => setEditing(false)}>Cancelar</button>
          </form> : selected ? <>
            <span className="raffle-kicker">{selected.status === 'DRAFT' ? 'BORRADOR' : 'RESULTADOS GUARDADOS'}</span>
            <h2>{selected.name}</h2><p className="advanced-muted">{selected.participants.length} participantes · {selected.prizes.length} premios</p>
            {selected.status === 'DRAFT' ? <>
              <ol className="advanced-results">{selected.prizes.map(prize => <li key={prize.id}>{prize.name}</li>)}</ol>
              <details><summary>Ver participantes</summary><ul>{selected.participants.map(person => <li key={person.id}>{person.name}</li>)}</ul></details>
              {writable ? <><p className="advanced-muted">Al sortear, se guardarán todos los ganadores. Después no podrás cambiar la lista ni repetir este sorteo.</p>
                <button className="raffle-draw" type="button" disabled={store.busy} onClick={draw}>{store.busy ? 'Guardando resultados…' : 'Realizar sorteo'}</button>
                <button className="advanced-secondary" type="button" disabled={store.busy} onClick={() => edit(selected)}>Editar borrador</button></>
                : <p>Solo un propietario o administrador puede realizar este sorteo.</p>}
            </> : <>
              <p className="advanced-muted">Realizado: {date(selected.drawnAt)}</p>
              <ol className="advanced-results">{selected.results.map(result => <li key={result.prize.id}><span>{result.prize.name}</span><strong>{result.participant.name}</strong></li>)}</ol>
              {selected.publicCode ? <section className="advanced-publication"><h3>Resultados publicados</h3><a className="advanced-share-link" href={shareUrl} target="_blank" rel="noreferrer">{shareUrl}</a><button className="advanced-secondary" type="button" onClick={copyLink}>{copied ? 'Enlace copiado' : 'Copiar enlace'}</button></section>
                : selected.publication?.status === 'PENDING' ? <section className="advanced-publication"><h3>Pendiente de aprobación</h3><p>Estamos verificando tu pago de S/4.90. Vuelve a abrir este sorteo para consultar el estado.</p><p className="advanced-muted">Operación: {selected.publication.reference}</p><button className="advanced-secondary" type="button" disabled={store.busy} onClick={() => store.refresh(selected.id)}>Actualizar estado</button></section>
                : <section className="advanced-publication"><h3>Publicar y compartir — S/4.90</h3><p>Comparte premios y ganadores mediante un enlace público. Los demás participantes y tus datos de cuenta permanecen privados.</p>
                  {selected.publication?.status === 'REJECTED' && <p className="advanced-error">Solicitud rechazada: {selected.publication.rejectionReason}. Puedes registrar una nueva operación.</p>}
                  {!writable ? <p>Solo un propietario o administrador puede solicitar la publicación.</p> : store.config?.enabled ? <form onSubmit={publish}>
                    <p>Yapea <strong>S/4.90</strong> al <strong>{store.config.yapePhone}</strong><br />Beneficiario: <strong>{store.config.yapeName}</strong></p>
                    <p className="advanced-muted">La publicación requiere verificación manual. El enlace estará disponible después de la aprobación.</p>
                    <label>Número de operación Yape<input value={reference} onChange={event => setReference(event.target.value)} minLength={4} maxLength={40} pattern="[a-zA-Z0-9-]{4,40}" required disabled={store.busy} /></label>
                    <button className="raffle-draw" disabled={store.busy}>{store.busy ? 'Enviando…' : 'Ya pagué: solicitar publicación'}</button>
                  </form> : <p>La publicación por Yape estará disponible próximamente. Tus resultados ya están guardados.</p>}
                </section>}
            </>}
          </> : <div className="advanced-empty"><h2>Un sorteo, varios premios</h2><p>Guarda participantes y premios, realiza tu sorteo y consulta los ganadores cuando quieras.</p><p className="advanced-muted">Crear y guardar es gratis. Publicar un enlace cuesta S/4.90.</p></div>}
        </section>
      </div>}
    </main>
  </div>
}
