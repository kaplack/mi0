import { useEffect, useState } from 'react'
import './App.css'

const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
const TOKEN_KEY = 'mi0_superadmin_token'

async function api(path, options = {}) {
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

function App() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      setChecking(false)
      return
    }

    api('/auth/me')
      .then(({ user }) => {
        if (user.role === 'SUPERADMIN') setUser(user)
        else localStorage.removeItem(TOKEN_KEY)
      })
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setChecking(false))
  }, [])

  async function handleLogin(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    const form = new FormData(event.currentTarget)

    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: form.get('email'),
          password: form.get('password'),
        }),
      })

      if (data.user.role !== 'SUPERADMIN') {
        setError('Esta cuenta no tiene acceso al Superadmin.')
        return
      }

      localStorage.setItem(TOKEN_KEY, data.token)
      setUser(data.user)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    try {
      await api('/auth/logout', { method: 'POST' })
    } catch {
      // La sesión local se elimina aunque el servidor ya la considere vencida.
    }

    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
  }

  if (checking) {
    return <main className="shell"><p>Comprobando sesión…</p></main>
  }

  if (user) {
    return (
      <main className="shell">
        <section className="card welcome">
          <div className="brand">mi<span>0</span></div>
          <p className="eyebrow">SUPERADMIN</p>
          <h1>Hola, {user.name}</h1>
          <p>Acceso correcto. El dashboard será el siguiente paso.</p>
          <button className="secondary" type="button" onClick={handleLogout}>Cerrar sesión</button>
        </section>
      </main>
    )
  }

  return (
    <main className="shell">
      <section className="card">
        <div className="brand">mi<span>0</span></div>
        <p className="eyebrow">SUPERADMIN</p>
        <h1>Iniciar sesión</h1>
        <p className="intro">Administración de mi0.app</p>

        <form onSubmit={handleLogin}>
          <label>
            Correo
            <input name="email" type="email" autoComplete="email" required />
          </label>

          <label>
            Contraseña
            <input name="password" type="password" autoComplete="current-password" required />
          </label>

          {error && <p className="error" role="alert">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </section>
    </main>
  )
}

export default App
