import { useState } from 'react'

export const TOKEN_KEY = 'mi0_user_token'
const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

export async function authApi(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY)
  const response = await fetch(`${API_URL}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || 'Ocurrió un error')
  return data
}

export function AuthView({ mode, onModeChange, onAuthenticated, onClose }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')

    const form = new FormData(event.currentTarget)

    try {
      const payload = mode === 'register'
        ? {
            name: form.get('name'),
            lastName: form.get('lastName'),
            email: form.get('email'),
            password: form.get('password'),
          }
        : {
            email: form.get('email'),
            password: form.get('password'),
          }

      const data = await authApi(`/auth/${mode}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })

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
        <p>{registering ? 'Crea tu cuenta para usar tus microapps.' : 'Entra a tus microapps.'}</p>

        <form onSubmit={submit}>
          {registering && (
            <div className="auth-name-row">
              <label>Nombre<input name="name" autoComplete="given-name" required /></label>
              <label>Apellido<input name="lastName" autoComplete="family-name" required /></label>
            </div>
          )}

          <label>Correo<input name="email" type="email" autoComplete="email" required /></label>
          <label>Contraseña<input name="password" type="password" minLength={registering ? 10 : undefined} autoComplete={registering ? 'new-password' : 'current-password'} required /></label>

          {registering && <small className="auth-hint">Mínimo 10 caracteres.</small>}
          {error && <p className="auth-error" role="alert">{error}</p>}

          <button className="auth-submit" disabled={loading}>
            {loading ? 'Un momento…' : registering ? 'Crear cuenta' : 'Ingresar'}
          </button>
        </form>

        <p className="auth-switch">
          {registering ? '¿Ya tienes cuenta?' : '¿Aún no tienes cuenta?'}
          <button type="button" onClick={() => onModeChange(registering ? 'login' : 'register')}>
            {registering ? 'Inicia sesión' : 'Créala aquí'}
          </button>
        </p>
      </section>
    </main>
  )
}
