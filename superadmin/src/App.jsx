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
  const [summary, setSummary] = useState(null)
  const [section, setSection] = useState(null)
  const [items, setItems] = useState([])
  const [dataLoading, setDataLoading] = useState(false)

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

  async function loadDashboard() {
    try {
      const data = await api('/admin/summary')
      setSummary(data.summary)
    } catch (err) {
      setError(err.message)
    }
  }

  async function openSection(nextSection) {
    setSection(nextSection)
    setDataLoading(true)
    setError('')

    try {
      const data = await api(`/admin/${nextSection}`)
      setItems(data[nextSection] || [])
    } catch (err) {
      setError(err.message)
      setItems([])
    } finally {
      setDataLoading(false)
    }
  }

  useEffect(() => {
    if (user?.role === 'SUPERADMIN') loadDashboard()
  }, [user])

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
    const cards = [
      { key: 'users', label: 'Usuarios', value: summary?.users },
      { key: 'businesses', label: 'Negocios', value: summary?.businesses },
      { key: 'modules', label: 'Microapps', value: summary?.modules },
    ]

    return (
      <main className="admin-shell">
        <header className="admin-header">
          <div className="brand">mi<span>0</span></div>
          <div>
            <span className="admin-name">{user.name}</span>
            <button className="text-button" type="button" onClick={handleLogout}>Salir</button>
          </div>
        </header>

        <section className="dashboard">
          <p className="eyebrow">SUPERADMIN</p>
          <h1>Panel general</h1>

          <div className="dashboard-grid">
            {cards.map((card) => (
              <button className="metric-card" key={card.key} onClick={() => openSection(card.key)}>
                <span>{card.label}</span>
                <strong>{card.value ?? '—'}</strong>
              </button>
            ))}
          </div>

          {error && <p className="error" role="alert">{error}</p>}

          {section && (
            <section className="data-panel">
              <div className="panel-heading">
                <h2>{cards.find((card) => card.key === section)?.label}</h2>
                <button className="text-button" type="button" onClick={() => setSection(null)}>Cerrar</button>
              </div>

              {dataLoading ? <p>Cargando…</p> : (
                <div className="item-list">
                  {items.length === 0 && <p className="empty">Todavía no hay registros.</p>}

                  {section === 'users' && items.map((item) => (
                    <article className="list-row" key={item.id}>
                      <div><strong>{item.name} {item.lastName}</strong><small>{item.email}</small></div>
                      <span>{item.role} · {item.status}</span>
                    </article>
                  ))}

                  {section === 'businesses' && items.map((item) => (
                    <article className="list-row" key={item.id}>
                      <div><strong>{item.name}</strong><small>{item.slug}</small></div>
                      <span>{item.modules.filter((entry) => entry.active).length} microapps · {item.status}</span>
                    </article>
                  ))}

                  {section === 'modules' && items.map((item) => (
                    <article className="list-row" key={item.id}>
                      <div><strong>{item.name}</strong><small>{item.description || item.code}</small></div>
                      <span>{item.active ? 'Activa' : 'Inactiva'}</span>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}
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
