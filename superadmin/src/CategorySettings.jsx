import { useState } from 'react'

export function CategorySettings({ api, module, categories, onSaved }) {
  const [ids, setIds] = useState(module.categories.map(category => category.id))
  const [free, setFree] = useState(module.free)
  const snapshot = (ids, free) => JSON.stringify({ ids: [...ids].sort(), free })
  const [saved, setSaved] = useState(() => snapshot(ids, free))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const dirty = snapshot(ids, free) !== saved
  return <form className="category-settings" onSubmit={async event => {
    event.preventDefault(); if (!dirty || busy) return
    setBusy(true); setError(''); setMessage('')
    try {
      await api(`/admin/modules/${module.id}/catalog`, { method: 'PATCH', body: JSON.stringify({ categoryIds: ids, free }) })
      setSaved(snapshot(ids, free)); setMessage('Guardado'); await onSaved()
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }}>
    <div className="category-settings-heading"><h2 id="catalog-heading">Categorías</h2><button className="category-save" type="submit" title="Guardar categorías" aria-label={busy ? 'Guardando categorías' : 'Guardar categorías'} disabled={busy || !dirty}>
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 3h13l4 4v14H3V3ZM7 3v6h10V3M7 21v-7h10v7" /></svg>
    </button></div>
    <fieldset disabled={busy} aria-label="Categorías y precio"><div className="category-choices">{categories.map(category => <label className="category-choice" key={category.id}><input type="checkbox" checked={ids.includes(category.id)} onChange={event => { setMessage(''); setIds(event.target.checked ? [...ids, category.id] : ids.filter(id => id !== category.id)) }} />{category.name}</label>)}</div>
      {!categories.length && <p className="empty">Aún no hay categorías disponibles.</p>}
      <div className="category-price"><label className="catalog-check"><input type="checkbox" checked={free} onChange={event => { setMessage(''); setFree(event.target.checked) }} />Totalmente gratis</label></div>
    </fieldset>
    {error && <p className="error" role="alert">{error}</p>}{message && <p className="category-saved" role="status">✓ {message}</p>}
  </form>
}
