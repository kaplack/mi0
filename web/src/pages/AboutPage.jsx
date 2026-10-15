import { useEffect } from 'react'
import { SiteHeader, SiteFooter } from '../components/SiteLayout'
import './AboutPage.css'

function AboutIcon({ kind }) {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === 'simple' ? <path d="m13 2-9 12h7l-1 8 10-12h-7l1-8Z" /> : kind === 'person' ? <><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></> : <><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z" /></>}
  </svg>
}

export function AboutPage(props) {
  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Quiénes somos | mi0.app'
    return () => { document.title = previousTitle }
  }, [])

  return <div className="app-shell about-page">
    <a className="about-skip-link" href="#sobre-mi0">Saltar al contenido</a>
    <SiteHeader {...props} about />
    <main id="sobre-mi0" className="about-main" tabIndex={-1}>
      <section className="about-hero" aria-labelledby="about-title">
        <span className="eyebrow">QUIÉNES SOMOS</span>
        <h1 id="about-title">Una idea personal.<br /><span>Muchas posibilidades.</span></h1>
        <p>Mi0 es una marca y un proyecto personal con un propósito: crear pequeñas herramientas que hagan más sencillo tu día a día.</p>
        <a className="primary-button about-button" href="/#herramientas">Explorar herramientas <span aria-hidden="true">→</span></a>
        <div className="about-caption"><span aria-hidden="true" />Hecho con curiosidad. Pensado para ser útil.</div>
      </section>

      <section className="about-story" aria-labelledby="about-story-title">
        <div className="about-section-label">DETRÁS DE LA MARCA</div>
        <div>
          <h2 id="about-story-title">Un proyecto personal,<br />con ganas de crecer.</h2>
          <p>Detrás de Mi0 hay una persona que diseña, desarrolla y decide el rumbo del proyecto. Una marca propia, construida herramienta a herramienta.</p>
          <p>La idea es que puedas resolver tareas concretas con menos complicaciones: organizar citas, gestionar turnos o realizar un sorteo. Pequeñas soluciones que te dejen espacio para lo que quieres hacer.</p>
        </div>
      </section>

      <section className="about-principles" aria-labelledby="about-principles-title">
        <div className="about-section-heading"><span className="about-section-label">LO QUE GUÍA A MI0</span><h2 id="about-principles-title">Pequeñas herramientas, con intención.</h2></div>
        <div className="about-card-grid">
          <article className="about-card"><div className="about-icon mint"><AboutIcon kind="simple" /></div><h3>La utilidad primero</h3><p>Cada herramienta tiene una tarea clara. El objetivo es ayudarte a resolverla de forma sencilla.</p></article>
          <article className="about-card"><div className="about-icon blue"><AboutIcon kind="person" /></div><h3>Una mirada personal</h3><p>Las decisiones de producto, diseño y desarrollo mantienen una misma dirección, con atención a los detalles.</p></article>
          <article className="about-card"><div className="about-icon violet"><AboutIcon kind="spark" /></div><h3>Espacio para mejorar</h3><p>Mi0 es un proyecto en evolución. Cada uso es una oportunidad para entender qué puede ser más claro y útil.</p></article>
        </div>
      </section>

      <section className="about-ai" aria-labelledby="about-ai-title">
        <div className="about-icon violet"><AboutIcon kind="spark" /></div>
        <div><span className="about-section-label">TECNOLOGÍA CON DIRECCIÓN HUMANA</span><h2 id="about-ai-title">También hay una mano de la IA.</h2><p>Mi0 se construye con apoyo de inteligencia artificial para explorar ideas, diseñar y desarrollar sus herramientas. Su creador define el rumbo y toma las decisiones sobre lo que se publica.</p><p>La IA forma parte del proceso; la responsabilidad sobre el proyecto sigue siendo humana.</p></div>
      </section>

      <section className="about-cta" aria-labelledby="about-cta-title"><div><h2 id="about-cta-title">Las ideas se entienden mejor usándolas.</h2><p>Conoce las herramientas y encuentra la que te ayude hoy.</p></div><a className="primary-button about-button" href="/#herramientas">Descubrir Mi0 <span aria-hidden="true">→</span></a></section>
    </main>
    <SiteFooter />
  </div>
}
