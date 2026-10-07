export const TOKEN_KEY = 'mi0_user_token'
const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

export async function api(path, options = {}) {
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
