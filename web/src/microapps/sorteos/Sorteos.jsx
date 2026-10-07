import { useEffect, useMemo, useRef, useState } from 'react'
import { Logo } from '../../components/Logo'
import './Sorteos.css'

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export function Sorteos({ onBack }) {
  const [text, setText] = useState('')
  const [winner, setWinner] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [countdown, setCountdown] = useState(null)
  const [drawing, setDrawing] = useState(false)
  const runIdRef = useRef(0)

  const participants = useMemo(() => text
    .split(/\n|,/)
    .map((name) => name.trim())
    .filter(Boolean), [text])

  useEffect(() => () => {
    runIdRef.current += 1
  }, [])

  async function draw() {
    if (participants.length < 2 || drawing) return

    const runId = runIdRef.current + 1
    runIdRef.current = runId
    const selectedWinner = participants[Math.floor(Math.random() * participants.length)]

    setDrawing(true)
    setWinner('')
    setDisplayName('')
    setCountdown(3)

    for (const number of [3, 2, 1]) {
      if (runIdRef.current !== runId) return
      setCountdown(number)
      await wait(650)
    }

    if (runIdRef.current !== runId) return
    setCountdown(null)

    const delays = [
      70, 70, 70, 70, 70, 70, 75, 75, 80, 80,
      90, 100, 110, 125, 145, 170, 200, 240, 290, 350,
    ]

    let previousIndex = -1

    for (const delay of delays) {
      if (runIdRef.current !== runId) return

      let index = Math.floor(Math.random() * participants.length)
      if (participants.length > 1 && index === previousIndex) {
        index = (index + 1) % participants.length
      }
      previousIndex = index
      setDisplayName(participants[index])
      await wait(delay)
    }

    if (runIdRef.current !== runId) return
    setDisplayName(selectedWinner)
    await wait(420)

    if (runIdRef.current !== runId) return
    setWinner(selectedWinner)
    setDrawing(false)
  }

  function reset() {
    runIdRef.current += 1
    setText('')
    setWinner('')
    setDisplayName('')
    setCountdown(null)
    setDrawing(false)
  }

  return (
    <div className="raffle-shell">
      <header className="raffle-header">
        <Logo />
        <button type="button" onClick={onBack} disabled={drawing}>← Volver a mi0</button>
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
            onChange={(event) => {
              setText(event.target.value)
              setWinner('')
              setDisplayName('')
            }}
            placeholder={'Ana\nCarlos\nLucía\nMiguel'}
            autoFocus
            disabled={drawing}
          />
          <div className="raffle-meta">
            <span>{participants.length} {participants.length === 1 ? 'participante' : 'participantes'}</span>
            {text && <button type="button" onClick={reset} disabled={drawing}>Limpiar</button>}
          </div>

          <button className="raffle-draw" type="button" onClick={draw} disabled={participants.length < 2 || drawing}>
            {drawing ? 'Sorteando…' : 'Sortear'}
          </button>

          {participants.length === 1 && !drawing && <p className="raffle-hint">Agrega al menos 2 participantes.</p>}

          {drawing && (
            <div className="raffle-stage" aria-live="polite" aria-atomic="true">
              {countdown !== null ? (
                <>
                  <small>PREPÁRATE</small>
                  <strong className="raffle-countdown" key={countdown}>{countdown}</strong>
                </>
              ) : (
                <>
                  <small>ELIGIENDO…</small>
                  <strong className="raffle-running-name">{displayName}</strong>
                </>
              )}
            </div>
          )}

          {winner && !drawing && (
            <div className="raffle-result" aria-live="polite">
              <small>GANADOR 🎉</small>
              <strong>{winner}</strong>
              <button type="button" onClick={draw}>Sortear otra vez</button>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
