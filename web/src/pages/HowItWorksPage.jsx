import { useEffect } from 'react'
import { SiteHeader, SiteFooter } from '../components/SiteLayout'
import './HowItWorksPage.css'

const steps = [
  {
    title: 'Encuentra tu herramienta',
    description: 'Explora las microapps y elige la que te ayude a resolver una tarea: organizar citas, gestionar turnos o realizar un sorteo.',
    detail: 'Una microapp es una herramienta enfocada en una tarea concreta.',
    tone: 'mint',
  },
  {
    title: 'Empieza a tu manera',
    description: 'Algunas herramientas se usan directamente. Otras necesitan una cuenta para guardar y administrar tu información.',
    detail: 'Por ejemplo, puedes hacer un sorteo simple sin crear una cuenta.',
    tone: 'blue',
  },
  {
    title: 'Comparte cuando lo necesites',
    description: 'En las herramientas que lo permiten, comparte un enlace o un QR para que otras personas participen.',
    detail: 'Así pueden reservar una cita o tomar un turno desde su celular.',
    tone: 'violet',
  },
]

export function HowItWorksPage(props) {
  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Cómo funciona | mi0.app'
    return () => { document.title = previousTitle }
  }, [])

  return <div className="app-shell how-page">
    <a className="how-skip-link" href="#guia-mi0">Saltar al contenido</a>
    <SiteHeader {...props} howItWorks />
    <main id="guia-mi0" className="how-main" tabIndex={-1}>
      <section className="how-hero" aria-labelledby="how-title">
        <span className="eyebrow">CÓMO FUNCIONA</span>
        <h1 id="how-title">Así de simple <span>es Mi0.</span></h1>
        <p>Pequeñas herramientas para tareas de todos los días.<br />Elige lo que necesitas y empieza desde tu navegador.</p>
      </section>
      <ol className="how-steps" aria-label="Cómo empezar con Mi0">
        {steps.map((step, index) => <li key={step.title} className="how-step">
          <span className={'how-number ' + step.tone} aria-hidden="true">0{index + 1}</span>
          <h2>{step.title}</h2>
          <p>{step.description}</p>
          <p className="how-detail">{step.detail}</p>
        </li>)}
      </ol>
      <section className="how-cta" aria-labelledby="how-cta-title">
        <h2 id="how-cta-title">¿Qué quieres resolver hoy?</h2>
        <p>Encuentra una herramienta que te ayude a dar el siguiente paso.</p>
        <a className="primary-button how-button" href="/#herramientas">Explorar herramientas <span aria-hidden="true">→</span></a>
      </section>
    </main>
    <SiteFooter />
  </div>
}
