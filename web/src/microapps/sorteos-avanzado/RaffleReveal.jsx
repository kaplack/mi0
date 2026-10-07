import { useEffect, useState } from 'react'
export function RaffleReveal({ raffle, onDone }) {
  const [stage, setStage] = useState({ prizeIndex: 0, countdown: 3, name: '', revealed: false })
  useEffect(() => {
    let cancelled = false
    const timers = new Set()
    const wait = ms => new Promise(resolve => { const timer = setTimeout(() => { timers.delete(timer); resolve() }, ms); timers.add(timer) })
    async function reveal() {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      for (let prizeIndex = 0; prizeIndex < raffle.results.length; prizeIndex++) {
        for (const countdown of [3, 2, 1]) {
          await wait(reduced ? 1 : 650)
          if (cancelled) return
          setStage({ prizeIndex, countdown, name: '', revealed: false })
        }
        if (!reduced) {
          for (const delay of [70, 70, 80, 90, 110, 140, 180, 230, 300]) {
            await wait(delay)
            if (cancelled) return
            setStage({ prizeIndex, countdown: null, name: raffle.participants[Math.floor(Math.random() * raffle.participants.length)].name, revealed: false })
          }
        }
        await wait(1)
        if (cancelled) return
        setStage({ prizeIndex, countdown: null, name: raffle.results[prizeIndex].participant.name, revealed: true })
        await wait(reduced ? 350 : 1600)
        if (cancelled) return
      }
      onDone()
    }
    reveal()
    return () => { cancelled = true; timers.forEach(clearTimeout) }
  }, [raffle, onDone])
  const result = raffle.results[stage.prizeIndex]
  return <section className="raffle-stage" aria-live="polite" aria-atomic="true">
    <small>{result.prize.name} · {stage.prizeIndex + 1} de {raffle.results.length}</small>
    {stage.countdown !== null
      ? <strong className="raffle-countdown" key={stage.prizeIndex + '-' + stage.countdown}>{stage.countdown}</strong>
      : <><small>{stage.revealed ? 'GANADOR' : 'ELIGIENDO…'}</small><strong className="raffle-running-name">{stage.name}</strong></>}
    <p className="advanced-muted">Los resultados ya están guardados.</p>
  </section>
}
