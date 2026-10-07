import { useEffect, useState } from 'react'
export function RaffleReveal({ raffle, onDone }) {
  const [prizeIndex, setPrizeIndex] = useState(0)
  const [stage, setStage] = useState({ countdown: 3, name: '', revealed: false })
  useEffect(() => {
    let cancelled = false
    const timers = new Set()
    const wait = ms => new Promise(resolve => { const timer = setTimeout(() => { timers.delete(timer); resolve() }, ms); timers.add(timer) })
    async function reveal() {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      for (const countdown of [3, 2, 1]) {
        await wait(reduced ? 1 : 650)
        if (cancelled) return
        setStage({ countdown, name: '', revealed: false })
      }
      if (!reduced) {
        for (const delay of [70, 70, 80, 90, 110, 140, 180, 230, 300]) {
          await wait(delay)
          if (cancelled) return
          setStage({ countdown: null, name: raffle.participants[Math.floor(Math.random() * raffle.participants.length)].name, revealed: false })
        }
      }
      await wait(1)
      if (cancelled) return
      setStage({ countdown: null, name: raffle.results[prizeIndex].participant.name, revealed: true })
    }
    reveal()
    return () => { cancelled = true; timers.forEach(clearTimeout) }
  }, [raffle, prizeIndex])
  const result = raffle.results[prizeIndex]
  const last = prizeIndex === raffle.results.length - 1
  function next() {
    if (last) onDone()
    else { setStage({ countdown: 3, name: '', revealed: false }); setPrizeIndex(index => index + 1) }
  }
  return <section className="raffle-stage">
    <div aria-live="polite" aria-atomic="true">
      <small>{result.prize.name} · {prizeIndex + 1} de {raffle.results.length}</small>
      {stage.countdown !== null
        ? <strong className="raffle-countdown" key={prizeIndex + '-' + stage.countdown}>{stage.countdown}</strong>
        : <><small>{stage.revealed ? 'GANADOR' : 'ELIGIENDO…'}</small><strong className="raffle-running-name">{stage.name}</strong></>}
    </div>
    <p className="advanced-muted">Los resultados ya están guardados.</p>
    {stage.revealed && <button className="raffle-draw advanced-continue" type="button" onClick={next}>{last ? 'Ver todos los resultados' : 'Continuar con el siguiente premio'}</button>}
  </section>
}
