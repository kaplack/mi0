import { useState } from 'react'
import { api, TOKEN_KEY } from '../services/api'

export function AuthPage({ mode, onModeChange, onAuthenticated, onClose, initialEmail = '', description }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    const form = new FormData(event.currentTarget)

    try {
      const payload = mode === 'register'
        ? { name: form.get('name'), lastName: form.get('lastName'), email: form.get('email'), password: form.get('password') }
        : { email: form.get('email'), password: form.get('password') }

      const data = await api(`/auth/${mode}`, { method: 'POST', body: JSON.stringify(payload) })
      localStorage.setItem(TOKEN_KEY, data.token)
      onAuthenticated(data.user)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const registering = mode === 'register'

  return (
    <main className="auth-page">
      <section className="auth-card">
        <button className="auth-close" type="button" onClick={onClose} aria-label="Cerrar">×</button>
        <div className="auth-brand">mi<span>0</span><small>.app</small></div>
        <span className="auth-kicker">{registering ? 'EMPIEZA EN SEGUNDOS' : 'BIENVENIDO'}</span>
        <h1>{registering ? 'Crear cuenta' : 'Iniciar sesión'}</h1>
        <p>{description || (registering ? 'Crea tu cuenta para usar tus microapps.' : 'Entra a tus microapps.')}</p>
        <form onSubmit={submit}>
          {registering && <div className="auth-name-row">
            <label>Nombre<input name="name" autoComplete="given-name" required /></label>
            <label>Apellido<input name="lastName" autoComplete="family-name" required /></label>
          </div>}
          <label>Correo<input name="email" defaultValue={initialEmail} type="email" autoComplete="email" required /></label>
          <label>Contraseña<input name="password" type="password" minLength={registering ? 10 : undefined} autoComplete={registering ? 'new-password' : 'current-password'} required /></label>
          {registering && <small className="auth-hint">Mínimo 10 caracteres.</small>}
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="auth-submit" disabled={loading}>{loading ? 'Un momento…' : registering ? 'Crear cuenta' : 'Ingresar'}</button>
        </form>
        <p className="auth-switch">{registering ? '¿Ya tienes cuenta?' : '¿Aún no tienes cuenta?'}
          <button type="button" onClick={() => onModeChange(registering ? 'login' : 'register')}>{registering ? 'Inicia sesión' : 'Créala aquí'}</button>
        </p>
      </section>
    </main>
  )
}
