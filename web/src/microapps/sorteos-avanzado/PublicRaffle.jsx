import { useEffect, useState } from 'react'
import { Logo } from '../../components/Logo'
import { rafflesApi } from '../../services/raffles'
import '../sorteos/Sorteos.css'
import './SorteosAvanzado.css'
export function PublicRaffle({ code }) {
  const [raffle, setRaffle] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    rafflesApi.publicResults(code, controller.signal).then(data => setRaffle(data.raffle))
      .catch(err => { if (!controller.signal.aborted) setError(err.message) })
    return () => controller.abort()
  }, [code])
  return <div className="raffle-shell">
    <header className="raffle-header"><Logo /><a href="/">Ir a mi0</a></header>
    <main className="raffle-main advanced-public-main">
      {error ? <section className="raffle-card"><h1>Resultados no disponibles</h1><p role="alert">{error}</p></section> : !raffle ? <p role="status">Cargando resultados…</p> : <>
        <section className="raffle-intro"><span className="raffle-kicker">RESULTADOS DEL SORTEO</span><h1>{raffle.name}</h1><p>{new Date(raffle.drawnAt).toLocaleString('es-PE')}</p><p>{raffle.participantCount} participantes</p></section>
        <section className="raffle-card"><h2>Premios y ganadores</h2><ol className="advanced-results">{raffle.results.map((result, index) => <li key={index}><span>{result.prize}</span><strong>{result.winner}</strong></li>)}</ol></section>
      </>}
      <p className="advanced-credit">Realizado con <a href="/">mi0</a></p>
    </main>
  </div>
}
