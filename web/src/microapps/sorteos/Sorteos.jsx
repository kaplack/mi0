import { useMemo, useState } from 'react'
import { Logo } from '../../components/Logo'
import './Sorteos.css'

export function Sorteos({ onBack }) {
  const [text, setText] = useState('')
  const [winner, setWinner] = useState('')

  const participants = useMemo(() => text
    .split(/\n|,/)
    .map((name) => name.trim())
    .filter(Boolean), [text])

  function draw() {
    if (participants.length < 2) return
    const index = Math.floor(Math.random() * participants.length)
    setWinner(participants[index])
  }

  function reset() {
    setText('')
    setWinner('')
  }

  return (
    <div className="raffle-shell">
      <header className="raffle-header">
        <Logo />
        <button type="button" onClick={onBack}>← Volver a mi0</button>
      </header>

      <main className="raffle-main">
        <section className="raffle-intro">
          <span className="raffle-kicker">MICROAPP GRATIS</span>
          <h1>Sorteos</h1>
          <p>Agrega participantes y elige un ganador al azar. Sin registro.</p>
        </section>

        <section className="raffle-card">
          <label htmlFor="participants">Participantes</label>
          <textarea
            id="participants"
            value={text}
            onChange={(event) => { setText(event.target.value); setWinner('') }}
            placeholder={'Ana\nCarlos\nLucía\nMiguel'}
            autoFocus
          />
          <div className="raffle-meta">
            <span>{participants.length} {participants.length === 1 ? 'participante' : 'participantes'}</span>
            {text && <button type="button" onClick={reset}>Limpiar</button>}
          </div>

          <button className="raffle-draw" type="button" onClick={draw} disabled={participants.length < 2}>
            Sortear
          </button>

          {participants.length === 1 && <p className="raffle-hint">Agrega al menos 2 participantes.</p>}

          {winner && (
            <div className="raffle-result" aria-live="polite">
              <small>GANADOR</small>
              <strong>{winner}</strong>
              <button type="button" onClick={draw}>Sortear otra vez</button>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
